const { Pool } = require('pg');
const { performance } = require('perf_hooks');

const MAX_EXECUTION_MS = 3000;
const MAX_RETURNED_ROWS = 100;
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

let qqPool = null;
let pgliteModulePromise = null;

function getExecutionPool() {
    if (qqPool) return qqPool;

    const connString = process.env.QUERY_QUEST_DATABASE_URL;
    if (!connString) {
        return null;
    }

    const useSsl = !connString.includes('localhost') && !connString.includes('127.0.0.1');

    qqPool = new Pool({
        connectionString: connString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    return qqPool;
}

async function getPGliteClass() {
    if (!pgliteModulePromise) {
        pgliteModulePromise = import('@electric-sql/pglite');
    }
    const mod = await pgliteModulePromise;
    return mod.PGlite;
}

function assertIdentifier(name, label = 'identifier') {
    if (!IDENTIFIER_RE.test(String(name || ''))) {
        const err = new Error(`Invalid SQL ${label}: '${name}'.`);
        err.status = 400;
        err.category = 'validation_error';
        throw err;
    }
    return `"${name}"`;
}

function normalizeColType(typeStr) {
    const cleaned = String(typeStr || '').trim().toUpperCase();
    if (
        ALLOWED_TYPES.has(cleaned) ||
        /^(VARCHAR|CHAR)\(\d{1,4}\)$/.test(cleaned) ||
        /^NUMERIC\(\d{1,2},\d{1,2}\)$/.test(cleaned)
    ) {
        return cleaned;
    }
    return 'TEXT';
}

function classifyPgError(err) {
    const code = err?.code || '';
    if (code === '57014' || err?.category === 'timeout_error') {
        return {
            category: 'timeout_error',
            message: `Query exceeded the ${MAX_EXECUTION_MS / 1000}-second execution time limit.`,
        };
    }
    if (code === '42501' || code === '25006') {
        return {
            category: 'permission_error',
            message: 'Permission denied: query attempted a restricted or non-read-only operation.',
        };
    }
    if (code.startsWith('42') || code.startsWith('22')) {
        return {
            category: 'syntax_error',
            message: err.message || 'SQL error in query.',
        };
    }
    return {
        category: 'runtime_error',
        message: err.message || 'Failed to execute SQL query.',
    };
}

/**
 * Seeds an isolated ephemeral PGlite (PostgreSQL WASM) database strictly
 * from the challenge's schema_definition and seed_data, then runs the query in READ ONLY mode.
 */
async function executeWithPGlite(cleanSql, challengeRecord) {
    const schemaDef = challengeRecord?.schema_definition;
    const seedTables = challengeRecord?.seed_data?.tables || {};

    if (!schemaDef || !Array.isArray(schemaDef.tables) || schemaDef.tables.length === 0) {
        const err = new Error('Challenge schema_definition is missing.');
        err.status = 500;
        err.category = 'configuration_error';
        throw err;
    }

    const PGlite = await getPGliteClass();
    const db = new PGlite();
    let timeoutHandle = null;

    try {
        // 1. Create practice tables strictly scoped to this challenge
        const fkStatements = [];
        for (const table of schemaDef.tables) {
            const tblIdent = assertIdentifier(table.name, 'table');
            const colDefs = (table.columns || []).map((col) => {
                const colIdent = assertIdentifier(col.name, 'column');
                const colType = normalizeColType(col.type);
                if (col.foreignKey?.table && col.foreignKey?.column) {
                    const fkTbl = assertIdentifier(col.foreignKey.table, 'table');
                    const fkCol = assertIdentifier(col.foreignKey.column, 'column');
                    fkStatements.push(
                        `ALTER TABLE ${tblIdent} ADD FOREIGN KEY (${colIdent}) REFERENCES ${fkTbl}(${fkCol});`
                    );
                }
                return `${colIdent} ${colType}${col.primaryKey ? ' PRIMARY KEY' : ''}`;
            });
            await db.exec(`CREATE TABLE ${tblIdent} (${colDefs.join(', ')});`);
        }

        // 2. Seed rows via parameterized inserts
        for (const table of schemaDef.tables) {
            const rows = Array.isArray(seedTables[table.name]) ? seedTables[table.name] : [];
            if (rows.length === 0) continue;

            const tblIdent = assertIdentifier(table.name, 'table');
            const colNames = (table.columns || []).map((c) => c.name);
            const colIdents = colNames.map((n) => assertIdentifier(n, 'column'));
            const placeholders = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
            const insertSql = `INSERT INTO ${tblIdent} (${colIdents.join(', ')}) VALUES (${placeholders})`;

            for (const row of rows) {
                const values = colNames.map((colName) => (row?.[colName] === undefined ? null : row[colName]));
                await db.query(insertSql, values);
            }
        }

        // Apply foreign key constraints after all seed data is inserted
        for (const fkSql of fkStatements) {
            await db.exec(fkSql);
        }

        // 3. Execute student query inside a strict READ ONLY PostgreSQL transaction
        const startTime = performance.now();
        await db.query('BEGIN READ ONLY');
        await db.query(`SET LOCAL statement_timeout = ${MAX_EXECUTION_MS}`);

        const wrappedSql = `SELECT * FROM (${cleanSql}) AS _qq_result LIMIT ${MAX_RETURNED_ROWS + 1}`;
        const queryPromise = db.query(wrappedSql);
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                const timeoutErr = new Error(`Query exceeded ${MAX_EXECUTION_MS / 1000}s timeout.`);
                timeoutErr.code = '57014';
                timeoutErr.category = 'timeout_error';
                reject(timeoutErr);
            }, MAX_EXECUTION_MS + 100);
        });

        const result = await Promise.race([queryPromise, timeoutPromise]);
        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        const truncated = (result.rows || []).length > MAX_RETURNED_ROWS;
        const rows = truncated ? result.rows.slice(0, MAX_RETURNED_ROWS) : (result.rows || []);
        const columns = (result.fields || []).map((f) => f.name);

        return {
            success: true,
            columns,
            rows,
            rowCount: rows.length,
            truncated,
            durationMs,
        };
    } catch (err) {
        const classified = classifyPgError(err);
        return {
            success: false,
            columns: [],
            rows: [],
            rowCount: 0,
            truncated: false,
            durationMs: 0,
            error: classified.message,
            errorCategory: classified.category,
        };
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        try {
            await db.query('ROLLBACK');
        } catch {
            // Ignore rollback errors
        }
        try {
            await db.close();
        } catch {
            // Ignore close errors
        }
    }
}

