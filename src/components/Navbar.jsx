import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isSignIn = location.pathname === '/signin';

    const currentUser = JSON.parse(localStorage.getItem('pixelQuestUser'));

    const toggleTheme = () => {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem('pixelQuestUser');
        navigate('/');
    };

    const hideNavbar = location.pathname === '/signin' || location.pathname === '/loading' || location.pathname === '/';

    if (hideNavbar) return null;

    return (
        <nav className="navbar pixel-border">
            <div className="nav-logo glow-text">
                <Link to="/home">⚔️ PIXEL QUEST</Link>
            </div>
            <div className="nav-links">
                <Link to="/home" className={location.pathname === '/home' ? 'active' : ''}>HOME</Link>
                <Link to="/games" className={location.pathname === '/games' ? 'active' : ''}>GAMES</Link>
                <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>LEADERBOARD</Link>
                <Link to="/team" className={location.pathname === '/team' ? 'active' : ''}>TEAM</Link>
                {currentUser ? (
                    <>
                        <button onClick={handleSignOut} className="signout-btn">SIGN OUT</button>
                        <button onClick={toggleTheme} className="theme-btn">🌙</button>
                    </>
                ) : (
                    <>
                        <Link to="/loading">SIGN IN</Link>
                        <button onClick={toggleTheme} className="theme-btn">🌙</button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
