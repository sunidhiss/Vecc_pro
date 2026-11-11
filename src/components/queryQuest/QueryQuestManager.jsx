import React, { useState, useEffect, useCallback } from 'react';
import PixelButton from '../PixelButton';
import ChallengePanel from './ChallengePanel';
import DatabaseExplorer from './DatabaseExplorer';
import queryQuestApi from '../../services/queryQuestApi';

const SAMPLE_SCHEMA = {
    tables: [
        {
            name: 'students',
            columns: [
                { name: 'id', type: 'INTEGER', primaryKey: true },
                { name: 'name', type: 'VARCHAR(100)' },
                { name: 'department', type: 'VARCHAR(50)' },
                { name: 'marks', type: 'INTEGER' },
            ],
        },
    ],
};

const SAMPLE_SEED = {
    tables: {
        students: [
            { id: 1, name: 'Aarav', department: 'CS', marks: 95 },
            { id: 2, name: 'Diya', department: 'CS', marks: 88 },
            { id: 3, name: 'Rohan', department: 'AD', marks: 91 },
        ],
    },
};

const SAMPLE_EXPECTED = {
    columns: ['name', 'marks'],
    orderMatters: true,
    rows: [
        { name: 'Aarav', marks: 95 },
        { name: 'Diya', marks: 88 },
    ],
};

function createEmptyForm(defaultDate) {
    return {
        id: null,
        missionOrder: 1,
        title: '',
        difficulty: 'ROOKIE',
        topic: 'SELECT • WHERE',
        challengeDate: defaultDate,
        isActive: true,
        scenario: '',
        description: '',
        starterQuery: 'SELECT *\nFROM students;',
        tables: SAMPLE_SCHEMA.tables,
        seedJson: JSON.stringify(SAMPLE_SEED, null, 2),
        expectedColumns: 'name, marks',
        orderMatters: true,
        expectedRowsJson: JSON.stringify(SAMPLE_EXPECTED.rows, null, 2),
        hints: ['', '', ''],
        concept: '',
        summary: '',
        syntax: '',
        commonMistakes: '',
        alternativeQuery: '',
    };
}

