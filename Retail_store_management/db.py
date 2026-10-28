import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "retail_store")


def get_db_connection():
    """
    Establishes and returns a connection to the MySQL database.
    Returns dictionaries for queried rows using DictCursor.
    """
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )


def test_db_connection():
    """
    Tests connectivity to MySQL and inspects existing tables in retail_store.
    Does not modify any schema or insert any mock data.
    """
    result = {
        "success": False,
        "database": DB_NAME,
        "host": DB_HOST,
        "port": DB_PORT,
        "user": DB_USER,
        "version": None,
        "tables": {},
        "error": None,
    }

    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check MySQL server version
            cursor.execute("SELECT VERSION() AS ver;")
            ver_row = cursor.fetchone()
            result["version"] = ver_row["ver"] if ver_row else "Unknown"

            # Check existing tables and counts
            expected_tables = [
                "Category",
                "Product",
                "Supplier",
                "Customer",
                "Employee",
                "Sale",
                "Sale_Item",
            ]

            cursor.execute("SHOW TABLES;")
            raw_tables = cursor.fetchall()
            existing_tables = [list(row.values())[0] for row in raw_tables]

            for table_name in expected_tables:
                matched = next(
                    (t for t in existing_tables if t.lower() == table_name.lower()),
                    None,
                )
                if matched:
                    cursor.execute(f"SELECT COUNT(*) AS total FROM `{matched}`;")
                    count_row = cursor.fetchone()
                    result["tables"][table_name] = {
                        "exists": True,
                        "actual_name": matched,
                        "row_count": count_row["total"] if count_row else 0,
                    }
                else:
                    result["tables"][table_name] = {
                        "exists": False,
                        "actual_name": None,
                        "row_count": 0,
                    }

        connection.close()
        result["success"] = True
    except pymysql.MySQLError as err:
        result["error"] = str(err)
    except Exception as exc:
        result["error"] = str(exc)

    return result


def get_dashboard_metrics(low_stock_threshold=10):
    """
    Fetches real-time live metrics and summary statistics from the MySQL database.
    Does NOT use any hardcoded counts or mock data.
    """
    data = {
        "success": False,
        "error": None,
        "database": DB_NAME,
        "host": DB_HOST,
        "port": DB_PORT,
        "server_version": "Unknown",
        # Core live counts requested:
        "total_products": 0,
        "total_customers": 0,
        "total_suppliers": 0,
        "total_sales": 0,
        "low_stock_count": 0,
        "low_stock_threshold": low_stock_threshold,
        # Additional live operational metrics:
        "total_sales_amount": 0.0,
        "total_categories": 0,
        "total_employees": 0,
        "total_inventory_units": 0,
        "total_inventory_valuation": 0.0,
        # Data listings for dashboard tables:
        "low_stock_products": [],
        "products": [],
        "categories": [],
        "category_distribution": [],
        "employees": [],
        "recent_sales": [],
    }

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Server version
            cursor.execute("SELECT VERSION() AS ver;")
            ver = cursor.fetchone()
            if ver:
                data["server_version"] = ver["ver"]

            # 1. Total Products
            cursor.execute("SELECT COUNT(*) AS c FROM product;")
            data["total_products"] = cursor.fetchone()["c"]

            # 2. Total Customers
            cursor.execute("SELECT COUNT(*) AS c FROM customer;")
            data["total_customers"] = cursor.fetchone()["c"]

            # 3. Total Suppliers
            cursor.execute("SELECT COUNT(*) AS c FROM supplier;")
            data["total_suppliers"] = cursor.fetchone()["c"]

            # 4. Total Sales
            cursor.execute("SELECT COUNT(*) AS c, COALESCE(SUM(total_amount), 0) AS total_val FROM sale;")
            sale_res = cursor.fetchone()
            data["total_sales"] = sale_res["c"]
            data["total_sales_amount"] = float(sale_res["total_val"])

            # 5. Low Stock Products Count (quantity < 10)
            cursor.execute(
                "SELECT COUNT(*) AS c FROM product WHERE quantity < %s;",
                (low_stock_threshold,),
            )
            data["low_stock_count"] = cursor.fetchone()["c"]

            # Additional aggregate counts:
            cursor.execute("SELECT COUNT(*) AS c FROM category;")
            data["total_categories"] = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) AS c FROM employee;")
            data["total_employees"] = cursor.fetchone()["c"]

            cursor.execute(
                "SELECT COALESCE(SUM(quantity), 0) AS total_qty, COALESCE(SUM(quantity * price), 0) AS total_val FROM product;"
            )
            inv_stats = cursor.fetchone()
            data["total_inventory_units"] = int(inv_stats["total_qty"])
            data["total_inventory_valuation"] = float(inv_stats["total_val"])

            # Low Stock Products List (joined with Category and Supplier, quantity < 10)
            cursor.execute(
                """
                SELECT p.product_id, p.product_name, p.price, p.quantity,
                       COALESCE(c.category_name, 'Uncategorized') AS category_name,
                       COALESCE(s.supplier_name, 'No Supplier') AS supplier_name
                FROM product p
                LEFT JOIN category c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE p.quantity < %s
                ORDER BY p.quantity ASC;
                """,
                (low_stock_threshold,),
            )
            data["low_stock_products"] = cursor.fetchall()

            # All Products with Join
            cursor.execute(
                """
                SELECT p.product_id, p.product_name, p.price, p.quantity,
                       COALESCE(c.category_name, 'Uncategorized') AS category_name,
                       COALESCE(s.supplier_name, 'No Supplier') AS supplier_name
                FROM product p
                LEFT JOIN category c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                ORDER BY p.product_id ASC;
                """
            )
            data["products"] = cursor.fetchall()

            # Category Distribution
            cursor.execute(
                """
                SELECT c.category_id, c.category_name, COUNT(p.product_id) AS product_count
                FROM category c
                LEFT JOIN product p ON c.category_id = p.category_id
                GROUP BY c.category_id, c.category_name
                ORDER BY product_count DESC;
                """
            )
            data["category_distribution"] = cursor.fetchall()

            # Employees List
            cursor.execute(
                "SELECT employee_id, employee_name, role, phone FROM employee ORDER BY employee_id ASC;"
            )
            data["employees"] = cursor.fetchall()

            # Recent Sales (if any)
            cursor.execute(
                """
                SELECT s.sale_id, s.sale_date, s.total_amount,
                       c.customer_name, e.employee_name
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN employee e ON s.employee_id = e.employee_id
                ORDER BY s.sale_date DESC
                LIMIT 5;
                """
            )
            data["recent_sales"] = cursor.fetchall()

        conn.close()
        data["success"] = True
    except pymysql.MySQLError as err:
        data["error"] = str(err)
    except Exception as exc:
        data["error"] = str(exc)

    return data


