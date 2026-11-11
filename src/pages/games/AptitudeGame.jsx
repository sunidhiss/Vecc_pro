import React, { useState, useEffect, useRef, useCallback } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import api from '../../services/api';
import './AptitudeGame.css';

const AptitudeGame = ({ setTodayPoints }) => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState('loading'); // loading, start, playing, completed, already_played
    const submittedRef = useRef(false);

    useEffect(() => {
        api.getQuiz('aptitude')
            .then((data) => {
                if (data.alreadyPlayed) {
                    setGameState('already_played');
                } else {
                    setQuestions(data.questions || []);
                    setGameState('start');
                }
            })
            .catch((err) => {
                console.error('Failed to load aptitude quiz:', err);
            });
    }, []);

    const submitAllAnswers = useCallback(async (answers) => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        try {
            const data = await api.submitQuiz('aptitude', answers);
            setScore(data.score);
            setGameState('completed');
            setTodayPoints(prev => (typeof prev === 'number' ? prev : 0) + (data.score || 0));
        } catch (err) {
            console.error('Failed to submit aptitude quiz:', err);
            setGameState('completed');
        }
    }, [setTodayPoints]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        if (timeLeft <= 0) {
            const timeout = setTimeout(() => {
                const paddedAnswers = [...selectedAnswers];
                while (paddedAnswers.length < questions.length) {
                    paddedAnswers.push('');
                }
                submitAllAnswers(paddedAnswers);
            }, 0);
            return () => clearTimeout(timeout);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, timeLeft, selectedAnswers, questions.length, submitAllAnswers]);

    const startGame = () => setGameState('playing');

    const handleAnswer = (option) => {
        const newAnswers = [...selectedAnswers, option];
        setSelectedAnswers(newAnswers);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            submitAllAnswers(newAnswers);
        }
    };

    if (gameState === 'loading') {
        return (
            <div className="quiz-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">APTITUDE BLITZ</h2>
                    <p className="mt-4">LOADING...</p>
                </PixelCard>
            </div>
        );
    }

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
