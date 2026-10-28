from flask import Flask, Response, jsonify, render_template, request, session, redirect, url_for, flash
from functools import wraps
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv
import mysql.connector
from decimal import Decimal
import csv
import datetime
import io
import os

# Load database settings from .env
load_dotenv()

class TrackMateJSONProvider(DefaultJSONProvider):
    """Serialize MySQL DECIMAL results (e.g. SUM()) as numbers instead of strings."""

    @staticmethod
    def default(o):
        if isinstance(o, Decimal):
            return int(o) if o == o.to_integral_value() else float(o)
        return DefaultJSONProvider.default(o)


# Create Flask application
base_dir = os.path.abspath(os.path.dirname(__file__))
trackmate_dir = os.path.join(base_dir, "TrackMate")
template_folder = os.path.join(trackmate_dir, "templates") if os.path.isdir(os.path.join(trackmate_dir, "templates")) else os.path.join(base_dir, "templates")
static_folder = os.path.join(trackmate_dir, "static") if os.path.isdir(os.path.join(trackmate_dir, "static")) else os.path.join(base_dir, "static")

app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
app.json = TrackMateJSONProvider(app)

# Session Security Configuration
app.secret_key = os.getenv("SECRET_KEY", "trackmate-college-dbms-session-secret-984321")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Secure Password Hashing Utilities (Werkzeug with PBKDF2/SHA256 fallback)
try:
    from werkzeug.security import generate_password_hash, check_password_hash
except ImportError:
    import hashlib
    import secrets
    import hmac

    def generate_password_hash(password: str, method: str = "pbkdf2:sha256", salt_length: int = 16) -> str:
        salt = secrets.token_hex(salt_length // 2)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 260000)
        return f"pbkdf2:sha256:260000${salt}${dk.hex()}"

    def check_password_hash(pwhash: str, password: str) -> bool:
        try:
            parts = pwhash.split("$")
            if len(parts) == 3 and parts[0].startswith("pbkdf2:sha256:"):
                iterations = int(parts[0].split(":")[2])
                salt = parts[1]
                expected_hash = parts[2]
                dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
                return hmac.compare_digest(dk.hex(), expected_hash)
            elif len(parts) == 3 and parts[0] == "scrypt":
                salt = parts[1]
                expected_hash = parts[2]
                dk = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1)
                return hmac.compare_digest(dk.hex(), expected_hash)
        except Exception:
            return False
        return False


def login_required(f):
    """Protect private routes and API endpoints against unauthenticated access."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Authentication required. Please log in."
                }), 401
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function


# Connect Python to MySQL
def get_db_connection():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "trackmate_db"),
        port=int(os.getenv("DB_PORT", "3306"))
    )
    return connection


def init_db():
    """Create TrackMate's supporting tables (users, profile, planner, exams) if missing and ensure user_id columns exist."""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        # 1. Create users table for multi-user authentication
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                email VARCHAR(191) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        """)
        # 2. Seed default demo user account if not exists
        cursor.execute("""
            INSERT IGNORE INTO users (user_id, name, email, password_hash)
            VALUES (1, 'Alex Morgan', 'demo@trackmate.edu', 'pbkdf2:sha256:260000$c723476143eacfca$af28dbe04f972197212b4eca1da615115635bd86141961b6fa2680bf66e8ee30')
        """)
        # 3. Safely ensure user_id column exists on all personal tables
        tables_to_scope = ['Subjects', 'Study_Sessions', 'Habits', 'Habit_Logs', 'Study_Tasks', 'Exams', 'Notes', 'Flashcards', 'user_profile']
        for tbl in tables_to_scope:
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{tbl}' AND COLUMN_NAME = 'user_id'
                """)
                if cursor.fetchone()[0] == 0:
                    cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN user_id INT NULL")
                cursor.execute(f"UPDATE {tbl} SET user_id = 1 WHERE user_id IS NULL")
            except Exception as e_col:
                print(f"Notice on table {tbl} user_id check: {e_col}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
                id INT PRIMARY KEY DEFAULT 1,
                full_name VARCHAR(100) DEFAULT 'Alex Morgan',
                email VARCHAR(120) DEFAULT 'alex.morgan@university.edu',
                college VARCHAR(150) DEFAULT 'Faculty of Engineering & Technology',
                major VARCHAR(100) DEFAULT 'Computer Science',
                semester VARCHAR(50) DEFAULT 'Semester 5',
                daily_goal_hours DECIMAL(4,1) DEFAULT 4.0,
                weekly_goal_hours DECIMAL(4,1) DEFAULT 25.0,
                theme VARCHAR(20) DEFAULT 'dark',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            INSERT IGNORE INTO user_profile 
            (id, full_name, email, college, major, semester, daily_goal_hours, weekly_goal_hours, theme) 
            VALUES (1, 'Alex Morgan', 'alex.morgan@university.edu', 'Faculty of Engineering & Technology', 'Computer Science', 'Semester 5', 4.0, 25.0, 'dark')
        """)
        cursor.execute("""
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profile'
        """)
        profile_columns = {row[0] for row in cursor.fetchall()}
        for column, definition in (
            ("semester_goal_hours", "DECIMAL(6,1) DEFAULT 300.0"),
            ("semester_start", "DATE NULL"),
            ("semester_end", "DATE NULL"),
        ):
            if column not in profile_columns:
                cursor.execute(f"ALTER TABLE user_profile ADD COLUMN {column} {definition}")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Study_Tasks (
                task_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                subject_id INT NULL,
                due_date DATE NULL,
                priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
                status ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
                completed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE SET NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Exams (
                exam_id INT AUTO_INCREMENT PRIMARY KEY,
                exam_name VARCHAR(150) NOT NULL,
                subject_id INT NULL,
                exam_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE SET NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Notes (
                note_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content MEDIUMTEXT NOT NULL,
                subject_id INT NULL,
                tags VARCHAR(255) DEFAULT '',
                is_pinned TINYINT(1) DEFAULT 0,
                color VARCHAR(30) DEFAULT 'purple',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE SET NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Flashcards (
                flashcard_id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NULL,
                note_id INT NULL,
                deck_name VARCHAR(100) NOT NULL DEFAULT 'General',
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                hint VARCHAR(255) DEFAULT '',
                mastery_level ENUM('New', 'Learning', 'Review', 'Mastered') DEFAULT 'New',
                times_reviewed INT DEFAULT 0,
                last_reviewed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE SET NULL,
                FOREIGN KEY (note_id) REFERENCES Notes(note_id) ON DELETE SET NULL
            )
        """)
        connection.commit()
    except Exception as e:
        print(f"Database initialization notice: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if 'connection' in locals() and connection:
            try:
                connection.close()
            except Exception:
                pass


# Initialize DB support on startup
init_db()


# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Verify application status and database connectivity."""
    db_status = "disconnected"
    db_error = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_error = str(e)

    return jsonify({
        "status": "healthy" if db_status == "connected" else "degraded",
        "app": "TrackMate",
        "database": db_status,
        "database_name": os.getenv("DB_NAME", "trackmate_db"),
        "error": db_error
    }), 200 if db_status == "connected" else 503


# ==========================================
# AUTHENTICATION & MULTI-USER ROUTES
# ==========================================

@app.route("/login", methods=["GET", "POST"])
def login():
    """Handle student login with anti-enumeration security and password hashing verification."""
    if request.method == "GET":
        if "user_id" in session:
            return redirect(url_for("home"))
        return render_template("login.html")

    data = request.get_json(silent=True) if request.is_json else request.form
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not email or not password:
        err_msg = "Please enter both email and password."
        if request.is_json:
            return jsonify({"error": err_msg}), 400
        flash(err_msg, "error")
        return render_template("login.html"), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT user_id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
        user = cur.fetchone()

        # Generic anti-enumeration validation: check user existence and password hash
        if not user or not check_password_hash(user["password_hash"], password):
            generic_err = "Invalid email or password."
            if request.is_json:
                return jsonify({"error": generic_err}), 401
            flash(generic_err, "error")
            return render_template("login.html"), 401

        # Successful authentication: regenerate/clear session to prevent fixation
        session.clear()
        session["user_id"] = user["user_id"]
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]

        if request.is_json:
            return jsonify({
                "message": "Login successful",
                "user": {
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "email": user["email"]
                }
            }), 200

        flash(f"Welcome back, {user['name']}!", "success")
        return redirect(url_for("home"))

    except Exception as e:
        if request.is_json:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        flash(f"An unexpected error occurred: {str(e)}", "error")
        return render_template("login.html"), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route("/register", methods=["GET", "POST"])
def register():
    """Handle new student registration with validation and password confirmation."""
    if request.method == "GET":
        if "user_id" in session:
            return redirect(url_for("home"))
        return render_template("register.html")

    data = request.get_json(silent=True) if request.is_json else request.form
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    confirm_password = (data.get("confirm_password") or "").strip()

    if not name or not email or not password or not confirm_password:
        err_msg = "All fields (name, email, password, confirm password) are required."
        if request.is_json:
            return jsonify({"error": err_msg}), 400
        flash(err_msg, "error")
        return render_template("register.html"), 400

    if "@" not in email or "." not in email.split("@")[-1]:
        err_msg = "Please provide a valid email address."
        if request.is_json:
            return jsonify({"error": err_msg}), 400
        flash(err_msg, "error")
        return render_template("register.html"), 400

    if len(password) < 8:
        err_msg = "Password must be at least 8 characters long."
        if request.is_json:
            return jsonify({"error": err_msg}), 400
        flash(err_msg, "error")
        return render_template("register.html"), 400

    if password != confirm_password:
        err_msg = "Passwords do not match. Please verify your password confirmation."
        if request.is_json:
            return jsonify({"error": err_msg}), 400
        flash(err_msg, "error")
        return render_template("register.html"), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        # Duplicate email check
        cur.execute("SELECT user_id FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
        if cur.fetchone():
            dup_msg = "An account with this email address already exists. Please sign in."
            if request.is_json:
                return jsonify({"error": dup_msg}), 409
            flash(dup_msg, "error")
            return render_template("register.html"), 409

        # Salt and hash password securely
        pwhash = generate_password_hash(password)
        cur.execute("INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)", (name, email, pwhash))
        new_user_id = cur.lastrowid

        # Create personal user_profile for the new student
        cur.execute("""
            INSERT INTO user_profile (user_id, full_name, email, college, major, semester, daily_goal_hours, weekly_goal_hours, semester_goal_hours, theme)
            VALUES (%s, %s, %s, 'Faculty of Engineering & Technology', 'Computer Science', 'Semester 1', 4.0, 25.0, 300.0, 'dark')
        """, (new_user_id, name, email))

        # Seed starter habits for the new student
        starter_habits = [
            ("Solve 1 LeetCode Problem", "Practice algorithmic problem solving daily on LeetCode / HackerRank", "Daily"),
            ("Read Technical Documentation (20m)", "Read official documentation, RFCs, or engineering blog posts", "Daily"),
            ("Review Lecture Notes", "Active recall summary of topics taught in today lectures", "Daily"),
            ("Daily Pomodoro Deep Work Block", "Complete at least 2 uninterrupted 25-minute Pomodoro focus sprints", "Daily"),
            ("Hydration & Posture Reset", "Drink 2L water and complete 5-minute stretch routine", "Daily")
        ]
        for h_name, h_desc, h_freq in starter_habits:
            cur.execute(
                "INSERT INTO Habits (user_id, habit_name, description, frequency, is_active) VALUES (%s, %s, %s, %s, 1)",
                (new_user_id, h_name, h_desc, h_freq)
            )

        conn.commit()

        # Log new student in
        session.clear()
        session["user_id"] = new_user_id
        session["user_name"] = name
        session["user_email"] = email

        if request.is_json:
            return jsonify({
                "message": "User registered successfully",
                "user": {
                    "user_id": new_user_id,
                    "name": name,
                    "email": email
                }
            }), 201

        flash("Account created successfully! Welcome to TrackMate.", "success")
        return redirect(url_for("home"))

    except Exception as e:
        if conn: conn.rollback()
        if request.is_json:
            return jsonify({"error": f"Registration failed: {str(e)}"}), 500
        flash(f"Registration failed: {str(e)}", "error")
        return render_template("register.html"), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route("/logout", methods=["GET", "POST"])
def logout():
    """Clear student session on logout."""
    session.clear()
    if request.path.startswith("/api/") or (request.is_json and request.method == "POST"):
        return jsonify({"message": "Logged out successfully"}), 200
    flash("You have been signed out.", "success")
    return redirect(url_for("login"))


@app.route("/api/auth/me", methods=["GET"])
@login_required
def auth_me():
    """Return currently authenticated student details (never password hash)."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized", "message": "Not authenticated"}), 401

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT user_id, name, email, created_at FROM users WHERE user_id = %s", (user_id,))
        user = cur.fetchone()
        if not user:
            session.clear()
            return jsonify({"error": "Unauthorized", "message": "User account no longer exists"}), 401

        if user.get("created_at") and isinstance(user["created_at"], (datetime.date, datetime.datetime)):
            user["created_at"] = user["created_at"].isoformat()

        return jsonify({
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user.get("created_at")
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


# Home page (Protected)
@app.route('/')
@login_required
def home():
    user_name = session.get("user_name", "Student")
    user_email = session.get("user_email", "")
    return render_template('index.html', user_name=user_name, user_email=user_email)


# ==========================================
# SUBJECTS API
# ==========================================


# Get subjects belonging to the logged-in user
@app.route("/api/subjects", methods=["GET"])
@login_required
def get_subjects():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        user_id = session["user_id"]

        cursor.execute(
            """
            SELECT
                s.subject_id,
                s.subject_name,
                s.created_at,
                COUNT(ss.session_id) AS session_count,
                COALESCE(SUM(ss.duration_minutes), 0) AS total_minutes,
                ROUND(
                    COALESCE(SUM(ss.duration_minutes), 0) / 60,
                    2
                ) AS total_hours
            FROM Subjects s
            LEFT JOIN Study_Sessions ss
                ON s.subject_id = ss.subject_id
                AND ss.user_id = %s
            WHERE s.user_id = %s
            GROUP BY
                s.subject_id,
                s.subject_name,
                s.created_at
            ORDER BY s.subject_id
            """,
            (user_id, user_id)
        )

        subjects = cursor.fetchall()

        for sub in subjects:
            if sub.get("created_at") and isinstance(
                sub["created_at"],
                (datetime.date, datetime.datetime)
            ):
                sub["created_at"] = sub["created_at"].isoformat()

            if isinstance(sub.get("total_hours"), Decimal):
                sub["total_hours"] = float(sub["total_hours"])

        return jsonify(subjects)

    finally:
        cursor.close()
        connection.close()

# Add a new subject for the logged-in user
@app.route("/api/subjects", methods=["POST"])
@login_required
def add_subject():
    data = request.get_json(silent=True)

    if not data or not isinstance(data.get("subject_name"), str) or not data["subject_name"].strip():
        return jsonify({"error": "Subject name is required."}), 400

    subject_name = data["subject_name"].strip()
    user_id = session["user_id"]

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO Subjects (subject_name, user_id)
            VALUES (%s, %s)
            """,
            (subject_name, user_id)
        )

        connection.commit()

        return jsonify({
            "message": "Subject created successfully!",
            "subject_id": cursor.lastrowid,
            "subject_name": subject_name
        }), 201

    except mysql.connector.Error as err:
        connection.rollback()

        if err.errno == 1062:
            return jsonify({
                "error": "A subject with this name already exists."
            }), 409

        return jsonify({
            "error": f"Could not create subject: {str(err)}"
        }), 400

    finally:
        cursor.close()
        connection.close()


