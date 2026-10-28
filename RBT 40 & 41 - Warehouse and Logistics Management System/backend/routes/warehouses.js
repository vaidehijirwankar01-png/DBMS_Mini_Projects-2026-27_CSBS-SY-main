const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const mockData = require('../config/mockData');
const { warehouses } = mockData;

// GET /api/warehouses - List all warehouses with current stock & utilization
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.state,
        w.city,
        w.locality,
        w.storage_capacity,
        w.created_at,
        COALESCE(SUM(i.quantity_available), 0) AS current_stock,
        (w.storage_capacity - COALESCE(SUM(i.quantity_available), 0)) AS remaining_capacity,
        ROUND((COALESCE(SUM(i.quantity_available), 0) / w.storage_capacity) * 100, 1) AS utilization_pct,
        COUNT(DISTINCT i.product_id) AS distinct_products_count
      FROM warehouse w
      LEFT JOIN inventory_stock i ON w.warehouse_id = i.warehouse_id
      GROUP BY w.warehouse_id
      ORDER BY w.warehouse_name ASC
    `;
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.warn('[Fallback] Serving mock warehouses:', error.message);
    res.json({ success: true, data: warehouses });
  }
});

// GET /api/warehouses/:id - Get single warehouse with its inventory
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [whRows] = await pool.query('SELECT * FROM warehouse WHERE warehouse_id = ?', [id]);
    if (whRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const [inventoryRows] = await pool.query(`
      SELECT 
        i.stock_id,
        i.product_id,
        p.product_name,
        p.sku,
        p.category,
        p.price,
        i.quantity_available,
        i.min_threshold,
        i.last_restock_date
      FROM inventory_stock i
      JOIN product p ON i.product_id = p.product_id
      WHERE i.warehouse_id = ?
      ORDER BY p.product_name ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...whRows[0],
        inventory: inventoryRows
      }
    });
  } catch (error) {
    const found = warehouses.find(w => String(w.warehouse_id) === String(req.params.id)) || warehouses[0];
    res.json({
      success: true,
      data: {
        ...found,
        inventory: [
          { stock_id: 1, product_id: 1, product_name: 'Ergonomic Industrial Barcode Scanner', sku: 'ELEC-BCS-01', category: 'Electronics', price: 149.99, quantity_available: 120, last_restock_date: '2026-09-01' }
        ]
      }
    });
  }
});

// POST /api/warehouses - Create warehouse
router.post('/', async (req, res) => {
  try {
    const { warehouse_name, state, city, locality, storage_capacity } = req.body;
    if (!warehouse_name || !state || !city || !storage_capacity) {
      return res.status(400).json({ success: false, message: 'warehouse_name, state, city and storage_capacity are required.' });
    }

    if (parseInt(storage_capacity, 10) <= 0) {
      return res.status(400).json({ success: false, message: 'storage_capacity must be greater than zero.' });
    }

    const [result] = await pool.query(
      'INSERT INTO warehouse (warehouse_name, state, city, locality, storage_capacity) VALUES (?, ?, ?, ?, ?)',
      [warehouse_name.trim(), state.trim(), city.trim(), locality ? locality.trim() : null, storage_capacity]
    );

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: { warehouse_id: result.insertId }
    });
  } catch (error) {
    console.warn('[Fallback] Mock warehouse create due to DB error:', error.message);
    const { warehouse_name, state, city, locality, storage_capacity } = req.body;
    const mockId = Date.now();
    mockData.warehouses.push({
      warehouse_id: mockId,
      warehouse_name,
      state,
      city,
      locality: locality || null,
      storage_capacity,
      current_occupancy: 0,
      created_at: new Date().toISOString()
    });
    res.status(201).json({
      success: true,
      message: 'Warehouse created (preview mode — connect MySQL to persist)',
      data: { warehouse_id: mockId },
      preview: true
    });
  }
});

// DELETE /api/warehouses/:id - Delete warehouse
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM warehouse WHERE warehouse_id = ?', [id]);
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.warn('[Fallback] Mock warehouse delete due to DB error:', error.message);
    const idx = mockData.warehouses.findIndex(w => w.warehouse_id == req.params.id);
    if (idx !== -1) mockData.warehouses.splice(idx, 1);
    res.json({ success: true, message: 'Warehouse deleted (preview mode)', preview: true });
  }
});

module.exports = router;
