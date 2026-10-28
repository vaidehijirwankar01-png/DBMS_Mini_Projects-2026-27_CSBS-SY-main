const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [departments] = await db.execute('SELECT id, name, code FROM departments ORDER BY name ASC');
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
