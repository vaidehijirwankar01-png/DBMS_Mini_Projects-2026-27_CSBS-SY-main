import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from dotenv import load_dotenv
import db

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "retail-store-default-dev-key")


@app.context_processor
def inject_global_data():
    """
    Injects database health/status into all templates so the sidebar
    and top navbar can always show live MySQL connection status.
    """
    db_health = db.test_db_connection()
    return dict(db_health=db_health)


@app.route("/")
@app.route("/dashboard")
def dashboard():
    """
    Main Dashboard Route.
    Fetches real-time counts from the MySQL retail_store database:
    - Total Products
    - Total Customers
    - Total Suppliers
    - Total Sales
    - Low Stock Products
    """
    metrics = db.get_dashboard_metrics(low_stock_threshold=10)
    return render_template("dashboard.html", metrics=metrics, active_page="dashboard")


# =========================================================
# PRODUCT MANAGEMENT MODULE (CRUD + SEARCH + VALIDATION)
# =========================================================

@app.route("/products", methods=["GET"])
def products():
    """
    Product List & Search.
    Displays all products with category and supplier joined from MySQL.
    Supports query parameter 'q' for keyword search, plus category & supplier filters.
    """
    search_query = request.args.get("q", "").strip()
    category_id = request.args.get("category_id", "")
    supplier_id = request.args.get("supplier_id", "")

    products_list = db.get_all_products(
        search_query=search_query,
        category_id=category_id,
        supplier_id=supplier_id
    )
    categories = db.get_categories_dropdown()
    suppliers = db.get_suppliers_dropdown()

    return render_template(
        "products.html",
        products=products_list,
        categories=categories,
        suppliers=suppliers,
        search_query=search_query,
        selected_category=category_id,
        selected_supplier=supplier_id,
        active_page="products"
    )


@app.route("/products/add", methods=["GET", "POST"])
def add_product():
    """
    Add a new product with server-side validation.
    """
    categories = db.get_categories_dropdown()
    suppliers = db.get_suppliers_dropdown()

    if request.method == "POST":
        product_name = request.form.get("product_name", "").strip()
        price_raw = request.form.get("price", "").strip()
        quantity_raw = request.form.get("quantity", "").strip()
        category_id_raw = request.form.get("category_id", "").strip()
        supplier_id_raw = request.form.get("supplier_id", "").strip()

        errors = []

        # 1. Product Name Validation
        if not product_name:
            errors.append("Product name is required and cannot be empty.")
        elif len(product_name) > 100:
            errors.append("Product name cannot exceed 100 characters.")

        # 2. Price Validation
        try:
            price = float(price_raw)
            if price <= 0:
                errors.append("Price must be a positive number greater than 0.")
            else:
                price = round(price, 2)
        except (ValueError, TypeError):
            errors.append("Please enter a valid numeric price.")

        # 3. Quantity Validation
        try:
            quantity = int(quantity_raw)
            if quantity < 0:
                errors.append("Quantity cannot be negative.")
        except (ValueError, TypeError):
            errors.append("Please enter a valid non-negative integer for quantity.")

        # 4. Category Validation
        category_id = None
        if category_id_raw:
            try:
                category_id = int(category_id_raw)
                # Verify category exists in dropdown list
                if not any(c["category_id"] == category_id for c in categories):
                    errors.append("Selected category does not exist.")
            except ValueError:
                errors.append("Invalid category selected.")
        else:
            errors.append("Please select a valid category.")

        # 5. Supplier Validation
        supplier_id = None
        if supplier_id_raw:
            try:
                supplier_id = int(supplier_id_raw)
                # Verify supplier exists in dropdown list
                if not any(s["supplier_id"] == supplier_id for s in suppliers):
                    errors.append("Selected supplier does not exist.")
            except ValueError:
                errors.append("Invalid supplier selected.")
        else:
            errors.append("Please select a valid supplier.")

        if errors:
            for err in errors:
                flash(err, "danger")
            # If submitted from modal, redirect back to /products
            if request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.referrer and "products/add" not in request.referrer:
                return redirect(url_for("products"))
            return render_template(
                "add_product.html",
                categories=categories,
                suppliers=suppliers,
                form_data=request.form,
                active_page="products"
            )

        # Database Insertion
        success, new_id, msg = db.add_product(
            product_name=product_name,
            price=price,
            quantity=quantity,
            category_id=category_id,
            supplier_id=supplier_id
        )

        if success:
            flash(msg, "success")
            return redirect(url_for("products"))
        else:
            flash(msg, "danger")
            return redirect(url_for("products"))

    return render_template(
        "add_product.html",
        categories=categories,
        suppliers=suppliers,
        form_data={},
        active_page="products"
    )


