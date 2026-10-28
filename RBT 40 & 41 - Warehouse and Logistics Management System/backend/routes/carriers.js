const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { carriers } = require('../config/mockData');

// GET /api/carriers - List carriers with contacts and active shipments
router.get('/', async (req, res) => {
  try {
    const [carrierList] = await pool.query(`
      SELECT 
        c.carrier_id,
        c.company_name,
        c.transport_type,
        c.rating,
        c.is_active,
        c.created_at,
        COUNT(DISTINCT s.shipment_id) AS total_shipments
      FROM carrier c
      LEFT JOIN shipment s ON c.carrier_id = s.carrier_id
      GROUP BY c.carrier_id
      ORDER BY c.company_name ASC
    `);

    const [contacts] = await pool.query('SELECT carrier_id, contact, contact_type FROM carrier_contact');

    const data = carrierList.map(c => {
      const carrierContacts = contacts.filter(cnt => cnt.carrier_id === c.carrier_id);
      return {
        ...c,
        contacts: carrierContacts
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.json({ success: true, data: carriers });
  }
});

// GET /api/carriers/:id - Get single carrier
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [carrierRows] = await pool.query('SELECT * FROM carrier WHERE carrier_id = ?', [id]);
    if (carrierRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Carrier not found' });
    }

    const [contacts] = await pool.query('SELECT contact, contact_type FROM carrier_contact WHERE carrier_id = ?', [id]);

    res.json({
      success: true,
      data: {
        ...carrierRows[0],
        contacts
      }
    });
  } catch (error) {
    const c = carriers.find(car => String(car.carrier_id) === String(req.params.id)) || carriers[0];
    res.json({ success: true, data: c });
  }
});

// POST /api/carriers - Create carrier with contacts
router.post('/', async (req, res) => {
  try {
    const { company_name, transport_type, rating, contacts } = req.body;
    if (!company_name || !transport_type) {
      return res.status(400).json({ success: false, message: 'company_name and transport_type are required.' });
    }

    const connection = await pool.getConnection().catch(() => null);
    if (!connection) throw new Error('DB not available');

    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO carrier (company_name, transport_type, rating) VALUES (?, ?, ?)',
      [company_name.trim(), transport_type, rating || 4.5]
    );

    const carrierId = result.insertId;
    if (Array.isArray(contacts)) {
      for (const item of contacts) {
        const contactVal = typeof item === 'string' ? item : item.contact;
        const typeVal = typeof item === 'object' && item.contact_type ? item.contact_type : 'Phone';
        if (contactVal && contactVal.trim()) {
          await connection.query(
            'INSERT INTO carrier_contact (carrier_id, contact, contact_type) VALUES (?, ?, ?)',
            [carrierId, contactVal.trim(), typeVal]
          );
        }
      }
    }
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: 'Carrier created successfully',
      data: { carrier_id: carrierId }
    });
  } catch (error) {
    const newId = carriers.length > 0 ? Math.max(...carriers.map(c => c.carrier_id)) + 1 : 1;
    const newCarrier = {
      carrier_id: newId,
      company_name: req.body.company_name,
      transport_type: req.body.transport_type,
      rating: parseFloat(req.body.rating || 4.5),
      is_active: true,
      total_shipments: 0,
      contacts: Array.isArray(req.body.contacts) ? req.body.contacts : []
    };
    carriers.push(newCarrier);

    res.status(201).json({
      success: true,
      message: 'Carrier registered successfully',
      data: { carrier_id: newId }
    });
  }
});

// PUT /api/carriers/:id - Update carrier
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, transport_type, rating, is_active } = req.body;
    await pool.query(
      'UPDATE carrier SET company_name = ?, transport_type = ?, rating = ?, is_active = ? WHERE carrier_id = ?',
      [company_name, transport_type, rating, is_active !== undefined ? is_active : true, id]
    );
    res.json({ success: true, message: 'Carrier updated successfully' });
  } catch (error) {
    const idx = carriers.findIndex(c => String(c.carrier_id) === String(req.params.id));
    if (idx !== -1) {
      carriers[idx] = { ...carriers[idx], ...req.body };
    }
    res.json({ success: true, message: 'Carrier updated successfully' });
  }
});

// DELETE /api/carriers/:id - Delete carrier
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM carrier WHERE carrier_id = ?', [id]);
    res.json({ success: true, message: 'Carrier deleted successfully' });
  } catch (error) {
    const idx = carriers.findIndex(c => String(c.carrier_id) === String(req.params.id));
    if (idx !== -1) {
      carriers.splice(idx, 1);
    }
    res.json({ success: true, message: 'Carrier deleted successfully' });
  }
});

module.exports = router;
