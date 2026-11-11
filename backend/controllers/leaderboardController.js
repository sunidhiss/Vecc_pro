const supabase = require('../config/supabase');

/**
 * GET /api/leaderboard/students
 * Returns top students ordered by total accumulated points.
 */
exports.getStudents = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const { data, error } = await supabase.rpc('get_student_leaderboard', { lim: limit });

        if (!error && Array.isArray(data)) {
            return res.json(
                data.map((row) => ({
                    usn: row.usn,
                    department: row.department,
                    totalPoints: Number(row.total_points),
                    rank: Number(row.player_rank),
                }))
            );
        }

        // Fallback query if RPC function has not been applied yet
        const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('id, usn, departments(name), game_sessions(score, completed)')
            .eq('is_admin', false);

        if (usersErr) throw usersErr;

        const list = (users || [])
            .map((u) => {
                const totalPoints = (u.game_sessions || [])
                    .filter((s) => s.completed)
                    .reduce((acc, s) => acc + (s.score || 0), 0);
                return {
                    usn: u.usn,
                    department: u.departments?.name || '',
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
 * Returns department standings with total points and active player counts.
 */
exports.getDepartments = async (req, res, next) => {
    try {
        const { data, error } = await supabase.rpc('get_department_leaderboard');

        if (!error && Array.isArray(data)) {
            return res.json(
                data.map((row) => ({
                    name: row.name,
                    totalPoints: Number(row.total_points),
                    activePlayers: Number(row.active_players),
                }))
            );
        }

        // Fallback query if RPC function has not been applied yet
        const { data: depts, error: deptErr } = await supabase
            .from('departments')
            .select('code, name, users(id, is_admin, game_sessions(score, completed))');

        if (deptErr) throw deptErr;

        const list = (depts || [])
            .map((d) => {
                let totalPoints = 0;
                let activePlayers = 0;
                for (const u of d.users || []) {
                    if (u.is_admin) continue;
                    const userPts = (u.game_sessions || [])
                        .filter((s) => s.completed)
                        .reduce((acc, s) => acc + (s.score || 0), 0);
                    totalPoints += userPts;
                    if (userPts > 0) activePlayers += 1;
                }
                return { name: d.name, totalPoints, activePlayers };
            })
            .sort((a, b) => b.totalPoints - a.totalPoints);

        return res.json(list);
    } catch (err) {
        next(err);
    }
};
