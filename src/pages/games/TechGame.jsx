import React, { useState, useEffect } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import './AptitudeGame.css'; // Reusing aptitude styles as they are identical

const defaultTechQuestions = [
    { q: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Tree", "Graph"], answer: "Stack" },
    { q: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Machine Logic", "Hyper Tabular Markup Language", "None"], answer: "Hyper Text Markup Language" },
    { q: "What is time complexity of Binary Search?", options: ["O(n)", "O(n^2)", "O(log n)", "O(1)"], answer: "O(log n)" },
    { q: "Which is not a relational database?", options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], answer: "MongoDB" },
    { q: "What does API stand for?", options: ["Application Programming Interface", "Advanced Protocol Integrator", "Automated Process Instant", "Application Process Interface"], answer: "Application Programming Interface" }
];

const TechGame = ({ user, setTodayPoints }) => {
    const today = new Date().toISOString().split('T')[0];
    const gameKey = `${user.usn}_${today}_tech`;

    const [questions, setQuestions] = useState(defaultTechQuestions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('start');

    useEffect(() => {
        const adminQ = localStorage.getItem(`techquiz_${today}`);
        if (adminQ) {
            try {
                setQuestions(JSON.parse(adminQ));
            } catch (e) {
                console.error("Failed to parse admin tech questions", e);
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
                    <h2 className="glow-text">TECH QUEST</h2>
                    <p className="message mt-4">You already played Tech Quest today!</p>
                    <PixelButton className="mt-4 cursor-target" onClick={() => window.history.back()}>BACK</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'start') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">TECH QUEST</h2>
                    <p className="mt-4">5 Tech Questions. No Timer.</p>
                    <p className="mb-4">+10 PTS per correct answer.</p>
                    <PixelButton className="start-btn bounce cursor-target" onClick={startGame}>BEGIN QUEST</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'completed') {
        let rank = "JUNIOR DEV";
        if (score === 50) rank = "TECH LEAD";
        else if (score >= 30) rank = "SENIOR DEV";

        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">QUEST COMPLETE</h2>
                    <p className="mt-4 text-large">Score: {score} / 50</p>
                    <p className="mb-4 rank-text glow-text-pink">RANK: {rank}</p>
                    <div className="level-up-container mb-4">
                        <div className="level-up-bar" style={{ width: `${(score / 50) * 100}%` }}></div>
                    </div>
                    <PixelButton className="cursor-target" onClick={() => window.history.back()}>BACK TO GAMES</PixelButton>
                </PixelCard>
                <style>{`
                    .level-up-container { width: 100%; height: 20px; background: #222; border: 2px solid white; position: relative; overflow: hidden; }
                    .level-up-bar { height: 100%; background: var(--accent-yellow); transition: width 1.5s ease-out; }
                `}</style>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <h2 className="glow-text mb-4">TECH QUEST</h2>
            </div>

            <PixelCard className="question-card">
                <div className="question-number">QUESTION {currentIndex + 1}/{questions.length}</div>
                <div className="question-text">{currentQ.q}</div>

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
        </div>
    );
};

export default TechGame;
