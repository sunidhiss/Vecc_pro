import React from 'react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page fade-in-up">
            <div className="marquee">
                <div className="marquee-content">
                    DAILY GAMES LIVE NOW • EARN POINTS • BEAT YOUR DEPT • DAILY GAMES LIVE NOW • EARN POINTS • BEAT YOUR DEPT •
                </div>
            </div>

            {/* Decorative Sky Sprites */}
            <div className="sprite pink-bunny bounce" style={{ top: '15%', left: '15%' }}>🐰</div>
            <div className="sprite teal-croc bounce" style={{ top: '60%', right: '10%', animationDelay: '0.5s' }}>🐊</div>
            <div className="sprite gold-coin spin" style={{ top: '30%', right: '25%' }}>🪙</div>
            <div className="sprite gold-coin spin" style={{ top: '70%', left: '20%', animationDelay: '0.3s' }}>🪙</div>

            <header className="hero">
                <h1 className="glow-text title">PIXEL QUEST</h1>
                <p className="subtitle">Play. Earn. Dominate your Department.</p>
                <PixelButton className="cta-btn cursor-target" onClick={() => navigate('/signin')}>
                    START YOUR QUEST →
                </PixelButton>
            </header>

            <section className="how-it-works">
                <h2 className="section-title">HOW IT WORKS</h2>
                <div className="steps-container">
                    <PixelCard className="step-card cursor-target">
                        <div className="step-icon">🔑</div>
                        <h3>Login</h3>
                        <p>Authenticate with your USN to start.</p>
                    </PixelCard>
                    <PixelCard className="step-card cursor-target">
                        <div className="step-icon bounce">🎮</div>
                        <h3>Play</h3>
                        <p>Complete daily challenges to earn points.</p>
                    </PixelCard>
                    <PixelCard className="step-card cursor-target">
                        <div className="step-icon">🏆</div>
                        <h3>Climb</h3>
                        <p>Rise up the individual and department leaderboards.</p>
                    </PixelCard>
                </div>
            </section>

            <section className="today-games">
                <h2 className="section-title">TODAY'S GAMES</h2>
                <div className="games-preview">
                    <PixelCard className="preview-card locked">
                        <h3>WORDLE</h3>
                        <span className="lock-icon shake">🔒</span>
                    </PixelCard>
                    <PixelCard className="preview-card locked">
                        <h3>APTITUDE BLITZ</h3>
                        <span className="lock-icon shake">🔒</span>
                    </PixelCard>
                    <PixelCard className="preview-card locked">
                        <h3>TECH QUEST</h3>
                        <span className="lock-icon shake">🔒</span>
                    </PixelCard>
                    <PixelCard className="preview-card locked">
                        <h3>UNSCRAMBLE</h3>
                        <span className="lock-icon shake">🔒</span>
                    </PixelCard>
                    <PixelCard className="preview-card locked">
                        <h3>ENGLISH FLUENCY</h3>
                        <span className="lock-icon shake">🔒</span>
                    </PixelCard>
                    <PixelCard className="preview-card locked">
                        <h3>GUESS OUTPUT</h3>
                        <span className="lock-icon shake">🔒</span>
                    </PixelCard>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
