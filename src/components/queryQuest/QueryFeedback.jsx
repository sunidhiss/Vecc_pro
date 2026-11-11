import React, { useState } from 'react';
import PixelButton from '../PixelButton';

const QueryFeedback = ({
    executionResult,
    explanation,
    hasNextMission,
    onNextMission,
}) => {
    const [learnMoreOpen, setLearnMoreOpen] = useState(false);

    if (!executionResult && !explanation) return null;

    const isCorrect = Boolean(executionResult?.isCorrect);
    const activeExplanation = executionResult?.explanation || explanation;

    if (executionResult && !isCorrect) {
        const isSqlError = Boolean(executionResult.error);
        return (
            <div className="qq-feedback-card error pixel-border">
                <div className="qq-feedback-head">
                    <span className="qq-feedback-badge error">
                        {isSqlError ? `⚠️ ${String(executionResult.errorCategory || 'SQL ERROR').toUpperCase().replace('_', ' ')}` : '❌ RESULT MISMATCH'}
                    </span>
                </div>
                <p className="qq-feedback-text">
                    {isSqlError
                        ? executionResult.error
                        : executionResult.feedback || 'Your query ran, but the returned dataset does not match the mission requirements yet.'}
                </p>
                <p className="qq-feedback-sub">Adjust your SQL query or request a hint below and try again.</p>
            </div>
        );
    }

    return (
        <div className="qq-feedback-card success pixel-border">
            <div className="qq-feedback-head">
                <span className="qq-feedback-badge success">
                    {executionResult?.isOptimal || (!executionResult && activeExplanation)
                        ? '🌟 MISSION CLEARED!'
                        : '✅ MISSION CLEARED!'}
                </span>
                {executionResult && (
                    <span className="qq-award-chip">
                        {executionResult.alreadyCompleted
                            ? 'ALREADY COMPLETED TODAY'
                            : `+${executionResult.pointsAwarded} PTS ${executionResult.isOptimal ? '(OPTIMAL!)' : '(STANDARD)'}`}
                    </span>
                )}
            </div>

            {executionResult?.feedback && (
                <p className="qq-feedback-text">{executionResult.feedback}</p>
            )}

            {executionResult?.optimalityNotes?.length > 0 && (
                <div className="qq-optimality-tip">
                    <strong>Optimization Tip (earn 10/10 on first solve):</strong>
                    <ul>
                        {executionResult.optimalityNotes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="qq-feedback-actions">
                {activeExplanation && (
                    <button
                        type="button"
                        className="qq-learn-btn cursor-target"
                        onClick={() => setLearnMoreOpen((prev) => !prev)}
                        aria-expanded={learnMoreOpen}
                    >
                        {learnMoreOpen ? '▲ HIDE EXPLANATION' : '📘 LEARN MORE'}
                    </button>
                )}

                {hasNextMission && (
                    <PixelButton type="button" onClick={onNextMission} className="cursor-target">
                        NEXT MISSION →
                    </PixelButton>
                )}
            </div>

            {learnMoreOpen && activeExplanation && (
                <div className="qq-learn-panel">
                    {activeExplanation.concept && (
                        <h4>Concept: {activeExplanation.concept}</h4>
                    )}
                    {activeExplanation.summary && <p>{activeExplanation.summary}</p>}

                    {activeExplanation.syntax && (
                        <div className="qq-learn-block">
                            <strong>Reference SQL:</strong>
                            <pre><code>{activeExplanation.syntax}</code></pre>
                        </div>
                    )}

                    {Array.isArray(activeExplanation.commonMistakes) && activeExplanation.commonMistakes.length > 0 && (
                        <div className="qq-learn-block">
                            <strong>Common Mistakes:</strong>
                            <ul>
                                {activeExplanation.commonMistakes.map((m, idx) => (
                                    <li key={idx}>{m}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {activeExplanation.alternativeQuery && (
                        <div className="qq-learn-block">
                            <strong>Alternative Valid Approach:</strong>
                            <pre><code>{activeExplanation.alternativeQuery}</code></pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QueryFeedback;
