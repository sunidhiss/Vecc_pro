const supabase = require('../config/supabase');
const { isScoreCompleted } = require('../utils/gameKeys');

/**
 * GET /api/leaderboard/students
 * Straightforward student leaderboard querying users and game_scores.
 */
exports.getStudents = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

        const { data: users, error } = await supabase
            .from('users')
            .select('usn, department, game_scores(score, details)')
            .neq('role', 'admin');

        if (error) throw error;

        const list = (users || [])
            .map((u) => {
                const totalPoints = (u.game_scores || [])
                    .filter(isScoreCompleted)
                    .reduce((acc, row) => acc + (Number(row.score) || 0), 0);
                return {
                    usn: u.usn,
                    department: u.department || '',
                    totalPoints,
                };
            })
            .filter((u) => u.totalPoints > 0)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, limit)
            .map((u, idx) => ({ ...u, rank: idx + 1 }));

        return res.json(list);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/leaderboard/departments
 * Clean department standings aggregating points directly from users and game_scores.
 */
exports.getDepartments = async (req, res, next) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('department, role, game_scores(score, details)')
            .neq('role', 'admin');

        if (error) throw error;

        const deptMap = new Map();

        for (const u of users || []) {
            const dept = u.department || 'General Engineering';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { name: dept, totalPoints: 0, activePlayers: 0 });
            }
            const record = deptMap.get(dept);
            const userPts = (u.game_scores || [])
                .filter(isScoreCompleted)
                .reduce((acc, row) => acc + (Number(row.score) || 0), 0);

            record.totalPoints += userPts;
            if (userPts > 0) {
                record.activePlayers += 1;
            }
        }

        const list = Array.from(deptMap.values())
            .sort((a, b) => b.totalPoints - a.totalPoints);

        return res.json(list);
    } catch (err) {
        next(err);
    }
};