def get_all_products(search_query=None, category_id=None, supplier_id=None):
    """
    Fetches all products joined with category and supplier.
    Supports filtering by search_query, category_id, and supplier_id.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT p.product_id, p.product_name, p.price, p.quantity,
                       p.category_id, COALESCE(c.category_name, 'Uncategorized') AS category_name,
                       p.supplier_id, COALESCE(s.supplier_name, 'No Supplier') AS supplier_name
                FROM product p
                LEFT JOIN category c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
            """
            where_clauses = []
            params = []

            if search_query and search_query.strip():
                clean_query = search_query.strip()
                term = f"%{clean_query}%"
                where_clauses.append(
                    "(p.product_name LIKE %s OR c.category_name LIKE %s OR s.supplier_name LIKE %s OR CAST(p.product_id AS CHAR) = %s)"
                )
                params.extend([term, term, term, clean_query])

            if category_id:
                try:
                    cat_id_int = int(category_id)
                    if cat_id_int > 0:
                        where_clauses.append("p.category_id = %s")
                        params.append(cat_id_int)
                except ValueError:
                    pass

            if supplier_id:
                try:
                    sup_id_int = int(supplier_id)
                    if sup_id_int > 0:
                        where_clauses.append("p.supplier_id = %s")
                        params.append(sup_id_int)
                except ValueError:
                    pass

            if where_clauses:
                sql += " WHERE " + " AND ".join(where_clauses)

            sql += " ORDER BY p.product_id ASC;"
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_product_by_id(product_id):
    """
    Fetches a single product by its product_id with joined category and supplier names.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.product_id, p.product_name, p.price, p.quantity,
                       p.category_id, COALESCE(c.category_name, 'Uncategorized') AS category_name,
                       p.supplier_id, COALESCE(s.supplier_name, 'No Supplier') AS supplier_name
                FROM product p
                LEFT JOIN category c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE p.product_id = %s;
                """,
                (product_id,),
            )
            return cursor.fetchone()
    finally:
        conn.close()


