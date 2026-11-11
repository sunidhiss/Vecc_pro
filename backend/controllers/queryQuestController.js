const supabase = require('../config/supabase');
const DEFAULT_MISSIONS = require('../utils/queryQuestDefaults');
const { validateStudentQuery, ValidationError } = require('../services/sqlValidationService');
const { executeSandboxedQuery } = require('../services/sqlExecutionService');
const { evaluateQueryResult } = require('../services/queryEvaluationService');
const { scoreQuerySolution } = require('../services/queryScoringService');
const { syncUserStatistics } = require('../utils/gameKeys');
const {
    isValidUuid,
    getISTDate,
    toDbDifficulty,
    toUiDifficulty,
    unpackChallengeMeta,
    packExpectedResult,
} = require('../utils/queryQuestMeta');

const MAX_DAILY_MISSIONS = 6;
const MAX_DAILY_POINTS = 60;

// Prevents concurrent requests on a new IST day from duplicating default missions
const seedingLocks = new Map();

function sortChallengesByOrder(list) {
    return [...(list || [])].sort(
        (a, b) => unpackChallengeMeta(a).missionOrder - unpackChallengeMeta(b).missionOrder
    );
}

/**
 * Ensures today's IST date has active Query Quest challenges provisioned (seeds defaults if empty).
 */
async function ensureTodayChallenges(today) {
    const { data: existing, error } = await supabase
        .from('query_quest_challenges')
        .select('*')
        .eq('challenge_date', today)
        .eq('is_active', true);

    if (error) throw error;
    if (existing && existing.length > 0) {
        return sortChallengesByOrder(existing).slice(0, MAX_DAILY_MISSIONS);
    }

    if (seedingLocks.has(today)) {
        await seedingLocks.get(today);
        const { data: afterWait, error: waitErr } = await supabase
            .from('query_quest_challenges')
            .select('*')
            .eq('challenge_date', today)
            .eq('is_active', true);
        if (waitErr) throw waitErr;
        return sortChallengesByOrder(afterWait).slice(0, MAX_DAILY_MISSIONS);
    }

    const seedPromise = (async () => {
        const { data: anyForDate, error: checkErr } = await supabase
            .from('query_quest_challenges')
            .select('id')
            .eq('challenge_date', today)
            .limit(1);

        if (checkErr) throw checkErr;
        if (anyForDate && anyForDate.length > 0) {
            return;
        }

        const rowsToInsert = DEFAULT_MISSIONS.map((m) => ({
            title: m.title,
            description: m.description,
            difficulty: toDbDifficulty(m.difficulty) || 'easy',
            topic: m.topic,
            scenario: m.scenario,
            schema_definition: m.schema_definition,
            seed_data: m.seed_data,
            expected_result: packExpectedResult({
                expectedResult: m.expected_result,
                missionOrder: m.mission_order,
                hints: m.hints,
                explanation: m.explanation,
                starterQuery: m.starter_query,
            }),
            challenge_date: today,
            points: 10,
            is_active: true,
        }));

        const { error: insertErr } = await supabase
            .from('query_quest_challenges')
            .insert(rowsToInsert);

        if (insertErr) throw insertErr;
    })();

    seedingLocks.set(today, seedPromise);
    try {
        await seedPromise;
    } finally {
        seedingLocks.delete(today);
    }

    const { data: seeded, error: fetchErr } = await supabase
        .from('query_quest_challenges')
        .select('*')
        .eq('challenge_date', today)
        .eq('is_active', true);

    if (fetchErr) throw fetchErr;
    return sortChallengesByOrder(seeded).slice(0, MAX_DAILY_MISSIONS);
}

function buildSampleData(seedData) {
    const tables = seedData?.tables || {};
    const samples = {};
    for (const [tableName, rows] of Object.entries(tables)) {
        samples[tableName] = Array.isArray(rows) ? rows.slice(0, 6) : [];
    }
    return samples;
}

