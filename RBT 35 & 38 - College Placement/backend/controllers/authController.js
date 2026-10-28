const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to validate email format
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
};

// ==========================================
// 1. STUDENT REGISTRATION (Atomic Transaction)
// ==========================================
exports.registerStudent = async (req, res) => {
    let connection;
    try {
        const {
            name,
            email,
            password,
            confirm_password,
            enrollment_number,
            phone,
            department_id,
            graduation_year,
            cgpa,
            backlogs,
            resume_url
        } = req.body;

        // Validation
        if (!name || !email || !password || !enrollment_number || !department_id) {
            return res.status(400).json({
                message: 'Name, email, password, enrollment number, and department are required.'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        const numCgpa = parseFloat(cgpa !== undefined && cgpa !== '' ? cgpa : 0.0);
        if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
            return res.status(400).json({ message: 'CGPA must be a valid number between 0.00 and 10.00.' });
        }

        const numBacklogs = parseInt(backlogs !== undefined && backlogs !== '' ? backlogs : 0, 10);
        if (isNaN(numBacklogs) || numBacklogs < 0) {
            return res.status(400).json({ message: 'Backlogs count cannot be negative.' });
        }

        const gradYear = parseInt(graduation_year, 10) || new Date().getFullYear();

        connection = await db.getConnection();

        // 1. Check duplicate email in users table
        const [existingEmail] = await connection.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existingEmail.length > 0) {
            connection.release();
            return res.status(409).json({ message: 'An account with this email address already exists.' });
        }

        // 2. Check duplicate enrollment_number in students table
        const [existingEnr] = await connection.execute('SELECT id FROM students WHERE enrollment_number = ?', [enrollment_number.trim()]);
        if (existingEnr.length > 0) {
            connection.release();
            return res.status(409).json({ message: 'A student with this enrollment number is already registered.' });
        }

        // 3. Check department validity
        const [deptCheck] = await connection.execute('SELECT id, name, code FROM departments WHERE id = ?', [department_id]);
        if (deptCheck.length === 0) {
            connection.release();
            return res.status(400).json({ message: 'Selected department does not exist.' });
        }

        // BEGIN TRANSACTION
        await connection.beginTransaction();

        const password_hash = await bcrypt.hash(password, 10);

        // Insert into users
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), password_hash, 'student']
        );
        const userId = userResult.insertId;

        // Insert into students
        await connection.execute(
            `INSERT INTO students (user_id, enrollment_number, phone, department_id, graduation_year, cgpa, backlogs, resume_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                enrollment_number.trim().toUpperCase(),
                phone?.trim() || '',
                department_id,
                gradYear,
                numCgpa,
                numBacklogs,
                resume_url?.trim() || ''
            ]
        );

        // COMMIT TRANSACTION
        await connection.commit();
        connection.release();

        // Generate JWT token
        const token = jwt.sign(
            { id: userId, role: 'student' },
            process.env.JWT_SECRET || 'super_secret_jwt_key_placement_2024',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Student account registered successfully!',
            token,
            user: {
                id: userId,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role: 'student',
                profile: {
                    user_id: userId,
                    enrollment_number: enrollment_number.trim().toUpperCase(),
                    department_id,
                    department_name: deptCheck[0].name,
                    department_code: deptCheck[0].code,
                    graduation_year: gradYear,
                    cgpa: numCgpa,
                    backlogs: numBacklogs,
                    phone: phone?.trim() || '',
                    resume_url: resume_url?.trim() || ''
                }
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (rbErr) {}
            connection.release();
        }
        console.error('registerStudent error:', error);
        res.status(500).json({ message: 'Server error during student registration', error: error.message });
    }
};

// ==========================================
// 2. COMPANY REGISTRATION (Atomic Transaction)
// ==========================================
exports.registerCompany = async (req, res) => {
    let connection;
    try {
        const {
            company_name,
            name, // Contact person name
            email,
            password,
            confirm_password,
            phone,
            website,
            industry,
            location,
            description
        } = req.body;

        // Validation
        if (!company_name || !email || !password) {
            return res.status(400).json({
                message: 'Company name, official email address, and password are required.'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid official email address.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        connection = await db.getConnection();

        // Check duplicate email
        const [existingEmail] = await connection.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existingEmail.length > 0) {
            connection.release();
            return res.status(409).json({ message: 'An account with this email address already exists.' });
        }

        // BEGIN TRANSACTION
        await connection.beginTransaction();

        const password_hash = await bcrypt.hash(password, 10);
        const contactPerson = (name && name.trim()) ? name.trim() : company_name.trim();

        // Insert into users
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [contactPerson, email.trim().toLowerCase(), password_hash, 'company']
        );
        const userId = userResult.insertId;

        // Insert into companies (Auto-approved so companies can immediately demo features)
        const [companyResult] = await connection.execute(
            `INSERT INTO companies (user_id, company_name, description, industry, website, location, contact_email, phone, approval_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
            [
                userId,
                company_name.trim(),
                description?.trim() || '',
                industry?.trim() || 'Technology',
                website?.trim() || '',
                location?.trim() || '',
                email.trim().toLowerCase(),
                phone?.trim() || ''
            ]
        );

        // COMMIT TRANSACTION
        await connection.commit();
        connection.release();

        const token = jwt.sign(
            { id: userId, role: 'company' },
            process.env.JWT_SECRET || 'super_secret_jwt_key_placement_2024',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Company recruiter account registered successfully!',
            token,
            user: {
                id: userId,
                name: contactPerson,
                email: email.trim().toLowerCase(),
                role: 'company',
                profile: {
                    id: companyResult.insertId,
                    user_id: userId,
                    company_name: company_name.trim(),
                    industry: industry?.trim() || 'Technology',
                    website: website?.trim() || '',
                    location: location?.trim() || '',
                    contact_email: email.trim().toLowerCase(),
                    phone: phone?.trim() || '',
                    approval_status: 'approved'
                }
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (rbErr) {}
            connection.release();
        }
        console.error('registerCompany error:', error);
        res.status(500).json({ message: 'Server error during company registration', error: error.message });
    }
};