# Update a subject
@app.route("/api/subjects/<int:subject_id>", methods=["PUT"])
@login_required
def update_subject(subject_id):
    data = request.get_json(silent=True)
    if not data or not data.get("subject_name", "").strip():
        return jsonify({"error": "Subject name cannot be empty."}), 400

    subject_name = data["subject_name"].strip()
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            "UPDATE Subjects SET subject_name = %s WHERE subject_id = %s",
            (subject_name, subject_id)
        )
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Subject not found."}), 404
        return jsonify({
            "message": "Subject updated successfully!",
            "subject_id": subject_id,
            "subject_name": subject_name
        }), 200

    except mysql.connector.Error as err:
        connection.rollback()
        if err.errno == 1062:
            return jsonify({"error": "A subject with this name already exists."}), 409
        return jsonify({"error": f"Could not update subject: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Delete a subject
@app.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
@login_required
def delete_subject(subject_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT COUNT(*) AS count FROM Study_Sessions WHERE subject_id = %s", (subject_id,))
        count_res = cursor.fetchone()
        if count_res and count_res["count"] > 0:
            return jsonify({
                "error": f"Cannot delete subject: {count_res['count']} study session(s) are linked to it."
            }), 400

        cursor.execute("DELETE FROM Subjects WHERE subject_id = %s", (subject_id,))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Subject not found."}), 404
        return jsonify({"message": "Subject deleted successfully!"}), 200

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not delete subject: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# ==========================================
# HABITS API
# ==========================================

# Get all habits from MySQL
@app.route("/api/habits", methods=["GET"])
@login_required
def get_habits():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT habit_id, habit_name, description, frequency, is_active, created_at
            FROM Habits
            WHERE user_id = %s
            ORDER BY habit_id
            """,
            (session.get("user_id"),)
        )
        habits = cursor.fetchall()
        for h in habits:
            if h.get("created_at") and isinstance(h["created_at"], (datetime.date, datetime.datetime)):
                h["created_at"] = h["created_at"].isoformat()
        return jsonify(habits)

    finally:
        cursor.close()
        connection.close()


# Add a new habit
@app.route("/api/habits", methods=["POST"])
@login_required
def add_habit():
    data = request.get_json(silent=True)
    if not data or not data.get("habit_name", "").strip():
        return jsonify({"error": "Habit name is required."}), 400

    habit_name = data["habit_name"].strip()
    description = data.get("description", "").strip()
    frequency = data.get("frequency", "Daily")
    if frequency not in ["Daily", "Weekly"]:
        frequency = "Daily"
    is_active = 1 if data.get("is_active", True) in [True, 1, "1", "true"] else 0

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO Habits (user_id, habit_name, description, frequency, is_active)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (session.get("user_id"), habit_name, description, frequency, is_active)
        )
        connection.commit()
        return jsonify({
            "message": "Habit created successfully!",
            "habit_id": cursor.lastrowid
        }), 201

    except mysql.connector.Error as err:
        connection.rollback()
        if err.errno == 1062:
            return jsonify({"error": "A habit with this name already exists."}), 409
        return jsonify({"error": f"Could not create habit: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Update an existing habit
@app.route("/api/habits/<int:habit_id>", methods=["PUT"])
@login_required
def update_habit(habit_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please provide valid JSON data."}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Habits WHERE habit_id = %s AND user_id = %s", (habit_id, session.get("user_id")))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"error": "Habit not found."}), 404

        habit_name = data.get("habit_name", existing["habit_name"]).strip()
        if not habit_name:
            return jsonify({"error": "Habit name cannot be empty."}), 400

        description = data.get("description", existing["description"])
        frequency = data.get("frequency", existing["frequency"])
        if frequency not in ["Daily", "Weekly"]:
            frequency = "Daily"

        is_active = existing["is_active"]
        if "is_active" in data:
            is_active = 1 if data["is_active"] in [True, 1, "1", "true"] else 0

        cursor.execute(
            """
            UPDATE Habits
            SET habit_name = %s, description = %s, frequency = %s, is_active = %s
            WHERE habit_id = %s AND user_id = %s
            """,
            (habit_name, description, frequency, is_active, habit_id, session.get("user_id"))
        )
        connection.commit()
        return jsonify({
            "message": "Habit updated successfully!",
            "habit_id": habit_id
        }), 200

    except mysql.connector.Error as err:
        connection.rollback()
        if err.errno == 1062:
            return jsonify({"error": "A habit with this name already exists."}), 409
        return jsonify({"error": f"Could not update habit: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Delete a habit
@app.route("/api/habits/<int:habit_id>", methods=["DELETE"])
@login_required
def delete_habit(habit_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        # Delete habit logs first
        cursor.execute("DELETE FROM Habit_Logs WHERE habit_id = %s AND user_id = %s", (habit_id, session.get("user_id")))
        cursor.execute("DELETE FROM Habits WHERE habit_id = %s AND user_id = %s", (habit_id, session.get("user_id")))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Habit not found."}), 404

        return jsonify({"message": "Habit and its history deleted successfully!"}), 200

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# ==========================================
# STUDY SESSIONS API
# ==========================================

def parse_date(value):
    """Return a datetime.date for a 'YYYY-MM-DD' string, or None if invalid."""
    try:
        return datetime.datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def parse_time(value):
    """Return a datetime.time for 'HH:MM' or 'HH:MM:SS', or None if invalid."""
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.datetime.strptime(str(value).strip(), fmt).time()
        except (ValueError, TypeError):
            continue
    return None


def parse_positive_int(value):
    """Return a positive int, or None. Rejects booleans and fractional numbers."""
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    if not number.is_integer() or number <= 0:
        return None
    return int(number)


def clean_notes(value):
    if value is None:
        return None
    return str(value).strip() or None


def format_time_value(value):
    """MySQL TIME columns come back as timedelta; format them as zero-padded HH:MM:SS."""
    if isinstance(value, datetime.timedelta):
        total_seconds = int(value.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    if isinstance(value, datetime.time):
        return value.strftime("%H:%M:%S")
    return str(value) if value is not None else None


def serialize_study_session(session):
    if isinstance(session.get("study_date"), datetime.date):
        session["study_date"] = session["study_date"].isoformat()
    session["start_time"] = format_time_value(session.get("start_time"))
    if isinstance(session.get("created_at"), (datetime.date, datetime.datetime)):
        session["created_at"] = session["created_at"].isoformat()
    if isinstance(session.get("duration_hours"), Decimal):
        session["duration_hours"] = float(session["duration_hours"])
    return session


def validate_study_session_payload(data):
    """Validate a study session body. Returns (values_dict, None) or (None, error_message)."""
    if not data:
        return None, "Please send valid JSON data."

    required_fields = ["subject_id", "topic", "study_date", "duration_minutes"]
    if not all(field in data for field in required_fields):
        return None, "Please provide subject_id, topic, study_date, and duration_minutes."

    subject_id = parse_positive_int(data["subject_id"])
    if subject_id is None:
        return None, "Subject ID must be a positive whole number."

    duration = parse_positive_int(data["duration_minutes"])
    if duration is None:
        return None, "Duration must be a positive whole number of minutes."

    topic = data["topic"].strip() if isinstance(data["topic"], str) else ""
    if not topic:
        return None, "Topic cannot be empty."
    if len(topic) > 255:
        return None, "Topic must be 255 characters or fewer."

    study_date = parse_date(data["study_date"])
    if study_date is None:
        return None, "Study date must be in YYYY-MM-DD format."

    start_time = None
    if data.get("start_time"):
        start_time = parse_time(data["start_time"])
        if start_time is None:
            return None, "Start time must be in HH:MM or HH:MM:SS format."

    return {
        "subject_id": subject_id,
        "topic": topic,
        "study_date": study_date,
        "start_time": start_time,
        "duration_minutes": duration,
        "notes": clean_notes(data.get("notes")),
    }, None


STUDY_SESSION_SELECT = """
    SELECT
        ss.session_id,
        ss.subject_id,
        s.subject_name,
        ss.topic,
        ss.study_date,
        ss.start_time,
        ss.duration_minutes,
        ROUND(ss.duration_minutes / 60, 2) AS duration_hours,
        ss.notes,
        ss.created_at
    FROM Study_Sessions AS ss
    LEFT JOIN Subjects AS s
        ON ss.subject_id = s.subject_id
"""


def fetch_study_session(cursor, session_id):
    cursor.execute(STUDY_SESSION_SELECT + " WHERE ss.session_id = %s", (session_id,))
    session = cursor.fetchone()
    return serialize_study_session(session) if session else None


def subject_exists(cursor, subject_id, user_id):
    cursor.execute(
        """
        SELECT 1
        FROM Subjects
        WHERE subject_id = %s AND user_id = %s
        """,
        (subject_id, user_id)
    )
    return cursor.fetchone() is not None



# Add a new study session
@app.route("/api/study-sessions", methods=["POST"])
@login_required
def add_study_session():
    values, error = validate_study_session_payload(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        user_id = session["user_id"]
        if not subject_exists(cursor, values["subject_id"], user_id):
            return jsonify({"error": "Subject not found."}), 404


        cursor.execute(
            """
            INSERT INTO Study_Sessions
                (user_id, subject_id, topic, study_date, start_time, duration_minutes, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                values["subject_id"],
                values["topic"],
                values["study_date"],
                values["start_time"],
                values["duration_minutes"],
                values["notes"],
            )
        )
        connection.commit()
        session_id = cursor.lastrowid

        return jsonify({
            "message": "Study session saved successfully!",
            "session_id": session_id,
            "session": fetch_study_session(cursor, session_id)
        }), 201

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not save the study session: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Get all study sessions (optional filters: subject_id, start_date, end_date)
@app.route("/api/study-sessions", methods=["GET"])
@login_required
def get_study_sessions():
    user_id = session.get("user_id")
    conditions = ["ss.user_id = %s"]
    params = [user_id]

    if request.args.get("subject_id"):
        subject_id = parse_positive_int(request.args["subject_id"])
        if subject_id is None:
            return jsonify({"error": "subject_id must be a positive whole number."}), 400
        conditions.append("ss.subject_id = %s")
        params.append(subject_id)

    for arg, operator in (("start_date", ">="), ("end_date", "<=")):
        if request.args.get(arg):
            parsed = parse_date(request.args[arg])
            if parsed is None:
                return jsonify({"error": f"{arg} must be in YYYY-MM-DD format."}), 400
            conditions.append(f"ss.study_date {operator} %s")
            params.append(parsed)

    query = STUDY_SESSION_SELECT
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY ss.study_date DESC, ss.session_id DESC"

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(query, tuple(params))
        sessions = [serialize_study_session(s) for s in cursor.fetchall()]
        return jsonify(sessions)

    finally:
        cursor.close()
        connection.close()


# Get a single study session
@app.route("/api/study-sessions/<int:session_id>", methods=["GET"])
@login_required
def get_study_session(session_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        session = fetch_study_session(cursor, session_id)
        if not session:
            return jsonify({"error": "Study session not found."}), 404
        return jsonify(session)

    finally:
        cursor.close()
        connection.close()


# Update an existing study session
@app.route("/api/study-sessions/<int:session_id>", methods=["PUT"])
@login_required
def update_study_session(session_id):
    values, error = validate_study_session_payload(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT session_id FROM Study_Sessions WHERE session_id = %s AND user_id = %s",
            (session_id, session.get("user_id"))
        )
        if not cursor.fetchone():
            return jsonify({"error": "Study session not found."}), 404

        if not subject_exists(cursor, values["subject_id"]):
            return jsonify({"error": "Subject not found."}), 404

        cursor.execute(
            """
            UPDATE Study_Sessions
            SET
                subject_id = %s,
                topic = %s,
                study_date = %s,
                start_time = %s,
                duration_minutes = %s,
                notes = %s
            WHERE session_id = %s AND user_id = %s
            """,
            (
                values["subject_id"],
                values["topic"],
                values["study_date"],
                values["start_time"],
                values["duration_minutes"],
                values["notes"],
                session_id,
                session.get("user_id"),
            )
        )
        connection.commit()

        return jsonify({
            "message": "Study session updated successfully!",
            "session_id": session_id,
            "session": fetch_study_session(cursor, session_id)
        }), 200

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not update the study session: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Delete a study session
@app.route("/api/study-sessions/<int:session_id>", methods=["DELETE"])
@login_required
def delete_study_session(session_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("DELETE FROM Study_Sessions WHERE session_id = %s AND user_id = %s", (session_id, session.get("user_id")))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Study session not found."}), 404

        return jsonify({"message": "Study session deleted successfully!"}), 200

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# ==========================================
# HABIT LOGS API
# ==========================================

def parse_completed(value):
    """Accept true/false, 1/0 or 'true'/'false'/'1'/'0'. Returns 1, 0 or None if invalid."""
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int) and value in (0, 1):
        return value
    if isinstance(value, str) and value.strip().lower() in ("true", "1", "false", "0"):
        return 1 if value.strip().lower() in ("true", "1") else 0
    return None


def serialize_habit_log(log):
    if isinstance(log.get("log_date"), datetime.date):
        log["log_date"] = log["log_date"].isoformat()
    if log.get("completed") is not None:
        log["completed"] = int(log["completed"])
    return log


HABIT_LOG_SELECT = """
    SELECT
        hl.log_id,
        hl.habit_id,
        h.habit_name,
        hl.log_date,
        hl.completed,
        hl.notes
    FROM Habit_Logs AS hl
    JOIN Habits AS h
        ON hl.habit_id = h.habit_id
"""


def fetch_habit_log(cursor, log_id):
    cursor.execute(HABIT_LOG_SELECT + " WHERE hl.log_id = %s", (log_id,))
    log = cursor.fetchone()
    return serialize_habit_log(log) if log else None


# Mark a habit as completed or not completed for a date.
# If a log already exists for that habit and date it is updated instead of duplicated.
@app.route("/api/habit-logs", methods=["POST"])
@login_required
def add_habit_log():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Please provide valid JSON data."}), 400

    required_fields = ["habit_id", "log_date", "completed"]
    if not all(field in data for field in required_fields):
        return jsonify({
            "error": "Please provide habit_id, log_date, and completed."
        }), 400

    habit_id = parse_positive_int(data["habit_id"])
    if habit_id is None:
        return jsonify({"error": "Habit ID must be a positive whole number."}), 400

    log_date = parse_date(data["log_date"])
    if log_date is None:
        return jsonify({"error": "Log date must be in YYYY-MM-DD format."}), 400

    completed = parse_completed(data["completed"])
    if completed is None:
        return jsonify({"error": "The completed field must be true or false."}), 400

    notes = clean_notes(data.get("notes"))

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT 1 FROM Habits WHERE habit_id = %s", (habit_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Habit not found."}), 404

        cursor.execute(
            "SELECT log_id FROM Habit_Logs WHERE habit_id = %s AND log_date = %s",
            (habit_id, log_date)
        )
        existing = cursor.fetchone()

        if existing:
            log_id = existing["log_id"]
            cursor.execute(
                "UPDATE Habit_Logs SET completed = %s, notes = %s WHERE log_id = %s AND user_id = %s",
                (completed, notes, log_id, session.get("user_id"))
            )
            status_code = 200
        else:
            cursor.execute(
                """
                INSERT INTO Habit_Logs (user_id, habit_id, log_date, completed, notes)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (session.get("user_id"), habit_id, log_date, completed, notes)
            )
            log_id = cursor.lastrowid
            status_code = 201

        connection.commit()

        return jsonify({
            "message": "Habit log saved successfully!",
            "log_id": log_id,
            "log": fetch_habit_log(cursor, log_id)
        }), status_code

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not save the habit log: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Retrieve habit completion records (optional filters: habit_id, log_date, start_date, end_date)
@app.route("/api/habit-logs", methods=["GET"])
@login_required
def get_habit_logs():
    conditions = ["hl.user_id = %s"]
    params = [session.get("user_id")]

    if request.args.get("habit_id"):
        habit_id = parse_positive_int(request.args["habit_id"])
        if habit_id is None:
            return jsonify({"error": "habit_id must be a positive whole number."}), 400
        conditions.append("hl.habit_id = %s")
        params.append(habit_id)

    for arg, operator in (("log_date", "="), ("start_date", ">="), ("end_date", "<=")):
        if request.args.get(arg):
            parsed = parse_date(request.args[arg])
            if parsed is None:
                return jsonify({"error": f"{arg} must be in YYYY-MM-DD format."}), 400
            conditions.append(f"hl.log_date {operator} %s")
            params.append(parsed)

    query = HABIT_LOG_SELECT
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY hl.log_date DESC, hl.log_id DESC"

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(query, tuple(params))
        logs = [serialize_habit_log(log) for log in cursor.fetchall()]
        return jsonify(logs)

    finally:
        cursor.close()
        connection.close()


# Get a single habit log
@app.route("/api/habit-logs/<int:log_id>", methods=["GET"])
@login_required
def get_habit_log(log_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        log = fetch_habit_log(cursor, log_id)
        if not log:
            return jsonify({"error": "Habit log not found."}), 404
        return jsonify(log)

    finally:
        cursor.close()
        connection.close()


# Update the completed flag and/or notes of a habit log
@app.route("/api/habit-logs/<int:log_id>", methods=["PUT"])
@login_required
def update_habit_log(log_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please provide valid JSON data."}), 400

    if "completed" not in data and "notes" not in data:
        return jsonify({"error": "Please provide completed and/or notes to update."}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT completed, notes FROM Habit_Logs WHERE log_id = %s", (log_id,))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"error": "Habit log not found."}), 404

        completed = existing["completed"]
        if "completed" in data:
            completed = parse_completed(data["completed"])
            if completed is None:
                return jsonify({"error": "The completed field must be true or false."}), 400

        notes = clean_notes(data["notes"]) if "notes" in data else existing["notes"]

        cursor.execute(
            "UPDATE Habit_Logs SET completed = %s, notes = %s WHERE log_id = %s AND user_id = %s",
            (completed, notes, log_id, session.get("user_id"))
        )
        connection.commit()

        return jsonify({
            "message": "Habit log updated successfully!",
            "log_id": log_id,
            "log": fetch_habit_log(cursor, log_id)
        }), 200

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not update the habit log: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# Delete a habit log
@app.route("/api/habit-logs/<int:log_id>", methods=["DELETE"])
@login_required
def delete_habit_log(log_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("DELETE FROM Habit_Logs WHERE log_id = %s AND user_id = %s", (log_id, session.get("user_id")))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Habit log not found."}), 404

        return jsonify({"message": "Habit log deleted successfully!"}), 200

    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(err)}"}), 400

    finally:
        cursor.close()
        connection.close()


# ==========================================
# STATISTICS & PROGRESS API
# ==========================================

def get_today():
    """
    The user's "today". The frontend sends its local date as ?today=YYYY-MM-DD so
    results match the browser's timezone (e.g. IST); otherwise fall back to the
    server's local date. MySQL's CURDATE() is avoided because the DB may run in UTC.
    Returns (date, None) or (None, error_response).
    """
    value = request.args.get("today")
    if not value:
        return datetime.date.today(), None
    parsed = parse_date(value)
    if parsed is None:
        return None, (jsonify({"error": "today must be in YYYY-MM-DD format."}), 400)
    return parsed, None

# Get overall study statistics
@app.route("/api/study-stats", methods=["GET"])
@login_required
def get_study_stats():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
            SELECT
                COUNT(*) AS total_sessions,
                COALESCE(SUM(duration_minutes), 0) AS total_minutes,
                ROUND(COALESCE(SUM(duration_minutes), 0) / 60, 2) AS total_hours
            FROM Study_Sessions
        """

        cursor.execute(query)
        stats = cursor.fetchone()
        if isinstance(stats.get("total_hours"), Decimal):
            stats["total_hours"] = float(stats["total_hours"])
        return jsonify(stats)

    finally:
        cursor.close()
        connection.close()


# Get study statistics for each subject
@app.route("/api/study-stats/subjects", methods=["GET"])
@login_required
def get_subject_study_stats():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
            SELECT
                s.subject_id,
                s.subject_name,
                COUNT(ss.session_id) AS total_sessions,
                COALESCE(SUM(ss.duration_minutes), 0) AS total_minutes,
                ROUND(
                    COALESCE(SUM(ss.duration_minutes), 0) / 60,
                    2
                ) AS total_hours
            FROM Subjects AS s
            LEFT JOIN Study_Sessions AS ss
                ON s.subject_id = ss.subject_id
            GROUP BY s.subject_id, s.subject_name
            ORDER BY total_minutes DESC
        """

        cursor.execute(query)
        stats = cursor.fetchall()
        for row in stats:
            if isinstance(row.get("total_hours"), Decimal):
                row["total_hours"] = float(row["total_hours"])

        return jsonify(stats)

    finally:
        cursor.close()
        connection.close()


# Get today's habit progress
@app.route("/api/habit-progress", methods=["GET"])
@login_required
def get_habit_progress():
    today, error = get_today()
    if error:
        return error

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
            SELECT
                COUNT(h.habit_id) AS total_habits,

                COALESCE(
                    SUM(
                        CASE
                            WHEN hl.completed = 1 THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS completed_habits,

                COUNT(h.habit_id) -
                COALESCE(
                    SUM(
                        CASE
                            WHEN hl.completed = 1 THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS remaining_habits,

                ROUND(
                    COALESCE(
                        SUM(
                            CASE
                                WHEN hl.completed = 1 THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) * 100.0 /
                    NULLIF(COUNT(h.habit_id), 0),
                    2
                ) AS completion_percentage

            FROM Habits AS h

            LEFT JOIN Habit_Logs AS hl
                ON h.habit_id = hl.habit_id
                AND hl.log_date = %s

            WHERE h.is_active = TRUE
        """

        cursor.execute(query, (today,))
        progress = cursor.fetchone()

        if progress["completion_percentage"] is None:
            progress["completion_percentage"] = 0.0
        elif isinstance(progress["completion_percentage"], Decimal):
            progress["completion_percentage"] = float(progress["completion_percentage"])

        return jsonify(progress)

    finally:
        cursor.close()
        connection.close()


# Get weekly study report
@app.route('/api/weekly-report', methods=['GET'])
@login_required
def get_weekly_report():
    today, error = get_today()
    if error:
        return error

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            study_date,
            COUNT(session_id) AS total_sessions,
            SUM(duration_minutes) AS total_minutes,
            ROUND(SUM(duration_minutes) / 60, 2) AS total_hours
        FROM Study_Sessions
        WHERE study_date >= %s
          AND study_date <= %s
        GROUP BY study_date
        ORDER BY study_date;
    """

    try:
        cursor.execute(query, (today - datetime.timedelta(days=6), today))
        report = cursor.fetchall()

        for row in report:
            row['study_date'] = row['study_date'].isoformat()
            if isinstance(row.get("total_hours"), Decimal):
                row["total_hours"] = float(row["total_hours"])

        return jsonify(report)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# ==========================================
# WEEKLY PRODUCTIVITY INSIGHTS REPORT API
# ==========================================

@app.route('/api/insights/weekly', methods=['GET'])
@login_required
def get_weekly_insights():
    today, error = get_today()
    if error:
        return error

    try:
        week_offset = int(request.args.get("week_offset", 0))
    except (ValueError, TypeError):
        week_offset = 0

    target_anchor = today + datetime.timedelta(weeks=week_offset)
    monday = target_anchor - datetime.timedelta(days=target_anchor.weekday())
    sunday = monday + datetime.timedelta(days=6)

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT weekly_goal_hours, daily_goal_hours, full_name FROM user_profile WHERE user_id = %s")
        profile = cursor.fetchone() or {"weekly_goal_hours": 25.0, "daily_goal_hours": 4.0, "full_name": "Student"}
        weekly_goal = float(profile.get("weekly_goal_hours") or 25.0)

        cursor.execute("""
            SELECT
                ss.session_id, ss.study_date, ss.duration_minutes, ss.topic, ss.notes,
                ss.start_time, s.subject_id, COALESCE(s.subject_name, 'General') AS subject_name
            FROM Study_Sessions ss
            LEFT JOIN Subjects s ON ss.subject_id = s.subject_id
            WHERE ss.study_date >= %s AND ss.study_date <= %s
            ORDER BY ss.study_date ASC, ss.session_id ASC
        """, (monday, sunday))
        sessions = cursor.fetchall()

        cursor.execute("SELECT subject_id, subject_name FROM Subjects ORDER BY subject_id")
        all_subjects = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) AS total_active FROM Habits WHERE is_active = 1")
        h_row = cursor.fetchone()
        total_active_habits = h_row["total_active"] if h_row else 0

        cursor.execute("""
            SELECT hl.log_id, hl.log_date, hl.habit_id, h.habit_name
            FROM Habit_Logs hl
            JOIN Habits h ON hl.habit_id = h.habit_id
            WHERE hl.log_date >= %s AND hl.log_date <= %s AND hl.completed = 1
        """, (monday, sunday))
        completed_habits = cursor.fetchall()

        cursor.execute("""
            SELECT
                t.task_id, t.title, t.priority, t.status, t.due_date, t.completed_at,
                s.subject_name
            FROM Study_Tasks t
            LEFT JOIN Subjects s ON t.subject_id = s.subject_id
            WHERE (t.due_date >= %s AND t.due_date <= %s)
               OR (t.completed_at >= %s AND t.completed_at <= %s)
        """, (
            monday, sunday,
            datetime.datetime.combine(monday, datetime.time.min),
            datetime.datetime.combine(sunday, datetime.time.max)
        ))
        tasks = cursor.fetchall()

        cursor.execute("""
            SELECT
                e.exam_id, e.exam_name, e.exam_date, e.notes,
                s.subject_id, s.subject_name
            FROM Exams e
            LEFT JOIN Subjects s ON e.subject_id = s.subject_id
            WHERE e.exam_date >= %s AND e.exam_date <= %s
            ORDER BY e.exam_date ASC
        """, (today, today + datetime.timedelta(days=14)))
        upcoming_exams = cursor.fetchall()

        days_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        daily_stats = {}
        for i in range(7):
            d = monday + datetime.timedelta(days=i)
            d_str = d.isoformat()
            daily_stats[d_str] = {
                "date": d_str,
                "day_name": days_names[i],
                "minutes": 0,
                "hours": 0.0,
                "sessions": 0,
                "habits": 0,
                "tasks_completed": 0
            }

        total_study_mins = 0
        subject_minutes = {}
        longest_session = None

        for s in sessions:
            d_str = s["study_date"].isoformat()
            mins = int(s["duration_minutes"])
            total_study_mins += mins
            if d_str in daily_stats:
                daily_stats[d_str]["minutes"] += mins
                daily_stats[d_str]["sessions"] += 1
            sub_name = s["subject_name"]
            subject_minutes[sub_name] = subject_minutes.get(sub_name, 0) + mins
            if longest_session is None or mins > longest_session["duration_minutes"]:
                longest_session = {
                    "duration_minutes": mins,
                    "topic": s["topic"],
                    "subject_name": sub_name,
                    "study_date": d_str
                }

        for d_str, d_info in daily_stats.items():
            d_info["hours"] = round(d_info["minutes"] / 60, 2)

        for h in completed_habits:
            d_str = h["log_date"].isoformat()
            if d_str in daily_stats:
                daily_stats[d_str]["habits"] += 1

        tasks_completed_count = 0
        tasks_pending_count = 0
        for t in tasks:
            if t["status"] == "Completed":
                tasks_completed_count += 1
                if t.get("completed_at") and isinstance(t["completed_at"], (datetime.datetime, datetime.date)):
                    d_str = t["completed_at"].date().isoformat() if isinstance(t["completed_at"], datetime.datetime) else t["completed_at"].isoformat()
                    if d_str in daily_stats:
                        daily_stats[d_str]["tasks_completed"] += 1
            else:
                tasks_pending_count += 1

        total_study_hours = round(total_study_mins / 60, 2)
        total_sessions = len(sessions)
        avg_session_mins = round(total_study_mins / total_sessions, 1) if total_sessions > 0 else 0
        active_days = sum(1 for d in daily_stats.values() if d["minutes"] > 0 or d["habits"] > 0)

        subject_breakdown = []
        for sub_name, mins in sorted(subject_minutes.items(), key=lambda x: x[1], reverse=True):
            pct = round((mins / total_study_mins) * 100, 1) if total_study_mins > 0 else 0
            subject_breakdown.append({
                "subject_name": sub_name,
                "minutes": mins,
                "hours": round(mins / 60, 2),
                "percentage": pct
            })

        studied_subject_names = set(subject_minutes.keys())
        neglected_subjects = [s["subject_name"] for s in all_subjects if s["subject_name"] not in studied_subject_names]
        top_subject = subject_breakdown[0] if subject_breakdown else None

        possible_habits = total_active_habits * 7
        habit_adherence_pct = round((len(completed_habits) / possible_habits) * 100, 1) if possible_habits > 0 else 100.0
        goal_pct = round((total_study_hours / weekly_goal) * 100, 1) if weekly_goal > 0 else 100.0

        peak_day_obj = max(daily_stats.values(), key=lambda x: x["minutes"]) if any(d["minutes"] > 0 for d in daily_stats.values()) else None
        peak_day_name = peak_day_obj["day_name"] if peak_day_obj and peak_day_obj["minutes"] > 0 else None
        peak_day_hours = peak_day_obj["hours"] if peak_day_obj and peak_day_obj["minutes"] > 0 else 0.0

        exams_summary = []
        for e in upcoming_exams:
            days_until = (e["exam_date"] - today).days
            exams_summary.append({
                "exam_id": e["exam_id"],
                "exam_name": e["exam_name"],
                "subject_name": e["subject_name"] or "General",
                "exam_date": e["exam_date"].isoformat(),
                "days_until": days_until,
                "is_urgent": days_until <= 5
            })

        goal_score = min(40.0, (total_study_hours / weekly_goal) * 40.0) if weekly_goal > 0 else 40.0
        consistency_score = (active_days / 7.0) * 25.0
        habit_score = (habit_adherence_pct / 100.0) * 20.0
        task_score = 15.0 if tasks_completed_count >= 3 else (10.0 if tasks_completed_count > 0 else (12.0 if not tasks else 5.0))
        productivity_index = round(min(100.0, max(0.0, goal_score + consistency_score + habit_score + task_score)), 1)

        if productivity_index >= 88:
            grade = "A+"
            grade_label = "Exceptional Focus & Execution"
        elif productivity_index >= 78:
            grade = "A"
            grade_label = "Strong High-Performance Cadence"
        elif productivity_index >= 68:
            grade = "B+"
            grade_label = "Solid Steady Progress"
        elif productivity_index >= 52:
            grade = "B"
            grade_label = "Moderate Momentum"
        elif productivity_index >= 38:
            grade = "C"
            grade_label = "Needs Focus & Acceleration"
        else:
            grade = "Needs Reset"
            grade_label = "Low Activity Warning"

        if total_study_hours >= weekly_goal:
            pace_verdict = "Weekly Target Exceeded"
        elif total_study_hours >= weekly_goal * 0.75:
            pace_verdict = "On Track (Solid Momentum)"
        elif total_study_hours >= weekly_goal * 0.4:
            pace_verdict = "Moderate Progress"
        else:
            pace_verdict = "Below Target Pace"

        if productivity_index >= 78:
            headline = f"Peak Academic Cadence: {total_study_hours}h completed with {active_days}/7 active focus days."
        elif productivity_index >= 55:
            headline = f"Steady Academic Momentum: Reached {goal_pct}% of weekly target with consistent discipline."
        else:
            headline = f"Pacing Opportunity: {total_study_hours}h completed toward {weekly_goal}h target — ramp up recommended."

        summary_sentences = []
        if total_study_hours > 0:
            summary_sentences.append(
                f"During the weekly cycle of {monday.strftime('%b %d')} to {sunday.strftime('%b %d, %Y')}, you recorded a total of {total_study_hours} focus hours across {total_sessions} study sessions, achieving {goal_pct}% of your {weekly_goal}h weekly target."
            )
        else:
            summary_sentences.append(
                f"For the weekly cycle of {monday.strftime('%b %d')} to {sunday.strftime('%b %d, %Y')}, no study sessions have been logged yet toward your {weekly_goal}h weekly goal."
            )

        if peak_day_name:
            summary_sentences.append(
                f"Your most productive focus window occurred on {peak_day_name}, generating {peak_day_hours} hours ({round(peak_day_hours/total_study_hours*100, 1) if total_study_hours else 0}% of your total volume)."
            )

        if top_subject:
            summary_sentences.append(
                f"Study time was anchored by {top_subject['subject_name']} with {top_subject['hours']}h ({top_subject['percentage']}% share)."
            )

        if completed_habits:
            summary_sentences.append(
                f"Habit discipline registered at {habit_adherence_pct}%, with {len(completed_habits)} total daily habit completions tracked across {active_days} active days."
            )
        else:
            summary_sentences.append(
                f"Daily habit consistency was active across {active_days} days."
            )
        executive_summary = " ".join(summary_sentences)

        strengths = []
        if total_study_hours >= weekly_goal * 0.75:
            strengths.append(f"Target Achievement: Completed {total_study_hours}h deep focus ({goal_pct}% of your {weekly_goal}h target).")
        elif total_study_hours > 0:
            strengths.append(f"Work Volume: Dedicated {total_study_hours} focused hours across {total_sessions} sessions (averaging {avg_session_mins}m per session).")
        if active_days >= 4:
            strengths.append(f"Weekly Cadence: Maintained active study or habit momentum across {active_days} out of 7 days.")
        if peak_day_name:
            strengths.append(f"Powerhouse Anchor: {peak_day_name} was your peak focus day with {peak_day_hours} hours completed.")
        if habit_adherence_pct >= 70 and completed_habits:
            strengths.append(f"Habit Stability: Recorded an impressive {habit_adherence_pct}% completion rate on core routines.")
        if tasks_completed_count > 0:
            strengths.append(f"Task Velocity: Successfully closed {tasks_completed_count} academic planner task(s).")
        if longest_session:
            strengths.append(f"Endurance: Logged a peak {longest_session['duration_minutes']}m continuous deep work block on '{longest_session['topic']}'.")
        if not strengths:
            strengths.append("Fresh canvas: You are set up to log sessions, build consistency, and surpass targets.")

        improvements = []
        if top_subject and top_subject["percentage"] > 65 and len(all_subjects) > 1:
            improvements.append(f"Subject Concentration: {top_subject['subject_name']} received {top_subject['percentage']}% of study time, creating an imbalance with other coursework.")
        if neglected_subjects:
            first_neg = neglected_subjects[:3]
            improvements.append(f"Curriculum Blind Spots: Zero study time logged this week for: {', '.join(first_neg)}.")
        if exams_summary:
            urgent_exam = exams_summary[0]
            if urgent_exam["days_until"] <= 7:
                improvements.append(f"Exam Urgency: '{urgent_exam['exam_name']}' is approaching in {urgent_exam['days_until']} day(s) — ensure dedicated revision blocks are prioritized.")
        if tasks_pending_count > 0:
            improvements.append(f"Sprint Backlog: You have {tasks_pending_count} pending planner task(s) carrying forward.")
        if active_days < 4 and total_study_hours > 0:
            improvements.append(f"Consistency Variance: Focus was compressed into {active_days} days. Spreading study across more days prevents cognitive fatigue.")
        if not improvements:
            improvements.append("Study cadence is well-balanced across subjects and routines.")

        action_plan = []
        if neglected_subjects:
            action_plan.append(f"Schedule a dedicated 75-minute focus session for {neglected_subjects[0]} early in the week.")
        if exams_summary:
            action_plan.append(f"Block two 45-minute revision and flashcard intervals for upcoming '{exams_summary[0]['exam_name']}'.")
        if tasks_pending_count > 0:
            action_plan.append(f"Target closing the top {min(2, tasks_pending_count)} highest-priority pending task(s) before midweek.")
        if total_study_hours < weekly_goal:
            action_plan.append(f"Aim for a daily average of {round(weekly_goal / 6, 1)}h over 6 days to consistently achieve your {weekly_goal}h target.")
        if len(action_plan) < 3:
            action_plan.append("Protect a distraction-free morning 90-minute block for your most challenging conceptual topics.")

        report = {
            "period": {
                "start_date": monday.isoformat(),
                "end_date": sunday.isoformat(),
                "label": f"{monday.strftime('%b %d')} - {sunday.strftime('%b %d, %Y')}",
                "week_offset": week_offset,
                "is_current_week": week_offset == 0
            },
            "metrics": {
                "total_study_minutes": total_study_mins,
                "total_study_hours": total_study_hours,
                "total_sessions": total_sessions,
                "avg_session_minutes": avg_session_mins,
                "weekly_goal_hours": weekly_goal,
                "goal_completion_pct": goal_pct,
                "pace_verdict": pace_verdict,
                "active_days_count": active_days,
                "habits_completed_count": len(completed_habits),
                "habit_adherence_pct": habit_adherence_pct,
                "tasks_completed_count": tasks_completed_count,
                "tasks_pending_count": tasks_pending_count,
                "upcoming_exams_count": len(exams_summary),
                "productivity_index": productivity_index,
                "grade": grade,
                "grade_label": grade_label,
                "peak_day": peak_day_name,
                "peak_day_hours": peak_day_hours
            },
            "subject_breakdown": subject_breakdown,
            "neglected_subjects": neglected_subjects,
            "daily_stats": list(daily_stats.values()),
            "upcoming_exams": exams_summary,
            "written_report": {
                "headline": headline,
                "executive_summary": executive_summary,
                "key_strengths": strengths,
                "improvement_areas": improvements,
                "action_plan": action_plan
            }
        }

        return jsonify(report)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# ==========================================
# CALENDAR ACTIVITY API
# ==========================================

@app.route("/api/calendar-activity", methods=["GET"])
@login_required
def get_calendar_activity():
    today, error = get_today()
    if error:
        return error
    try:
        year = int(request.args.get("year", today.year))
        month = int(request.args.get("month", today.month))
    except (ValueError, TypeError):
        year, month = today.year, today.month

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        # Fetch study sessions for the entire year to power both month view and annual streak matrix
        cursor.execute(
            """
            SELECT 
                study_date,
                COUNT(session_id) AS session_count,
                COALESCE(SUM(duration_minutes), 0) AS total_minutes,
                ROUND(COALESCE(SUM(duration_minutes), 0) / 60, 2) AS total_hours
            FROM Study_Sessions
            WHERE YEAR(study_date) = %s
            GROUP BY study_date
            """,
            (year,)
        )
        study_records = cursor.fetchall()

        # Fetch habits completed for the entire year
        cursor.execute(
            """
            SELECT
                hl.log_date,
                COUNT(*) AS completed_habits
            FROM Habit_Logs hl
            WHERE YEAR(hl.log_date) = %s AND hl.completed = 1
            GROUP BY hl.log_date
            """,
            (year,)
        )
        habit_records = cursor.fetchall()

        # Fetch planner tasks due in the year
        cursor.execute(
            """
            SELECT
                t.task_id, t.title, t.description, t.subject_id, COALESCE(s.subject_name, 'General') AS subject_name,
                t.due_date, t.priority, t.status, t.completed_at
            FROM Study_Tasks t
            LEFT JOIN Subjects s ON t.subject_id = s.subject_id
            WHERE YEAR(t.due_date) = %s
            ORDER BY t.due_date ASC, FIELD(t.priority, 'High', 'Medium', 'Low'), t.task_id ASC
            """,
            (year,)
        )
        task_records = cursor.fetchall()

        # Fetch exams scheduled in the year
        cursor.execute(
            """
            SELECT
                e.exam_id, e.exam_name, e.subject_id, COALESCE(s.subject_name, 'General') AS subject_name,
                e.exam_date, e.notes
            FROM Exams e
            LEFT JOIN Subjects s ON e.subject_id = s.subject_id
            WHERE YEAR(e.exam_date) = %s
            ORDER BY e.exam_date ASC, e.exam_id ASC
            """,
            (year,)
        )
        exam_records = cursor.fetchall()

        activity = {}
        active_dates = set()

        def ensure_date(d_str):
            if d_str not in activity:
                activity[d_str] = {
                    "date": d_str,
                    "sessions": 0,
                    "total_minutes": 0,
                    "total_hours": 0.0,
                    "completed_habits": 0,
                    "tasks": [],
                    "task_count": 0,
                    "pending_task_count": 0,
                    "exams": [],
                    "exam_count": 0,
                }
            return activity[d_str]

        for row in study_records:
            d = row["study_date"]
            d_str = d.isoformat()
            active_dates.add(d)
            item = ensure_date(d_str)
            item["sessions"] = row["session_count"]
            item["total_minutes"] = int(row["total_minutes"])
            item["total_hours"] = float(row["total_hours"]) if row["total_hours"] else 0.0

        for row in habit_records:
            d = row["log_date"]
            d_str = d.isoformat()
            active_dates.add(d)
            item = ensure_date(d_str)
            item["completed_habits"] = row["completed_habits"]

        for row in task_records:
            d = row["due_date"]
            if not d:
                continue
            d_str = d.isoformat()
            item = ensure_date(d_str)
            t_obj = {
                "task_id": row["task_id"],
                "title": row["title"],
                "description": row["description"] or "",
                "subject_id": row["subject_id"],
                "subject_name": row["subject_name"],
                "due_date": d_str,
                "priority": row["priority"],
                "status": row["status"],
                "completed_at": row["completed_at"].isoformat() if row.get("completed_at") else None
            }
            item["tasks"].append(t_obj)
            item["task_count"] += 1
            if row["status"] == "Pending":
                item["pending_task_count"] += 1

        for row in exam_records:
            d = row["exam_date"]
            if not d:
                continue
            d_str = d.isoformat()
            item = ensure_date(d_str)
            e_obj = {
                "exam_id": row["exam_id"],
                "exam_name": row["exam_name"],
                "subject_id": row["subject_id"],
                "subject_name": row["subject_name"],
                "exam_date": d_str,
                "notes": row["notes"] or ""
            }
            item["exams"].append(e_obj)
            item["exam_count"] += 1

        # Calculate intensity (0 to 4) for each date
        for d_str, d_info in activity.items():
            mins = d_info["total_minutes"]
            habits_done = d_info["completed_habits"]
            if mins >= 120 or (mins >= 60 and habits_done >= 2):
                d_info["intensity"] = 4
            elif mins >= 60 or habits_done >= 2:
                d_info["intensity"] = 3
            elif mins >= 30 or habits_done >= 1:
                d_info["intensity"] = 2
            elif mins > 0 or habits_done > 0:
                d_info["intensity"] = 1
            else:
                d_info["intensity"] = 0

        # Calculate streaks
        cur_streak = 0
        longest_streak = 0
        total_active_days = len(active_dates)

        if active_dates:
            sorted_dates = sorted(active_dates)
            curr = 1
            longest_streak = 1
            for i in range(1, len(sorted_dates)):
                if sorted_dates[i] == sorted_dates[i-1] + datetime.timedelta(days=1):
                    curr += 1
                    if curr > longest_streak:
                        longest_streak = curr
                elif sorted_dates[i] > sorted_dates[i-1] + datetime.timedelta(days=1):
                    curr = 1

            check_d = today
            if check_d not in active_dates:
                check_d = today - datetime.timedelta(days=1)
            while check_d in active_dates:
                cur_streak += 1
                check_d -= datetime.timedelta(days=1)

        # Calculate monthly totals for the requested month
        month_hours = 0.0
        month_mins = 0
        month_sessions = 0
        month_habits = 0
        month_tasks = 0
        month_completed_tasks = 0
        month_exams = 0
        for d_str, d_info in activity.items():
            dt_parts = [int(p) for p in d_str.split("-")]
            if dt_parts[0] == year and dt_parts[1] == month:
                month_hours += d_info["total_hours"]
                month_mins += d_info["total_minutes"]
                month_sessions += d_info["sessions"]
                month_habits += d_info["completed_habits"]
                month_tasks += d_info.get("task_count", 0)
                month_completed_tasks += (d_info.get("task_count", 0) - d_info.get("pending_task_count", 0))
                month_exams += d_info.get("exam_count", 0)

        response_data = {
            "activity": activity,
            "streaks": {
                "current_streak": cur_streak,
                "longest_streak": longest_streak,
                "total_active_days": total_active_days
            },
            "monthly_summary": {
                "year": year,
                "month": month,
                "total_hours": round(month_hours, 2),
                "total_minutes": month_mins,
                "total_sessions": month_sessions,
                "completed_habits": month_habits,
                "total_tasks_due": month_tasks,
                "completed_tasks": month_completed_tasks,
                "total_exams": month_exams
            }
        }
        # Keep top-level ISO date keys for backward compatibility
        for k, v in activity.items():
            response_data[k] = v

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# ==========================================
# STUDY PLANNER (TASKS) API
# ==========================================

TASK_PRIORITIES = ("Low", "Medium", "High")
TASK_STATUSES = ("Pending", "Completed")

TASK_SELECT = """
    SELECT
        t.task_id, t.title, t.description, t.subject_id, s.subject_name,
        t.due_date, t.priority, t.status, t.completed_at, t.created_at
    FROM Study_Tasks AS t
    LEFT JOIN Subjects AS s ON t.subject_id = s.subject_id
"""


def serialize_task(task, today):
    due = task.get("due_date")
    task["days_left"] = (due - today).days if isinstance(due, datetime.date) else None
    task["is_overdue"] = task["days_left"] is not None and task["days_left"] < 0 and task["status"] == "Pending"
    for key in ("due_date", "completed_at", "created_at"):
        if isinstance(task.get(key), (datetime.date, datetime.datetime)):
            task[key] = task[key].isoformat()
    return task


def fetch_task(cursor, task_id, today):
    cursor.execute(TASK_SELECT + " WHERE t.task_id = %s", (task_id,))
    task = cursor.fetchone()
    return serialize_task(task, today) if task else None


def validate_optional_subject(cursor, value):
    """Returns (subject_id_or_None, error_message_or_None)."""
    if value in (None, "", 0, "0"):
        return None, None
    subject_id = parse_positive_int(value)
    if subject_id is None:
        return None, "Subject ID must be a positive whole number."
    if not subject_exists(cursor, subject_id):
        return None, "Subject not found."
    return subject_id, None


def validate_task_fields(cursor, data, existing=None):
    """Validate a full (POST) or partial (PUT) task body. Returns (values, error)."""
    current = existing or {}
    values = {}

    if existing is None or "title" in data:
        title = data.get("title").strip() if isinstance(data.get("title"), str) else ""
        if not title:
            return None, "Task title is required."
        if len(title) > 200:
            return None, "Task title must be 200 characters or fewer."
        values["title"] = title
    else:
        values["title"] = current["title"]

    values["description"] = clean_notes(data["description"]) if "description" in data else current.get("description")

    if existing is None or "subject_id" in data:
        subject_id, error = validate_optional_subject(cursor, data.get("subject_id"))
        if error:
            return None, error
        values["subject_id"] = subject_id
    else:
        values["subject_id"] = current.get("subject_id")

    if existing is None or "due_date" in data:
        due = data.get("due_date")
        if due in (None, ""):
            values["due_date"] = None
        else:
            values["due_date"] = parse_date(due)
            if values["due_date"] is None:
                return None, "Due date must be in YYYY-MM-DD format."
    else:
        values["due_date"] = current.get("due_date")

    priority = data.get("priority", current.get("priority", "Medium"))
    if priority not in TASK_PRIORITIES:
        return None, "Priority must be Low, Medium, or High."
    values["priority"] = priority

    status = data.get("status", current.get("status", "Pending"))
    if status not in TASK_STATUSES:
        return None, "Status must be Pending or Completed."
    values["status"] = status

    return values, None


@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():
    today, error = get_today()
    if error:
        return error

    conditions, params = [], []
    if request.args.get("status"):
        if request.args["status"] not in TASK_STATUSES:
            return jsonify({"error": "status must be Pending or Completed."}), 400
        conditions.append("t.status = %s")
        params.append(request.args["status"])
    if request.args.get("subject_id"):
        subject_id = parse_positive_int(request.args["subject_id"])
        if subject_id is None:
            return jsonify({"error": "subject_id must be a positive whole number."}), 400
        conditions.append("t.subject_id = %s")
        params.append(subject_id)

    query = TASK_SELECT
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    # Pending first, then by nearest deadline (tasks without a deadline last), then priority
    query += """
        ORDER BY t.status = 'Completed', t.due_date IS NULL, t.due_date,
                 FIELD(t.priority, 'High', 'Medium', 'Low'), t.task_id
    """

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query, tuple(params))
        return jsonify([serialize_task(t, today) for t in cursor.fetchall()])
    finally:
        cursor.close()
        connection.close()


@app.route("/api/tasks", methods=["POST"])
@login_required
def add_task():
    today, error = get_today()
    if error:
        return error
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please provide valid JSON data."}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        values, message = validate_task_fields(cursor, data)
        if message:
            return jsonify({"error": message}), 404 if message == "Subject not found." else 400

        cursor.execute(
            """
            INSERT INTO Study_Tasks (title, description, subject_id, due_date, priority, status, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (values["title"], values["description"], values["subject_id"], values["due_date"],
             values["priority"], values["status"],
             datetime.datetime.now() if values["status"] == "Completed" else None)
        )
        connection.commit()
        task_id = cursor.lastrowid
        return jsonify({
            "message": "Task created successfully!",
            "task_id": task_id,
            "task": fetch_task(cursor, task_id, today)
        }), 201
    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not create task: {str(err)}"}), 400
    finally:
        cursor.close()
        connection.close()


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    today, error = get_today()
    if error:
        return error
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please provide valid JSON data."}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Study_Tasks WHERE task_id = %s AND user_id = %s", (task_id, session.get("user_id")))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"error": "Task not found."}), 404

        values, message = validate_task_fields(cursor, data, existing)
        if message:
            return jsonify({"error": message}), 404 if message == "Subject not found." else 400

        completed_at = existing["completed_at"]
        if values["status"] == "Completed" and existing["status"] != "Completed":
            completed_at = datetime.datetime.now()
        elif values["status"] == "Pending":
            completed_at = None

        cursor.execute(
            """
            UPDATE Study_Tasks
            SET title = %s, description = %s, subject_id = %s, due_date = %s,
                priority = %s, status = %s, completed_at = %s
            WHERE task_id = %s
            """,
            (values["title"], values["description"], values["subject_id"], values["due_date"],
             values["priority"], values["status"], completed_at, task_id)
        )
        connection.commit()
        return jsonify({
            "message": "Task updated successfully!",
            "task_id": task_id,
            "task": fetch_task(cursor, task_id, today)
        }), 200
    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not update task: {str(err)}"}), 400
    finally:
        cursor.close()
        connection.close()


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM Study_Tasks WHERE task_id = %s AND user_id = %s", (task_id, session.get("user_id")))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found."}), 404
        return jsonify({"message": "Task deleted successfully!"}), 200
    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(err)}"}), 400
    finally:
        cursor.close()
        connection.close()


