/**
 * Evaluates whether a correct SQL solution is optimal based on AST efficiency criteria.
 * Scoring model (max 10 points per mission, 6 missions = 60 points daily):
 * - Incorrect query: 0 points
 * - Standard correct query: 5 points
 * - Optimal correct query: 10 points
 */
function scoreQuerySolution(isCorrect, features, expectedResult) {
    if (!isCorrect) {
        return {
            isOptimal: false,
            points: 0,
            optimalityNotes: [],
        };
    }

    const rules = expectedResult?.optimalRules || {};
    const notes = [];

    if (rules.disallowSelectStar && features?.hasSelectStar) {
        notes.push('Avoid SELECT *; project only the specific columns needed.');
    }
    if (rules.requireLimit && !features?.hasLimit) {
        notes.push('Use LIMIT to restrict top-N rows instead of scanning/sorting without a bound.');
    }
    if (rules.requireJoin && !features?.hasJoin) {
        notes.push('Prefer explicit JOIN syntax over cross-joins or correlated filters.');
    }
    if (rules.disallowSubquery && features?.hasSubquery) {
        notes.push('This mission can be solved directly without an extra nested subquery.');
    }
    if (rules.disallowDistinct && features?.hasDistinct) {
        notes.push('Unnecessary DISTINCT adds extra sorting/hashing overhead.');
    }
    if (rules.disallowNotIn && features?.usesNotIn) {
        notes.push('Prefer LEFT JOIN ... IS NULL or NOT EXISTS over NOT IN, which can behave unexpectedly with NULLs.');
    }

    const isOptimal = notes.length === 0;
    return {
        isOptimal,
        points: isOptimal ? 10 : 5,
        optimalityNotes: notes,
    };
}

module.exports = {
    scoreQuerySolution,
};
