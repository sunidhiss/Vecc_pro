import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Navbar.css';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isSignIn = location.pathname === '/signin';
    const isLoading = location.pathname === '/';

    const currentUser = JSON.parse(localStorage.getItem('pixelQuestUser'));

    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('pq_theme') === 'dark';
    });

    useEffect(() => {
        if (isDark) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [isDark]);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        localStorage.setItem('pq_theme', next ? 'dark' : 'light');
    };

    const handleSignOut = () => {
        api.logout();
        navigate('/home');
    };

    if (isSignIn || isLoading) return null;

    return (
        <nav className="navbar pixel-border">
            <div className="nav-logo glow-text">
                <Link to="/home" className="cursor-target">⚔️ PIXEL QUEST</Link>
            </div>
            <div className="nav-links">
                <Link to="/home" className={`cursor-target ${location.pathname === '/home' ? 'active' : ''}`}>HOME</Link>
                <Link to="/games" className={`cursor-target ${location.pathname === '/games' ? 'active' : ''}`}>GAMES</Link>
                <Link to="/leaderboard" className={`cursor-target ${location.pathname === '/leaderboard' ? 'active' : ''}`}>LEADERBOARD</Link>
                <Link to="/team" className={`cursor-target ${location.pathname === '/team' ? 'active' : ''}`}>TEAM</Link>
                {currentUser ? (
                    <button onClick={handleSignOut} className="signout-btn cursor-target">SIGN OUT</button>
                ) : (
                    <Link to="/signin" className="cursor-target">SIGN IN</Link>
                )}
                <button onClick={toggleTheme} className="theme-btn cursor-target" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                    {isDark ? '☀️' : '🌙'}
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
