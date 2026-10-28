const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const [companies] = await db.execute(
            `SELECT c.*, u.name as user_name, u.email as account_email 
             FROM companies c
             JOIN users u ON c.user_id = u.id
             WHERE c.user_id = ?`,
            [req.user.id]
        );

        if (companies.length === 0) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        res.json(companies[0]);
    } catch (error) {
        console.error('getProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { company_name, description, industry, website, location, contact_email, phone } = req.body;

        const [existing] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);

        if (existing.length === 0) {
            await db.execute(
                `INSERT INTO companies (user_id, company_name, description, industry, website, location, contact_email, phone, approval_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [req.user.id, company_name || '', description || '', industry || '', website || '', location || '', contact_email || '', phone || '']
            );
        } else {
            await db.execute(
                `UPDATE companies 
                 SET company_name = COALESCE(?, company_name),
                     description = COALESCE(?, description),
                     industry = COALESCE(?, industry),
                     website = COALESCE(?, website),
                     location = COALESCE(?, location),
                     contact_email = COALESCE(?, contact_email),
                     phone = COALESCE(?, phone)
                 WHERE user_id = ?`,
                [company_name, description, industry, website, location, contact_email, phone, req.user.id]
            );
        }

        res.json({ message: 'Company profile updated successfully' });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getCompanyDrives = async (req, res) => {
    try {
        const [companies] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
        if (companies.length === 0) return res.status(404).json({ message: 'Company profile not found' });

        const [drives] = await db.execute(
            `SELECT d.*, 
                    (SELECT COUNT(*) FROM applications WHERE drive_id = d.id) as total_applicants,
                    (SELECT COUNT(*) FROM applications WHERE drive_id = d.id AND status = 'Shortlisted') as shortlisted_count,
                    (SELECT COUNT(*) FROM applications WHERE drive_id = d.id AND status = 'Selected') as selected_count
             FROM placement_drives d
             WHERE d.company_id = ?
             ORDER BY d.created_at DESC`,
            [companies[0].id]
        );

        res.json(drives);
    } catch (error) {
        console.error('getCompanyDrives error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getApplicants = async (req, res) => {
    try {
        const [companies] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
        if (companies.length === 0) return res.status(404).json({ message: 'Company not found' });

        const companyId = companies[0].id;
        const { drive_id, status } = req.query;

        let query = `
            SELECT a.id as application_id, a.application_date, a.status,
                   s.id as student_id, s.enrollment_number, s.phone, s.cgpa, s.backlogs, s.graduation_year, s.resume_url,
                   u.name as student_name, u.email as student_email,
                   d.name as department_name, d.code as department_code,
                   pd.id as drive_id, pd.job_title, pd.package
            FROM applications a
            JOIN placement_drives pd ON a.drive_id = pd.id
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE pd.company_id = ?
        `;
        const params = [companyId];

        if (drive_id) {
            query += ' AND pd.id = ?';
            params.push(drive_id);
        }

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.application_date DESC';

        const [applicants] = await db.execute(query, params);
        res.json(applicants);
    } catch (error) {
        console.error('getApplicants error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateApplicantStatus = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { status, package: offerPackage, joining_date } = req.body;

        const allowedStatuses = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Verify company owns the application
        const [companies] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
        if (companies.length === 0) return res.status(403).json({ message: 'Unauthorized' });

        const [apps] = await db.execute(
            `SELECT a.*, pd.company_id, pd.package as default_package 
             FROM applications a 
             JOIN placement_drives pd ON a.drive_id = pd.id 
             WHERE a.id = ?`,
            [application_id]
        );

        if (apps.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const app = apps[0];
        if (app.company_id !== companies[0].id) {
            return res.status(403).json({ message: 'You do not have permission to manage this applicant' });
        }

        // Update application status
        await db.execute('UPDATE applications SET status = ? WHERE id = ?', [status, application_id]);

        // If status changed to Selected, record in selections table
        if (status === 'Selected') {
            const finalPackage = offerPackage || app.default_package || 0;
            const finalDate = joining_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Check if selection already exists
            const [selExisting] = await db.execute('SELECT id FROM selections WHERE application_id = ?', [application_id]);
            if (selExisting.length === 0) {
                await db.execute(
                    `INSERT INTO selections (application_id, student_id, company_id, package, joining_date, result)
                     VALUES (?, ?, ?, ?, ?, 'Selected')`,
                    [application_id, app.student_id, app.company_id, finalPackage, finalDate]
                );
            } else {
                await db.execute(
                    `UPDATE selections SET package = ?, joining_date = ? WHERE application_id = ?`,
                    [finalPackage, finalDate, application_id]
                );
            }
        } else {
            // If reverted from Selected to something else, remove selection record
            await db.execute('DELETE FROM selections WHERE application_id = ?', [application_id]);
        }

        res.json({ message: `Applicant status updated to ${status}` });
    } catch (error) {
        console.error('updateApplicantStatus error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getSelectionResults = async (req, res) => {
    try {
        const [companies] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
        if (companies.length === 0) return res.status(404).json({ message: 'Company not found' });

        const [selections] = await db.execute(
            `SELECT sel.*, u.name as student_name, u.email as student_email, s.enrollment_number,
                    d.name as department_name, pd.job_title
             FROM selections sel
             JOIN students s ON sel.student_id = s.id
             JOIN users u ON s.user_id = u.id
             LEFT JOIN departments d ON s.department_id = d.id
             JOIN applications a ON sel.application_id = a.id
             JOIN placement_drives pd ON a.drive_id = pd.id
             WHERE sel.company_id = ?
             ORDER BY sel.created_at DESC`,
            [companies[0].id]
        );

        res.json(selections);
    } catch (error) {
        console.error('getSelectionResults error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllCompanies = async (req, res) => {
    try {
        const isStudentOrPublic = !req.user || req.user.role === 'student';
        let query = 'SELECT * FROM companies';
        if (isStudentOrPublic) {
            query += " WHERE approval_status = 'approved'";
        }
        query += ' ORDER BY company_name ASC';

        const [companies] = await db.execute(query);
        res.json(companies);
    } catch (error) {
        console.error('getAllCompanies error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCompanyById = async (req, res) => {
    try {
        const [companies] = await db.execute('SELECT * FROM companies WHERE id = ?', [req.params.id]);
        if (companies.length === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.json(companies[0]);
    } catch (error) {
        console.error('getCompanyById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
