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

function isScoreCompleted(scoreRow) {
    if (!scoreRow) return false;
    // In Wordle, in-progress guesses have details.completed === false
    return scoreRow.details?.completed !== false;
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

module.exports = {
    QUIZ_GAME_KEYS,
    DAILY_QUESTION_KEYS,
    normalizeGameKey,
    isScoreCompleted,
    getDefaultContentForKey,
    unwrapWordContent,
    unwrapQuizQuestions,
};
