import React from 'react';
import { ERD_LEGEND_ITEMS } from '../../data/databaseSchema';

const SchemaLegend = ({ entityCount, enforcedCount, conceptualCount }) => {
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
                <span className="erd-count-pill">{enforcedCount} ENFORCED FKs</span>
                <span className="erd-count-pill">{conceptualCount} CONCEPTUAL</span>
            </div>
        </div>
    );
};

export default SchemaLegend;