def add_product(product_name, price, quantity, category_id, supplier_id):
    """
    Inserts a new product into the product table.
    Returns (success: bool, product_id: int or None, message: str).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO product (product_name, price, quantity, category_id, supplier_id)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (product_name, price, quantity, category_id, supplier_id),
            )
            new_id = cursor.lastrowid
            return True, new_id, f"Product '{product_name}' successfully added (ID #{new_id})!"
    except pymysql.MySQLError as err:
        return False, None, f"Database error adding product: {err}"
    finally:
        conn.close()


def update_product(product_id, product_name, price, quantity, category_id, supplier_id):
    """
    Updates an existing product in the product table.
    Returns (success: bool, message: str).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE product
                SET product_name = %s, price = %s, quantity = %s, category_id = %s, supplier_id = %s
                WHERE product_id = %s;
                """,
                (product_name, price, quantity, category_id, supplier_id, product_id),
            )
            return True, f"Product '{product_name}' (ID #{product_id}) updated successfully!"
    except pymysql.MySQLError as err:
        return False, f"Database error updating product: {err}"
    finally:
        conn.close()


def delete_product(product_id):
    """
    Safely deletes a product if not referenced by any sales items.
    Returns (success: bool, message: str).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check foreign key reference in sale_item table
            cursor.execute(
                "SELECT COUNT(*) AS c FROM sale_item WHERE product_id = %s;",
                (product_id,),
            )
            sale_item_count = cursor.fetchone()["c"]
            if sale_item_count > 0:
                return (
                    False,
                    f"Cannot delete product ID #{product_id} because it is referenced in {sale_item_count} sales transaction(s).",
                )

            # Check if product exists
            cursor.execute(
                "SELECT product_name FROM product WHERE product_id = %s;",
                (product_id,),
            )
            prod = cursor.fetchone()
            if not prod:
                return False, f"Product ID #{product_id} does not exist."

            prod_name = prod["product_name"]
            cursor.execute("DELETE FROM product WHERE product_id = %s;", (product_id,))
            return True, f"Product '{prod_name}' (ID #{product_id}) was successfully deleted."
    except pymysql.MySQLError as err:
        return False, f"Database error while deleting product: {err}"
    finally:
        conn.close()


def get_categories_dropdown():
    """Fetches categories formatted for select dropdown options."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT category_id, category_name FROM category ORDER BY category_name ASC;"
            )
            return cursor.fetchall()
    finally:
        conn.close()


def get_suppliers_dropdown():
    """Fetches suppliers formatted for select dropdown options."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT supplier_id, supplier_name FROM supplier ORDER BY supplier_name ASC;"
            )
            return cursor.fetchall()
    finally:
        conn.close()



# =========================================================
# CATEGORY MANAGEMENT METHODS
# =========================================================

def get_all_categories(search_query=None):
    """
    Fetches all categories along with count of associated products.
    Supports optional search filter.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT c.category_id, c.category_name, COUNT(p.product_id) AS product_count
                FROM category c
                LEFT JOIN product p ON c.category_id = p.category_id
            """
            params = []
            if search_query and search_query.strip():
                clean_query = search_query.strip()
                sql += " WHERE (c.category_name LIKE %s OR CAST(c.category_id AS CHAR) = %s)"
                params.extend([f"%{clean_query}%", clean_query])

            sql += """
                GROUP BY c.category_id, c.category_name
                ORDER BY c.category_id ASC;
            """
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_category_by_id(category_id):
    """
    Fetches a single category by ID along with its associated product count.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.category_id, c.category_name, COUNT(p.product_id) AS product_count
                FROM category c
                LEFT JOIN product p ON c.category_id = p.category_id
                WHERE c.category_id = %s
                GROUP BY c.category_id, c.category_name;
                """,
                (category_id,),
            )
            return cursor.fetchone()
    finally:
        conn.close()


def add_category(category_name):
    """
    Inserts a new category into the category table.
    Enforces uniqueness of category_name.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO category (category_name) VALUES (%s);",
                (category_name,),
            )
            new_id = cursor.lastrowid
            return True, new_id, f"Category '{category_name}' added successfully (ID #{new_id})!"
    except pymysql.MySQLError as err:
        if err.args[0] == 1062:  # Duplicate entry
            return False, None, f"Category '{category_name}' already exists."
        return False, None, f"Database error adding category: {err}"
    finally:
        conn.close()


def update_category(category_id, category_name):
    """
    Updates an existing category.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE category SET category_name = %s WHERE category_id = %s;",
                (category_name, category_id),
            )
            return True, f"Category '{category_name}' (ID #{category_id}) updated successfully!"
    except pymysql.MySQLError as err:
        if err.args[0] == 1062:
            return False, f"Another category with the name '{category_name}' already exists."
        return False, f"Database error updating category: {err}"
    finally:
        conn.close()


