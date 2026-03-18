import React, { useState, useEffect } from 'react';
import PixelCard from '../components/PixelCard';
import './LeaderboardPage.css';

const generateMockData = () => {
    // Only generate if empty
    if (localStorage.getItem('pq_mock_injected')) return;

    const depts = [
        { c: 'CS', n: 'Computer Science' },
        { c: 'AD', n: 'AI & Data Science' },
        { c: 'IS', n: 'Information Science' },
        { c: 'EC', n: 'Electronics' },
        { c: 'ME', n: 'Mechanical' },
        { c: 'CV', n: 'Civil' }
    ];

    const users = {};
    const points = {};
    const today = new Date().toISOString().split('T')[0];

    // Generate 50 random students
    for (let i = 1; i <= 50; i++) {
        const d = depts[Math.floor(Math.random() * depts.length)];
        const usn = `NNM24${d.c}${(i).toString().padStart(3, '0')}`;
        users[usn] = { usn, department: d.n, year: '24', rollNo: i.toString() };

        // Random points between 10 and 300
        points[usn] = { [today]: Math.floor(Math.random() * 290) + 10 };
    }

    // Ensure we don't overwrite real user data if it exists
    const existingUsers = JSON.parse(localStorage.getItem('pq_users')) || {};
    const existingPoints = JSON.parse(localStorage.getItem('pq_points')) || {};

    localStorage.setItem('pq_users', JSON.stringify({ ...users, ...existingUsers }));
    localStorage.setItem('pq_points', JSON.stringify({ ...points, ...existingPoints }));
    localStorage.setItem('pq_mock_injected', 'true');
};

const LeaderboardPage = () => {
    const [activeTab, setActiveTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        generateMockData();

        const cUserStr = localStorage.getItem('pixelQuestUser');
        if (cUserStr) setCurrentUser(JSON.parse(cUserStr));

        const allUsers = JSON.parse(localStorage.getItem('pq_users')) || {};
        const allPoints = JSON.parse(localStorage.getItem('pq_points')) || {};

        // Aggregate points
        const studentList = [];
        const deptMap = {};

        Object.values(allUsers).forEach(u => {
            if (u.isAdmin) return; // Skip admins

            const userPts = allPoints[u.usn] || {};
            const total = Object.values(userPts).reduce((acc, val) => acc + val, 0);

            studentList.push({ ...u, totalPoints: total });

            if (!deptMap[u.department]) {
                deptMap[u.department] = { name: u.department, totalPoints: 0, activePlayers: 0 };
            }
            deptMap[u.department].totalPoints += total;
            if (total > 0) deptMap[u.department].activePlayers += 1;
        });

        // Sort students
        studentList.sort((a, b) => b.totalPoints - a.totalPoints);
        setStudents(studentList.slice(0, 20)); // Top 20

        // Sort departments
        const deptList = Object.values(deptMap).sort((a, b) => b.totalPoints - a.totalPoints);
        setDepartments(deptList);

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
                    className={`lb-tab ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    [🏆 STUDENTS]
                </button>
                <button
                    className={`lb-tab ${activeTab === 'departments' ? 'active' : ''}`}
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
                                    <tr key={s.usn} className={`lb-row slide-in delay-${idx % 10} ${isMe ? 'is-me' : ''}`}>
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
                                <div className="podium-block p2 pixel-border">
                                    <span className="medal bouncing">🥈</span>
                                    <div className="pts">{departments[1].totalPoints}</div>
                                </div>
                            </div>
                        )}
                        {departments[0] && (
                            <div className="podium-1">
                                <div className="dept-name text-center glow-text">{departments[0].name}</div>
                                <div className="podium-block p1 pixel-border">
                                    <span className="medal bouncing">🥇</span>
                                    <div className="pts">{departments[0].totalPoints}</div>
                                </div>
                            </div>
                        )}
                        {departments[2] && (
                            <div className="podium-3">
                                <div className="dept-name text-center">{departments[2].name}</div>
                                <div className="podium-block p3 pixel-border">
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
                                <div key={d.name} className="dept-bar-row">
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
