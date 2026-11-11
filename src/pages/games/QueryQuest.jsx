import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import QueryProgress from '../../components/queryQuest/QueryProgress';
import ChallengePanel from '../../components/queryQuest/ChallengePanel';
import DatabaseExplorer from '../../components/queryQuest/DatabaseExplorer';
import SQLEditor from '../../components/queryQuest/SQLEditor';
import QueryResults from '../../components/queryQuest/QueryResults';
import QueryFeedback from '../../components/queryQuest/QueryFeedback';
import HintPanel from '../../components/queryQuest/HintPanel';
import queryQuestApi from '../../services/queryQuestApi';
import api from '../../services/api';
import './QueryQuest.css';

const QueryQuest = ({ user, setTodayPoints }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [challenges, setChallenges] = useState([]);
    const [progress, setProgress] = useState({
        completedCount: 0,
        totalMissions: 6,
        todayPoints: 0,
        maxPoints: 60,
    });
    const [activeIndex, setActiveIndex] = useState(0);
    const [queriesById, setQueriesById] = useState({});
    const [resultsById, setResultsById] = useState({});
    const [executing, setExecuting] = useState(false);
    const [loadingHint, setLoadingHint] = useState(false);
    const [explorerCollapsed, setExplorerCollapsed] = useState(false);

    const loadArena = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const data = await queryQuestApi.getToday();
            const list = data.challenges || [];
            setChallenges(list);
            setProgress(data.progress || {
                completedCount: 0,
                totalMissions: list.length,
                todayPoints: 0,
                maxPoints: 60,
            });

            const initialQueries = {};
            for (const ch of list) {
                initialQueries[ch.id] = ch.starterQuery || 'SELECT *\nFROM table_name;';
            }
            setQueriesById(initialQueries);

            const firstIncomplete = list.findIndex((c) => !c.completed);
            setActiveIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
        } catch (err) {
            console.error('Failed to load Query Quest:', err);
            setLoadError(err.message || 'Failed to load daily SQL missions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadArena();
    }, [loadArena]);

    const activeChallenge = challenges[activeIndex] || null;
    const currentQuery = activeChallenge ? (queriesById[activeChallenge.id] ?? '') : '';
    const currentResult = activeChallenge ? (resultsById[activeChallenge.id] || null) : null;

    const handleQueryChange = (nextSql) => {
        if (!activeChallenge) return;
        setQueriesById((prev) => ({ ...prev, [activeChallenge.id]: nextSql }));
    };

    const handleInsertIdentifier = (identifier) => {
        if (!activeChallenge) return;
        setQueriesById((prev) => {
            const cur = prev[activeChallenge.id] ?? '';
            const needsSpace = cur.length > 0 && !/\s$/.test(cur);
            return {
                ...prev,
                [activeChallenge.id]: `${cur}${needsSpace ? ' ' : ''}${identifier}`,
            };
        });
    };

    const handleResetQuery = async () => {
        if (!activeChallenge) return;
        try {
            const fresh = await queryQuestApi.getChallenge(activeChallenge.id);
            const firstTable = fresh?.challenge?.schemaDefinition?.tables?.[0]?.name || 'table_name';
            setQueriesById((prev) => ({
                ...prev,
                [activeChallenge.id]: `SELECT *\nFROM ${firstTable};`,
            }));
        } catch {
            const firstTable = activeChallenge.schemaDefinition?.tables?.[0]?.name || 'table_name';
            handleQueryChange(`SELECT *\nFROM ${firstTable};`);
        }
    };

    const handleRunQuery = async () => {
        if (!activeChallenge || executing) return;
        setExecuting(true);
        try {
            const res = await queryQuestApi.executeQuery(activeChallenge.id, currentQuery);
            setResultsById((prev) => ({ ...prev, [activeChallenge.id]: res }));

            if (res.isCorrect) {
                setChallenges((prev) =>
                    prev.map((ch) =>
                        ch.id === activeChallenge.id
                            ? {
                                ...ch,
                                completed: true,
                                isOptimal: ch.completed ? ch.isOptimal : res.isOptimal,
                                pointsAwarded: ch.completed ? ch.pointsAwarded : (res.pointsAwarded || ch.pointsAwarded),
                                explanation: res.explanation || ch.explanation,
                            }
                            : ch
                    )
                );

                if (res.pointsAwarded > 0) {
                    setProgress((prev) => ({
                        ...prev,
                        completedCount: Math.min(prev.totalMissions, prev.completedCount + 1),
                        todayPoints: res.totalQqToday ?? (prev.todayPoints + res.pointsAwarded),
                    }));
                    api.getGamesStatus()
                        .then((status) => setTodayPoints(status.todayPoints || 0))
                        .catch(() => {
                            setTodayPoints((prev) => (typeof prev === 'number' ? prev : 0) + res.pointsAwarded);
                        });
                }
            }
        } catch (err) {
            setResultsById((prev) => ({
                ...prev,
                [activeChallenge.id]: {
                    success: false,
                    columns: [],
                    rows: [],
                    rowCount: 0,
                    durationMs: 0,
                    error: err.message || 'Execution failed.',
                    errorCategory: err.data?.errorCategory || 'runtime_error',
                    isCorrect: false,
                },
            }));
        } finally {
            setExecuting(false);
        }
    };

    const handleRequestHint = async () => {
        if (!activeChallenge || loadingHint) return;
        setLoadingHint(true);
        try {
            const data = await queryQuestApi.requestHint(activeChallenge.id);
            setChallenges((prev) =>
                prev.map((ch) =>
                    ch.id === activeChallenge.id
                        ? {
                            ...ch,
                            hintsUsed: data.hintsUsed,
                            revealedHints: data.revealedHints || [],
                        }
                        : ch
                )
            );
        } catch (err) {
            console.error('Hint error:', err);
        } finally {
            setLoadingHint(false);
        }
    };

    if (loading) {
        return (
            <div className="qq-arena">
                <PixelCard className="qq-status-card">
                    <h2 className="glow-text">QUERY QUEST</h2>
                    <p className="mt-4">INITIALIZING POSTGRESQL ARENA...</p>
                </PixelCard>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="qq-arena">
                <PixelCard className="qq-status-card">
                    <h2 className="glow-text">QUERY QUEST</h2>
                    <p className="qq-error-text mt-4">{loadError}</p>
                    <div className="qq-status-actions">
                        <PixelButton onClick={loadArena} className="cursor-target">RETRY</PixelButton>
                        <PixelButton onClick={() => navigate('/games')} className="cursor-target">BACK TO GAMES</PixelButton>
                    </div>
                </PixelCard>
            </div>
        );
    }

    if (challenges.length === 0) {
        return (
            <div className="qq-arena">
                <PixelCard className="qq-status-card">
                    <h2 className="glow-text">QUERY QUEST</h2>
                    <p className="mt-4">No active SQL missions scheduled for today.</p>
                    <PixelButton onClick={() => navigate('/games')} className="mt-4 cursor-target">
                        BACK TO GAMES
                    </PixelButton>
                </PixelCard>
            </div>
        );
    }

    return (
        <div className="qq-arena">
            <header className="qq-top-nav pixel-border">
                <div className="qq-nav-left">
                    <PixelButton
                        type="button"
                        onClick={() => navigate('/games')}
                        className="qq-back-btn cursor-target"
                        aria-label="Back to Games Hub"
                    >
                        ← GAMES
                    </PixelButton>
                    <div className="qq-brand">
                        <h1 className="glow-text">QUERY QUEST</h1>
                        <span className="qq-tagline">Think in Queries. Conquer the Database.</span>
                    </div>
                </div>

                <div className="qq-nav-right">
                    <span className="user-badge">{user?.usn}</span>
                    <span className="qq-nav-score glow-text-pink">
                        {progress.todayPoints} / {progress.maxPoints} QQ PTS
                    </span>
                </div>
            </header>

            <QueryProgress
                challenges={challenges}
                activeIndex={activeIndex}
                onSelectMission={(idx) => setActiveIndex(idx)}
                progress={progress}
            />

            {activeChallenge && (
                <div className={`qq-workspace ${explorerCollapsed ? 'explorer-collapsed' : ''}`}>
                    <DatabaseExplorer
                        key={activeChallenge.id}
                        schemaDefinition={activeChallenge.schemaDefinition}
                        sampleData={activeChallenge.sampleData}
                        onInsertIdentifier={handleInsertIdentifier}
                        isCollapsed={explorerCollapsed}
                        onToggleCollapse={() => setExplorerCollapsed((prev) => !prev)}
                    />

                    <main className="qq-main-column">
                        <ChallengePanel challenge={activeChallenge} />

                        <SQLEditor
                            value={currentQuery}
                            onChange={handleQueryChange}
                            onRun={handleRunQuery}
                            onReset={handleResetQuery}
                            schemaDefinition={activeChallenge.schemaDefinition}
                            executing={executing}
                        />

                        <QueryFeedback
                            executionResult={currentResult}
                            explanation={activeChallenge.completed ? activeChallenge.explanation : null}
                            hasNextMission={activeIndex < challenges.length - 1}
                            onNextMission={() => setActiveIndex((prev) => Math.min(challenges.length - 1, prev + 1))}
                        />

                        <QueryResults
                            executionResult={currentResult}
                            schemaDefinition={activeChallenge.schemaDefinition}
                        />

                        <HintPanel
                            revealedHints={activeChallenge.revealedHints || []}
                            hintsUsed={activeChallenge.hintsUsed || 0}
                            totalHints={activeChallenge.totalHints || 0}
                            onRequestHint={handleRequestHint}
                            loadingHint={loadingHint}
                        />
                    </main>
                </div>
            )}
        </div>
    );
};

export default QueryQuest;
