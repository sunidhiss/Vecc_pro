const supabase = require('../config/supabase');
const {
    isValidUuid,
    getISTDate,
    toDbDifficulty,
    unpackChallengeMeta,
    packExpectedResult,
    formatAdminChallenge,
} = require('../utils/queryQuestMeta');

const VALID_DIFFICULTIES = ['ROOKIE', 'EXPLORER', 'MASTER', 'EASY', 'MEDIUM', 'HARD'];
const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
const ALLOWED_TYPES = new Set([
    'INT',
    'INTEGER',
    'BIGINT',
    'SMALLINT',
    'NUMERIC',
    'DECIMAL',
    'REAL',
    'DOUBLE PRECISION',
    'TEXT',
    'BOOLEAN',
    'BOOL',
    'DATE',
    'TIMESTAMP',
    'TIMESTAMPTZ',
]);

function isValidColumnType(typeStr) {
    const cleaned = String(typeStr || '').trim().toUpperCase();
    if (ALLOWED_TYPES.has(cleaned)) return true;
    return /^(VARCHAR|CHAR)\(\d{1,4}\)$/.test(cleaned) || /^NUMERIC\(\d{1,2},\d{1,2}\)$/.test(cleaned);
}

function validateChallengePayload(body) {
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const difficultyRaw = String(body.difficulty || '').trim().toUpperCase();
    const difficulty = toDbDifficulty(difficultyRaw);
    const topic = String(body.topic || '').trim();
    const scenario = String(body.scenario || '').trim();
    const challengeDate = body.challengeDate || body.challenge_date || getISTDate();
    const missionOrder = Number(body.missionOrder ?? body.mission_order ?? 1);
    const isActive =
        body.isActive !== undefined
            ? Boolean(body.isActive)
            : (body.is_active !== undefined ? Boolean(body.is_active) : true);
    const starterQuery = String(body.starterQuery || body.starter_query || 'SELECT *\nFROM table_name;');

    const schemaDefinition = body.schemaDefinition || body.schema_definition;
    const seedData = body.seedData || body.seed_data;
    const expectedResult = body.expectedResult || body.expected_result;
    const hints = Array.isArray(body.hints) ? body.hints.map((h) => String(h || '').trim()).filter(Boolean) : [];
    const explanation = body.explanation && typeof body.explanation === 'object' ? body.explanation : {};

    if (!title || !description || !scenario || !topic) {
        return { error: 'Title, topic, scenario, and mission description are required.' };
    }
    if (!difficulty) {
        return { error: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(challengeDate)) {
        return { error: 'challengeDate must be YYYY-MM-DD.' };
    }
    if (!Number.isInteger(missionOrder) || missionOrder < 1 || missionOrder > 20) {
        return { error: 'missionOrder must be an integer between 1 and 20.' };
    }
    if (!schemaDefinition || !Array.isArray(schemaDefinition.tables) || schemaDefinition.tables.length === 0) {
        return { error: 'schemaDefinition.tables must contain at least one practice table.' };
    }

    const tableNames = new Set();
    for (const tbl of schemaDefinition.tables) {
        if (!IDENTIFIER_RE.test(tbl?.name || '')) {
            return { error: `Invalid table identifier: '${tbl?.name}'. Use letters, digits, and underscores only.` };
        }
        tableNames.add(tbl.name);
        if (!Array.isArray(tbl.columns) || tbl.columns.length === 0) {
            return { error: `Table '${tbl.name}' must define at least one column.` };
        }
        for (const col of tbl.columns) {
            if (!IDENTIFIER_RE.test(col?.name || '')) {
                return { error: `Invalid column name '${col?.name}' on table '${tbl.name}'.` };
            }
            if (!isValidColumnType(col?.type)) {
                return { error: `Unsupported column type '${col?.type}' on '${tbl.name}.${col.name}'.` };
            }
            if (col.foreignKey) {
                if (!IDENTIFIER_RE.test(col.foreignKey.table || '') || !IDENTIFIER_RE.test(col.foreignKey.column || '')) {
                    return { error: `Invalid foreign key on '${tbl.name}.${col.name}'.` };
                }
            }
        }
    }

    if (!seedData || typeof seedData !== 'object' || typeof seedData.tables !== 'object') {
        return { error: 'seedData.tables object is required.' };
    }
    for (const tName of Object.keys(seedData.tables)) {
        if (!tableNames.has(tName) || !Array.isArray(seedData.tables[tName])) {
            return { error: `seedData.tables['${tName}'] must match a defined table and be an array of rows.` };
        }
    }

    if (
        !expectedResult ||
        !Array.isArray(expectedResult.columns) ||
        expectedResult.columns.length === 0 ||
        !Array.isArray(expectedResult.rows)
    ) {
        return { error: 'expectedResult must define non-empty columns array and rows array.' };
    }

    return {
        record: {
            title,
            description,
            difficulty,
            topic,
            scenario,
            schema_definition: schemaDefinition,
            seed_data: seedData,
            expected_result: packExpectedResult({
                expectedResult,
                missionOrder,
                hints,
                explanation,
                starterQuery,
            }),
            challenge_date: challengeDate,
            points: 10,
            is_active: isActive,
        },
    };
}

/**
 * GET /api/admin/query-quest/challenges
 * Lists all Query Quest challenges (optionally filtered by ?date=YYYY-MM-DD).
 */
exports.listChallenges = async (req, res, next) => {
    try {
        let query = supabase
            .from('query_quest_challenges')
            .select('*')
            .order('challenge_date', { ascending: false });

        if (req.query.date) {
            query = query.eq('challenge_date', req.query.date);
        }

        const { data, error } = await query;
        if (error) throw error;

        const formatted = (data || [])
            .map(formatAdminChallenge)
            .sort((a, b) => {
                if (a.challenge_date !== b.challenge_date) {
                    return a.challenge_date < b.challenge_date ? 1 : -1;
                }
                return (a.mission_order || 1) - (b.mission_order || 1);
            });

        return res.json({ challenges: formatted });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/query-quest/challenges
 * Creates a new Query Quest challenge in query_quest_challenges.
 */
exports.createChallenge = async (req, res, next) => {
    try {
        const { error: valErr, record } = validateChallengePayload(req.body);
        if (valErr) {
            return res.status(400).json({ error: valErr });
        }

        const { data: created, error: insertErr } = await supabase
            .from('query_quest_challenges')
            .insert(record)
            .select('*')
            .single();

        if (insertErr) throw insertErr;

        return res.status(201).json({ challenge: formatAdminChallenge(created) });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/admin/query-quest/challenges/:id
 * Updates a Query Quest challenge.
 */
exports.updateChallenge = async (req, res, next) => {
    try {
        const challengeId = req.params.id;
        if (!isValidUuid(challengeId)) {
            return res.status(400).json({ error: 'Invalid challenge ID' });
        }

        const { data: existing, error: fetchErr } = await supabase
            .from('query_quest_challenges')
            .select('*')
            .eq('id', challengeId)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        if (Object.keys(req.body).length === 1 && req.body.isActive !== undefined) {
            const { data: toggled, error: toggleErr } = await supabase
                .from('query_quest_challenges')
                .update({ is_active: Boolean(req.body.isActive) })
                .eq('id', challengeId)
                .select('*')
                .single();

            if (toggleErr) throw toggleErr;
            return res.json({ challenge: formatAdminChallenge(toggled) });
        }

        const meta = unpackChallengeMeta(existing);
        const mergedInput = {
            ...existing,
            mission_order: meta.missionOrder,
            hints: meta.hints,
            explanation: meta.explanation,
            starter_query: meta.starterQuery,
            ...req.body,
        };

        const { error: valErr, record } = validateChallengePayload(mergedInput);
        if (valErr) {
            return res.status(400).json({ error: valErr });
        }

        const { data: updated, error: updErr } = await supabase
            .from('query_quest_challenges')
            .update(record)
            .eq('id', challengeId)
            .select('*')
            .single();

        if (updErr) throw updErr;

        return res.json({ challenge: formatAdminChallenge(updated) });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/admin/query-quest/challenges/:id
 * Deactivates (?mode=deactivate) or deletes a challenge.
 */
exports.deleteChallenge = async (req, res, next) => {
    try {
        const challengeId = req.params.id;
        if (!isValidUuid(challengeId)) {
            return res.status(400).json({ error: 'Invalid challenge ID' });
        }

        if (req.query.mode === 'deactivate') {
            const { data, error } = await supabase
                .from('query_quest_challenges')
                .update({ is_active: false })
                .eq('id', challengeId)
                .select('*')
                .maybeSingle();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Challenge not found' });
            return res.json({ success: true, deactivated: true, challenge: formatAdminChallenge(data) });
        }

        const { error: delErr } = await supabase
            .from('query_quest_challenges')
            .delete()
            .eq('id', challengeId);

        if (delErr) throw delErr;

        return res.json({ success: true, deleted: true });
    } catch (err) {
        next(err);
    }
};