# ==========================================
# EXAM COUNTDOWN API
# ==========================================

EXAM_SELECT = """
    SELECT
        e.exam_id, e.exam_name, e.subject_id, s.subject_name, e.exam_date, e.notes, e.created_at,
        (SELECT COUNT(*) FROM Study_Tasks t
          WHERE t.subject_id = e.subject_id AND t.status = 'Pending') AS pending_tasks,
        (SELECT COUNT(*) FROM Study_Tasks t
          WHERE t.subject_id = e.subject_id AND t.status = 'Completed') AS completed_tasks
    FROM Exams AS e
    LEFT JOIN Subjects AS s ON e.subject_id = s.subject_id
"""


def serialize_exam(exam, today):
    exam["days_left"] = (exam["exam_date"] - today).days
    exam["is_past"] = exam["days_left"] < 0
    exam["exam_date"] = exam["exam_date"].isoformat()
    if isinstance(exam.get("created_at"), (datetime.date, datetime.datetime)):
        exam["created_at"] = exam["created_at"].isoformat()
    exam["pending_tasks"] = int(exam.get("pending_tasks") or 0)
    exam["completed_tasks"] = int(exam.get("completed_tasks") or 0)
    return exam


def fetch_exam(cursor, exam_id, today):
    cursor.execute(EXAM_SELECT + " WHERE e.exam_id = %s", (exam_id,))
    exam = cursor.fetchone()
    return serialize_exam(exam, today) if exam else None


