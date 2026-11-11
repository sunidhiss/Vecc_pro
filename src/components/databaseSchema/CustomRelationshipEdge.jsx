import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, Position, getSmoothStepPath } from '@xyflow/react';

function getDirectionUnit(position) {
    switch (position) {
        case Position.Left:
            return { x: -1, y: 0 };
        case Position.Right:
            return { x: 1, y: 0 };
        case Position.Top:
            return { x: 0, y: -1 };
        case Position.Bottom:
        default:
            return { x: 0, y: 1 };
    }
}

/**
 * Computes SVG crow's foot (1 or many) glyph lines anchored at (x, y) pointing outward along unit normal.
 */
function renderCardinalityGlyph({ x, y, position, isMany, color, strokeWidth }) {
    const dir = getDirectionUnit(position);
    const perp = { x: -dir.y, y: dir.x };
    const tipX = x;
    const tipY = y;
    const baseDist = 11;
    const barDist = 14;
    const spread = 6.5;

    if (!isMany) {
        // "Exactly one" || marker (two perpendicular ticks)
        const p1 = { x: tipX + dir.x * 7, y: tipY + dir.y * 7 };
        const p2 = { x: tipX + dir.x * 12, y: tipY + dir.y * 12 };
        return (
            <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
                <line
                    x1={p1.x - perp.x * spread}
                    y1={p1.y - perp.y * spread}
                    x2={p1.x + perp.x * spread}
                    y2={p1.y + perp.y * spread}
                />
                <line
                    x1={p2.x - perp.x * spread}
                    y1={p2.y - perp.y * spread}
                    x2={p2.x + perp.x * spread}
                    y2={p2.y + perp.y * spread}
                />
            </g>
        );
    }

    // Crow's foot "many" o{ marker
    const neckX = tipX + dir.x * baseDist;
    const neckY = tipY + dir.y * baseDist;
    const wing1X = tipX + dir.x * 2 + perp.x * spread;
    const wing1Y = tipY + dir.y * 2 + perp.y * spread;
    const wing2X = tipX + dir.x * 2 - perp.x * spread;
    const wing2Y = tipY + dir.y * 2 - perp.y * spread;
    const ringX = tipX + dir.x * (barDist + 2);
    const ringY = tipY + dir.y * (barDist + 2);

    return (
        <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none">
            <line x1={neckX} y1={neckY} x2={wing1X} y2={wing1Y} />
            <line x1={neckX} y1={neckY} x2={tipX + dir.x * 1.5} y2={tipY + dir.y * 1.5} />
            <line x1={neckX} y1={neckY} x2={wing2X} y2={wing2Y} />
            <circle cx={ringX} cy={ringY} r={3} fill="var(--panel-bg)" />
        </g>
    );
}

function CustomRelationshipEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}) {
    const {
        relationship,
        isHighlighted,
        isDimmed,
        onEdgeHover,
        onEdgeLeave,
    } = data || {};

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 6,
    });

    const isConceptual = relationship && !relationship.enforced;
    const targetIsMany = relationship?.cardinality === '1:N' || relationship?.cardinality === 'M:N';
    const sourceIsMany = relationship?.cardinality === 'M:N';

    const strokeColor = isHighlighted
        ? 'var(--accent-teal)'
        : isConceptual
            ? 'var(--accent-pink)'
            : 'var(--accent-purple)';

    const strokeWidth = isHighlighted ? 3.2 : 2;
    const opacity = isDimmed ? 0.22 : isHighlighted ? 1 : 0.78;

    return (
        <g
            className={`erd-relationship-edge ${isHighlighted ? 'is-highlighted' : ''} ${isConceptual ? 'is-conceptual' : ''}`}
            style={{ opacity, transition: 'opacity 0.2s ease' }}
        >
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: strokeColor,
                    strokeWidth,
                    strokeDasharray: isConceptual ? '6 5' : undefined,
                    fill: 'none',
                }}
            />

            {/* Crow's foot cardinality symbols */}
            {renderCardinalityGlyph({
                x: sourceX,
                y: sourceY,
                position: sourcePosition,
                isMany: sourceIsMany,
                color: strokeColor,
                strokeWidth,
            })}
            {renderCardinalityGlyph({
                x: targetX,
                y: targetY,
                position: targetPosition,
                isMany: targetIsMany,
                color: strokeColor,
                strokeWidth,
            })}

            {/* Invisible wide hover target for smooth relationship inspection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={18}
                className="erd-edge-hit-area"
                onMouseEnter={(e) => onEdgeHover?.(relationship, { x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => onEdgeHover?.(relationship, { x: e.clientX, y: e.clientY })}
                onMouseLeave={() => onEdgeLeave?.()}
                onClick={(e) => {
                    e.stopPropagation();
                    onEdgeHover?.(relationship, { x: e.clientX, y: e.clientY });
                }}
            />

            <EdgeLabelRenderer>
                <div
                    className={`erd-edge-pill ${isHighlighted ? 'is-highlighted' : ''} ${isConceptual ? 'is-conceptual' : ''}`}
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        opacity,
                        pointerEvents: 'all',
                    }}
                    onMouseEnter={(e) => onEdgeHover?.(relationship, { x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => onEdgeLeave?.()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdgeHover?.(relationship, { x: e.clientX, y: e.clientY });
                    }}
                >
                    {relationship?.cardinality || '1:N'}
                    {isConceptual ? ' • APP' : ''}
                </div>
            </EdgeLabelRenderer>
        </g>
    );
}

export default memo(CustomRelationshipEdge);
