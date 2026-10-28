"""
Farmer to Consumer Local Marketplace - backend/app.py
Run:  pip install flask mysql-connector-python
      python app.py        ->  open http://localhost:5000
"""
import uuid
from functools import wraps

import mysql.connector
from flask import Flask, render_template, request, redirect, url_for, session, flash

# ---------------------------------------------------------------- config
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456789",   # <-- change this
    "database": "farm_market",
}
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

app = Flask(__name__, template_folder="../frontend/templates",
            static_folder="../frontend/static")
app.secret_key = "farm-market-secret"


# ---------------------------------------------------------------- db helpers
def get_db():
    return mysql.connector.connect(**DB_CONFIG)


def query(sql, params=()):
    """SELECT -> list of dicts"""
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def execute(sql, params=()):
    """INSERT / UPDATE / DELETE -> last inserted id"""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        cur.close()
        conn.close()


def call_proc(name, args=()):
    """Call a stored procedure that ends with a SELECT -> list of dicts"""
    conn = get_db()
    cur = conn.cursor()
    cur.callproc(name, args)
    rows = []
    for result in cur.stored_results():
        cols = result.column_names
        rows = [dict(zip(cols, r)) for r in result.fetchall()]
    cur.close()
    conn.close()
    return rows


def db_action(func):
    """Show MySQL errors (including trigger messages) as a flash message"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except mysql.connector.Error as err:
            if err.errno == 1451:
                flash("Cannot delete: other records (e.g. orders) depend on this.", "error")
            else:
                flash(err.msg, "error")
            return redirect(request.referrer or url_for("index"))
    return wrapper


def login_required(role):
    def deco(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if session.get("role") != role:
                return redirect(url_for("portal", role=role))
            return func(*args, **kwargs)
        return wrapper
    return deco


# ---------------------------------------------------------------- home / auth
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/portal/<role>")
def portal(role):
    if role not in ("farmer", "consumer", "admin"):
        return redirect(url_for("index"))
    if role == "admin":
        session.clear()
        session.update(role="admin", name="Administrator")
        return redirect(url_for("admin"))
    table = "Farmer" if role == "farmer" else "Consumer"
    uid = request.args.get("uid")
    if uid:
        rows = query(f"SELECT {role}_id AS id, name FROM {table} WHERE {role}_id = %s", (uid,))
    else:
        rows = query(f"SELECT {role}_id AS id, name FROM {table} ORDER BY {role}_id LIMIT 1")
    if not rows:
        flash(f"No {role} found yet. Please register first.", "error")
        return redirect(url_for("register", role=role))
    session.clear()
    session.update(role=role, uid=rows[0]["id"], name=rows[0]["name"])
    return redirect(url_for(role))


@app.context_processor
def inject_users():
    role = session.get("role")
    if role in ("farmer", "consumer"):
        table = "Farmer" if role == "farmer" else "Consumer"
        return {"all_users": query(f"SELECT {role}_id AS id, name FROM {table} ORDER BY name")}
    return {"all_users": []}

@app.route("/register/<role>", methods=["GET", "POST"])
def register(role):
    if role not in ("farmer", "consumer"):
        return redirect(url_for("index"))
    if request.method == "POST":
        f = request.form
        table = "Farmer" if role == "farmer" else "Consumer"
        try:
            new_id = execute(f"INSERT INTO {table} (name, address, password) VALUES (%s,%s,%s)",
                             (f["name"], f["address"], f["password"]))
            for ph in f["phones"].split(","):          # multivalued attribute
                if ph.strip():
                    execute(f"INSERT IGNORE INTO {table}_Phone VALUES (%s,%s)",
                            (new_id, ph.strip()))
            flash(f"Registered! Your {role} ID is {new_id}.", "ok")
            return redirect(url_for("portal", role=role, uid=new_id))
        except mysql.connector.Error as err:
            flash(err.msg, "error")
    return render_template("register.html", role=role)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


# ---------------------------------------------------------------- farmer portal
@app.route("/farmer")
@login_required("farmer")
def farmer():
    fid = session["uid"]
    products = query("SELECT * FROM Products WHERE farmer_id = %s ORDER BY product_id", (fid,))
    report = call_proc("sp_farmer_sales_report", (fid,))          # cursor procedure
    phones = query("SELECT phone_number FROM Farmer_Phone WHERE farmer_id = %s", (fid,))
    return render_template("farmer.html", products=products, report=report, phones=phones)


@app.route("/farmer/add", methods=["POST"])
@login_required("farmer")
@db_action
def farmer_add():
    f = request.form
    execute("INSERT INTO Products (farmer_id, name, category, unit, price, quantity) "
            "VALUES (%s,%s,%s,%s,%s,%s)",
            (session["uid"], f["name"], f["category"], f["unit"], f["price"], f["quantity"]))
    flash("Product added", "ok")
    return redirect(url_for("farmer"))


@app.route("/farmer/update/<int:pid>", methods=["POST"])
@login_required("farmer")
@db_action
def farmer_update(pid):
    f = request.form
    execute("UPDATE Products SET price = %s, quantity = %s "
            "WHERE product_id = %s AND farmer_id = %s",
            (f["price"], f["quantity"], pid, session["uid"]))
    flash("Product updated", "ok")
    return redirect(url_for("farmer"))


@app.route("/farmer/delete/<int:pid>", methods=["POST"])
@login_required("farmer")
@db_action
def farmer_delete(pid):
    execute("DELETE FROM Products WHERE product_id = %s AND farmer_id = %s",
            (pid, session["uid"]))
    flash("Product removed", "ok")
    return redirect(url_for("farmer"))


# ---------------------------------------------------------------- consumer portal
@app.route("/consumer")
@login_required("consumer")
def consumer():
    cat = request.args.get("category", "")
    sql = ("SELECT p.*, f.name AS farmer_name FROM Products p "
           "JOIN Farmer f ON f.farmer_id = p.farmer_id WHERE p.quantity > 0")
    params = ()
    if cat:
        sql += " AND p.category = %s"
        params = (cat,)
    products = query(sql + " ORDER BY p.name", params)
    categories = query("SELECT DISTINCT category FROM Products ORDER BY category")
    me = query("SELECT address FROM Consumer WHERE consumer_id = %s", (session["uid"],))[0]
    return render_template("consumer.html", products=products, categories=categories,
                           selected=cat, address=me["address"])


@app.route("/consumer/order", methods=["POST"])
@login_required("consumer")
def consumer_order():
    f = request.form
    items = []
    for key, val in f.items():
        if key.startswith("qty_") and val and float(val) > 0:
            items.append((int(key[4:]), float(val)))
    if not items:
        flash("Enter a quantity for at least one product", "error")
        return redirect(url_for("consumer"))

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO Orders (consumer_id, delivery_address) VALUES (%s,%s)",
                    (session["uid"], f["delivery_address"]))
        oid = cur.lastrowid
        for line_no, (pid, qty) in enumerate(items, start=1):
            # triggers check stock, copy price, compute subtotal, reduce stock, update total
            cur.execute("INSERT INTO Order_Details (order_id, line_no, product_id, quantity) "
                        "VALUES (%s,%s,%s,%s)", (oid, line_no, pid, qty))
        conn.commit()
        flash(f"Order #{oid} placed. Please pay from My Orders.", "ok")
        return redirect(url_for("consumer_orders"))
    except mysql.connector.Error as err:
        conn.rollback()
        flash(err.msg, "error")
        return redirect(url_for("consumer"))
    finally:
        cur.close()
        conn.close()


@app.route("/consumer/orders")
@login_required("consumer")
def consumer_orders():
    orders = query("SELECT o.*, p.payment_id, p.payment_method, p.transaction_id, "
                   "d.tracking_id, d.delivery_partner, d.delivery_date "
                   "FROM Orders o LEFT JOIN Payment p ON p.order_id = o.order_id "
                   "LEFT JOIN Delivery d ON d.payment_id = p.payment_id "
                   "WHERE o.consumer_id = %s ORDER BY o.order_id DESC", (session["uid"],))
    lines = query("SELECT d.*, pr.name, pr.unit FROM Order_Details d "
                  "JOIN Products pr ON pr.product_id = d.product_id "
                  "JOIN Orders o ON o.order_id = d.order_id WHERE o.consumer_id = %s "
                  "ORDER BY d.order_id, d.line_no", (session["uid"],))
    by_order = {}
    for ln in lines:
        by_order.setdefault(ln["order_id"], []).append(ln)
    return render_template("consumer_orders.html", orders=orders, by_order=by_order)


@app.route("/consumer/pay/<int:oid>", methods=["POST"])
@login_required("consumer")
@db_action
def consumer_pay(oid):
    own = query("SELECT order_id FROM Orders WHERE order_id = %s AND consumer_id = %s",
                (oid, session["uid"]))
    if own:
        txn = "TXN" + uuid.uuid4().hex[:10].upper()
        execute("INSERT INTO Payment (order_id, payment_method, transaction_id) VALUES (%s,%s,%s)",
                (oid, request.form["payment_method"], txn))
        flash(f"Payment successful. Transaction ID: {txn}", "ok")
    return redirect(url_for("consumer_orders"))


@app.route("/consumer/cancel/<int:oid>", methods=["POST"])
@login_required("consumer")
@db_action
def consumer_cancel(oid):
    execute("UPDATE Orders SET status = 'Cancelled' WHERE order_id = %s AND consumer_id = %s",
            (oid, session["uid"]))
    flash("Order cancelled and stock returned", "ok")
    return redirect(url_for("consumer_orders"))


# ---------------------------------------------------------------- admin portal
@app.route("/admin")
@login_required("admin")
def admin():
    data = {
        "stats": query("SELECT (SELECT COUNT(*) FROM Farmer) AS farmers, "
                       "(SELECT COUNT(*) FROM Consumer) AS consumers, "
                       "(SELECT COUNT(*) FROM Products) AS products, "
                       "(SELECT COUNT(*) FROM Orders) AS orders, "
                       "(SELECT IFNULL(SUM(amount),0) FROM Payment) AS revenue")[0],
        "farmers": query("SELECT f.*, GROUP_CONCAT(p.phone_number) AS phones FROM Farmer f "
                         "LEFT JOIN Farmer_Phone p ON p.farmer_id = f.farmer_id "
                         "GROUP BY f.farmer_id"),
        "consumers": query("SELECT c.*, GROUP_CONCAT(p.phone_number) AS phones FROM Consumer c "
                           "LEFT JOIN Consumer_Phone p ON p.consumer_id = c.consumer_id "
                           "GROUP BY c.consumer_id"),
        "products": query("SELECT p.*, f.name AS farmer_name FROM Products p "
                          "JOIN Farmer f ON f.farmer_id = p.farmer_id ORDER BY p.product_id"),
        "orders": query("SELECT o.*, c.name AS consumer_name FROM Orders o "
                        "JOIN Consumer c ON c.consumer_id = o.consumer_id "
                        "ORDER BY o.order_id DESC"),
        "payments": query("SELECT * FROM Payment ORDER BY payment_id DESC"),
        "deliveries": query("SELECT d.*, p.order_id FROM Delivery d "
                            "JOIN Payment p ON p.payment_id = d.payment_id "
                            "ORDER BY d.delivery_id DESC"),
        "unshipped": query("SELECT p.payment_id, p.order_id FROM Payment p "
                           "LEFT JOIN Delivery d ON d.payment_id = p.payment_id "
                           "WHERE d.delivery_id IS NULL"),
        "summary": call_proc("sp_admin_farmer_summary"),              # cursor procedure
        "audit": query("SELECT * FROM Product_Audit ORDER BY audit_id DESC LIMIT 10"),
    }
    return render_template("admin.html", **data)


@app.route("/admin/delete/<table>/<int:rid>", methods=["POST"])
@login_required("admin")
@db_action
def admin_delete(table, rid):
    allowed = {"farmer": ("Farmer", "farmer_id"), "consumer": ("Consumer", "consumer_id"),
               "product": ("Products", "product_id"), "delivery": ("Delivery", "delivery_id")}
    if table in allowed:
        name, col = allowed[table]
        execute(f"DELETE FROM {name} WHERE {col} = %s", (rid,))
        flash(f"{table.capitalize()} #{rid} deleted", "ok")
    return redirect(url_for("admin"))


@app.route("/admin/order/<int:oid>/status", methods=["POST"])
@login_required("admin")
@db_action
def admin_order_status(oid):
    execute("UPDATE Orders SET status = %s WHERE order_id = %s", (request.form["status"], oid))
    flash(f"Order #{oid} status updated", "ok")
    return redirect(url_for("admin"))


@app.route("/admin/delivery/add", methods=["POST"])
@login_required("admin")
@db_action
def admin_delivery_add():
    f = request.form
    tracking = "TRK" + uuid.uuid4().hex[:8].upper()
    execute("INSERT INTO Delivery (payment_id, delivery_date, tracking_id, delivery_partner) "
            "VALUES (%s,%s,%s,%s)",
            (f["payment_id"], f["delivery_date"] or None, tracking, f["delivery_partner"]))
    flash(f"Delivery created. Tracking ID: {tracking}", "ok")
    return redirect(url_for("admin"))


@app.route("/admin/delivery/<int:did>/update", methods=["POST"])
@login_required("admin")
@db_action
def admin_delivery_update(did):
    execute("UPDATE Delivery SET delivery_date = %s, delivery_partner = %s WHERE delivery_id = %s",
            (request.form["delivery_date"] or None, request.form["delivery_partner"], did))
    flash("Delivery updated", "ok")
    return redirect(url_for("admin"))


if __name__ == "__main__":
    app.run(debug=True)
