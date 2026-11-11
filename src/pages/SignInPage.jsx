import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import api from '../services/api';
import './SignInPage.css';

const SignInPage = () => {
    const [usn, setUsn] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isShake, setIsShake] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (usn.trim().toLowerCase() === 'admin') {
                await api.adminLogin(password);
            } else {
                await api.login(usn.trim());
            }
            navigate('/games');
        } catch (err) {
            setError(err.message || 'INVALID ENTRY');
            setIsShake(true);
            setTimeout(() => setIsShake(false), 500);
        }
    };

    return (
        <div className="signin-page fade-in-up">
            <PixelCard className={`login-terminal ${isShake ? 'shake' : ''}`}>
                <h2 className="glow-text flicker">INSERT USN TO CONTINUE</h2>
                <div className="blinking-cursor">_</div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label>ENTER YOUR USN</label>
                        <input
                            type="text"
                            placeholder="NNM24CS001"
                            value={usn}
                            onChange={(e) => setUsn(e.target.value)}
                            className="pixel-input"
                        />
                    </div>

                    {usn.toLowerCase() === 'admin' && (
                        <div className="input-group">
                            <label>PASSWORD</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pixel-input"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <span className="pixel-skull">💀</span> {error}
                        </div>
                    )}

                    <PixelButton type="submit" className="login-btn cursor-target">
                        PRESS START
                    </PixelButton>
                </form>
            </PixelCard>
        </div>
    );
};

export default SignInPage;