def validate_exam_payload(cursor, data):
    if not data:
        return None, "Please provide valid JSON data."
    name = data.get("exam_name").strip() if isinstance(data.get("exam_name"), str) else ""
    if not name:
        return None, "Exam name is required."
    if len(name) > 150:
        return None, "Exam name must be 150 characters or fewer."
    exam_date = parse_date(data.get("exam_date"))
    if exam_date is None:
        return None, "Exam date must be in YYYY-MM-DD format."
    subject_id, error = validate_optional_subject(cursor, data.get("subject_id"))
    if error:
        return None, error
    return {
        "exam_name": name,
        "exam_date": exam_date,
        "subject_id": subject_id,
        "notes": clean_notes(data.get("notes")),
    }, None


@app.route("/api/exams", methods=["GET"])
@login_required
def get_exams():
    today, error = get_today()
    if error:
        return error
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        # Upcoming exams first (soonest first), then past exams (most recent first)
        cursor.execute(EXAM_SELECT + " ORDER BY e.exam_date < %s, ABS(DATEDIFF(e.exam_date, %s)), e.exam_id",
                       (today, today))
        return jsonify([serialize_exam(e, today) for e in cursor.fetchall()])
    finally:
        cursor.close()
        connection.close()


@app.route("/api/exams", methods=["POST"])
@login_required
def add_exam():
    today, error = get_today()
    if error:
        return error
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        values, message = validate_exam_payload(cursor, request.get_json(silent=True))
        if message:
            return jsonify({"error": message}), 404 if message == "Subject not found." else 400
        cursor.execute(
            "INSERT INTO Exams (user_id, exam_name, subject_id, exam_date, notes) VALUES (%s, %s, %s, %s, %s)",
            (session.get("user_id"), values["exam_name"], values["subject_id"], values["exam_date"], values["notes"])
        )
        connection.commit()
        exam_id = cursor.lastrowid
        return jsonify({
            "message": "Exam added successfully!",
            "exam_id": exam_id,
            "exam": fetch_exam(cursor, exam_id, today)
        }), 201
    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not add exam: {str(err)}"}), 400
    finally:
        cursor.close()
        connection.close()


