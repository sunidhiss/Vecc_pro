-- Query Quest Migration for Pixel Quest (Supabase PostgreSQL)
-- Run this in your Supabase Dashboard -> SQL Editor AFTER running migration.sql.
-- Aligned with public.users(usn PK, role) and public.departments(department_code, department_name).
--
-- IMPORTANT SECURITY STEP:
-- Before running in production, replace 'qq_executor_change_me_strong_password'
-- with a strong random password, and set QUERY_QUEST_DATABASE_URL in backend/.env
-- using that qq_executor role so student SQL never runs with service-role privileges.

-- 1. Dedicated restricted execution role for student SQL queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qq_executor') THEN
        CREATE ROLE qq_executor WITH
            LOGIN
            PASSWORD 'qq_executor_change_me_strong_password'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION;
    END IF;
END $$;

REVOKE ALL ON SCHEMA public FROM qq_executor;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM qq_executor;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM qq_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM qq_executor;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        EXECUTE 'REVOKE ALL ON SCHEMA auth FROM qq_executor';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        EXECUTE 'REVOKE ALL ON SCHEMA storage FROM qq_executor';
    END IF;
END $$;

-- 2. Challenges table (admin-configured daily SQL missions)
CREATE TABLE IF NOT EXISTS public.query_quest_challenges (
    id SERIAL PRIMARY KEY,
    mission_order INTEGER NOT NULL DEFAULT 1,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('ROOKIE', 'EXPLORER', 'MASTER')),
    topic VARCHAR(80) NOT NULL,
    scenario TEXT NOT NULL,
    schema_definition JSONB NOT NULL,
    seed_data JSONB NOT NULL,
    expected_result JSONB NOT NULL,
    hints JSONB NOT NULL DEFAULT '[]',
    explanation JSONB NOT NULL DEFAULT '{}',
    starter_query TEXT NOT NULL DEFAULT E'SELECT *\nFROM table_name;',
    challenge_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE,
    points INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(20) REFERENCES public.users(usn) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Student mission attempts & completions (one daily completion per student per mission)
CREATE TABLE IF NOT EXISTS public.query_quest_attempts (
    id SERIAL PRIMARY KEY,
    usn VARCHAR(20) NOT NULL REFERENCES public.users(usn) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES public.query_quest_challenges(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    submitted_query TEXT NOT NULL DEFAULT '',
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    is_optimal BOOLEAN NOT NULL DEFAULT FALSE,
    execution_time INTEGER NOT NULL DEFAULT 0,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    hints_used INTEGER NOT NULL DEFAULT 0,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usn, challenge_id),
    UNIQUE(usn, challenge_id, challenge_date)
);

