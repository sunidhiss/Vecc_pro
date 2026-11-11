const supabase = require('../config/supabase');
const {
    DAILY_QUESTION_KEYS,
    normalizeGameKey,
    getDefaultContentForKey,
    unwrapWordContent,
    unwrapQuizQuestions,
} = require('../utils/gameKeys');

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function formatAdminContent(gameKey, storedQuestions) {
    if (!storedQuestions) return null;
    if (gameKey === 'wordle' || gameKey === 'unscramble') {
        return { word: unwrapWordContent(storedQuestions, null) };
    }
    return { questions: unwrapQuizQuestions(storedQuestions, null) };
}

/**
 * POST /api/admin/games/:gameType
 * Creates or updates daily_questions content for the given game_key and date.
 */
exports.setDailyGame = async (req, res, next) => {
    try {
        const gameKey = normalizeGameKey(req.params.gameType);
        if (!gameKey || !DAILY_QUESTION_KEYS.has(gameKey)) {
            return res.status(400).json({ error: 'Invalid game type' });
        }

        const targetDate = req.body.date || getTodayDate();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        }

        let questionsPayload;

        if (gameKey === 'wordle') {
            const word = (req.body.word || '').trim().toUpperCase();
            if (!/^[A-Z]{5}$/.test(word)) {
                return res.status(400).json({ error: 'Wordle word must be exactly 5 letters' });
            }
            questionsPayload = { word };
        } else if (gameKey === 'unscramble') {
            const word = (req.body.word || '').trim().toUpperCase();
            if (word.length < 2) {
                return res.status(400).json({ error: 'Unscramble word must be at least 2 letters' });
            }
            questionsPayload = { word };
        } else {
            const { questions } = req.body;
            if (!Array.isArray(questions) || questions.length !== 5) {
                return res.status(400).json({ error: 'Exactly 5 questions are required' });
            }
            const valid = questions.every(
                (item) =>
                    item &&
                    typeof item.q === 'string' &&
                    item.q.trim() &&
                    typeof item.answer === 'string' &&
                    item.answer.trim() &&
                    Array.isArray(item.options) &&
                    item.options.length === 4 &&
                    item.options.every((opt) => typeof opt === 'string' && opt.trim())
            );
            if (!valid) {
                return res.status(400).json({ error: 'All question fields and 4 options must be filled' });
            }
            questionsPayload = questions.map((item) => ({
                q: item.q.trim(),
                options: item.options.map((o) => o.trim()),
                answer: item.answer.trim(),
                ...(item.code !== undefined && item.code !== '' ? { code: String(item.code) } : {}),
            }));
        }

        const { data: existing, error: fetchErr } = await supabase
            .from('daily_questions')
            .select('id')
            .eq('game_key', gameKey)
            .eq('game_date', targetDate)
            .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (existing) {
            const { error: updErr } = await supabase
                .from('daily_questions')
                .update({
                    questions: questionsPayload,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

            if (updErr) throw updErr;
        } else {
            const { error: insErr } = await supabase
                .from('daily_questions')
                .insert({
                    game_key: gameKey,
                    game_date: targetDate,
                    questions: questionsPayload,
                    updated_at: new Date().toISOString(),
                });

            if (insErr) throw insErr;
        }

        return res.json({
            success: true,
            gameKey,
            date: targetDate,
            message: `${gameKey} saved for ${targetDate}`,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/games/:gameType
 * Retrieves configured daily_questions content for a date (defaults to today).
 */
exports.getDailyGame = async (req, res, next) => {
    try {
        const gameKey = normalizeGameKey(req.params.gameType);
        if (!gameKey || !DAILY_QUESTION_KEYS.has(gameKey)) {
            return res.status(400).json({ error: 'Invalid game type' });
        }

        const targetDate = req.query.date || getTodayDate();
        const { data, error } = await supabase
            .from('daily_questions')
            .select('questions')
            .eq('game_key', gameKey)
            .eq('game_date', targetDate)
            .maybeSingle();

        if (error) throw error;

        const stored = data?.questions || null;
        const fallback = getDefaultContentForKey(gameKey);

        return res.json({
            content: stored ? formatAdminContent(gameKey, stored) : null,
            defaults: formatAdminContent(gameKey, fallback),
            gameKey,
            date: targetDate,
        });
    } catch (err) {
        next(err);
    }
};