@app.route("/products/edit/<int:product_id>", methods=["GET", "POST"])
def edit_product(product_id):
    """
    Edit existing product details with server-side validation.
    """
    prod = db.get_product_by_id(product_id)
    if not prod:
        flash(f"Product ID #{product_id} not found.", "danger")
        return redirect(url_for("products"))

    categories = db.get_categories_dropdown()
    suppliers = db.get_suppliers_dropdown()

    if request.method == "POST":
        product_name = request.form.get("product_name", "").strip()
        price_raw = request.form.get("price", "").strip()
        quantity_raw = request.form.get("quantity", "").strip()
        category_id_raw = request.form.get("category_id", "").strip()
        supplier_id_raw = request.form.get("supplier_id", "").strip()

        errors = []

        if not product_name:
            errors.append("Product name is required.")
        elif len(product_name) > 100:
            errors.append("Product name cannot exceed 100 characters.")

        try:
            price = float(price_raw)
            if price <= 0:
                errors.append("Price must be greater than 0.")
            else:
                price = round(price, 2)
        except (ValueError, TypeError):
            errors.append("Please enter a valid numeric price.")

        try:
            quantity = int(quantity_raw)
            if quantity < 0:
                errors.append("Quantity cannot be negative.")
        except (ValueError, TypeError):
            errors.append("Please enter a valid non-negative integer for quantity.")

        category_id = None
        if category_id_raw:
            try:
                category_id = int(category_id_raw)
                if not any(c["category_id"] == category_id for c in categories):
                    errors.append("Selected category does not exist.")
            except ValueError:
                errors.append("Invalid category selected.")
        else:
            errors.append("Please select a category.")

        supplier_id = None
        if supplier_id_raw:
            try:
                supplier_id = int(supplier_id_raw)
                if not any(s["supplier_id"] == supplier_id for s in suppliers):
                    errors.append("Selected supplier does not exist.")
            except ValueError:
                errors.append("Invalid supplier selected.")
        else:
            errors.append("Please select a supplier.")

        if errors:
            for err in errors:
                flash(err, "danger")
            return render_template(
                "edit_product.html",
                product=prod,
                categories=categories,
                suppliers=suppliers,
                active_page="products"
            )

        success, msg = db.update_product(
            product_id=product_id,
            product_name=product_name,
            price=price,
            quantity=quantity,
            category_id=category_id,
            supplier_id=supplier_id
        )

        if success:
            flash(msg, "success")
        else:
            flash(msg, "danger")

        return redirect(url_for("products"))

    return render_template(
        "edit_product.html",
        product=prod,
        categories=categories,
        suppliers=suppliers,
        active_page="products"
    )


@app.route("/products/delete/<int:product_id>", methods=["POST"])
def delete_product(product_id):
    """
    Delete a product from the database safely.
    Validates that the product is not linked in existing sale_item records.
    """
    success, msg = db.delete_product(product_id)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")
    return redirect(url_for("products"))


# =========================================================
# CATEGORY MANAGEMENT MODULE (CRUD + FK INTEGRITY)
# =========================================================

@app.route("/categories", methods=["GET"])
def categories():
    """
    Categories List & Search with product counts.
    """
    search_query = request.args.get("q", "").strip()
    categories_list = db.get_all_categories(search_query=search_query)
    return render_template(
        "categories.html",
        categories=categories_list,
        search_query=search_query,
        active_page="categories"
    )


@app.route("/categories/add", methods=["POST"])
def add_category():
    """
    Add a new category with server-side validation.
    """
    category_name = request.form.get("category_name", "").strip()

    if not category_name:
        flash("Category name is required and cannot be empty.", "danger")
        return redirect(url_for("categories"))

    if len(category_name) > 100:
        flash("Category name cannot exceed 100 characters.", "danger")
        return redirect(url_for("categories"))

    success, new_id, msg = db.add_category(category_name)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")

    return redirect(url_for("categories"))