@app.route("/api/exams/<int:exam_id>", methods=["PUT"])
@login_required
def update_exam(exam_id):
    today, error = get_today()
    if error:
        return error
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT exam_id FROM Exams WHERE exam_id = %s", (exam_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Exam not found."}), 404
        values, message = validate_exam_payload(cursor, request.get_json(silent=True))
        if message:
            return jsonify({"error": message}), 404 if message == "Subject not found." else 400
        cursor.execute(
            "UPDATE Exams SET exam_name = %s, subject_id = %s, exam_date = %s, notes = %s WHERE exam_id = %s",
            (values["exam_name"], values["subject_id"], values["exam_date"], values["notes"], exam_id)
        )
        connection.commit()
        return jsonify({
            "message": "Exam updated successfully!",
            "exam_id": exam_id,
            "exam": fetch_exam(cursor, exam_id, today)
        }), 200
    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Could not update exam: {str(err)}"}), 400
    finally:
        cursor.close()
        connection.close()


@app.route("/api/exams/<int:exam_id>", methods=["DELETE"])
@login_required
def delete_exam(exam_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM Exams WHERE exam_id = %s AND user_id = %s", (exam_id, session.get("user_id")))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Exam not found."}), 404
        return jsonify({"message": "Exam deleted successfully!"}), 200
    except mysql.connector.Error as err:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(err)}"}), 400
    finally:
        cursor.close()
        connection.close()