def delete_category(category_id):
    """
    Deletes a category if no products reference it.
    Uses MySQL foreign key constraints to prevent orphan products.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if category exists
            cursor.execute("SELECT category_name FROM category WHERE category_id = %s;", (category_id,))
            cat = cursor.fetchone()
            if not cat:
                return False, f"Category ID #{category_id} not found."
            cat_name = cat["category_name"]

            # Foreign key integrity check: Check if products reference this category
            cursor.execute("SELECT COUNT(*) AS c FROM product WHERE category_id = %s;", (category_id,))
            product_count = cursor.fetchone()["c"]
            if product_count > 0:
                return (
                    False,
                    f"Cannot delete category '{cat_name}' (ID #{category_id}) because {product_count} product(s) are currently assigned to it. Please reassign or delete the associated products first.",
                )

            cursor.execute("DELETE FROM category WHERE category_id = %s;", (category_id,))
            return True, f"Category '{cat_name}' (ID #{category_id}) was successfully deleted."
    except pymysql.MySQLError as err:
        if err.args[0] == 1451:
            return (
                False,
                f"Database constraint error: Cannot delete category '{cat_name}' because it is referenced by existing products.",
            )
        return False, f"Database error deleting category: {err}"
    finally:
        conn.close()


# =========================================================
# SUPPLIER MANAGEMENT METHODS
# =========================================================

def get_all_suppliers(search_query=None):
    """
    Fetches all suppliers with product count provided.
    Supports search by name, phone, email, or supplier ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT s.supplier_id, s.supplier_name, s.phone, s.email,
                       COUNT(p.product_id) AS product_count
                FROM supplier s
                LEFT JOIN product p ON s.supplier_id = p.supplier_id
            """
            params = []
            if search_query and search_query.strip():
                clean_query = search_query.strip()
                sql += """
                    WHERE (s.supplier_name LIKE %s 
                        OR s.phone LIKE %s 
                        OR s.email LIKE %s 
                        OR CAST(s.supplier_id AS CHAR) = %s)
                """
                term = f"%{clean_query}%"
                params.extend([term, term, term, clean_query])

            sql += """
                GROUP BY s.supplier_id, s.supplier_name, s.phone, s.email
                ORDER BY s.supplier_id ASC;
            """
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_supplier_by_id(supplier_id):
    """
    Fetches a single supplier by ID along with product count.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.supplier_id, s.supplier_name, s.phone, s.email,
                       COUNT(p.product_id) AS product_count
                FROM supplier s
                LEFT JOIN product p ON s.supplier_id = p.supplier_id
                WHERE s.supplier_id = %s
                GROUP BY s.supplier_id, s.supplier_name, s.phone, s.email;
                """,
                (supplier_id,),
            )
            return cursor.fetchone()
    finally:
        conn.close()


def add_supplier(supplier_name, phone, email):
    """
    Inserts a new supplier into the supplier table.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO supplier (supplier_name, phone, email)
                VALUES (%s, %s, %s);
                """,
                (supplier_name, phone, email),
            )
            new_id = cursor.lastrowid
            return True, new_id, f"Supplier '{supplier_name}' added successfully (ID #{new_id})!"
    except pymysql.MySQLError as err:
        return False, None, f"Database error adding supplier: {err}"
    finally:
        conn.close()


def update_supplier(supplier_id, supplier_name, phone, email):
    """
    Updates an existing supplier's details.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE supplier
                SET supplier_name = %s, phone = %s, email = %s
                WHERE supplier_id = %s;
                """,
                (supplier_name, phone, email, supplier_id),
            )
            return True, f"Supplier '{supplier_name}' (ID #{supplier_id}) updated successfully!"
    except pymysql.MySQLError as err:
        return False, f"Database error updating supplier: {err}"
    finally:
        conn.close()


def delete_supplier(supplier_id):
    """
    Deletes a supplier if no products reference them.
    Protects foreign-key references in the product table.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT supplier_name FROM supplier WHERE supplier_id = %s;", (supplier_id,))
            supp = cursor.fetchone()
            if not supp:
                return False, f"Supplier ID #{supplier_id} not found."
            supp_name = supp["supplier_name"]

            # Foreign key integrity check: Check if products are supplied by this supplier
            cursor.execute("SELECT COUNT(*) AS c FROM product WHERE supplier_id = %s;", (supplier_id,))
            product_count = cursor.fetchone()["c"]
            if product_count > 0:
                return (
                    False,
                    f"Cannot delete supplier '{supp_name}' (ID #{supplier_id}) because {product_count} product(s) are associated with this supplier. Please reassign or delete the associated products first.",
                )

            cursor.execute("DELETE FROM supplier WHERE supplier_id = %s;", (supplier_id,))
            return True, f"Supplier '{supp_name}' (ID #{supplier_id}) was successfully deleted."
    except pymysql.MySQLError as err:
        if err.args[0] == 1451:
            return (
                False,
                f"Database constraint error: Cannot delete supplier '{supp_name}' because it is referenced by existing products.",
            )
        return False, f"Database error deleting supplier: {err}"
    finally:
        conn.close()


