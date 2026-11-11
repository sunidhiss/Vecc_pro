const supabase = require('../config/supabase');

const VALID_GAMES = ['wordle', 'unscramble', 'aptitude', 'techquiz', 'fluencyquiz', 'outputquiz'];

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * POST /api/admin/games/:gameType
 * Creates or updates daily game content for the given gameType and date.
 */
exports.setDailyGame = async (req, res, next) => {
    try {
        const { gameType } = req.params;
        if (!VALID_GAMES.includes(gameType)) {
            return res.status(400).json({ error: 'Invalid game type' });
        }

        const targetDate = req.body.date || getTodayDate();
        let content;

        if (gameType === 'wordle') {
            const word = (req.body.word || '').trim().toUpperCase();
            if (!/^[A-Z]{5}$/.test(word)) {
                return res.status(400).json({ error: 'Wordle word must be exactly 5 letters' });
            }
            content = { word };
        } else if (gameType === 'unscramble') {
            const word = (req.body.word || '').trim().toUpperCase();
            if (word.length < 2) {
                return res.status(400).json({ error: 'Unscramble word must be at least 2 letters' });
            }
            content = { word };
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
            content = { questions };
        }

        const { error } = await supabase
            .from('daily_games')
            .upsert(
                {
                    game_date: targetDate,
                    game_type: gameType,
                    content,
                    created_by: req.user.id,
                },
                { onConflict: 'game_date,game_type' }
            );

        if (error) throw error;

        return res.json({ success: true, message: `${gameType} saved for ${targetDate}` });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/games/:gameType
 * Retrieves configured daily game content for a date (defaults to today).
 */
exports.getDailyGame = async (req, res, next) => {
    try {
        const { gameType } = req.params;
        if (!VALID_GAMES.includes(gameType)) {
            return res.status(400).json({ error: 'Invalid game type' });
        }

        const targetDate = req.query.date || getTodayDate();
        const { data, error } = await supabase
            .from('daily_games')
            .select('content')
            .eq('game_date', targetDate)
            .eq('game_type', gameType)
            .maybeSingle();

        if (error) throw error;

        return res.json({ content: data?.content || null, date: targetDate });
    } catch (err) {
        next(err);
    }
};