@app.route("/categories/edit/<int:category_id>", methods=["GET", "POST"])
def edit_category(category_id):
    """
    Edit category details.
    """
    cat = db.get_category_by_id(category_id)
    if not cat:
        flash(f"Category ID #{category_id} not found.", "danger")
        return redirect(url_for("categories"))

    if request.method == "POST":
        category_name = request.form.get("category_name", "").strip()

        if not category_name:
            flash("Category name is required.", "danger")
            return render_template("edit_category.html", category=cat, active_page="categories")

        if len(category_name) > 100:
            flash("Category name cannot exceed 100 characters.", "danger")
            return render_template("edit_category.html", category=cat, active_page="categories")

        success, msg = db.update_category(category_id, category_name)
        if success:
            flash(msg, "success")
            return redirect(url_for("categories"))
        else:
            flash(msg, "danger")
            return render_template("edit_category.html", category=cat, active_page="categories")

    return render_template("edit_category.html", category=cat, active_page="categories")


@app.route("/categories/delete/<int:category_id>", methods=["POST"])
def delete_category(category_id):
    """
    Delete category. Prevents deletion if any products currently reference this category.
    """
    success, msg = db.delete_category(category_id)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")
    return redirect(url_for("categories"))


# =========================================================
# SUPPLIER MANAGEMENT MODULE (CRUD + SEARCH + FK SAFETY)
# =========================================================

@app.route("/suppliers", methods=["GET"])
def suppliers():
    """
    Suppliers Directory & Search.
    Supports searching by supplier name, phone, email, or supplier ID.
    """
    search_query = request.args.get("q", "").strip()
    suppliers_list = db.get_all_suppliers(search_query=search_query)
    return render_template(
        "suppliers.html",
        suppliers=suppliers_list,
        search_query=search_query,
        active_page="suppliers"
    )


@app.route("/suppliers/add", methods=["POST"])
def add_supplier():
    """
    Add a new supplier with server-side validation.
    """
    supplier_name = request.form.get("supplier_name", "").strip()
    phone = request.form.get("phone", "").strip()
    email = request.form.get("email", "").strip()

    errors = []

    if not supplier_name:
        errors.append("Supplier name is required and cannot be empty.")
    elif len(supplier_name) > 100:
        errors.append("Supplier name cannot exceed 100 characters.")

    if phone and len(phone) > 15:
        errors.append("Phone number cannot exceed 15 characters.")

    if email and len(email) > 100:
        errors.append("Email cannot exceed 100 characters.")

    if errors:
        for err in errors:
            flash(err, "danger")
        return redirect(url_for("suppliers"))

    success, new_id, msg = db.add_supplier(supplier_name, phone or None, email or None)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")

    return redirect(url_for("suppliers"))


@app.route("/suppliers/edit/<int:supplier_id>", methods=["GET", "POST"])
def edit_supplier(supplier_id):
    """
    Edit supplier details.
    """
    supp = db.get_supplier_by_id(supplier_id)
    if not supp:
        flash(f"Supplier ID #{supplier_id} not found.", "danger")
        return redirect(url_for("suppliers"))

    if request.method == "POST":
        supplier_name = request.form.get("supplier_name", "").strip()
        phone = request.form.get("phone", "").strip()
        email = request.form.get("email", "").strip()

        errors = []

        if not supplier_name:
            errors.append("Supplier name is required.")
        elif len(supplier_name) > 100:
            errors.append("Supplier name cannot exceed 100 characters.")

        if phone and len(phone) > 15:
            errors.append("Phone number cannot exceed 15 characters.")

        if email and len(email) > 100:
            errors.append("Email cannot exceed 100 characters.")

        if errors:
            for err in errors:
                flash(err, "danger")
            return render_template("edit_supplier.html", supplier=supp, active_page="suppliers")

        success, msg = db.update_supplier(supplier_id, supplier_name, phone or None, email or None)
        if success:
            flash(msg, "success")
            return redirect(url_for("suppliers"))
        else:
            flash(msg, "danger")
            return render_template("edit_supplier.html", supplier=supp, active_page="suppliers")

    return render_template("edit_supplier.html", supplier=supp, active_page="suppliers")


