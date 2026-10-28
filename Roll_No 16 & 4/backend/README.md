# ⚙️ Backend Layer — College Management System

This directory contains the Python Flask application, business logic, authentication, database connector, and REST/HTML routing endpoints.

---

## 🛠️ Technologies Used

- **Python 3.10+**: Core programming language.
- **Flask 3.1.3**: Micro web framework for routing, session management, and rendering.
- **mysql-connector-python 8.3+**: Official MySQL driver providing parameterized queries (`%s`), stored procedure calls (`cursor.callproc`), and connection management.
- **Werkzeug 3.1.9**: Password hashing using secure scrypt algorithm (`generate_password_hash`, `check_password_hash`).
- **python-dotenv 1.0+**: Environment variable management.

---

## 📁 Directory Structure

```text
backend/
├── app.py              # Main Flask server with all routes, CRUD, and procedure calls
├── config.py           # Configuration loader reading from .env
├── test_app.py         # Automated unit test suite verifying DB, all routes, joins & procedures
├── requirements.txt    # Python dependencies
├── .env                # Local active database configuration
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # Backend documentation
```

---

## 🚀 Running the Backend

### 1. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)
Create or verify your `.env` file:
```ini
SECRET_KEY=college-mgmt-super-secret-key-2026-csbs
FLASK_DEBUG=1
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=college_management
MYSQL_USER=college_app_user
MYSQL_PASSWORD=AppUser@Pass2026
```

### 3. Run Test Suite
```powershell
python test_app.py
```

### 4. Start Flask Server
```powershell
python app.py
```
Server will be accessible at: `http://127.0.0.1:5000`

---

## 🔒 Security Implementations

1. **SQL Injection Defense**: Every single query uses parameterized placeholders (`%s`) with tuples passed to `cursor.execute(sql, params)`. No raw string concatenation.
2. **Password Security**: Passwords are never stored as plain text. Werkzeug generates cryptographic hashes with salt using `scrypt:32768:8:1`.
3. **Session Access Control**: Custom decorators `@login_required` and `@role_required(['Admin', ...])` protect sensitive routes.
4. **Least-Privilege Database Account**: Connects to MySQL using dedicated application user `college_app_user`, prohibiting `DROP` or `ALTER` table statements.
