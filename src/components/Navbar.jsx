import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isSignIn = location.pathname === '/signin';

    const currentUser = JSON.parse(localStorage.getItem('pixelQuestUser'));

    const handleSignOut = () => {
        localStorage.removeItem('pixelQuestUser');
        navigate('/');
    };

    if (isSignIn) return null;

    return (
        <nav className="navbar pixel-border">
            <div className="nav-logo glow-text">
                <Link to="/" className="cursor-target">⚔️ PIXEL QUEST</Link>
            </div>
            <div className="nav-links">
                <Link to="/" className={`cursor-target ${location.pathname === '/' ? 'active' : ''}`}>HOME</Link>
                <Link to="/games" className={`cursor-target ${location.pathname === '/games' ? 'active' : ''}`}>GAMES</Link>
                <Link to="/leaderboard" className={`cursor-target ${location.pathname === '/leaderboard' ? 'active' : ''}`}>LEADERBOARD</Link>
                <Link to="/team" className={`cursor-target ${location.pathname === '/team' ? 'active' : ''}`}>TEAM</Link>
                {currentUser ? (
                    <button onClick={handleSignOut} className="signout-btn cursor-target">SIGN OUT</button>
                ) : (
                    <Link to="/signin" className="cursor-target">SIGN IN</Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
