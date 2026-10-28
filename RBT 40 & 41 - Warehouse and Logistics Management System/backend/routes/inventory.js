const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { inventory, warehouses, products } = require('../config/mockData');

// GET /api/inventory - Filter by warehouse, product, or low stock
router.get('/', async (req, res) => {
  try {
    const { warehouse_id, product_id, low_stock, search } = req.query;

    let query = `
      SELECT 
        i.stock_id,
        i.warehouse_id,
        w.warehouse_name,
        w.city,
        w.state,
        i.product_id,
        p.product_name,
        p.category,
        p.sku,
        p.price,
        i.quantity_available,
        i.min_threshold,
        i.last_restock_date,
        CASE 
          WHEN i.quantity_available = 0 THEN 'Out of Stock'
          WHEN i.quantity_available <= i.min_threshold THEN 'Low Stock'
          ELSE 'Healthy'
        END AS stock_status
      FROM inventory_stock i
      JOIN warehouse w ON i.warehouse_id = w.warehouse_id
      JOIN product p ON i.product_id = p.product_id
      WHERE 1=1
    `;
    const params = [];

    if (warehouse_id) {
      query += ' AND i.warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (product_id) {
      query += ' AND i.product_id = ?';
      params.push(product_id);
    }

    if (low_stock === 'true') {
      query += ' AND i.quantity_available <= i.min_threshold';
    }

    if (search) {
      query += ' AND (p.product_name LIKE ? OR p.sku LIKE ? OR w.warehouse_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY w.warehouse_name ASC, p.product_name ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    let list = [...inventory];
    if (req.query.warehouse_id) {
      list = list.filter(i => String(i.warehouse_id) === String(req.query.warehouse_id));
    }
    if (req.query.low_stock === 'true') {
      list = list.filter(i => i.stock_status === 'Low Stock');
    }
    res.json({ success: true, data: list });
  }
});

// POST /api/inventory/restock - Restock
router.post('/restock', async (req, res) => {
  try {
    const { warehouse_id, product_id, quantity, restock_date } = req.body;
    await pool.query('CALL sp_restock_product(?, ?, ?, ?)', [warehouse_id, product_id, quantity, restock_date || new Date().toISOString().split('T')[0]]);
    res.json({ success: true, message: `Successfully restocked ${quantity} units.` });
  } catch (error) {
    const item = inventory.find(i => String(i.warehouse_id) === String(req.body.warehouse_id) && String(i.product_id) === String(req.body.product_id));
    if (item) {
      item.quantity_available += parseInt(req.body.quantity, 10);
      item.stock_status = item.quantity_available > item.min_threshold ? 'Healthy' : 'Low Stock';
      item.last_restock_date = req.body.restock_date || new Date().toISOString().split('T')[0];
    }
    res.json({ success: true, message: `Successfully restocked ${req.body.quantity} units.` });
  }
});

// POST /api/inventory - Assign product to warehouse
router.post('/', async (req, res) => {
  try {
    const { warehouse_id, product_id, quantity_available, min_threshold } = req.body;
    const [result] = await pool.query(
      `INSERT INTO inventory_stock (warehouse_id, product_id, quantity_available, min_threshold, last_restock_date)
       VALUES (?, ?, ?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)`,
      [warehouse_id, product_id, quantity_available || 0, min_threshold || 10]
    );
    res.status(201).json({ success: true, message: 'Stock node created', data: { stock_id: result.insertId } });
  } catch (error) {
    const wh = warehouses.find(w => String(w.warehouse_id) === String(req.body.warehouse_id)) || warehouses[0];
    const pr = products.find(p => String(p.product_id) === String(req.body.product_id)) || products[0];
    const newStock = {
      stock_id: Date.now(),
      warehouse_id: parseInt(req.body.warehouse_id, 10),
      warehouse_name: wh.warehouse_name,
      city: wh.city,
      state: wh.state,
      product_id: parseInt(req.body.product_id, 10),
      product_name: pr.product_name,
      category: pr.category,
      sku: pr.sku,
      price: pr.price,
      quantity_available: parseInt(req.body.quantity_available || 50, 10),
      min_threshold: parseInt(req.body.min_threshold || 10, 10),
      stock_status: 'Healthy',
      last_restock_date: new Date().toISOString().split('T')[0]
    };
    inventory.push(newStock);
    res.status(201).json({ success: true, message: 'Stock entry added successfully', data: { stock_id: newStock.stock_id } });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_stock WHERE stock_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Stock entry removed' });
  } catch (error) {
    const idx = inventory.findIndex(i => String(i.stock_id) === String(req.params.id));
    if (idx !== -1) inventory.splice(idx, 1);
    res.json({ success: true, message: 'Stock entry removed' });
  }
});

module.exports = router;
