import React, { useState, useEffect } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import './AptitudeGame.css';

const defaultQuestions = [
    { q: "What is 15% of 200?", options: ["20", "30", "40", "50"], answer: "30" },
    { q: "If A is faster than B, and B is faster than C. Is A faster than C?", options: ["Yes", "No", "Maybe", "Can't say"], answer: "Yes" },
    { q: "A train 120m long passes a pole in 6s. Find its speed in m/s.", options: ["10", "15", "20", "25"], answer: "20" },
    { q: "What is the next number in the series: 2, 6, 12, 20, ... ?", options: ["24", "28", "30", "32"], answer: "30" },
    { q: "Probability of getting a head when tossing a coin?", options: ["0.25", "0.5", "0.75", "1"], answer: "0.5" }
];

const AptitudeGame = ({ user, setTodayPoints }) => {
    const today = new Date().toISOString().split('T')[0];
    const gameKey = `${user.usn}_${today}_aptitude`;

    const [questions, setQuestions] = useState(defaultQuestions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState('start'); // start, playing, completed // completed indicates finished either today or just now

    useEffect(() => {
        const adminQ = localStorage.getItem(`aptitude_${today}`);
        if (adminQ) {
            try {
                setQuestions(JSON.parse(adminQ));
            } catch (e) {
                console.error("Failed to parse admin aptitude questions", e);
            }
        }

        const status = localStorage.getItem(gameKey);
        if (status) {
            setGameState('already_played');
        }
    }, [today, gameKey]);

    useEffect(() => {
        let timer;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (gameState === 'playing' && timeLeft === 0) {
            endGame();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    const startGame = () => setGameState('playing');

    const handleAnswer = (option) => {
        let newScore = score;
        if (option === questions[currentIndex].answer) {
            newScore += 10;
            setScore(newScore);
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // we use a functional update and call endGame outside because state is async
            endGame(newScore);
        }
    };

    const endGame = (finalScore = score) => {
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
                    <h2 className="glow-text">APTITUDE BLITZ</h2>
                    <p className="message mt-4">You already played Aptitude Blitz today!</p>
                    <PixelButton className="mt-4 cursor-target" onClick={() => window.history.back()}>BACK</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'start') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">APTITUDE BLITZ</h2>
                    <p className="mt-4">5 Questions. 60 Seconds.</p>
                    <p className="mb-4">+10 PTS per correct answer.</p>
                    <PixelButton className="start-btn bounce cursor-target" onClick={startGame}>START TIMER</PixelButton>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'completed') {
        let rank = "ROOKIE";
        if (score === 50) rank = "MATH WIZARD";
        else if (score >= 30) rank = "SCHOLAR";

        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">TEST COMPLETE</h2>
                    <p className="mt-4 text-large">Score: {score} / 50</p>
                    <p className="mb-4 rank-text glow-text-pink">RANK: {rank}</p>
                    <PixelButton className="cursor-target" onClick={() => window.history.back()}>BACK</PixelButton>
                </PixelCard>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <h2 className="glow-text mb-2">APTITUDE BLITZ</h2>
                <div className="timer-bar-container">
                    <div
                        className={`timer-bar ${timeLeft < 15 ? 'danger shrink' : ''}`}
                        style={{ width: `${(timeLeft / 60) * 100}%` }}
                    ></div>
                </div>
                <div className="timer-text">{timeLeft}s</div>
            </div>

            <PixelCard className="question-card mt-4">
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

export default AptitudeGame;