# ==========================================
# NOTES API
# ==========================================

@app.route("/api/notes", methods=["GET"])
@login_required
def get_notes():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        subject_id = request.args.get("subject_id")
        search = request.args.get("search", "").strip()
        pinned = request.args.get("pinned")
        tag = request.args.get("tag", "").strip()

        query = """
            SELECT
                n.note_id, n.title, n.content, n.subject_id, s.subject_name,
                n.tags, n.is_pinned, n.color, n.created_at, n.updated_at,
                (SELECT COUNT(*) FROM Flashcards f WHERE f.note_id = n.note_id) AS flashcard_count
            FROM Notes n
            LEFT JOIN Subjects s ON n.subject_id = s.subject_id
            WHERE n.user_id = %s
            WHERE 1=1
        """
        params = []
        if subject_id:
            try:
                query += " AND n.subject_id = %s"
                params.append(int(subject_id))
            except ValueError:
                pass
        if pinned in ("1", "true", "True"):
            query += " AND n.is_pinned = 1"
        if tag:
            query += " AND (n.tags LIKE %s)"
            params.append(f"%{tag}%")
        if search:
            query += " AND (n.title LIKE %s OR n.content LIKE %s OR n.tags LIKE %s)"
            pattern = f"%{search}%"
            params.extend([pattern, pattern, pattern])

        query += " ORDER BY n.is_pinned DESC, n.updated_at DESC, n.note_id DESC"
        cursor.execute(query, tuple(params))
        notes = cursor.fetchall()
        for note in notes:
            if note.get("created_at") and isinstance(note["created_at"], (datetime.date, datetime.datetime)):
                note["created_at"] = note["created_at"].isoformat()
            if note.get("updated_at") and isinstance(note["updated_at"], (datetime.date, datetime.datetime)):
                note["updated_at"] = note["updated_at"].isoformat()
            note["is_pinned"] = bool(note.get("is_pinned", 0))
        return jsonify(notes)
    finally:
        cursor.close()
        connection.close()


@app.route("/api/notes/<int:note_id>", methods=["GET"])
@login_required
def get_note(note_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                n.note_id, n.title, n.content, n.subject_id, s.subject_name,
                n.tags, n.is_pinned, n.color, n.created_at, n.updated_at
            FROM Notes n
            LEFT JOIN Subjects s ON n.subject_id = s.subject_id
            WHERE n.user_id = %s
            WHERE n.note_id = %s
        """, (note_id,))
        note = cursor.fetchone()
        if not note:
            return jsonify({"error": "Note not found."}), 404
        if note.get("created_at") and isinstance(note["created_at"], (datetime.date, datetime.datetime)):
            note["created_at"] = note["created_at"].isoformat()
        if note.get("updated_at") and isinstance(note["updated_at"], (datetime.date, datetime.datetime)):
            note["updated_at"] = note["updated_at"].isoformat()
        note["is_pinned"] = bool(note.get("is_pinned", 0))

        cursor.execute("""
            SELECT flashcard_id, deck_name, question, answer, hint, mastery_level, times_reviewed, last_reviewed_at
            FROM Flashcards
            WHERE note_id = %s
            ORDER BY flashcard_id ASC
        """, (note_id,))
        flashcards = cursor.fetchall()
        for f in flashcards:
            if f.get("last_reviewed_at") and isinstance(f["last_reviewed_at"], (datetime.date, datetime.datetime)):
                f["last_reviewed_at"] = f["last_reviewed_at"].isoformat()
        note["flashcards"] = flashcards
        return jsonify(note)
    finally:
        cursor.close()
        connection.close()


@app.route("/api/notes", methods=["POST"])
@login_required
def add_note():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    if not title:
        return jsonify({"error": "Note title is required."}), 400
    if not content:
        return jsonify({"error": "Note content is required."}), 400

    subject_id = data.get("subject_id")
    if subject_id in ("", None, "null"):
        subject_id = None
    else:
        try:
            subject_id = int(subject_id)
        except ValueError:
            return jsonify({"error": "Invalid subject_id."}), 400

    tags = data.get("tags", "").strip()
    is_pinned = 1 if data.get("is_pinned") in (True, 1, "1", "true") else 0
    color = data.get("color", "purple").strip() or "purple"

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        if subject_id is not None:
            cursor.execute("SELECT subject_id FROM Subjects WHERE subject_id = %s", (subject_id,))
            if not cursor.fetchone():
                return jsonify({"error": f"Subject with ID {subject_id} does not exist."}), 400

        cursor.execute("""
            INSERT INTO Notes (user_id, title, content, subject_id, tags, is_pinned, color)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (title, content, subject_id, tags, is_pinned, color))
        connection.commit()
        new_id = cursor.lastrowid
        cursor.execute("""
            SELECT n.note_id, n.title, n.content, n.subject_id, s.subject_name,
                   n.tags, n.is_pinned, n.color, n.created_at, n.updated_at
            FROM Notes n
            LEFT JOIN Subjects s ON n.subject_id = s.subject_id
            WHERE n.user_id = %s
            WHERE n.note_id = %s
        """, (new_id,))
        created = cursor.fetchone()
        if created.get("created_at"):
            created["created_at"] = created["created_at"].isoformat()
        if created.get("updated_at"):
            created["updated_at"] = created["updated_at"].isoformat()
        created["is_pinned"] = bool(created["is_pinned"])
        return jsonify({"message": "Note created successfully!", "note": created}), 201
    finally:
        cursor.close()
        connection.close()


@app.route("/api/notes/<int:note_id>", methods=["PUT"])
@login_required
def update_note(note_id):
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    if not title:
        return jsonify({"error": "Note title cannot be empty."}), 400
    if not content:
        return jsonify({"error": "Note content cannot be empty."}), 400

    subject_id = data.get("subject_id")
    if subject_id in ("", None, "null"):
        subject_id = None
    else:
        try:
            subject_id = int(subject_id)
        except ValueError:
            return jsonify({"error": "Invalid subject_id."}), 400

    tags = data.get("tags", "").strip()
    is_pinned = 1 if data.get("is_pinned") in (True, 1, "1", "true") else 0
    color = data.get("color", "purple").strip() or "purple"

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT note_id FROM Notes WHERE note_id = %s AND user_id = %s", (note_id, session.get("user_id")))
        if not cursor.fetchone():
            return jsonify({"error": "Note not found."}), 404

        if subject_id is not None:
            cursor.execute("SELECT subject_id FROM Subjects WHERE subject_id = %s", (subject_id,))
            if not cursor.fetchone():
                return jsonify({"error": f"Subject with ID {subject_id} does not exist."}), 400

        cursor.execute("""
            UPDATE Notes
            SET title = %s, content = %s, subject_id = %s, tags = %s, is_pinned = %s, color = %s
            WHERE note_id = %s
        """, (title, content, subject_id, tags, is_pinned, color, note_id))
        connection.commit()

        cursor.execute("""
            SELECT n.note_id, n.title, n.content, n.subject_id, s.subject_name,
                   n.tags, n.is_pinned, n.color, n.created_at, n.updated_at
            FROM Notes n
            LEFT JOIN Subjects s ON n.subject_id = s.subject_id
            WHERE n.user_id = %s
            WHERE n.note_id = %s
        """, (note_id,))
        updated = cursor.fetchone()
        if updated.get("created_at"):
            updated["created_at"] = updated["created_at"].isoformat()
        if updated.get("updated_at"):
            updated["updated_at"] = updated["updated_at"].isoformat()
        updated["is_pinned"] = bool(updated["is_pinned"])
        return jsonify({"message": "Note updated successfully!", "note": updated})
    finally:
        cursor.close()
        connection.close()


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@login_required
def delete_note(note_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM Notes WHERE note_id = %s AND user_id = %s", (note_id, session.get("user_id")))
        if cursor.rowcount == 0:
            return jsonify({"error": "Note not found."}), 404
        connection.commit()
        return jsonify({"message": "Note deleted successfully!"})
    finally:
        cursor.close()
        connection.close()


@app.route("/api/notes/<int:note_id>/pin", methods=["PATCH"])
@login_required
def toggle_note_pin(note_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT note_id, is_pinned FROM Notes WHERE note_id = %s AND user_id = %s", (note_id, session.get("user_id")))
        note = cursor.fetchone()
        if not note:
            return jsonify({"error": "Note not found."}), 404
        new_pinned = 0 if note["is_pinned"] else 1
        cursor.execute("UPDATE Notes SET is_pinned = %s WHERE note_id = %s", (new_pinned, note_id))
        connection.commit()
        return jsonify({"message": "Note pin status updated.", "is_pinned": bool(new_pinned)})
    finally:
        cursor.close()
        connection.close()


# ==========================================
# FLASHCARDS API
# ==========================================

MASTERY_LEVELS = ("New", "Learning", "Review", "Mastered")

@app.route("/api/flashcards", methods=["GET"])
@login_required
def get_flashcards():
    deck_name = request.args.get("deck_name", "").strip()
    subject_id = request.args.get("subject_id")
    mastery_level = request.args.get("mastery_level", "").strip()
    note_id = request.args.get("note_id")
    search = request.args.get("search", "").strip()

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        query = """
            SELECT
                f.flashcard_id, f.subject_id, s.subject_name, f.note_id, n.title AS note_title,
                f.deck_name, f.question, f.answer, f.hint, f.mastery_level,
                f.times_reviewed, f.last_reviewed_at, f.created_at, f.updated_at
            FROM Flashcards f
            LEFT JOIN Subjects s ON f.subject_id = s.subject_id
            LEFT JOIN Notes n ON f.note_id = n.note_id
            WHERE 1=1
        """
        params = []
        if deck_name:
            query += " AND f.deck_name = %s"
            params.append(deck_name)
        if subject_id:
            try:
                query += " AND f.subject_id = %s"
                params.append(int(subject_id))
            except ValueError:
                pass
        if mastery_level in MASTERY_LEVELS:
            query += " AND f.mastery_level = %s"
            params.append(mastery_level)
        if note_id:
            try:
                query += " AND f.note_id = %s"
                params.append(int(note_id))
            except ValueError:
                pass
        if search:
            query += " AND (f.question LIKE %s OR f.answer LIKE %s OR f.deck_name LIKE %s OR f.hint LIKE %s)"
            pattern = f"%{search}%"
            params.extend([pattern, pattern, pattern, pattern])

        query += " ORDER BY f.deck_name ASC, f.flashcard_id ASC"
        cursor.execute(query, tuple(params))
        flashcards = cursor.fetchall()
        for fc in flashcards:
            if fc.get("last_reviewed_at") and isinstance(fc["last_reviewed_at"], (datetime.date, datetime.datetime)):
                fc["last_reviewed_at"] = fc["last_reviewed_at"].isoformat()
            if fc.get("created_at") and isinstance(fc["created_at"], (datetime.date, datetime.datetime)):
                fc["created_at"] = fc["created_at"].isoformat()
            if fc.get("updated_at") and isinstance(fc["updated_at"], (datetime.date, datetime.datetime)):
                fc["updated_at"] = fc["updated_at"].isoformat()
        return jsonify(flashcards)
    finally:
        cursor.close()
        connection.close()


@app.route("/api/flashcards/decks", methods=["GET"])
@login_required
def get_flashcard_decks():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                f.deck_name,
                f.subject_id,
                MAX(s.subject_name) AS subject_name,
                COUNT(f.flashcard_id) AS total_cards,
                SUM(CASE WHEN f.mastery_level = 'New' THEN 1 ELSE 0 END) AS new_count,
                SUM(CASE WHEN f.mastery_level = 'Learning' THEN 1 ELSE 0 END) AS learning_count,
                SUM(CASE WHEN f.mastery_level = 'Review' THEN 1 ELSE 0 END) AS review_count,
                SUM(CASE WHEN f.mastery_level = 'Mastered' THEN 1 ELSE 0 END) AS mastered_count,
                MAX(f.last_reviewed_at) AS last_reviewed_at
            FROM Flashcards f
            LEFT JOIN Subjects s ON f.subject_id = s.subject_id
            GROUP BY f.deck_name, f.subject_id
            ORDER BY f.deck_name ASC
        """)
        decks = cursor.fetchall()
        for d in decks:
            total = int(d["total_cards"])
            mastered = int(d["mastered_count"] or 0)
            d["mastery_percentage"] = round((mastered / total) * 100) if total > 0 else 0
            if d.get("last_reviewed_at") and isinstance(d["last_reviewed_at"], (datetime.date, datetime.datetime)):
                d["last_reviewed_at"] = d["last_reviewed_at"].isoformat()
        return jsonify(decks)
    finally:
        cursor.close()
        connection.close()


@app.route("/api/flashcards", methods=["POST"])
@login_required
def add_flashcard():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    answer = data.get("answer", "").strip()
    if not question:
        return jsonify({"error": "Question is required."}), 400
    if not answer:
        return jsonify({"error": "Answer is required."}), 400

    deck_name = data.get("deck_name", "").strip() or "General"
    hint = data.get("hint", "").strip()
    mastery = data.get("mastery_level", "New")
    if mastery not in MASTERY_LEVELS:
        mastery = "New"

    subject_id = data.get("subject_id")
    if subject_id in ("", None, "null"):
        subject_id = None
    else:
        try:
            subject_id = int(subject_id)
        except ValueError:
            return jsonify({"error": "Invalid subject_id."}), 400

    note_id = data.get("note_id")
    if note_id in ("", None, "null"):
        note_id = None
    else:
        try:
            note_id = int(note_id)
        except ValueError:
            return jsonify({"error": "Invalid note_id."}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        if subject_id is not None:
            cursor.execute("SELECT subject_id FROM Subjects WHERE subject_id = %s", (subject_id,))
            if not cursor.fetchone():
                return jsonify({"error": f"Subject with ID {subject_id} does not exist."}), 400

        if note_id is not None:
            cursor.execute("SELECT note_id FROM Notes WHERE note_id = %s AND user_id = %s", (note_id, session.get("user_id")))
            if not cursor.fetchone():
                return jsonify({"error": f"Note with ID {note_id} does not exist."}), 400

        cursor.execute("""
            INSERT INTO Flashcards (subject_id, note_id, deck_name, question, answer, hint, mastery_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (subject_id, note_id, deck_name, question, answer, hint, mastery))
        connection.commit()
        new_id = cursor.lastrowid

        cursor.execute("""
            SELECT f.flashcard_id, f.subject_id, s.subject_name, f.note_id,
                   f.deck_name, f.question, f.answer, f.hint, f.mastery_level,
                   f.times_reviewed, f.last_reviewed_at, f.created_at, f.updated_at
            FROM Flashcards f
            LEFT JOIN Subjects s ON f.subject_id = s.subject_id
            WHERE f.flashcard_id = %s
        """, (new_id,))
        created = cursor.fetchone()
        if created.get("created_at"):
            created["created_at"] = created["created_at"].isoformat()
        if created.get("updated_at"):
            created["updated_at"] = created["updated_at"].isoformat()
        return jsonify({"message": "Flashcard created successfully!", "flashcard": created}), 201
    finally:
        cursor.close()
        connection.close()


@app.route("/api/flashcards/<int:flashcard_id>", methods=["PUT"])
@login_required
def update_flashcard(flashcard_id):
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    answer = data.get("answer", "").strip()
    if not question:
        return jsonify({"error": "Question cannot be empty."}), 400
    if not answer:
        return jsonify({"error": "Answer cannot be empty."}), 400

    deck_name = data.get("deck_name", "").strip() or "General"
    hint = data.get("hint", "").strip()
    mastery = data.get("mastery_level", "New")
    if mastery not in MASTERY_LEVELS:
        mastery = "New"

    subject_id = data.get("subject_id")
    if subject_id in ("", None, "null"):
        subject_id = None
    else:
        try:
            subject_id = int(subject_id)
        except ValueError:
            return jsonify({"error": "Invalid subject_id."}), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT flashcard_id FROM Flashcards WHERE flashcard_id = %s", (flashcard_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Flashcard not found."}), 404

        if subject_id is not None:
            cursor.execute("SELECT subject_id FROM Subjects WHERE subject_id = %s", (subject_id,))
            if not cursor.fetchone():
                return jsonify({"error": f"Subject with ID {subject_id} does not exist."}), 400

        cursor.execute("""
            UPDATE Flashcards
            SET question = %s, answer = %s, hint = %s, deck_name = %s, subject_id = %s, mastery_level = %s
            WHERE flashcard_id = %s
        """, (question, answer, hint, deck_name, subject_id, mastery, flashcard_id))
        connection.commit()

        cursor.execute("""
            SELECT f.flashcard_id, f.subject_id, s.subject_name, f.note_id,
                   f.deck_name, f.question, f.answer, f.hint, f.mastery_level,
                   f.times_reviewed, f.last_reviewed_at, f.created_at, f.updated_at
            FROM Flashcards f
            LEFT JOIN Subjects s ON f.subject_id = s.subject_id
            WHERE f.flashcard_id = %s
        """, (flashcard_id,))
        updated = cursor.fetchone()
        if updated.get("last_reviewed_at"):
            updated["last_reviewed_at"] = updated["last_reviewed_at"].isoformat()
        if updated.get("created_at"):
            updated["created_at"] = updated["created_at"].isoformat()
        if updated.get("updated_at"):
            updated["updated_at"] = updated["updated_at"].isoformat()
        return jsonify({"message": "Flashcard updated successfully!", "flashcard": updated})
    finally:
        cursor.close()
        connection.close()


