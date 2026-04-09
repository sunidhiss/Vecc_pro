import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './loadingpage.css';

const LoadingPage = () => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const duration = 6000; // 6 seconds

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min(Math.round((elapsed / duration) * 100), 100);
            setProgress(percentage);

            if (elapsed >= duration) {
                clearInterval(interval);
                setTimeout(() => {
                    navigate('/home');
                }, 0);
            }
        }, 50); // Update every 50ms for smooth animation

        return () => clearInterval(interval);
    }, [navigate]);

    return (
        <div className="loading-page-container">
            {/* Loading Content */}
            <div className="loading-content">
                <h1 className="loading-text">Loading...</h1>
                <p className="loading-subtext">Log in to climb the leaderboard...</p>
                <div className="loading-bar-container">
                    <div className="loading-bar" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">{progress}%</div>
            </div>
        </div>
    );
};

export default LoadingPage;
