import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import PixelCard from '../components/PixelCard';
import './GamesPage.css';

// Lazy load or inline components for the games (we will build these out)
import WordleGame from './games/WordleGame';
import AptitudeGame from './games/AptitudeGame';
import TechGame from './games/TechGame';
import AdminPanel from './games/AdminPanel';

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
                        <div className="game-icon shake">⏱️</div>
                        <h3>APTITUDE BLITZ</h3>
                        <p>60 seconds. 5 Qs. +50 PTS</p>
                    </PixelCard>
                </Link>
                <Link to="/games/tech" className="game-card-link cursor-target">
                    <PixelCard className="game-card">
                        <div className="game-icon">💻</div>
                        <h3>TECH QUEST</h3>
                        <p>5 Tech Qs. No Timer. +50 PTS</p>
                    </PixelCard>
                </Link>
            </div>
        </div>
    );
};

const GamesPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [todayPoints, setTodayPoints] = useState(0);

    useEffect(() => {
        const storedUser = localStorage.getItem('pixelQuestUser');
        if (!storedUser) {
            navigate('/signin');
            return;
        }

        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Load today's points
        const today = new Date().toISOString().split('T')[0];
        const allPoints = JSON.parse(localStorage.getItem('pq_points')) || {};
        const userPoints = allPoints[parsed.usn] || {};
        setTodayPoints(userPoints[today] || 0);

    }, [navigate]);

    if (!user) return null;

    return (
        <div className="games-page-container">
            <Routes>
                <Route path="/" element={<GamesOverview user={user} points={todayPoints} />} />
                <Route path="/wordle" element={<WordleGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/aptitude" element={<AptitudeGame user={user} setTodayPoints={setTodayPoints} />} />
                <Route path="/tech" element={<TechGame user={user} setTodayPoints={setTodayPoints} />} />
                {user.isAdmin && <Route path="/admin" element={<AdminPanel />} />}
            </Routes>
        </div>
    );
};

export default GamesPage;
