import React, { useState } from 'react';

const QueryResults = ({ executionResult, schemaDefinition }) => {
    const [activeTab, setActiveTab] = useState('results');

    const columns = executionResult?.columns || [];
    const rows = executionResult?.rows || [];
    const tables = schemaDefinition?.tables || [];

    const effectiveTab =
        executionResult && !executionResult.success && activeTab === 'results'
            ? 'messages'
            : activeTab;

    return (
        <div className="qq-output-card pixel-border">
            <div className="qq-output-tabs" role="tablist" aria-label="Query output tabs">
                <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'results'}
                    className={`qq-output-tab cursor-target ${effectiveTab === 'results' ? 'active' : ''}`}
                    onClick={() => setActiveTab('results')}
                >
                    📊 RESULTS {executionResult?.success ? `(${executionResult.rowCount})` : ''}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'messages'}
                    className={`qq-output-tab cursor-target ${effectiveTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('messages')}
                >
                    💬 MESSAGES {executionResult?.error ? '(!)' : ''}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'schema'}
                    className={`qq-output-tab cursor-target ${effectiveTab === 'schema' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schema')}
                >
                    🗂️ SCHEMA ({tables.length})
                </button>

                {executionResult && (
                    <span className="qq-exec-stats">
                        ⏱️ {executionResult.durationMs} ms
                    </span>
                )}
            </div>

            <div className="qq-output-body">
                {effectiveTab === 'results' && (
                    !executionResult ? (
                        <div className="qq-empty-state">
                            Execute a SQL query above to inspect real database results here.
                        </div>
                    ) : !executionResult.success ? (
                        <div className="qq-empty-state error">
                            Query did not return a result set. Check the Messages tab for details.
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="qq-empty-state">
                            Query executed successfully in {executionResult.durationMs} ms — 0 rows returned.
                        </div>
                    ) : (
                        <>
                            {executionResult.truncated && (
                                <div className="qq-truncated-banner">
                                    Result truncated to the first 100 rows.
                                </div>
                            )}
                            <div className="qq-results-scroll">
                                <table className="qq-results-table">
                                    <thead>
                                        <tr>
                                            {columns.map((col, idx) => (
                                                <th key={`${col}-${idx}`}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {columns.map((col, cIdx) => {
                                                    const val = row[col];
                                                    const isNull = val === null || val === undefined;
                                                    return (
                                                        <td key={`${rIdx}-${cIdx}`} className={isNull ? 'qq-null-cell' : ''}>
                                                            {isNull ? 'NULL' : String(val)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )
                )}

                {effectiveTab === 'messages' && (
                    <div className="qq-messages-panel">
                        {!executionResult ? (
                            <p className="qq-empty-state">No execution messages yet.</p>
                        ) : executionResult.error ? (
                            <div className={`qq-msg-box error`}>
                                <div className="qq-msg-category">
                                    {String(executionResult.errorCategory || 'SQL_ERROR').toUpperCase().replace('_', ' ')}
                                </div>
                                <pre className="qq-msg-text">{executionResult.error}</pre>
                            </div>
                        ) : (
                            <div className="qq-msg-box success">
                                <div className="qq-msg-category">EXECUTION SUCCEEDED</div>
                                <p>
                                    Returned {executionResult.rowCount} row(s) across {columns.length} column(s) in {executionResult.durationMs} ms.
                                </p>
                                {executionResult.feedback && <p className="mt-2">{executionResult.feedback}</p>}
                            </div>
                        )}
                    </div>
                )}

                {effectiveTab === 'schema' && (
                    <div className="qq-schema-summary">
                        {tables.map((t) => (
                            <div key={t.name} className="qq-schema-card">
                                <h4>{t.name}</h4>
                                <ul>
                                    {(t.columns || []).map((c) => (
                                        <li key={c.name}>
                                            <code>{c.name}</code> — <span>{c.type}</span>
                                            {c.primaryKey ? ' [PK]' : ''}
                                            {c.foreignKey ? ` [FK -> ${c.foreignKey.table}.${c.foreignKey.column}]` : ''}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueryResults;
