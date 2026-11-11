const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { validateStudentQuery, ValidationError, MAX_QUERY_LENGTH } = require('../services/sqlValidationService');
const { evaluateQueryResult } = require('../services/queryEvaluationService');
const { scoreQuerySolution } = require('../services/queryScoringService');
const DEFAULT_MISSIONS = require('../utils/queryQuestDefaults');

test('SQL Validation: allows valid single SELECT, JOIN, CTE, and Window queries', () => {
    const validQueries = [
        "SELECT name, usn, marks FROM students WHERE department = 'Computer Science' ORDER BY marks DESC LIMIT 5;",
        'SELECT DISTINCT category FROM products WHERE price BETWEEN 500 AND 2500 AND stock > 0 ORDER BY category ASC',
        'SELECT d.name AS department, ROUND(AVG(e.score), 2) AS avg_score, COUNT(*) AS student_count FROM departments d INNER JOIN enrollments e ON d.code = e.dept_code GROUP BY d.code, d.name HAVING COUNT(*) >= 3 ORDER BY avg_score DESC;',
        'WITH salary_ranks AS (SELECT name, department, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) SELECT name, department, salary FROM salary_ranks WHERE rnk = 2 ORDER BY name ASC;',
        'SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
    ];

    for (const q of validQueries) {
        const res = validateStudentQuery(q);
        assert.ok(res.cleanSql.length > 0);
        assert.ok(!res.cleanSql.endsWith(';'));
    }
});

test('SQL Validation: rejects dangerous, mutating, multi-statement, and cross-schema queries', () => {
    const forbiddenQueries = [
        '',
        '   ',
        'INSERT INTO students VALUES (99, \'x\');',
        "UPDATE students SET marks = 100 WHERE id = 1;",
        'DELETE FROM students;',
        'DROP TABLE students;',
        'ALTER TABLE students ADD COLUMN x INT;',
        'CREATE TABLE hack (id INT);',
        'TRUNCATE TABLE students;',
        'GRANT ALL ON students TO PUBLIC;',
        'REVOKE ALL ON students FROM PUBLIC;',
        'SELECT 1; DROP TABLE users;',
        'SELECT 1; SELECT 2;',
        'SELECT * FROM public.users;',
        'SELECT * FROM auth.users;',
        'SELECT * FROM pg_catalog.pg_tables;',
        'SELECT * FROM information_schema.tables;',
        'SELECT pg_sleep(5);',
        'SELECT version();',
        "SELECT current_setting('is_superuser');",
        'SELECT * INTO copied_tbl FROM students;',
        'SELECT * FROM students FOR UPDATE;',
        'SELECT * FROM students WHERE ' + 'a = 1 AND '.repeat(2000) + 'b = 2;',
    ];

    assert.ok(forbiddenQueries[forbiddenQueries.length - 1].length > MAX_QUERY_LENGTH);

    for (const q of forbiddenQueries) {
        assert.throws(() => validateStudentQuery(q), ValidationError);
    }
});

