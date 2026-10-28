"""
Food Delivery System - Flask backend (REST API + serves the frontend)
Run:  python app.py      then open  http://127.0.0.1:5000
"""
import os
from datetime import datetime
from decimal import Decimal

import mysql.connector
from flask import Flask, jsonify, request

app = Flask(__name__, static_folder="static", static_url_path="")

# ---------- DATABASE SETTINGS (change the password!) ----------
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "123456789"),
    "database": os.getenv("DB_NAME", "food_delivery_db"),
}

ORDER_STATUSES = ["Placed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"]
PAYMENT_MODES = ["UPI", "Card", "Cash", "Net Banking"]


# ---------- HELPERS ----------
def get_conn():
    return mysql.connector.connect(**DB_CONFIG)


def clean(row):
    """Make MySQL values JSON friendly."""
    out = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            v = float(v)
        elif isinstance(v, datetime):
            v = v.strftime("%d %b %Y, %I:%M %p")
        out[k] = v
    return out


def fetch(sql, params=(), one=False):
    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        rows = [clean(r) for r in cur.fetchall()]
        cur.close()
    finally:
        conn.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql, params=()):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        last_id = cur.lastrowid
        cur.close()
    finally:
        conn.close()
    return last_id


@app.errorhandler(mysql.connector.Error)
def db_error(e):
    if getattr(e, "errno", None) == 1062:
        return jsonify(error="Mobile number or email already exists."), 400
    return jsonify(error=f"Database error: {e}"), 500


# ---------- PAGES ----------
@app.get("/")
def home():
    return app.send_static_file("index.html")


# ---------- RESTAURANTS & MENU ----------
@app.get("/api/restaurants")
def restaurants():
    return jsonify(fetch("SELECT * FROM restaurant ORDER BY rating DESC"))


@app.get("/api/restaurants/<int:rid>/menu")
def menu(rid):
    return jsonify(fetch(
        "SELECT menu_id, food_name, price FROM menu WHERE restaurant_id=%s ORDER BY food_name",
        (rid,)))


# ---------- CUSTOMERS ----------
@app.get("/api/customers")
def customers():
    return jsonify(fetch("SELECT * FROM customer ORDER BY customer_id DESC"))


@app.post("/api/customers")
def add_customer():
    d = request.get_json() or {}
    name = (d.get("name") or "").strip()
    mobile = (d.get("mobile_no") or "").strip()
    email = (d.get("email") or "").strip() or None
    address = (d.get("address") or "").strip()
    if not name or not address:
        return jsonify(error="Name and address are required."), 400
    if not (mobile.isdigit() and len(mobile) == 10):
        return jsonify(error="Mobile number must be exactly 10 digits."), 400
    cid = execute(
        "INSERT INTO customer (name, mobile_no, email, address) VALUES (%s,%s,%s,%s)",
        (name, mobile, email, address))
    return jsonify(message="Customer added", customer_id=cid), 201


# ---------- PLACE ORDER ----------
@app.post("/api/orders")
def place_order():
    d = request.get_json() or {}
    customer_id = d.get("customer_id")
    restaurant_id = d.get("restaurant_id")
    items = d.get("items") or []
    mode = d.get("payment_mode", "Cash")

    if not customer_id or not restaurant_id or not items:
        return jsonify(error="Select a customer, a restaurant and at least one item."), 400
    if mode not in PAYMENT_MODES:
        return jsonify(error="Invalid payment mode."), 400

    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)

        # 1. validate items and calculate total from DB prices
        total = Decimal("0")
        priced = []
        for it in items:
            qty = int(it.get("quantity", 0))
            if qty <= 0:
                continue
            cur.execute("SELECT price FROM menu WHERE menu_id=%s AND restaurant_id=%s",
                        (it["menu_id"], restaurant_id))
            row = cur.fetchone()
            if not row:
                return jsonify(error="Invalid menu item for this restaurant."), 400
            total += row["price"] * qty
            priced.append((it["menu_id"], qty))
        if not priced:
            return jsonify(error="Please choose at least one item."), 400

        # 2. assign the delivery partner with the fewest active orders
        cur.execute("""
            SELECT dp.delivery_id, dp.name
            FROM delivery_partner dp
            LEFT JOIN orders o ON o.delivery_id = dp.delivery_id
                 AND o.order_status IN ('Placed','Preparing','Out for Delivery')
            GROUP BY dp.delivery_id, dp.name, dp.rating
            ORDER BY COUNT(o.order_id), dp.rating DESC
            LIMIT 1""")
        partner = cur.fetchone()
        delivery_id = partner["delivery_id"] if partner else None

        # 3. insert order, items and payment in ONE transaction
        cur.execute(
            "INSERT INTO orders (customer_id, restaurant_id, delivery_id, order_amount) "
            "VALUES (%s,%s,%s,%s)", (customer_id, restaurant_id, delivery_id, total))
        order_id = cur.lastrowid
        for menu_id, qty in priced:
            cur.execute("INSERT INTO order_items (order_id, menu_id, quantity) VALUES (%s,%s,%s)",
                        (order_id, menu_id, qty))
        pay_status = "Pending" if mode == "Cash" else "Paid"
        cur.execute(
            "INSERT INTO payment (order_id, payment_mode, payment_status, amount) "
            "VALUES (%s,%s,%s,%s)", (order_id, mode, pay_status, total))
        conn.commit()
        return jsonify(message="Order placed", order_id=order_id, total=float(total),
                       delivery_partner=partner["name"] if partner else None), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------- ORDERS ----------
