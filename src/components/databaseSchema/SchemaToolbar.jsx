import React from 'react';
import SchemaSearch from './SchemaSearch';
import { GROUP_META } from '../../data/databaseSchema';

const SchemaToolbar = ({
    entities,
    activeGroup,
    onChangeGroup,
    onSelectSearchResult,
    onZoomIn,
    onZoomOut,
    onFitView,
    onResetLayout,
}) => {
    return (
        <div className="erd-toolbar pixel-border">
            <SchemaSearch entities={entities} onSelectEntity={onSelectSearchResult} />

            <div className="erd-group-filters" role="group" aria-label="Filter diagram by entity group">
                <button
                    type="button"
                    className={`erd-filter-btn cursor-target ${activeGroup === 'all' ? 'active' : ''}`}
                    onClick={() => onChangeGroup('all')}
                >
                    ALL ({entities.length})
                </button>
                {Object.values(GROUP_META).map((grp) => (
                    <button
                        key={grp.id}
                        type="button"
                        className={`erd-filter-btn cursor-target ${activeGroup === grp.id ? 'active' : ''}`}
                        onClick={() => onChangeGroup(grp.id)}
                    >
                        {grp.icon} {grp.label.split(' ')[0]}
                    </button>
                ))}
            </div>

            <div className="erd-zoom-controls" role="group" aria-label="Diagram navigation controls">
                <button
                    type="button"
                    className="erd-ctrl-btn cursor-target"
                    onClick={onZoomIn}
                    title="Zoom In"
                    aria-label="Zoom in"
                >
                    +
                </button>
                <button
                    type="button"
                    className="erd-ctrl-btn cursor-target"
                    onClick={onZoomOut}
                    title="Zoom Out"
                    aria-label="Zoom out"
                >
                    −
                </button>
                <button
                    type="button"
                    className="erd-ctrl-btn erd-ctrl-wide cursor-target"
                    onClick={onFitView}
                    title="Fit diagram to screen"
                >
                    FIT
                </button>
                <button
                    type="button"
                    className="erd-ctrl-btn erd-ctrl-wide cursor-target"
                    onClick={onResetLayout}
                    title="Reset node positions and zoom"
                >
                    RESET
                </button>
            </div>
        </div>
    );
};

export default SchemaToolbar;