const QueryQuestManager = ({ defaultDate, onSaved }) => {
    const [challenges, setChallenges] = useState([]);
    const [filterDate, setFilterDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [form, setForm] = useState(() => createEmptyForm(defaultDate));

    const fetchChallenges = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await queryQuestApi.listAdminChallenges(filterDate || undefined);
            setChallenges(data.challenges || []);
        } catch (err) {
            setError(err.message || 'Failed to load Query Quest challenges.');
        } finally {
            setLoading(false);
        }
    }, [filterDate]);

    useEffect(() => {
        fetchChallenges();
    }, [fetchChallenges]);

    const handleEdit = (ch) => {
        setForm({
            id: ch.id,
            missionOrder: ch.mission_order || 1,
            title: ch.title || '',
            difficulty: ch.difficulty || 'ROOKIE',
            topic: ch.topic || '',
            challengeDate: ch.challenge_date || defaultDate,
            isActive: ch.is_active !== false,
            scenario: ch.scenario || '',
            description: ch.description || '',
            starterQuery: ch.starter_query || 'SELECT *\nFROM table_name;',
            tables: ch.schema_definition?.tables || SAMPLE_SCHEMA.tables,
            seedJson: JSON.stringify(ch.seed_data || { tables: {} }, null, 2),
            expectedColumns: (ch.expected_result?.columns || []).join(', '),
            orderMatters: Boolean(ch.expected_result?.orderMatters),
            expectedRowsJson: JSON.stringify(ch.expected_result?.rows || [], null, 2),
            hints: [
                ch.hints?.[0] || '',
                ch.hints?.[1] || '',
                ch.hints?.[2] || '',
            ],
            concept: ch.explanation?.concept || '',
            summary: ch.explanation?.summary || '',
            syntax: ch.explanation?.syntax || '',
            commonMistakes: Array.isArray(ch.explanation?.commonMistakes)
                ? ch.explanation.commonMistakes.join('\n')
                : '',
            alternativeQuery: ch.explanation?.alternativeQuery || '',
        });
        setShowPreview(false);
        setError('');
    };

    const addTable = () => {
        setForm((prev) => ({
            ...prev,
            tables: [
                ...prev.tables,
                { name: `table_${prev.tables.length + 1}`, columns: [{ name: 'id', type: 'INTEGER', primaryKey: true }] },
            ],
        }));
    };

    const removeTable = (tIdx) => {
        setForm((prev) => ({
            ...prev,
            tables: prev.tables.filter((_, i) => i !== tIdx),
        }));
    };

    const updateTableName = (tIdx, name) => {
        setForm((prev) => ({
            ...prev,
            tables: prev.tables.map((t, i) => (i === tIdx ? { ...t, name } : t)),
        }));
    };

    const addColumn = (tIdx) => {
        setForm((prev) => ({
            ...prev,
            tables: prev.tables.map((t, i) =>
                i === tIdx
                    ? { ...t, columns: [...t.columns, { name: `col_${t.columns.length + 1}`, type: 'VARCHAR(100)', primaryKey: false }] }
                    : t
            ),
        }));
    };

    const removeColumn = (tIdx, cIdx) => {
        setForm((prev) => ({
            ...prev,
            tables: prev.tables.map((t, i) =>
                i === tIdx ? { ...t, columns: t.columns.filter((_, ci) => ci !== cIdx) } : t
            ),
        }));
    };

    const updateColumn = (tIdx, cIdx, patch) => {
        setForm((prev) => ({
            ...prev,
            tables: prev.tables.map((t, i) =>
                i === tIdx
                    ? {
                        ...t,
                        columns: t.columns.map((c, ci) => (ci === cIdx ? { ...c, ...patch } : c)),
                    }
                    : t
            ),
        }));
    };

    const buildPayload = () => {
        let parsedSeed;
        try {
            parsedSeed = JSON.parse(form.seedJson);
        } catch {
            throw new Error('Seed Data must be valid JSON.');
        }

        let parsedRows;
        try {
            parsedRows = JSON.parse(form.expectedRowsJson);
            if (!Array.isArray(parsedRows)) throw new Error();
        } catch {
            throw new Error('Expected Output Rows must be a valid JSON array.');
        }

        const expectedCols = form.expectedColumns
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        if (expectedCols.length === 0) {
            throw new Error('Specify at least one expected output column name.');
        }

        return {
            missionOrder: Number(form.missionOrder) || 1,
            title: form.title,
            difficulty: form.difficulty,
            topic: form.topic,
            challengeDate: form.challengeDate,
            isActive: form.isActive,
            scenario: form.scenario,
            description: form.description,
            starterQuery: form.starterQuery,
            schemaDefinition: { tables: form.tables },
            seedData: parsedSeed,
            expectedResult: {
                columns: expectedCols,
                orderMatters: form.orderMatters,
                rows: parsedRows,
            },
            hints: form.hints.map((h) => h.trim()).filter(Boolean),
            explanation: {
                concept: form.concept,
                summary: form.summary,
                syntax: form.syntax,
                commonMistakes: form.commonMistakes
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                alternativeQuery: form.alternativeQuery,
            },
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const payload = buildPayload();
            if (form.id) {
                await queryQuestApi.updateAdminChallenge(form.id, payload);
            } else {
                await queryQuestApi.createAdminChallenge(payload);
            }
            onSaved?.();
            setForm(createEmptyForm(defaultDate));
            await fetchChallenges();
        } catch (err) {
            setError(err.message || 'Failed to save Query Quest challenge.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (ch) => {
        try {
            await queryQuestApi.updateAdminChallenge(ch.id, { isActive: !ch.is_active });
            await fetchChallenges();
        } catch (err) {
            setError(err.message || 'Failed to update status.');
        }
    };

    const handleDelete = async (id) => {
        try {
            await queryQuestApi.deleteAdminChallenge(id, false);
            if (form.id === id) setForm(createEmptyForm(defaultDate));
            await fetchChallenges();
        } catch (err) {
            setError(err.message || 'Failed to delete challenge.');
        }
    };

    let previewData = null;
    if (showPreview) {
        let sampleTables = {};
        try {
            sampleTables = JSON.parse(form.seedJson)?.tables || {};
        } catch {
            sampleTables = {};
        }
        previewData = {
            challenge: {
                title: form.title || 'PREVIEW MISSION',
                difficulty: form.difficulty,
                topic: form.topic || 'SQL',
                scenario: form.scenario || 'Scenario preview...',
                description: form.description || 'Mission objective preview...',
                maxPoints: 10,
                completed: false,
            },
            schemaDefinition: { tables: form.tables },
            sampleData: sampleTables,
        };
    }

    return (
        <div className="qq-manager">
            <div className="qq-mgr-list-section">
                <div className="qq-mgr-bar">
                    <h3>QUERY QUEST MANAGER</h3>
                    <div className="qq-mgr-filters">
                        <input
                            type="date"
                            className="pixel-input"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            aria-label="Filter challenges by date"
                        />
                        {filterDate && (
                            <button type="button" className="qq-tool-btn cursor-target" onClick={() => setFilterDate('')}>
                                ALL DATES
                            </button>
                        )}
                        <button
                            type="button"
                            className="qq-tool-btn cursor-target"
                            onClick={() => setForm(createEmptyForm(defaultDate))}
                        >
                            + NEW MISSION
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p>Loading challenges...</p>
                ) : challenges.length === 0 ? (
                    <p className="qq-mgr-empty">No custom Query Quest challenges found for this filter yet.</p>
                ) : (
                    <div className="qq-mgr-cards">
                        {challenges.map((ch) => (
                            <div key={ch.id} className={`qq-mgr-item pixel-border ${!ch.is_active ? 'inactive' : ''}`}>
                                <div className="qq-mgr-item-info">
                                    <strong>M{String(ch.mission_order).padStart(2, '0')} — {ch.title}</strong>
                                    <span>{ch.challenge_date} • {ch.difficulty} • {ch.topic} • {ch.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                                </div>
                                <div className="qq-mgr-item-actions">
                                    <button type="button" className="qq-tool-btn cursor-target" onClick={() => handleEdit(ch)}>EDIT</button>
                                    <button type="button" className="qq-tool-btn cursor-target" onClick={() => handleToggleActive(ch)}>
                                        {ch.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                                    </button>
                                    <button type="button" className="qq-tool-btn danger cursor-target" onClick={() => handleDelete(ch.id)}>DELETE</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="admin-form qq-mgr-form">
                <h3>{form.id ? `EDIT MISSION #${form.id}` : 'CREATE NEW SQL MISSION'}</h3>
                {error && <div className="qq-mgr-error">{error}</div>}

                <div className="options-admin-grid">
                    <div>
                        <label>Mission Order (1-6):</label>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            className="pixel-input"
                            value={form.missionOrder}
                            onChange={(e) => setForm({ ...form, missionOrder: e.target.value })}
                        />
                    </div>
                    <div>
                        <label>Challenge Date (YYYY-MM-DD):</label>
                        <input
                            type="date"
                            className="pixel-input"
                            value={form.challengeDate}
                            onChange={(e) => setForm({ ...form, challengeDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label>Difficulty:</label>
                        <select
                            className="pixel-input"
                            value={form.difficulty}
                            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                        >
                            <option value="ROOKIE">LEVEL 1 — ROOKIE</option>
                            <option value="EXPLORER">LEVEL 2 — EXPLORER</option>
                            <option value="MASTER">LEVEL 3 — MASTER</option>
                        </select>
                    </div>
                    <div>
                        <label>Topic:</label>
                        <input
                            className="pixel-input"
                            value={form.topic}
                            onChange={(e) => setForm({ ...form, topic: e.target.value })}
                            placeholder="e.g. JOIN • GROUP BY • HAVING"
                        />
                    </div>
                </div>

                <label>Mission Title:</label>
                <input
                    className="pixel-input full-width"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. MISSION 01 — THE CS HONOR ROLL"
                />

                <label>Scenario:</label>
                <textarea
                    className="pixel-input full-width"
                    rows={2}
                    value={form.scenario}
                    onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                    placeholder="Real-world context for the student..."
                />

                <label>Mission Objective (Task Description):</label>
                <textarea
                    className="pixel-input full-width"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Exact columns, filtering, and ordering requirements..."
                />

                <label>Starter SQL Template:</label>
                <textarea
                    className="pixel-input full-width"
                    rows={3}
                    value={form.starterQuery}
                    onChange={(e) => setForm({ ...form, starterQuery: e.target.value })}
                />

                <div className="admin-q-block pixel-border">
                    <div className="qq-mgr-bar">
                        <label>Practice Tables & Columns:</label>
                        <button type="button" className="qq-tool-btn cursor-target" onClick={addTable}>+ ADD TABLE</button>
                    </div>

                    {form.tables.map((tbl, tIdx) => (
                        <div key={tIdx} className="qq-mgr-table-box">
                            <div className="qq-mgr-bar">
                                <input
                                    className="pixel-input"
                                    value={tbl.name}
                                    onChange={(e) => updateTableName(tIdx, e.target.value)}
                                    placeholder="table_name"
                                />
                                <div className="qq-mgr-item-actions">
                                    <button type="button" className="qq-tool-btn cursor-target" onClick={() => addColumn(tIdx)}>+ COL</button>
                                    {form.tables.length > 1 && (
                                        <button type="button" className="qq-tool-btn danger cursor-target" onClick={() => removeTable(tIdx)}>REMOVE TBL</button>
                                    )}
                                </div>
                            </div>

                            {tbl.columns.map((col, cIdx) => (
                                <div key={cIdx} className="qq-mgr-col-row">
                                    <input
                                        className="pixel-input"
                                        value={col.name}
                                        onChange={(e) => updateColumn(tIdx, cIdx, { name: e.target.value })}
                                        placeholder="col_name"
                                    />
                                    <input
                                        className="pixel-input"
                                        value={col.type}
                                        onChange={(e) => updateColumn(tIdx, cIdx, { type: e.target.value })}
                                        placeholder="INTEGER / VARCHAR(100)"
                                    />
                                    <label className="qq-inline-check">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(col.primaryKey)}
                                            onChange={(e) => updateColumn(tIdx, cIdx, { primaryKey: e.target.checked })}
                                        />
                                        PK
                                    </label>
                                    <input
                                        className="pixel-input"
                                        value={col.foreignKey ? `${col.foreignKey.table}.${col.foreignKey.column}` : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            if (!val) {
                                                updateColumn(tIdx, cIdx, { foreignKey: undefined });
                                            } else if (val.includes('.')) {
                                                const [fTable, fCol] = val.split('.');
                                                updateColumn(tIdx, cIdx, { foreignKey: { table: fTable.trim(), column: (fCol || '').trim() } });
                                            }
                                        }}
                                        placeholder="FK table.col (optional)"
                                    />
                                    {tbl.columns.length > 1 && (
                                        <button type="button" className="qq-tool-btn danger cursor-target" onClick={() => removeColumn(tIdx, cIdx)}>✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <label>Seed Data (JSON):</label>
                <textarea
                    className="pixel-input full-width"
                    rows={6}
                    value={form.seedJson}
                    onChange={(e) => setForm({ ...form, seedJson: e.target.value })}
                />

                <div className="admin-q-block pixel-border">
                    <label>Expected Output Columns (comma-separated, hidden from students):</label>
                    <input
                        className="pixel-input full-width correct-input"
                        value={form.expectedColumns}
                        onChange={(e) => setForm({ ...form, expectedColumns: e.target.value })}
                        placeholder="name, marks"
                    />
                    <label className="qq-inline-check">
                        <input
                            type="checkbox"
                            checked={form.orderMatters}
                            onChange={(e) => setForm({ ...form, orderMatters: e.target.checked })}
                        />
                        Preserve row ordering during evaluation (ORDER BY required)
                    </label>
                    <label>Expected Output Rows (JSON Array, hidden from students):</label>
                    <textarea
                        className="pixel-input full-width correct-input"
                        rows={5}
                        value={form.expectedRowsJson}
                        onChange={(e) => setForm({ ...form, expectedRowsJson: e.target.value })}
                    />
                </div>

                <div className="admin-q-block pixel-border">
                    <label>Progressive Hints (Optional 1–3):</label>
                    {form.hints.map((h, idx) => (
                        <input
                            key={idx}
                            className="pixel-input full-width"
                            value={h}
                            onChange={(e) => {
                                const next = [...form.hints];
                                next[idx] = e.target.value;
                                setForm({ ...form, hints: next });
                            }}
                            placeholder={`Hint ${idx + 1}`}
                        />
                    ))}
                </div>

                <div className="admin-q-block pixel-border">
                    <label>Post-Completion Concept & Explanation:</label>
                    <input
                        className="pixel-input full-width"
                        value={form.concept}
                        onChange={(e) => setForm({ ...form, concept: e.target.value })}
                        placeholder="Concept title (e.g. GROUP BY + HAVING)"
                    />
                    <textarea
                        className="pixel-input full-width"
                        rows={2}
                        value={form.summary}
                        onChange={(e) => setForm({ ...form, summary: e.target.value })}
                        placeholder="Concise explanation of why the query works..."
                    />
                    <textarea
                        className="pixel-input full-width"
                        rows={3}
                        value={form.syntax}
                        onChange={(e) => setForm({ ...form, syntax: e.target.value })}
                        placeholder="Reference SQL query..."
                    />
                    <textarea
                        className="pixel-input full-width"
                        rows={2}
                        value={form.commonMistakes}
                        onChange={(e) => setForm({ ...form, commonMistakes: e.target.value })}
                        placeholder="Common mistakes (one per line)"
                    />
                    <textarea
                        className="pixel-input full-width"
                        rows={2}
                        value={form.alternativeQuery}
                        onChange={(e) => setForm({ ...form, alternativeQuery: e.target.value })}
                        placeholder="Alternative valid SQL query (optional)"
                    />
                </div>

                <label className="qq-inline-check">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Challenge Active
                </label>

                <div className="qq-mgr-submit-row">
                    <button
                        type="button"
                        className="qq-tool-btn cursor-target"
                        onClick={() => setShowPreview((p) => !p)}
                    >
                        {showPreview ? 'HIDE PREVIEW' : 'PREVIEW CHALLENGE'}
                    </button>
                    <PixelButton type="submit" disabled={saving} className="cursor-target">
                        {saving ? 'SAVING...' : form.id ? 'UPDATE SQL MISSION' : 'CREATE SQL MISSION'}
                    </PixelButton>
                </div>
            </form>

            {showPreview && previewData && (
                <div className="qq-mgr-preview">
                    <h3>STUDENT VIEW PREVIEW (EXPECTED OUTPUT HIDDEN)</h3>
                    <ChallengePanel challenge={previewData.challenge} />
                    <div className="mt-4">
                        <DatabaseExplorer
                            schemaDefinition={previewData.schemaDefinition}
                            sampleData={previewData.sampleData}
                            onInsertIdentifier={() => {}}
                            isCollapsed={false}
                            onToggleCollapse={() => {}}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueryQuestManager;
