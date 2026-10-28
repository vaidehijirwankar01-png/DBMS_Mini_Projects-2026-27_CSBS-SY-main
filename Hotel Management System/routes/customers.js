// =====================================================================
// Customers API Routes (routes/customers.js)
// Parameterized SQL queries, search, add, edit
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { logActivity } = require('../db/mongo');

// GET /api/customers - List customers with search capability
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT cust_id, cust_name, phone_no, email, aadhar_no, address FROM customer WHERE 1=1';
    const params = [];

    if (search) {
      query += ` AND (
        cust_name LIKE ? OR 
        phone_no LIKE ? OR 
        email LIKE ? OR 
        aadhar_no LIKE ?
      )`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    query += ' ORDER BY cust_id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT cust_id, cust_name, phone_no, email, aadhar_no, address FROM customer WHERE cust_id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers - Add customer
router.post('/', async (req, res, next) => {
  try {
    const { cust_name, phone_no, email, aadhar_no, address, performed_by } = req.body;

    if (!cust_name || !phone_no || !email || !aadhar_no || !address) {
      return res.status(400).json({ 
        success: false, 
        error: 'cust_name, phone_no, email, aadhar_no, and address are required.' 
      });
    }

    if (!/^\d{12}$/.test(aadhar_no)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Aadhaar number must be exactly 12 digits.' 
      });
    }

    const [result] = await pool.query(
      `INSERT INTO customer (cust_name, phone_no, email, aadhar_no, address)
       VALUES (?, ?, ?, ?, ?)`,
      [cust_name, phone_no, email, aadhar_no, address]
    );

    const custId = result.insertId;

    await logActivity({
      action: 'ADD_CUSTOMER',
      entity: 'customer',
      entity_id: custId,
      performed_by,
      details: { cust_name, phone_no, email, aadhar_no }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Customer added successfully.', 
      data: { cust_id: custId, cust_name, phone_no, email, aadhar_no, address } 
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id - Edit customer
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cust_name, phone_no, email, aadhar_no, address, performed_by } = req.body;

    const [existing] = await pool.query('SELECT * FROM customer WHERE cust_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    if (aadhar_no && !/^\d{12}$/.test(aadhar_no)) {
      return res.status(400).json({ success: false, error: 'Aadhaar number must be exactly 12 digits.' });
    }

    await pool.query(
      `UPDATE customer 
       SET cust_name = COALESCE(?, cust_name),
           phone_no = COALESCE(?, phone_no),
           email = COALESCE(?, email),
           aadhar_no = COALESCE(?, aadhar_no),
           address = COALESCE(?, address)
       WHERE cust_id = ?`,
      [cust_name, phone_no, email, aadhar_no, address, id]
    );

    await logActivity({
      action: 'EDIT_CUSTOMER',
      entity: 'customer',
      entity_id: id,
      performed_by,
      details: { updatedFields: { cust_name, phone_no, email, aadhar_no, address } }
    });

    res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
