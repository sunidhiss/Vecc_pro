import React, { useMemo, useState, useRef, useEffect } from 'react';

const SchemaSearch = ({ entities, onSelectEntity }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        const matches = [];
        for (const entity of entities) {
            const tableMatch =
                entity.table.toLowerCase().includes(q) ||
                entity.displayName.toLowerCase().includes(q);

            if (tableMatch) {
                matches.push({
                    key: `table-${entity.id}`,
                    entityId: entity.id,
                    kind: 'ENTITY',
                    title: entity.displayName,
                    subtitle: `${entity.columns.length} columns • ${entity.code}`,
                });
            }

            for (const col of entity.columns) {
                if (
                    col.name.toLowerCase().includes(q) ||
                    col.type.toLowerCase().includes(q)
                ) {
                    matches.push({
                        key: `col-${entity.id}-${col.name}`,
                        entityId: entity.id,
                        kind: 'ATTR',
                        title: `${entity.table}.${col.name}`,
                        subtitle: `${col.type}${col.primaryKey ? ' • PK' : ''}${col.foreignKey ? ' • FK' : ''}`,
                    });
                }
            }
        }
        return matches.slice(0, 12);
    }, [entities, query]);

    useEffect(() => {
        const handleOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handlePick = (entityId) => {
        onSelectEntity(entityId);
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault();
            handlePick(results[0].entityId);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="erd-search-wrap" ref={wrapRef}>
            <div className="erd-search-input-box">
                <span className="erd-search-icon" aria-hidden="true">🔍</span>
                <input
                    type="search"
                    className="pixel-input erd-search-input cursor-target"
                    placeholder="Search entities or attributes..."
                    aria-label="Search entities or attributes"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <button
                        type="button"
                        className="erd-search-clear cursor-target"
                        onClick={() => {
                            setQuery('');
                            setOpen(false);
                        }}
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {open && query.trim() && (
                <div className="erd-search-dropdown pixel-border" role="listbox">
                    {results.length === 0 ? (
                        <div className="erd-search-empty">No matching entities or columns.</div>
                    ) : (
                        results.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="option"
                                className="erd-search-option cursor-target"
                                onClick={() => handlePick(item.entityId)}
                            >
                                <span className={`erd-search-kind ${item.kind === 'ENTITY' ? 'is-entity' : 'is-attr'}`}>
                                    {item.kind}
                                </span>
                                <span className="erd-search-texts">
                                    <strong>{item.title}</strong>
                                    <small>{item.subtitle}</small>
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SchemaSearch;
