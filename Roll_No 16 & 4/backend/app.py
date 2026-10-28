import os
import warnings
from functools import wraps
from datetime import datetime
from decimal import Decimal
from flask import (
    Flask, render_template, request, redirect,
    url_for, flash, session, jsonify
)
import mysql.connector
from mysql.connector import Error
from werkzeug.security import check_password_hash, generate_password_hash
from config import Config

warnings.filterwarnings("ignore", category=DeprecationWarning)

# Dynamic path discovery for separate frontend/ directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))

if os.path.exists(os.path.join(FRONTEND_DIR, 'templates')):
    template_dir = os.path.join(FRONTEND_DIR, 'templates')
    static_dir = os.path.join(FRONTEND_DIR, 'static')
else:
    template_dir = os.path.join(BASE_DIR, 'templates')
    static_dir = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
app.config.from_object(Config)

# -----------------------------------------------------------------------------
# DATABASE CONNECTION HELPER
# -----------------------------------------------------------------------------
def get_db_connection():
    """
    Establishes and returns a connection to MySQL 8.x database.
    Uses parameterized queries and dictionary cursor.
    """
    try:
        connection = mysql.connector.connect(
            host=app.config['MYSQL_HOST'],
            port=app.config['MYSQL_PORT'],
            database=app.config['MYSQL_DATABASE'],
            user=app.config['MYSQL_USER'],
            password=app.config['MYSQL_PASSWORD'],
            autocommit=True
        )
        return connection
    except Error as e:
        app.logger.error(f"Database connection error: {e}")
        return None

# -----------------------------------------------------------------------------
# AUTHENTICATION & ACCESS CONTROL DECORATORS
# -----------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash("Please sign in to access the College Management System.", "warning")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash("Please sign in first.", "warning")
                return redirect(url_for('login'))
            user_role = session.get('role', '')
            if user_role not in allowed_roles and 'Admin' not in user_role:
                flash(f"Access denied. Required permission: {', '.join(allowed_roles)}.", "danger")
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# -----------------------------------------------------------------------------
# AUTHENTICATION ROUTES
# -----------------------------------------------------------------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            flash("Username and password are required.", "danger")
            return render_template('login.html')

        conn = get_db_connection()
        if not conn:
            flash("Database connection failed. Ensure MySQL is running on localhost:3306.", "danger")
            return render_template('login.html')

        try:
            cursor = conn.cursor(dictionary=True)
            query = "SELECT user_id, username, password_hash, full_name, role FROM users WHERE username = %s"
            cursor.execute(query, (username,))
            user = cursor.fetchone()

            if user and check_password_hash(user['password_hash'], password):
                session['user_id'] = user['user_id']
                session['username'] = user['username']
                session['full_name'] = user['full_name']
                session['role'] = user['role']
                flash(f"Welcome back, {user['full_name']}! Signed in as {user['role']}.", "success")
                return redirect(url_for('dashboard'))
            else:
                flash("Invalid username or password.", "danger")
        except Error as e:
            flash(f"Database error during authentication: {e}", "danger")
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("You have been signed out successfully.", "info")
    return redirect(url_for('login'))

# -----------------------------------------------------------------------------
# DASHBOARD ROUTE
# -----------------------------------------------------------------------------
@app.route('/')
@login_required
def dashboard():
    conn = get_db_connection()
    if not conn:
        flash("Could not connect to MySQL database.", "danger")
        return render_template('dashboard.html', stats={})

    stats = {}
    try:
        cursor = conn.cursor(dictionary=True)

        # 1. Total counts
        cursor.execute("SELECT COUNT(*) AS total FROM students")
        stats['total_students'] = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM faculty")
        stats['total_faculty'] = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM departments")
        stats['total_departments'] = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM courses")
        stats['total_courses'] = cursor.fetchone()['total']

        # 2. Fee statistics
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_amount), 0) AS total_fee,
                COALESCE(SUM(paid_amount), 0) AS total_paid,
                COALESCE(SUM(total_amount - paid_amount), 0) AS total_pending
            FROM fees
        """)
        fee_data = cursor.fetchone()
        stats['total_fee'] = float(fee_data['total_fee'])
        stats['total_paid'] = float(fee_data['total_paid'])
        stats['total_pending'] = float(fee_data['total_pending'])

        # 3. Department student distribution for Chart.js
        cursor.execute("""
            SELECT d.department_name, COUNT(s.student_id) AS student_count
            FROM departments d
            LEFT JOIN students s ON d.department_id = s.department_id
            GROUP BY d.department_id, d.department_name
            ORDER BY d.department_name
        """)
        stats['dept_distribution'] = cursor.fetchall()

        # 4. Recent student registrations
        cursor.execute("""
            SELECT s.student_id, s.roll_number, s.full_name, d.department_name, s.semester
            FROM students s
            JOIN departments d ON s.department_id = d.department_id
            ORDER BY s.student_id DESC
            LIMIT 5
        """)
        stats['recent_students'] = cursor.fetchall()

        # 5. Recent audit log entries
        cursor.execute("""
            SELECT log_id, action_type, performed_by, details, action_timestamp
            FROM student_audit_log
            ORDER BY log_id DESC
            LIMIT 5
        """)
        stats['recent_audits'] = cursor.fetchall()

    except Error as e:
        flash(f"Error loading dashboard statistics: {e}", "danger")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

    return render_template('dashboard.html', stats=stats)

# -----------------------------------------------------------------------------
# 1. DEPARTMENTS CRUD
# -----------------------------------------------------------------------------
@app.route('/departments')
@login_required
def departments():
    conn = get_db_connection()
    dept_list = []
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT 
                    d.department_id, d.department_name, d.hod_name, d.office_location,
                    COUNT(DISTINCT s.student_id) AS student_count,
                    COUNT(DISTINCT f.faculty_id) AS faculty_count,
                    COUNT(DISTINCT c.course_id) AS course_count
                FROM departments d
                LEFT JOIN students s ON d.department_id = s.department_id
                LEFT JOIN faculty f ON d.department_id = f.department_id
                LEFT JOIN courses c ON d.department_id = c.department_id
                GROUP BY d.department_id, d.department_name, d.hod_name, d.office_location
                ORDER BY d.department_id ASC
            """
            cursor.execute(query)
            dept_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching departments: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return render_template('departments.html', departments=dept_list)

