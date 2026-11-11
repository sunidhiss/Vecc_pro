-- Run this in the Supabase SQL Editor for your Pixel Quest project

CREATE TABLE IF NOT EXISTS departments (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

INSERT INTO departments (code, name) VALUES
('CS', 'Computer Science'),
('AD', 'AI & Data Science'),
('IS', 'Information Science'),
('EC', 'Electronics & Communication'),
('ME', 'Mechanical Engineering'),
('CV', 'Civil Engineering')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    usn VARCHAR(20) UNIQUE NOT NULL,
    department_code VARCHAR(10) NOT NULL REFERENCES departments(code),
    year VARCHAR(4) NOT NULL,
    roll_no VARCHAR(10) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_games (
    id SERIAL PRIMARY KEY,
    game_date DATE NOT NULL,
    game_type VARCHAR(20) NOT NULL,
    content JSONB NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_date, game_type)
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_date DATE NOT NULL DEFAULT CURRENT_DATE,
    game_type VARCHAR(20) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT TRUE,
    details JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_date, game_type)
);

CREATE INDEX IF NOT EXISTS idx_gs_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gs_date ON game_sessions(game_date);
CREATE INDEX IF NOT EXISTS idx_dg_date_type ON daily_games(game_date, game_type);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department_code);

-- Leaderboard: student rankings
CREATE OR REPLACE FUNCTION get_student_leaderboard(lim INTEGER DEFAULT 20)
RETURNS TABLE(usn VARCHAR, department TEXT, total_points BIGINT, player_rank BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.usn, d.name::TEXT AS department,
        COALESCE(SUM(gs.score), 0)::BIGINT AS total_points,
        RANK() OVER (ORDER BY COALESCE(SUM(gs.score), 0) DESC)::BIGINT AS player_rank
    FROM users u
    JOIN departments d ON u.department_code = d.code
    LEFT JOIN game_sessions gs ON u.id = gs.user_id AND gs.completed = true
    WHERE u.is_admin = false
    GROUP BY u.id, u.usn, d.name
    HAVING COALESCE(SUM(gs.score), 0) > 0
    ORDER BY total_points DESC
    LIMIT lim;
END;
$$ LANGUAGE plpgsql;

-- Leaderboard: department rankings
CREATE OR REPLACE FUNCTION get_department_leaderboard()
RETURNS TABLE(name TEXT, total_points BIGINT, active_players BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.name::TEXT,
        COALESCE(SUM(gs.score), 0)::BIGINT AS total_points,
        COUNT(DISTINCT CASE WHEN COALESCE(gs.score, 0) > 0 THEN u.id END)::BIGINT AS active_players
    FROM departments d
    LEFT JOIN users u ON u.department_code = d.code AND u.is_admin = false
    LEFT JOIN game_sessions gs ON u.id = gs.user_id AND gs.completed = true
    GROUP BY d.code, d.name
    ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql;