/**
 * Executes a validated single-SELECT query inside a READ ONLY PostgreSQL transaction
 * using an isolated challenge schema (external pool when configured, or embedded PGlite PostgreSQL sandbox).
 */
async function executeSandboxedQuery(cleanSql, challengeId, challengeRecord = null) {
    const pool = getExecutionPool();
    if (!pool) {
        if (!challengeRecord) {
            const err = new Error(
                'Query Quest SQL execution engine requires challenge schema data when QUERY_QUEST_DATABASE_URL is not configured.'
            );
            err.status = 500;
            err.category = 'configuration_error';
            throw err;
        }
        return executeWithPGlite(cleanSql, challengeRecord);
    }

    const safeSchemaSuffix = String(challengeId || '').replace(/[^a-zA-Z0-9_]/g, '_');
    if (!safeSchemaSuffix) {
        const err = new Error('Invalid challenge identifier.');
        err.status = 400;
        err.category = 'validation_error';
        throw err;
    }
    const schemaName = `qq_c_${safeSchemaSuffix}`;

    const client = await pool.connect();
    const startTime = performance.now();

    try {
        await client.query('BEGIN READ ONLY');
        await client.query(`SET LOCAL statement_timeout = ${MAX_EXECUTION_MS}`);
        await client.query('SET LOCAL lock_timeout = 1000');
        await client.query(`SET LOCAL search_path = "${schemaName}"`);

        const wrappedSql = `SELECT * FROM (${cleanSql}) AS _qq_result LIMIT ${MAX_RETURNED_ROWS + 1}`;
        const result = await client.query(wrappedSql);

        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        const truncated = result.rows.length > MAX_RETURNED_ROWS;
        const rows = truncated ? result.rows.slice(0, MAX_RETURNED_ROWS) : result.rows;
        const columns = (result.fields || []).map((f) => f.name);

        return {
            success: true,
            columns,
            rows,
            rowCount: rows.length,
            truncated,
            durationMs,
        };
    } catch (err) {
        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        const classified = classifyPgError(err);
        return {
            success: false,
            columns: [],
            rows: [],
            rowCount: 0,
            truncated: false,
            durationMs,
            error: classified.message,
            errorCategory: classified.category,
        };
    } finally {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback errors on closed/aborted connections
        }
        client.release();
    }
}

module.exports = {
    executeSandboxedQuery,
    MAX_EXECUTION_MS,
    MAX_RETURNED_ROWS,
};