@app.route('/departments/add', methods=['POST'])
@login_required
@role_required(['Admin'])
def add_department():
    name = request.form.get('department_name', '').strip()
    hod = request.form.get('hod_name', '').strip()
    location = request.form.get('office_location', '').strip()

    if not name or not hod or not location:
        flash("All department fields are required.", "danger")
        return redirect(url_for('departments'))

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "INSERT INTO departments (department_name, hod_name, office_location) VALUES (%s, %s, %s)"
            cursor.execute(query, (name, hod, location))
            flash(f"Department '{name}' added successfully!", "success")
        except Error as e:
            flash(f"Database error adding department: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('departments'))

@app.route('/departments/edit/<int:dept_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def edit_department(dept_id):
    name = request.form.get('department_name', '').strip()
    hod = request.form.get('hod_name', '').strip()
    location = request.form.get('office_location', '').strip()

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "UPDATE departments SET department_name = %s, hod_name = %s, office_location = %s WHERE department_id = %s"
            cursor.execute(query, (name, hod, location, dept_id))
            flash("Department updated successfully!", "success")
        except Error as e:
            flash(f"Error updating department: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('departments'))

@app.route('/departments/delete/<int:dept_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_department(dept_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "DELETE FROM departments WHERE department_id = %s"
            cursor.execute(query, (dept_id,))
            flash("Department deleted successfully!", "success")
        except Error as e:
            flash(f"Cannot delete department: {e}. Check if students or courses are linked to this department.", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('departments'))

# -----------------------------------------------------------------------------
# 2. STUDENTS CRUD
# -----------------------------------------------------------------------------
@app.route('/students')
@login_required
def students():
    conn = get_db_connection()
    students_list = []
    departments_list = []
    dept_filter = request.args.get('dept', '')
    search = request.args.get('search', '').strip()

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT department_id, department_name FROM departments ORDER BY department_name")
            departments_list = cursor.fetchall()

            query = """
                SELECT 
                    s.student_id, s.roll_number, s.full_name, s.email, s.phone,
                    s.date_of_birth, s.gender, s.admission_year, s.semester, s.address,
                    d.department_name, d.department_id
                FROM students s
                INNER JOIN departments d ON s.department_id = d.department_id
                WHERE 1=1
            """
            params = []
            if dept_filter:
                query += " AND s.department_id = %s"
                params.append(dept_filter)
            if search:
                query += " AND (s.full_name LIKE %s OR s.roll_number LIKE %s OR s.email LIKE %s)"
                search_param = f"%{search}%"
                params.extend([search_param, search_param, search_param])

            query += " ORDER BY s.student_id DESC"
            cursor.execute(query, tuple(params))
            students_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching students: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('students.html', students=students_list, departments=departments_list, dept_filter=dept_filter, search=search)

@app.route('/students/add', methods=['POST'])
@login_required
@role_required(['Admin', 'Clerk'])
def add_student():
    roll_number = request.form.get('roll_number', '').strip()
    full_name = request.form.get('full_name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    dob = request.form.get('date_of_birth', '').strip()
    gender = request.form.get('gender', 'Male')
    dept_id = request.form.get('department_id')
    admission_year = request.form.get('admission_year')
    semester = request.form.get('semester')
    address = request.form.get('address', '').strip()

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            # Call Stored Procedure AddStudent demonstrating procedure call
            args = (roll_number, full_name, email, phone, dob, gender, int(dept_id), int(admission_year), int(semester), address, 0, '')
            result_args = cursor.callproc('AddStudent', args)
            student_id = result_args[10]
            status_msg = result_args[11]

            if student_id > 0:
                flash(f"{status_msg} (Assigned Student ID: {student_id})", "success")
            else:
                flash(status_msg, "danger")
        except Error as e:
            flash(f"Error adding student: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return redirect(url_for('students'))

@app.route('/students/view/<int:student_id>')
@login_required
def view_student(student_id):
    conn = get_db_connection()
    student = None
    fee_summary = {}
    enrollments = []
    results = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            # 1. Use GetStudentDetails stored procedure
            cursor.callproc('GetStudentDetails', (student_id,))
            for result in cursor.stored_results():
                student = result.fetchone()

            if not student:
                flash("Student record not found.", "warning")
                return redirect(url_for('students'))

            # 2. Use GetStudentFeeSummary stored procedure
            cursor_proc = conn.cursor()
            fee_args = cursor_proc.callproc('GetStudentFeeSummary', (student_id, Decimal(0), Decimal(0), Decimal(0)))
            fee_summary = {
                'total_fees': float(fee_args[1]),
                'paid_fees': float(fee_args[2]),
                'pending_fees': float(fee_args[3])
            }
            cursor_proc.close()

            # 3. Fetch courses enrolled
            cursor.execute("""
                SELECT c.course_code, c.course_name, c.credits, e.academic_year, e.semester,
                       f.full_name AS instructor
                FROM enrollments e
                JOIN courses c ON e.course_id = c.course_id
                LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
                WHERE e.student_id = %s
            """, (student_id,))
            enrollments = cursor.fetchall()

            # 4. Fetch exam results
            cursor.execute("""
                SELECT ex.exam_name, c.course_name, r.marks_obtained, ex.maximum_marks, r.grade
                FROM results r
                JOIN examinations ex ON r.exam_id = ex.exam_id
                JOIN courses c ON ex.course_id = c.course_id
                WHERE r.student_id = %s
            """, (student_id,))
            results = cursor.fetchall()

        except Error as e:
            flash(f"Error loading student profile: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('student_detail.html', student=student, fee_summary=fee_summary, enrollments=enrollments, results=results)

@app.route('/students/edit/<int:student_id>', methods=['POST'])
@login_required
@role_required(['Admin', 'Clerk'])
def edit_student(student_id):
    full_name = request.form.get('full_name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    dept_id = request.form.get('department_id')
    semester = request.form.get('semester')
    address = request.form.get('address', '').strip()

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            # Use UpdateStudent stored procedure
            args = (student_id, full_name, email, phone, int(dept_id), int(semester), address, 0)
            res = cursor.callproc('UpdateStudent', args)
            rows = res[7]
            flash(f"Student details updated successfully! (Affected rows: {rows})", "success")
        except Error as e:
            flash(f"Error updating student: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('students'))

@app.route('/students/delete/<int:student_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_student(student_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM students WHERE student_id = %s", (student_id,))
            flash("Student deleted successfully! Trigger recorded this action to audit log.", "success")
        except Error as e:
            flash(f"Error deleting student: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('students'))

# -----------------------------------------------------------------------------
# 3. FACULTY CRUD
# -----------------------------------------------------------------------------
@app.route('/faculty')
@login_required
def faculty():
    conn = get_db_connection()
    faculty_list = []
    departments_list = []
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT department_id, department_name FROM departments ORDER BY department_name")
            departments_list = cursor.fetchall()

            query = """
                SELECT 
                    f.faculty_id, f.full_name, f.email, f.phone, f.designation, f.salary,
                    d.department_name, d.department_id,
                    COUNT(c.course_id) AS course_count
                FROM faculty f
                INNER JOIN departments d ON f.department_id = d.department_id
                LEFT JOIN courses c ON f.faculty_id = c.faculty_id
                GROUP BY f.faculty_id, f.full_name, f.email, f.phone, f.designation, f.salary, d.department_name, d.department_id
                ORDER BY f.faculty_id ASC
            """
            cursor.execute(query)
            faculty_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching faculty: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return render_template('faculty.html', faculty=faculty_list, departments=departments_list)

@app.route('/faculty/add', methods=['POST'])
@login_required
@role_required(['Admin'])
def add_faculty():
    full_name = request.form.get('full_name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    dept_id = request.form.get('department_id')
    designation = request.form.get('designation', '').strip()
    salary = request.form.get('salary', '0')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO faculty (full_name, email, phone, department_id, designation, salary)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (full_name, email, phone, dept_id, designation, float(salary)))
            flash("Faculty member added successfully!", "success")
        except Error as e:
            flash(f"Error adding faculty member: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('faculty'))

@app.route('/faculty/edit/<int:faculty_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def edit_faculty(faculty_id):
    full_name = request.form.get('full_name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    dept_id = request.form.get('department_id')
    designation = request.form.get('designation', '').strip()
    salary = request.form.get('salary', '0')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                UPDATE faculty 
                SET full_name = %s, email = %s, phone = %s, department_id = %s, designation = %s, salary = %s
                WHERE faculty_id = %s
            """
            cursor.execute(query, (full_name, email, phone, dept_id, designation, float(salary), faculty_id))
            flash("Faculty details updated successfully!", "success")
        except Error as e:
            flash(f"Error updating faculty: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('faculty'))

@app.route('/faculty/delete/<int:faculty_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_faculty(faculty_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM faculty WHERE faculty_id = %s", (faculty_id,))
            flash("Faculty member deleted successfully!", "success")
        except Error as e:
            flash(f"Error deleting faculty member: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('faculty'))

# -----------------------------------------------------------------------------
# 4. COURSES CRUD
# -----------------------------------------------------------------------------
@app.route('/courses')
@login_required
def courses():
    conn = get_db_connection()
    courses_list = []
    departments_list = []
    faculty_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT department_id, department_name FROM departments ORDER BY department_name")
            departments_list = cursor.fetchall()

            cursor.execute("SELECT faculty_id, full_name FROM faculty ORDER BY full_name")
            faculty_list = cursor.fetchall()

            query = """
                SELECT 
                    c.course_id, c.course_name, c.course_code, c.credits,
                    d.department_name, d.department_id,
                    COALESCE(f.full_name, 'Unassigned') AS faculty_name,
                    f.faculty_id,
                    COUNT(DISTINCT e.enrollment_id) AS enrolled_students
                FROM courses c
                INNER JOIN departments d ON c.department_id = d.department_id
                LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
                LEFT JOIN enrollments e ON c.course_id = e.course_id
                GROUP BY c.course_id, c.course_name, c.course_code, c.credits, d.department_name, d.department_id, f.full_name, f.faculty_id
                ORDER BY c.course_id ASC
            """
            cursor.execute(query)
            courses_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching courses: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('courses.html', courses=courses_list, departments=departments_list, faculty=faculty_list)

@app.route('/courses/add', methods=['POST'])
@login_required
@role_required(['Admin'])
def add_course():
    name = request.form.get('course_name', '').strip()
    code = request.form.get('course_code', '').strip().upper()
    credits_val = request.form.get('credits')
    dept_id = request.form.get('department_id')
    faculty_id = request.form.get('faculty_id') or None

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO courses (course_name, course_code, credits, department_id, faculty_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (name, code, int(credits_val), int(dept_id), faculty_id))
            flash(f"Course '{name}' ({code}) created successfully!", "success")
        except Error as e:
            flash(f"Error adding course: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('courses'))

@app.route('/courses/edit/<int:course_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def edit_course(course_id):
    name = request.form.get('course_name', '').strip()
    code = request.form.get('course_code', '').strip().upper()
    credits_val = request.form.get('credits')
    dept_id = request.form.get('department_id')
    faculty_id = request.form.get('faculty_id') or None

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                UPDATE courses
                SET course_name = %s, course_code = %s, credits = %s, department_id = %s, faculty_id = %s
                WHERE course_id = %s
            """
            cursor.execute(query, (name, code, int(credits_val), int(dept_id), faculty_id, course_id))
            flash("Course updated successfully!", "success")
        except Error as e:
            flash(f"Error updating course: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('courses'))

@app.route('/courses/delete/<int:course_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_course(course_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM courses WHERE course_id = %s", (course_id,))
            flash("Course deleted successfully!", "success")
        except Error as e:
            flash(f"Error deleting course: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('courses'))

# -----------------------------------------------------------------------------
# 5. ENROLLMENTS CRUD
# -----------------------------------------------------------------------------
@app.route('/enrollments')
@login_required
def enrollments():
    conn = get_db_connection()
    enrollment_list = []
    students_list = []
    courses_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT student_id, roll_number, full_name FROM students ORDER BY full_name")
            students_list = cursor.fetchall()

            cursor.execute("SELECT course_id, course_code, course_name FROM courses ORDER BY course_code")
            courses_list = cursor.fetchall()

            query = """
                SELECT 
                    e.enrollment_id, e.academic_year, e.semester, e.enrollment_date,
                    s.student_id, s.roll_number, s.full_name AS student_name,
                    c.course_id, c.course_code, c.course_name, c.credits,
                    COALESCE(f.full_name, 'Unassigned') AS instructor_name
                FROM enrollments e
                INNER JOIN students s ON e.student_id = s.student_id
                INNER JOIN courses c ON e.course_id = c.course_id
                LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
                ORDER BY e.enrollment_id DESC
            """
            cursor.execute(query)
            enrollment_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching enrollments: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('enrollments.html', enrollments=enrollment_list, students=students_list, courses=courses_list)

@app.route('/enrollments/add', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty', 'Clerk'])
def add_enrollment():
    student_id = request.form.get('student_id')
    course_id = request.form.get('course_id')
    academic_year = request.form.get('academic_year', '').strip()
    semester = request.form.get('semester')
    enrollment_date = request.form.get('enrollment_date', datetime.today().strftime('%Y-%m-%d'))

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO enrollments (student_id, course_id, academic_year, semester, enrollment_date)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (student_id, course_id, academic_year, semester, enrollment_date))
            flash("Student successfully enrolled in course!", "success")
        except Error as e:
            if 'uq_student_course_term' in str(e):
                flash("Duplicate Enrollment Error: This student is already enrolled in this course for the selected term.", "danger")
            else:
                flash(f"Error creating enrollment: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('enrollments'))

@app.route('/enrollments/delete/<int:enrollment_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_enrollment(enrollment_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM enrollments WHERE enrollment_id = %s", (enrollment_id,))
            flash("Enrollment removed successfully!", "success")
        except Error as e:
            flash(f"Error removing enrollment: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('enrollments'))

# -----------------------------------------------------------------------------
# 6. ATTENDANCE CRUD & STORED PROCEDURE DEMO
# -----------------------------------------------------------------------------
@app.route('/attendance')
@login_required
def attendance():
    conn = get_db_connection()
    attendance_list = []
    students_list = []
    courses_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT student_id, roll_number, full_name FROM students ORDER BY full_name")
            students_list = cursor.fetchall()

            cursor.execute("SELECT course_id, course_code, course_name FROM courses ORDER BY course_code")
            courses_list = cursor.fetchall()

            query = """
                SELECT 
                    a.attendance_id, a.attendance_date, a.status,
                    s.student_id, s.roll_number, s.full_name AS student_name,
                    c.course_id, c.course_code, c.course_name
                FROM attendance a
                INNER JOIN students s ON a.student_id = s.student_id
                INNER JOIN courses c ON a.course_id = c.course_id
                ORDER BY a.attendance_date DESC, a.attendance_id DESC
                LIMIT 100
            """
            cursor.execute(query)
            attendance_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching attendance records: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('attendance.html', attendance=attendance_list, students=students_list, courses=courses_list)

@app.route('/attendance/add', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty'])
def add_attendance():
    student_id = request.form.get('student_id')
    course_id = request.form.get('course_id')
    attendance_date = request.form.get('attendance_date')
    status = request.form.get('status', 'Present')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO attendance (student_id, course_id, attendance_date, status)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(query, (student_id, course_id, attendance_date, status))
            flash("Attendance record saved successfully!", "success")
        except Error as e:
            flash(f"Attendance Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('attendance'))

@app.route('/attendance/delete/<int:attendance_id>', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty'])
def delete_attendance(attendance_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM attendance WHERE attendance_id = %s", (attendance_id,))
            flash("Attendance entry deleted successfully!", "success")
        except Error as e:
            flash(f"Error deleting attendance: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('attendance'))

# -----------------------------------------------------------------------------
# 7. EXAMINATIONS CRUD
# -----------------------------------------------------------------------------
@app.route('/examinations')
@login_required
def examinations():
    conn = get_db_connection()
    exams_list = []
    courses_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT course_id, course_code, course_name FROM courses ORDER BY course_code")
            courses_list = cursor.fetchall()

            query = """
                SELECT 
                    ex.exam_id, ex.exam_name, ex.exam_date, ex.maximum_marks,
                    c.course_id, c.course_code, c.course_name,
                    COUNT(r.result_id) AS evaluated_students
                FROM examinations ex
                INNER JOIN courses c ON ex.course_id = c.course_id
                LEFT JOIN results r ON ex.exam_id = r.exam_id
                GROUP BY ex.exam_id, ex.exam_name, ex.exam_date, ex.maximum_marks, c.course_id, c.course_code, c.course_name
                ORDER BY ex.exam_date DESC
            """
            cursor.execute(query)
            exams_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching examinations: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('examinations.html', examinations=exams_list, courses=courses_list)

@app.route('/examinations/add', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty'])
def add_examination():
    course_id = request.form.get('course_id')
    exam_name = request.form.get('exam_name', '').strip()
    exam_date = request.form.get('exam_date')
    maximum_marks = request.form.get('maximum_marks', '100')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO examinations (course_id, exam_name, exam_date, maximum_marks)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(query, (course_id, exam_name, exam_date, float(maximum_marks)))
            flash(f"Examination '{exam_name}' created successfully!", "success")
        except Error as e:
            flash(f"Error adding examination: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('examinations'))

@app.route('/examinations/delete/<int:exam_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_examination(exam_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM examinations WHERE exam_id = %s", (exam_id,))
            flash("Examination deleted successfully!", "success")
        except Error as e:
            flash(f"Error deleting examination: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('examinations'))

# -----------------------------------------------------------------------------
# 8. RESULTS CRUD & TRIGGER DEMONSTRATION
# -----------------------------------------------------------------------------
@app.route('/results')
@login_required
def results():
    conn = get_db_connection()
    results_list = []
    exams_list = []
    students_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT ex.exam_id, ex.exam_name, ex.maximum_marks, c.course_code, c.course_name
                FROM examinations ex
                JOIN courses c ON ex.course_id = c.course_id
                ORDER BY ex.exam_date DESC
            """)
            exams_list = cursor.fetchall()

            cursor.execute("SELECT student_id, roll_number, full_name FROM students ORDER BY full_name")
            students_list = cursor.fetchall()

            query = """
                SELECT 
                    r.result_id, r.marks_obtained, r.grade,
                    s.student_id, s.roll_number, s.full_name AS student_name,
                    ex.exam_id, ex.exam_name, ex.maximum_marks,
                    c.course_code, c.course_name,
                    ROUND((r.marks_obtained / ex.maximum_marks) * 100.0, 2) AS percentage
                FROM results r
                INNER JOIN students s ON r.student_id = s.student_id
                INNER JOIN examinations ex ON r.exam_id = ex.exam_id
                INNER JOIN courses c ON ex.course_id = c.course_id
                ORDER BY r.result_id DESC
            """
            cursor.execute(query)
            results_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching results: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('results.html', results=results_list, exams=exams_list, students=students_list)

@app.route('/results/add', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty'])
def add_result():
    exam_id = request.form.get('exam_id')
    student_id = request.form.get('student_id')
    marks_obtained = request.form.get('marks_obtained')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            # MySQL trigger will validate marks <= max_marks and auto-assign grade!
            query = """
                INSERT INTO results (exam_id, student_id, marks_obtained)
                VALUES (%s, %s, %s)
            """
            cursor.execute(query, (exam_id, student_id, float(marks_obtained)))
            flash("Result published successfully! Trigger calculated the grade automatically.", "success")
        except Error as e:
            flash(f"Trigger Validation Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('results'))

@app.route('/results/edit/<int:result_id>', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty'])
def edit_result(result_id):
    marks_obtained = request.form.get('marks_obtained')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "UPDATE results SET marks_obtained = %s WHERE result_id = %s"
            cursor.execute(query, (float(marks_obtained), result_id))
            flash("Result updated successfully! Trigger validated marks and recalculated grade.", "success")
        except Error as e:
            flash(f"Trigger Validation Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('results'))

@app.route('/results/delete/<int:result_id>', methods=['POST'])
@login_required
@role_required(['Admin', 'Faculty'])
def delete_result(result_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM results WHERE result_id = %s", (result_id,))
            flash("Result record deleted successfully!", "success")
        except Error as e:
            flash(f"Error deleting result: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('results'))

# -----------------------------------------------------------------------------
# 9. FEES CRUD & TRIGGER DEMONSTRATION
# -----------------------------------------------------------------------------
@app.route('/fees')
@login_required
def fees():
    conn = get_db_connection()
    fees_list = []
    students_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT student_id, roll_number, full_name FROM students ORDER BY full_name")
            students_list = cursor.fetchall()

            query = """
                SELECT 
                    f.fee_id, f.fee_type, f.total_amount, f.paid_amount,
                    (f.total_amount - f.paid_amount) AS pending_amount,
                    f.payment_date, f.payment_status,
                    s.student_id, s.roll_number, s.full_name AS student_name,
                    d.department_name
                FROM fees f
                INNER JOIN students s ON f.student_id = s.student_id
                INNER JOIN departments d ON s.department_id = d.department_id
                ORDER BY f.fee_id DESC
            """
            cursor.execute(query)
            fees_list = cursor.fetchall()
        except Error as e:
            flash(f"Error fetching fee records: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('fees.html', fees=fees_list, students=students_list)

@app.route('/fees/add', methods=['POST'])
@login_required
@role_required(['Admin', 'Clerk'])
def add_fee():
    student_id = request.form.get('student_id')
    fee_type = request.form.get('fee_type', 'Tuition Fee').strip()
    total_amount = request.form.get('total_amount', '0')
    paid_amount = request.form.get('paid_amount', '0')
    payment_date = request.form.get('payment_date') or None

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            # MySQL trigger will validate paid <= total and auto-assign payment_status!
            query = """
                INSERT INTO fees (student_id, fee_type, total_amount, paid_amount, payment_date)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (student_id, fee_type, float(total_amount), float(paid_amount), payment_date))
            flash("Fee record recorded successfully! Trigger verified payment limits and assigned status.", "success")
        except Error as e:
            flash(f"Trigger Validation Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('fees'))

@app.route('/fees/edit/<int:fee_id>', methods=['POST'])
@login_required
@role_required(['Admin', 'Clerk'])
def edit_fee(fee_id):
    paid_amount = request.form.get('paid_amount', '0')
    payment_date = request.form.get('payment_date') or None

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                UPDATE fees 
                SET paid_amount = %s, payment_date = %s
                WHERE fee_id = %s
            """
            cursor.execute(query, (float(paid_amount), payment_date, fee_id))
            flash("Payment updated successfully! Trigger adjusted payment status automatically.", "success")
        except Error as e:
            flash(f"Trigger Validation Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('fees'))

@app.route('/fees/delete/<int:fee_id>', methods=['POST'])
@login_required
@role_required(['Admin'])
def delete_fee(fee_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM fees WHERE fee_id = %s", (fee_id,))
            flash("Fee record deleted successfully!", "success")
        except Error as e:
            flash(f"Error deleting fee record: {e}", "danger")
        finally:
            cursor.close()
            conn.close()
    return redirect(url_for('fees'))

# -----------------------------------------------------------------------------
# 10. SQL JOIN OPERATIONS & REPORTS INTERFACE
# -----------------------------------------------------------------------------
REPORT_QUERIES = {
    '1': {
        'title': '1. Students with Department Names (INNER JOIN)',
        'description': 'Demonstrates standard 2-table INNER JOIN on foreign key relationship.',
        'sql': """SELECT 
    s.student_id, s.roll_number, s.full_name AS student_name, s.email, s.semester,
    d.department_name, d.hod_name, d.office_location
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
ORDER BY d.department_name, s.roll_number;"""
    },
    '2': {
        'title': '2. Students Enrolled in Courses with Faculty Names (Multi-Table JOIN)',
        'description': 'Demonstrates 4-table join connecting students, enrollments, courses, and faculty.',
        'sql': """SELECT 
    s.roll_number, s.full_name AS student_name, c.course_code, c.course_name, c.credits,
    COALESCE(f.full_name, 'To Be Assigned') AS instructor_name, e.academic_year, e.semester
FROM enrollments e
INNER JOIN students s ON e.student_id = s.student_id
INNER JOIN courses c ON e.course_id = c.course_id
LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
ORDER BY s.roll_number, c.course_code;"""
    },
    '3': {
        'title': '3. Students with Attendance Percentages (Aggregate Multi-Table JOIN)',
        'description': 'Demonstrates aggregate calculations using COUNT, CASE WHEN, NULLIF, and GROUP BY.',
        'sql': """SELECT 
    s.roll_number, s.full_name AS student_name, c.course_code, c.course_name,
    COUNT(a.attendance_id) AS total_sessions,
    COUNT(CASE WHEN a.status IN ('Present', 'Late') THEN 1 END) AS attended_sessions,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) AS absent_sessions,
    ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late') THEN 1 END) / NULLIF(COUNT(a.attendance_id), 0)) * 100.0, 2) AS attendance_percentage
FROM attendance a
INNER JOIN students s ON a.student_id = s.student_id
INNER JOIN courses c ON a.course_id = c.course_id
GROUP BY s.student_id, s.roll_number, s.full_name, c.course_id, c.course_code, c.course_name
ORDER BY s.roll_number, c.course_code;"""
    },
    '4': {
        'title': '4. Students with Examination Results and Grades (Multi-Table JOIN)',
        'description': 'Connects results, examinations, courses, and students to evaluate academic performance.',
        'sql': """SELECT 
    s.roll_number, s.full_name AS student_name, c.course_code, c.course_name,
    ex.exam_name, ex.exam_date, r.marks_obtained, ex.maximum_marks,
    ROUND((r.marks_obtained / ex.maximum_marks) * 100.0, 2) AS percentage, r.grade
FROM results r
INNER JOIN students s ON r.student_id = s.student_id
INNER JOIN examinations ex ON r.exam_id = ex.exam_id
INNER JOIN courses c ON ex.course_id = c.course_id
ORDER BY s.roll_number, ex.exam_date;"""
    },
    '5': {
        'title': '5. Student Fee Summary with Paid and Pending Dues (Aggregate JOIN)',
        'description': 'Aggregates student financial obligations, calculating paid balances and overdue sums.',
        'sql': """SELECT 
    s.roll_number, s.full_name AS student_name, d.department_name,
    COALESCE(SUM(f.total_amount), 0.00) AS total_fees,
    COALESCE(SUM(f.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(f.total_amount - f.paid_amount), 0.00) AS pending_dues,
    CASE 
        WHEN SUM(f.total_amount - f.paid_amount) = 0 THEN 'Clear'
        WHEN SUM(f.paid_amount) = 0 THEN 'Fully Overdue'
        ELSE 'Partially Due'
    END AS overall_status
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
LEFT JOIN fees f ON s.student_id = f.student_id
GROUP BY s.student_id, s.roll_number, s.full_name, d.department_name
ORDER BY pending_dues DESC;"""
    },
    '6': {
        'title': '6. Faculty Members with Departments and Courses (LEFT JOIN)',
        'description': 'Demonstrates LEFT JOIN ensuring all faculty appear, even if not yet assigned a teaching course.',
        'sql': """SELECT 
    f.faculty_id, f.full_name AS faculty_name, f.designation, d.department_name,
    COALESCE(c.course_code, 'N/A') AS course_code,
    COALESCE(c.course_name, 'No Course Assigned') AS course_name,
    COALESCE(c.credits, 0) AS credits
FROM faculty f
INNER JOIN departments d ON f.department_id = d.department_id
LEFT JOIN courses c ON f.faculty_id = c.faculty_id
ORDER BY d.department_name, f.full_name;"""
    },
    '7': {
        'title': '7. Departments with Student and Faculty Counts (Multi-Aggregation)',
        'description': 'Demonstrates multi-table COUNT(DISTINCT) aggregation per department entity.',
        'sql': """SELECT 
    d.department_id, d.department_name, d.hod_name,
    COUNT(DISTINCT s.student_id) AS total_students,
    COUNT(DISTINCT f.faculty_id) AS total_faculty,
    COUNT(DISTINCT c.course_id) AS total_courses
FROM departments d
LEFT JOIN students s ON d.department_id = s.department_id
LEFT JOIN faculty f ON d.department_id = f.department_id
LEFT JOIN courses c ON d.department_id = c.department_id
GROUP BY d.department_id, d.department_name, d.hod_name
ORDER BY d.department_name;"""
    },
    '8': {
        'title': '8. Students Who Have Not Enrolled in Any Course (LEFT JOIN with NULL)',
        'description': 'Uses LEFT JOIN and WHERE IS NULL to identify un-enrolled students.',
        'sql': """SELECT 
    s.student_id, s.roll_number, s.full_name AS student_name, s.email, s.phone,
    d.department_name, s.admission_year, s.semester
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
LEFT JOIN enrollments e ON s.student_id = e.student_id
WHERE e.enrollment_id IS NULL
ORDER BY s.roll_number;"""
    },
    '9': {
        'title': '9. Courses with No Enrolled Students (LEFT JOIN with NULL)',
        'description': 'Uses LEFT JOIN to identify scheduled courses with zero active students.',
        'sql': """SELECT 
    c.course_id, c.course_code, c.course_name, c.credits, d.department_name,
    COALESCE(f.full_name, 'Unassigned') AS instructor_name
FROM courses c
INNER JOIN departments d ON c.department_id = d.department_id
LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
LEFT JOIN enrollments e ON c.course_id = e.course_id
WHERE e.enrollment_id IS NULL
ORDER BY c.course_code;"""
    },
    '10': {
        'title': '10. Faculty Teaching Allocations (RIGHT JOIN Demonstration)',
        'description': 'Demonstrates RIGHT JOIN, retrieving all faculty records matched with courses.',
        'sql': """SELECT 
    c.course_code, c.course_name, f.faculty_id, f.full_name AS faculty_name, f.designation, f.email
FROM courses c
RIGHT JOIN faculty f ON c.faculty_id = f.faculty_id
ORDER BY f.full_name;"""
    },
    '11': {
        'title': '11. Department and Academic Year Planning Matrix (CROSS JOIN)',
        'description': 'Demonstrates Cartesian Product (CROSS JOIN) generating prospective cohort matrices.',
        'sql': """SELECT 
    d.department_name, ay.academic_year, sem.semester_number
FROM departments d
CROSS JOIN (
    SELECT '2023-2024' AS academic_year UNION ALL
    SELECT '2024-2025' UNION ALL
    SELECT '2025-2026'
) ay
CROSS JOIN (
    SELECT 1 AS semester_number UNION ALL
    SELECT 2
) sem
ORDER BY d.department_name, ay.academic_year, sem.semester_number;"""
    },
    '12': {
        'title': '12. Faculty Salary Comparison in Same Department (SELF JOIN)',
        'description': 'Demonstrates SELF JOIN on the faculty table comparing salaries of colleagues in the same department.',
        'sql': """SELECT 
    f1.full_name AS faculty_member, f1.designation AS designation_1, f1.salary AS salary_1,
    f2.full_name AS colleague, f2.designation AS designation_2, f2.salary AS colleague_salary,
    (f1.salary - f2.salary) AS salary_difference, d.department_name
FROM faculty f1
INNER JOIN faculty f2 ON f1.department_id = f2.department_id AND f1.faculty_id != f2.faculty_id
INNER JOIN departments d ON f1.department_id = d.department_id
WHERE f1.salary >= f2.salary
ORDER BY d.department_name, salary_difference DESC;"""
    }
}

@app.route('/reports')
@login_required
def reports():
    report_id = request.args.get('report_id', '1')
    report_info = REPORT_QUERIES.get(report_id, REPORT_QUERIES['1'])
    columns = []
    rows = []
    execution_time = 0

    conn = get_db_connection()
    if conn:
        try:
            start = datetime.now()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(report_info['sql'])
            rows = cursor.fetchall()
            execution_time = (datetime.now() - start).total_seconds() * 1000
            if rows:
                columns = list(rows[0].keys())
        except Error as e:
            flash(f"SQL Execution Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template(
        'reports.html',
        report_id=report_id,
        report_info=report_info,
        report_options=REPORT_QUERIES,
        columns=columns,
        rows=rows,
        execution_time=round(execution_time, 2)
    )

# -----------------------------------------------------------------------------
# 11. STORED PROCEDURES DEMONSTRATION INTERFACE
# -----------------------------------------------------------------------------
@app.route('/procedures', methods=['GET', 'POST'])
@login_required
def procedures():
    action = request.form.get('action') if request.method == 'POST' else None
    result_data = None
    proc_name = None

    conn = get_db_connection()
    students_list = []
    departments_list = []
    courses_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT student_id, roll_number, full_name FROM students ORDER BY full_name")
            students_list = cursor.fetchall()

            cursor.execute("SELECT department_id, department_name FROM departments ORDER BY department_name")
            departments_list = cursor.fetchall()

            cursor.execute("SELECT course_id, course_code, course_name FROM courses ORDER BY course_code")
            courses_list = cursor.fetchall()

            if action == 'fee_summary':
                proc_name = 'GetStudentFeeSummary'
                student_id = int(request.form.get('student_id', 1))
                cursor_proc = conn.cursor()
                res = cursor_proc.callproc('GetStudentFeeSummary', (student_id, Decimal(0), Decimal(0), Decimal(0)))
                result_data = {
                    'type': 'fee_summary',
                    'student_id': student_id,
                    'total_fees': float(res[1]),
                    'paid_fees': float(res[2]),
                    'pending_fees': float(res[3])
                }
                cursor_proc.close()
                flash(f"Procedure 'GetStudentFeeSummary' executed successfully!", "success")

            elif action == 'dept_count':
                proc_name = 'GetDepartmentStudentCount'
                dept_id = int(request.form.get('department_id', 1))
                cursor_proc = conn.cursor()
                res = cursor_proc.callproc('GetDepartmentStudentCount', (dept_id, 0))
                result_data = {
                    'type': 'dept_count',
                    'department_id': dept_id,
                    'student_count': res[1]
                }
                cursor_proc.close()
                flash(f"Procedure 'GetDepartmentStudentCount' executed successfully!", "success")

            elif action == 'attendance_pct':
                proc_name = 'CalculateAttendancePercentage'
                student_id = int(request.form.get('student_id', 1))
                course_id = int(request.form.get('course_id', 1))
                cursor_proc = conn.cursor()
                res = cursor_proc.callproc('CalculateAttendancePercentage', (student_id, course_id, Decimal(0.0)))
                result_data = {
                    'type': 'attendance_pct',
                    'student_id': student_id,
                    'course_id': course_id,
                    'attendance_percentage': float(res[2])
                }
                cursor_proc.close()
                flash(f"Procedure 'CalculateAttendancePercentage' executed successfully!", "success")

            elif action == 'student_details':
                proc_name = 'GetStudentDetails'
                student_id = int(request.form.get('student_id', 1))
                cursor.callproc('GetStudentDetails', (student_id,))
                for r in cursor.stored_results():
                    details = r.fetchone()
                result_data = {
                    'type': 'student_details',
                    'details': details
                }
                flash(f"Procedure 'GetStudentDetails' executed successfully!", "success")

        except Error as e:
            flash(f"Procedure Execution Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template(
        'procedures.html',
        students=students_list,
        departments=departments_list,
        courses=courses_list,
        result_data=result_data,
        proc_name=proc_name
    )

# -----------------------------------------------------------------------------
# 12. TRIGGERS & AUDIT LOG DEMONSTRATION INTERFACE
# -----------------------------------------------------------------------------
@app.route('/triggers', methods=['GET', 'POST'])
@login_required
def triggers():
    test_result = None
    conn = get_db_connection()
    audit_logs = []
    exams_list = []
    students_list = []

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT log_id, student_id, action_type, performed_by, details, action_timestamp FROM student_audit_log ORDER BY log_id DESC LIMIT 50")
            audit_logs = cursor.fetchall()

            cursor.execute("SELECT ex.exam_id, ex.exam_name, ex.maximum_marks, c.course_code FROM examinations ex JOIN courses c ON ex.course_id = c.course_id LIMIT 10")
            exams_list = cursor.fetchall()

            cursor.execute("SELECT student_id, roll_number, full_name FROM students LIMIT 10")
            students_list = cursor.fetchall()

            if request.method == 'POST':
                action = request.form.get('action')
                if action == 'test_marks_trigger':
                    exam_id = request.form.get('exam_id')
                    student_id = request.form.get('student_id')
                    marks = float(request.form.get('marks_obtained', 0))
                    try:
                        cursor_test = conn.cursor()
                        cursor_test.execute("INSERT INTO results (exam_id, student_id, marks_obtained) VALUES (%s, %s, %s)", (exam_id, student_id, marks))
                        test_result = {'status': 'success', 'message': f'Success: Inserted marks {marks}. Trigger assigned grade automatically!'}
                    except Error as err:
                        test_result = {'status': 'error', 'message': f'MySQL Trigger Intercepted: {err}'}

                elif action == 'test_fee_trigger':
                    student_id = request.form.get('student_id')
                    total = float(request.form.get('total_amount', 0))
                    paid = float(request.form.get('paid_amount', 0))
                    try:
                        cursor_test = conn.cursor()
                        cursor_test.execute("INSERT INTO fees (student_id, fee_type, total_amount, paid_amount) VALUES (%s, 'Trigger Demo Fee', %s, %s)", (student_id, total, paid))
                        test_result = {'status': 'success', 'message': f'Success: Total {total}, Paid {paid}. Trigger validated and updated status!'}
                    except Error as err:
                        test_result = {'status': 'error', 'message': f'MySQL Trigger Intercepted: {err}'}

        except Error as e:
            flash(f"Error loading trigger audit view: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('triggers.html', audit_logs=audit_logs, exams=exams_list, students=students_list, test_result=test_result)

# -----------------------------------------------------------------------------
# 13. CURSOR STORED PROCEDURE INTERFACE
# -----------------------------------------------------------------------------
@app.route('/cursor', methods=['GET', 'POST'])
@login_required
def cursor_demo():
    cursor_output = []
    executed = False
    message = None

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            if request.method == 'POST':
                # Call GenerateDepartmentReport which uses DECLARE CURSOR, OPEN, FETCH, CLOSE
                cursor.callproc('GenerateDepartmentReport')
                for r in cursor.stored_results():
                    cursor_output = r.fetchall()
                executed = True
                message = "Procedure 'GenerateDepartmentReport' successfully iterated all department rows via MySQL Cursor and generated the analytics summary table."
                flash(message, "success")
            else:
                cursor.execute("SELECT * FROM department_summary ORDER BY department_id ASC")
                cursor_output = cursor.fetchall()
        except Error as e:
            flash(f"Cursor Execution Error: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('cursor.html', cursor_output=cursor_output, executed=executed, message=message)

# -----------------------------------------------------------------------------
# 14. PRIVILEGES & DATABASE ADMINISTRATION
# -----------------------------------------------------------------------------
@app.route('/privileges')
@login_required
def privileges_demo():
    conn = get_db_connection()
    current_user_grants = []
    db_users = [
        {'role': 'Administrator', 'user': 'college_admin@localhost', 'permissions': 'ALL PRIVILEGES with GRANT OPTION', 'badge': 'bg-danger'},
        {'role': 'Web Application User', 'user': 'college_app_user@localhost', 'permissions': 'SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW', 'badge': 'bg-primary'},
        {'role': 'Faculty Role', 'user': 'college_faculty@localhost', 'permissions': 'SELECT on all, INSERT & UPDATE on attendance, examinations, results', 'badge': 'bg-success'},
        {'role': 'Clerk Role', 'user': 'college_clerk@localhost', 'permissions': 'SELECT, INSERT, UPDATE on students, fees (REVOKED DELETE)', 'badge': 'bg-warning text-dark'},
        {'role': 'Read-Only Auditor', 'user': 'college_reader@localhost', 'permissions': 'SELECT, SHOW VIEW on college_management.*', 'badge': 'bg-secondary'}
    ]

    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SHOW GRANTS FOR CURRENT_USER()")
            current_user_grants = [row[0] for row in cursor.fetchall()]
        except Error as e:
            flash(f"Error fetching privileges: {e}", "danger")
        finally:
            cursor.close()
            conn.close()

    return render_template('privileges.html', db_users=db_users, current_user_grants=current_user_grants)

# -----------------------------------------------------------------------------
# ERROR HANDLERS
# -----------------------------------------------------------------------------
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Run Flask development server on Windows 11
    app.run(host='127.0.0.1', port=5000, debug=True)
