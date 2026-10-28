const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // Real SQL Aggregations as required by prompt
        const [[{ total_students }]] = await db.execute('SELECT COUNT(*) as total_students FROM students');
        const [[{ total_companies }]] = await db.execute('SELECT COUNT(*) as total_companies FROM companies');
        const [[{ approved_companies }]] = await db.execute("SELECT COUNT(*) as approved_companies FROM companies WHERE approval_status = 'approved'");
        const [[{ active_drives }]] = await db.execute("SELECT COUNT(*) as active_drives FROM placement_drives WHERE status = 'active'");
        const [[{ total_applications }]] = await db.execute('SELECT COUNT(*) as total_applications FROM applications');
        
        // Selections and package metrics
        const [[selectionsMetric]] = await db.execute(`
            SELECT 
                COUNT(DISTINCT student_id) as total_selected_students,
                COALESCE(AVG(package), 0) as average_package,
                COALESCE(MAX(package), 0) as highest_package
            FROM selections
        `);

        const total_selected_students = selectionsMetric.total_selected_students || 0;
        const average_package = Number(selectionsMetric.average_package).toFixed(2);
        const highest_package = Number(selectionsMetric.highest_package).toFixed(2);

        const placement_percentage = total_students > 0 
            ? ((total_selected_students / total_students) * 100).toFixed(1) 
            : 0;

        // Department-wise distribution
        const [departmentStats] = await db.execute(`
            SELECT d.name as department_name, d.code,
                   COUNT(DISTINCT s.id) as total_students,
                   COUNT(DISTINCT sel.student_id) as placed_students,
                   COALESCE(AVG(sel.package), 0) as avg_package
            FROM departments d
            LEFT JOIN students s ON s.department_id = d.id
            LEFT JOIN selections sel ON sel.student_id = s.id
            GROUP BY d.id, d.name, d.code
        `);

        // Recent applications
        const [recentApplications] = await db.execute(`
            SELECT a.id, a.application_date, a.status,
                   u.name as student_name, s.enrollment_number,
                   c.company_name, pd.job_title
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN placement_drives pd ON a.drive_id = pd.id
            JOIN companies c ON pd.company_id = c.id
            ORDER BY a.created_at DESC
            LIMIT 5
        `);

        res.json({
            stats: {
                total_students,
                total_companies,
                approved_companies,
                active_drives,
                total_applications,
                total_selected_students,
                placement_percentage,
                average_package,
                highest_package
            },
            departmentStats,
            recentApplications
        });
    } catch (error) {
        console.error('getDashboardStats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const [students] = await db.execute(`
            SELECT s.*, u.name, u.email, d.name as department_name, d.code as department_code,
                   (SELECT COUNT(*) FROM applications WHERE student_id = s.id) as total_applied,
                   (SELECT COUNT(*) FROM selections WHERE student_id = s.id) as is_placed
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN departments d ON s.department_id = d.id
            ORDER BY s.id DESC
        `);
        res.json(students);
    } catch (error) {
        console.error('getAllStudents error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllCompanies = async (req, res) => {
    try {
        const [companies] = await db.execute(`
            SELECT c.*, u.name as contact_person, u.email as user_email,
                   (SELECT COUNT(*) FROM placement_drives WHERE company_id = c.id) as total_drives
            FROM companies c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);
        res.json(companies);
    } catch (error) {
        console.error('getAllCompanies error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateCompanyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { approval_status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(approval_status)) {
            return res.status(400).json({ message: 'Invalid approval status' });
        }

        await db.execute('UPDATE companies SET approval_status = ? WHERE id = ?', [approval_status, id]);
        res.json({ message: `Company status updated to ${approval_status}` });
    } catch (error) {
        console.error('updateCompanyStatus error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllApplications = async (req, res) => {
    try {
        const [applications] = await db.execute(`
            SELECT a.*, s.enrollment_number, s.cgpa, u.name as student_name, u.email as student_email,
                   d.code as department_code,
                   pd.job_title, pd.package as drive_package,
                   c.company_name
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN placement_drives pd ON a.drive_id = pd.id
            JOIN companies c ON pd.company_id = c.id
            ORDER BY a.created_at DESC
        `);
        res.json(applications);
    } catch (error) {
        console.error('getAllApplications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllSelections = async (req, res) => {
    try {
        const [selections] = await db.execute(`
            SELECT sel.*, u.name as student_name, u.email as student_email,
                   s.enrollment_number, d.name as department_name, d.code as department_code,
                   c.company_name, pd.job_title
            FROM selections sel
            JOIN students s ON sel.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN companies c ON sel.company_id = c.id
            JOIN applications a ON sel.application_id = a.id
            JOIN placement_drives pd ON a.drive_id = pd.id
            ORDER BY sel.created_at DESC
        `);
        res.json(selections);
    } catch (error) {
        console.error('getAllSelections error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const [depts] = await db.execute(`
            SELECT d.*, COUNT(s.id) as student_count 
            FROM departments d 
            LEFT JOIN students s ON s.department_id = d.id 
            GROUP BY d.id 
            ORDER BY d.name ASC
        `);
        res.json(depts);
    } catch (error) {
        console.error('getDepartments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createDepartment = async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(400).json({ message: 'Name and code are required' });
        }

        const [existing] = await db.execute('SELECT id FROM departments WHERE code = ?', [code.toUpperCase()]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Department code already exists' });
        }

        const [result] = await db.execute(
            'INSERT INTO departments (name, code) VALUES (?, ?)',
            [name, code.toUpperCase()]
        );

        res.status(201).json({ message: 'Department created successfully', departmentId: result.insertId });
    } catch (error) {
        console.error('createDepartment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM departments WHERE id = ?', [id]);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('deleteDepartment error:', error);
        res.status(500).json({ message: 'Server error: Ensure no students are assigned to this department' });
    }
};

exports.getReports = async (req, res) => {
    try {
        // Advanced SQL Reports
        // 1. Company recruitment performance
        const [companyReport] = await db.execute(`
            SELECT c.company_name, c.industry,
                   COUNT(DISTINCT pd.id) as drives_conducted,
                   COUNT(DISTINCT a.id) as total_applicants,
                   COUNT(DISTINCT sel.id) as students_hired,
                   COALESCE(AVG(sel.package), 0) as avg_package_offered
            FROM companies c
            LEFT JOIN placement_drives pd ON pd.company_id = c.id
            LEFT JOIN applications a ON a.drive_id = pd.id
            LEFT JOIN selections sel ON sel.company_id = c.id
            GROUP BY c.id, c.company_name, c.industry
            ORDER BY students_hired DESC
        `);

        // 2. Yearly placement summary
        const [yearlyReport] = await db.execute(`
            SELECT s.graduation_year,
                   COUNT(DISTINCT s.id) as total_candidates,
                   COUNT(DISTINCT sel.student_id) as placed_candidates,
                   COALESCE(AVG(sel.package), 0) as avg_package,
                   COALESCE(MAX(sel.package), 0) as highest_package
            FROM students s
            LEFT JOIN selections sel ON sel.student_id = s.id
            GROUP BY s.graduation_year
            ORDER BY s.graduation_year DESC
        `);

        res.json({ companyReport, yearlyReport });
    } catch (error) {
        console.error('getReports error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
