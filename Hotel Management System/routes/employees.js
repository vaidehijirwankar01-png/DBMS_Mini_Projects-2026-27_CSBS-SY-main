// =====================================================================
// Employees API Routes (routes/employees.js)
// Employee details and multivalued attribute 'skills'
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { logActivity } = require('../db/mongo');

// GET /api/employees - List all employees with their skills
router.get('/', async (req, res, next) => {
  try {
    const [employees] = await pool.query(`
      SELECT e.emp_id, e.hotel_id, h.hotel_name, e.emp_name, 
             e.phone_no, e.address, e.role
      FROM employee e
      JOIN hotel h ON e.hotel_id = h.hotel_id
      ORDER BY e.emp_id ASC
    `);

    const [skillsRows] = await pool.query('SELECT emp_id, skill FROM employee_skill');

    const skillsMap = {};
    for (const row of skillsRows) {
      if (!skillsMap[row.emp_id]) {
        skillsMap[row.emp_id] = [];
      }
      skillsMap[row.emp_id].push(row.skill);
    }

    const result = employees.map(emp => ({
      ...emp,
      skills: skillsMap[emp.emp_id] || []
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees - Add employee with skills
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { hotel_id = 1, emp_name, phone_no, address, role, skills = [], performed_by } = req.body;

    if (!emp_name || !phone_no || !address || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'emp_name, phone_no, address, and role are required.' 
      });
    }

    await conn.beginTransaction();

    const [empResult] = await conn.query(
      `INSERT INTO employee (hotel_id, emp_name, phone_no, address, role)
       VALUES (?, ?, ?, ?, ?)`,
      [hotel_id, emp_name, phone_no, address, role]
    );

    const empId = empResult.insertId;

    if (Array.isArray(skills) && skills.length > 0) {
      const skillValues = skills.filter(s => s && s.trim()).map(s => [empId, s.trim()]);
      if (skillValues.length > 0) {
        await conn.query('INSERT INTO employee_skill (emp_id, skill) VALUES ?', [skillValues]);
      }
    }

    await conn.commit();

    await logActivity({
      action: 'ADD_EMPLOYEE',
      entity: 'employee',
      entity_id: empId,
      performed_by,
      details: { emp_name, phone_no, role, skills }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Employee added successfully.',
      data: { emp_id: empId, hotel_id, emp_name, phone_no, address, role, skills }
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// PUT /api/employees/:id - Edit employee with skills
router.put('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { emp_name, phone_no, address, role, skills, performed_by } = req.body;

    await conn.beginTransaction();

    await conn.query(
      `UPDATE employee 
       SET emp_name = COALESCE(?, emp_name),
           phone_no = COALESCE(?, phone_no),
           address = COALESCE(?, address),
           role = COALESCE(?, role)
       WHERE emp_id = ?`,
      [emp_name, phone_no, address, role, id]
    );

    if (Array.isArray(skills)) {
      await conn.query('DELETE FROM employee_skill WHERE emp_id = ?', [id]);
      const skillValues = skills.filter(s => s && s.trim()).map(s => [id, s.trim()]);
      if (skillValues.length > 0) {
        await conn.query('INSERT INTO employee_skill (emp_id, skill) VALUES ?', [skillValues]);
      }
    }

    await conn.commit();

    await logActivity({
      action: 'EDIT_EMPLOYEE',
      entity: 'employee',
      entity_id: id,
      performed_by,
      details: { emp_name, phone_no, address, role, skills }
    });

    res.json({ success: true, message: 'Employee updated successfully.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
