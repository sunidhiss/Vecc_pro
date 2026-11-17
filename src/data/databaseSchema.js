/**
 * Pixel Quest Database Schema
 * Simplified student-facing Entity-Relationship Diagram data.
 * Displays only approved core attributes and clean non-technical descriptions.
 */

export const GROUP_META = {
    core: { id: 'core', label: 'Users & Games', description: 'User accounts, departments, game scores, and daily questions' },
    sql: { id: 'sql', label: 'Query Quest', description: 'SQL challenge schemas and test fixtures' },
};

export const SCHEMA_GROUPS = [
    { id: 'all', label: 'All Tables', description: 'Complete database architecture' },
    GROUP_META.core,
    GROUP_META.sql,
];

export const ERD_LEGEND_ITEMS = [
    { kind: 'pk', badge: 'PK', label: 'Primary Key' },
    { kind: 'fk', badge: 'FK', label: 'Foreign Key' },
    { kind: 'card-1n', badge: '1:N', label: 'One-to-Many' },
];

export const SCHEMA_ENTITIES = [
    {
        id: 'departments',
        name: 'departments',
        displayName: 'DEPARTMENTS',
        category: 'core',
        group: 'core',
        isCentral: false,
        description: 'Stores the engineering departments available in Pixel Quest.',
        position: { x: 40, y: 70 },
        columns: [
            { name: 'department_code', type: 'VARCHAR(5)', primaryKey: true, foreignKey: false },
            { name: 'department_name', type: 'VARCHAR(100)', primaryKey: false, foreignKey: false },
        ],
    },
    {
        id: 'users',
        name: 'users',
        displayName: 'USERS',
        category: 'core',
        group: 'core',
        isCentral: true,
        description: 'Stores registered students and their account roles.',
        position: { x: 340, y: 70 },
        columns: [
            { name: 'usn', type: 'VARCHAR(20)', primaryKey: true, foreignKey: false },
            { name: 'department_code', type: 'VARCHAR(5)', primaryKey: false, foreignKey: true },
            { name: 'role', type: 'VARCHAR(20)', primaryKey: false, foreignKey: false },
        ],
    },
    {
        id: 'daily_questions',
        name: 'daily_questions',
        displayName: 'DAILY_QUESTIONS',
        category: 'core',
        group: 'core',
        isCentral: false,
        description: 'Stores the daily questions used in different games.',
        position: { x: 650, y: 70 },
        columns: [
            { name: 'id', type: 'UUID', primaryKey: true, foreignKey: false },
            { name: 'game_name', type: 'VARCHAR(30)', primaryKey: false, foreignKey: false },
            { name: 'game_date', type: 'DATE', primaryKey: false, foreignKey: false },
        ],
    },
    {
        id: 'query_quest_challenges',
        name: 'query_quest_challenges',
        displayName: 'QUERY_QUEST_CHALLENGES',
        category: 'sql',
        group: 'sql',
        isCentral: false,
        description: 'Stores SQL challenges used in Query Quest.',
        position: { x: 960, y: 70 },
        columns: [
            { name: 'id', type: 'UUID', primaryKey: true, foreignKey: false },
            { name: 'title', type: 'VARCHAR(150)', primaryKey: false, foreignKey: false },
            { name: 'difficulty', type: 'VARCHAR(20)', primaryKey: false, foreignKey: false },
        ],
    },
    {
        id: 'game_scores',
        name: 'game_scores',
        displayName: 'GAME_SCORES',
        category: 'core',
        group: 'core',
        isCentral: false,
        description: "Records students' game scores and daily attempts.",
        position: { x: 500, y: 390 },
        columns: [
            { name: 'id', type: 'UUID', primaryKey: true, foreignKey: false },
            { name: 'usn', type: 'VARCHAR(20)', primaryKey: false, foreignKey: true },
            { name: 'daily_question_id', type: 'UUID', primaryKey: false, foreignKey: true },
            { name: 'challenge_id', type: 'UUID', primaryKey: false, foreignKey: true },
            { name: 'game_name', type: 'VARCHAR(30)', primaryKey: false, foreignKey: false },
            { name: 'game_date', type: 'DATE', primaryKey: false, foreignKey: false },
            { name: 'score', type: 'INTEGER', primaryKey: false, foreignKey: false },
        ],
    },
];

export const SCHEMA_RELATIONSHIPS = [
    {
        id: 'rel_departments_users',
        source: 'departments',
        target: 'users',
        sourceHandle: 'src-right',
        targetHandle: 'tgt-left',
        label: 'belongs to',
        cardinality: '1:N',
        cardinalityLabel: 'One-to-many',
        enforced: true,
        pillLabel: 'belongs to',
        foreignKeyLabel: 'users.department_code → departments.department_code',
        description: 'One department has many users.',
    },
    {
        id: 'rel_users_game_scores',
        source: 'users',
        target: 'game_scores',
        sourceHandle: 'src-bottom',
        targetHandle: 'tgt-left',
        label: 'earns',
        cardinality: '1:N',
        cardinalityLabel: 'One-to-many',
        enforced: true,
        pillLabel: 'earns',
        foreignKeyLabel: 'game_scores.usn → users.usn',
        description: 'One user can have many game score records.',
    },
    {
        id: 'rel_daily_questions_game_scores',
        source: 'daily_questions',
        target: 'game_scores',
        sourceHandle: 'src-bottom',
        targetHandle: 'tgt-top',
        label: 'generates',
        cardinality: '1:N',
        cardinalityLabel: 'One-to-many',
        enforced: true,
        pillLabel: 'generates',
        foreignKeyLabel: 'game_scores.daily_question_id → daily_questions.id',
        description: 'One daily question set can be associated with many game score records.',
    },
    {
        id: 'rel_challenges_game_scores',
        source: 'query_quest_challenges',
        target: 'game_scores',
        sourceHandle: 'src-bottom',
        targetHandle: 'tgt-right',
        label: 'is tracked in',
        cardinality: '1:N',
        cardinalityLabel: 'One-to-many',
        enforced: true,
        pillLabel: 'is tracked in',
        foreignKeyLabel: 'game_scores.challenge_id → query_quest_challenges.id',
        description: 'One challenge can be associated with many game score records.',
    },
];
