const supabase = require('../config/supabase');
const DEFAULT_MISSIONS = require('../utils/queryQuestDefaults');
const { validateStudentQuery, ValidationError } = require('../services/sqlValidationService');
const { executeSandboxedQuery } = require('../services/sqlExecutionService');
const { evaluateQueryResult } = require('../services/queryEvaluationService');
const { scoreQuerySolution } = require('../services/queryScoringService');
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

function sortChallengesByOrder(list) {
    return [...(list || [])].sort(
        (a, b) => unpackChallengeMeta(a).missionOrder - unpackChallengeMeta(b).missionOrder
    );
}

/**
 * Ensures today's IST challenges exist in query_quest_challenges.
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

    // Insert default daily challenges if not yet created
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

    await supabase.from('query_quest_challenges').insert(rowsToInsert);

    const { data: seeded } = await supabase
        .from('query_quest_challenges')
        .select('*')
        .eq('challenge_date', today)
        .eq('is_active', true);

    return sortChallengesByOrder(seeded || []).slice(0, MAX_DAILY_MISSIONS);
}

function buildSampleData(seedData) {
    const tables = seedData?.tables || {};
    const samples = {};
    for (const [tableName, rows] of Object.entries(tables)) {
        samples[tableName] = Array.isArray(rows) ? rows.slice(0, 6) : [];
    }
    return samples;
}

function sanitizeChallengeForStudent(challenge, missionProgress) {
    const { missionOrder, hints, explanation, starterQuery } = unpackChallengeMeta(challenge);
    const hintsUsed = missionProgress?.hints_used || 0;
    const isCompleted = Boolean(missionProgress?.is_correct);
    const pointsAwarded = missionProgress?.points_awarded || 0;

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
        starterQuery: missionProgress?.submitted_query || starterQuery,
        challengeDate: challenge.challenge_date,
        maxPoints: challenge.points || 10,
        totalHints: hints.length,
        hintsUsed,
        revealedHints: hints.slice(0, hintsUsed),
        completed: isCompleted,
        isOptimal: isCompleted && pointsAwarded >= 10,
        pointsAwarded,
        attemptsCount: missionProgress?.attempts_count || 0,
        ...(isCompleted ? { explanation } : {}),
    };
}

/**
 * Atomically updates a student's mission progress and daily score in game_scores.
 */
async function recordMissionAttempt({ usn, challenge, submittedQuery, isCorrect, executionTime, points }) {
    const today = challenge.challenge_date || getISTDate();

    // 1. Fetch current game_score record for query_quest today
    const { data: existing, error: fetchErr } = await supabase
        .from('game_scores')
        .select('*')
        .eq('usn', usn)
        .eq('game_name', 'query_quest')
        .eq('game_date', today)
        .maybeSingle();

    if (fetchErr) throw fetchErr;

    const details = existing?.details || {};
    const missions = details.missions || {};
    const chId = String(challenge.id);
    const currentMission = missions[chId] || { attempts_count: 0, hints_used: 0 };

    const attemptsCount = (currentMission.attempts_count || 0) + 1;
    const alreadyCompleted = Boolean(currentMission.is_correct);
    let awardedNow = 0;

    if (!alreadyCompleted && isCorrect) {
        awardedNow = points;
    }

    const updatedMission = {
        is_correct: alreadyCompleted || isCorrect,
        is_optimal: alreadyCompleted ? currentMission.is_optimal : (isCorrect && points >= 10),
        submitted_query: submittedQuery,
        execution_time: executionTime,
        attempts_count: attemptsCount,
        hints_used: currentMission.hints_used || 0,
        points_awarded: alreadyCompleted ? currentMission.points_awarded : awardedNow,
        completed_at: isCorrect ? (currentMission.completed_at || new Date().toISOString()) : null,
    };

    missions[chId] = updatedMission;

    // Sum daily points from all missions completed today
    let totalScore = 0;
    let completedCount = 0;
    for (const m of Object.values(missions)) {
        if (m.is_correct) {
            completedCount += 1;
            totalScore += Number(m.points_awarded) || 0;
        }
    }
    totalScore = Math.min(MAX_DAILY_POINTS, totalScore);

    const updatedDetails = {
        completed: completedCount > 0,
        missions,
    };

    if (existing) {
        await supabase
            .from('game_scores')
            .update({
                score: totalScore,
                completed_at: new Date().toISOString(),
                details: updatedDetails,
            })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('game_scores')
            .insert({
                usn,
                game_name: 'query_quest',
                game_date: today,
                score: totalScore,
                completed_at: new Date().toISOString(),
                details: updatedDetails,
            });
    }

    return {
        awardedNow,
        alreadyCompleted,
        totalQqToday: totalScore,
        attemptsCount,
    };
}

/**
 * GET /api/query-quest/today
 */
