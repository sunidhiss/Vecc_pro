import React from 'react';
import { ERD_LEGEND_ITEMS } from '../../data/databaseSchema';

const SchemaLegend = ({ entityCount, relationshipCount = 4 }) => {
    return (
        <div className="erd-legend-bar pixel-border">
            <div className="erd-legend-items">
                {ERD_LEGEND_ITEMS.map((item) => (
                    <span key={item.label} className="erd-legend-chip">
                        <span className={`erd-legend-symbol ${item.kind}`}>{item.badge}</span>
                        <span className="erd-legend-text">{item.label}</span>
                    </span>
                ))}
            </div>

            <div className="erd-legend-counts">
                <span className="erd-count-pill">{entityCount} ENTITIES</span>
                <span className="erd-count-pill">{relationshipCount} RELATIONSHIPS</span>
            </div>
        </div>
    );
};

export default SchemaLegend;
