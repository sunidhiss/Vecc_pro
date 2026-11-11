import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Background,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
    SCHEMA_ENTITIES,
    SCHEMA_RELATIONSHIPS,
} from '../data/databaseSchema';
import CustomEntityNode from '../components/databaseSchema/CustomEntityNode';
import CustomRelationshipEdge from '../components/databaseSchema/CustomRelationshipEdge';
import SchemaLegend from '../components/databaseSchema/SchemaLegend';
import SchemaToolbar from '../components/databaseSchema/SchemaToolbar';
import './DatabaseSchema.css';

const nodeTypes = {
    erdEntity: CustomEntityNode,
};

const edgeTypes = {
    erdRelation: CustomRelationshipEdge,
};

function getDirectionalCardinalityText(rel, currentEntityId) {
    if (rel.cardinality === '1:1') return 'One-to-One';
    if (rel.cardinality === 'M:N') return 'Many-to-Many';
    if (rel.source === currentEntityId) return 'One-to-Many';
    return 'Many-to-One';
}

function computePopupPosition(rect, popupWidth = 355, popupHeight = 365) {
    const pad = 16;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    // On mobile / narrow viewports, place cleanly below or centered horizontally
    if (vw < 640) {
        const clampedWidth = Math.min(popupWidth, vw - pad * 2);
        const left = Math.max(pad, Math.min(vw - clampedWidth - pad, rect.left + rect.width / 2 - clampedWidth / 2));
        let top = rect.bottom + 12;
        if (top + popupHeight > vh - pad) {
            top = Math.max(pad, rect.top - popupHeight - 12);
        }
        return { left, top };
    }

    // Prefer right side if space permits, then left, then below/above
    let left = rect.right + 14;
    if (left + popupWidth > vw - pad) {
        left = rect.left - popupWidth - 14;
    }
    if (left < pad) {
        left = Math.max(pad, Math.min(vw - popupWidth - pad, rect.left + (rect.width - popupWidth) / 2));
    }

    let top = rect.top - 8;
    if (top + popupHeight > vh - pad) {
        top = Math.max(pad, vh - popupHeight - pad);
    }
    if (top < pad) {
        top = pad;
    }

    return { left, top };
}

function computeEdgeTooltipPosition(point, tooltipWidth = 310, tooltipHeight = 155) {
    const pad = 16;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    let left = point.x + 14;
    if (left + tooltipWidth > vw - pad) {
        left = Math.max(pad, point.x - tooltipWidth - 14);
    }

    let top = point.y - 20;
    if (top + tooltipHeight > vh - pad) {
        top = Math.max(pad, vh - tooltipHeight - pad);
    }
    if (top < pad) {
        top = pad;
    }

    return { left, top };
}