@app.route("/suppliers/delete/<int:supplier_id>", methods=["POST"])
def delete_supplier(supplier_id):
    """
    Delete supplier. Prevents deletion if any products are supplied by this supplier.
    """
    success, msg = db.delete_supplier(supplier_id)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")
    return redirect(url_for("suppliers"))


# =========================================================
# CUSTOMER MANAGEMENT MODULE (CRUD + SEARCH + FK SAFETY)
# =========================================================

@app.route("/customers", methods=["GET"])
def customers():
    """
    Customers Directory & Search.
    Supports searching by customer name, phone, email, or customer ID.
    """
    search_query = request.args.get("q", "").strip()
    customers_list = db.get_all_customers(search_query=search_query)
    return render_template(
        "customers.html",
        customers=customers_list,
        search_query=search_query,
        active_page="customers"
    )


@app.route("/customers/add", methods=["POST"])
def add_customer():
    """
    Add a new customer with server-side validation.
    """
    customer_name = request.form.get("customer_name", "").strip()
    phone = request.form.get("phone", "").strip()
    email = request.form.get("email", "").strip()

    errors = []

    if not customer_name:
        errors.append("Customer name is required and cannot be empty.")
    elif len(customer_name) > 100:
        errors.append("Customer name cannot exceed 100 characters.")

    if phone and len(phone) > 15:
        errors.append("Phone number cannot exceed 15 characters.")

    if email and len(email) > 100:
        errors.append("Email cannot exceed 100 characters.")

    if errors:
        for err in errors:
            flash(err, "danger")
        return redirect(url_for("customers"))

    success, new_id, msg = db.add_customer(customer_name, phone or None, email or None)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")

    return redirect(url_for("customers"))


@app.route("/customers/edit/<int:customer_id>", methods=["GET", "POST"])
def edit_customer(customer_id):
    """
    Edit customer details.
    """
    cust = db.get_customer_by_id(customer_id)
    if not cust:
        flash(f"Customer ID #{customer_id} not found.", "danger")
        return redirect(url_for("customers"))

    if request.method == "POST":
        customer_name = request.form.get("customer_name", "").strip()
        phone = request.form.get("phone", "").strip()
        email = request.form.get("email", "").strip()

        errors = []

        if not customer_name:
            errors.append("Customer name is required.")
        elif len(customer_name) > 100:
            errors.append("Customer name cannot exceed 100 characters.")

        if phone and len(phone) > 15:
            errors.append("Phone number cannot exceed 15 characters.")

        if email and len(email) > 100:
            errors.append("Email cannot exceed 100 characters.")

        if errors:
            for err in errors:
                flash(err, "danger")
            return render_template("edit_customer.html", customer=cust, active_page="customers")

        success, msg = db.update_customer(customer_id, customer_name, phone or None, email or None)
        if success:
            flash(msg, "success")
            return redirect(url_for("customers"))
        else:
            flash(msg, "danger")
            return render_template("edit_customer.html", customer=cust, active_page="customers")

    return render_template("edit_customer.html", customer=cust, active_page="customers")


@app.route("/customers/delete/<int:customer_id>", methods=["POST"])
def delete_customer(customer_id):
    """
    Delete customer. Prevents deletion if customer has sales records.
    """
    success, msg = db.delete_customer(customer_id)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")
    return redirect(url_for("customers"))


# =========================================================
# EMPLOYEE MANAGEMENT MODULE (CRUD + FK SAFETY)
# =========================================================

@app.route("/employees", methods=["GET"])
def employees():
    """
    Employees Directory & Search.
    Supports searching by employee name, role, phone, or employee ID.
    """
    search_query = request.args.get("q", "").strip()
    employees_list = db.get_all_employees(search_query=search_query)
    return render_template(
        "employees.html",
        employees=employees_list,
        search_query=search_query,
        active_page="employees"
    )


