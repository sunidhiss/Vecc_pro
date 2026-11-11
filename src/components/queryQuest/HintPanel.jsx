import React from 'react';

const HintPanel = ({ revealedHints, hintsUsed, totalHints, onRequestHint, loadingHint }) => {
    if (!totalHints) return null;

    return (
        <div className="qq-hint-panel pixel-border">
            <div className="qq-hint-header">
                <span>💡 HINTS ({hintsUsed}/{totalHints} REVEALED)</span>
                <button
                    type="button"
                    className="qq-hint-btn cursor-target"
                    onClick={onRequestHint}
                    disabled={loadingHint || hintsUsed >= totalHints}
                >
                    {hintsUsed >= totalHints
                        ? 'ALL HINTS SHOWN'
                        : loadingHint
                            ? 'LOADING...'
                            : `REQUEST HINT #${hintsUsed + 1}`}
                </button>
            </div>

            {revealedHints.length > 0 ? (
                <ol className="qq-hint-list">
                    {revealedHints.map((hint, idx) => (
                        <li key={idx} className="qq-hint-item">
                            <strong>Hint {idx + 1}:</strong> {hint}
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="qq-hint-empty">Stuck? Request up to {totalHints} hints without losing your 60-pt daily cap.</p>
            )}
        </div>
    );
};

export default HintPanel;
