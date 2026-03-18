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
                <Link to="/">⚔️ PIXEL QUEST</Link>
            </div>
            <div className="nav-links">
                <Link to="/" className={location.pathname === '/' ? 'active' : ''}>HOME</Link>
                <Link to="/games" className={location.pathname === '/games' ? 'active' : ''}>GAMES</Link>
                <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>LEADERBOARD</Link>
                {currentUser ? (
                    <button onClick={handleSignOut} className="signout-btn">SIGN OUT</button>
                ) : (
                    <Link to="/signin">SIGN IN</Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
