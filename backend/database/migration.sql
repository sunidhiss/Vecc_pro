-- Non-destructive migration aligned with existing public.departments and public.users tables
-- Run this in the Supabase Dashboard -> SQL Editor.
-- Does NOT drop or recreate existing tables or delete existing rows.

-- 1. Ensure departments exists (matches existing schema: department_code, department_name)
CREATE TABLE IF NOT EXISTS public.departments (
    department_code VARCHAR(5) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);

INSERT INTO public.departments (department_code, department_name) VALUES
('CS', 'Computer Science'),
('AD', 'AI & Data Science'),
('IS', 'Information Science'),
('EC', 'Electronics & Communication'),
('ME', 'Mechanical Engineering'),
('CV', 'Civil Engineering')
ON CONFLICT (department_code) DO NOTHING;

-- 2. Ensure users exists and non-destructively add password_hash for bcrypt admin login
CREATE TABLE IF NOT EXISTS public.users (
    usn VARCHAR(20) PRIMARY KEY,
    department_code VARCHAR(5) REFERENCES public.departments(department_code),
    academic_year VARCHAR(10),
    roll_no VARCHAR(10),
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. Daily game configurations (Wordle, Unscramble, Quizzes)
CREATE TABLE IF NOT EXISTS public.daily_games (
    id SERIAL PRIMARY KEY,
    game_date DATE NOT NULL,
    game_type VARCHAR(20) NOT NULL,
    content JSONB NOT NULL,
    created_by VARCHAR(20) REFERENCES public.users(usn) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_date, game_type)
);

-- 4. Student game sessions (keyed by usn to match public.users PK)
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id SERIAL PRIMARY KEY,
    usn VARCHAR(20) NOT NULL REFERENCES public.users(usn) ON DELETE CASCADE,
    game_date DATE NOT NULL DEFAULT CURRENT_DATE,
    game_type VARCHAR(20) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT TRUE,
    details JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usn, game_date, game_type)
);

CREATE INDEX IF NOT EXISTS idx_gs_usn ON public.game_sessions(usn);
CREATE INDEX IF NOT EXISTS idx_gs_date ON public.game_sessions(game_date);
CREATE INDEX IF NOT EXISTS idx_dg_date_type ON public.daily_games(game_date, game_type);
CREATE INDEX IF NOT EXISTS idx_users_dept ON public.users(department_code);

-- 5. Enable Row Level Security (Express backend uses service_role which bypasses RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'departments_read_all'
    ) THEN
        CREATE POLICY departments_read_all ON public.departments
            FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;

-- 6. Leaderboard: student rankings
CREATE OR REPLACE FUNCTION get_student_leaderboard(lim INTEGER DEFAULT 20)
RETURNS TABLE(usn VARCHAR, department TEXT, total_points BIGINT, player_rank BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.usn,
        COALESCE(d.department_name, u.department_code)::TEXT AS department,
        COALESCE(SUM(gs.score), 0)::BIGINT AS total_points,
        RANK() OVER (ORDER BY COALESCE(SUM(gs.score), 0) DESC)::BIGINT AS player_rank
    FROM public.users u
    LEFT JOIN public.departments d ON u.department_code = d.department_code
    LEFT JOIN public.game_sessions gs ON u.usn = gs.usn AND gs.completed = true
    WHERE COALESCE(u.role, 'student') <> 'admin'
    GROUP BY u.usn, d.department_name, u.department_code
    HAVING COALESCE(SUM(gs.score), 0) > 0
    ORDER BY total_points DESC
    LIMIT lim;
END;
$$ LANGUAGE plpgsql;

-- 7. Leaderboard: department rankings
CREATE OR REPLACE FUNCTION get_department_leaderboard()
RETURNS TABLE(name TEXT, total_points BIGINT, active_players BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.department_name::TEXT AS name,
        COALESCE(SUM(gs.score), 0)::BIGINT AS total_points,
        COUNT(DISTINCT CASE WHEN COALESCE(gs.score, 0) > 0 THEN u.usn END)::BIGINT AS active_players
    FROM public.departments d
    LEFT JOIN public.users u ON u.department_code = d.department_code AND COALESCE(u.role, 'student') <> 'admin'
    LEFT JOIN public.game_sessions gs ON u.usn = gs.usn AND gs.completed = true
    GROUP BY d.department_code, d.department_name
    ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql;
