import React, { useState, useEffect } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import './AptitudeGame.css'; // Reusing aptitude styles

const defaultFluencyQuestions = [
    { q: "Choose the correct sentence:", options: ["She don't like apples.", "She doesn't likes apples.", "She doesn't like apples.", "She don't likes apples."], answer: "She doesn't like apples." },
    { q: "What is the synonym of 'Abundant'?", options: ["Scarce", "Plentiful", "Rare", "Empty"], answer: "Plentiful" },
    { q: "Identify the adjective: The quick brown fox jumps.", options: ["quick", "fox", "jumps", "The"], answer: "quick" },
    { q: "Choose the correct spelling:", options: ["Accommodate", "Acommodate", "Accomodate", "Acomodate"], answer: "Accommodate" },
    { q: "He has been working here ___ 2015.", options: ["for", "since", "from", "until"], answer: "since" }
];

const EnglishFluencyGame = ({ user, setTodayPoints }) => {
    const today = new Date().toISOString().split('T')[0];
    const gameKey = `${user.usn}_${today}_fluency`;

    const [questions, setQuestions] = useState(defaultFluencyQuestions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('start');

    useEffect(() => {
        const adminQ = localStorage.getItem(`fluencyquiz_${today}`);
        if (adminQ) {
            try {
                setQuestions(JSON.parse(adminQ));
            } catch (e) {
                console.error("Failed to parse admin fluency questions", e);
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
                    <h2 className="glow-text">FLUENCY QUIZ</h2>
                    <p className="message mt-4">You already played the Fluency Quiz today!</p>
                    <PixelButton className="mt-4 cursor-target" onClick={() => window.history.back()}>BACK</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'start') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">ENGLISH FLUENCY</h2>
                    <p className="mt-4">5 Grammar & Vocab Questions.</p>
                    <p className="mb-4">+10 PTS per correct answer.</p>
                    <PixelButton className="start-btn bounce cursor-target" onClick={startGame}>BEGIN QUIZ</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'completed') {
        let rank = "BEGINNER";
        if (score === 50) rank = "NATIVE SPEAKER";
        else if (score >= 30) rank = "INTERMEDIATE";

        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">QUIZ COMPLETE</h2>
                    <p className="mt-4 text-large">Score: {score} / 50</p>
                    <p className="mb-4 rank-text glow-text-pink">RANK: {rank}</p>
                    <div className="level-up-container mb-4">
                        <div className="level-up-bar" style={{ width: `${(score / 50) * 100}%`, backgroundColor: 'var(--accent-purple)' }}></div>
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
                <h2 className="glow-text mb-4">ENGLISH FLUENCY</h2>
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

export default EnglishFluencyGame;
