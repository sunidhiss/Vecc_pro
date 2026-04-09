import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../../components/PixelButton';
import PixelCard from '../../components/PixelCard';
import './UnscrambleGame.css';

const UnscrambleGame = ({ user, setTodayPoints }) => {
    const navigate = useNavigate();
    const [originalWord, setOriginalWord] = useState('');
    const [scrambledWord, setScrambledWord] = useState('');
    const [guess, setGuess] = useState('');
    const [hasPlayedInfo, setHasPlayedInfo] = useState(null);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const playedRecords = JSON.parse(localStorage.getItem('pq_unscramble_played')) || {};

        if (playedRecords[user.usn] && playedRecords[user.usn].date === today) {
            setHasPlayedInfo(playedRecords[user.usn]);
            return;
        }

        // Fetch daily word or default
        const word = localStorage.getItem('pq_unscramble_word') || 'REACT';
        const upperWord = word.toUpperCase();
        setOriginalWord(upperWord);

        // Scramble the word (ensure it's actually scrambled unless the word is 1 char)
        let scrambled = upperWord;
        if (upperWord.length > 1) {
            let limit = 20;
            while (scrambled === upperWord && limit > 0) {
                scrambled = upperWord.split('').sort(() => 0.5 - Math.random()).join('');
                limit--;
            }
        }
        setScrambledWord(scrambled);
    }, [user.usn]);

    const handleGuess = () => {
        if (!guess.trim()) return;

        const upperGuess = guess.toUpperCase().trim();
        const isWin = upperGuess === originalWord;
        const pts = isWin ? 50 : 0;

        const today = new Date().toISOString().split('T')[0];

        // Save played state
        const playedRecords = JSON.parse(localStorage.getItem('pq_unscramble_played')) || {};
        const record = { date: today, win: isWin, word: originalWord };
        playedRecords[user.usn] = record;
        localStorage.setItem('pq_unscramble_played', JSON.stringify(playedRecords));

        setHasPlayedInfo(record);

        if (isWin) {
            // Award points
            const allPoints = JSON.parse(localStorage.getItem('pq_points')) || {};
            if (!allPoints[user.usn]) allPoints[user.usn] = {};
            const currentTodayPts = allPoints[user.usn][today] || 0;
            allPoints[user.usn][today] = currentTodayPts + pts;
            localStorage.setItem('pq_points', JSON.stringify(allPoints));
            setTodayPoints(allPoints[user.usn][today]);
            setMsg('CORRECT! +50 PTS');
        } else {
            setMsg(`INCORRECT! The word was ${originalWord}`);
        }
    };

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
