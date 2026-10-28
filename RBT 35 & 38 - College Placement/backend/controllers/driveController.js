const db = require('../config/db');

exports.getAllDrives = async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = `
            SELECT d.*, c.company_name, c.industry, c.location as company_location, c.website,
                   (SELECT COUNT(*) FROM applications WHERE drive_id = d.id) as total_applicants
            FROM placement_drives d
            JOIN companies c ON d.company_id = c.id
            WHERE c.approval_status = 'approved'
        `;
        const params = [];

        if (status) {
            query += ' AND d.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (d.job_title LIKE ? OR c.company_name LIKE ? OR d.eligible_branches LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += ' ORDER BY d.created_at DESC';

        const [drives] = await db.execute(query, params);
        res.json(drives);
    } catch (error) {
        console.error('getAllDrives error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getDriveById = async (req, res) => {
    try {
        const [drives] = await db.execute(
            `SELECT d.*, c.company_name, c.industry, c.website, c.description as company_description,
                    c.location as company_location, c.contact_email,
                    (SELECT COUNT(*) FROM applications WHERE drive_id = d.id) as total_applicants
             FROM placement_drives d
             JOIN companies c ON d.company_id = c.id
             WHERE d.id = ?`,
            [req.params.id]
        );

        if (drives.length === 0) {
            return res.status(404).json({ message: 'Placement drive not found' });
        }

        res.json(drives[0]);
    } catch (error) {
        console.error('getDriveById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createDrive = async (req, res) => {
    try {
        const {
            job_title, job_description, package: jobPackage, location,
            minimum_cgpa, maximum_backlogs, eligible_branches,
            graduation_year, application_deadline, drive_date, status
        } = req.body;

        if (!job_title || !job_description || !jobPackage || !minimum_cgpa || !eligible_branches) {
            return res.status(400).json({ message: 'Please provide all required drive fields' });
        }

        // Get company ID
        let companyId = req.body.company_id;
        if (req.user.role === 'company') {
            const [companies] = await db.execute('SELECT id, approval_status FROM companies WHERE user_id = ?', [req.user.id]);
            if (companies.length === 0) {
                return res.status(400).json({ message: 'Complete company profile first' });
            }
            if (companies[0].approval_status !== 'approved') {
                return res.status(403).json({ message: 'Your company profile is pending admin approval' });
            }
            companyId = companies[0].id;
        }

        if (!companyId) {
            return res.status(400).json({ message: 'Company ID is required' });
        }

        const [result] = await db.execute(
            `INSERT INTO placement_drives 
             (company_id, job_title, job_description, package, location, minimum_cgpa, 
              maximum_backlogs, eligible_branches, graduation_year, application_deadline, drive_date, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                job_title,
                job_description,
                jobPackage,
                location || 'Remote/On-site',
                minimum_cgpa,
                maximum_backlogs !== undefined ? maximum_backlogs : 0,
                eligible_branches,
                graduation_year || new Date().getFullYear(),
                application_deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                drive_date || new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                status || 'active'
            ]
        );

        res.status(201).json({ message: 'Placement drive created successfully', driveId: result.insertId });
    } catch (error) {
        console.error('createDrive error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateDrive = async (req, res) => {
    try {
        const driveId = req.params.id;
        const {
            job_title, job_description, package: jobPackage, location,
            minimum_cgpa, maximum_backlogs, eligible_branches,
            graduation_year, application_deadline, drive_date, status
        } = req.body;

        // Check ownership if company
        if (req.user.role === 'company') {
            const [companies] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
            if (companies.length === 0) return res.status(403).json({ message: 'Unauthorized' });

            const [drives] = await db.execute('SELECT company_id FROM placement_drives WHERE id = ?', [driveId]);
            if (drives.length === 0) return res.status(404).json({ message: 'Drive not found' });
            if (drives[0].company_id !== companies[0].id) {
                return res.status(403).json({ message: 'You do not own this drive' });
            }
        }

        await db.execute(
            `UPDATE placement_drives 
             SET job_title = COALESCE(?, job_title),
                 job_description = COALESCE(?, job_description),
                 package = COALESCE(?, package),
                 location = COALESCE(?, location),
                 minimum_cgpa = COALESCE(?, minimum_cgpa),
                 maximum_backlogs = COALESCE(?, maximum_backlogs),
                 eligible_branches = COALESCE(?, eligible_branches),
                 graduation_year = COALESCE(?, graduation_year),
                 application_deadline = COALESCE(?, application_deadline),
                 drive_date = COALESCE(?, drive_date),
                 status = COALESCE(?, status)
             WHERE id = ?`,
            [
                job_title, job_description, jobPackage, location,
                minimum_cgpa, maximum_backlogs, eligible_branches,
                graduation_year, application_deadline, drive_date, status,
                driveId
            ]
        );

        res.json({ message: 'Placement drive updated successfully' });
    } catch (error) {
        console.error('updateDrive error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteDrive = async (req, res) => {
    try {
        const driveId = req.params.id;

        // Check ownership if company
        if (req.user.role === 'company') {
            const [companies] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
            if (companies.length === 0) return res.status(403).json({ message: 'Unauthorized' });

            const [drives] = await db.execute('SELECT company_id FROM placement_drives WHERE id = ?', [driveId]);
            if (drives.length === 0) return res.status(404).json({ message: 'Drive not found' });
            if (drives[0].company_id !== companies[0].id) {
                return res.status(403).json({ message: 'You do not own this drive' });
            }
        }

        await db.execute('DELETE FROM placement_drives WHERE id = ?', [driveId]);
        res.json({ message: 'Placement drive deleted successfully' });
    } catch (error) {
        console.error('deleteDrive error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
