const supabase = require('../config/supabase');
const { isAttemptCompleted } = require('../utils/gameKeys');

/**
 * GET /api/leaderboard/students
 * Returns top students ordered by total accumulated points from game_attempts.
 */
exports.getStudents = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

        const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('usn, role, departments(department_name), game_attempts(score, metadata)')
            .neq('role', 'admin');

        if (usersErr) throw usersErr;

        const list = (users || [])
            .map((u) => {
                const totalPoints = (u.game_attempts || [])
                    .filter(isAttemptCompleted)
                    .reduce((acc, row) => acc + (Number(row.score) || 0), 0);
                return {
                    usn: u.usn,
                    department: u.departments?.department_name || '',
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
 * Returns department standings calculated from game_attempts.
 */
exports.getDepartments = async (req, res, next) => {
    try {
        const { data: depts, error: deptErr } = await supabase
            .from('departments')
            .select('department_code, department_name, users(usn, role, game_attempts(score, metadata))');

        if (deptErr) throw deptErr;

        const list = (depts || [])
            .map((d) => {
                let totalPoints = 0;
                let activePlayers = 0;
                for (const u of d.users || []) {
                    if (u.role === 'admin') continue;
                    const userPts = (u.game_attempts || [])
                        .filter(isAttemptCompleted)
                        .reduce((acc, row) => acc + (Number(row.score) || 0), 0);
                    totalPoints += userPts;
                    if (userPts > 0) activePlayers += 1;
                }
                return { name: d.department_name, totalPoints, activePlayers };
            })
            .sort((a, b) => b.totalPoints - a.totalPoints);

        return res.json(list);
    } catch (err) {
        next(err);
    }
};
