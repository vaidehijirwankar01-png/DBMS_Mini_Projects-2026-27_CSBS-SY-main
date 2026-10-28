require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. PRODUCTS & CATEGORIES
// ==========================================

// Get all products (with optional search query & category filter)
app.get('/api/products', async (req, res) => {
  try {
    const { q = '', category } = req.query;
    let sql = `
      SELECT p.*, c.category_name 
      FROM PRODUCT p
      JOIN CATEGORY c USING (category_id)
      WHERE p.product_name LIKE ?
    `;
    const params = [`%${q}%`];

    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }
    sql += ' ORDER BY p.product_id ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get all categories
app.get('/api/categories', async (_, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CATEGORY ORDER BY category_name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Add new product (Admin)
app.post('/api/products', async (req, res) => {
  const { category_id, product_name, price, stock_qty, description } = req.body;
  if (!category_id || !product_name || price === undefined || stock_qty === undefined) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO PRODUCT (category_id, product_name, price, stock_qty, description) VALUES (?, ?, ?, ?, ?)',
      [category_id, product_name, price, stock_qty, description || '']
    );
    res.status(201).json({ product_id: result.insertId, message: 'Product added successfully' });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update product stock (Admin)
app.put('/api/products/:id/stock', async (req, res) => {
  const { stock_qty } = req.body;
  const productId = req.params.id;
  try {
    await pool.query('UPDATE PRODUCT SET stock_qty = ? WHERE product_id = ?', [stock_qty, productId]);
    res.json({ message: 'Stock updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. AUTHENTICATION (REGISTER & LOGIN)
// ==========================================

// Register customer
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password, street, city, state, pincode } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      'INSERT INTO CUSTOMER (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone || null, hash]
    );
    const customer_id = result.insertId;

    let address_id = null;
    if (street || city || pincode) {
      const [addrRes] = await conn.query(
        'INSERT INTO ADDRESS (customer_id, street, city, state, pincode) VALUES (?, ?, ?, ?, ?)',
        [customer_id, street || '', city || '', state || '', pincode || '']
      );
      address_id = addrRes.insertId;
    }

    await conn.commit();
    res.status(201).json({ customer_id, name, email, address_id, message: 'Account created successfully' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email is already registered' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    conn.release();
  }
});

// Login customer
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [[user]] = await pool.query('SELECT * FROM CUSTOMER WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Support both bcrypt hash and initial seed 'x' for demo
    const isMatch = (user.password_hash === 'x') || (await bcrypt.compare(password, user.password_hash));
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      customer_id: user.customer_id,
      name: user.name,
      email: user.email,
      phone: user.phone
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==========================================
// 3. ADDRESS MANAGEMENT
// ==========================================

// Get customer addresses
app.get('/api/addresses/:cid', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ADDRESS WHERE customer_id = ?', [req.params.cid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add customer address
app.post('/api/addresses', async (req, res) => {
  const { customer_id, street, city, state, pincode } = req.body;
  if (!customer_id || !street || !city || !pincode) {
    return res.status(400).json({ error: 'Missing required address fields' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO ADDRESS (customer_id, street, city, state, pincode) VALUES (?, ?, ?, ?, ?)',
      [customer_id, street, city, state || '', pincode]
    );
    res.status(201).json({ address_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ORDER TRANSACTIONS (ACID Demo Route)
// ==========================================

// Place an order: atomic multi-table transaction
app.post('/api/orders', async (req, res) => {
  const { customer_id, address_id, method = 'UPI', items } = req.body;

  if (!customer_id || !address_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order data: customer, address, and items are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total = 0;
    const pricedItems = [];

    // 1. Lock and verify stock for all items
    for (const it of items) {
      const [[product]] = await conn.query(
        'SELECT product_name, price, stock_qty FROM PRODUCT WHERE product_id = ? FOR UPDATE',
        [it.product_id]
      );

      if (!product) {
        throw new Error(`Product ID #${it.product_id} not found`);
      }
      if (product.stock_qty < it.quantity) {
        throw new Error(`Insufficient stock for "${product.product_name}". Available: ${product.stock_qty}, Requested: ${it.quantity}`);
      }

      const itemTotal = Number(product.price) * it.quantity;
      total += itemTotal;
      pricedItems.push({
        product_id: it.product_id,
        quantity: it.quantity,
        price: product.price
      });
    }

    // 2. Insert into ORDERS table
    const [orderResult] = await conn.query(
      "INSERT INTO ORDERS (customer_id, order_date, total_amount, status) VALUES (?, CURDATE(), ?, 'Placed')",
      [customer_id, total]
    );
    const order_id = orderResult.insertId;

    // 3. Insert ORDER_ITEM rows and decrement PRODUCT stock
    for (const item of pricedItems) {
      await conn.query(
        'INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [order_id, item.product_id, item.quantity, item.price]
      );

      await conn.query(
        'UPDATE PRODUCT SET stock_qty = stock_qty - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    // 4. Insert into PAYMENT table
    await conn.query(
      "INSERT INTO PAYMENT (order_id, method, amount, paid_on, status) VALUES (?, ?, ?, CURDATE(), 'Paid')",
      [order_id, method, total]
    );

    // 5. Insert into SHIPMENT table
    const carrierList = ['BlueDart', 'FedEx', 'Delhivery', 'SpeedPost'];
    const carrier = carrierList[Math.floor(Math.random() * carrierList.length)];
    const trackingNo = 'TRK' + Math.floor(10000000 + Math.random() * 90000000);

    await conn.query(
      "INSERT INTO SHIPMENT (order_id, address_id, carrier, tracking_no, delivery_status) VALUES (?, ?, ?, ?, 'Processing')",
      [order_id, address_id, carrier, trackingNo]
    );

    // Commit all changes atomically
    await conn.commit();

    res.status(201).json({
      order_id,
      total,
      tracking_no: trackingNo,
      carrier,
      message: 'Order placed successfully!'
    });
  } catch (err) {
    await conn.rollback();
    console.error('Order transaction rolled back:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Customer order history
app.get('/api/orders/:cid', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.status,
              s.carrier, s.tracking_no, s.delivery_status,
              p.method AS payment_method, p.status AS payment_status,
              a.street, a.city, a.state, a.pincode
       FROM ORDERS o
       LEFT JOIN SHIPMENT s USING (order_id)
       LEFT JOIN ADDRESS a USING (address_id)
       LEFT JOIN PAYMENT p USING (order_id)
       WHERE o.customer_id = ?
       ORDER BY o.order_id DESC`,
      [req.params.cid]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

// Order items for a specific order
app.get('/api/order-details/:order_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT oi.quantity, oi.unit_price, p.product_name, c.category_name
       FROM ORDER_ITEM oi
       JOIN PRODUCT p USING (product_id)
       JOIN CATEGORY c USING (category_id)
       WHERE oi.order_id = ?`,
      [req.params.order_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. REVIEWS
// ==========================================

// Add a review
app.post('/api/reviews', async (req, res) => {
  const { customer_id, product_id, rating, comment } = req.body;
  if (!customer_id || !product_id || !rating) {
    return res.status(400).json({ error: 'Customer, product and rating (1-5) are required' });
  }
  try {
    await pool.query(
      'INSERT INTO REVIEW (customer_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [customer_id, product_id, rating, comment || null]
    );
    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get reviews for a product
app.get('/api/reviews/:product_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, c.name AS customer_name
       FROM REVIEW r
       JOIN CUSTOMER c USING (customer_id)
       WHERE r.product_id = ?
       ORDER BY r.review_id DESC`,
      [req.params.product_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. DASHBOARD & ANALYTICS (Viva Highlights)
// ==========================================

app.get('/api/dashboard', async (_, res) => {
  try {
    // 1. Total orders and revenue
    const [[stats]] = await pool.query(
      'SELECT COUNT(*) AS orders, IFNULL(SUM(total_amount), 0) AS revenue FROM ORDERS'
    );

    // 2. Total registered customers
    const [[cust]] = await pool.query('SELECT COUNT(*) AS customers FROM CUSTOMER');

    // 3. Top selling products
    const [topProducts] = await pool.query(
      `SELECT p.product_name, SUM(oi.quantity) AS sold
       FROM ORDER_ITEM oi
       JOIN PRODUCT p USING (product_id)
       GROUP BY p.product_id, p.product_name
       ORDER BY sold DESC
       LIMIT 5`
    );

    // 4. Sales revenue by category
    const [byCategory] = await pool.query(
      `SELECT c.category_name, SUM(oi.quantity * oi.unit_price) AS sales
       FROM ORDER_ITEM oi
       JOIN PRODUCT p USING (product_id)
       JOIN CATEGORY c USING (category_id)
       GROUP BY c.category_id, c.category_name`
    );

    // 5. Low stock alerts (items with stock < 10)
    const [lowStock] = await pool.query(
      'SELECT product_id, product_name, stock_qty, price FROM PRODUCT WHERE stock_qty < 10 ORDER BY stock_qty ASC'
    );

    // 6. Recent orders
    const [recentOrders] = await pool.query(
      `SELECT o.order_id, c.name AS customer_name, o.order_date, o.total_amount, o.status
       FROM ORDERS o
       JOIN CUSTOMER c USING (customer_id)
       ORDER BY o.order_id DESC
       LIMIT 5`
    );

    res.json({
      orders: stats.orders,
      revenue: stats.revenue,
      customers: cust.customers,
      topProducts,
      byCategory,
      lowStock,
      recentOrders
    });
  } catch (err) {
    console.error('Dashboard query error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard analytics' });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 Online Shopping Management API is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
  await testConnection();
});
