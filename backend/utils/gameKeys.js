const DEFAULTS = require('./defaults');

const GAME_KEY_ALIASES = {
    wordle: 'wordle',
    aptitude: 'aptitude',
    tech: 'tech',
    techquiz: 'tech',
    unscramble: 'unscramble',
    fluency: 'fluency',
    fluencyquiz: 'fluency',
    output: 'output',
    outputquiz: 'output',
    query_quest: 'query_quest',
    'query-quest': 'query_quest',
};

const QUIZ_GAME_KEYS = new Set(['aptitude', 'tech', 'fluency', 'output']);
const DAILY_QUESTION_KEYS = new Set(['wordle', 'unscramble', 'aptitude', 'tech', 'fluency', 'output']);

function normalizeGameKey(rawKey) {
    const key = String(rawKey || '').trim().toLowerCase();
    return GAME_KEY_ALIASES[key] || null;
}

function isAttemptCompleted(attempt) {
    if (!attempt) return false;
    // Wordle saves in-progress state with metadata.completed === false before gameOver
    return attempt.metadata?.completed !== false;
}

function getDefaultContentForKey(gameKey) {
    switch (gameKey) {
        case 'wordle':
            return DEFAULTS.wordle;
        case 'unscramble':
            return DEFAULTS.unscramble;
        case 'aptitude':
            return DEFAULTS.aptitude;
        case 'tech':
            return DEFAULTS.techquiz;
        case 'fluency':
            return DEFAULTS.fluencyquiz;
        case 'output':
            return DEFAULTS.outputquiz;
        default:
            return null;
    }
}

function unwrapWordContent(storedQuestions, fallbackObj) {
    const raw = storedQuestions?.word ?? fallbackObj?.word ?? '';
    return String(raw).trim().toUpperCase();
}

function unwrapQuizQuestions(storedQuestions, fallbackObj) {
    if (Array.isArray(storedQuestions)) return storedQuestions;
    if (Array.isArray(storedQuestions?.questions)) return storedQuestions.questions;
    return fallbackObj?.questions || [];
}

function computeStreaks(sortedDateStrings) {
    if (!sortedDateStrings.length) {
        return { currentStreak: 0, longestStreak: 0 };
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const timestamps = sortedDateStrings.map((d) => Date.parse(`${d}T00:00:00Z`));

    let longest = 1;
    let run = 1;
    for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] - timestamps[i - 1] === dayMs) {
            run += 1;
            if (run > longest) longest = run;
        } else {
            run = 1;
        }
    }

    let current = 1;
    for (let i = timestamps.length - 1; i > 0; i--) {
        if (timestamps[i] - timestamps[i - 1] === dayMs) {
            current += 1;
        } else {
            break;
        }
    }

    return { currentStreak: current, longestStreak: longest };
}

/**
 * Recomputes user_statistics from completed game_attempts for a USN.
 */
async function syncUserStatistics(supabase, usn) {
    try {
        const { data: attempts, error } = await supabase
            .from('game_attempts')
            .select('game_date, score, metadata')
            .eq('usn', usn);

        if (error) throw error;

        const completed = (attempts || []).filter(isAttemptCompleted);
        const totalPoints = completed.reduce((sum, row) => sum + (Number(row.score) || 0), 0);
        const gamesCompleted = completed.length;

        const uniqueDates = Array.from(new Set(completed.map((r) => r.game_date).filter(Boolean))).sort();
        const { currentStreak, longestStreak } = computeStreaks(uniqueDates);

        const { error: upsertErr } = await supabase
            .from('user_statistics')
            .upsert(
                {
                    usn,
                    total_points: totalPoints,
                    games_completed: gamesCompleted,
                    current_streak: currentStreak,
                    longest_streak: longestStreak,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'usn' }
            );

        if (upsertErr) throw upsertErr;
    } catch (err) {
        console.error('Failed to sync user_statistics:', err.message);
    }
}

module.exports = {
    QUIZ_GAME_KEYS,
    DAILY_QUESTION_KEYS,
    normalizeGameKey,
    isAttemptCompleted,
    getDefaultContentForKey,
    unwrapWordContent,
    unwrapQuizQuestions,
    syncUserStatistics,
};