# =========================================================
# CUSTOMER MANAGEMENT METHODS
# =========================================================

def get_all_customers(search_query=None):
    """
    Fetches all customers with order counts.
    Supports search by name, phone, email, or customer ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT c.customer_id, c.customer_name, c.phone, c.email,
                       COUNT(s.sale_id) AS total_orders
                FROM customer c
                LEFT JOIN sale s ON c.customer_id = s.customer_id
            """
            params = []
            if search_query and search_query.strip():
                clean_query = search_query.strip()
                sql += """
                    WHERE (c.customer_name LIKE %s 
                        OR c.phone LIKE %s 
                        OR c.email LIKE %s 
                        OR CAST(c.customer_id AS CHAR) = %s)
                """
                term = f"%{clean_query}%"
                params.extend([term, term, term, clean_query])

            sql += """
                GROUP BY c.customer_id, c.customer_name, c.phone, c.email
                ORDER BY c.customer_id ASC;
            """
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_customer_by_id(customer_id):
    """
    Fetches a single customer by ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.customer_id, c.customer_name, c.phone, c.email,
                       COUNT(s.sale_id) AS total_orders
                FROM customer c
                LEFT JOIN sale s ON c.customer_id = s.customer_id
                WHERE c.customer_id = %s
                GROUP BY c.customer_id, c.customer_name, c.phone, c.email;
                """,
                (customer_id,),
            )
            return cursor.fetchone()
    finally:
        conn.close()


def add_customer(customer_name, phone, email):
    """
    Inserts a new customer into the customer table.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO customer (customer_name, phone, email)
                VALUES (%s, %s, %s);
                """,
                (customer_name, phone, email),
            )
            new_id = cursor.lastrowid
            return True, new_id, f"Customer '{customer_name}' added successfully (ID #{new_id})!"
    except pymysql.MySQLError as err:
        return False, None, f"Database error adding customer: {err}"
    finally:
        conn.close()


def update_customer(customer_id, customer_name, phone, email):
    """
    Updates an existing customer's details.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE customer
                SET customer_name = %s, phone = %s, email = %s
                WHERE customer_id = %s;
                """,
                (customer_name, phone, email, customer_id),
            )
            return True, f"Customer '{customer_name}' (ID #{customer_id}) updated successfully!"
    except pymysql.MySQLError as err:
        return False, f"Database error updating customer: {err}"
    finally:
        conn.close()