// ==========================================
// 3. GENERAL REGISTER DISPATCHER
// ==========================================
exports.register = async (req, res) => {
    const role = req.body.role;

    // Reject public admin registration strictly
    if (role === 'admin' || req.body.isAdmin) {
        return res.status(403).json({
            message: 'Security Alert: Public administrator registration is prohibited. Admin accounts are restricted.'
        });
    }

    if (role === 'student') {
        return exports.registerStudent(req, res);
    } else if (role === 'company') {
        return exports.registerCompany(req, res);
    } else {
        return res.status(400).json({
            message: 'Invalid registration role. Please select either Student or Company.'
        });
    }
};

// ==========================================
// 4. LOGIN (All Roles: Student, Company, Admin)
// ==========================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Fetch associated profile
        let profile = null;
        if (user.role === 'student') {
            const [students] = await db.execute(
                `SELECT s.*, d.name as department_name, d.code as department_code 
                 FROM students s 
                 LEFT JOIN departments d ON s.department_id = d.id 
                 WHERE s.user_id = ?`, 
                [user.id]
            );
            if (students.length > 0) profile = students[0];
        } else if (user.role === 'company') {
            const [companies] = await db.execute('SELECT * FROM companies WHERE user_id = ?', [user.id]);
            if (companies.length > 0) profile = companies[0];
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'super_secret_jwt_key_placement_2024',
            { expiresIn: '7d' }
        );

        // Never expose password_hash
        const { password_hash, ...safeUser } = user;

        res.json({ 
            token, 
            user: { 
                id: safeUser.id, 
                name: safeUser.name, 
                email: safeUser.email, 
                role: safeUser.role,
                profile 
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// ==========================================
// 5. CURRENT USER (GET /api/auth/me)
// ==========================================
exports.getMe = async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = users[0];
        let profile = null;

        if (user.role === 'student') {
            const [students] = await db.execute(
                `SELECT s.*, d.name as department_name, d.code as department_code 
                 FROM students s 
                 LEFT JOIN departments d ON s.department_id = d.id 
                 WHERE s.user_id = ?`, 
                [user.id]
            );
            if (students.length > 0) profile = students[0];
        } else if (user.role === 'company') {
            const [companies] = await db.execute('SELECT * FROM companies WHERE user_id = ?', [user.id]);
            if (companies.length > 0) profile = companies[0];
        }

        res.json({ user: { ...user, profile } });
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
