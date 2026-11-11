import React, { useState, useEffect } from 'react';
import PixelCard from '../components/PixelCard';
import api from '../services/api';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
    const [activeTab, setActiveTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [currentUser] = useState(() => {
        const cUserStr = localStorage.getItem('pixelQuestUser');
        if (!cUserStr) return null;
        try {
            return JSON.parse(cUserStr);
        } catch {
            return null;
        }
    });

    useEffect(() => {
        Promise.all([
            api.getStudentLeaderboard(),
            api.getDepartmentLeaderboard(),
        ])
            .then(([studentData, deptData]) => {
                setStudents(studentData);
                setDepartments(deptData);
            })
            .catch((err) => {
                console.error('Failed to load leaderboard:', err);
            });
    }, []);

    const getMedal = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return <span className="rank-num">#{index + 1}</span>;
    };

    return (
        <div className="leaderboard-page">
            <h1 className="glow-text text-center mb-8">HALL OF FAME</h1>

            <div className="lb-tabs">
                <button
                    className={`lb-tab cursor-target ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    [🏆 STUDENTS]
                </button>
                <button
                    className={`lb-tab cursor-target ${activeTab === 'departments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('departments')}
                >
                    [🏰 DEPARTMENTS]
                </button>
            </div>

            {activeTab === 'students' && (
                <PixelCard className="lb-card">
                    <table className="lb-table">
                        <thead>
                            <tr>
                                <th>RANK</th>
                                <th>USN</th>
                                <th>DEPARTMENT</th>
                                <th>POINTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s, idx) => {
                                const isMe = currentUser && currentUser.usn === s.usn;
                                return (
                                    <tr key={s.usn} className={`lb-row slide-in delay-${idx % 10} cursor-target ${isMe ? 'is-me' : ''}`}>
                                        <td className="rank-cell">{getMedal(idx)}</td>
                                        <td>{s.usn} {isMe && '(YOU)'}</td>
                                        <td><span className="tiny-badge">{s.department}</span></td>
                                        <td className="points-cell glow-text-pink">{s.totalPoints}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </PixelCard>
            )}

            {activeTab === 'departments' && (
                <PixelCard className="lb-card dept-card">
                    <div className="podium-container mb-8">
                        {departments[1] && (
                            <div className="podium-2">
                                <div className="dept-name text-center">{departments[1].name}</div>
                                <div className="podium-block p2 pixel-border cursor-target">
                                    <span className="medal bouncing">🥈</span>
                                    <div className="pts">{departments[1].totalPoints}</div>
                                </div>
                            </div>
                        )}
                        {departments[0] && (
                            <div className="podium-1">
                                <div className="dept-name text-center glow-text">{departments[0].name}</div>
                                <div className="podium-block p1 pixel-border cursor-target">
                                    <span className="medal bouncing">🥇</span>
                                    <div className="pts">{departments[0].totalPoints}</div>
                                </div>
                            </div>
                        )}
                        {departments[2] && (
                            <div className="podium-3">
                                <div className="dept-name text-center">{departments[2].name}</div>
                                <div className="podium-block p3 pixel-border cursor-target">
                                    <span className="medal bouncing">🥉</span>
                                    <div className="pts">{departments[2].totalPoints}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="dept-bars">
                        {departments.map((d, index) => {
                            const maxPoints = departments[0]?.totalPoints || 1;
                            const widthPercent = (d.totalPoints / maxPoints) * 100;

                            return (
                                <div key={d.name} className="dept-bar-row cursor-target">
                                    <div className="dept-bar-info">
                                        <span>#{index + 1} {d.name}</span>
                                        <span className="players-count">{d.activePlayers} Players</span>
                                    </div>
                                    <div className="health-bar-container">
                                        <div
                                            className="health-bar fill"
                                            style={{ width: `${widthPercent}%`, backgroundColor: index === 0 ? 'var(--accent-teal)' : 'var(--accent-purple)' }}
                                        ></div>
                                    </div>
                                    <div className="dept-bar-pts glow-text-pink">{d.totalPoints} PTS</div>
                                </div>
                            );
                        })}
                    </div>
                </PixelCard>
            )}
        </div>
    );
};

export default LeaderboardPage;