def delete_customer(customer_id):
    """
    Deletes a customer if no sales records reference them.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT customer_name FROM customer WHERE customer_id = %s;", (customer_id,))
            cust = cursor.fetchone()
            if not cust:
                return False, f"Customer ID #{customer_id} not found."
            cust_name = cust["customer_name"]

            # Check foreign key in sale table
            cursor.execute("SELECT COUNT(*) AS c FROM sale WHERE customer_id = %s;", (customer_id,))
            sale_count = cursor.fetchone()["c"]
            if sale_count > 0:
                return (
                    False,
                    f"Cannot delete customer '{cust_name}' (ID #{customer_id}) because they have {sale_count} recorded sales transaction(s).",
                )

            cursor.execute("DELETE FROM customer WHERE customer_id = %s;", (customer_id,))
            return True, f"Customer '{cust_name}' (ID #{customer_id}) was successfully deleted."
    except pymysql.MySQLError as err:
        if err.args[0] == 1451:
            return (
                False,
                f"Database constraint error: Cannot delete customer '{cust_name}' because they are referenced in sales records.",
            )
        return False, f"Database error deleting customer: {err}"
    finally:
        conn.close()


# =========================================================
# EMPLOYEE MANAGEMENT METHODS
# =========================================================

def get_all_employees(search_query=None):
    """
    Fetches all employees with sales counts.
    Supports search by name, role, phone, or employee ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT e.employee_id, e.employee_name, e.role, e.phone,
                       COUNT(s.sale_id) AS sales_handled
                FROM employee e
                LEFT JOIN sale s ON e.employee_id = s.employee_id
            """
            params = []
            if search_query and search_query.strip():
                clean_query = search_query.strip()
                sql += """
                    WHERE (e.employee_name LIKE %s 
                        OR e.role LIKE %s 
                        OR e.phone LIKE %s 
                        OR CAST(e.employee_id AS CHAR) = %s)
                """
                term = f"%{clean_query}%"
                params.extend([term, term, term, clean_query])

            sql += """
                GROUP BY e.employee_id, e.employee_name, e.role, e.phone
                ORDER BY e.employee_id ASC;
            """
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_employee_by_id(employee_id):
    """
    Fetches a single employee by ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT e.employee_id, e.employee_name, e.role, e.phone,
                       COUNT(s.sale_id) AS sales_handled
                FROM employee e
                LEFT JOIN sale s ON e.employee_id = s.employee_id
                WHERE e.employee_id = %s
                GROUP BY e.employee_id, e.employee_name, e.role, e.phone;
                """,
                (employee_id,),
            )
            return cursor.fetchone()
    finally:
        conn.close()


def add_employee(employee_name, role, phone):
    """
    Inserts a new employee into the employee table.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO employee (employee_name, role, phone)
                VALUES (%s, %s, %s);
                """,
                (employee_name, role, phone),
            )
            new_id = cursor.lastrowid
            return True, new_id, f"Employee '{employee_name}' added successfully (ID #{new_id})!"
    except pymysql.MySQLError as err:
        return False, None, f"Database error adding employee: {err}"
    finally:
        conn.close()


def update_employee(employee_id, employee_name, role, phone):
    """
    Updates an existing employee's details.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE employee
                SET employee_name = %s, role = %s, phone = %s
                WHERE employee_id = %s;
                """,
                (employee_name, role, phone, employee_id),
            )
            return True, f"Employee '{employee_name}' (ID #{employee_id}) updated successfully!"
    except pymysql.MySQLError as err:
        return False, f"Database error updating employee: {err}"
    finally:
        conn.close()


def delete_employee(employee_id):
    """
    Deletes an employee if no sales records reference them.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT employee_name FROM employee WHERE employee_id = %s;", (employee_id,))
            emp = cursor.fetchone()
            if not emp:
                return False, f"Employee ID #{employee_id} not found."
            emp_name = emp["employee_name"]

            # Check foreign key in sale table
            cursor.execute("SELECT COUNT(*) AS c FROM sale WHERE employee_id = %s;", (employee_id,))
            sale_count = cursor.fetchone()["c"]
            if sale_count > 0:
                return (
                    False,
                    f"Cannot delete employee '{emp_name}' (ID #{employee_id}) because they have {sale_count} recorded sales transaction(s).",
                )

            cursor.execute("DELETE FROM employee WHERE employee_id = %s;", (employee_id,))
            return True, f"Employee '{emp_name}' (ID #{employee_id}) was successfully deleted."
    except pymysql.MySQLError as err:
        if err.args[0] == 1451:
            return (
                False,
                f"Database constraint error: Cannot delete employee '{emp_name}' because they are referenced in sales records.",
            )
        return False, f"Database error deleting employee: {err}"
    finally:
        conn.close()


# =========================================================
# SALES & BILLING TRANSACTION METHODS
# =========================================================

