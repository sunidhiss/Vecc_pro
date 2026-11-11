const supabase = require('../config/supabase');
const DEFAULTS = require('../utils/defaults');

const QUIZ_TYPES = ['aptitude', 'techquiz', 'fluencyquiz', 'outputquiz'];

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

async function getDailyGameContent(gameType, date = getTodayDate()) {
    const { data, error } = await supabase
        .from('daily_games')
        .select('content')
        .eq('game_date', date)
        .eq('game_type', gameType)
        .maybeSingle();

    if (error) throw error;
    return data?.content || DEFAULTS[gameType];
}

/**
 * Evaluates a 5-letter Wordle guess against the target word, handling duplicates accurately.
 */
function evaluateGuess(guess, target) {
    const result = Array(5).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');
    const used = Array(5).fill(false);

    for (let i = 0; i < 5; i++) {
        if (guessChars[i] === targetChars[i]) {
            result[i] = 'correct';
            used[i] = true;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (result[i] === 'correct') continue;
        for (let j = 0; j < 5; j++) {
            if (!used[j] && guessChars[i] === targetChars[j]) {
                result[i] = 'present';
                used[j] = true;
                break;
            }
        }
    }

    return result;
}

function scrambleWord(word) {
    if (word.length <= 1) return word;
    let scrambled = word;
    let limit = 20;
    while (scrambled === word && limit > 0) {
        scrambled = word
            .split('')
            .sort(() => 0.5 - Math.random())
            .join('');
        limit--;
    }
    return scrambled;
}

/**
 * GET /api/games/today
 * Returns today's points, total points, and completion status for each game.
 */
exports.getStatus = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: sessions, error } = await supabase
            .from('game_sessions')
            .select('game_date, game_type, score, completed')
            .eq('user_id', req.user.id);

        if (error) throw error;

        let todayPoints = 0;
        let totalPoints = 0;
        const played = {
            wordle: false,
            aptitude: false,
            techquiz: false,
            fluencyquiz: false,
            outputquiz: false,
            unscramble: false,
        };

        for (const s of sessions || []) {
            if (s.completed) {
                totalPoints += s.score || 0;
                if (s.game_date === today) {
                    todayPoints += s.score || 0;
                    if (Object.prototype.hasOwnProperty.call(played, s.game_type)) {
                        played[s.game_type] = true;
                    }
                }
            }
        }

        return res.json({ todayPoints, totalPoints, played });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/games/wordle
 * Checks daily Wordle status and restores in-progress guesses if any.
 */