test('Query Evaluation: handles column casing, numeric formatting, NULLs, duplicates, and ordering', () => {
    const expectedOrdered = {
        columns: ['department', 'avg_score', 'student_count'],
        orderMatters: true,
        rows: [
            { department: 'AI & Data Science', avg_score: 90, student_count: 3 },
            { department: 'Computer Science', avg_score: 87.5, student_count: 4 },
        ],
    };

    // Case-insensitive columns + PostgreSQL stringified numeric/bigint values
    const pgFormattedMatch = {
        columns: ['DEPARTMENT', 'Avg_Score', 'student_count'],
        truncated: false,
        rows: [
            { DEPARTMENT: 'AI & Data Science', Avg_Score: '90.00', student_count: '3' },
            { DEPARTMENT: 'Computer Science', Avg_Score: '87.50', student_count: '4' },
        ],
    };
    assert.equal(evaluateQueryResult(pgFormattedMatch, expectedOrdered).isCorrect, true);

    // Out-of-order rejected when orderMatters is true
    const outOfOrder = {
        columns: ['department', 'avg_score', 'student_count'],
        truncated: false,
        rows: [...pgFormattedMatch.rows].reverse().map((r) => ({
            department: r.DEPARTMENT,
            avg_score: r.Avg_Score,
            student_count: r.student_count,
        })),
    };
    assert.equal(evaluateQueryResult(outOfOrder, expectedOrdered).isCorrect, false);

    // Unordered preserves duplicates accurately
    const expectedUnordered = {
        columns: ['tag', 'val'],
        orderMatters: false,
        rows: [
            { tag: 'A', val: null },
            { tag: 'A', val: null },
            { tag: 'B', val: 10 },
        ],
    };
    assert.equal(
        evaluateQueryResult(
            {
                columns: ['tag', 'val'],
                truncated: false,
                rows: [
                    { tag: 'B', val: 10 },
                    { tag: 'A', val: null },
                    { tag: 'A', val: null },
                ],
            },
            expectedUnordered
        ).isCorrect,
        true
    );
    assert.equal(
        evaluateQueryResult(
            {
                columns: ['tag', 'val'],
                truncated: false,
                rows: [
                    { tag: 'A', val: null },
                    { tag: 'B', val: 10 },
                    { tag: 'B', val: 10 },
                ],
            },
            expectedUnordered
        ).isCorrect,
        false
    );
});

test('Optimality Scoring: awards 10 optimal, 5 standard, 0 incorrect (max 60 across 6 missions)', () => {
    const mission1Expected = DEFAULT_MISSIONS[0].expected_result;

    const optimalAst = validateStudentQuery(DEFAULT_MISSIONS[0].explanation.syntax);
    const optimalScore = scoreQuerySolution(true, optimalAst.features, mission1Expected);
    assert.equal(optimalScore.isOptimal, true);
    assert.equal(optimalScore.points, 10);

    // Correct result but without LIMIT -> 5 pts
    const nonOptimalAst = validateStudentQuery("SELECT name, usn, marks FROM students WHERE department = 'Computer Science' ORDER BY marks DESC");
    const stdScore = scoreQuerySolution(true, nonOptimalAst.features, mission1Expected);
    assert.equal(stdScore.isOptimal, false);
    assert.equal(stdScore.points, 5);
    assert.ok(stdScore.optimalityNotes.length > 0);

    // Incorrect -> 0 pts
    const wrongScore = scoreQuerySolution(false, optimalAst.features, mission1Expected);
    assert.equal(wrongScore.points, 0);
});

test('Default Missions: all 6 missions have valid syntax, alternative queries, 3 hints, and max 60 pts total', () => {
    assert.equal(DEFAULT_MISSIONS.length, 6);
    for (const m of DEFAULT_MISSIONS) {
        assert.ok(['ROOKIE', 'EXPLORER', 'MASTER'].includes(m.difficulty));
        assert.equal(m.hints.length, 3);
        assert.doesNotThrow(() => validateStudentQuery(m.explanation.syntax));
        assert.doesNotThrow(() => validateStudentQuery(m.explanation.alternativeQuery));
    }
});

test('Auth Middleware: students cannot pass requireAdmin and unauthenticated requests are blocked', () => {
    const { verifyToken, requireAdmin } = require('../middleware/auth');
    const secret = process.env.JWT_SECRET || 'pixel-quest-dev-secret';
    const studentToken = jwt.sign({ usn: 'NNM24CS001', role: 'student', isAdmin: false }, secret);

    const mockRes = () => {
        const res = { statusCode: 200, body: null };
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (obj) => {
            res.body = obj;
            return res;
        };
        return res;
    };

    // Unauthenticated
    const res401 = mockRes();
    verifyToken({ headers: {} }, res401, () => assert.fail('Should not call next'));
    assert.equal(res401.statusCode, 401);

    // Student blocked by requireAdmin
    const req = { headers: { authorization: `Bearer ${studentToken}` } };
    const res403 = mockRes();
    let passedAuth = false;
    verifyToken(req, res403, () => {
        passedAuth = true;
    });
    assert.equal(passedAuth, true);
    requireAdmin(req, res403, () => assert.fail('Student should not pass requireAdmin'));
    assert.equal(res403.statusCode, 403);
});