def get_all_sales(search_query=None):
    """
    Fetches all sales records with customer, billing employee, and line item statistics.
    Supports searching by customer name, employee name, customer phone, or sale ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT s.sale_id, s.sale_date, s.total_amount,
                       c.customer_id,
                       COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
                       c.phone AS customer_phone,
                       e.employee_id,
                       COALESCE(e.employee_name, 'Store Staff') AS employee_name,
                       e.role AS employee_role,
                       COUNT(si.sale_item_id) AS item_count,
                       COALESCE(SUM(si.quantity), 0) AS total_units
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN employee e ON s.employee_id = e.employee_id
                LEFT JOIN sale_item si ON s.sale_id = si.sale_id
            """
            params = []
            if search_query and search_query.strip():
                clean_query = search_query.strip()
                sql += """
                    WHERE (c.customer_name LIKE %s 
                        OR e.employee_name LIKE %s 
                        OR c.phone LIKE %s 
                        OR CAST(s.sale_id AS CHAR) = %s)
                """
                term = f"%{clean_query}%"
                params.extend([term, term, term, clean_query])

            sql += """
                GROUP BY s.sale_id, s.sale_date, s.total_amount,
                         c.customer_id, c.customer_name, c.phone,
                         e.employee_id, e.employee_name, e.role
                ORDER BY s.sale_date DESC, s.sale_id DESC;
            """
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_sale_details(sale_id):
    """
    Fetches complete sale invoice details:
    - Sale header (date, customer info, employee info, total amount)
    - Line items from sale_item joined with product and category
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Fetch sale header
            cursor.execute(
                """
                SELECT s.sale_id, s.sale_date, s.total_amount,
                       c.customer_id,
                       COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
                       c.phone AS customer_phone,
                       c.email AS customer_email,
                       e.employee_id,
                       COALESCE(e.employee_name, 'Store Staff') AS employee_name,
                       e.role AS employee_role,
                       e.phone AS employee_phone
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN employee e ON s.employee_id = e.employee_id
                WHERE s.sale_id = %s;
                """,
                (sale_id,),
            )
            sale_header = cursor.fetchone()
            if not sale_header:
                return None

            # 2. Fetch line items
            cursor.execute(
                """
                SELECT si.sale_item_id, si.sale_id, si.product_id,
                       si.quantity, si.selling_price,
                       (si.quantity * si.selling_price) AS line_total,
                       p.product_name,
                       COALESCE(cat.category_name, 'General') AS category_name
                FROM sale_item si
                LEFT JOIN product p ON si.product_id = p.product_id
                LEFT JOIN category cat ON p.category_id = cat.category_id
                WHERE si.sale_id = %s
                ORDER BY si.sale_item_id ASC;
                """,
                (sale_id,),
            )
            items = cursor.fetchall()
            total_units = sum(item["quantity"] for item in items)

            return {
                "sale": sale_header,
                "items": items,
                "item_count": len(items),
                "total_units": total_units,
            }
    finally:
        conn.close()


def create_sale_transaction(customer_id, employee_id, items):
    """
    Executes a complete sale inside a strict database transaction.
    
    Guarantees:
    - Atomicity: The sale and all sale items are either completely saved or fully rolled back.
    - Relational integrity: Sale stored in `sale`, purchased items stored in `sale_item`.
    - Inventory update: Stock is deducted from `product` table.
    - Concurrency safety: Uses SELECT ... FOR UPDATE to lock product rows and prevent negative inventory.
    - Immediate rollback if any error or insufficient stock occurs.
    
    Parameters:
    - customer_id: Selected customer ID (int or None)
    - employee_id: Selected billing employee ID (int or None)
    - items: List of dicts, e.g. [{'product_id': 1, 'quantity': 2}, ...]
    
    Returns:
    - (success: bool, sale_id: int or None, message: str)
    """
    if not items:
        return False, None, "Sale must include at least one product."

    # Consolidate duplicate products if user selected same product in multiple rows
    consolidated_items = {}
    for idx, item in enumerate(items, start=1):
        try:
            prod_id = int(item.get("product_id", 0))
            qty = int(item.get("quantity", 0))
        except (ValueError, TypeError):
            return False, None, f"Invalid product ID or quantity specified in item row #{idx}."

        if prod_id <= 0:
            return False, None, f"Please select a valid product in item row #{idx}."
        if qty <= 0:
            return False, None, f"Quantity must be at least 1 in item row #{idx}."

        consolidated_items[prod_id] = consolidated_items.get(prod_id, 0) + qty

    conn = get_db_connection()
    try:
        # Disable autocommit to start ACID transaction
        conn.autocommit(False)
        with conn.cursor() as cursor:
            # 1. Validate customer exists if provided
            if customer_id:
                cursor.execute("SELECT customer_id, customer_name FROM customer WHERE customer_id = %s;", (customer_id,))
                cust = cursor.fetchone()
                if not cust:
                    conn.rollback()
                    return False, None, f"Customer with ID #{customer_id} does not exist."

            # 2. Validate employee exists if provided
            if employee_id:
                cursor.execute("SELECT employee_id, employee_name FROM employee WHERE employee_id = %s;", (employee_id,))
                emp = cursor.fetchone()
                if not emp:
                    conn.rollback()
                    return False, None, f"Employee with ID #{employee_id} does not exist."

            # 3. Check stock availability with row-level locks
            sale_items_data = []
            total_amount = 0.0

            for prod_id, req_qty in consolidated_items.items():
                cursor.execute(
                    """
                    SELECT product_id, product_name, price, quantity
                    FROM product
                    WHERE product_id = %s
                    FOR UPDATE;
                    """,
                    (prod_id,),
                )
                prod = cursor.fetchone()
                if not prod:
                    conn.rollback()
                    return False, None, f"Product ID #{prod_id} not found."

                avail_qty = prod["quantity"]
                unit_price = float(prod["price"])
                prod_name = prod["product_name"]

                if req_qty > avail_qty:
                    conn.rollback()
                    return (
                        False,
                        None,
                        f"Insufficient stock for '{prod_name}'. Requested: {req_qty} unit(s), Available: {avail_qty} unit(s). Transaction rolled back.",
                    )

                line_total = round(req_qty * unit_price, 2)
                total_amount += line_total
                sale_items_data.append({
                    "product_id": prod_id,
                    "quantity": req_qty,
                    "selling_price": unit_price,
                    "product_name": prod_name,
                })

            total_amount = round(total_amount, 2)

            # 4. Insert header record into `sale` table
            cursor.execute(
                """
                INSERT INTO sale (sale_date, customer_id, employee_id, total_amount)
                VALUES (NOW(), %s, %s, %s);
                """,
                (customer_id if customer_id else None, employee_id if employee_id else None, total_amount),
            )
            sale_id = cursor.lastrowid

            # 5. Insert each item into `sale_item` and deduct quantity from `product`
            for item in sale_items_data:
                cursor.execute(
                    """
                    INSERT INTO sale_item (sale_id, product_id, quantity, selling_price)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (sale_id, item["product_id"], item["quantity"], item["selling_price"]),
                )

                cursor.execute(
                    """
                    UPDATE product
                    SET quantity = quantity - %s
                    WHERE product_id = %s;
                    """,
                    (item["quantity"], item["product_id"]),
                )

            # 6. Commit the entire transaction atomically
            conn.commit()
            return True, sale_id, f"Sale #{sale_id} created successfully! Grand Total: ₹{total_amount:.2f}."

    except pymysql.MySQLError as err:
        try:
            conn.rollback()
        except Exception:
            pass
        return False, None, f"Database transaction failed and was rolled back: {err}"
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        return False, None, f"Unexpected error during transaction: {exc}"
    finally:
        conn.close()


