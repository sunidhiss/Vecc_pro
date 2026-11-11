const { parse } = require('pgsql-ast-parser');

const MAX_QUERY_LENGTH = 10000;

const ALLOWED_STATEMENT_TYPES = new Set(['select', 'with', 'union']);

const FORBIDDEN_FUNCTIONS = new Set([
    'pg_sleep',
    'pg_read_file',
    'pg_read_binary_file',
    'pg_ls_dir',
    'pg_stat_file',
    'pg_stat_activity',
    'pg_terminate_backend',
    'pg_cancel_backend',
    'pg_reload_conf',
    'pg_rotate_logfile',
    'pg_export_snapshot',
    'pg_import_system_collations',
    'dblink',
    'dblink_exec',
    'dblink_connect',
    'dblink_open',
    'lo_import',
    'lo_export',
    'lo_get',
    'lo_put',
    'lo_create',
    'lo_unlink',
    'current_setting',
    'set_config',
    'inet_client_addr',
    'inet_client_port',
    'inet_server_addr',
    'inet_server_port',
    'txid_current',
    'pg_current_xact_id',
    'version',
    'current_database',
    'current_user',
    'session_user',
    'current_schema',
    'current_schemas',
    'has_table_privilege',
    'has_schema_privilege',
    'has_database_privilege',
    'has_function_privilege',
    'row_security_active',
    'query_to_xml',
    'query_to_xmlschema',
    'query_to_xml_and_xmlschema',
    'cursor_to_xml',
    'table_to_xml',
    'obj_description',
    'col_description',
]);

/**
 * Recursively inspects every AST node to ensure read-only, schema-isolated SQL
 * and collects structural features for query optimality analysis.
 */
function inspectAst(node, features, depth = 0) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
        for (const item of node) {
            inspectAst(item, features, depth);
        }
        return;
    }

    if (node.type) {
        if (['insert', 'update', 'delete', 'create', 'drop', 'alter', 'truncate', 'grant', 'revoke', 'copy', 'set', 'begin', 'commit', 'rollback', 'do', 'prepare', 'execute'].includes(node.type)) {
            throw new ValidationError(`Statement type '${node.type.toUpperCase()}' is not allowed. Only read-only SELECT queries are permitted.`, 'permission_error');
        }

        if (node.type === 'select') {
            if (node.into) {
                throw new ValidationError('SELECT INTO is not permitted.', 'permission_error');
            }
            if (node.for) {
                throw new ValidationError('Row locking clauses (FOR UPDATE / FOR SHARE) are not permitted.', 'permission_error');
            }
            if (depth > 0) {
                features.hasSubquery = true;
            }
            if (node.distinct) {
                features.hasDistinct = true;
            }
            if (node.limit) {
                features.hasLimit = true;
            }
            if (Array.isArray(node.from)) {
                for (const fromItem of node.from) {
                    if (fromItem?.join) {
                        features.hasJoin = true;
                    }
                }
            }
            if (Array.isArray(node.columns)) {
                for (const col of node.columns) {
                    if (col?.expr?.type === 'ref' && col.expr.name === '*') {
                        features.hasSelectStar = true;
                    }
                }
            }
        }

        if (node.type === 'with') {
            features.hasCte = true;
        }

        if (node.type === 'table' && node.name?.schema) {
            throw new ValidationError(
                `Cross-schema access ('${node.name.schema}.${node.name.name}') is forbidden. Query only the practice tables directly by name.`,
                'permission_error'
            );
        }

        if (node.type === 'ref' && node.table?.schema) {
            throw new ValidationError(
                `Cross-schema reference ('${node.table.schema}') is forbidden.`,
                'permission_error'
            );
        }

        if (node.type === 'call') {
            if (node.over) {
                features.hasWindow = true;
            }
            const fnSchema = node.function?.schema?.toLowerCase();
            const fnName = node.function?.name?.toLowerCase() || '';
            if (fnSchema) {
                throw new ValidationError(`Schema-qualified function '${fnSchema}.${fnName}' is not permitted.`, 'permission_error');
            }
            if (fnName.startsWith('pg_') || fnName.startsWith('dblink') || fnName.startsWith('lo_') || FORBIDDEN_FUNCTIONS.has(fnName)) {
                throw new ValidationError(`Function '${fnName}()' is restricted in the Query Quest sandbox.`, 'permission_error');
            }
        }

        if (node.type === 'binary' && (node.op === 'NOT IN' || node.op === 'not in')) {
            features.usesNotIn = true;
        }
    }

    for (const [key, val] of Object.entries(node)) {
        if (key === '_location') continue;
        if (val && typeof val === 'object') {
            const nextDepth = node.type === 'select' && (key === 'where' || key === 'from' || key === 'columns' || key === 'having')
                ? depth + 1
                : depth;
            inspectAst(val, features, nextDepth);
        }
    }
}

class ValidationError extends Error {
    constructor(message, category = 'validation_error') {
        super(message);
        this.name = 'ValidationError';
        this.category = category;
    }
}

/**
 * Strips trailing semicolons and validates that the SQL is a single,
 * safe, read-only PostgreSQL SELECT / WITH-SELECT query.
 */
function validateStudentQuery(rawSql) {
    if (typeof rawSql !== 'string' || !rawSql.trim()) {
        throw new ValidationError('SQL query cannot be empty.', 'validation_error');
    }

    if (rawSql.length > MAX_QUERY_LENGTH) {
        throw new ValidationError(`Query exceeds maximum allowed length of ${MAX_QUERY_LENGTH} characters.`, 'validation_error');
    }

    let ast;
    try {
        ast = parse(rawSql);
    } catch (err) {
        throw new ValidationError(err.message || 'SQL syntax error.', 'syntax_error');
    }

    if (!Array.isArray(ast) || ast.length === 0) {
        throw new ValidationError('No executable SQL statement found.', 'syntax_error');
    }

    if (ast.length > 1) {
        throw new ValidationError('Multiple SQL statements are not allowed. Submit a single SELECT query.', 'permission_error');
    }

    const rootStmt = ast[0];
    if (!ALLOWED_STATEMENT_TYPES.has(rootStmt.type)) {
        throw new ValidationError(
            `Statement type '${String(rootStmt.type || 'UNKNOWN').toUpperCase()}' is not allowed. Only SELECT queries are permitted.`,
            'permission_error'
        );
    }

    if (rootStmt.type === 'with' && rootStmt.in && !ALLOWED_STATEMENT_TYPES.has(rootStmt.in.type)) {
        throw new ValidationError(
            `CTE body '${String(rootStmt.in.type).toUpperCase()}' is not allowed. Only SELECT queries are permitted.`,
            'permission_error'
        );
    }

    const features = {
        hasSelectStar: false,
        hasJoin: false,
        hasLimit: false,
        hasSubquery: false,
        hasDistinct: false,
        hasCte: false,
        hasWindow: false,
        usesNotIn: false,
    };

    inspectAst(rootStmt, features, 0);

    // Strip trailing semicolon(s) safely after AST validation confirmed single statement
    const cleanSql = rawSql.trim().replace(/;+\s*$/, '');

    return { cleanSql, features };
}

module.exports = {
    validateStudentQuery,
    ValidationError,
    MAX_QUERY_LENGTH,
};
