import React, { useState } from 'react';

const DatabaseExplorer = ({ schemaDefinition, sampleData, onInsertIdentifier, isCollapsed, onToggleCollapse }) => {
    const tables = schemaDefinition?.tables || [];
    const [expandedTables, setExpandedTables] = useState(() => {
        const init = {};
        tables.forEach((t, idx) => {
            init[t.name] = idx === 0;
        });
        return init;
    });
    const [showSampleFor, setShowSampleFor] = useState({});

    const toggleTable = (name) => {
        setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const toggleSample = (name) => {
        setShowSampleFor((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    if (isCollapsed) {
        return (
            <aside className="qq-explorer collapsed pixel-border">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="qq-explorer-toggle cursor-target"
                    aria-label="Expand Database Explorer"
                    title="Expand Database Explorer"
                >
                    🗄️ ▶
                </button>
            </aside>
        );
    }

    return (
        <aside className="qq-explorer pixel-border" aria-label="Database Explorer">
            <div className="qq-explorer-header">
                <h3>🗄️ DB EXPLORER</h3>
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="qq-explorer-toggle cursor-target"
                    aria-label="Collapse Database Explorer"
                >
                    ◀
                </button>
            </div>
            <p className="qq-explorer-tip">Click any table or column to copy into editor.</p>

            <div className="qq-tables-list">
                {tables.map((table) => {
                    const isOpen = expandedTables[table.name] ?? true;
                    const rows = sampleData?.[table.name] || [];
                    const sampleOpen = Boolean(showSampleFor[table.name]);

                    return (
                        <div key={table.name} className="qq-table-item">
                            <div className="qq-table-header">
                                <button
                                    type="button"
                                    className="qq-table-expand cursor-target"
                                    onClick={() => toggleTable(table.name)}
                                    aria-expanded={isOpen}
                                >
                                    <span>{isOpen ? '▼' : '▶'}</span>
                                    <span className="qq-table-name">{table.name}</span>
                                </button>
                                <button
                                    type="button"
                                    className="qq-copy-chip cursor-target"
                                    onClick={() => onInsertIdentifier(table.name)}
                                    title={`Insert ${table.name} into SQL editor`}
                                    aria-label={`Copy table name ${table.name} to editor`}
                                >
                                    + USE
                                </button>
                            </div>

                            {isOpen && (
                                <div className="qq-table-body">
                                    <ul className="qq-column-list">
                                        {(table.columns || []).map((col) => (
                                            <li key={col.name} className="qq-column-row">
                                                <button
                                                    type="button"
                                                    className="qq-col-btn cursor-target"
                                                    onClick={() => onInsertIdentifier(col.name)}
                                                    title={`Insert ${col.name} into editor`}
                                                >
                                                    <span className="qq-col-name">{col.name}</span>
                                                    <span className="qq-col-meta">
                                                        {col.primaryKey && <span className="qq-key-tag pk">PK</span>}
                                                        {col.foreignKey && (
                                                            <span
                                                                className="qq-key-tag fk"
                                                                title={`References ${col.foreignKey.table}.${col.foreignKey.column}`}
                                                            >
                                                                FK
                                                            </span>
                                                        )}
                                                        <span className="qq-col-type">{col.type}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        type="button"
                                        className="qq-sample-toggle cursor-target"
                                        onClick={() => toggleSample(table.name)}
                                    >
                                        {sampleOpen ? 'Hide Sample Rows' : `Preview Sample Rows (${rows.length})`}
                                    </button>

                                    {sampleOpen && rows.length > 0 && (
                                        <div className="qq-sample-scroll">
                                            <table className="qq-sample-table">
                                                <thead>
                                                    <tr>
                                                        {table.columns.map((c) => (
                                                            <th key={c.name}>{c.name}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, rIdx) => (
                                                        <tr key={rIdx}>
                                                            {table.columns.map((c) => (
                                                                <td key={c.name}>
                                                                    {row[c.name] === null || row[c.name] === undefined
                                                                        ? 'NULL'
                                                                        : String(row[c.name])}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

export default DatabaseExplorer;