# =========================================================
# INVENTORY MANAGEMENT MODULE
# =========================================================

def get_inventory_records(stock_filter=None, search_query=None, category_id=None):
    """
    Fetches inventory records from Product joined with Category and Supplier.
    
    Stock status rules:
      - quantity = 0  -> 'Out of Stock'
      - quantity < 10 -> 'Low Stock'
      - quantity >= 10 -> 'In Stock'
      
    Filters:
      - stock_filter: 'low_stock' (< 10), 'out_of_stock' (= 0), 'in_stock' (>= 10), or None/all.
      - search_query: search by product name, category name, supplier name, or product ID.
      - category_id: filter by specific category ID.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT p.product_id, p.product_name, p.price, p.quantity,
                       (p.price * p.quantity) AS inventory_value,
                       COALESCE(c.category_name, 'Uncategorized') AS category_name,
                       c.category_id,
                       COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                       s.supplier_id,
                       s.phone AS supplier_phone,
                       CASE
                           WHEN p.quantity = 0 THEN 'Out of Stock'
                           WHEN p.quantity < 10 THEN 'Low Stock'
                           ELSE 'In Stock'
                       END AS stock_status
                FROM product p
                LEFT JOIN category c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE 1=1
            """
            params = []

            # Stock status filter
            if stock_filter == "low_stock":
                sql += " AND p.quantity < 10"
            elif stock_filter == "out_of_stock":
                sql += " AND p.quantity = 0"
            elif stock_filter == "in_stock":
                sql += " AND p.quantity >= 10"

            # Category filter
            if category_id:
                try:
                    cat_id_int = int(category_id)
                    sql += " AND p.category_id = %s"
                    params.append(cat_id_int)
                except (ValueError, TypeError):
                    pass

            # Search keyword
            if search_query and search_query.strip():
                clean_q = search_query.strip()
                sql += """
                    AND (p.product_name LIKE %s 
                         OR c.category_name LIKE %s 
                         OR s.supplier_name LIKE %s 
                         OR CAST(p.product_id AS CHAR) = %s)
                """
                term = f"%{clean_q}%"
                params.extend([term, term, term, clean_q])

            sql += " ORDER BY p.quantity ASC, p.product_name ASC;"
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        conn.close()


def get_inventory_summary():
    """
    Calculates live inventory aggregates from MySQL:
    - total_products
    - total_units
    - total_valuation
    - in_stock_count (quantity >= 10)
    - low_stock_count (quantity < 10 and quantity > 0)
    - out_of_stock_count (quantity = 0)
    - total_low_stock_count (quantity < 10)
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    COUNT(*) AS total_products,
                    COALESCE(SUM(quantity), 0) AS total_units,
                    COALESCE(SUM(quantity * price), 0) AS total_valuation,
                    COALESCE(SUM(CASE WHEN quantity >= 10 THEN 1 ELSE 0 END), 0) AS in_stock_count,
                    COALESCE(SUM(CASE WHEN quantity < 10 AND quantity > 0 THEN 1 ELSE 0 END), 0) AS low_stock_count,
                    COALESCE(SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
                    COALESCE(SUM(CASE WHEN quantity < 10 THEN 1 ELSE 0 END), 0) AS total_low_stock_count
                FROM product;
                """
            )
            summary = cursor.fetchone()
            if not summary:
                summary = {
                    "total_products": 0,
                    "total_units": 0,
                    "total_valuation": 0.0,
                    "in_stock_count": 0,
                    "low_stock_count": 0,
                    "out_of_stock_count": 0,
                    "total_low_stock_count": 0,
                }
            else:
                summary["total_valuation"] = float(summary["total_valuation"])
            return summary
    finally:
        conn.close()

