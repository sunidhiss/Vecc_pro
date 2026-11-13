const crypto = require('crypto');
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
    const department = DEPT_MAP[deptCode] || 'General Engineering';

    return {
        usn: trimmed.toUpperCase(),
        departmentCode: deptCode,
        department,
        year,
        rollNo,
    };
}

function isAdminUser(user) {
    return user?.role === 'admin' || Boolean(user?.is_admin);
}

function signToken(user) {
    const isAdmin = isAdminUser(user);
    return jwt.sign(
        {
            usn: user.usn,
            role: user.role || (isAdmin ? 'admin' : 'student'),
            isAdmin,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function formatUser(user) {
    const isAdmin = isAdminUser(user);
    return {
        usn: user.usn,
        department: isAdmin ? 'System Admin' : (user.department || DEPT_MAP[user.department_code] || 'General Engineering'),
        year: user.academic_year ?? user.year ?? null,
        rollNo: user.roll_no ?? null,
        role: user.role || (isAdmin ? 'admin' : 'student'),
        isAdmin,
    };
}

function timingSafeMatch(input, expected) {
    const a = Buffer.from(String(input), 'utf8');
    const b = Buffer.from(String(expected), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/auth/login
 * Validates USN format, creates user in users table if new, and returns JWT.
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
            .select('*')
            .eq('usn', parsed.usn)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            const { data: created, error: insertError } = await supabase
                .from('users')
                .insert({
                    usn: parsed.usn,
                    department: parsed.department,
                    department_code: parsed.departmentCode,
                    academic_year: parsed.year,
                    roll_no: parsed.rollNo,
                    role: 'student',
                })
                .select('*')
                .single();

            if (insertError) throw insertError;
            user = created;
        }

        const token = signToken(user);
        return res.json({
            user: formatUser(user),
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

        const initialPassword = process.env.ADMIN_PASSWORD || 'hey1234';

        let { data: admin, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!admin) {
            const passwordHash = await bcrypt.hash(initialPassword, 10);
            const { data: created, error: insertError } = await supabase
                .from('users')
                .insert({
                    usn: 'ADMIN',
                    department: 'System Administration',
                    department_code: 'CS',
                    academic_year: '00',
                    roll_no: '000',
                    role: 'admin',
                    password_hash: passwordHash,
                })
                .select('*')
                .single();

            if (insertError) throw insertError;
            admin = created;
        }

        const valid = admin.password_hash
            ? await bcrypt.compare(password, admin.password_hash)
            : timingSafeMatch(password, initialPassword);

        if (!valid) {
            return res.status(401).json({ error: 'INVALID CREDENTIALS' });
        }

        const token = signToken(admin);
        return res.json({
            user: formatUser(admin),
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
            .select('*')
            .eq('usn', req.user.usn)
            .maybeSingle();

        if (error) throw error;
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            user: formatUser(user),
        });
    } catch (err) {
        next(err);
    }
};
