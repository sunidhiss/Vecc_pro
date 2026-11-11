const supabase = require('../config/supabase');
const {
    QUIZ_GAME_KEYS,
    normalizeGameKey,
    isAttemptCompleted,
    getDefaultContentForKey,
    unwrapWordContent,
    unwrapQuizQuestions,
    syncUserStatistics,
} = require('../utils/gameKeys');

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getISTDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

async function getDailyGameQuestions(rawGameType, date = getTodayDate()) {
    const gameKey = normalizeGameKey(rawGameType);
    const { data, error } = await supabase
        .from('daily_questions')
        .select('questions')
        .eq('game_key', gameKey)
        .eq('game_date', date)
        .maybeSingle();

    if (error) throw error;
    const stored = data?.questions || null;
    const fallback = getDefaultContentForKey(gameKey);

    if (gameKey === 'wordle' || gameKey === 'unscramble') {
        return { word: unwrapWordContent(stored, fallback) };
    }
    return { questions: unwrapQuizQuestions(stored, fallback) };
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
 * Returns today's points, total points, and completion status for all 7 games from game_attempts.
 */
exports.getStatus = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const istToday = getISTDate();

        const { data: attempts, error } = await supabase
            .from('game_attempts')
            .select('game_date, game_key, score, metadata')
            .eq('usn', req.user.usn);

        if (error) throw error;

        let todayPoints = 0;
        let totalPoints = 0;
        const played = {
            wordle: false,
            aptitude: false,
            tech: false,
            unscramble: false,
            fluency: false,
            output: false,
            query_quest: false,
        };

        for (const a of attempts || []) {
            const key = normalizeGameKey(a.game_key);
            if (!key) continue;

            if (isAttemptCompleted(a)) {
                const pts = Number(a.score) || 0;
                totalPoints += pts;
                const isToday = key === 'query_quest' ? a.game_date === istToday : a.game_date === today;
                if (isToday) {
                    todayPoints += pts;
                    if (key === 'query_quest') {
                        // Mark completed once any or all missions are done; metadata tracks count
                        played.query_quest = Boolean(a.metadata?.allCompleted ?? (pts > 0));
                    } else if (Object.prototype.hasOwnProperty.call(played, key)) {
                        played[key] = true;
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
 * Checks daily Wordle status in game_attempts and restores in-progress guesses if any.
 */
exports.getWordle = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: attempt, error } = await supabase
            .from('game_attempts')
            .select('score, metadata')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_key', 'wordle')
            .maybeSingle();

        if (error) throw error;

        if (attempt && isAttemptCompleted(attempt)) {
            return res.json({ alreadyPlayed: true });
        }

        if (attempt && !isAttemptCompleted(attempt)) {
            return res.json({
                alreadyPlayed: false,
                inProgress: true,
                guesses: attempt.metadata?.guesses || [],
                results: attempt.metadata?.results || [],
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
 * Evaluates a 5-letter Wordle guess server-side and persists progress/score in game_attempts.
 */
exports.submitWordleGuess = async (req, res, next) => {
    try {
        const rawGuess = (req.body.guess || '').trim().toUpperCase();
        if (!/^[A-Z]{5}$/.test(rawGuess)) {
            return res.status(400).json({ error: 'Guess must be 5 letters' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_attempts')
            .select('id, score, metadata')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_key', 'wordle')
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing && isAttemptCompleted(existing)) {
            return res.status(400).json({ error: 'You already played Wordle today!' });
        }

        const content = await getDailyGameQuestions('wordle', today);
        const targetWord = (content.word || 'FLAME').toUpperCase();
        const result = evaluateGuess(rawGuess, targetWord);

        const prevGuesses = existing?.metadata?.guesses || [];
        const prevResults = existing?.metadata?.results || [];
        const guesses = [...prevGuesses, rawGuess];
        const results = [...prevResults, result];

        const won = rawGuess === targetWord;
        const gameOver = won || guesses.length >= 6;
        const score = won ? 50 : gameOver ? 5 : 0;

        const metadata = {
            guesses,
            results,
            won,
            completed: gameOver,
            ...(gameOver ? { word: targetWord } : {}),
        };

        if (existing) {
            const { error: updateErr } = await supabase
                .from('game_attempts')
                .update({
                    score,
                    metadata,
                    ...(gameOver ? { completed_at: new Date().toISOString() } : {}),
                })
                .eq('id', existing.id);

            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await supabase
                .from('game_attempts')
                .insert({
                    usn: req.user.usn,
                    game_date: today,
                    game_key: 'wordle',
                    score,
                    metadata,
                });

            if (insertErr) {
                if (insertErr.code === '23505') {
                    return res.status(400).json({ error: 'You already played Wordle today!' });
                }
                throw insertErr;
            }
        }

        if (gameOver) {
            await syncUserStatistics(supabase, req.user.usn);
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
 * Serves today's daily_questions quiz without revealing correct answers.
 */
exports.getQuiz = async (req, res, next) => {
    try {
        const gameKey = normalizeGameKey(req.params.type);
        if (!gameKey || !QUIZ_GAME_KEYS.has(gameKey)) {
            return res.status(400).json({ error: 'Invalid quiz type' });
        }

        const today = getTodayDate();
        const { data: attempt, error } = await supabase
            .from('game_attempts')
            .select('id, metadata')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_key', gameKey)
            .maybeSingle();

        if (error) throw error;
        if (attempt && isAttemptCompleted(attempt)) {
            return res.json({ alreadyPlayed: true });
        }

        const content = await getDailyGameQuestions(gameKey, today);
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
 * Grades submitted quiz answers server-side and saves one daily score to game_attempts.
 */
exports.submitQuiz = async (req, res, next) => {
    try {
        const gameKey = normalizeGameKey(req.params.type);
        const { answers } = req.body;

        if (!gameKey || !QUIZ_GAME_KEYS.has(gameKey)) {
            return res.status(400).json({ error: 'Invalid quiz type' });
        }
        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'Answers array is required' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_attempts')
            .select('id, metadata')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_key', gameKey)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing && isAttemptCompleted(existing)) {
            return res.status(400).json({ error: 'You already played this quiz today!' });
        }

        const content = await getDailyGameQuestions(gameKey, today);
        const questions = content.questions || [];
        let score = 0;
        const correctAnswers = questions.map((q, idx) => {
            if (answers[idx] === q.answer) {
                score += 10;
            }
            return q.answer;
        });

        const { error: insertErr } = await supabase
            .from('game_attempts')
            .insert({
                usn: req.user.usn,
                game_date: today,
                game_key: gameKey,
                score,
                completed_at: new Date().toISOString(),
                metadata: {
                    completed: true,
                    answers,
                    totalQuestions: questions.length,
                },
            });

        if (insertErr) {
            if (insertErr.code === '23505') {
                return res.status(400).json({ error: 'You already played this quiz today!' });
            }
            throw insertErr;
        }

        await syncUserStatistics(supabase, req.user.usn);

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
 * Serves today's scrambled word from daily_questions without revealing the original word.
 */
exports.getUnscramble = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: attempt, error } = await supabase
            .from('game_attempts')
            .select('metadata')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_key', 'unscramble')
            .maybeSingle();

        if (error) throw error;
        if (attempt && isAttemptCompleted(attempt)) {
            return res.json({
                alreadyPlayed: true,
                win: Boolean(attempt.metadata?.win),
                word: attempt.metadata?.word || '',
                date: today,
            });
        }

        const content = await getDailyGameQuestions('unscramble', today);
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
 * Validates the single-attempt unscramble guess server-side and saves to game_attempts.
 */
exports.submitUnscramble = async (req, res, next) => {
    try {
        const rawGuess = (req.body.guess || '').trim().toUpperCase();
        if (!rawGuess) {
            return res.status(400).json({ error: 'Guess is required' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_attempts')
            .select('id, metadata')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_key', 'unscramble')
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing && isAttemptCompleted(existing)) {
            return res.status(400).json({ error: 'You already played Unscramble today!' });
        }

        const content = await getDailyGameQuestions('unscramble', today);
        const targetWord = (content.word || 'REACT').toUpperCase();
        const correct = rawGuess === targetWord;
        const score = correct ? 50 : 0;

        const { error: insertErr } = await supabase
            .from('game_attempts')
            .insert({
                usn: req.user.usn,
                game_date: today,
                game_key: 'unscramble',
                score,
                completed_at: new Date().toISOString(),
                metadata: {
                    completed: true,
                    win: correct,
                    word: targetWord,
                    guess: rawGuess,
                },
            });

        if (insertErr) {
            if (insertErr.code === '23505') {
                return res.status(400).json({ error: 'You already played Unscramble today!' });
            }
            throw insertErr;
        }

        await syncUserStatistics(supabase, req.user.usn);

        return res.json({
            correct,
            score,
            word: targetWord,
        });
    } catch (err) {
        next(err);
    }
};
