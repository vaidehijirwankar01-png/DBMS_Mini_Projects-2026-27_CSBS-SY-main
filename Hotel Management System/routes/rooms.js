// =====================================================================
// Rooms API Routes (routes/rooms.js)
// Parameterized SQL queries, available rooms filter, CRUD operations
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { logActivity } = require('../db/mongo');

// GET /api/rooms - List all rooms with hotel info and optional status filter
router.get('/', async (req, res, next) => {
  try {
    const { status, room_type } = req.query;
    let query = `
      SELECT r.hotel_id, h.hotel_name, r.room_no, r.room_type, 
             r.price_per_night, r.capacity, r.availability
      FROM room r
      JOIN hotel h ON r.hotel_id = h.hotel_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.availability = ?';
      params.push(status);
    }
    if (room_type) {
      query += ' AND r.room_type = ?';
      params.push(room_type);
    }

    query += ' ORDER BY r.hotel_id, CAST(r.room_no AS UNSIGNED), r.room_no';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/available - Query available rooms for specific dates and guest count
router.get('/available', async (req, res, next) => {
  try {
    const { check_in, check_out, people, room_type } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({ 
        success: false, 
        error: 'check_in and check_out query parameters are required.' 
      });
    }

    let query = `
      SELECT r.hotel_id, h.hotel_name, r.room_no, r.room_type, 
             r.price_per_night, r.capacity, r.availability
      FROM room r
      JOIN hotel h ON r.hotel_id = h.hotel_id
      WHERE r.availability != 'Maintenance'
        AND NOT EXISTS (
          SELECT 1 FROM booking b
          WHERE b.hotel_id = r.hotel_id 
            AND b.room_no = r.room_no
            AND b.status IN ('Booked', 'Checked-in')
            AND NOT (? <= b.check_in OR ? >= b.check_out)
        )
    `;
    const params = [check_out, check_in];

    if (people) {
      query += ' AND r.capacity >= ?';
      params.push(parseInt(people, 10));
    }
    if (room_type) {
      query += ' AND r.room_type = ?';
      params.push(room_type);
    }

    query += ' ORDER BY r.price_per_night ASC, CAST(r.room_no AS UNSIGNED)';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms - Add a new room
router.post('/', async (req, res, next) => {
  try {
    const { hotel_id = 1, room_no, room_type, price_per_night, capacity, availability = 'Available', performed_by } = req.body;

    if (!room_no || !room_type || !price_per_night || !capacity) {
      return res.status(400).json({ 
        success: false, 
        error: 'room_no, room_type, price_per_night, and capacity are required.' 
      });
    }

    await pool.query(
      `INSERT INTO room (hotel_id, room_no, room_type, price_per_night, capacity, availability)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hotel_id, room_no, room_type, price_per_night, capacity, availability]
    );

    await logActivity({
      action: 'ADD_ROOM',
      entity: 'room',
      entity_id: `${hotel_id}-${room_no}`,
      performed_by,
      details: { hotel_id, room_no, room_type, price_per_night, capacity, availability }
    });

    res.status(201).json({ 
      success: true, 
      message: `Room ${room_no} added successfully.`,
      data: { hotel_id, room_no, room_type, price_per_night, capacity, availability }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:hotelId/:roomNo - Edit room details
router.put('/:hotelId/:roomNo', async (req, res, next) => {
  try {
    const { hotelId, roomNo } = req.params;
    const { room_type, price_per_night, capacity, availability, performed_by } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM room WHERE hotel_id = ? AND room_no = ?',
      [hotelId, roomNo]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    await pool.query(
      `UPDATE room 
       SET room_type = COALESCE(?, room_type),
           price_per_night = COALESCE(?, price_per_night),
           capacity = COALESCE(?, capacity),
           availability = COALESCE(?, availability)
       WHERE hotel_id = ? AND room_no = ?`,
      [room_type, price_per_night, capacity, availability, hotelId, roomNo]
    );

    await logActivity({
      action: 'EDIT_ROOM',
      entity: 'room',
      entity_id: `${hotelId}-${roomNo}`,
      performed_by,
      details: { old: existing[0], updated: { room_type, price_per_night, capacity, availability } }
    });

    res.json({ success: true, message: `Room ${roomNo} updated successfully.` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:hotelId/:roomNo - Delete a room
router.delete('/:hotelId/:roomNo', async (req, res, next) => {
  try {
    const { hotelId, roomNo } = req.params;
    const { performed_by } = req.body || {};

    await pool.query(
      'DELETE FROM room WHERE hotel_id = ? AND room_no = ?',
      [hotelId, roomNo]
    );

    await logActivity({
      action: 'DELETE_ROOM',
      entity: 'room',
      entity_id: `${hotelId}-${roomNo}`,
      performed_by,
      details: { hotelId, roomNo }
    });

    res.json({ success: true, message: `Room ${roomNo} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
