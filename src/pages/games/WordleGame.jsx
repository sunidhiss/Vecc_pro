import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import api from '../../services/api';
import './WordleGame.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const WordleGame = ({ setTodayPoints }) => {
    const navigate = useNavigate();

    const [targetWord, setTargetWord] = useState('');
    const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(''));
    const [results, setResults] = useState(Array(MAX_GUESSES).fill(null));
    const [currentGuess, setCurrentGuess] = useState('');
    const [currentRow, setCurrentRow] = useState(0);
    const [gameState, setGameState] = useState('loading'); // loading, playing, won, lost, completed
    const [message, setMessage] = useState('');

    useEffect(() => {
        api.getWordle()
            .then((data) => {
                if (data.alreadyPlayed) {
                    setGameState('completed');
                    setMessage('You already played Wordle today!');
                    return;
                }
                if (data.inProgress && Array.isArray(data.guesses)) {
                    const restoredGuesses = Array(MAX_GUESSES).fill('');
                    const restoredResults = Array(MAX_GUESSES).fill(null);
                    data.guesses.forEach((g, idx) => {
                        if (idx < MAX_GUESSES) {
                            restoredGuesses[idx] = g;
                            restoredResults[idx] = data.results?.[idx] || null;
                        }
                    });
                    setGuesses(restoredGuesses);
                    setResults(restoredResults);
                    setCurrentRow(data.guesses.length);
                }
                setGameState('playing');
            })
            .catch((err) => {
                console.error('Failed to load Wordle:', err);
                setMessage(err.message || 'Failed to load game');
                setGameState('playing');
            });
    }, []);

    const submitGuess = async () => {
        if (currentGuess.length !== WORD_LENGTH) {
            setMessage('NOT ENOUGH LETTERS');
            setTimeout(() => setMessage(''), 1500);
            return;
        }

        try {
            const data = await api.submitWordleGuess(currentGuess);

            const newGuesses = [...guesses];
            newGuesses[currentRow] = currentGuess;
            setGuesses(newGuesses);

            const newResults = [...results];
            newResults[currentRow] = data.result;
            setResults(newResults);

            if (data.gameOver) {
                if (data.word) setTargetWord(data.word);
                if (data.won) {
                    setGameState('won');
                    setMessage(`YOU WON! +${data.score} PTS`);
                } else {
                    setGameState('lost');
                    setMessage(`OUT OF TRIES! Word was ${data.word}. +${data.score} PTS`);
                }
                setTodayPoints(prev => (typeof prev === 'number' ? prev : 0) + (data.score || 0));
            } else {
                setCurrentRow(currentRow + 1);
                setCurrentGuess('');
            }
        } catch (err) {
            setMessage(err.message || 'ERROR');
            setTimeout(() => setMessage(''), 1500);
        }
    };

    const handleKeyDown = (e) => {
        if (gameState !== 'playing') return;

        if (e.key === 'Enter') {
            submitGuess();
        } else if (e.key === 'Backspace') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < WORD_LENGTH) {
            setCurrentGuess(prev => (prev + e.key).toUpperCase());
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    const handleKeyClick = (key) => {
        if (gameState !== 'playing') return;

        if (key === 'ENTER') {
            submitGuess();
        } else if (key === '⌫') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (currentGuess.length < WORD_LENGTH) {
            setCurrentGuess(prev => prev + key);
        }
    };

    const keyboardRows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    if (gameState === 'loading') {
        return (
            <div className="wordle-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">PIXEL WORDLE</h2>
                    <p className="message mt-4">LOADING...</p>
                </PixelCard>
            </div>
        );
    }

    if (gameState === 'completed') {
        return (
            <div className="wordle-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">PIXEL WORDLE</h2>
                    <p className="message mt-4">{message}</p>
                    <PixelButton className="mt-4 cursor-target" onClick={() => navigate('/games')}>
                        BACK TO GAMES
                    </PixelButton>
                </PixelCard>
            </div>
        );
    }

    return (
        <div className="wordle-container">
            <h2 className="glow-text mb-2">PIXEL WORDLE</h2>
            {message && gameState === 'playing' && <div className="message">{message}</div>}

            {(gameState === 'won' || gameState === 'lost') && (
                <div className="wordle-result-inline">
                    <div className={`result-text ${gameState === 'won' ? 'result-win' : 'result-lose'}`}>
                        {gameState === 'won' ? '🎉 YOU WON! +50 PTS' : `😔 GAME OVER — Word was ${targetWord}. +5 PTS`}
                    </div>
                    <PixelButton className="mt-4 cursor-target" onClick={() => navigate('/games')}>
                        ← BACK TO GAMES
                    </PixelButton>
                </div>
            )}

            <div className="wordle-grid">
                {guesses.map((guess, i) => {
                    const isCurrentRow = i === currentRow && gameState === 'playing';
                    const displayWord = isCurrentRow ? currentGuess.padEnd(WORD_LENGTH, ' ') : guess.padEnd(WORD_LENGTH, ' ');

                    return (
                        <div key={i} className="wordle-row">
                            {displayWord.split('').map((char, j) => {
                                let statusClass = '';
                                if (!isCurrentRow && guess && results[i]) {
                                    statusClass = results[i][j] || '';
                                }
                                return (
                                    <div key={j} className={`wordle-cell ${statusClass} ${isCurrentRow && char !== ' ' ? 'pop' : ''}`}>
                                        {char !== ' ' ? char : ''}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="wordle-keyboard">
                {keyboardRows.map((row, i) => (
                    <div key={i} className="keyboard-row">
                        {row.map(key => (
                            <button
                                key={key}
                                className={`key-btn cursor-target ${key === 'ENTER' || key === '⌫' ? 'wide' : ''}`}
                                onClick={() => handleKeyClick(key)}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WordleGame;