exports.getTodayChallenges = async (req, res, next) => {
    try {
        const today = getISTDate();
        const challenges = await ensureTodayChallenges(today);

        const { data: scoreRow } = await supabase
            .from('game_scores')
            .select('details, score')
            .eq('usn', req.user.usn)
            .eq('game_name', 'query_quest')
            .eq('game_date', today)
            .maybeSingle();

        const missionsMap = scoreRow?.details?.missions || {};
        const safeChallenges = challenges.map((ch) => sanitizeChallengeForStudent(ch, missionsMap[String(ch.id)]));
        const completedCount = safeChallenges.filter((c) => c.completed).length;

        return res.json({
            date: today,
            challenges: safeChallenges,
            progress: {
                completedCount,
                totalMissions: safeChallenges.length,
                todayPoints: scoreRow?.score || 0,
                maxPoints: MAX_DAILY_POINTS,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/query-quest/challenges/:id
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

        const { data: scoreRow } = await supabase
            .from('game_scores')
            .select('details')
            .eq('usn', req.user.usn)
            .eq('game_name', 'query_quest')
            .eq('game_date', challenge.challenge_date)
            .maybeSingle();

        const missionProgress = scoreRow?.details?.missions?.[String(challengeId)];

        return res.json({
            challenge: sanitizeChallengeForStudent(challenge, missionProgress),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/query-quest/execute
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

        let validated;
        try {
            validated = validateStudentQuery(rawSql);
        } catch (valErr) {
            if (valErr instanceof ValidationError) {
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

        const execResult = await executeSandboxedQuery(validated.cleanSql, challengeId, challenge);

        if (!execResult.success) {
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

        const evaluation = evaluateQueryResult(execResult, challenge.expected_result);
        const scoring = scoreQuerySolution(evaluation.isCorrect, validated.features, challenge.expected_result);

        const syncResult = await recordMissionAttempt({
            usn: req.user.usn,
            challenge,
            submittedQuery: validated.cleanSql,
            isCorrect: evaluation.isCorrect,
            executionTime: execResult.durationMs,
            points: scoring.points,
        });

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
            pointsAwarded: syncResult.awardedNow,
            alreadyCompleted: syncResult.alreadyCompleted,
            totalQqToday: syncResult.totalQqToday,
            attemptsCount: syncResult.attemptsCount,
            ...(evaluation.isCorrect ? { explanation } : {}),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/query-quest/hint
 */
exports.requestHint = async (req, res, next) => {
    try {
        const challengeId = req.body?.challengeId;
        if (!isValidUuid(challengeId)) {
            return res.status(400).json({ error: 'Valid challengeId is required' });
        }

        const { data: challenge } = await supabase
            .from('query_quest_challenges')
            .select('id, expected_result, challenge_date')
            .eq('id', challengeId)
            .maybeSingle();

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        const { hints } = unpackChallengeMeta(challenge);
        const today = challenge.challenge_date || getISTDate();

        const { data: scoreRow } = await supabase
            .from('game_scores')
            .select('*')
            .eq('usn', req.user.usn)
            .eq('game_name', 'query_quest')
            .eq('game_date', today)
            .maybeSingle();

        const details = scoreRow?.details || {};
        const missions = details.missions || {};
        const chId = String(challengeId);
        const currentMission = missions[chId] || { attempts_count: 0, hints_used: 0 };

        const currentUsed = currentMission.hints_used || 0;
        const nextUsed = Math.min(hints.length, currentUsed + 1);

        currentMission.hints_used = nextUsed;
        missions[chId] = currentMission;
        details.missions = missions;

        if (scoreRow) {
            await supabase.from('game_scores').update({ details }).eq('id', scoreRow.id);
        } else {
            await supabase.from('game_scores').insert({
                usn: req.user.usn,
                game_name: 'query_quest',
                game_date: today,
                score: 0,
                details,
            });
        }

        return res.json({
            hint: hints[nextUsed - 1] || null,
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
 */
exports.getProgress = async (req, res, next) => {
    try {
        const today = getISTDate();
        const challenges = await ensureTodayChallenges(today);

        const { data: scoreRow } = await supabase
            .from('game_scores')
            .select('*')
            .eq('usn', req.user.usn)
            .eq('game_name', 'query_quest')
            .eq('game_date', today)
            .maybeSingle();

        const missions = scoreRow?.details?.missions || {};
        const attemptsList = Object.entries(missions).map(([cId, m]) => ({
            challenge_id: cId,
            is_correct: m.is_correct,
            points_awarded: m.points_awarded,
            attempts_count: m.attempts_count,
            hints_used: m.hints_used,
            execution_time: m.execution_time,
            is_optimal: m.is_optimal,
        }));

        const completedCount = attemptsList.filter((a) => a.is_correct).length;

        return res.json({
            date: today,
            completedCount,
            totalMissions: challenges.length,
            todayPoints: scoreRow?.score || 0,
            maxPoints: MAX_DAILY_POINTS,
            attempts: attemptsList,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/query-quest/leaderboard
 */
exports.getLeaderboard = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

        const { data: scores, error } = await supabase
            .from('game_scores')
            .select('usn, score, details, users(department, role)')
            .eq('game_name', 'query_quest');

        if (error) throw error;

        const map = new Map();
        for (const row of scores || []) {
            if (row.users?.role === 'admin') continue;
            const missions = row.details?.missions || {};

            let optimalSolves = 0;
            let missionsCompleted = 0;
            let totalExecMs = 0;

            for (const m of Object.values(missions)) {
                if (m.is_correct) {
                    missionsCompleted += 1;
                    if (m.is_optimal) optimalSolves += 1;
                    totalExecMs += Number(m.execution_time) || 0;
                }
            }

            const cur = map.get(row.usn) || {
                usn: row.usn,
                department: row.users?.department || '',
                totalPoints: 0,
                missionsCompleted: 0,
                optimalSolves: 0,
                totalExecMs: 0,
            };

            cur.totalPoints += Number(row.score) || 0;
            cur.missionsCompleted += missionsCompleted;
            cur.optimalSolves += optimalSolves;
            cur.totalExecMs += totalExecMs;

            map.set(row.usn, cur);
        }

        const sorted = Array.from(map.values())
            .filter((entry) => entry.totalPoints > 0)
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
