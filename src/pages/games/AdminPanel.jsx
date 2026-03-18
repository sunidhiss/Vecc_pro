import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import './AdminPanel.css';

const AdminPanel = () => {
    const today = new Date().toISOString().split('T')[0];
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('wordle');
    const [showSuccess, setShowSuccess] = useState(false);

    // Wordle State
    const [wordleWord, setWordleWord] = useState('');

    // Quiz State Helper
    const initQuestions = () => Array(5).fill({ q: '', options: ['', '', '', ''], answer: '' });

    // Aptitude State
    const [aptitudeQs, setAptitudeQs] = useState(initQuestions());

    // Tech State
    const [techQs, setTechQs] = useState(initQuestions());

    const triggerSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleSaveWordle = (e) => {
        e.preventDefault();
        if (wordleWord.length === 5) {
            localStorage.setItem(`wordle_${today}`, wordleWord.toUpperCase());
            triggerSuccess();
        } else {
            alert("Word must be exactly 5 letters");
        }
    };

    const handleSaveQuiz = (e, type, questions) => {
        e.preventDefault();
        const isValid = questions.every(q => q.q && q.answer && q.options.every(o => o));
        if (isValid) {
            localStorage.setItem(`${type}_${today}`, JSON.stringify(questions));
            triggerSuccess();
        } else {
            alert("All fields must be filled!");
        }
    };

    const updateQuestion = (qs, setQs, qIndex, field, value) => {
        const newQs = [...qs];
        newQs[qIndex] = { ...newQs[qIndex], [field]: value };
        setQs(newQs);
    };

    const updateOption = (qs, setQs, qIndex, optIndex, value) => {
        const newQs = [...qs];
        const newOptions = [...newQs[qIndex].options];
        newOptions[optIndex] = value;
        newQs[qIndex] = { ...newQs[qIndex], options: newOptions };
        setQs(newQs);
    };

    const renderQuizForm = (qs, setQs, type) => (
        <form onSubmit={(e) => handleSaveQuiz(e, type, qs)} className="admin-form">
            {qs.map((q, i) => (
                <div key={i} className="admin-q-block pixel-border">
                    <label>Q{i + 1}:</label>
                    <input
                        className="pixel-input full-width"
                        value={q.q}
                        onChange={(e) => updateQuestion(qs, setQs, i, 'q', e.target.value)}
                        placeholder="Enter question"
                    />

                    <div className="options-admin-grid">
                        {q.options.map((opt, j) => (
                            <div key={j}>
                                <label>Opt {j + 1}:</label>
                                <input
                                    className="pixel-input"
                                    value={opt}
                                    onChange={(e) => updateOption(qs, setQs, i, j, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <label>Correct Answer (must match an option exactly):</label>
                    <input
                        className="pixel-input full-width correct-input"
                        value={q.answer}
                        onChange={(e) => updateQuestion(qs, setQs, i, 'answer', e.target.value)}
                    />
                </div>
            ))}
            <PixelButton type="submit">SAVE {type.toUpperCase()} QUIZ</PixelButton>
        </form>
    );

    return (
        <div className="admin-container">
            <PixelCard className="admin-card">
                <div className="admin-header">
                    <h2 className="glow-text">SYSTEM ADMIN</h2>
                    <PixelButton onClick={() => navigate('/games')} className="btn-small">BACK TO GAMES</PixelButton>
                </div>

                <p className="admin-date">Configuring games for Date: <strong>{today}</strong></p>

                <div className="admin-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'wordle' ? 'active' : ''}`}
                        onClick={() => setActiveTab('wordle')}
                    >WORDLE</button>
                    <button
                        className={`tab-btn ${activeTab === 'aptitude' ? 'active' : ''}`}
                        onClick={() => setActiveTab('aptitude')}
                    >APTITUDE</button>
                    <button
                        className={`tab-btn ${activeTab === 'techquiz' ? 'active' : ''}`}
                        onClick={() => setActiveTab('techquiz')}
                    >TECH QUEST</button>
                </div>

                <div className="admin-content">
                    {activeTab === 'wordle' && (
                        <form onSubmit={handleSaveWordle} className="admin-form">
                            <label>Today's 5-Letter Word:</label>
                            <input
                                className="pixel-input wordle-admin-input"
                                maxLength={5}
                                value={wordleWord}
                                onChange={(e) => setWordleWord(e.target.value.toUpperCase())}
                                placeholder="e.g. QUEST"
                            />
                            <PixelButton type="submit">SAVE WORD</PixelButton>
                        </form>
                    )}

                    {activeTab === 'aptitude' && renderQuizForm(aptitudeQs, setAptitudeQs, 'aptitude')}
                    {activeTab === 'techquiz' && renderQuizForm(techQs, setTechQs, 'techquiz')}
                </div>

                {showSuccess && (
                    <div className="success-toast bounce">
                        ✅ SAVED SUCCESSFULLY
                    </div>
                )}
            </PixelCard>
        </div>
    );
};

export default AdminPanel;
