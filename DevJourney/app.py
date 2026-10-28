from flask import Flask, request, jsonify, send_file, session
import psycopg2
import psycopg2.extras
import bcrypt
from flask_cors import CORS
from dotenv import load_dotenv
import os
import re
import datetime

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'devjourney_secure_key_2026')
CORS(app, supports_credentials=True)

def get_db_connection():
    """Create and return a PostgreSQL database connection using environment variables."""
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 5432)),
        database=os.getenv('DB_NAME', 'dev_journey').strip(),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD')
    )
    return conn

def get_authenticated_user_id():
    """
    Returns the authenticated user_id using the trusted server-side session.
    If session is not set (e.g. cross-origin API call without cookies),
    falls back to verifying the user_id provided in the request against the database.
    """
    if 'user_id' in session and session['user_id']:
        return int(session['user_id'])
    
    # Fallback to request user_id parameter if valid integer
    uid = request.args.get('user_id')
    if uid is None and request.is_json:
        uid = (request.get_json(silent=True) or {}).get('user_id')
    
    if uid is not None:
        try:
            return int(uid)
        except (ValueError, TypeError):
            return None
    return None

def calculate_user_activity_metrics(cur, user_id):
    """
    Calculates streak and activity analytics for a user from real PostgreSQL activity records.
    - Current streak: Consecutive active days ending today or yesterday.
    - Longest streak: Maximum consecutive active days ever.
    - Active days: Distinct active dates in the last 90 calendar days.
    - Consistency percentage: active_days_90 / 90 * 100.
    """
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    start_90 = today - datetime.timedelta(days=89)

    # Fetch all distinct dates of activity for this user
    cur.execute("""
        SELECT DISTINCT DATE(completed_at)
        FROM activity
        WHERE user_id = %s
        ORDER BY DATE(completed_at) DESC;
    """, (user_id,))
    active_dates = [r[0] for r in cur.fetchall()]
    active_set = set(active_dates)

    # Current streak
    current_streak = 0
    if today in active_set:
        curr = today
        while curr in active_set:
            current_streak += 1
            curr -= datetime.timedelta(days=1)
    elif yesterday in active_set:
        curr = yesterday
        while curr in active_set:
            current_streak += 1
            curr -= datetime.timedelta(days=1)

    # Longest streak
    sorted_dates = sorted(active_set)
    longest_streak = 0
    curr_run = 0
    prev_d = None
    for d in sorted_dates:
        if prev_d is not None and (d - prev_d).days == 1:
            curr_run += 1
        else:
            curr_run = 1
        if curr_run > longest_streak:
            longest_streak = curr_run
        prev_d = d

    longest_streak = max(longest_streak, current_streak)

    # Active days in last 90 days & consistency
    active_days_90 = sum(1 for d in active_set if start_90 <= d <= today)
    consistency_pct = round((active_days_90 / 90.0) * 100, 1)

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "active_days_90": active_days_90,
        "consistency_pct": consistency_pct
    }

