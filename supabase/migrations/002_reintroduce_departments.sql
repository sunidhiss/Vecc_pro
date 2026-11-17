-- =================================================================
-- Migration 002: Reintroduce Normalized DEPARTMENTS Table
-- =================================================================
-- 1. Create departments table with department_code (PK) & department_name
-- 2. Seed all college departments
-- 3. Add Foreign Key users.department_code -> departments.department_code
-- =================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.departments (
    department_code VARCHAR(5) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);

-- Seed departments
INSERT INTO public.departments (department_code, department_name) VALUES
    ('CS', 'Computer Science'),
    ('AD', 'AI & Data Science'),
    ('IS', 'Information Science'),
    ('EC', 'Electronics & Communication'),
    ('ME', 'Mechanical Engineering'),
    ('CV', 'Civil Engineering')
ON CONFLICT (department_code) 
DO UPDATE SET department_name = EXCLUDED.department_name;

-- Ensure users.department_code has valid data and references departments
UPDATE public.users 
SET department_code = 'CS' 
WHERE department_code IS NULL OR department_code NOT IN ('CS', 'AD', 'IS', 'EC', 'ME', 'CV');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_department_code_fkey'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_department_code_fkey 
        FOREIGN KEY (department_code) REFERENCES public.departments(department_code) ON DELETE RESTRICT;
    END IF;
END $$;

COMMIT;
