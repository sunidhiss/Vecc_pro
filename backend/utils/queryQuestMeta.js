const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UI_TO_DB_DIFFICULTY = {
    ROOKIE: 'easy',
    EASY: 'easy',
    EXPLORER: 'medium',
    MEDIUM: 'medium',
    MASTER: 'hard',
    HARD: 'hard',
};

const DB_TO_UI_DIFFICULTY = {
    easy: 'ROOKIE',
    medium: 'EXPLORER',
    hard: 'MASTER',
};

function isValidUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value.trim());
}

function getISTDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function toDbDifficulty(value) {
    const key = String(value || '').trim().toUpperCase();
    return UI_TO_DB_DIFFICULTY[key] || null;
}

function toUiDifficulty(value) {
    const raw = String(value || '').trim();
    const lower = raw.toLowerCase();
    return DB_TO_UI_DIFFICULTY[lower] || raw.toUpperCase() || 'ROOKIE';
}

/**
 * Extracts optional metadata (missionOrder, hints, explanation, starterQuery) stored
 * either on top-level fields or inside expected_result._meta.
 */
function unpackChallengeMeta(challenge) {
    const meta = challenge?.expected_result?._meta || {};
    return {
        missionOrder: Number(challenge?.mission_order ?? meta.missionOrder ?? 1),
        hints: Array.isArray(challenge?.hints)
            ? challenge.hints
            : (Array.isArray(meta.hints) ? meta.hints : []),
        explanation:
            challenge?.explanation && typeof challenge.explanation === 'object'
                ? challenge.explanation
                : (meta.explanation && typeof meta.explanation === 'object' ? meta.explanation : {}),
        starterQuery:
            challenge?.starter_query ||
            meta.starterQuery ||
            `SELECT *\nFROM ${challenge?.schema_definition?.tables?.[0]?.name || 'table_name'};`,
    };
}

/**
 * Packs missionOrder, hints, explanation, and starterQuery inside expected_result._meta
 * so they persist cleanly within the query_quest_challenges.expected_result jsonb column.
 */
function packExpectedResult({ expectedResult, missionOrder, hints, explanation, starterQuery }) {
    return {
        columns: expectedResult.columns,
        rows: expectedResult.rows,
        orderMatters: Boolean(expectedResult.orderMatters),
        optimalRules: expectedResult.optimalRules || {},
        _meta: {
            missionOrder: Number(missionOrder || 1),
            hints: Array.isArray(hints) ? hints : [],
            explanation: explanation && typeof explanation === 'object' ? explanation : {},
            starterQuery: String(starterQuery || 'SELECT *\nFROM table_name;'),
        },
    };
}

function formatAdminChallenge(row) {
    if (!row) return null;
    const { missionOrder, hints, explanation, starterQuery } = unpackChallengeMeta(row);
    return {
        ...row,
        difficulty: toUiDifficulty(row.difficulty),
        mission_order: missionOrder,
        hints,
        explanation,
        starter_query: starterQuery,
        expected_result: {
            columns: row.expected_result?.columns || [],
            rows: row.expected_result?.rows || [],
            orderMatters: Boolean(row.expected_result?.orderMatters),
            optimalRules: row.expected_result?.optimalRules || {},
        },
    };
}

module.exports = {
    isValidUuid,
    getISTDate,
    toDbDifficulty,
    toUiDifficulty,
    unpackChallengeMeta,
    packExpectedResult,
    formatAdminChallenge,
};
