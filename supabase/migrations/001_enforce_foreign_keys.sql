-- =================================================================
-- Migration 001: Enforce Foreign Keys on game_scores
-- =================================================================
-- Adds explicit Foreign Key constraints from game_scores to:
--   1. daily_questions (daily_question_id)
--   2. query_quest_challenges (challenge_id)
-- Transforms all conceptual links into formal PostgreSQL Foreign Keys.
-- =================================================================

BEGIN;

-- 1. Add foreign key column to daily_questions
ALTER TABLE public.game_scores 
ADD COLUMN IF NOT EXISTS daily_question_id UUID REFERENCES public.daily_questions(id) ON DELETE SET NULL;

-- 2. Add foreign key column to query_quest_challenges
ALTER TABLE public.game_scores 
ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES public.query_quest_challenges(id) ON DELETE SET NULL;

-- 3. Populate foreign key on existing game_scores rows where matching
UPDATE public.game_scores gs
SET daily_question_id = dq.id
FROM public.daily_questions dq
WHERE gs.game_name = dq.game_name AND gs.game_date = dq.game_date;

COMMIT;