function sanitizeChallengeForStudent(challenge, attempt) {
    const { missionOrder, hints, explanation, starterQuery } = unpackChallengeMeta(challenge);
    const hintsUsed = attempt?.hints_used || 0;
    const isCompleted = Boolean(attempt?.is_correct);
    const pointsAwarded = attempt?.points_awarded || 0;

    return {
        id: challenge.id,
        missionOrder,
        title: challenge.title,
        difficulty: toUiDifficulty(challenge.difficulty),
        topic: challenge.topic,
        scenario: challenge.scenario,
        description: challenge.description,
        schemaDefinition: challenge.schema_definition,
        sampleData: buildSampleData(challenge.seed_data),
        starterQuery: attempt?.submitted_query || starterQuery,
        challengeDate: challenge.challenge_date,
        maxPoints: challenge.points || 10,
        totalHints: hints.length,
        hintsUsed,
        revealedHints: hints.slice(0, hintsUsed),
        completed: isCompleted,
        isOptimal: isCompleted && pointsAwarded >= 10,
        pointsAwarded,
        attemptsCount: attempt?.attempts_count || 0,
        ...(isCompleted ? { explanation } : {}),
    };
}

async function logExecution(usn, challengeId, status, durationMs, errorCategory = null) {
    try {
        await supabase.from('query_quest_execution_logs').insert({
            usn,
            challenge_id: challengeId,
            execution_status: String(status || 'unknown').slice(0, 30),
            execution_duration: Math.max(0, Math.round(durationMs || 0)),
            error_category: errorCategory,
        });
    } catch (err) {
        console.error('Failed to record execution log:', err.message);
    }
}

/**
 * Records a Query Quest attempt atomically against query_quest_attempts (preventing duplicate
 * point awards per challenge) and syncs daily Query Quest points into game_attempts + user_statistics.
 */
async function recordAttemptAndSyncGame({
    usn,
    challenge,
    submittedQuery,
    isCorrect,
    executionTime,
    points,
}) {
    const { data: existingAttempt, error: fetchErr } = await supabase
        .from('query_quest_attempts')
        .select('*')
        .eq('usn', usn)
        .eq('challenge_id', challenge.id)
        .maybeSingle();

    if (fetchErr) throw fetchErr;

    let alreadyCompleted = false;
    let awardedNow = 0;
    let attemptsCount = 1;

    if (existingAttempt) {
        attemptsCount = (existingAttempt.attempts_count || 0) + 1;
        if (existingAttempt.is_correct) {
            alreadyCompleted = true;
            const { error: updErr } = await supabase
                .from('query_quest_attempts')
                .update({
                    submitted_query: submittedQuery,
                    execution_time: executionTime,
                    attempts_count: attemptsCount,
                })
                .eq('id', existingAttempt.id);
            if (updErr) throw updErr;
        } else {
            const earned = isCorrect ? points : 0;
            awardedNow = earned;
            const { error: updErr } = await supabase
                .from('query_quest_attempts')
                .update({
                    submitted_query: submittedQuery,
                    is_correct: isCorrect,
                    execution_time: executionTime,
                    attempts_count: attemptsCount,
                    points_awarded: earned,
                    ...(isCorrect ? { completed_at: new Date().toISOString() } : {}),
                })
                .eq('id', existingAttempt.id);
            if (updErr) throw updErr;
        }
    } else {
        const earned = isCorrect ? points : 0;
        awardedNow = earned;
        const { error: insErr } = await supabase
            .from('query_quest_attempts')
            .insert({
                usn,
                challenge_id: challenge.id,
                submitted_query: submittedQuery,
                is_correct: isCorrect,
                execution_time: executionTime,
                attempts_count: 1,
                hints_used: 0,
                points_awarded: earned,
                ...(isCorrect ? { completed_at: new Date().toISOString() } : {}),
            });
        if (insErr) throw insErr;
    }

    // Recompute student's Query Quest score for challenge.challenge_date and sync game_attempts
    const { data: dateChallenges, error: chListErr } = await supabase
        .from('query_quest_challenges')
        .select('id')
        .eq('challenge_date', challenge.challenge_date)
        .eq('is_active', true);

    if (chListErr) throw chListErr;

    const dateIds = (dateChallenges || []).map((c) => c.id);
    let totalQqToday = 0;
    let completedCount = 0;

    if (dateIds.length > 0) {
        const { data: dateAttempts, error: daErr } = await supabase
            .from('query_quest_attempts')
            .select('challenge_id, is_correct, points_awarded')
            .eq('usn', usn)
            .in('challenge_id', dateIds);

        if (daErr) throw daErr;

        totalQqToday = Math.min(
            MAX_DAILY_POINTS,
            (dateAttempts || []).reduce((sum, a) => sum + (Number(a.points_awarded) || 0), 0)
        );
        completedCount = (dateAttempts || []).filter((a) => a.is_correct).length;
    }

    const { data: existingGameAttempt, error: gaFetchErr } = await supabase
        .from('game_attempts')
        .select('id')
        .eq('usn', usn)
        .eq('game_key', 'query_quest')
        .eq('game_date', challenge.challenge_date)
        .maybeSingle();

    if (gaFetchErr) throw gaFetchErr;

    const gameMetadata = {
        completed: completedCount > 0,
        allCompleted: dateIds.length > 0 && completedCount >= dateIds.length,
        completedCount,
        totalMissions: dateIds.length || MAX_DAILY_MISSIONS,
    };

    if (existingGameAttempt) {
        const { error: gaUpdErr } = await supabase
            .from('game_attempts')
            .update({
                score: totalQqToday,
                completed_at: new Date().toISOString(),
                metadata: gameMetadata,
            })
            .eq('id', existingGameAttempt.id);
        if (gaUpdErr) throw gaUpdErr;
    } else if (totalQqToday > 0 || completedCount > 0) {
        const { error: gaInsErr } = await supabase
            .from('game_attempts')
            .insert({
                usn,
                game_key: 'query_quest',
                game_date: challenge.challenge_date,
                score: totalQqToday,
                completed_at: new Date().toISOString(),
                metadata: gameMetadata,
            });
        if (gaInsErr) throw gaInsErr;
    }

    await syncUserStatistics(supabase, usn);

    return {
        awardedNow,
        alreadyCompleted,
        totalQqToday,
        attemptsCount,
    };
}

