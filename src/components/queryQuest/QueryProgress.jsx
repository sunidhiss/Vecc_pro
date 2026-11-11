import React from 'react';

const QueryProgress = ({ challenges, activeIndex, onSelectMission, progress }) => {
    const completedCount = progress?.completedCount ?? 0;
    const totalMissions = progress?.totalMissions ?? challenges.length;
    const todayPoints = progress?.todayPoints ?? 0;
    const maxPoints = progress?.maxPoints ?? 60;
    const pct = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

    return (
        <div className="qq-progress-bar pixel-border">
            <div className="qq-progress-top">
                <div className="qq-progress-summary">
                    <span className="qq-progress-label">DAILY MISSIONS:</span>
                    <span className="qq-progress-count">{completedCount}/{totalMissions} COMPLETED</span>
                </div>
                <div className="qq-progress-score">
                    <span>QQ SCORE: </span>
                    <strong className="glow-text-pink">{todayPoints} / {maxPoints} PTS</strong>
                </div>
            </div>

            <div className="qq-progress-track" aria-label={`Mission progress ${completedCount} of ${totalMissions}`}>
                <div className="qq-progress-fill" style={{ width: `${pct}%` }} />
            </div>

            <div className="qq-mission-pills" role="tablist" aria-label="Daily SQL Missions">
                {challenges.map((ch, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                        <button
                            key={ch.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onSelectMission(idx)}
                            className={`qq-mission-pill cursor-target ${isActive ? 'active' : ''} ${ch.completed ? 'completed' : ''}`}
                        >
                            <span>M{String(ch.missionOrder || idx + 1).padStart(2, '0')}</span>
                            <span className="qq-pill-status">
                                {ch.completed ? (ch.isOptimal ? '★10' : '✓5') : ch.difficulty.slice(0, 3)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QueryProgress;
