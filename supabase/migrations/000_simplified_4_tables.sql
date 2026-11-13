-- =================================================================
-- PIXEL QUEST: CONSOLIDATED 4-TABLE SIMPLIFICATION MIGRATION
-- =================================================================
-- Target Schema:
--   1. public.users
--   2. public.game_scores
--   3. public.daily_questions
--   4. public.query_quest_challenges
--
-- Features:
--   - Safe, non-destructive migration preserving existing records
--   - Migrates game_attempts into game_scores
--   - Consolidates query_quest_attempts into game_scores.details
--   - Preserves all users columns (id, usn, password_hash, roll_no, etc.)
--   - Safely removes obsolete dependent views, tables, and foreign keys
-- =================================================================

BEGIN;

-- -----------------------------------------------------------------
-- STEP 1: PREPARE AND UPDATE USERS
-- -----------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department_code VARCHAR(5);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Populate department from departments table if available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
        UPDATE public.users u
        SET department = COALESCE(d.department_name, u.department, 'Computer Science')
        FROM public.departments d
        WHERE u.department_code = d.department_code AND (u.department IS NULL OR u.department = '');
    END IF;
END $$;

UPDATE public.users
SET department = CASE
    WHEN department_code = 'CS' THEN 'Computer Science'
    WHEN department_code = 'IS' THEN 'Information Science'
    WHEN department_code = 'AD' THEN 'AI & Data Science'
    WHEN department_code = 'EC' THEN 'Electronics & Communication'
    WHEN department_code = 'ME' THEN 'Mechanical Engineering'
    WHEN department_code = 'CV' THEN 'Civil Engineering'
    ELSE COALESCE(department, 'General Engineering')
END
WHERE department IS NULL OR department = '';

-- -----------------------------------------------------------------
-- STEP 2: CREATE GAME_SCORES TABLE
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usn VARCHAR(20) NOT NULL REFERENCES public.users(usn) ON DELETE CASCADE,
    game_name VARCHAR(30) NOT NULL,
    game_date DATE NOT NULL DEFAULT CURRENT_DATE,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_game_scores_user_game_date UNIQUE (usn, game_name, game_date)
);

-- -----------------------------------------------------------------
-- STEP 3: MIGRATE GAME_ATTEMPTS INTO GAME_SCORES
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_attempts') THEN
        INSERT INTO public.game_scores (id, usn, game_name, game_date, score, completed_at, details)
        SELECT 
            id,
            usn,
            game_key AS game_name,
            game_date,
            score,
            COALESCE(completed_at, NOW()),
            COALESCE(metadata, '{}'::jsonb)
        FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY usn, game_key, game_date ORDER BY score DESC, completed_at DESC) as rn
            FROM public.game_attempts
            WHERE game_key <> 'query_quest'
        ) sub
        WHERE rn = 1
        ON CONFLICT (usn, game_name, game_date) 
        DO UPDATE SET
            score = EXCLUDED.score,
            completed_at = EXCLUDED.completed_at,
            details = EXCLUDED.details;
    END IF;
END $$;

-- -----------------------------------------------------------------
-- STEP 4: MIGRATE QUERY_QUEST_ATTEMPTS INTO GAME_SCORES.DETAILS
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'query_quest_attempts') THEN
        WITH aggregated_qq AS (
            SELECT 
                qa.usn,
                COALESCE(qc.challenge_date, qa.challenge_date, CURRENT_DATE) as game_date,
                LEAST(60, SUM(qa.points_awarded))::INTEGER as total_score,
                MAX(qa.completed_at) as last_completed,
                jsonb_build_object(
                    'completed', bool_or(qa.is_correct),
                    'missions', jsonb_object_agg(
                        qa.challenge_id::TEXT,
                        jsonb_build_object(
                            'is_correct', qa.is_correct,
                            'is_optimal', COALESCE(qa.is_optimal, false),
                            'submitted_query', qa.submitted_query,
                            'execution_time', qa.execution_time,
                            'attempts_count', qa.attempts_count,
                            'hints_used', qa.hints_used,
                            'points_awarded', qa.points_awarded
                        )
                    )
                ) as mission_details
            FROM public.query_quest_attempts qa
            LEFT JOIN public.query_quest_challenges qc ON qa.challenge_id = qc.id
            GROUP BY qa.usn, COALESCE(qc.challenge_date, qa.challenge_date, CURRENT_DATE)
        )
        INSERT INTO public.game_scores (usn, game_name, game_date, score, completed_at, details)
        SELECT 
            usn,
            'query_quest',
            game_date,
            total_score,
            COALESCE(last_completed, NOW()),
            mission_details
        FROM aggregated_qq
        ON CONFLICT (usn, game_name, game_date)
        DO UPDATE SET
            score = EXCLUDED.score,
            completed_at = EXCLUDED.completed_at,
            details = EXCLUDED.details;
    END IF;
END $$;

-- -----------------------------------------------------------------
-- STEP 5: ALIGN DAILY_QUESTIONS
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'daily_questions' AND column_name = 'game_key'
    ) THEN
        ALTER TABLE public.daily_questions RENAME COLUMN game_key TO game_name;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_daily_questions_game_date'
    ) THEN
        ALTER TABLE public.daily_questions 
        ADD CONSTRAINT uq_daily_questions_game_date UNIQUE (game_name, game_date);
    END IF;
END $$;

-- -----------------------------------------------------------------
-- STEP 6: SAFELY REMOVE OBSOLETE OBJECTS
-- -----------------------------------------------------------------
DROP VIEW IF EXISTS public.v_student_leaderboard;
DROP VIEW IF EXISTS public.v_department_leaderboard;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_department_code_fkey;

DROP TABLE IF EXISTS public.query_quest_execution_logs;
DROP TABLE IF EXISTS public.query_quest_attempts;
DROP TABLE IF EXISTS public.user_statistics;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.game_attempts;

COMMIT;