-- 4. Execution logs (status & duration telemetry without storing sensitive secrets)
CREATE TABLE IF NOT EXISTS public.query_quest_execution_logs (
    id SERIAL PRIMARY KEY,
    usn VARCHAR(20) NOT NULL REFERENCES public.users(usn) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES public.query_quest_challenges(id) ON DELETE CASCADE,
    execution_status VARCHAR(30) NOT NULL,
    execution_duration INTEGER NOT NULL DEFAULT 0,
    error_category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qq_challenges_date_active ON public.query_quest_challenges(challenge_date, is_active, mission_order);
CREATE INDEX IF NOT EXISTS idx_qq_attempts_usn_date ON public.query_quest_attempts(usn, challenge_date);
CREATE INDEX IF NOT EXISTS idx_qq_attempts_challenge ON public.query_quest_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_qq_logs_usn_time ON public.query_quest_execution_logs(usn, created_at DESC);

-- Enable RLS so anon/authenticated cannot read hidden expected_result or private attempts directly
ALTER TABLE public.query_quest_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_quest_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_quest_execution_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.query_quest_challenges, public.query_quest_attempts, public.query_quest_execution_logs FROM qq_executor;

-- 5. Helper: Validate SQL identifiers and column types safely
CREATE OR REPLACE FUNCTION qq_is_valid_identifier(ident TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN ident IS NOT NULL AND ident ~ '^[a-zA-Z_][a-zA-Z0-9_]{0,62}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION qq_sanitize_column_type(col_type TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT := UPPER(TRIM(COALESCE(col_type, '')));
BEGIN
    IF cleaned IN ('INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'NUMERIC', 'DECIMAL', 'REAL', 'DOUBLE PRECISION', 'TEXT', 'BOOLEAN', 'BOOL', 'DATE', 'TIMESTAMP', 'TIMESTAMPTZ') THEN
        RETURN cleaned;
    END IF;
    IF cleaned ~ '^VARCHAR\(\d{1,4}\)$' OR cleaned ~ '^CHAR\(\d{1,4}\)$' OR cleaned ~ '^NUMERIC\(\d{1,2},\d{1,2}\)$' THEN
        RETURN cleaned;
    END IF;
    RAISE EXCEPTION 'Unsupported column type: %', col_type;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. SECURITY DEFINER provisioner: builds isolated per-challenge schema qq_c_<id>
CREATE OR REPLACE FUNCTION qq_provision_challenge_schema(
    p_challenge_id INTEGER,
    p_schema JSONB,
    p_seed JSONB
)
RETURNS TEXT AS $$
DECLARE
    schema_name TEXT := 'qq_c_' || p_challenge_id::TEXT;
    tbl JSONB;
    col JSONB;
    row_obj JSONB;
    t_name TEXT;
    c_name TEXT;
    c_type TEXT;
    col_defs TEXT[];
    pk_cols TEXT[];
    fk_defs TEXT[];
    col_names TEXT[];
    val_literals TEXT[];
    raw_val JSONB;
    ddl TEXT;
    ins_sql TEXT;
BEGIN
    IF p_challenge_id IS NULL OR p_challenge_id <= 0 THEN
        RAISE EXCEPTION 'Invalid challenge id';
    END IF;

    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
    EXECUTE format('CREATE SCHEMA %I', schema_name);

    FOR tbl IN SELECT * FROM jsonb_array_elements(COALESCE(p_schema->'tables', '[]'::jsonb))
    LOOP
        t_name := tbl->>'name';
        IF NOT qq_is_valid_identifier(t_name) THEN
            RAISE EXCEPTION 'Invalid table name: %', t_name;
        END IF;

        col_defs := ARRAY[]::TEXT[];
        pk_cols := ARRAY[]::TEXT[];
        fk_defs := ARRAY[]::TEXT[];

        FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(tbl->'columns', '[]'::jsonb))
        LOOP
            c_name := col->>'name';
            IF NOT qq_is_valid_identifier(c_name) THEN
                RAISE EXCEPTION 'Invalid column name: %', c_name;
            END IF;

            c_type := qq_sanitize_column_type(col->>'type');
            col_defs := array_append(col_defs, format('%I %s', c_name, c_type));

            IF COALESCE((col->>'primaryKey')::BOOLEAN, FALSE) THEN
                pk_cols := array_append(pk_cols, format('%I', c_name));
            END IF;

            IF col ? 'foreignKey' AND jsonb_typeof(col->'foreignKey') = 'object' THEN
                IF NOT qq_is_valid_identifier(col->'foreignKey'->>'table') OR NOT qq_is_valid_identifier(col->'foreignKey'->>'column') THEN
                    RAISE EXCEPTION 'Invalid foreign key reference on %.%', t_name, c_name;
                END IF;
                fk_defs := array_append(
                    fk_defs,
                    format(
                        'FOREIGN KEY (%I) REFERENCES %I.%I(%I)',
                        c_name,
                        schema_name,
                        col->'foreignKey'->>'table',
                        col->'foreignKey'->>'column'
                    )
                );
            END IF;
        END LOOP;

        IF array_length(pk_cols, 1) IS NOT NULL THEN
            col_defs := array_append(col_defs, 'PRIMARY KEY (' || array_to_string(pk_cols, ', ') || ')');
        END IF;

        IF array_length(fk_defs, 1) IS NOT NULL THEN
            col_defs := col_defs || fk_defs;
        END IF;

        ddl := format(
            'CREATE TABLE %I.%I (%s)',
            schema_name,
            t_name,
            array_to_string(col_defs, ', ')
        );
        EXECUTE ddl;

        IF (p_seed->'tables') ? t_name THEN
            FOR row_obj IN SELECT * FROM jsonb_array_elements(COALESCE(p_seed->'tables'->t_name, '[]'::jsonb))
            LOOP
                col_names := ARRAY[]::TEXT[];
                val_literals := ARRAY[]::TEXT[];

                FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(tbl->'columns', '[]'::jsonb))
                LOOP
                    c_name := col->>'name';
                    IF row_obj ? c_name THEN
                        col_names := array_append(col_names, format('%I', c_name));
                        raw_val := row_obj->c_name;
                        IF jsonb_typeof(raw_val) = 'null' THEN
                            val_literals := array_append(val_literals, 'NULL');
                        ELSIF jsonb_typeof(raw_val) = 'number' OR jsonb_typeof(raw_val) = 'boolean' THEN
                            val_literals := array_append(val_literals, raw_val::TEXT);
                        ELSE
                            val_literals := array_append(val_literals, quote_literal(row_obj->>c_name));
                        END IF;
                    END IF;
                END LOOP;

                IF array_length(col_names, 1) IS NOT NULL THEN
                    ins_sql := format(
                        'INSERT INTO %I.%I (%s) VALUES (%s)',
                        schema_name,
                        t_name,
                        array_to_string(col_names, ', '),
                        array_to_string(val_literals, ', ')
                    );
                    EXECUTE ins_sql;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    EXECUTE format('GRANT USAGE ON SCHEMA %I TO qq_executor', schema_name);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO qq_executor', schema_name);

    RETURN schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION qq_drop_challenge_schema(p_challenge_id INTEGER)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT := 'qq_c_' || p_challenge_id::TEXT;
BEGIN
    IF p_challenge_id IS NULL OR p_challenge_id <= 0 THEN
        RETURN;
    END IF;
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. Atomic attempt recording + global game_sessions sync (keyed by usn)
CREATE OR REPLACE FUNCTION qq_record_attempt_and_sync_score(
    p_usn VARCHAR,
    p_challenge_id INTEGER,
    p_challenge_date DATE,
    p_submitted_query TEXT,
    p_is_correct BOOLEAN,
    p_is_optimal BOOLEAN,
    p_execution_time INTEGER,
    p_points INTEGER
)
RETURNS TABLE(
    awarded_now INTEGER,
    already_completed BOOLEAN,
    total_qq_today INTEGER,
    attempts_count INTEGER
) AS $$
DECLARE
    v_existing public.query_quest_attempts%ROWTYPE;
    v_awarded_now INTEGER := 0;
    v_already_completed BOOLEAN := FALSE;
    v_total_qq_today INTEGER := 0;
    v_attempts_count INTEGER := 1;
BEGIN
    SELECT * INTO v_existing
    FROM public.query_quest_attempts
    WHERE usn = p_usn AND challenge_id = p_challenge_id
    FOR UPDATE;

    IF FOUND THEN
        v_already_completed := v_existing.is_correct;
        v_attempts_count := v_existing.attempts_count + 1;

        IF NOT v_existing.is_correct AND p_is_correct THEN
            v_awarded_now := p_points;
            UPDATE public.query_quest_attempts
            SET submitted_query = p_submitted_query,
                is_correct = TRUE,
                is_optimal = p_is_optimal,
                execution_time = p_execution_time,
                attempts_count = v_attempts_count,
                points_awarded = p_points,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_existing.id;
        ELSE
            UPDATE public.query_quest_attempts
            SET submitted_query = CASE WHEN v_existing.is_correct THEN v_existing.submitted_query ELSE p_submitted_query END,
                execution_time = p_execution_time,
                attempts_count = v_attempts_count,
                updated_at = NOW()
            WHERE id = v_existing.id;
        END IF;
    ELSE
        v_awarded_now := CASE WHEN p_is_correct THEN p_points ELSE 0 END;
        INSERT INTO public.query_quest_attempts (
            usn, challenge_id, challenge_date,
            submitted_query, is_correct, is_optimal,
            execution_time, attempts_count, points_awarded,
            completed_at, updated_at
        ) VALUES (
            p_usn, p_challenge_id, p_challenge_date,
            p_submitted_query, p_is_correct, (p_is_correct AND p_is_optimal),
            p_execution_time, 1, v_awarded_now,
            CASE WHEN p_is_correct THEN NOW() ELSE NULL END, NOW()
        );
    END IF;

    SELECT LEAST(60, COALESCE(SUM(points_awarded), 0))::INTEGER
    INTO v_total_qq_today
    FROM public.query_quest_attempts
    WHERE usn = p_usn AND challenge_date = p_challenge_date AND is_correct = TRUE;

    IF v_total_qq_today > 0 THEN
        INSERT INTO public.game_sessions (usn, game_date, game_type, score, completed, details, completed_at)
        VALUES (
            p_usn,
            p_challenge_date,
            'query_quest',
            v_total_qq_today,
            TRUE,
            jsonb_build_object('dailyScore', v_total_qq_today),
            NOW()
        )
        ON CONFLICT (usn, game_date, game_type)
        DO UPDATE SET
            score = EXCLUDED.score,
            completed = TRUE,
            details = EXCLUDED.details,
            completed_at = NOW();
    END IF;

    RETURN QUERY SELECT v_awarded_now, v_already_completed, v_total_qq_today, v_attempts_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. Query Quest specific leaderboard RPC
CREATE OR REPLACE FUNCTION get_query_quest_leaderboard(lim INTEGER DEFAULT 20)
RETURNS TABLE(
    usn VARCHAR,
    department TEXT,
    total_points BIGINT,
    missions_completed BIGINT,
    optimal_solves BIGINT,
    avg_execution_ms INTEGER,
    player_rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.usn,
        COALESCE(d.department_name, u.department_code)::TEXT AS department,
        COALESCE(SUM(qa.points_awarded), 0)::BIGINT AS total_points,
        COUNT(*) FILTER (WHERE qa.is_correct)::BIGINT AS missions_completed,
        COUNT(*) FILTER (WHERE qa.is_optimal)::BIGINT AS optimal_solves,
        COALESCE(ROUND(AVG(qa.execution_time) FILTER (WHERE qa.is_correct)), 0)::INTEGER AS avg_execution_ms,
        RANK() OVER (ORDER BY COALESCE(SUM(qa.points_awarded), 0) DESC, COUNT(*) FILTER (WHERE qa.is_optimal) DESC)::BIGINT AS player_rank
    FROM public.users u
    LEFT JOIN public.departments d ON u.department_code = d.department_code
    JOIN public.query_quest_attempts qa ON u.usn = qa.usn
    WHERE COALESCE(u.role, 'student') <> 'admin' AND qa.is_correct = TRUE
    GROUP BY u.usn, d.department_name, u.department_code
    ORDER BY total_points DESC, optimal_solves DESC
    LIMIT lim;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION qq_provision_challenge_schema(INTEGER, JSONB, JSONB) FROM PUBLIC, anon, authenticated, qq_executor;
GRANT EXECUTE ON FUNCTION qq_provision_challenge_schema(INTEGER, JSONB, JSONB) TO service_role;

REVOKE ALL ON FUNCTION qq_drop_challenge_schema(INTEGER) FROM PUBLIC, anon, authenticated, qq_executor;
GRANT EXECUTE ON FUNCTION qq_drop_challenge_schema(INTEGER) TO service_role;

REVOKE ALL ON FUNCTION qq_record_attempt_and_sync_score(VARCHAR, INTEGER, DATE, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, qq_executor;
GRANT EXECUTE ON FUNCTION qq_record_attempt_and_sync_score(VARCHAR, INTEGER, DATE, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO service_role;