exports.getWordle = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: session, error } = await supabase
            .from('game_sessions')
            .select('completed, details')
            .eq('user_id', req.user.id)
            .eq('game_date', today)
            .eq('game_type', 'wordle')
            .maybeSingle();

        if (error) throw error;

        if (session?.completed) {
            return res.json({ alreadyPlayed: true });
        }

        if (session && !session.completed) {
            return res.json({
                alreadyPlayed: false,
                inProgress: true,
                guesses: session.details?.guesses || [],
                results: session.details?.results || [],
                wordLength: 5,
                maxGuesses: 6,
            });
        }

        return res.json({
            alreadyPlayed: false,
            inProgress: false,
            wordLength: 5,
            maxGuesses: 6,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/games/wordle/guess
 * Validates and evaluates a single 5-letter Wordle guess server-side.
 */
exports.submitWordleGuess = async (req, res, next) => {
    try {
        const rawGuess = (req.body.guess || '').trim().toUpperCase();
        if (!/^[A-Z]{5}$/.test(rawGuess)) {
            return res.status(400).json({ error: 'Guess must be 5 letters' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_sessions')
            .select('id, completed, details')
            .eq('user_id', req.user.id)
            .eq('game_date', today)
            .eq('game_type', 'wordle')
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing?.completed) {
            return res.status(400).json({ error: 'You already played Wordle today!' });
        }

        const content = await getDailyGameContent('wordle', today);
        const targetWord = (content.word || 'FLAME').toUpperCase();
        const result = evaluateGuess(rawGuess, targetWord);

        const prevGuesses = existing?.details?.guesses || [];
        const prevResults = existing?.details?.results || [];
        const guesses = [...prevGuesses, rawGuess];
        const results = [...prevResults, result];

        const won = rawGuess === targetWord;
        const gameOver = won || guesses.length >= 6;
        const score = won ? 50 : gameOver ? 5 : 0;

        const details = { guesses, results };

        if (existing) {
            const { error: updateErr } = await supabase
                .from('game_sessions')
                .update({
                    score,
                    completed: gameOver,
                    details,
                    completed_at: gameOver ? new Date().toISOString() : null,
                })
                .eq('id', existing.id);

            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await supabase
                .from('game_sessions')
                .insert({
                    user_id: req.user.id,
                    game_date: today,
                    game_type: 'wordle',
                    score,
                    completed: gameOver,
                    details,
                    completed_at: gameOver ? new Date().toISOString() : null,
                });

            if (insertErr) throw insertErr;
        }

        return res.json({
            result,
            guessNumber: guesses.length,
            gameOver,
            won,
            ...(gameOver && { score, word: targetWord }),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/games/quiz/:type
 * Serves today's quiz questions without revealing correct answers.
 */
exports.getQuiz = async (req, res, next) => {
    try {
        const { type } = req.params;
        if (!QUIZ_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid quiz type' });
        }

        const today = getTodayDate();
        const { data: session, error } = await supabase
            .from('game_sessions')
            .select('completed')
            .eq('user_id', req.user.id)
            .eq('game_date', today)
            .eq('game_type', type)
            .maybeSingle();

        if (error) throw error;
        if (session?.completed) {
            return res.json({ alreadyPlayed: true });
        }

        const content = await getDailyGameContent(type, today);
        const safeQuestions = (content.questions || []).map(({ q, options, code }) => ({
            q,
            options,
            ...(code !== undefined ? { code } : {}),
        }));

        return res.json({
            alreadyPlayed: false,
            questions: safeQuestions,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/games/quiz/:type/submit
 * Grades submitted quiz answers server-side and records the session score.
 */
exports.submitQuiz = async (req, res, next) => {
    try {
        const { type } = req.params;
        const { answers } = req.body;

        if (!QUIZ_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid quiz type' });
        }
        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'Answers array is required' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_sessions')
            .select('completed')
            .eq('user_id', req.user.id)
            .eq('game_date', today)
            .eq('game_type', type)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing?.completed) {
            return res.status(400).json({ error: 'You already played this quiz today!' });
        }

        const content = await getDailyGameContent(type, today);
        const questions = content.questions || [];
        let score = 0;
        const correctAnswers = questions.map((q, idx) => {
            if (answers[idx] === q.answer) {
                score += 10;
            }
            return q.answer;
        });

        const { error: insertErr } = await supabase
            .from('game_sessions')
            .insert({
                user_id: req.user.id,
                game_date: today,
                game_type: type,
                score,
                completed: true,
                details: { answers },
            });

        if (insertErr) throw insertErr;

        return res.json({
            score,
            total: questions.length * 10,
            correctAnswers,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/games/unscramble
 * Serves today's scrambled word (hiding the original).
 */
exports.getUnscramble = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: session, error } = await supabase
            .from('game_sessions')
            .select('completed, details')
            .eq('user_id', req.user.id)
            .eq('game_date', today)
            .eq('game_type', 'unscramble')
            .maybeSingle();

        if (error) throw error;
        if (session?.completed) {
            return res.json({
                alreadyPlayed: true,
                win: Boolean(session.details?.win),
                word: session.details?.word || '',
                date: today,
            });
        }

        const content = await getDailyGameContent('unscramble', today);
        const targetWord = (content.word || 'REACT').toUpperCase();

        return res.json({
            alreadyPlayed: false,
            scrambledWord: scrambleWord(targetWord),
            wordLength: targetWord.length,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/games/unscramble/submit
 * Validates the single-attempt unscramble guess server-side.
 */
exports.submitUnscramble = async (req, res, next) => {
    try {
        const rawGuess = (req.body.guess || '').trim().toUpperCase();
        if (!rawGuess) {
            return res.status(400).json({ error: 'Guess is required' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_sessions')
            .select('completed')
            .eq('user_id', req.user.id)
            .eq('game_date', today)
            .eq('game_type', 'unscramble')
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing?.completed) {
            return res.status(400).json({ error: 'You already played Unscramble today!' });
        }

        const content = await getDailyGameContent('unscramble', today);
        const targetWord = (content.word || 'REACT').toUpperCase();
        const correct = rawGuess === targetWord;
        const score = correct ? 50 : 0;

        const { error: insertErr } = await supabase
            .from('game_sessions')
            .insert({
                user_id: req.user.id,
                game_date: today,
                game_type: 'unscramble',
                score,
                completed: true,
                details: { win: correct, word: targetWord, guess: rawGuess },
            });

        if (insertErr) throw insertErr;

        return res.json({
            correct,
            score,
            word: targetWord,
        });
    } catch (err) {
        next(err);
    }
};