@app.route("/api/flashcards/<int:flashcard_id>", methods=["DELETE"])
@login_required
def delete_flashcard(flashcard_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM Flashcards WHERE flashcard_id = %s", (flashcard_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Flashcard not found."}), 404
        connection.commit()
        return jsonify({"message": "Flashcard deleted successfully!"})
    finally:
        cursor.close()
        connection.close()


@app.route("/api/flashcards/<int:flashcard_id>/review", methods=["POST"])
@login_required
def review_flashcard(flashcard_id):
    data = request.get_json(silent=True) or {}
    rating = data.get("rating", "").lower().strip()
    if rating in ("again", "hard"):
        new_mastery = "Review"
    elif rating in ("good", "medium"):
        new_mastery = "Learning"
    elif rating in ("easy", "mastered"):
        new_mastery = "Mastered"
    elif data.get("mastery_level") in MASTERY_LEVELS:
        new_mastery = data["mastery_level"]
    else:
        new_mastery = "Learning"

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT flashcard_id FROM Flashcards WHERE flashcard_id = %s", (flashcard_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Flashcard not found."}), 404

        now = datetime.datetime.now()
        cursor.execute("""
            UPDATE Flashcards
            SET mastery_level = %s,
                times_reviewed = times_reviewed + 1,
                last_reviewed_at = %s
            WHERE flashcard_id = %s
        """, (new_mastery, now, flashcard_id))
        connection.commit()

        cursor.execute("""
            SELECT f.flashcard_id, f.subject_id, s.subject_name, f.note_id,
                   f.deck_name, f.question, f.answer, f.hint, f.mastery_level,
                   f.times_reviewed, f.last_reviewed_at
            FROM Flashcards f
            LEFT JOIN Subjects s ON f.subject_id = s.subject_id
            WHERE f.flashcard_id = %s
        """, (flashcard_id,))
        updated = cursor.fetchone()
        if updated.get("last_reviewed_at"):
            updated["last_reviewed_at"] = updated["last_reviewed_at"].isoformat()
        return jsonify({"message": "Review recorded successfully!", "flashcard": updated})
    finally:
        cursor.close()
        connection.close()


@app.route("/api/flashcards/from-note/<int:note_id>", methods=["POST"])
@login_required
def create_flashcards_from_note(note_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT note_id, title, content, subject_id FROM Notes WHERE note_id = %s AND user_id = %s", (note_id, session.get("user_id")))
        note = cursor.fetchone()
        if not note:
            return jsonify({"error": "Note not found."}), 404

        deck_name = note["title"][:50]
        content = note["content"] or ""
        lines = content.splitlines()

        cards_to_create = []
        current_q = None
        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue
            if trimmed.lower().startswith("q:") or trimmed.lower().startswith("question:"):
                current_q = trimmed.split(":", 1)[1].strip()
            elif current_q and (trimmed.lower().startswith("a:") or trimmed.lower().startswith("answer:")):
                ans = trimmed.split(":", 1)[1].strip()
                cards_to_create.append((current_q, ans, ""))
                current_q = None
            elif ":" in trimmed and not trimmed.startswith("http"):
                parts = trimmed.split(":", 1)
                term = parts[0].strip().lstrip("-*• ")
                def_text = parts[1].strip()
                if 2 <= len(term) <= 100 and len(def_text) >= 3:
                    cards_to_create.append((f"What is {term}?", def_text, ""))
            elif trimmed.startswith("- ") or trimmed.startswith("* ") or trimmed.startswith("• "):
                bullet = trimmed.lstrip("-*• ").strip()
                if " - " in bullet:
                    p1, p2 = bullet.split(" - ", 1)
                    cards_to_create.append((f"Define / Explain: {p1.strip()}", p2.strip(), ""))

        if not cards_to_create:
            paras = [p.strip() for p in content.split("\n\n") if len(p.strip()) > 10]
            for i, p in enumerate(paras[:5]):
                first_sentence = p.split(".")[0]
                cards_to_create.append((f"Key Concept {i+1} from {note['title']}: {first_sentence}...", p, ""))

        inserted_count = 0
        for q, a, hint in cards_to_create:
            cursor.execute("""
                INSERT INTO Flashcards (subject_id, note_id, deck_name, question, answer, hint, mastery_level)
                VALUES (%s, %s, %s, %s, %s, %s, 'New')
            """, (note["subject_id"], note["note_id"], deck_name, q[:500], a[:2000], hint))
            inserted_count += 1
        connection.commit()

        return jsonify({
            "message": f"Successfully created {inserted_count} flashcard(s) from note '{note['title']}'!",
            "deck_name": deck_name,
            "created_count": inserted_count
        }), 201
    finally:
        cursor.close()
        connection.close()


# ==========================================
# STUDY GOALS API
# ==========================================

def goal_entry(minutes, target_hours):
    hours = round(minutes / 60, 2)
    target = float(target_hours or 0)
    percentage = round(min(100.0, hours * 100 / target), 1) if target > 0 else 0.0
    return {
        "hours": hours,
        "target_hours": target,
        "percentage": percentage,
        "remaining_hours": round(max(0.0, target - hours), 2),
        "achieved": target > 0 and hours >= target,
    }


def get_profile_goals(cursor):
    cursor.execute(
        """
        SELECT daily_goal_hours, weekly_goal_hours, semester_goal_hours, semester_start, semester_end
        FROM user_profile WHERE user_id = %s
        """
    )
    return cursor.fetchone() or {
        "daily_goal_hours": 4.0, "weekly_goal_hours": 25.0,
        "semester_goal_hours": 300.0, "semester_start": None, "semester_end": None,
    }


def minutes_between(cursor, start, end):
    conditions, params = [], []
    if start:
        conditions.append("study_date >= %s")
        params.append(start)
    if end:
        conditions.append("study_date <= %s")
        params.append(end)
    query = "SELECT COALESCE(SUM(duration_minutes), 0) AS minutes FROM Study_Sessions"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    cursor.execute(query, tuple(params))
    return int(cursor.fetchone()["minutes"])


@app.route("/api/goals-progress", methods=["GET"])
@login_required
def get_goals_progress():
    today, error = get_today()
    if error:
        return error
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        goals = get_profile_goals(cursor)
        week_start = today - datetime.timedelta(days=today.weekday())  # Monday
        sem_start, sem_end = goals.get("semester_start"), goals.get("semester_end")

        semester = goal_entry(minutes_between(cursor, sem_start, min(sem_end, today) if sem_end else today),
                              goals.get("semester_goal_hours"))
        semester["start"] = sem_start.isoformat() if sem_start else None
        semester["end"] = sem_end.isoformat() if sem_end else None
        semester["days_left"] = (sem_end - today).days if sem_end else None

        weekly = goal_entry(minutes_between(cursor, week_start, today), goals.get("weekly_goal_hours"))
        weekly["week_start"] = week_start.isoformat()

        return jsonify({
            "today": today.isoformat(),
            "daily": goal_entry(minutes_between(cursor, today, today), goals.get("daily_goal_hours")),
            "weekly": weekly,
            "semester": semester,
        })
    finally:
        cursor.close()
        connection.close()


# ==========================================
# ACHIEVEMENTS & BADGES API
# ==========================================

def longest_and_current_streak(dates, today):
    dates = sorted(set(dates))
    longest = run = 0
    previous = None
    for d in dates:
        run = run + 1 if previous and d == previous + datetime.timedelta(days=1) else 1
        longest = max(longest, run)
        previous = d
    current = 0
    check = today if today in dates else today - datetime.timedelta(days=1)
    date_set = set(dates)
    while check in date_set:
        current += 1
        check -= datetime.timedelta(days=1)
    return longest, current


@app.route("/api/achievements", methods=["GET"])
@login_required
def get_achievements():
    today, error = get_today()
    if error:
        return error
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT study_date, SUM(duration_minutes) AS minutes
            FROM Study_Sessions WHERE study_date <= %s GROUP BY study_date
            """,
            (today,)
        )
        daily = {row["study_date"]: int(row["minutes"]) for row in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) AS n FROM Study_Sessions WHERE study_date <= %s", (today,))
        session_count = cursor.fetchone()["n"]
        cursor.execute(
            "SELECT COUNT(*) AS n FROM Study_Sessions WHERE study_date <= %s AND notes LIKE 'Pomodoro%%'",
            (today,)
        )
        pomodoro_count = cursor.fetchone()["n"]

        cursor.execute("SELECT COUNT(*) AS n FROM Habit_Logs WHERE completed = 1 AND log_date <= %s", (today,))
        habits_completed = cursor.fetchone()["n"]
        cursor.execute("SELECT COUNT(*) AS n FROM Habits WHERE is_active = TRUE")
        active_habits = cursor.fetchone()["n"]
        cursor.execute(
            """
            SELECT COALESCE(MAX(done), 0) AS best FROM (
                SELECT COUNT(*) AS done FROM Habit_Logs hl
                JOIN Habits h ON h.habit_id = hl.habit_id AND h.is_active = TRUE
                WHERE hl.completed = 1 AND hl.log_date <= %s
                GROUP BY hl.log_date
            ) AS per_day
            """,
            (today,)
        )
        best_habit_day = int(cursor.fetchone()["best"])

        cursor.execute("SELECT COUNT(*) AS n FROM Study_Tasks WHERE status = 'Completed'")
        tasks_completed = cursor.fetchone()["n"]

        weekly_goal = float(get_profile_goals(cursor).get("weekly_goal_hours") or 0)
        weeks = {}
        for d, minutes in daily.items():
            key = d.isocalendar()[:2]
            weeks[key] = weeks.get(key, 0) + minutes
        best_week_hours = round(max(weeks.values()) / 60, 2) if weeks else 0.0

        total_hours = round(sum(daily.values()) / 60, 2)
        longest_streak, current_streak = longest_and_current_streak(daily.keys(), today)

        definitions = [
            ("first_session", "First Step", "Log your first study session", "🚀", session_count, 1),
            ("sessions_25", "Dedicated Learner", "Log 25 study sessions", "📚", session_count, 25),
            ("hours_10", "10 Hour Club", "Study for 10 hours in total", "⏱️", total_hours, 10),
            ("hours_50", "Half Century", "Study for 50 hours in total", "🏅", total_hours, 50),
            ("hours_100", "Centurion", "Study for 100 hours in total", "🏆", total_hours, 100),
            ("streak_3", "On a Roll", "Study 3 days in a row", "🔥", longest_streak, 3),
            ("streak_7", "Week Warrior", "Study 7 days in a row", "⚡", longest_streak, 7),
            ("streak_30", "Unstoppable", "Study 30 days in a row", "👑", longest_streak, 30),
            ("weekly_goal", "Goal Getter", "Reach your weekly study goal", "🎯",
             best_week_hours, weekly_goal if weekly_goal > 0 else 1),
            ("pomodoro_10", "Focus Master", "Complete 10 Pomodoro focus blocks", "🍅", pomodoro_count, 10),
            ("first_habit", "Habit Starter", "Complete a habit for the first time", "✅", habits_completed, 1),
            ("perfect_day", "Perfect Day", "Complete all active habits in one day", "🌟",
             best_habit_day, active_habits if active_habits > 0 else 1),
            ("first_task", "Planner Pro", "Complete a task from your study planner", "📝", tasks_completed, 1),
        ]

        badges = []
        for badge_id, name, description, icon, value, target in definitions:
            badges.append({
                "id": badge_id,
                "name": name,
                "description": description,
                "icon": icon,
                "progress": min(value, target),
                "target": target,
                "earned": value >= target,
            })

        return jsonify({
            "earned_count": sum(1 for b in badges if b["earned"]),
            "total_count": len(badges),
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "badges": badges,
        })
    finally:
        cursor.close()
        connection.close()


# ==========================================
# SUBJECT BALANCE ANALYZER API
# ==========================================

BALANCE_STALE_DAYS = 7
BALANCE_EXAM_WINDOW_DAYS = 14


@app.route("/api/subject-balance", methods=["GET"])
@login_required
def get_subject_balance():
    today, error = get_today()
    if error:
        return error
    days = parse_positive_int(request.args.get("days", 30))
    if days is None or days > 365:
        return jsonify({"error": "days must be a whole number between 1 and 365."}), 400
    start = today - datetime.timedelta(days=days - 1)

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT s.subject_id, s.subject_name,
                   COALESCE(SUM(CASE WHEN ss.study_date BETWEEN %s AND %s
                                     THEN ss.duration_minutes END), 0) AS minutes,
                   MAX(CASE WHEN ss.study_date <= %s THEN ss.study_date END) AS last_studied
            FROM Subjects AS s
            LEFT JOIN Study_Sessions AS ss ON ss.subject_id = s.subject_id
            GROUP BY s.subject_id, s.subject_name
            ORDER BY s.subject_name
            """,
            (start, today, today)
        )
        subjects = cursor.fetchall()

        cursor.execute(
            """
            SELECT subject_id, COUNT(*) AS pending FROM Study_Tasks
            WHERE status = 'Pending' AND subject_id IS NOT NULL GROUP BY subject_id
            """
        )
        pending = {row["subject_id"]: row["pending"] for row in cursor.fetchall()}

        cursor.execute(
            """
            SELECT subject_id, MIN(exam_date) AS next_exam FROM Exams
            WHERE exam_date >= %s AND subject_id IS NOT NULL GROUP BY subject_id
            """,
            (today,)
        )
        exams = {row["subject_id"]: row["next_exam"] for row in cursor.fetchall()}
    finally:
        cursor.close()
        connection.close()

    count = len(subjects)
    total = sum(int(s["minutes"]) for s in subjects)
    fair_share = round(100 / count, 1) if count else 0.0

    results = []
    for s in subjects:
        minutes = int(s["minutes"])
        share = round(minutes * 100 / total, 1) if total else 0.0
        last = s["last_studied"]
        days_since = (today - last).days if last else None
        pending_tasks = int(pending.get(s["subject_id"], 0))
        next_exam = exams.get(s["subject_id"])
        exam_days = (next_exam - today).days if next_exam else None

        reasons = []
        score = 0.0
        if exam_days is not None and exam_days <= BALANCE_EXAM_WINDOW_DAYS and pending_tasks:
            reasons.append(f"Exam in {exam_days} day{'s' if exam_days != 1 else ''} "
                           f"with {pending_tasks} topic{'s' if pending_tasks != 1 else ''} pending")
            score += 100 - exam_days * 5
        if minutes == 0:
            reasons.append(f"No study time in the last {days} days")
            score += 40
        elif count > 1 and share < fair_share / 2:
            reasons.append(f"Only {share:g}% of your study time (fair share is {fair_share:g}%)")
            score += fair_share - share
        if days_since is None:
            reasons.append("Never studied yet")
            score += 30
        elif days_since >= BALANCE_STALE_DAYS:
            reasons.append(f"Not studied for {days_since} days")
            score += min(days_since, 60)

        if reasons:
            status = "needs_attention"
        elif count > 1 and share > fair_share * 1.75:
            status = "dominant"
        else:
            status = "balanced"

        results.append({
            "subject_id": s["subject_id"],
            "subject_name": s["subject_name"],
            "minutes": minutes,
            "hours": round(minutes / 60, 2),
            "share_percentage": share,
            "last_studied": last.isoformat() if last else None,
            "days_since_studied": days_since,
            "pending_tasks": pending_tasks,
            "next_exam_date": next_exam.isoformat() if next_exam else None,
            "next_exam_days": exam_days,
            "status": status,
            "reasons": reasons,
            "attention_score": round(score, 1),
        })

    results.sort(key=lambda r: (-r["attention_score"], -r["minutes"], r["subject_name"]))
    attention = [r for r in results if r["status"] == "needs_attention"]
    if not results:
        summary = "Add subjects to see how your study time is balanced."
    elif not attention:
        summary = f"Your study time is well balanced across your subjects over the last {days} days."
    else:
        summary = f"Give {attention[0]['subject_name']} some time next: {attention[0]['reasons'][0].lower()}."

    return jsonify({
        "days": days,
        "start_date": start.isoformat(),
        "end_date": today.isoformat(),
        "total_minutes": total,
        "fair_share_percentage": fair_share,
        "needs_attention_count": len(attention),
        "summary": summary,
        "subjects": results,
    })


