import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Routes, Route, Link } from 'react-router-dom';
import PixelCard from '../components/PixelCard';
import api from '../services/api';
import './GamesPage.css';

// Lazy load or inline components for the games (we will build these out)
import WordleGame from './games/WordleGame';
import AptitudeGame from './games/AptitudeGame';
import TechGame from './games/TechGame';
import AdminPanel from './games/AdminPanel';
import UnscrambleGame from './games/UnscrambleGame';
import EnglishFluencyGame from './games/EnglishFluencyGame';
import GuessOutputGame from './games/GuessOutputGame';
import QueryQuest from './games/QueryQuest';

const GamesOverview = ({ user, points }) => {
    return (
        <div className="games-overview">
            <header className="games-header pixel-border">
                <div className="user-info">
                    <span className="user-badge">{user.usn}</span>
                    <span className="dept-badge">{user.department}</span>
                </div>
                <div className="points-display">
                    <span className="points-icon">⭐</span>
                    <span className="points-value glow-text-pink">{points} PTS</span>
                </div>
            </header>

            {user.isAdmin && (
                <div className="admin-access">
                    <Link to="/games/admin" className="pixel-btn admin-btn cursor-target">ACCESS ADMIN PANEL</Link>
                </div>
            )}

            <div className="games-grid">
                <Link to="/games/wordle" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">📝</div>
                        <h3>PIXEL WORDLE</h3>
                        <p>5 letters. 6 tries. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/aptitude" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">⏱️</div>
                        <h3>APTITUDE BLITZ</h3>
                        <p>60 seconds. 5 Qs. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/tech" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">💻</div>
                        <h3>TECH QUEST</h3>
                        <p>5 Tech Qs. No Timer. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/unscramble" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">🔀</div>
                        <h3>WORD SCRAMBLE</h3>
                        <p>Guess the word. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/fluency" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">📖</div>
                        <h3>ENGLISH FLUENCY</h3>
                        <p>5 Grammar Qs. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/output" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">⚙️</div>
                        <h3>GUESS OUTPUT</h3>
                        <p>Evaluate code. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/query-quest" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon bounce">🗄️</div>
                        <h3>QUERY QUEST</h3>
                        <p>6 SQL Missions. Real DB. +60 PTS</p>
                    </PixelCard>
                </Link>
            </div>
        </div>
    );
};

const GamesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('pixelQuestUser');
        const token = localStorage.getItem('pq_token');
        if (!storedUser || !token) return null;
        try {
            return JSON.parse(storedUser);
        } catch {
            return null;
        }
    });
    const [todayPoints, setTodayPoints] = useState(0);

    useEffect(() => {
        if (!user) {
            api.logout();
            navigate('/signin');
            return;
        }

        api.getMe()
            .then((me) => {
                if (me?.user) {
                    localStorage.setItem('pixelQuestUser', JSON.stringify(me.user));
                    setUser(me.user);
                }
            })
            .catch((err) => {
                if (err.status === 401) {
                    api.logout();
                    navigate('/signin');
                }
            });
        // Verify auth token on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!user) return;
        api.getGamesStatus()
            .then((data) => {
                setTodayPoints(data.todayPoints || 0);
            })
            .catch((err) => {
                console.error('Failed to fetch game status:', err);
                if (err.status === 401) {
                    api.logout();
                    navigate('/signin');
                }
            });
    }, [navigate, user, location.pathname]);

    if (!user) return null;

    return (
        <div className="games-page-container">
            <Routes>
                <Route path="/" element={<GamesOverview user={user} points={todayPoints} />} />
                <Route path="/wordle" element={<WordleGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/aptitude" element={<AptitudeGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/tech" element={<TechGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/unscramble" element={<UnscrambleGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/fluency" element={<EnglishFluencyGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/output" element={<GuessOutputGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/query-quest" element={<QueryQuest user={user} setTodayPoints={setTodayPoints} />} />
                {user.isAdmin && <Route path="/admin" element={<AdminPanel />} />}
            </Routes>
        </div>
    );
};

export default GamesPage;
