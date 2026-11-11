import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../../components/PixelButton';
import PixelCard from '../../components/PixelCard';
import api from '../../services/api';
import './UnscrambleGame.css';

const UnscrambleGame = ({ setTodayPoints }) => {
    const navigate = useNavigate();
    const [scrambledWord, setScrambledWord] = useState('');
    const [guess, setGuess] = useState('');
    const [hasPlayedInfo, setHasPlayedInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.getUnscramble()
            .then((data) => {
                if (data.alreadyPlayed) {
                    setHasPlayedInfo({
                        date: data.date,
                        win: data.win,
                        word: data.word,
                    });
                } else {
                    setScrambledWord(data.scrambledWord);
                }
            })
            .catch((err) => {
                console.error('Failed to load Unscramble:', err);
                setMsg(err.message || 'Failed to load game');
            })
            .finally(() => setLoading(false));
    }, []);

    const handleGuess = async () => {
        if (!guess.trim()) return;

        try {
            const data = await api.submitUnscramble(guess.trim());
            const today = new Date().toISOString().split('T')[0];
            const record = { date: today, win: data.correct, word: data.word };
            setHasPlayedInfo(record);

            if (data.correct) {
                setTodayPoints(prev => (typeof prev === 'number' ? prev : 0) + (data.score || 0));
                setMsg('CORRECT! +50 PTS');
            } else {
                setMsg(`INCORRECT! The word was ${data.word}`);
            }
        } catch (err) {
            setMsg(err.message || 'ERROR');
        }
    };

    if (loading) {
        return (
            <div className="unscramble-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text mb-2">UNSCRAMBLE GAME</h2>
                    <p className="mt-4">LOADING...</p>
                </PixelCard>
            </div>
        );
    }

    if (hasPlayedInfo) {
        return (
            <div className="unscramble-container">
                <PixelCard className="center-card">
                    <h2 className="glow-text mb-2">UNSCRAMBLE GAME</h2>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: hasPlayedInfo.win ? 'var(--accent-teal)' : 'var(--accent-pink)' }}>
                        {hasPlayedInfo.win ? 'YOU WIN!' : 'NICE TRY!'}
                    </p>
                    <p>The word was: <strong>{hasPlayedInfo.word}</strong></p>
                    {msg && <p className="mb-2 msg-bounce">{msg}</p>}
                    <p>Come back tomorrow for a new word!</p>
                    <PixelButton className="mt-4 cursor-target" onClick={() => navigate('/games')}>
                        BACK TO GAMES
                    </PixelButton>
                </PixelCard>
            </div>
        );
    }

    return (
        <div className="unscramble-container">
            <PixelCard className="center-card">
                <h2 className="glow-text mb-2">UNSCRAMBLE GAME</h2>
                <p>Unscramble the letters below to find the correct word. You only get one try!</p>

                <div className="scrambled-block pixel-border bounce mt-4">
                    {scrambledWord}
                </div>

                <div className="input-section mt-4">
                    <input
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        className="pixel-input guess-input"
                        placeholder="ENTER WORD..."
                        maxLength={15}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    <PixelButton onClick={handleGuess} className="cursor-target mt-4">
                        SUBMIT GUESS
                    </PixelButton>
                </div>
            </PixelCard>
        </div>
    );
};

export default UnscrambleGame;
