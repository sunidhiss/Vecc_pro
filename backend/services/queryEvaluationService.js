/**
 * Normalizes a cell value for fair SQL result comparison across PostgreSQL types.
 */
function normalizeValue(val) {
    if (val === null || val === undefined) {
        return { kind: 'null', value: null };
    }
    if (val instanceof Date) {
        return { kind: 'date', value: val.toISOString() };
    }
    if (typeof val === 'boolean') {
        return { kind: 'boolean', value: val };
    }
    if (typeof val === 'number') {
        return Number.isFinite(val)
            ? { kind: 'number', value: val }
            : { kind: 'string', value: String(val) };
    }
    if (typeof val === 'bigint') {
        return { kind: 'number', value: Number(val) };
    }

    const str = String(val);
    if (str.trim() !== '' && !Number.isNaN(Number(str))) {
        return { kind: 'number', value: Number(str) };
    }
    return { kind: 'string', value: str };
}

function valuesEqual(a, b) {
    const na = normalizeValue(a);
    const nb = normalizeValue(b);

    if (na.kind === 'null' || nb.kind === 'null') {
        return na.kind === nb.kind;
    }
    if (na.kind === 'number' && nb.kind === 'number') {
        return Math.abs(na.value - nb.value) < 1e-6;
    }
    if (na.kind !== nb.kind) {
        return String(na.value) === String(nb.value);
    }
    return na.value === nb.value;
}

function canonicalCellKey(val) {
    const n = normalizeValue(val);
    if (n.kind === 'null') return 'NULL';
    if (n.kind === 'number') return `N:${Number(n.value.toFixed(6))}`;
    return `${n.kind}:${String(n.value)}`;
}

/**
 * Builds an actual column mapping from expected columns to returned columns,
 * normalizing column-name casing.
 */
function resolveColumns(expectedCols, actualCols) {
    const actualLowerMap = new Map();
    for (const col of actualCols) {
        actualLowerMap.set(col.toLowerCase(), col);
    }

    const mapped = [];
    const missing = [];
    for (const expCol of expectedCols) {
        const match = actualLowerMap.get(expCol.toLowerCase());
        if (match !== undefined) {
            mapped.push(match);
        } else {
            missing.push(expCol);
        }
    }
    return { mapped, missing };
}

/**
 * Evaluates returned SQL columns and rows against the hidden expected_result.
 */
function evaluateQueryResult(executionResult, expectedResult) {
    const expectedCols = expectedResult?.columns || [];
    const expectedRows = expectedResult?.rows || [];
    const orderMatters = Boolean(expectedResult?.orderMatters);

    const actualCols = executionResult.columns || [];
    const actualRows = executionResult.rows || [];

    if (actualCols.length !== expectedCols.length) {
        return {
            isCorrect: false,
            feedback: `Expected ${expectedCols.length} column(s) [${expectedCols.join(', ')}], but your query returned ${actualCols.length} column(s) [${actualCols.join(', ')}].`,
        };
    }

    const { mapped, missing } = resolveColumns(expectedCols, actualCols);
    if (missing.length > 0) {
        return {
            isCorrect: false,
            feedback: `Column mismatch. Missing expected column(s): ${missing.join(', ')}. Returned columns: ${actualCols.join(', ')}.`,
        };
    }

    if (executionResult.truncated && expectedRows.length <= 100) {
        return {
            isCorrect: false,
            feedback: `Your query returned more than 100 rows, but expected ${expectedRows.length} row(s). Check your filtering or LIMIT clause.`,
        };
    }

    if (actualRows.length !== expectedRows.length) {
        return {
            isCorrect: false,
            feedback: `Row count mismatch: expected ${expectedRows.length} row(s), got ${actualRows.length} row(s).`,
        };
    }

    // Extract normalized row tuples in expected column order
    const extractTuple = (row, colNames) => colNames.map((c) => row[c]);
    const actualTuples = actualRows.map((r) => extractTuple(r, mapped));
    const expectedTuples = expectedRows.map((r) => extractTuple(r, expectedCols));

    if (orderMatters) {
        for (let i = 0; i < expectedTuples.length; i++) {
            for (let j = 0; j < expectedCols.length; j++) {
                if (!valuesEqual(actualTuples[i][j], expectedTuples[i][j])) {
                    return {
                        isCorrect: false,
                        feedback: `Row ${i + 1} does not match expected output (check your filtering, calculations, or ORDER BY sequence).`,
                    };
                }
            }
        }
        return { isCorrect: true, feedback: 'Exact match! All rows, columns, and ordering verified.' };
    }

    // Unordered comparison while strictly preserving duplicate row counts
    const rowSignature = (tuple) => tuple.map(canonicalCellKey).join('|');
    const actualSorted = actualTuples.map(rowSignature).sort();
    const expectedSorted = expectedTuples.map(rowSignature).sort();

    for (let i = 0; i < expectedSorted.length; i++) {
        if (actualSorted[i] !== expectedSorted[i]) {
            return {
                isCorrect: false,
                feedback: 'Returned rows do not match the expected dataset. Check your filters, joins, or groupings.',
            };
        }
    }

    return { isCorrect: true, feedback: 'Correct! All expected records returned.' };
}

module.exports = {
    evaluateQueryResult,
    normalizeValue,
    valuesEqual,
};
