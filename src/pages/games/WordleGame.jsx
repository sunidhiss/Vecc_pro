import React, { useState, useEffect } from 'react';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import './WordleGame.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const WordleGame = ({ user, setTodayPoints }) => {
    const today = new Date().toISOString().split('T')[0];
    const gameKey = `${user.usn}_${today}_wordle`;

    const [targetWord, setTargetWord] = useState('FLAME');
    const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(''));
    const [currentGuess, setCurrentGuess] = useState('');
    const [currentRow, setCurrentRow] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, won, lost, completed
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Load today's word from admin if set
        const adminWord = localStorage.getItem(`wordle_${today}`);
        if (adminWord) {
            setTargetWord(adminWord.toUpperCase());
        }

        // Check if user already played today
        const status = localStorage.getItem(gameKey);
        if (status) {
            setGameState('completed');
            setMessage('You already played Wordle today!');
        }
    }, [today, gameKey]);

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

    const submitGuess = () => {
        if (currentGuess.length !== WORD_LENGTH) {
            setMessage('NOT ENOUGH LETTERS');
            setTimeout(() => setMessage(''), 1500);
            return;
        }

        const newGuesses = [...guesses];
        newGuesses[currentRow] = currentGuess;
        setGuesses(newGuesses);

        let won = currentGuess === targetWord;

        if (won) {
            setGameState('won');
            setMessage('YOU WON! +50 PTS');
            awardPoints(50);
        } else if (currentRow === MAX_GUESSES - 1) {
            setGameState('lost');
            setMessage(`OUT OF TRIES! Word was ${targetWord}. +5 PTS`);
            awardPoints(5);
        } else {
            setCurrentRow(currentRow + 1);
            setCurrentGuess('');
        }
    };

    const awardPoints = (points) => {
        localStorage.setItem(gameKey, 'completed');

        const allPoints = JSON.parse(localStorage.getItem('pq_points')) || {};
        const userPoints = allPoints[user.usn] || {};
        const currentPoints = userPoints[today] || 0;

        userPoints[today] = currentPoints + points;
        allPoints[user.usn] = userPoints;

        localStorage.setItem('pq_points', JSON.stringify(allPoints));
        setTodayPoints(userPoints[today]);
    };

    const getLetterColor = (letter, index, rowGuess) => {
        if (!targetWord.includes(letter)) return 'absent';
        if (targetWord[index] === letter) return 'correct';

        // Handle yellow (present but wrong spot)
        // Simplistic evaluation for prototype
        return 'present';
    };

    const keyboardRows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    if (gameState === 'completed') {
        return (
            <div className="wordle-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text">PIXEL WORDLE</h2>
                    <p className="message mt-4">{message}</p>
                    <PixelButton className="mt-4" onClick={() => window.history.back()}>
                        BACK TO GAMES
                    </PixelButton>
                </PixelCard>
            </div>
        );
    }

    return (
        <div className="wordle-container">
            <h2 className="glow-text mb-2">PIXEL WORDLE</h2>
            {message && <div className="message">{message}</div>}

            <div className="wordle-grid">
                {guesses.map((guess, i) => {
                    const isCurrentRow = i === currentRow;
                    const displayWord = isCurrentRow ? currentGuess.padEnd(WORD_LENGTH, ' ') : guess.padEnd(WORD_LENGTH, ' ');

                    return (
                        <div key={i} className="wordle-row">
                            {displayWord.split('').map((char, j) => {
                                let statusClass = '';
                                if (!isCurrentRow && guess) {
                                    statusClass = getLetterColor(char, j, guess);
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
                                className={`key-btn ${key === 'ENTER' || key === '⌫' ? 'wide' : ''}`}
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