@app.route("/employees/add", methods=["POST"])
def add_employee():
    """
    Add a new employee with server-side validation.
    """
    employee_name = request.form.get("employee_name", "").strip()
    role = request.form.get("role", "").strip()
    phone = request.form.get("phone", "").strip()

    errors = []

    if not employee_name:
        errors.append("Employee name is required and cannot be empty.")
    elif len(employee_name) > 100:
        errors.append("Employee name cannot exceed 100 characters.")

    if not role:
        errors.append("Employee role / designation is required.")
    elif len(role) > 50:
        errors.append("Role cannot exceed 50 characters.")

    if phone and len(phone) > 15:
        errors.append("Phone number cannot exceed 15 characters.")

    if errors:
        for err in errors:
            flash(err, "danger")
        return redirect(url_for("employees"))

    success, new_id, msg = db.add_employee(employee_name, role, phone or None)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")

    return redirect(url_for("employees"))


@app.route("/employees/edit/<int:employee_id>", methods=["GET", "POST"])
def edit_employee(employee_id):
    """
    Edit employee details.
    """
    emp = db.get_employee_by_id(employee_id)
    if not emp:
        flash(f"Employee ID #{employee_id} not found.", "danger")
        return redirect(url_for("employees"))

    if request.method == "POST":
        employee_name = request.form.get("employee_name", "").strip()
        role = request.form.get("role", "").strip()
        phone = request.form.get("phone", "").strip()

        errors = []

        if not employee_name:
            errors.append("Employee name is required.")
        elif len(employee_name) > 100:
            errors.append("Employee name cannot exceed 100 characters.")

        if not role:
            errors.append("Employee role / designation is required.")
        elif len(role) > 50:
            errors.append("Role cannot exceed 50 characters.")

        if phone and len(phone) > 15:
            errors.append("Phone number cannot exceed 15 characters.")

        if errors:
            for err in errors:
                flash(err, "danger")
            return render_template("edit_employee.html", employee=emp, active_page="employees")

        success, msg = db.update_employee(employee_id, employee_name, role, phone or None)
        if success:
            flash(msg, "success")
            return redirect(url_for("employees"))
        else:
            flash(msg, "danger")
            return render_template("edit_employee.html", employee=emp, active_page="employees")

    return render_template("edit_employee.html", employee=emp, active_page="employees")


@app.route("/employees/delete/<int:employee_id>", methods=["POST"])
def delete_employee(employee_id):
    """
    Delete employee. Prevents deletion if employee has processed sales records.
    """
    success, msg = db.delete_employee(employee_id)
    if success:
        flash(msg, "success")
    else:
        flash(msg, "danger")
    return redirect(url_for("employees"))


# =========================================================
# SALES & BILLING MODULE (TRANSACTIONAL POS)
# =========================================================

@app.route("/sales", methods=["GET"])
def sales():
    """
    Sales Transactions Directory & Search.
    Fetches real-time sales transactions from MySQL with customer and employee details.
    """
    search_query = request.args.get("q", "").strip()
    sales_list = db.get_all_sales(search_query=search_query)

    total_sales_count = len(sales_list)
    total_revenue = sum(float(s["total_amount"]) for s in sales_list) if sales_list else 0.0
    total_units_sold = sum(int(s["total_units"]) for s in sales_list) if sales_list else 0

    return render_template(
        "sales.html",
        sales=sales_list,
        search_query=search_query,
        total_sales_count=total_sales_count,
        total_revenue=total_revenue,
        total_units_sold=total_units_sold,
        active_page="sales"
    )


