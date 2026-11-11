import React, { useState, useEffect } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import api from '../../services/api';
import './AptitudeGame.css'; // Reusing aptitude styles as they are identical

const TechGame = ({ setTodayPoints }) => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('loading');

    useEffect(() => {
        api.getQuiz('techquiz')
            .then((data) => {
                if (data.alreadyPlayed) {
                    setGameState('already_played');
                } else {
                    setQuestions(data.questions || []);
                    setGameState('start');
                }
            })
            .catch((err) => {
                console.error('Failed to load tech quiz:', err);
            });
    }, []);

    const startGame = () => setGameState('playing');

    const handleAnswer = async (option) => {
        const newAnswers = [...selectedAnswers, option];
        setSelectedAnswers(newAnswers);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            try {
                const data = await api.submitQuiz('techquiz', newAnswers);
                setScore(data.score);
                setGameState('completed');
                setTodayPoints(prev => (typeof prev === 'number' ? prev : 0) + (data.score || 0));
            } catch (err) {
                console.error('Failed to submit tech quiz:', err);
                setGameState('completed');
            }
        }
    };

    if (gameState === 'loading') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">TECH QUEST</h2>
                    <p className="mt-4">LOADING...</p>
                </PixelCard>
            </div>
        );
    }

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
