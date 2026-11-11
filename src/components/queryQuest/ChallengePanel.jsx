import React from 'react';
import PixelCard from '../PixelCard';

const DIFFICULTY_LABELS = {
    ROOKIE: 'LVL 1 • QUERY ROOKIE',
    EXPLORER: 'LVL 2 • QUERY EXPLORER',
    MASTER: 'LVL 3 • QUERY MASTER',
};

const ChallengePanel = ({ challenge }) => {
    if (!challenge) return null;

    const diffKey = (challenge.difficulty || 'ROOKIE').toLowerCase();

    return (
        <PixelCard className="qq-challenge-panel">
            <div className="qq-challenge-badges">
                <span className={`qq-diff-badge ${diffKey}`}>
                    {DIFFICULTY_LABELS[challenge.difficulty] || challenge.difficulty}
                </span>
                <span className="qq-topic-badge">{challenge.topic}</span>
                <span className="qq-pts-badge">
                    {challenge.completed
                        ? `EARNED ${challenge.pointsAwarded} / ${challenge.maxPoints} PTS`
                        : `UP TO ${challenge.maxPoints} PTS (5 STD / 10 OPT)`}
                </span>
            </div>

            <h2 className="qq-challenge-title glow-text">{challenge.title}</h2>

            <div className="qq-scenario-box">
                <span className="qq-box-tag">SCENARIO</span>
                <p>{challenge.scenario}</p>
            </div>

            <div className="qq-task-box">
                <span className="qq-box-tag">MISSION OBJECTIVE</span>
                <p>{challenge.description}</p>
            </div>
        </PixelCard>
    );
};

export default ChallengePanel;