function DatabaseSchemaCanvas() {
    const { fitView, zoomIn, zoomOut, setCenter, getNode } = useReactFlow();

    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.body.classList.contains('dark')
    );
    const [activeGroup, setActiveGroup] = useState('all');
    const [hoveredEntityId, setHoveredEntityId] = useState(null);
    const [pinnedEntityId, setPinnedEntityId] = useState(null);
    const [popupState, setPopupState] = useState(null);
    const [hoveredEdgeState, setHoveredEdgeState] = useState(null);

    const hoverTimerRef = useRef(null);
    const popupRef = useRef(null);
    const pinnedEntityRef = useRef(null);

    useEffect(() => {
        pinnedEntityRef.current = pinnedEntityId;
    }, [pinnedEntityId]);

    const entityMap = useMemo(() => {
        const map = {};
        for (const entity of SCHEMA_ENTITIES) {
            map[entity.id] = entity;
        }
        return map;
    }, []);

    // Sync with existing Pixel Quest Navbar light/dark theme toggle
    useEffect(() => {
        const syncTheme = () => {
            setIsDark(document.body.classList.contains('dark'));
        };
        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Escape key closes active popups & clears pinned selection
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setPopupState(null);
                setHoveredEdgeState(null);
                setHoveredEntityId(null);
                setPinnedEntityId(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Clicking outside entities and outside the popover closes any pinned popup
    useEffect(() => {
        const onDocClick = (e) => {
            if (!pinnedEntityRef.current) return;
            const clickedInPopup = popupRef.current && popupRef.current.contains(e.target);
            const clickedEntity = e.target.closest?.('.erd-entity-node');
            const clickedToolbar = e.target.closest?.('.erd-toolbar');
            if (!clickedInPopup && !clickedEntity && !clickedToolbar) {
                setPinnedEntityId(null);
                setPopupState(null);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    // Measure rendered popover dimensions and keep it strictly clamped inside viewport
    useLayoutEffect(() => {
        const el = popupRef.current;
        if (!el || !popupState) return;
        const pad = 16;
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let nextLeft = popupState.left;
        let nextTop = popupState.top;

        if (rect.right > vw - pad) {
            nextLeft = Math.max(pad, vw - rect.width - pad);
        }
        if (rect.bottom > vh - pad) {
            nextTop = Math.max(pad, vh - rect.height - pad);
        }
        if (nextLeft < pad) nextLeft = pad;
        if (nextTop < pad) nextTop = pad;

        if (nextLeft !== popupState.left || nextTop !== popupState.top) {
            setPopupState((prev) => (prev ? { ...prev, left: nextLeft, top: nextTop } : prev));
        }
    }, [popupState]);

    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, []);

    const cancelHoverClear = useCallback(() => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    }, []);

    const positionPopupFromNodeId = useCallback((entityId) => {
        const domEl = document.querySelector(`.react-flow__node[data-id="${entityId}"] .erd-entity-node`);
        if (domEl) {
            const rect = domEl.getBoundingClientRect();
            const entity = entityMap[entityId];
            const estHeight = Math.min(430, 155 + (entity?.columns.length || 4) * 26);
            setPopupState({ entityId, ...computePopupPosition(rect, 355, estHeight) });
        }
    }, [entityMap]);

    const handleHoverStart = useCallback(
        (entityId, domEl) => {
            cancelHoverClear();
            setHoveredEdgeState(null);
            setHoveredEntityId(entityId);

            // If another entity is pinned, keep pinned popup intact until user clicks or unpins
            if (pinnedEntityRef.current && pinnedEntityRef.current !== entityId) {
                return;
            }

            if (domEl) {
                const rect = domEl.getBoundingClientRect();
                const entity = entityMap[entityId];
                const estHeight = Math.min(430, 155 + (entity?.columns.length || 4) * 26);
                setPopupState({ entityId, ...computePopupPosition(rect, 355, estHeight) });
            }
        },
        [cancelHoverClear, entityMap]
    );

    const handleHoverEnd = useCallback(
        (entityId) => {
            cancelHoverClear();
            hoverTimerRef.current = setTimeout(() => {
                setHoveredEntityId((prev) => (prev === entityId ? null : prev));
                // Do not auto-close if entity is pinned
                if (pinnedEntityRef.current === entityId) return;
                if (!pinnedEntityRef.current) {
                    setPopupState((prev) => (prev?.entityId === entityId ? null : prev));
                }
            }, 120);
        },
        [cancelHoverClear]
    );

    const handleEntityClick = useCallback(
        (entityId, domEl) => {
            cancelHoverClear();
            setHoveredEdgeState(null);

            if (pinnedEntityRef.current === entityId) {
                setPinnedEntityId(null);
                setPopupState(null);
                return;
            }

            setPinnedEntityId(entityId);
            if (domEl) {
                const rect = domEl.getBoundingClientRect();
                const entity = entityMap[entityId];
                const estHeight = Math.min(430, 155 + (entity?.columns.length || 4) * 26);
                setPopupState({ entityId, ...computePopupPosition(rect, 355, estHeight) });
            } else {
                positionPopupFromNodeId(entityId);
            }
        },
        [cancelHoverClear, entityMap, positionPopupFromNodeId]
    );

    const handleKeyboardActivate = useCallback(
        (entityId, domEl) => {
            handleEntityClick(entityId, domEl);
        },
        [handleEntityClick]
    );

    const handleEdgeHover = useCallback(
        (relationship, point) => {
            cancelHoverClear();
            if (!pinnedEntityRef.current) {
                setHoveredEntityId(null);
                setPopupState(null);
            }
            const pos = computeEdgeTooltipPosition(point);
            setHoveredEdgeState({ relationship, ...pos });
        },
        [cancelHoverClear]
    );

    const handleEdgeLeave = useCallback(() => {
        setHoveredEdgeState(null);
    }, []);

    // Priority entity driving highlight state: pinned takes precedence if active alongside non-stealing hover, or active hover when unpinned
    const activeEntityId = pinnedEntityId || hoveredEntityId;

    const connectedInfo = useMemo(() => {
        const edgeIds = new Set();
        const peerIds = new Set();
        if (!activeEntityId) return { edgeIds, peerIds };

        peerIds.add(activeEntityId);
        for (const rel of SCHEMA_RELATIONSHIPS) {
            if (rel.source === activeEntityId || rel.target === activeEntityId) {
                edgeIds.add(rel.id);
                peerIds.add(rel.source);
                peerIds.add(rel.target);
            }
        }
        return { edgeIds, peerIds };
    }, [activeEntityId]);

    const buildInitialNodes = useCallback(
        () =>
            SCHEMA_ENTITIES.map((entity) => ({
                id: entity.id,
                type: 'erdEntity',
                position: { ...entity.position },
                data: {
                    entity,
                    isHovered: false,
                    isPinned: false,
                    isRelated: false,
                    isDimmed: false,
                    onHoverStart: handleHoverStart,
                    onHoverEnd: handleHoverEnd,
                    onEntityClick: handleEntityClick,
                    onKeyboardActivate: handleKeyboardActivate,
                },
            })),
        [handleEntityClick, handleHoverEnd, handleHoverStart, handleKeyboardActivate]
    );

    const buildInitialEdges = useCallback(
        () =>
            SCHEMA_RELATIONSHIPS.map((rel) => ({
                id: rel.id,
                source: rel.source,
                target: rel.target,
                sourceHandle: rel.sourceHandle,
                targetHandle: rel.targetHandle,
                type: 'erdRelation',
                data: {
                    relationship: rel,
                    isHighlighted: false,
                    isDimmed: false,
                    onEdgeHover: handleEdgeHover,
                    onEdgeLeave: handleEdgeLeave,
                },
            })),
        [handleEdgeHover, handleEdgeLeave]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges);

    // Sync interaction, hover, pin, and group filter state onto nodes & edges
    useEffect(() => {
        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                const entity = entityMap[node.id];
                const matchesGroup = activeGroup === 'all' || entity?.group === activeGroup;
                const isPinned = pinnedEntityId === node.id;
                const isHovered = hoveredEntityId === node.id;
                const isRelated = Boolean(
                    activeEntityId && connectedInfo.peerIds.has(node.id) && !isHovered && !isPinned
                );

                const dimmedBySelection = Boolean(activeEntityId && !connectedInfo.peerIds.has(node.id));
                const dimmedByGroup = !matchesGroup;
                const isDimmed = dimmedByGroup || dimmedBySelection;

                return {
                    ...node,
                    selected: isPinned,
                    zIndex: isHovered || isPinned ? 20 : isRelated ? 10 : 1,
                    data: {
                        ...node.data,
                        entity,
                        isHovered,
                        isPinned,
                        isRelated,
                        isDimmed,
                        onHoverStart: handleHoverStart,
                        onHoverEnd: handleHoverEnd,
                        onEntityClick: handleEntityClick,
                        onKeyboardActivate: handleKeyboardActivate,
                    },
                };
            })
        );
    }, [
        activeEntityId,
        activeGroup,
        connectedInfo,
        entityMap,
        handleEntityClick,
        handleHoverEnd,
        handleHoverStart,
        handleKeyboardActivate,
        hoveredEntityId,
        pinnedEntityId,
        setNodes,
    ]);

    useEffect(() => {
        setEdges((prevEdges) =>
            prevEdges.map((edge) => {
                const rel = SCHEMA_RELATIONSHIPS.find((r) => r.id === edge.id);
                const srcGroup = entityMap[rel?.source]?.group;
                const tgtGroup = entityMap[rel?.target]?.group;
                const groupVisible =
                    activeGroup === 'all' || srcGroup === activeGroup || tgtGroup === activeGroup;

                const isHighlighted =
                    hoveredEdgeState?.relationship?.id === edge.id ||
                    Boolean(activeEntityId && connectedInfo.edgeIds.has(edge.id));

                const isDimmed =
                    !groupVisible ||
                    Boolean(activeEntityId && !connectedInfo.edgeIds.has(edge.id));

                return {
                    ...edge,
                    zIndex: isHighlighted ? 15 : 0,
                    data: {
                        ...edge.data,
                        relationship: rel,
                        isHighlighted,
                        isDimmed,
                        onEdgeHover: handleEdgeHover,
                        onEdgeLeave: handleEdgeLeave,
                    },
                };
            })
        );
    }, [
        activeEntityId,
        activeGroup,
        connectedInfo,
        entityMap,
        handleEdgeHover,
        handleEdgeLeave,
        hoveredEdgeState,
        setEdges,
    ]);

    const handleSelectAndPinEntity = useCallback(
        (entityId) => {
            setHoveredEdgeState(null);
            setActiveGroup('all');
            setPinnedEntityId(entityId);
            setHoveredEntityId(null);

            const rfNode = getNode(entityId);
            const fallback = entityMap[entityId]?.position;
            const pos = rfNode?.position || fallback;
            if (pos) {
                const width = rfNode?.measured?.width || 240;
                const height = rfNode?.measured?.height || 54;
                setCenter(pos.x + width / 2, pos.y + height / 2, { zoom: 1, duration: 360 });
            }

            setTimeout(() => {
                positionPopupFromNodeId(entityId);
            }, 390);
        },
        [entityMap, getNode, positionPopupFromNodeId, setCenter]
    );

    const handleResetLayout = useCallback(() => {
        setActiveGroup('all');
        setHoveredEntityId(null);
        setPinnedEntityId(null);
        setPopupState(null);
        setHoveredEdgeState(null);
        setNodes(buildInitialNodes());
        setTimeout(() => {
            fitView({ padding: 0.16, duration: 350 });
        }, 40);
    }, [buildInitialNodes, fitView, setNodes]);

    const handlePaneClick = useCallback(() => {
        setPopupState(null);
        setHoveredEdgeState(null);
        setHoveredEntityId(null);
        setPinnedEntityId(null);
    }, []);

    const activePopupEntityId = popupState?.entityId || pinnedEntityId;
    const popupEntity = activePopupEntityId ? entityMap[activePopupEntityId] : null;
    const isPopupPinned = Boolean(popupEntity && pinnedEntityId === popupEntity.id);

    const popupRelationships = useMemo(() => {
        if (!popupEntity) return [];
        return SCHEMA_RELATIONSHIPS.filter(
            (rel) => rel.source === popupEntity.id || rel.target === popupEntity.id
        );
    }, [popupEntity]);

    const enforcedCount = useMemo(
        () => SCHEMA_RELATIONSHIPS.filter((r) => r.enforced).length,
        []
    );
    const conceptualCount = useMemo(
        () => SCHEMA_RELATIONSHIPS.filter((r) => !r.enforced).length,
        []
    );

    return (
        <div className={`erd-page-shell ${isDark ? 'erd-dark' : ''}`}>
            <header className="erd-page-header">
                <div className="erd-header-badge">SCHEMA v1.0 • POSTGRESQL (SUPABASE)</div>
                <h1 className="erd-page-title">PIXEL QUEST — DATABASE ARCHITECTURE</h1>
                <p className="erd-page-subtitle">
                    Explore the structure powering the Pixel Quest universe.
                </p>
            </header>

            <SchemaToolbar
                entities={SCHEMA_ENTITIES}
                activeGroup={activeGroup}
                onChangeGroup={(grp) => {
                    setActiveGroup(grp);
                    setPinnedEntityId(null);
                    setHoveredEntityId(null);
                    setPopupState(null);
                }}
                onSelectSearchResult={handleSelectAndPinEntity}
                onZoomIn={() => zoomIn({ duration: 200 })}
                onZoomOut={() => zoomOut({ duration: 200 })}
                onFitView={() => fitView({ padding: 0.16, duration: 350 })}
                onResetLayout={handleResetLayout}
            />

            <div className="erd-workspace">
                <div
                    className="erd-canvas-frame pixel-border"
                    role="region"
                    aria-label="Minimal Interactive Entity Relationship Diagram"
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        colorMode={isDark ? 'dark' : 'light'}
                        fitView
                        fitViewOptions={{ padding: 0.16 }}
                        minZoom={0.4}
                        maxZoom={1.8}
                        nodesConnectable={false}
                        elementsSelectable
                        panOnScroll
                        zoomOnDoubleClick={false}
                        onPaneClick={handlePaneClick}
                        onMove={() => {
                            if (pinnedEntityRef.current) {
                                positionPopupFromNodeId(pinnedEntityRef.current);
                            }
                        }}
                        onMoveStart={() => {
                            setHoveredEdgeState(null);
                            if (!pinnedEntityRef.current) {
                                setPopupState(null);
                            }
                        }}
                    >
                        <Background
                            variant="dots"
                            gap={22}
                            size={1.6}
                            color={isDark ? 'rgba(34, 211, 238, 0.22)' : 'rgba(74, 74, 106, 0.28)'}
                        />
                    </ReactFlow>

                    <div className="erd-canvas-hint">
                        Hover entity for attributes • Click/tap to pin • Drag to pan
                    </div>
                </div>
            </div>

            <SchemaLegend
                entityCount={SCHEMA_ENTITIES.length}
                enforcedCount={enforcedCount}
                conceptualCount={conceptualCount}
            />

            <footer className="erd-page-footer">
                <span className="erd-footer-title">PIXEL QUEST DATABASE ARCHITECTURE</span>
                <span className="erd-footer-sep">•</span>
                <span className="erd-footer-tagline">Designed to make data relationships visible.</span>
            </footer>

            {/* Floating Attribute & Relationship Popover (hover OR pinned click/tap) */}
            {popupEntity && popupState && (
                <div
                    ref={popupRef}
                    className={`erd-hover-popup pixel-border ${isPopupPinned ? 'is-pinned' : ''}`}
                    role="dialog"
                    aria-label={`${popupEntity.displayName} attributes and relationships`}
                    style={{ left: `${popupState.left}px`, top: `${popupState.top}px` }}
                    onMouseEnter={cancelHoverClear}
                    onMouseLeave={() => {
                        if (!isPopupPinned) {
                            handleHoverEnd(popupEntity.id);
                        }
                    }}
                >
                    <div className="erd-popup-header">
                        <div className="erd-popup-title-row">
                            <div className="erd-popup-title">
                                <span>{popupEntity.icon}</span>
                                <span>{popupEntity.displayName}</span>
                            </div>
                            {isPopupPinned && (
                                <div className="erd-popup-pin-actions">
                                    <span className="erd-pinned-pill">PINNED</span>
                                    <button
                                        type="button"
                                        className="erd-popup-close cursor-target"
                                        aria-label="Close pinned attributes popup"
                                        onClick={() => {
                                            setPinnedEntityId(null);
                                            setPopupState(null);
                                            setHoveredEntityId(null);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="erd-popup-section-label">
                        ATTRIBUTES ({popupEntity.columns.length})
                    </div>
                    <div className="erd-popup-attrs">
                        {popupEntity.columns.map((col) => (
                            <div key={col.name} className="erd-popup-attr-row">
                                <span className="erd-popup-attr-badges">
                                    {col.primaryKey && <span className="erd-key-badge erd-badge-pk">PK</span>}
                                    {col.foreignKey && <span className="erd-key-badge erd-badge-fk">FK</span>}
                                    {col.unique && !col.primaryKey && <span className="erd-key-badge erd-badge-uq">UQ</span>}
                                    {col.nullable === false && !col.primaryKey && (
                                        <span className="erd-key-badge erd-badge-nn">NN</span>
                                    )}
                                </span>
                                <span className="erd-popup-attr-name" title={col.description || col.name}>
                                    {col.name}
                                    {col.restricted ? ' 🔒' : ''}
                                </span>
                                <span className="erd-popup-attr-type">{col.type}</span>
                            </div>
                        ))}
                    </div>

                    <div className="erd-popup-section-label">
                        RELATIONSHIPS ({popupRelationships.length})
                    </div>
                    <div className="erd-popup-rels">
                        {popupRelationships.map((rel) => {
                            const peerId = rel.source === popupEntity.id ? rel.target : rel.source;
                            const peer = entityMap[peerId];
                            const dirText = getDirectionalCardinalityText(rel, popupEntity.id);
                            return (
                                <button
                                    key={rel.id}
                                    type="button"
                                    className="erd-popup-rel-row erd-popup-rel-btn cursor-target"
                                    onClick={() => handleSelectAndPinEntity(peerId)}
                                    title={`Jump to ${peer?.displayName || peerId}`}
                                >
                                    <span className="erd-popup-rel-peer">
                                        {peer?.displayName || peerId} — {dirText}
                                    </span>
                                    <span className={`erd-rel-kind ${rel.enforced ? 'is-enforced' : 'is-conceptual'}`}>
                                        {rel.enforced ? 'FK' : 'APP'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Viewport-clamped Relationship Hover Tooltip */}
            {hoveredEdgeState?.relationship && (
                <div
                    className="erd-rel-tooltip pixel-border"
                    role="tooltip"
                    style={{ left: `${hoveredEdgeState.left}px`, top: `${hoveredEdgeState.top}px` }}
                >
                    <div className="erd-rel-tooltip-head">
                        <span className="erd-rel-tooltip-title">
                            {entityMap[hoveredEdgeState.relationship.source]?.displayName} →{' '}
                            {entityMap[hoveredEdgeState.relationship.target]?.displayName}
                        </span>
                        <span
                            className={`erd-rel-kind ${
                                hoveredEdgeState.relationship.enforced ? 'is-enforced' : 'is-conceptual'
                            }`}
                        >
                            {hoveredEdgeState.relationship.cardinalityLabel} •{' '}
                            {hoveredEdgeState.relationship.enforced ? 'ENFORCED FK' : 'CONCEPTUAL'}
                        </span>
                    </div>
                    <div className="erd-rel-tooltip-fk">
                        {hoveredEdgeState.relationship.foreignKeyLabel}
                    </div>
                    <p className="erd-rel-tooltip-desc">
                        {hoveredEdgeState.relationship.description}
                    </p>
                </div>
            )}
        </div>
    );
}

const DatabaseSchema = () => {
    return (
        <ReactFlowProvider>
            <DatabaseSchemaCanvas />
        </ReactFlowProvider>
    );
};

export default DatabaseSchema;
