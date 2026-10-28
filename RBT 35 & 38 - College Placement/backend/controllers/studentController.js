const db = require('../config/db');

// Helper to compute eligibility
function checkDriveEligibility(student, drive) {
    const reasons = [];
    let isEligible = true;

    // Minimum CGPA
    if (parseFloat(student.cgpa) < parseFloat(drive.minimum_cgpa)) {
        isEligible = false;
        reasons.push(`Minimum CGPA required is ${drive.minimum_cgpa}. Your CGPA: ${student.cgpa}`);
    }

    // Maximum backlogs
    if (parseInt(student.backlogs) > parseInt(drive.maximum_backlogs)) {
        isEligible = false;
        reasons.push(`Maximum allowed backlogs: ${drive.maximum_backlogs}. Your backlogs: ${student.backlogs}`);
    }

    // Eligible branches
    if (drive.eligible_branches) {
        const allowedBranches = drive.eligible_branches.split(',').map(b => b.trim().toUpperCase());
        const studentBranch = (student.department_code || '').trim().toUpperCase();
        if (!allowedBranches.includes(studentBranch) && !allowedBranches.includes('ALL')) {
            isEligible = false;
            reasons.push(`Eligible branches are: ${drive.eligible_branches}. Your branch: ${student.department_code || 'Unknown'}`);
        }
    }

    // Graduation year
    if (drive.graduation_year && parseInt(student.graduation_year) !== parseInt(drive.graduation_year)) {
        isEligible = false;
        reasons.push(`Target graduation year is ${drive.graduation_year}. Your graduation year: ${student.graduation_year}`);
    }

    // Deadline check
    if (drive.application_deadline && new Date(drive.application_deadline) < new Date()) {
        isEligible = false;
        reasons.push(`Application deadline expired on ${new Date(drive.application_deadline).toLocaleDateString()}`);
    }

    return { isEligible, reasons };
}

exports.getProfile = async (req, res) => {
    try {
        const [students] = await db.execute(
            `SELECT s.*, u.name, u.email, d.name as department_name, d.code as department_code 
             FROM students s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.user_id = ?`,
            [req.user.id]
        );

        if (students.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        res.json(students[0]);
    } catch (error) {
        console.error('getProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, department_id, graduation_year, cgpa, backlogs, resume_url, enrollment_number } = req.body;

        if (name) {
            await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
        }

        const [existing] = await db.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);

        if (existing.length === 0) {
            await db.execute(
                `INSERT INTO students (user_id, enrollment_number, phone, department_id, graduation_year, cgpa, backlogs, resume_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, enrollment_number || `ENR${Date.now()}`, phone || '', department_id || 1, graduation_year || 2024, cgpa || 0, backlogs || 0, resume_url || '']
            );
        } else {
            await db.execute(
                `UPDATE students 
                 SET enrollment_number = COALESCE(?, enrollment_number),
                     phone = COALESCE(?, phone),
                     department_id = COALESCE(?, department_id),
                     graduation_year = COALESCE(?, graduation_year),
                     cgpa = COALESCE(?, cgpa),
                     backlogs = COALESCE(?, backlogs),
                     resume_url = COALESCE(?, resume_url)
                 WHERE user_id = ?`,
                [enrollment_number, phone, department_id, graduation_year, cgpa, backlogs, resume_url, req.user.id]
            );
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getEligibleDrives = async (req, res) => {
    try {
        // Get student details
        const [students] = await db.execute(
            `SELECT s.*, d.code as department_code 
             FROM students s
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.user_id = ?`,
            [req.user.id]
        );

        if (students.length === 0) {
            return res.status(400).json({ message: 'Complete profile first' });
        }
        const student = students[0];

        // Fetch drives with company details and application status if already applied
        const [drives] = await db.execute(
            `SELECT d.*, c.company_name, c.industry, c.location as company_location,
                    a.id as application_id, a.status as application_status
             FROM placement_drives d
             JOIN companies c ON d.company_id = c.id
             LEFT JOIN applications a ON (a.drive_id = d.id AND a.student_id = ?)
             WHERE c.approval_status = 'approved'
             ORDER BY d.created_at DESC`,
            [student.id]
        );

        // Evaluate eligibility for each drive
        const drivesWithEligibility = drives.map(drive => {
            const { isEligible, reasons } = checkDriveEligibility(student, drive);
            return {
                ...drive,
                is_eligible: isEligible,
                eligibility_reasons: reasons,
                has_applied: !!drive.application_id
            };
        });

        res.json(drivesWithEligibility);
    } catch (error) {
        console.error('getEligibleDrives error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getStudentApplications = async (req, res) => {
    try {
        const [students] = await db.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (students.length === 0) return res.json([]);

        const [apps] = await db.execute(
            `SELECT a.id, a.application_date, a.status, a.created_at,
                    d.id as drive_id, d.job_title, d.package, d.location, d.drive_date,
                    c.company_name, c.website
             FROM applications a
             JOIN placement_drives d ON a.drive_id = d.id
             JOIN companies c ON d.company_id = c.id
             WHERE a.student_id = ?
             ORDER BY a.application_date DESC`,
            [students[0].id]
        );

        res.json(apps);
    } catch (error) {
        console.error('getStudentApplications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStudentSelections = async (req, res) => {
    try {
        const [students] = await db.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (students.length === 0) return res.json([]);

        const [selections] = await db.execute(
            `SELECT sel.*, c.company_name, c.website, d.job_title
             FROM selections sel
             JOIN companies c ON sel.company_id = c.id
             JOIN applications a ON sel.application_id = a.id
             JOIN placement_drives d ON a.drive_id = d.id
             WHERE sel.student_id = ?`,
            [students[0].id]
        );

        res.json(selections);
    } catch (error) {
        console.error('getStudentSelections error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const [students] = await db.execute(
            `SELECT s.*, u.name, u.email, d.name as department_name, d.code as department_code
             FROM students s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN departments d ON s.department_id = d.id
             ORDER BY s.id DESC`
        );
        res.json(students);
    } catch (error) {
        console.error('getAllStudents error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const [students] = await db.execute(
            `SELECT s.*, u.name, u.email, d.name as department_name, d.code as department_code
             FROM students s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.id = ?`,
            [req.params.id]
        );

        if (students.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(students[0]);
    } catch (error) {
        console.error('getStudentById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
