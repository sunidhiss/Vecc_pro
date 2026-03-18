import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import './SignInPage.css';

const SignInPage = () => {
    const [usn, setUsn] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isShake, setIsShake] = useState(false);
    const navigate = useNavigate();

    const parseUSN = (usnString) => {
        // e.g. NNM24CS001
        if (usnString.length < 10) return null;

        const year = usnString.substring(3, 5);
        const deptCode = usnString.substring(5, 7).toUpperCase();
        const rollNo = usnString.substring(7);

        const deptMap = {
            'CS': 'Computer Science',
            'AD': 'AI & Data Science',
            'IS': 'Information Science',
            'EC': 'Electronics & Communication',
            'ME': 'Mechanical Engineering',
            'CV': 'Civil Engineering',
        };

        const department = deptMap[deptCode] || 'Unknown Department';

        return { usn: usnString.toUpperCase(), department, year, rollNo, isAdmin: false };
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (usn.toLowerCase() === 'admin' && password === 'hey1234') {
            const adminUser = { usn: 'ADMIN', department: 'System Admin', isAdmin: true };
            localStorage.setItem('pixelQuestUser', JSON.stringify(adminUser));
            navigate('/games');
            return;
        }

        const parsedUser = parseUSN(usn);
        if (!parsedUser || parsedUser.department === 'Unknown Department') {
            setError('INVALID ENTRY');
            setIsShake(true);
            setTimeout(() => setIsShake(false), 500);
            return;
        }

        localStorage.setItem('pixelQuestUser', JSON.stringify(parsedUser));

        // Let's also create an entry in the users store if it doesn't exist
        const allUsers = JSON.parse(localStorage.getItem('pq_users')) || {};
        allUsers[parsedUser.usn] = parsedUser;
        localStorage.setItem('pq_users', JSON.stringify(allUsers));

        navigate('/games');
    };

    return (
        <div className="signin-page fade-in-up">
            <div className="sprite gold-coin spin coin-drop" style={{ marginBottom: '-2rem', zIndex: 10 }}>🪙</div>
            <PixelCard className={`login-terminal ${isShake ? 'shake' : ''}`}>
                <h2 className="glow-text flicker">INSERT COIN TO CONTINUE</h2>
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

                    <PixelButton type="submit" className="login-btn">
                        PRESS START
                    </PixelButton>
                </form>
            </PixelCard>
        </div>
    );
};

export default SignInPage;