# ==========================================
# CSV DATA EXPORT API
# ==========================================

EXPORTS = {
    "study-sessions": (
        ["Session ID", "Date", "Start Time", "Subject", "Topic", "Duration (min)", "Duration (hrs)", "Notes"],
        """
        SELECT ss.session_id, ss.study_date, ss.start_time, s.subject_name, ss.topic,
               ss.duration_minutes, ROUND(ss.duration_minutes / 60, 2), ss.notes
        FROM Study_Sessions ss JOIN Subjects s ON s.subject_id = ss.subject_id
        ORDER BY ss.study_date DESC, ss.session_id DESC
        """,
    ),
    "habit-logs": (
        ["Log ID", "Date", "Habit", "Completed", "Notes"],
        """
        SELECT hl.log_id, hl.log_date, h.habit_name,
               CASE WHEN hl.completed = 1 THEN 'Yes' ELSE 'No' END, hl.notes
        FROM Habit_Logs hl JOIN Habits h ON h.habit_id = hl.habit_id
        ORDER BY hl.log_date DESC, hl.log_id DESC
        """,
    ),
    "habit-logs-past-month": (
        ["Log ID", "Date", "Day of Week", "Habit ID", "Habit Name", "Frequency", "Completed", "Notes"],
        """
        SELECT hl.log_id, hl.log_date, DAYNAME(hl.log_date), h.habit_id, h.habit_name, h.frequency,
               CASE WHEN hl.completed = 1 THEN 'Yes' ELSE 'No' END, hl.notes
        FROM Habit_Logs hl
        JOIN Habits h ON hl.habit_id = h.habit_id
        WHERE hl.log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ORDER BY hl.log_date DESC, h.habit_name ASC
        """,
    ),
    "habit-consistency-monthly": (
        ["Date", "Day of Week", "Total Active Habits", "Completed Habits", "Completion Rate (%)", "Consistency Rating"],
        """
        SELECT
            hl.log_date,
            DAYNAME(hl.log_date) AS day_name,
            COUNT(DISTINCT h.habit_id) AS total_active,
            SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END) AS completed_count,
            ROUND(SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(DISTINCT h.habit_id), 0), 1) AS completion_pct,
            CASE
                WHEN SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(DISTINCT h.habit_id), 0) >= 80 THEN 'High (Exemplary)'
                WHEN SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(DISTINCT h.habit_id), 0) >= 50 THEN 'Moderate (Consistent)'
                ELSE 'Low (Needs Acceleration)'
            END AS consistency_rating
        FROM Habit_Logs hl
        JOIN Habits h ON hl.habit_id = h.habit_id AND h.is_active = 1
        WHERE hl.log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY hl.log_date
        ORDER BY hl.log_date DESC
        """,
    ),
    "tasks": (
        ["Task ID", "Title", "Subject", "Due Date", "Priority", "Status", "Completed At", "Description"],
        """
        SELECT t.task_id, t.title, s.subject_name, t.due_date, t.priority, t.status,
               t.completed_at, t.description
        FROM Study_Tasks t LEFT JOIN Subjects s ON s.subject_id = t.subject_id
        ORDER BY t.task_id
        """,
    ),
    "notes": (
        ["Note ID", "Title", "Subject", "Tags", "Pinned", "Created At", "Updated At", "Content"],
        """
        SELECT n.note_id, n.title, s.subject_name, n.tags,
               CASE WHEN n.is_pinned = 1 THEN 'Yes' ELSE 'No' END,
               n.created_at, n.updated_at, n.content
        FROM Notes n LEFT JOIN Subjects s ON s.subject_id = n.subject_id
        ORDER BY n.is_pinned DESC, n.updated_at DESC, n.note_id DESC
        """,
    ),
    "flashcards": (
        ["Flashcard ID", "Deck Name", "Subject", "Question", "Answer", "Hint", "Mastery Level", "Times Reviewed", "Last Reviewed At"],
        """
        SELECT f.flashcard_id, f.deck_name, s.subject_name, f.question, f.answer,
               f.hint, f.mastery_level, f.times_reviewed, f.last_reviewed_at
        FROM Flashcards f LEFT JOIN Subjects s ON s.subject_id = f.subject_id
        ORDER BY f.deck_name ASC, f.flashcard_id ASC
        """,
    ),
}


@app.route("/api/export/<dataset>.csv", methods=["GET"])
@login_required
def export_csv(dataset):
    # Support query parameter range=past-month for habit-logs
    if dataset == "habit-logs" and request.args.get("range") in ("past-month", "month", "30d"):
        dataset = "habit-logs-past-month"

    if dataset not in EXPORTS:
        return jsonify({"error": f"Unknown export. Choose one of: {', '.join(EXPORTS)}."}), 404

    headers, query = EXPORTS[dataset]
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
    finally:
        cursor.close()
        connection.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([
            format_time_value(v) if isinstance(v, datetime.timedelta)
            else v.isoformat(sep=" ") if isinstance(v, datetime.datetime)
            else v.isoformat() if isinstance(v, datetime.date)
            else "" if v is None
            else v
            for v in row
        ])

    filename = f"trackmate_{dataset.replace('-', '_')}_{datetime.date.today().isoformat()}.csv"
    # UTF-8 BOM so Excel opens non-ASCII text correctly
    return Response(
        "\ufeff" + output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ==========================================
# USER PROFILE & SETTINGS API
# ==========================================

@app.route("/api/profile", methods=["GET"])
@login_required
def get_profile():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM user_profile WHERE user_id = %s", (session.get("user_id"),))
        profile = cursor.fetchone()
        if not profile:
            # Create default
            cursor.execute("""
                INSERT INTO user_profile (id, full_name, email, college, major, semester, daily_goal_hours, weekly_goal_hours, theme)
                VALUES (1, 'Alex Morgan', 'alex.morgan@university.edu', 'Faculty of Engineering & Technology', 'Computer Science', 'Semester 5', 4.0, 25.0, 'dark')
            """)
            connection.commit()
            cursor.execute("SELECT * FROM user_profile WHERE user_id = %s", (session.get("user_id"),))
            profile = cursor.fetchone()

        if isinstance(profile.get("daily_goal_hours"), Decimal):
            profile["daily_goal_hours"] = float(profile["daily_goal_hours"])
        if isinstance(profile.get("weekly_goal_hours"), Decimal):
            profile["weekly_goal_hours"] = float(profile["weekly_goal_hours"])
        for key in ("created_at", "semester_start", "semester_end"):
            if isinstance(profile.get(key), (datetime.date, datetime.datetime)):
                profile[key] = profile[key].isoformat()

        return jsonify(profile)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()


@app.route("/api/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please provide valid JSON data."}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        full_name = data.get("full_name", "Alex Morgan").strip()
        email = data.get("email", "").strip()
        college = data.get("college", "").strip()
        major = data.get("major", "").strip()
        semester = data.get("semester", "").strip()
        daily_goal_hours = float(data.get("daily_goal_hours", 4.0))
        weekly_goal_hours = float(data.get("weekly_goal_hours", 25.0))
        theme = data.get("theme", "dark")

        semester_updates = {}
        if "semester_goal_hours" in data:
            semester_goal = float(data["semester_goal_hours"])
            if semester_goal <= 0:
                return jsonify({"error": "Semester goal must be greater than 0 hours."}), 400
            semester_updates["semester_goal_hours"] = semester_goal
        for key in ("semester_start", "semester_end"):
            if key in data:
                if data[key] in (None, ""):
                    semester_updates[key] = None
                else:
                    semester_updates[key] = parse_date(data[key])
                    if semester_updates[key] is None:
                        return jsonify({"error": f"{key} must be in YYYY-MM-DD format."}), 400
        if (semester_updates.get("semester_start") and semester_updates.get("semester_end")
                and semester_updates["semester_end"] < semester_updates["semester_start"]):
            return jsonify({"error": "Semester end date must be after the start date."}), 400

        cursor.execute(
            """
            UPDATE user_profile
            SET full_name = %s, email = %s, college = %s, major = %s, semester = %s,
                daily_goal_hours = %s, weekly_goal_hours = %s, theme = %s
            WHERE user_id = %s
            """,
            (full_name, email, college, major, semester, daily_goal_hours, weekly_goal_hours, theme)
        )
        if semester_updates:
            assignments = ", ".join(f"{column} = %s" for column in semester_updates)
            cursor.execute(f"UPDATE user_profile SET {assignments} WHERE user_id = %s", tuple(semester_updates.values()))
        connection.commit()
        return jsonify({"message": "Profile updated successfully!"}), 200

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 400

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    app.run(debug=True)
