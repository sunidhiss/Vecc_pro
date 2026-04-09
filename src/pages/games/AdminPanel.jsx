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
    const initOutputQuestions = () => Array(5).fill({ q: '', code: '', options: ['', '', '', ''], answer: '' });

    // Old Games State
    const [aptitudeQs, setAptitudeQs] = useState(initQuestions());
    const [techQs, setTechQs] = useState(initQuestions());

    // New Games State
    const [unscrambleWord, setUnscrambleWord] = useState('');
    const [fluencyQs, setFluencyQs] = useState(initQuestions());
    const [outputQs, setOutputQs] = useState(initOutputQuestions());

    const triggerSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleSaveWord = (e, keyPrefix, word, setWord) => {
        e.preventDefault();
        if (word.length >= 2) { // Unscramble can be any length >= 2, Wordle must be 5. But let's just use this generic or a specific one.
            localStorage.setItem(`${keyPrefix}_${today}`, word.toUpperCase());
            // Since unscramble uses a generic key:
            if (keyPrefix === 'pq_unscramble_word') {
                localStorage.setItem('pq_unscramble_word', word.toUpperCase());
            }
            triggerSuccess();
        } else {
            alert("Word must be at least 2 letters");
        }
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

    const renderOutputQuizForm = (qs, setQs, type) => (
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

                    <label>Code Snippet (Optional):</label>
                    <textarea
                        className="pixel-input full-width"
                        value={q.code || ''}
                        onChange={(e) => updateQuestion(qs, setQs, i, 'code', e.target.value)}
                        placeholder="Enter code snippet here"
                        rows={3}
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

                    <label>Correct Answer (must match an option):</label>
                    <input
                        className="pixel-input full-width correct-input"
                        value={q.answer}
                        onChange={(e) => updateQuestion(qs, setQs, i, 'answer', e.target.value)}
                    />
                </div>
            ))}
            <PixelButton type="submit">SAVE OUTPUT QUIZ</PixelButton>
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

                <div className="admin-tabs" style={{ flexWrap: 'wrap' }}>
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
                    <button
                        className={`tab-btn ${activeTab === 'unscramble' ? 'active' : ''}`}
                        onClick={() => setActiveTab('unscramble')}
                    >UNSCRAMBLE</button>
                    <button
                        className={`tab-btn ${activeTab === 'fluency' ? 'active' : ''}`}
                        onClick={() => setActiveTab('fluency')}
                    >FLUENCY</button>
                    <button
                        className={`tab-btn ${activeTab === 'output' ? 'active' : ''}`}
                        onClick={() => setActiveTab('output')}
                    >OUTPUT</button>
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

                    {activeTab === 'unscramble' && (
                        <form onSubmit={(e) => handleSaveWord(e, 'pq_unscramble_word', unscrambleWord, setUnscrambleWord)} className="admin-form">
                            <label>Today's Unscramble Word:</label>
                            <input
                                className="pixel-input wordle-admin-input"
                                value={unscrambleWord}
                                onChange={(e) => setUnscrambleWord(e.target.value.toUpperCase())}
                                placeholder="e.g. REACT"
                            />
                            <PixelButton type="submit">SAVE WORD</PixelButton>
                        </form>
                    )}

                    {activeTab === 'aptitude' && renderQuizForm(aptitudeQs, setAptitudeQs, 'aptitude')}
                    {activeTab === 'techquiz' && renderQuizForm(techQs, setTechQs, 'techquiz')}
                    {activeTab === 'fluency' && renderQuizForm(fluencyQs, setFluencyQs, 'fluencyquiz')}
                    {activeTab === 'output' && renderOutputQuizForm(outputQs, setOutputQs, 'outputquiz')}
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
