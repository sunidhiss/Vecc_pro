import React, { useState, useEffect } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import './AptitudeGame.css'; // Reusing aptitude styles

const defaultOutputQuestions = [
    { q: "What is the output of this JS code?", code: "console.log(typeof null);", options: ["undefined", "object", "null", "string"], answer: "object" },
    { q: "Find the output of the Python snippet:", code: "print(2 ** 3 ** 2)", options: ["64", "512", "72", "None"], answer: "512" },
    { q: "What is the output in JavaScript?", code: "console.log('1' + 1 - 1);", options: ["11", "10", "NaN", "0"], answer: "10" },
    { q: "Evaluate this C++ snippet:", code: "int x = 5;\ncout << x++ + ++x;", options: ["10", "11", "12", "compiler error"], answer: "12" },
    { q: "What does this output?", code: "console.log([] == ![]);", options: ["true", "false", "TypeError", "undefined"], answer: "true" }
];

const GuessOutputGame = ({ user, setTodayPoints }) => {
    const today = new Date().toISOString().split('T')[0];
    const gameKey = `${user.usn}_${today}_guess_output`;

    const [questions, setQuestions] = useState(defaultOutputQuestions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('start');

    useEffect(() => {
        const adminQ = localStorage.getItem(`outputquiz_${today}`);
        if (adminQ) {
            try {
                setQuestions(JSON.parse(adminQ));
            } catch (e) {
                console.error("Failed to parse admin output questions", e);
            }
        }

        const status = localStorage.getItem(gameKey);
        if (status) {
            setGameState('already_played');
        }
    }, [today, gameKey]);

    const startGame = () => setGameState('playing');

    const handleAnswer = (option) => {
        let newScore = score;
        if (option === questions[currentIndex].answer) {
            newScore += 10;
        }

        if (currentIndex < questions.length - 1) {
            setScore(newScore);
            setCurrentIndex(currentIndex + 1);
        } else {
            endGame(newScore);
        }
    };

    const endGame = (finalScore) => {
        setScore(finalScore);
        setGameState('completed');

        localStorage.setItem(gameKey, 'completed');
        const allPoints = JSON.parse(localStorage.getItem('pq_points')) || {};
        const userPoints = allPoints[user.usn] || {};
        const currentPoints = userPoints[today] || 0;

        userPoints[today] = currentPoints + finalScore;
        allPoints[user.usn] = userPoints;

        localStorage.setItem('pq_points', JSON.stringify(allPoints));
        setTodayPoints(userPoints[today]);
    };

    if (gameState === 'already_played') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">GUESS OUTPUT</h2>
                    <p className="message mt-4">You already played Guess Output today!</p>
                    <PixelButton className="mt-4 cursor-target" onClick={() => window.history.back()}>BACK</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'start') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">GUESS OUTPUT</h2>
                    <p className="mt-4">5 Code Snippets. Guess the correct output.</p>
                    <p className="mb-4">+10 PTS per correct answer.</p>
                    <PixelButton className="start-btn bounce cursor-target" onClick={startGame}>BEGIN QUEST</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'completed') {
        let rank = "DEBUGGER";
        if (score === 50) rank = "COMPILER LEVEL";
        else if (score >= 30) rank = "INSPECTOR";

        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">TEST COMPLETE</h2>
                    <p className="mt-4 text-large">Score: {score} / 50</p>
                    <p className="mb-4 rank-text glow-text-pink">RANK: {rank}</p>
                    <div className="level-up-container mb-4">
                        <div className="level-up-bar" style={{ width: `${(score / 50) * 100}%`, backgroundColor: 'var(--accent-teal)' }}></div>
                    </div>
                    <PixelButton className="cursor-target" onClick={() => window.history.back()}>BACK TO GAMES</PixelButton>
                </PixelCard>
                <style>{`
                    .level-up-container { width: 100%; height: 20px; background: var(--panel-bg); border: 3px solid var(--pixel-border-color); position: relative; overflow: hidden; }
                    .level-up-bar { height: 100%; transition: width 1.5s ease-out; }
                `}</style>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <h2 className="glow-text mb-4">GUESS OUTPUT</h2>
            </div>

            <PixelCard className="question-card">
                <div className="question-number">QUESTION {currentIndex + 1}/{questions.length}</div>
                <div className="question-text">{currentQ.q}</div>

                {currentQ.code && (
                    <div className="code-block pixel-border mb-4 pt-2">
                        <pre><code>{currentQ.code}</code></pre>
                    </div>
                )}

                <div className="options-grid">
                    {currentQ.options.map((opt, i) => (
                        <button
                            key={i}
                            className="option-btn pixel-border cursor-target"
                            onClick={() => handleAnswer(opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </PixelCard>
            <style>{`
                .code-block {
                    background-color: var(--panel-bg);
                    border: 4px solid var(--accent-purple);
                    padding: 1rem;
                    text-align: left;
                    font-family: var(--font-body); /* Or use a generic monospace if vt323 is too hard to read */
                    font-size: 1.5rem;
                    color: var(--text-main);
                    overflow-x: auto;
                    margin-bottom: 2rem;
                }
            `}</style>
        </div>
    );
};

export default GuessOutputGame;