@app.route("/sales/new", methods=["GET", "POST"])
def new_sale():
    """
    Create a new sale transaction.
    1. Select a customer (from customer table)
    2. Select an employee (from employee table)
    3. Select products and enter quantities
    4. Automatically calculate total
    5. Save sale into Sale and line items into Sale_Item tables atomically
    6. Deduct purchased quantity from Product table using database transaction
    """
    if request.method == "POST":
        customer_id_raw = request.form.get("customer_id", "").strip()
        employee_id_raw = request.form.get("employee_id", "").strip()

        customer_id = int(customer_id_raw) if customer_id_raw and customer_id_raw.isdigit() else None
        employee_id = int(employee_id_raw) if employee_id_raw and employee_id_raw.isdigit() else None

        # Read line items from form arrays
        product_ids = request.form.getlist("product_id[]")
        quantities = request.form.getlist("quantity[]")

        errors = []
        if not customer_id:
            errors.append("Please select a customer for this transaction.")

        if not employee_id:
            errors.append("Please select the employee processing this transaction.")

        if not product_ids or len(product_ids) == 0:
            errors.append("Please add at least one product item to the sale.")

        items = []
        for idx, (p_id, q_val) in enumerate(zip(product_ids, quantities), start=1):
            p_id = p_id.strip()
            q_val = q_val.strip()
            if not p_id or not p_id.isdigit():
                errors.append(f"Line #{idx}: Please select a valid product.")
                continue
            if not q_val or not q_val.isdigit() or int(q_val) <= 0:
                errors.append(f"Line #{idx}: Quantity must be greater than zero.")
                continue
            items.append({
                "product_id": int(p_id),
                "quantity": int(q_val)
            })

        if errors:
            for err in errors:
                flash(err, "danger")
            customers_list = db.get_all_customers()
            employees_list = db.get_all_employees()
            products_list = db.get_all_products()
            return render_template(
                "new_sale.html",
                customers=customers_list,
                employees=employees_list,
                products=products_list,
                active_page="sales"
            )

        # Execute ACID database transaction
        success, sale_id, msg = db.create_sale_transaction(customer_id, employee_id, items)
        if success:
            flash(msg, "success")
            return redirect(url_for("sale_invoice", sale_id=sale_id))
        else:
            flash(msg, "danger")
            customers_list = db.get_all_customers()
            employees_list = db.get_all_employees()
            products_list = db.get_all_products()
            return render_template(
                "new_sale.html",
                customers=customers_list,
                employees=employees_list,
                products=products_list,
                active_page="sales"
            )

    # GET: Display New Sale / POS terminal
    customers_list = db.get_all_customers()
    employees_list = db.get_all_employees()
    products_list = db.get_all_products()
    return render_template(
        "new_sale.html",
        customers=customers_list,
        employees=employees_list,
        products=products_list,
        active_page="sales"
    )


@app.route("/sales/<int:sale_id>", methods=["GET"])
def sale_invoice(sale_id):
    """
    Detailed printable tax invoice / sale receipt view.
    Fetches sale header and line items joined from sale, sale_item, and product tables.
    """
    sale_data = db.get_sale_details(sale_id)
    if not sale_data:
        flash(f"Sale transaction #{sale_id} not found.", "danger")
        return redirect(url_for("sales"))

    return render_template(
        "sale_invoice.html",
        sale=sale_data["sale"],
        items=sale_data["items"],
        summary=sale_data,
        active_page="sales"
    )


# =========================================================
# INVENTORY MANAGEMENT MODULE (STOCK TRACKING & LOW STOCK)
# =========================================================

@app.route("/inventory", methods=["GET"])
def inventory():
    """
    Inventory Management Module.
    Displays:
    - Product name
    - Category
    - Supplier
    - Price
    - Current quantity
    - Stock status:
        quantity = 0 -> Out of Stock
        quantity < 10 -> Low Stock
        quantity >= 10 -> In Stock
    - Low stock filter, out-of-stock filter, category filter, and search.
    All data queried live from MySQL.
    """
    stock_filter = request.args.get("stock", "").strip()
    search_query = request.args.get("q", "").strip()
    category_id = request.args.get("category_id", "").strip()

    inventory_records = db.get_inventory_records(
        stock_filter=stock_filter,
        search_query=search_query,
        category_id=category_id or None
    )
    summary = db.get_inventory_summary()
    categories = db.get_all_categories()

    return render_template(
        "inventory.html",
        products=inventory_records,
        summary=summary,
        categories=categories,
        stock_filter=stock_filter,
        search_query=search_query,
        selected_category=category_id,
        active_page="inventory"
    )


@app.route("/reports")
def reports():
    """Store summary reports calculated live from MySQL."""
    metrics = db.get_dashboard_metrics(low_stock_threshold=10)
    return render_template("reports.html", metrics=metrics, active_page="reports")


@app.route("/api/metrics")
def api_metrics():
    """JSON API endpoint returning live dashboard metrics."""
    metrics = db.get_dashboard_metrics(low_stock_threshold=10)
    return jsonify(metrics)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    print(f"Starting Retail Store Management System on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=debug_mode)