@app.get("/api/orders")
def orders():
    return jsonify(fetch("""
        SELECT o.order_id, o.order_date, c.name AS customer, r.restaurant_name,
               dp.name AS delivery_partner, o.order_amount, o.order_status,
               p.payment_mode, p.payment_status
        FROM orders o
        JOIN customer c    ON o.customer_id   = c.customer_id
        JOIN restaurant r  ON o.restaurant_id = r.restaurant_id
        LEFT JOIN delivery_partner dp ON o.delivery_id = dp.delivery_id
        LEFT JOIN payment p ON p.order_id = o.order_id
        ORDER BY o.order_id DESC"""))


@app.get("/api/orders/<int:order_id>/items")
def order_items(order_id):
    return jsonify(fetch("""
        SELECT m.food_name, oi.quantity, m.price, (oi.quantity * m.price) AS total
        FROM order_items oi JOIN menu m ON oi.menu_id = m.menu_id
        WHERE oi.order_id = %s""", (order_id,)))


@app.put("/api/orders/<int:order_id>/status")
def update_status(order_id):
    status = (request.get_json() or {}).get("status")
    if status not in ORDER_STATUSES:
        return jsonify(error="Invalid status."), 400
    execute("UPDATE orders SET order_status=%s WHERE order_id=%s", (status, order_id))
    if status == "Delivered":      # cash is collected on delivery
        execute("UPDATE payment SET payment_status='Paid' "
                "WHERE order_id=%s AND payment_mode='Cash'", (order_id,))
    elif status == "Cancelled":
        execute("UPDATE payment SET payment_status = "
                "CASE WHEN payment_status='Paid' THEN 'Refunded' ELSE 'Failed' END "
                "WHERE order_id=%s", (order_id,))
    return jsonify(message="Status updated")


# ---------- DASHBOARD ----------
@app.get("/api/stats")
def stats():
    totals = fetch("""
        SELECT (SELECT COUNT(*) FROM orders)      AS total_orders,
               (SELECT COUNT(*) FROM customer)    AS total_customers,
               (SELECT COUNT(*) FROM restaurant)  AS total_restaurants,
               (SELECT COALESCE(SUM(order_amount),0) FROM orders
                 WHERE order_status <> 'Cancelled') AS total_revenue""", one=True)
    revenue = fetch("""
        SELECT r.restaurant_name, COUNT(o.order_id) AS orders,
               COALESCE(SUM(o.order_amount),0) AS revenue
        FROM restaurant r
        LEFT JOIN orders o ON o.restaurant_id = r.restaurant_id
             AND o.order_status <> 'Cancelled'
        GROUP BY r.restaurant_id, r.restaurant_name""")
    partners = fetch("""
        SELECT dp.name, dp.vehicle_no, dp.rating, COUNT(o.order_id) AS deliveries
        FROM delivery_partner dp
        LEFT JOIN orders o ON o.delivery_id = dp.delivery_id
        GROUP BY dp.delivery_id, dp.name, dp.vehicle_no, dp.rating""")
    return jsonify(totals=totals, revenue=revenue, partners=partners)


if __name__ == "__main__":
    app.run(debug=True)
