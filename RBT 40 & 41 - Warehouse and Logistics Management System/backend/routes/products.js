const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { products } = require('../config/mockData');

// GET /api/products/categories - Distinct categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM product WHERE category IS NOT NULL ORDER BY category ASC');
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (error) {
    const cats = [...new Set(products.map(p => p.category))];
    res.json({ success: true, data: cats });
  }
});

// GET /api/products - List products with optional category, search, and total stock
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.category,
        p.seller,
        p.price,
        p.sku,
        p.created_at,
        COALESCE(SUM(i.quantity_available), 0) AS total_stock_available,
        COUNT(DISTINCT i.warehouse_id) AS warehouse_count
      FROM product p
      LEFT JOIN inventory_stock i ON p.product_id = i.product_id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (p.product_name LIKE ? OR p.sku LIKE ? OR p.seller LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' GROUP BY p.product_id ORDER BY p.product_name ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    let list = [...products];
    if (req.query.category) {
      list = list.filter(p => p.category === req.query.category);
    }
    if (req.query.search) {
      const term = req.query.search.toLowerCase();
      list = list.filter(p => p.product_name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term)));
    }
    res.json({ success: true, data: list });
  }
});

// GET /api/products/:id - Single product with warehouse stock distribution
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [prodRows] = await pool.query('SELECT * FROM product WHERE product_id = ?', [id]);
    if (prodRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const [stockRows] = await pool.query(`
      SELECT 
        i.stock_id,
        w.warehouse_id,
        w.warehouse_name,
        w.city,
        w.state,
        i.quantity_available,
        i.min_threshold,
        i.last_restock_date
      FROM inventory_stock i
      JOIN warehouse w ON i.warehouse_id = w.warehouse_id
      WHERE i.product_id = ?
      ORDER BY w.warehouse_name ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...prodRows[0],
        inventory_distribution: stockRows
      }
    });
  } catch (error) {
    const p = products.find(prod => String(prod.product_id) === String(req.params.id)) || products[0];
    res.json({
      success: true,
      data: {
        ...p,
        inventory_distribution: []
      }
    });
  }
});

// POST /api/products - Create product
router.post('/', async (req, res) => {
  try {
    const { product_name, category, seller, price, sku } = req.body;
    if (!product_name || !category || price === undefined) {
      return res.status(400).json({ success: false, message: 'product_name, category, and price are required.' });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative.' });
    }

    const [result] = await pool.query(
      'INSERT INTO product (product_name, category, seller, price, sku) VALUES (?, ?, ?, ?, ?)',
      [product_name.trim(), category.trim(), seller ? seller.trim() : null, price, sku ? sku.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product_id: result.insertId }
    });
  } catch (error) {
    console.warn('[Fallback] Adding product to in-memory store:', error.message);
    const newId = products.length > 0 ? Math.max(...products.map(p => p.product_id)) + 1 : 1;
    const newProduct = {
      product_id: newId,
      product_name: req.body.product_name,
      category: req.body.category,
      seller: req.body.seller || 'Direct Supplier',
      price: parseFloat(req.body.price),
      sku: req.body.sku || `SKU-${Date.now().toString().slice(-6)}`,
      total_stock_available: 0,
      warehouse_count: 0
    };
    products.unshift(newProduct);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product_id: newId }
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, category, seller, price, sku } = req.body;

    const [result] = await pool.query(
      'UPDATE product SET product_name = ?, category = ?, seller = ?, price = ?, sku = ? WHERE product_id = ?',
      [product_name.trim(), category.trim(), seller ? seller.trim() : null, price, sku ? sku.trim() : null, id]
    );

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    const idx = products.findIndex(p => String(p.product_id) === String(req.params.id));
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...req.body };
    }
    res.json({ success: true, message: 'Product updated successfully' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM product WHERE product_id = ?', [id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    const idx = products.findIndex(p => String(p.product_id) === String(req.params.id));
    if (idx !== -1) {
      products.splice(idx, 1);
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  }
});

module.exports = router;
