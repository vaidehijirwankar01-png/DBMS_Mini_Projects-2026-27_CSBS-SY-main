const db = require('../config/db');

exports.applyForDrive = async (req, res) => {
    try {
        const { drive_id } = req.body;
        if (!drive_id) {
            return res.status(400).json({ message: 'Drive ID is required' });
        }

        // 1. Fetch student info
        const [students] = await db.execute(
            `SELECT s.*, d.code as department_code 
             FROM students s 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE s.user_id = ?`,
            [req.user.id]
        );

        if (students.length === 0) {
            return res.status(400).json({ message: 'Please complete your student profile before applying' });
        }
        const student = students[0];

        // 2. Fetch drive info
        const [drives] = await db.execute(
            `SELECT d.*, c.company_name, c.approval_status 
             FROM placement_drives d
             JOIN companies c ON d.company_id = c.id
             WHERE d.id = ?`,
            [drive_id]
        );

        if (drives.length === 0) {
            return res.status(404).json({ message: 'Placement drive not found' });
        }
        const drive = drives[0];

        if (drive.approval_status !== 'approved') {
            return res.status(400).json({ message: 'Company is not yet approved by placement administration' });
        }

        // 3. Strict Backend Eligibility Validation
        const ineligibleReasons = [];

        if (parseFloat(student.cgpa) < parseFloat(drive.minimum_cgpa)) {
            ineligibleReasons.push(`Minimum CGPA required is ${drive.minimum_cgpa}. Your CGPA: ${student.cgpa}`);
        }

        if (parseInt(student.backlogs) > parseInt(drive.maximum_backlogs)) {
            ineligibleReasons.push(`Maximum allowed backlogs is ${drive.maximum_backlogs}. Your backlogs: ${student.backlogs}`);
        }

        if (drive.eligible_branches) {
            const branches = drive.eligible_branches.split(',').map(b => b.trim().toUpperCase());
            const studentBranch = (student.department_code || '').trim().toUpperCase();
            if (!branches.includes(studentBranch) && !branches.includes('ALL')) {
                ineligibleReasons.push(`Eligible branches are [${drive.eligible_branches}]. Your branch: ${student.department_code}`);
            }
        }

        if (drive.graduation_year && parseInt(student.graduation_year) !== parseInt(drive.graduation_year)) {
            ineligibleReasons.push(`Target graduation year is ${drive.graduation_year}. Your graduation year: ${student.graduation_year}`);
        }

        if (drive.application_deadline && new Date(drive.application_deadline) < new Date()) {
            ineligibleReasons.push(`Application deadline has passed (${new Date(drive.application_deadline).toLocaleDateString()})`);
        }

        if (ineligibleReasons.length > 0) {
            return res.status(403).json({
                message: 'You are not eligible for this placement drive',
                reasons: ineligibleReasons
            });
        }

        // 4. Check duplicate application
        const [existing] = await db.execute(
            'SELECT id FROM applications WHERE student_id = ? AND drive_id = ?',
            [student.id, drive_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'You have already applied for this placement drive' });
        }

        // 5. Insert application
        const [result] = await db.execute(
            'INSERT INTO applications (student_id, drive_id, status) VALUES (?, ?, ?)',
            [student.id, drive_id, 'Applied']
        );

        res.status(201).json({ 
            message: 'Application submitted successfully!', 
            applicationId: result.insertId 
        });
    } catch (error) {
        console.error('applyForDrive error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getApplicationsByStudent = async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const [apps] = await db.execute(
            `SELECT a.*, d.job_title, d.package, d.location, d.drive_date, c.company_name, c.website
             FROM applications a
             JOIN placement_drives d ON a.drive_id = d.id
             JOIN companies c ON d.company_id = c.id
             WHERE a.student_id = ?
             ORDER BY a.application_date DESC`,
            [studentId]
        );

        res.json(apps);
    } catch (error) {
        console.error('getApplicationsByStudent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getApplicationsByDrive = async (req, res) => {
    try {
        const driveId = req.params.driveId;

        const [apps] = await db.execute(
            `SELECT a.*, s.enrollment_number, s.phone, s.cgpa, s.backlogs, s.graduation_year, s.resume_url,
                    u.name as student_name, u.email as student_email,
                    d.name as department_name, d.code as department_code
             FROM applications a
             JOIN students s ON a.student_id = s.id
             JOIN users u ON s.user_id = u.id
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE a.drive_id = ?
             ORDER BY a.application_date DESC`,
            [driveId]
        );

        res.json(apps);
    } catch (error) {
        console.error('getApplicationsByDrive error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, package: offerPackage, joining_date } = req.body;

        const validStatuses = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const [apps] = await db.execute(
            `SELECT a.*, pd.company_id, pd.package as default_package 
             FROM applications a 
             JOIN placement_drives pd ON a.drive_id = pd.id 
             WHERE a.id = ?`, 
            [id]
        );

        if (apps.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        const app = apps[0];

        await db.execute('UPDATE applications SET status = ? WHERE id = ?', [status, id]);

        if (status === 'Selected') {
            const finalPackage = offerPackage || app.default_package || 0;
            const finalDate = joining_date || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const [selExisting] = await db.execute('SELECT id FROM selections WHERE application_id = ?', [id]);
            if (selExisting.length === 0) {
                await db.execute(
                    `INSERT INTO selections (application_id, student_id, company_id, package, joining_date, result)
                     VALUES (?, ?, ?, ?, ?, 'Selected')`,
                    [id, app.student_id, app.company_id, finalPackage, finalDate]
                );
            } else {
                await db.execute(
                    `UPDATE selections SET package = ?, joining_date = ? WHERE application_id = ?`,
                    [finalPackage, finalDate, id]
                );
            }
        } else {
            await db.execute('DELETE FROM selections WHERE application_id = ?', [id]);
        }

        res.json({ message: `Application status updated to ${status}` });
    } catch (error) {
        console.error('updateStatus error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
