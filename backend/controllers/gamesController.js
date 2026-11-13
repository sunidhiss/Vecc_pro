const supabase = require('../config/supabase');
const {
    QUIZ_GAME_KEYS,
    normalizeGameKey,
    isScoreCompleted,
    getDefaultContentForKey,
    unwrapWordContent,
    unwrapQuizQuestions,
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
    if (!gameKey) return getDefaultContentForKey('wordle');

    // Query daily_questions table (checks game_name or fallback game_key during transition)
    const { data, error } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('game_date', date)
        .maybeSingle();

    if (error || !data || (!data.questions && !data.word)) {
        return getDefaultContentForKey(gameKey);
    }

    return data.questions || data;
}

function evaluateGuess(guess, targetWord) {
    const result = Array(5).fill('absent');
    const targetLetters = targetWord.split('');
    const guessLetters = guess.split('');

    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct';
            targetLetters[i] = null;
            guessLetters[i] = null;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
            result[i] = 'present';
            targetLetters[targetLetters.indexOf(guessLetters[i])] = null;
        }
    }

    return result;
}

function scrambleWord(word) {
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
 * Returns today's points, total points, and played status from game_scores.
 */
exports.getStatus = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const istToday = getISTDate();

        const { data: scores, error } = await supabase
            .from('game_scores')
            .select('game_date, game_name, score, details')
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

        for (const s of scores || []) {
            const key = normalizeGameKey(s.game_name);
            if (!key) continue;

            if (isScoreCompleted(s)) {
                const pts = Number(s.score) || 0;
                totalPoints += pts;
                const isToday = key === 'query_quest' ? s.game_date === istToday : s.game_date === today;
                if (isToday) {
                    todayPoints += pts;
                    if (key === 'query_quest') {
                        played.query_quest = Boolean(s.details?.completed ?? (pts > 0));
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
 * Checks daily Wordle status in game_scores.
 */
exports.getWordle = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: scoreRow, error } = await supabase
            .from('game_scores')
            .select('score, details')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_name', 'wordle')
            .maybeSingle();

        if (error) throw error;

        if (scoreRow && isScoreCompleted(scoreRow)) {
            return res.json({ alreadyPlayed: true });
        }

        if (scoreRow && !isScoreCompleted(scoreRow)) {
            return res.json({
                alreadyPlayed: false,
                inProgress: true,
                guesses: scoreRow.details?.guesses || [],
                results: scoreRow.details?.results || [],
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
 * Evaluates Wordle guess server-side and saves state in game_scores.
 */
exports.submitWordleGuess = async (req, res, next) => {
    try {
        const rawGuess = (req.body.guess || '').trim().toUpperCase();
        if (!/^[A-Z]{5}$/.test(rawGuess)) {
            return res.status(400).json({ error: 'Guess must be 5 letters' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_scores')
            .select('id, score, details')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_name', 'wordle')
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing && isScoreCompleted(existing)) {
            return res.status(400).json({ error: 'You already played Wordle today!' });
        }

        const content = await getDailyGameQuestions('wordle', today);
        const targetWord = (content.word || 'FLAME').toUpperCase();
        const result = evaluateGuess(rawGuess, targetWord);

        const prevGuesses = existing?.details?.guesses || [];
        const prevResults = existing?.details?.results || [];
        const guesses = [...prevGuesses, rawGuess];
        const results = [...prevResults, result];

        const won = rawGuess === targetWord;
        const gameOver = won || guesses.length >= 6;
        const score = won ? 50 : gameOver ? 5 : 0;

        const details = {
            guesses,
            results,
            won,
            completed: gameOver,
            ...(gameOver ? { word: targetWord } : {}),
        };

        if (existing) {
            const { error: updateErr } = await supabase
                .from('game_scores')
                .update({
                    score,
                    details,
                    ...(gameOver ? { completed_at: new Date().toISOString() } : {}),
                })
                .eq('id', existing.id);

            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await supabase
                .from('game_scores')
                .insert({
                    usn: req.user.usn,
                    game_date: today,
                    game_name: 'wordle',
                    score,
                    details,
                });

            if (insertErr) {
                if (insertErr.code === '23505') {
                    return res.status(400).json({ error: 'You already played Wordle today!' });
                }
                throw insertErr;
            }
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
 * Serves today's quiz without revealing correct answers.
 */
exports.getQuiz = async (req, res, next) => {
    try {
        const gameKey = normalizeGameKey(req.params.type);
        if (!gameKey || !QUIZ_GAME_KEYS.has(gameKey)) {
            return res.status(400).json({ error: 'Invalid quiz type' });
        }

        const today = getTodayDate();
        const { data: scoreRow, error } = await supabase
            .from('game_scores')
            .select('id, details')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_name', gameKey)
            .maybeSingle();

        if (error) throw error;
        if (scoreRow && isScoreCompleted(scoreRow)) {
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
 * Grades quiz server-side and records score in game_scores.
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
            .from('game_scores')
            .select('id, details')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_name', gameKey)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing && isScoreCompleted(existing)) {
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
            .from('game_scores')
            .insert({
                usn: req.user.usn,
                game_date: today,
                game_name: gameKey,
                score,
                completed_at: new Date().toISOString(),
                details: {
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
 * Serves scrambled word from daily_questions.
 */
exports.getUnscramble = async (req, res, next) => {
    try {
        const today = getTodayDate();
        const { data: scoreRow, error } = await supabase
            .from('game_scores')
            .select('details')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_name', 'unscramble')
            .maybeSingle();

        if (error) throw error;
        if (scoreRow && isScoreCompleted(scoreRow)) {
            return res.json({
                alreadyPlayed: true,
                win: Boolean(scoreRow.details?.win),
                word: scoreRow.details?.word || '',
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
 * Validates unscramble guess and records in game_scores.
 */
exports.submitUnscramble = async (req, res, next) => {
    try {
        const rawGuess = (req.body.guess || '').trim().toUpperCase();
        if (!rawGuess) {
            return res.status(400).json({ error: 'Guess is required' });
        }

        const today = getTodayDate();
        const { data: existing, error: fetchErr } = await supabase
            .from('game_scores')
            .select('id, details')
            .eq('usn', req.user.usn)
            .eq('game_date', today)
            .eq('game_name', 'unscramble')
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (existing && isScoreCompleted(existing)) {
            return res.status(400).json({ error: 'You already played Unscramble today!' });
        }

        const content = await getDailyGameQuestions('unscramble', today);
        const targetWord = (content.word || 'REACT').toUpperCase();
        const correct = rawGuess === targetWord;
        const score = correct ? 50 : 0;

        const { error: insertErr } = await supabase
            .from('game_scores')
            .insert({
                usn: req.user.usn,
                game_date: today,
                game_name: 'unscramble',
                score,
                completed_at: new Date().toISOString(),
                details: {
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

        return res.json({
            correct,
            score,
            word: targetWord,
        });
    } catch (err) {
        next(err);
    }
};
