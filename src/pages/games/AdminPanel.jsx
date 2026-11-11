import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import QueryQuestManager from '../../components/queryQuest/QueryQuestManager';
import api from '../../services/api';
import './AdminPanel.css';

const initQuestions = () =>
    Array.from({ length: 5 }, () => ({ q: '', options: ['', '', '', ''], answer: '' }));

const initOutputQuestions = () =>
    Array.from({ length: 5 }, () => ({ q: '', code: '', options: ['', '', '', ''], answer: '' }));

const AdminPanel = () => {
    const today = new Date().toISOString().split('T')[0];
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('wordle');
    const [showSuccess, setShowSuccess] = useState(false);

    // Wordle State
    const [wordleWord, setWordleWord] = useState('');

    // Quiz States
    const [aptitudeQs, setAptitudeQs] = useState(initQuestions);
    const [techQs, setTechQs] = useState(initQuestions);

    // Scramble & Fluency & Output States
    const [unscrambleWord, setUnscrambleWord] = useState('');
    const [fluencyQs, setFluencyQs] = useState(initQuestions);
    const [outputQs, setOutputQs] = useState(initOutputQuestions);

    useEffect(() => {
        if (activeTab === 'queryquest') return;
        let cancelled = false;
        api.getDailyGame(activeTab, today)
            .then((data) => {
                if (cancelled) return;
                const payload = data?.content;
                if (!payload) return;

                if (activeTab === 'wordle' && payload.word) {
                    setWordleWord(payload.word);
                } else if (activeTab === 'unscramble' && payload.word) {
                    setUnscrambleWord(payload.word);
                } else if (Array.isArray(payload.questions) && payload.questions.length === 5) {
                    if (activeTab === 'aptitude') setAptitudeQs(payload.questions);
                    if (activeTab === 'tech') setTechQs(payload.questions);
                    if (activeTab === 'fluency') setFluencyQs(payload.questions);
                    if (activeTab === 'output') setOutputQs(payload.questions);
                }
            })
            .catch((err) => {
                console.error(`Failed to load saved ${activeTab} config:`, err);
            });
        return () => {
            cancelled = true;
        };
    }, [activeTab, today]);

    const triggerSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleSaveWord = async (e, word) => {
        e.preventDefault();
        if (word.trim().length >= 2) {
            try {
                await api.setDailyGame('unscramble', { word: word.trim().toUpperCase(), date: today });
                triggerSuccess();
            } catch (err) {
                alert(err.message || 'Failed to save word');
            }
        } else {
            alert('Word must be at least 2 letters');
        }
    };

    const handleSaveWordle = async (e) => {
        e.preventDefault();
        if (wordleWord.trim().length === 5) {
            try {
                await api.setDailyGame('wordle', { word: wordleWord.trim().toUpperCase(), date: today });
                triggerSuccess();
            } catch (err) {
                alert(err.message || 'Failed to save Wordle word');
            }
        } else {
            alert('Word must be exactly 5 letters');
        }
    };

    const handleSaveQuiz = async (e, gameKey, questions) => {
        e.preventDefault();
        const isValid = questions.every((q) => q.q && q.answer && q.options.every((o) => o));
        if (isValid) {
            try {
                await api.setDailyGame(gameKey, { questions, date: today });
                triggerSuccess();
            } catch (err) {
                alert(err.message || 'Failed to save quiz');
            }
        } else {
            alert('All fields must be filled!');
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

    const renderQuizForm = (qs, setQs, gameKey, label) => (
        <form onSubmit={(e) => handleSaveQuiz(e, gameKey, qs)} className="admin-form">
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
            <PixelButton type="submit" className="cursor-target">SAVE {label} QUIZ</PixelButton>
        </form>
    );

    const renderOutputQuizForm = (qs, setQs, gameKey) => (
        <form onSubmit={(e) => handleSaveQuiz(e, gameKey, qs)} className="admin-form">
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
            <PixelButton type="submit" className="cursor-target">SAVE OUTPUT QUIZ</PixelButton>
        </form>
    );

    return (
        <div className="admin-container">
            <PixelCard className="admin-card">
                <div className="admin-header">
                    <h2 className="glow-text">SYSTEM ADMIN</h2>
                    <PixelButton onClick={() => navigate('/games')} className="btn-small cursor-target">BACK TO GAMES</PixelButton>
                </div>

                <p className="admin-date">Configuring games for Date: <strong>{today}</strong></p>

                <div className="admin-tabs">
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'wordle' ? 'active' : ''}`}
                        onClick={() => setActiveTab('wordle')}
                    >WORDLE</button>
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'aptitude' ? 'active' : ''}`}
                        onClick={() => setActiveTab('aptitude')}
                    >APTITUDE</button>
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'tech' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tech')}
                    >TECH QUEST</button>
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'unscramble' ? 'active' : ''}`}
                        onClick={() => setActiveTab('unscramble')}
                    >UNSCRAMBLE</button>
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'fluency' ? 'active' : ''}`}
                        onClick={() => setActiveTab('fluency')}
                    >FLUENCY</button>
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'output' ? 'active' : ''}`}
                        onClick={() => setActiveTab('output')}
                    >OUTPUT</button>
                    <button
                        className={`tab-btn cursor-target ${activeTab === 'queryquest' ? 'active' : ''}`}
                        onClick={() => setActiveTab('queryquest')}
                    >QUERY QUEST</button>
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
                            <PixelButton type="submit" className="cursor-target">SAVE WORD</PixelButton>
                        </form>
                    )}

                    {activeTab === 'unscramble' && (
                        <form onSubmit={(e) => handleSaveWord(e, unscrambleWord)} className="admin-form">
                            <label>Today's Unscramble Word:</label>
                            <input
                                className="pixel-input wordle-admin-input"
                                value={unscrambleWord}
                                onChange={(e) => setUnscrambleWord(e.target.value.toUpperCase())}
                                placeholder="e.g. REACT"
                            />
                            <PixelButton type="submit" className="cursor-target">SAVE WORD</PixelButton>
                        </form>
                    )}

                    {activeTab === 'aptitude' && renderQuizForm(aptitudeQs, setAptitudeQs, 'aptitude', 'APTITUDE')}
                    {activeTab === 'tech' && renderQuizForm(techQs, setTechQs, 'tech', 'TECH QUEST')}
                    {activeTab === 'fluency' && renderQuizForm(fluencyQs, setFluencyQs, 'fluency', 'FLUENCY')}
                    {activeTab === 'output' && renderOutputQuizForm(outputQs, setOutputQs, 'output')}
                    {activeTab === 'queryquest' && <QueryQuestManager defaultDate={today} onSaved={triggerSuccess} />}
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
