import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const HANDLE_STYLE = { opacity: 0, width: 8, height: 8, pointerEvents: 'none' };

function CustomEntityNode({ data, selected }) {
    const {
        entity,
        isHovered,
        isPinned,
        isRelated,
        isDimmed,
        onHoverStart,
        onHoverEnd,
        onEntityClick,
        onKeyboardActivate,
    } = data;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onKeyboardActivate?.(entity.id, e.currentTarget);
        }
    };

    const classNames = [
        'erd-entity-node',
        `erd-group-${entity.group}`,
        entity.isCentral ? 'erd-entity-central' : '',
        selected || isPinned ? 'is-selected is-pinned' : '',
        isHovered ? 'is-hovered' : '',
        isRelated ? 'is-related' : '',
        isDimmed ? 'is-dimmed' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classNames}
            tabIndex={0}
            role="button"
            aria-label={`${entity.displayName} table (${entity.columns.length} attributes). Hover or press Enter to inspect attributes.`}
            aria-expanded={Boolean(isHovered || isPinned)}
            onMouseEnter={(e) => onHoverStart?.(entity.id, e.currentTarget)}
            onMouseLeave={() => onHoverEnd?.(entity.id)}
            onFocus={(e) => onHoverStart?.(entity.id, e.currentTarget)}
            onBlur={() => onHoverEnd?.(entity.id)}
            onClick={(e) => {
                e.stopPropagation();
                onEntityClick?.(entity.id, e.currentTarget);
            }}
            onKeyDown={handleKeyDown}
        >
            {/* Unambiguous source/target handles for non-overlapping orthogonal ERD connectors */}
            <Handle id="tgt-top" type="target" position={Position.Top} style={HANDLE_STYLE} />
            <Handle id="src-top" type="source" position={Position.Top} style={HANDLE_STYLE} />
            <Handle id="src-top-left" type="source" position={Position.Top} style={{ ...HANDLE_STYLE, left: '24%' }} />
            <Handle id="src-top-right" type="source" position={Position.Top} style={{ ...HANDLE_STYLE, left: '76%' }} />
            <Handle id="tgt-left" type="target" position={Position.Left} style={HANDLE_STYLE} />
            <Handle id="src-right" type="source" position={Position.Right} style={HANDLE_STYLE} />
            <Handle id="tgt-bottom" type="target" position={Position.Bottom} style={HANDLE_STYLE} />
            <Handle id="src-bottom-left" type="source" position={Position.Bottom} style={{ ...HANDLE_STYLE, left: '24%' }} />
            <Handle id="src-bottom-right" type="source" position={Position.Bottom} style={{ ...HANDLE_STYLE, left: '76%' }} />

            <div className="erd-entity-compact-body">
                <span className="erd-entity-icon" aria-hidden="true">{entity.icon}</span>
                <span className="erd-entity-name">{entity.displayName}</span>
            </div>
        </div>
    );
}

export default memo(CustomEntityNode);