/**
 * GET /api/query-quest/today
 * Returns today's 6 daily missions (IST) without expected_result plus student progress.
 */
exports.getTodayChallenges = async (req, res, next) => {
    try {
        const today = getISTDate();
        const challenges = await ensureTodayChallenges(today);

        const challengeIds = challenges.map((c) => c.id);
        let attempts = [];
        if (challengeIds.length > 0) {
            const { data: attData, error: attErr } = await supabase
                .from('query_quest_attempts')
                .select('*')
                .eq('usn', req.user.usn)
                .in('challenge_id', challengeIds);

            if (attErr) throw attErr;
            attempts = attData || [];
        }

        const attemptMap = new Map(attempts.map((a) => [a.challenge_id, a]));
        const safeChallenges = challenges.map((ch) => sanitizeChallengeForStudent(ch, attemptMap.get(ch.id)));

        const completedCount = safeChallenges.filter((c) => c.completed).length;
        const todayPoints = Math.min(
            MAX_DAILY_POINTS,
            safeChallenges.reduce((sum, c) => sum + (c.pointsAwarded || 0), 0)
        );

        return res.json({
            date: today,
            challenges: safeChallenges,
            progress: {
                completedCount,
                totalMissions: safeChallenges.length,
                todayPoints,
                maxPoints: MAX_DAILY_POINTS,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/query-quest/challenges/:id
 * Returns a single mission's details, schema, sample rows, and student state.
 */
exports.getChallengeById = async (req, res, next) => {
    try {
        const challengeId = req.params.id;
        if (!isValidUuid(challengeId)) {
            return res.status(400).json({ error: 'Invalid challenge ID' });
        }

        const { data: challenge, error } = await supabase
            .from('query_quest_challenges')
            .select('*')
            .eq('id', challengeId)
            .eq('is_active', true)
            .maybeSingle();

        if (error) throw error;
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        const { data: attempt, error: attErr } = await supabase
            .from('query_quest_attempts')
            .select('*')
            .eq('usn', req.user.usn)
            .eq('challenge_id', challengeId)
            .maybeSingle();

        if (attErr) throw attErr;

        return res.json({
            challenge: sanitizeChallengeForStudent(challenge, attempt),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/query-quest/execute
 * Validates, executes in isolated PostgreSQL sandbox, grades against expected_result,
 * scores optimality, and atomically records completion + leaderboard sync.
 */
exports.executeQuery = async (req, res, next) => {
    try {
        const challengeId = req.body?.challengeId;
        const rawSql = req.body?.query;

        if (!isValidUuid(challengeId)) {
            return res.status(400).json({ error: 'Valid challengeId is required' });
        }

        const { data: challenge, error: chErr } = await supabase
            .from('query_quest_challenges')
            .select('*')
            .eq('id', challengeId)
            .eq('is_active', true)
            .maybeSingle();

        if (chErr) throw chErr;
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found or inactive' });
        }

        // 1. Strict AST SQL validation (single read-only SELECT / WITH-SELECT)
        let validated;
        try {
            validated = validateStudentQuery(rawSql);
        } catch (valErr) {
            if (valErr instanceof ValidationError) {
                await logExecution(req.user.usn, challengeId, valErr.category, 0, valErr.category);
                return res.status(400).json({
                    success: false,
                    columns: [],
                    rows: [],
                    rowCount: 0,
                    durationMs: 0,
                    error: valErr.message,
                    errorCategory: valErr.category,
                    isCorrect: false,
                    pointsAwarded: 0,
                });
            }
            throw valErr;
        }

        // 2. Execute against isolated practice PostgreSQL instance / schema
        const execResult = await executeSandboxedQuery(validated.cleanSql, challengeId, challenge);

        if (!execResult.success) {
            await logExecution(
                req.user.usn,
                challengeId,
                execResult.errorCategory || 'runtime_error',
                execResult.durationMs,
                execResult.errorCategory
            );

            return res.json({
                success: false,
                columns: [],
                rows: [],
                rowCount: 0,
                truncated: false,
                durationMs: execResult.durationMs,
                error: execResult.error,
                errorCategory: execResult.errorCategory,
                isCorrect: false,
                pointsAwarded: 0,
            });
        }

        // 3. Evaluate actual result vs hidden expected_result
        const evaluation = evaluateQueryResult(execResult, challenge.expected_result);

        // 4. Assess optimality (5 pts standard, 10 pts optimal, 0 pts incorrect)
        const scoring = scoreQuerySolution(evaluation.isCorrect, validated.features, challenge.expected_result);

        // 5. Record attempt & sync daily score into game_attempts + user_statistics
        const syncRow = await recordAttemptAndSyncGame({
            usn: req.user.usn,
            challenge,
            submittedQuery: validated.cleanSql,
            isCorrect: evaluation.isCorrect,
            executionTime: execResult.durationMs,
            points: scoring.points,
        });

        await logExecution(
            req.user.usn,
            challengeId,
            evaluation.isCorrect ? 'success' : 'wrong_result',
            execResult.durationMs,
            evaluation.isCorrect ? null : 'wrong_result'
        );

        const { explanation } = unpackChallengeMeta(challenge);

        return res.json({
            success: true,
            columns: execResult.columns,
            rows: execResult.rows,
            rowCount: execResult.rowCount,
            truncated: execResult.truncated,
            durationMs: execResult.durationMs,
            error: null,
            errorCategory: null,
            isCorrect: evaluation.isCorrect,
            feedback: evaluation.feedback,
            mismatchDetail: evaluation.mismatchDetail,
            isOptimal: scoring.isOptimal,
            optimalityFeedback: scoring.optimalityFeedback,
            pointsAwarded: syncRow.awardedNow,
            alreadyCompleted: syncRow.alreadyCompleted,
            totalQqToday: syncRow.totalQqToday,
            attemptsCount: syncRow.attemptsCount,
            ...(evaluation.isCorrect ? { explanation } : {}),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/query-quest/hint
 * Reveals the next progressive hint for a mission and stores hints_used.
 */
exports.requestHint = async (req, res, next) => {
    try {
        const challengeId = req.body?.challengeId;
        if (!isValidUuid(challengeId)) {
            return res.status(400).json({ error: 'Valid challengeId is required' });
        }

        const { data: challenge, error: chErr } = await supabase
            .from('query_quest_challenges')
            .select('id, expected_result')
            .eq('id', challengeId)
            .eq('is_active', true)
            .maybeSingle();

        if (chErr) throw chErr;
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        const { hints } = unpackChallengeMeta(challenge);
        if (hints.length === 0) {
            return res.json({ hint: null, hintsUsed: 0, totalHints: 0, revealedHints: [] });
        }

        const { data: attempt, error: attErr } = await supabase
            .from('query_quest_attempts')
            .select('*')
            .eq('usn', req.user.usn)
            .eq('challenge_id', challengeId)
            .maybeSingle();

        if (attErr) throw attErr;

        const currentUsed = attempt?.hints_used || 0;
        const nextUsed = Math.min(hints.length, currentUsed + 1);

        if (attempt) {
            if (nextUsed > currentUsed) {
                const { error: updErr } = await supabase
                    .from('query_quest_attempts')
                    .update({ hints_used: nextUsed })
                    .eq('id', attempt.id);
                if (updErr) throw updErr;
            }
        } else {
            const { error: insErr } = await supabase.from('query_quest_attempts').insert({
                usn: req.user.usn,
                challenge_id: challengeId,
                submitted_query: '',
                is_correct: false,
                execution_time: 0,
                attempts_count: 0,
                hints_used: nextUsed,
                points_awarded: 0,
            });
            if (insErr) throw insErr;
        }

        return res.json({
            hint: hints[nextUsed - 1],
            hintsUsed: nextUsed,
            totalHints: hints.length,
            revealedHints: hints.slice(0, nextUsed),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/query-quest/progress
 * Returns the authenticated student's Query Quest daily progress.
 */
exports.getProgress = async (req, res, next) => {
    try {
        const today = getISTDate();
        const challenges = await ensureTodayChallenges(today);
        const challengeIds = challenges.map((c) => c.id);

        let attempts = [];
        if (challengeIds.length > 0) {
            const { data, error } = await supabase
                .from('query_quest_attempts')
                .select('challenge_id, is_correct, points_awarded, attempts_count, hints_used, execution_time, completed_at')
                .eq('usn', req.user.usn)
                .in('challenge_id', challengeIds);

            if (error) throw error;
            attempts = (data || []).map((a) => ({
                ...a,
                is_optimal: (a.points_awarded || 0) >= 10,
            }));
        }

        const completedCount = attempts.filter((a) => a.is_correct).length;
        const todayPoints = Math.min(
            MAX_DAILY_POINTS,
            attempts.reduce((sum, a) => sum + (a.points_awarded || 0), 0)
        );

        return res.json({
            date: today,
            completedCount,
            totalMissions: challenges.length,
            todayPoints,
            maxPoints: MAX_DAILY_POINTS,
            attempts,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/query-quest/leaderboard
 * Returns Query Quest rankings and SQL performance stats from query_quest_attempts.
 */
exports.getLeaderboard = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

        const { data: attempts, error: attErr } = await supabase
            .from('query_quest_attempts')
            .select('usn, points_awarded, execution_time, is_correct, users(role, departments(department_name))')
            .eq('is_correct', true);

        if (attErr) throw attErr;

        const map = new Map();
        for (const row of attempts || []) {
            if (row.users?.role === 'admin') continue;
            const pts = row.points_awarded || 0;
            const cur = map.get(row.usn) || {
                usn: row.usn,
                department: row.users?.departments?.department_name || '',
                totalPoints: 0,
                missionsCompleted: 0,
                optimalSolves: 0,
                totalExecMs: 0,
            };
            cur.totalPoints += pts;
            cur.missionsCompleted += 1;
            if (pts >= 10) cur.optimalSolves += 1;
            cur.totalExecMs += row.execution_time || 0;
            map.set(row.usn, cur);
        }

        const sorted = Array.from(map.values())
            .sort((a, b) => b.totalPoints - a.totalPoints || b.optimalSolves - a.optimalSolves)
            .slice(0, limit)
            .map((entry, idx) => ({
                usn: entry.usn,
                department: entry.department,
                totalPoints: entry.totalPoints,
                missionsCompleted: entry.missionsCompleted,
                optimalSolves: entry.optimalSolves,
                avgExecutionMs: entry.missionsCompleted
                    ? Math.round(entry.totalExecMs / entry.missionsCompleted)
                    : 0,
                rank: idx + 1,
            }));

        return res.json(sorted);
    } catch (err) {
        next(err);
    }
};
