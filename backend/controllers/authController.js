const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'pixel-quest-dev-secret';

const DEPT_MAP = {
    CS: 'Computer Science',
    AD: 'AI & Data Science',
    IS: 'Information Science',
    EC: 'Electronics & Communication',
    ME: 'Mechanical Engineering',
    CV: 'Civil Engineering',
};

/**
 * Parses and validates an NNM-style USN (e.g. NNM24CS001).
 */
function parseUSN(usnString) {
    if (!usnString || typeof usnString !== 'string') return null;
    const trimmed = usnString.trim();
    if (trimmed.length < 10) return null;

    const year = trimmed.substring(3, 5);
    const deptCode = trimmed.substring(5, 7).toUpperCase();
    const rollNo = trimmed.substring(7);
    const department = DEPT_MAP[deptCode];

    if (!department) return null;

    return {
        usn: trimmed.toUpperCase(),
        departmentCode: deptCode,
        department,
        year,
        rollNo,
    };
}

function signToken(user) {
    return jwt.sign(
        { id: user.id, usn: user.usn, isAdmin: Boolean(user.is_admin) },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

/**
 * POST /api/auth/login
 * Validates USN format, creates user if new, and returns JWT.
 */
exports.login = async (req, res, next) => {
    try {
        const { usn } = req.body;
        const parsed = parseUSN(usn);
        if (!parsed) {
            return res.status(400).json({ error: 'INVALID ENTRY' });
        }

        let { data: user, error } = await supabase
            .from('users')
            .select('id, usn, department_code, year, roll_no, is_admin')
            .eq('usn', parsed.usn)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            const { data: created, error: insertError } = await supabase
                .from('users')
                .insert({
                    usn: parsed.usn,
                    department_code: parsed.departmentCode,
                    year: parsed.year,
                    roll_no: parsed.rollNo,
                    is_admin: false,
                })
                .select('id, usn, department_code, year, roll_no, is_admin')
                .single();

            if (insertError) throw insertError;
            user = created;
        }

        const token = signToken(user);
        return res.json({
            user: {
                id: user.id,
                usn: user.usn,
                department: DEPT_MAP[user.department_code] || parsed.department,
                year: user.year,
                rollNo: user.roll_no,
                isAdmin: Boolean(user.is_admin),
            },
            token,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/admin-login
 * Authenticates admin account using bcrypt password verification.
 */
exports.adminLogin = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        let { data: admin, error } = await supabase
            .from('users')
            .select('id, usn, department_code, is_admin, password_hash')
            .eq('is_admin', true)
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!admin) {
            const initialPassword = process.env.ADMIN_PASSWORD || 'hey1234';
            const passwordHash = await bcrypt.hash(initialPassword, 10);

            const { data: created, error: insertError } = await supabase
                .from('users')
                .insert({
                    usn: 'ADMIN',
                    department_code: 'CS',
                    year: '00',
                    roll_no: '000',
                    is_admin: true,
                    password_hash: passwordHash,
                })
                .select('id, usn, department_code, is_admin, password_hash')
                .single();

            if (insertError) throw insertError;
            admin = created;
        }

        const valid = admin.password_hash
            ? await bcrypt.compare(password, admin.password_hash)
            : false;

        if (!valid) {
            return res.status(401).json({ error: 'INVALID CREDENTIALS' });
        }

        const token = signToken(admin);
        return res.json({
            user: {
                id: admin.id,
                usn: admin.usn,
                department: 'System Admin',
                isAdmin: true,
            },
            token,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user profile.
 */
exports.getMe = async (req, res, next) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, usn, department_code, year, roll_no, is_admin')
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) throw error;
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            user: {
                id: user.id,
                usn: user.usn,
                department: user.is_admin ? 'System Admin' : (DEPT_MAP[user.department_code] || user.department_code),
                year: user.year,
                rollNo: user.roll_no,
                isAdmin: Boolean(user.is_admin),
            },
        });
    } catch (err) {
        next(err);
    }
};