# Starter topics and problems seeded automatically for newly registered users
STARTER_TOPICS = [
    {
        "topic_name": "Arrays",
        "problems": [
            {"name": "Two Sum", "difficulty": "Easy", "link": "https://leetcode.com/problems/two-sum/"},
            {"name": "Best Time to Buy/Sell Stock", "difficulty": "Easy", "link": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"},
            {"name": "Product of Array Except Self", "difficulty": "Medium", "link": "https://leetcode.com/problems/product-of-array-except-self/"}
        ]
    },
    {
        "topic_name": "Binary Search",
        "problems": [
            {"name": "Binary Search", "difficulty": "Easy", "link": "https://leetcode.com/problems/binary-search/"},
            {"name": "Search in Rotated Sorted Array", "difficulty": "Medium", "link": "https://leetcode.com/problems/search-in-rotated-sorted-array/"},
            {"name": "Median of Two Sorted Arrays", "difficulty": "Hard", "link": "https://leetcode.com/problems/median-of-two-sorted-arrays/"}
        ]
    },
    {
        "topic_name": "Linked List",
        "problems": [
            {"name": "Reverse Linked List", "difficulty": "Easy", "link": "https://leetcode.com/problems/reverse-linked-list/"},
            {"name": "Merge Two Sorted Lists", "difficulty": "Easy", "link": "https://leetcode.com/problems/merge-two-sorted-lists/"}
        ]
    }
]

def seed_starter_topics_for_user(cur, user_id):
    """Seed initial topics and problems for a newly registered user."""
    for topic_info in STARTER_TOPICS:
        cur.execute(
            "INSERT INTO dsa_topics (user_id, topic_name, total_problems, solved_count) VALUES (%s, %s, %s, 0) RETURNING id",
            (user_id, topic_info["topic_name"], len(topic_info["problems"]))
        )
        topic_id = cur.fetchone()[0]
        for prob in topic_info["problems"]:
            cur.execute(
                "INSERT INTO dsa_problems (topic_id, problem_name, difficulty, leetcode_link, is_solved) VALUES (%s, %s, %s, %s, FALSE)",
                (topic_id, prob["name"], prob["difficulty"], prob["link"])
            )

STARTER_PROJECTS = [
    {
        "title": "Expense Tracker",
        "description": "CRUD app for logging and visualizing monthly expenses.",
        "tech_stack": "React, Express",
        "status": "completed",
        "progress": 100
    },
    {
        "title": "AI Study Planner",
        "description": "Generates a weekly study plan based on your goals.",
        "tech_stack": "Node, MySQL",
        "status": "in progress",
        "progress": 55
    },
    {
        "title": "Portfolio v2",
        "description": "Redesign of personal portfolio with case studies.",
        "tech_stack": "Next.js",
        "status": "planned",
        "progress": 5
    }
]

def seed_starter_projects_for_user(cur, user_id):
    """Seed initial projects for a newly registered user."""
    for proj in STARTER_PROJECTS:
        cur.execute(
            """INSERT INTO projects (user_id, title, description, tech_stack, status, progress)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (user_id, proj["title"], proj["description"], proj["tech_stack"], proj["status"], proj["progress"])
        )

STARTER_GOALS = [
    {
        "title": "Solve 20 questions",
        "current_count": 14,
        "target_count": 20,
        "timeframe": "this week · 4 days left"
    },
    {
        "title": "Finish Linked List topic",
        "current_count": 0,
        "target_count": 1,
        "timeframe": "this week · 4 days left"
    },
    {
        "title": "Code 5 days this week",
        "current_count": 4,
        "target_count": 5,
        "timeframe": "this week · 4 days left"
    }
]

def seed_starter_goals_for_user(cur, user_id):
    """Seed initial goals for a newly registered user."""
    for goal in STARTER_GOALS:
        cur.execute(
            """INSERT INTO goals (user_id, title, current_count, target_count, timeframe, is_completed)
               VALUES (%s, %s, %s, %s, %s, FALSE)""",
            (user_id, goal["title"], goal["current_count"], goal["target_count"], goal["timeframe"])
        )

@app.route('/')
def home():
    return send_file('devjourney-interface.html')

# ============================================================================
# 1. USER & AUTH CRUD
# ============================================================================

# CREATE: User signup
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if email is already taken
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            return jsonify({"message": "An account with this email already exists"}), 409

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        cur.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
            (name, email, password_hash)
        )
        user_id = cur.fetchone()[0]

        # Seed starter topics & problems so new user can immediately use the tracker
        seed_starter_topics_for_user(cur, user_id)
        # Seed starter projects so user sees active projects
        seed_starter_projects_for_user(cur, user_id)
        # Seed starter goals so user sees active goals
        seed_starter_goals_for_user(cur, user_id)

        conn.commit()
        cur.close()

        session['user_id'] = user_id
        session['user_email'] = email

        return jsonify({"message": "Signup successful", "user_id": user_id}), 201

    except psycopg2.OperationalError as e:
        return jsonify({"message": "Database connection error", "error": str(e)}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error registering user", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: User login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, password_hash, github_username FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()

        if user is None:
            return jsonify({"message": "Invalid email or password"}), 401

        user_id, name, stored_hash, github_username = user

        if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
            session['user_id'] = user_id
            session['user_email'] = email
            return jsonify({
                "message": "Login successfully",
                "user_id": user_id,
                "name": name,
                "email": email,
                "github_username": github_username or ""
            }), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401

    except psycopg2.OperationalError as e:
        return jsonify({"message": "Database connection error", "error": str(e)}), 500
    except Exception as e:
        return jsonify({"message": "Error logging in", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# LOGOUT: User logout
@app.route('/api/logout', methods=['POST'])
def logout_api():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

# READ: Get all users (demonstration/admin inspection)
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, github_username, created_at FROM users ORDER BY id ASC")
        rows = cur.fetchall()
        cur.close()

        users = []
        for r in rows:
            users.append({
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "github_username": r[3] or "",
                "created_at": r[4].isoformat() if r[4] else None
            })
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"message": "Error fetching users", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get single user profile
@app.route('/api/users/<int:user_id>', methods=['GET'])
@app.route('/api/profile', methods=['GET'])
def get_user_profile(user_id=None):
    if user_id is None:
        user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, github_username, created_at FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()

        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "github_username": user[3] or "",
            "created_at": user[4].isoformat() if user[4] else None
        }), 200
    except Exception as e:
        return jsonify({"message": "Error fetching profile", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# UPDATE: Update user profile
@app.route('/api/users/<int:user_id>', methods=['PUT'])
@app.route('/api/profile', methods=['PUT'])
def update_user_profile(user_id=None):
    data = request.get_json() or {}
    if user_id is None:
        user_id = data.get('user_id') or request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    name = data.get('name')
    github_username = data.get('github_username')

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, name, email, github_username FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        if not user:
            cur.close()
            return jsonify({"message": "User not found"}), 404

        new_name = name.strip() if name is not None else user[1]
        new_gh = github_username.strip() if github_username is not None else (user[3] or "")

        cur.execute(
            "UPDATE users SET name = %s, github_username = %s WHERE id = %s RETURNING id, name, email, github_username",
            (new_name, new_gh, user_id)
        )
        updated = cur.fetchone()
        conn.commit()
        cur.close()

        return jsonify({
            "message": "User updated successfully",
            "user": {
                "id": updated[0],
                "name": updated[1],
                "email": updated[2],
                "github_username": updated[3]
            }
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error updating profile", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# DELETE: Delete user (cascades to topics, problems, and activity)
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        deleted = cur.fetchone()
        if not deleted:
            cur.close()
            return jsonify({"message": "User not found"}), 404

        conn.commit()
        cur.close()
        return jsonify({"message": "User and associated data deleted successfully", "deleted_user_id": user_id}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error deleting user", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================
# 2. TOPICS CRUD
# ============================================================================

# CREATE: Add topic
@app.route('/api/topics', methods=['POST'])
def create_topic():
    data = request.get_json() or {}
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    topic_name = (data.get('topic_name') or '').strip()
    if not topic_name:
        return jsonify({"message": "topic_name is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verify user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (auth_user_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"message": "User not found"}), 404

        cur.execute(
            """
            INSERT INTO dsa_topics (user_id, topic_name, total_problems, solved_count)
            VALUES (%s, %s, 0, 0)
            RETURNING id, topic_name, total_problems, solved_count
            """,
            (auth_user_id, topic_name)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()

        return jsonify({
            "message": "Topic created successfully",
            "topic": {
                "id": row[0],
                "topic_name": row[1],
                "total_problems": row[2],
                "topic_problem": row[2],
                "solved_count": row[3]
            }
        }), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error creating topic", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get topics for a user
@app.route('/api/topics', methods=['GET'])
def get_topics():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, topic_name, total_problems, solved_count
            FROM dsa_topics
            WHERE user_id = %s
            ORDER BY id ASC
            """,
            (auth_user_id,)
        )
        topics = cur.fetchall()
        cur.close()

        result = []
        for t in topics:
            result.append({
                "id": t[0],
                "topic_name": t[1],
                "total_problems": t[2],
                "topic_problem": t[2],  # Backwards compatibility with existing frontend
                "solved_count": t[3],
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Error fetching topics", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get single topic
@app.route('/api/topics/<int:topic_id>', methods=['GET'])
def get_topic_detail(topic_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, user_id, topic_name, total_problems, solved_count FROM dsa_topics WHERE id = %s",
            (topic_id,)
        )
        t = cur.fetchone()
        cur.close()

        if not t:
            return jsonify({"message": "Topic not found"}), 404

        return jsonify({
            "id": t[0],
            "user_id": t[1],
            "topic_name": t[2],
            "total_problems": t[3],
            "topic_problem": t[3],
            "solved_count": t[4]
        }), 200
    except Exception as e:
        return jsonify({"message": "Error fetching topic", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# UPDATE: Update topic name
@app.route('/api/topics/<int:topic_id>', methods=['PUT'])
def update_topic(topic_id):
    data = request.get_json() or {}
    topic_name = (data.get('topic_name') or '').strip()

    if not topic_name:
        return jsonify({"message": "topic_name is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE dsa_topics SET topic_name = %s WHERE id = %s RETURNING id, topic_name, total_problems, solved_count",
            (topic_name, topic_id)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"message": "Topic not found"}), 404

        conn.commit()
        cur.close()
        return jsonify({
            "message": "Topic updated successfully",
            "topic": {
                "id": row[0],
                "topic_name": row[1],
                "total_problems": row[2],
                "topic_problem": row[2],
                "solved_count": row[3]
            }
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error updating topic", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# DELETE: Delete topic (cascades to all its problems)
@app.route('/api/topics/<int:topic_id>', methods=['DELETE'])
def delete_topic(topic_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT user_id FROM dsa_topics WHERE id = %s", (topic_id,))
        topic_row = cur.fetchone()
        if not topic_row:
            cur.close()
            return jsonify({"message": "Topic not found"}), 404

        if topic_row[0] != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this topic"}), 403

        cur.execute("DELETE FROM activity WHERE problem_id IN (SELECT id FROM dsa_problems WHERE topic_id = %s)", (topic_id,))
        cur.execute("DELETE FROM dsa_topics WHERE id = %s RETURNING id", (topic_id,))
        deleted = cur.fetchone()

        conn.commit()
        cur.close()
        return jsonify({"message": "Topic and associated problems deleted successfully", "deleted_topic_id": topic_id}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error deleting topic", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================
# 3. PROBLEMS CRUD
# ============================================================================

# CREATE: Add problem to topic
@app.route('/api/topics/<int:topic_id>/problems', methods=['POST'])
@app.route('/api/problems', methods=['POST'])
def create_problem(topic_id=None):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    data = request.get_json() or {}
    if topic_id is None:
        topic_id = data.get('topic_id')

    if not topic_id:
        return jsonify({"message": "topic_id is required"}), 400

    problem_name = (data.get('problem_name') or '').strip()
    difficulty = (data.get('difficulty') or 'Easy').strip().capitalize()
    leetcode_link = (data.get('leetcode_link') or data.get('leetcode_url') or '').strip()

    if not problem_name:
        return jsonify({"message": "problem_name is required"}), 400

    if difficulty not in ['Easy', 'Medium', 'Hard']:
        difficulty = 'Easy'

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if topic exists and belongs to auth_user_id
        cur.execute("SELECT id, user_id FROM dsa_topics WHERE id = %s", (topic_id,))
        topic_row = cur.fetchone()
        if not topic_row:
            cur.close()
            return jsonify({"message": "Topic not found"}), 404

        if topic_row[1] != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this topic"}), 403

        cur.execute(
            """
            INSERT INTO dsa_problems (topic_id, problem_name, difficulty, leetcode_link, is_solved)
            VALUES (%s, %s, %s, %s, FALSE)
            RETURNING id, topic_id, problem_name, difficulty, leetcode_link, is_solved
            """,
            (topic_id, problem_name, difficulty, leetcode_link)
        )
        row = cur.fetchone()

        # Accurately update parent topic total_problems
        cur.execute("UPDATE dsa_topics SET total_problems = (SELECT COUNT(*) FROM dsa_problems WHERE topic_id = %s) WHERE id = %s", (topic_id, topic_id))

        conn.commit()
        cur.close()

        return jsonify({
            "message": "Problem added successfully",
            "problem": {
                "id": row[0],
                "topic_id": row[1],
                "problem_name": row[2],
                "difficulty": row[3],
                "leetcode_link": row[4],
                "leetcode_url": row[4],
                "is_solved": row[5]
            }
        }), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error adding problem", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get all problems for a topic
@app.route('/api/topics/<int:topic_id>/problems', methods=['GET'])
def get_problems(topic_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, problem_name, difficulty, leetcode_link, is_solved
            FROM dsa_problems
            WHERE topic_id = %s
            ORDER BY id ASC
            """,
            (topic_id,)
        )
        problems = cur.fetchall()
        cur.close()

        result = []
        for p in problems:
            result.append({
                "id": p[0],
                "problem_name": p[1],
                "difficulty": p[2] or "Easy",
                "leetcode_link": p[3] or "",
                "leetcode_url": p[3] or "",  # Compatibility with frontend property name
                "is_solved": p[4]
            })

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Error fetching problems", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get all problems for a user across all topics (Demonstrates SQL JOIN)
@app.route('/api/user-problems', methods=['GET'])
def get_user_problems():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id parameter is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.id, p.topic_id, t.topic_name, p.problem_name, p.difficulty, p.leetcode_link, p.is_solved
            FROM dsa_problems p
            JOIN dsa_topics t ON p.topic_id = t.id
            WHERE t.user_id = %s
            ORDER BY p.id ASC
            """,
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()

        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "topic_id": r[1],
                "topic_name": r[2],
                "problem_name": r[3],
                "difficulty": r[4] or "Easy",
                "leetcode_link": r[5] or "",
                "leetcode_url": r[5] or "",
                "is_solved": r[6]
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Error fetching user problems", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get single problem by id
@app.route('/api/problems/<int:problem_id>', methods=['GET'])
def get_single_problem(problem_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, topic_id, problem_name, difficulty, leetcode_link, is_solved FROM dsa_problems WHERE id = %s",
            (problem_id,)
        )
        p = cur.fetchone()
        cur.close()

        if not p:
            return jsonify({"message": "Problem not found"}), 404

        return jsonify({
            "id": p[0],
            "topic_id": p[1],
            "problem_name": p[2],
            "difficulty": p[3] or "Easy",
            "leetcode_link": p[4] or "",
            "leetcode_url": p[4] or "",
            "is_solved": p[5]
        }), 200
    except Exception as e:
        return jsonify({"message": "Error fetching problem", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# UPDATE: Edit problem details
@app.route('/api/problems/<int:problem_id>', methods=['PUT'])
def update_problem(problem_id):
    data = request.get_json() or {}
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT id, topic_id, problem_name, difficulty, leetcode_link, is_solved FROM dsa_problems WHERE id = %s",
            (problem_id,)
        )
        existing = cur.fetchone()
        if not existing:
            cur.close()
            return jsonify({"message": "Problem not found"}), 404

        problem_name = data.get('problem_name', existing[2])
        difficulty = data.get('difficulty', existing[3])
        leetcode_link = data.get('leetcode_link', data.get('leetcode_url', existing[4]))

        cur.execute(
            """
            UPDATE dsa_problems
            SET problem_name = %s, difficulty = %s, leetcode_link = %s
            WHERE id = %s
            RETURNING id, topic_id, problem_name, difficulty, leetcode_link, is_solved
            """,
            (problem_name, difficulty, leetcode_link, problem_id)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()

        return jsonify({
            "message": "Problem updated successfully",
            "problem": {
                "id": row[0],
                "topic_id": row[1],
                "problem_name": row[2],
                "difficulty": row[3],
                "leetcode_link": row[4],
                "leetcode_url": row[4],
                "is_solved": row[5]
            }
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error updating problem", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# UPDATE: Toggle problem completion (solves if unsolved, un-solves if already solved)
# Supports both /complete and /toggle for full flexibility with frontend
@app.route('/api/problems/<int:problem_id>/complete', methods=['POST'])
@app.route('/api/problems/<int:problem_id>/toggle', methods=['POST'])
def toggle_problem_completion(problem_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT p.topic_id, p.is_solved, t.user_id
            FROM dsa_problems p
            JOIN dsa_topics t ON p.topic_id = t.id
            WHERE p.id = %s
        """, (problem_id,))
        problem = cur.fetchone()

        if problem is None:
            cur.close()
            return jsonify({"message": "Problem not found"}), 404

        topic_id, is_solved, owner_id = problem
        if owner_id != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: Problem belongs to another user"}), 403

        if is_solved:
            # Un-mark complete
            cur.execute("UPDATE dsa_problems SET is_solved = FALSE WHERE id = %s", (problem_id,))
            cur.execute("DELETE FROM activity WHERE user_id = %s AND problem_id = %s", (auth_user_id, problem_id))
            cur.execute("""
                UPDATE dsa_topics 
                SET solved_count = (SELECT COUNT(*) FROM dsa_problems WHERE topic_id = %s AND is_solved = TRUE)
                WHERE id = %s
            """, (topic_id, topic_id))
            conn.commit()
            cur.close()
            return jsonify({
                "message": "Problem marked incomplete",
                "is_solved": False,
                "problem_id": problem_id,
                "topic_id": topic_id
            }), 200
        else:
            # Mark complete
            cur.execute("UPDATE dsa_problems SET is_solved = TRUE WHERE id = %s", (problem_id,))
            # Prevent duplicate activity rows for the same problem & user
            cur.execute("SELECT id FROM activity WHERE user_id = %s AND problem_id = %s", (auth_user_id, problem_id))
            if not cur.fetchone():
                cur.execute("INSERT INTO activity (user_id, problem_id) VALUES (%s, %s)", (auth_user_id, problem_id))
            cur.execute("""
                UPDATE dsa_topics 
                SET solved_count = (SELECT COUNT(*) FROM dsa_problems WHERE topic_id = %s AND is_solved = TRUE)
                WHERE id = %s
            """, (topic_id, topic_id))
            conn.commit()
            cur.close()
            return jsonify({
                "message": "Problem marked complete",
                "is_solved": True,
                "problem_id": problem_id,
                "topic_id": topic_id
            }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error updating problem status", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# DELETE: Delete problem
@app.route('/api/problems/<int:problem_id>', methods=['DELETE'])
def delete_problem(problem_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT p.topic_id, p.is_solved, t.user_id 
            FROM dsa_problems p 
            JOIN dsa_topics t ON p.topic_id = t.id 
            WHERE p.id = %s
        """, (problem_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"message": "Problem not found"}), 404

        topic_id, was_solved, owner_id = row
        if owner_id != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this problem"}), 403

        cur.execute("DELETE FROM activity WHERE problem_id = %s", (problem_id,))
        cur.execute("DELETE FROM dsa_problems WHERE id = %s", (problem_id,))
        cur.execute("""
            UPDATE dsa_topics 
            SET total_problems = (SELECT COUNT(*) FROM dsa_problems WHERE topic_id = %s),
                solved_count = (SELECT COUNT(*) FROM dsa_problems WHERE topic_id = %s AND is_solved = TRUE)
            WHERE id = %s
        """, (topic_id, topic_id, topic_id))

        conn.commit()
        cur.close()

        return jsonify({
            "message": "Problem deleted successfully",
            "deleted_problem_id": problem_id,
            "topic_id": topic_id
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error deleting problem", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================
# 4. PROJECTS CRUD
# ============================================================================

# CREATE: Add new project
@app.route('/api/projects', methods=['POST'])
def create_project():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    tech_stack = (data.get('tech_stack') or '').strip()
    status = (data.get('status') or 'in progress').strip().lower()

    if not title:
        return jsonify({"message": "Project title is required"}), 400

    if status not in ['in progress', 'completed', 'planned']:
        status = 'in progress'

    progress = data.get('progress')
    if progress is None or progress == '':
        if status == 'completed':
            progress = 100
        elif status == 'planned':
            progress = 0
        else:
            progress = 50
    else:
        try:
            progress = max(0, min(100, int(progress)))
        except (ValueError, TypeError):
            progress = 0

    # Maintain strict consistency between status and progress
    if status == 'completed':
        progress = 100
    elif status == 'planned':
        progress = 0

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verify user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (auth_user_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"message": "User not found"}), 404

        cur.execute("""
            INSERT INTO projects (user_id, title, description, tech_stack, status, progress)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, title, description, tech_stack, status, progress, created_at;
        """, (auth_user_id, title, description, tech_stack, status, progress))

        row = cur.fetchone()
        conn.commit()
        cur.close()

        project = {
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "description": row[3],
            "tech_stack": row[4],
            "status": row[5],
            "progress": row[6],
            "created_at": row[7].isoformat() if row[7] else None
        }

        return jsonify({
            "message": "Project created successfully",
            "project": project
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error creating project", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get all projects for user
@app.route('/api/projects', methods=['GET'])
def get_projects():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, user_id, title, description, tech_stack, status, progress, created_at
            FROM projects
            WHERE user_id = %s
            ORDER BY id ASC;
        """, (auth_user_id,))
        rows = cur.fetchall()
        cur.close()

        projects = []
        for r in rows:
            projects.append({
                "id": r[0],
                "user_id": r[1],
                "title": r[2],
                "description": r[3],
                "tech_stack": r[4],
                "status": r[5],
                "progress": r[6],
                "created_at": r[7].isoformat() if r[7] else None
            })

        return jsonify(projects), 200

    except Exception as e:
        return jsonify({"message": "Error fetching projects", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get single project by ID
@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_single_project(project_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, user_id, title, description, tech_stack, status, progress, created_at
            FROM projects
            WHERE id = %s;
        """, (project_id,))
        row = cur.fetchone()
        cur.close()

        if not row:
            return jsonify({"message": "Project not found"}), 404

        if row[1] != auth_user_id:
            return jsonify({"message": "Unauthorized: You do not own this project"}), 403

        project = {
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "description": row[3],
            "tech_stack": row[4],
            "status": row[5],
            "progress": row[6],
            "created_at": row[7].isoformat() if row[7] else None
        }

        return jsonify(project), 200

    except Exception as e:
        return jsonify({"message": "Error fetching project", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# UPDATE: Update existing project (supports PUT and PATCH)
@app.route('/api/projects/<int:project_id>', methods=['PUT', 'PATCH'])
def update_project(project_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    data = request.get_json() or {}
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check existing project & ownership
        cur.execute("SELECT id, user_id, title, description, tech_stack, status, progress FROM projects WHERE id = %s", (project_id,))
        existing = cur.fetchone()
        if not existing:
            cur.close()
            return jsonify({"message": "Project not found"}), 404

        if existing[1] != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this project"}), 403

        title = data.get('title')
        if title is not None:
            title = title.strip()
            if not title:
                return jsonify({"message": "Title cannot be empty"}), 400
        else:
            title = existing[2]

        description = data.get('description', existing[3])
        if description is not None:
            description = description.strip()

        tech_stack = data.get('tech_stack', existing[4])
        if tech_stack is not None:
            tech_stack = tech_stack.strip()

        status_provided = 'status' in data and data['status'] is not None
        progress_provided = 'progress' in data and data['progress'] is not None

        if status_provided:
            status = str(data.get('status')).strip().lower()
            if status not in ['in progress', 'completed', 'planned']:
                status = existing[5]
        else:
            status = existing[5]

        if progress_provided:
            try:
                progress = max(0, min(100, int(data.get('progress'))))
            except (ValueError, TypeError):
                progress = existing[6]
        else:
            progress = existing[6]

        # Enforce progress and status consistency
        if status_provided and not progress_provided:
            if status == 'completed':
                progress = 100
            elif status == 'planned':
                progress = 0
            elif status == 'in progress' and (progress == 0 or progress == 100):
                progress = 50
        elif progress_provided and not status_provided:
            if progress == 100:
                status = 'completed'
            elif progress == 0:
                status = 'planned'
            else:
                status = 'in progress'
        else:
            # Both provided or neither provided
            if status == 'completed':
                progress = 100
            elif status == 'planned':
                progress = 0
            else: # in progress
                if progress == 100:
                    status = 'completed'
                elif progress == 0:
                    status = 'planned'

        cur.execute("""
            UPDATE projects
            SET title = %s, description = %s, tech_stack = %s, status = %s, progress = %s
            WHERE id = %s
            RETURNING id, user_id, title, description, tech_stack, status, progress, created_at;
        """, (title, description, tech_stack, status, progress, project_id))

        row = cur.fetchone()
        conn.commit()
        cur.close()

        updated_project = {
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "description": row[3],
            "tech_stack": row[4],
            "status": row[5],
            "progress": row[6],
            "created_at": row[7].isoformat() if row[7] else None
        }

        return jsonify({
            "message": "Project updated successfully",
            "project": updated_project
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error updating project", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# DELETE: Remove project
@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT user_id FROM projects WHERE id = %s", (project_id,))
        existing = cur.fetchone()

        if not existing:
            cur.close()
            return jsonify({"message": "Project not found"}), 404

        if existing[0] != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this project"}), 403

        cur.execute("DELETE FROM projects WHERE id = %s RETURNING id;", (project_id,))
        deleted = cur.fetchone()

        conn.commit()
        cur.close()

        return jsonify({
            "message": "Project deleted successfully",
            "deleted_project_id": project_id
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error deleting project", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================
# 5. GOALS CRUD
# ============================================================================

# CREATE: Add new goal
@app.route('/api/goals', methods=['POST'])
def create_goal():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    data = request.get_json() or {}
    title = (data.get('title') or data.get('goal_title') or '').strip()

    if not title:
        return jsonify({"message": "Goal title cannot be empty"}), 400

    target_count = data.get('target_count')
    if target_count is None or target_count == '':
        num_match = re.search(r'(\d+)', title)
        target_count = int(num_match.group(1)) if num_match else 1
    else:
        try:
            target_count = max(1, int(target_count))
        except (ValueError, TypeError):
            target_count = 1

    current_count = data.get('current_count', 0)
    try:
        current_count = max(0, int(current_count))
    except (ValueError, TypeError):
        current_count = 0

    # Ensure current_count does not exceed target_count
    current_count = min(target_count, current_count)

    timeframe = (data.get('timeframe') or 'this week · 4 days left').strip()
    is_completed = bool(data.get('is_completed', current_count >= target_count)) or (current_count >= target_count)

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE id = %s", (auth_user_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"message": "User not found"}), 404

        cur.execute("""
            INSERT INTO goals (user_id, title, current_count, target_count, timeframe, is_completed)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, title, current_count, target_count, timeframe, is_completed, created_at;
        """, (auth_user_id, title, current_count, target_count, timeframe, is_completed))

        row = cur.fetchone()
        conn.commit()
        cur.close()

        goal = {
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "current_count": row[3],
            "target_count": row[4],
            "timeframe": row[5],
            "is_completed": row[6],
            "created_at": row[7].isoformat() if row[7] else None
        }

        return jsonify({
            "message": "Goal created successfully",
            "goal": goal
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error creating goal", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Get all goals for user
@app.route('/api/goals', methods=['GET'])
def get_goals():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "user_id is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, user_id, title, current_count, target_count, timeframe, is_completed, created_at
            FROM goals
            WHERE user_id = %s
            ORDER BY id ASC;
        """, (auth_user_id,))
        rows = cur.fetchall()

        # NOTE: Do NOT auto-reseed on GET. Empty states must persist when deleted.
        cur.close()

        goals = []
        for r in rows:
            goals.append({
                "id": r[0],
                "user_id": r[1],
                "title": r[2],
                "current_count": r[3],
                "target_count": r[4],
                "timeframe": r[5],
                "is_completed": r[6],
                "created_at": r[7].isoformat() if r[7] else None
            })

        return jsonify(goals), 200

    except Exception as e:
        return jsonify({"message": "Error fetching goals", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# UPDATE: Update existing goal
@app.route('/api/goals/<int:goal_id>', methods=['PUT', 'PATCH'])
def update_goal(goal_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    data = request.get_json() or {}
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, user_id, title, current_count, target_count, timeframe, is_completed FROM goals WHERE id = %s", (goal_id,))
        existing = cur.fetchone()
        if not existing:
            cur.close()
            return jsonify({"message": "Goal not found"}), 404

        if existing[1] != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this goal"}), 403

        title = data.get('title') if data.get('title') is not None else data.get('goal_title')
        if title is not None:
            title = title.strip()
            if not title:
                return jsonify({"message": "Goal title cannot be empty"}), 400
        else:
            title = existing[2]

        target_count = data.get('target_count', existing[4])
        try:
            target_count = max(1, int(target_count))
        except (ValueError, TypeError):
            target_count = existing[4]

        current_count = data.get('current_count', existing[3])
        try:
            current_count = max(0, int(current_count))
        except (ValueError, TypeError):
            current_count = existing[3]

        # Clamp current_count <= target_count
        current_count = min(target_count, current_count)

        timeframe = data.get('timeframe', existing[5])
        if timeframe is not None:
            timeframe = str(timeframe).strip()

        # If data explicitly provided is_completed, use it unless current_count >= target_count forces it True
        if 'is_completed' in data:
            is_completed = bool(data['is_completed']) or (current_count >= target_count)
        else:
            is_completed = (current_count >= target_count)

        cur.execute("""
            UPDATE goals
            SET title = %s, current_count = %s, target_count = %s, timeframe = %s, is_completed = %s
            WHERE id = %s
            RETURNING id, user_id, title, current_count, target_count, timeframe, is_completed, created_at;
        """, (title, current_count, target_count, timeframe, is_completed, goal_id))

        row = cur.fetchone()
        conn.commit()
        cur.close()

        return jsonify({
            "message": "Goal updated successfully",
            "goal": {
                "id": row[0],
                "user_id": row[1],
                "title": row[2],
                "current_count": row[3],
                "target_count": row[4],
                "timeframe": row[5],
                "is_completed": row[6],
                "created_at": row[7].isoformat() if row[7] else None
            }
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error updating goal", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# DELETE: Remove goal
@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT user_id FROM goals WHERE id = %s", (goal_id,))
        existing = cur.fetchone()
        if not existing:
            cur.close()
            return jsonify({"message": "Goal not found"}), 404

        if existing[0] != auth_user_id:
            cur.close()
            return jsonify({"message": "Unauthorized: You do not own this goal"}), 403

        cur.execute("DELETE FROM goals WHERE id = %s RETURNING id;", (goal_id,))
        deleted = cur.fetchone()

        conn.commit()
        cur.close()

        return jsonify({
            "message": "Goal deleted successfully",
            "deleted_goal_id": goal_id
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": "Error deleting goal", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================================
# 6. DASHBOARD & ACTIVITY
# ============================================================================

# READ: Dashboard progress and stats (Calculated from live PostgreSQL database)
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Total Topics
        cur.execute("SELECT COUNT(*) FROM dsa_topics WHERE user_id = %s", (auth_user_id,))
        total_topics = cur.fetchone()[0]

        # Total Problems
        cur.execute("""
            SELECT COUNT(*)
            FROM dsa_problems p
            JOIN dsa_topics t ON p.topic_id = t.id
            WHERE t.user_id = %s
        """, (auth_user_id,))
        total_problems = cur.fetchone()[0]

        # Solved Problems
        cur.execute("""
            SELECT COUNT(*)
            FROM dsa_problems p
            JOIN dsa_topics t ON p.topic_id = t.id
            WHERE t.user_id = %s
            AND p.is_solved = TRUE
        """, (auth_user_id,))
        solved_problems = cur.fetchone()[0]

        # Total Projects & Completed Projects
        cur.execute("""
            SELECT COUNT(*),
                   COUNT(*) FILTER (WHERE status = 'completed' OR progress = 100)
            FROM projects
            WHERE user_id = %s
        """, (auth_user_id,))
        p_row = cur.fetchone()
        total_projects = p_row[0] if p_row else 0
        completed_projects = p_row[1] if p_row else 0

        # Total Goals & Goals Met / Completed Goals
        cur.execute("""
            SELECT COUNT(*),
                   COUNT(*) FILTER (WHERE is_completed = TRUE OR current_count >= target_count)
            FROM goals
            WHERE user_id = %s
        """, (auth_user_id,))
        g_row = cur.fetchone()
        total_goals = g_row[0] if g_row else 0
        completed_goals = g_row[1] if g_row else 0
        goals_met = completed_goals # Backward compatibility

        # Real streak & activity metrics from activity table
        metrics = calculate_user_activity_metrics(cur, auth_user_id)

        # Topic summary progress breakdown
        cur.execute("""
            SELECT id, topic_name, total_problems, solved_count
            FROM dsa_topics
            WHERE user_id = %s
            ORDER BY id ASC;
        """, (auth_user_id,))
        topic_rows = cur.fetchall()
        topics_summary = []
        for tr in topic_rows:
            tot = tr[2] or 0
            sol = tr[3] or 0
            pct = round((sol / tot * 100), 1) if tot > 0 else 0
            topics_summary.append({
                "id": tr[0],
                "topic_name": tr[1],
                "total_problems": tot,
                "solved_count": sol,
                "percentage": pct
            })

        cur.close()

        if total_problems == 0:
            progress = 0
        else:
            progress = round((solved_problems / total_problems) * 100, 2)

        return jsonify({
            "total_topics": total_topics,
            "total_problems": total_problems,
            "solved_problems": solved_problems,
            "progress": progress,
            "total_projects": total_projects,
            "completed_projects": completed_projects,
            "total_goals": total_goals,
            "completed_goals": completed_goals,
            "goals_met": goals_met,
            "current_streak": metrics["current_streak"],
            "longest_streak": metrics["longest_streak"],
            "active_days_90": metrics["active_days_90"],
            "consistency_pct": metrics["consistency_pct"],
            "topics_summary": topics_summary
        }), 200

    except Exception as e:
        return jsonify({"message": "Error calculating dashboard metrics", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Weekly activity (Monday through Sunday of current week)
@app.route('/api/weekly-activity', methods=['GET'])
def get_weekly_activity():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        today = datetime.date.today()
        # Monday of current week
        monday = today - datetime.timedelta(days=today.weekday())
        sunday = monday + datetime.timedelta(days=6)

        cur.execute("""
            SELECT DATE(completed_at), COUNT(*)
            FROM activity
            WHERE user_id = %s AND DATE(completed_at) >= %s AND DATE(completed_at) <= %s
            GROUP BY DATE(completed_at);
        """, (auth_user_id, monday, sunday))
        day_counts = {r[0]: r[1] for r in cur.fetchall()}
        cur.close()

        days_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        week_data = []
        total_week_solved = 0

        for i in range(7):
            d = monday + datetime.timedelta(days=i)
            count = day_counts.get(d, 0)
            total_week_solved += count
            week_data.append({
                "day": days_labels[i],
                "date": d.isoformat(),
                "count": count,
                "is_today": (d == today)
            })

        max_count = max([d["count"] for d in week_data] + [1])
        for item in week_data:
            if item["count"] == 0:
                item["percentage"] = 0
            else:
                item["percentage"] = max(15, round((item["count"] / max_count) * 100))

        return jsonify({
            "weekly_activity": week_data,
            "total_week_solved": total_week_solved,
            "max_daily_solved": max_count if total_week_solved > 0 else 0,
            "start_date": monday.isoformat(),
            "end_date": sunday.isoformat()
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching weekly activity", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: 90-day streak contribution grid
@app.route('/api/streak-grid', methods=['GET'])
def get_streak_grid():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        today = datetime.date.today()
        start_date = today - datetime.timedelta(days=89)

        cur.execute("""
            SELECT DATE(completed_at), COUNT(*)
            FROM activity
            WHERE user_id = %s AND DATE(completed_at) >= %s AND DATE(completed_at) <= %s
            GROUP BY DATE(completed_at);
        """, (auth_user_id, start_date, today))
        counts_by_date = {r[0]: r[1] for r in cur.fetchall()}

        metrics = calculate_user_activity_metrics(cur, auth_user_id)
        cur.close()

        grid_days = []
        for i in range(90):
            d = start_date + datetime.timedelta(days=i)
            cnt = counts_by_date.get(d, 0)
            if cnt == 0:
                lvl = 0
            elif cnt == 1:
                lvl = 1
            elif cnt == 2:
                lvl = 2
            elif cnt in [3, 4]:
                lvl = 3
            else:
                lvl = 4

            grid_days.append({
                "date": d.isoformat(),
                "count": cnt,
                "level": lvl
            })

        return jsonify({
            "grid": grid_days,
            "total_days": 90,
            "active_days_90": metrics["active_days_90"],
            "current_streak": metrics["current_streak"],
            "longest_streak": metrics["longest_streak"],
            "consistency_pct": metrics["consistency_pct"],
            "start_date": start_date.isoformat(),
            "end_date": today.isoformat()
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching streak grid", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# READ: Activity history for user
@app.route('/api/activity', methods=['GET'])
def get_activity():
    auth_user_id = get_authenticated_user_id()
    if not auth_user_id:
        return jsonify({"message": "Authentication required"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT a.id, a.completed_at, p.id, p.problem_name, p.difficulty, t.topic_name
            FROM activity a
            JOIN dsa_problems p ON a.problem_id = p.id
            JOIN dsa_topics t ON p.topic_id = t.id
            WHERE a.user_id = %s
            ORDER BY a.completed_at DESC
            LIMIT 10;
        """, (auth_user_id,))
        rows = cur.fetchall()
        cur.close()

        activities = []
        for r in rows:
            activities.append({
                "activity_id": r[0],
                "completed_at": r[1].isoformat() if r[1] else None,
                "problem_id": r[2],
                "problem_name": r[3],
                "difficulty": r[4],
                "topic_name": r[5]
            })

        return jsonify(activities), 200

    except Exception as e:
        return jsonify({"message": "Error fetching activity log", "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
