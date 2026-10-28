# TrackMate — RESTful API Endpoint Documentation

**Base URL**: `http://127.0.0.1:5000`  
**Content-Type**: `application/json`  
**Response Format**: JSON  

---

## 0. Authentication & Session Management

All data endpoints require an authenticated student session. Requests sent without a valid session cookie receive HTTP `401 Unauthorized`.

### `POST /register`
Registers a new student account. Passwords are automatically hashed on the server using cryptographic PBKDF2:SHA256 with random per-user salt.
* **Request Body**:
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex@trackmate.edu",
    "password": "Password123",
    "confirm_password": "Password123"
  }
  ```
* **Validation Rules**:
  - Name: Required, minimum 2 characters.
  - Email: Required, valid email format, must be unique across all users.
  - Password: Required, minimum 6 characters.
  - Confirm Password: Must strictly match `password`.
* **Response (201 Created)**:
  ```json
  {
    "message": "Account created successfully! Please sign in.",
    "user_id": 2,
    "email": "alex@trackmate.edu"
  }
  ```
* **Errors**:
  - `400 Bad Request`: `{"error": "Passwords do not match."}` or `{"error": "Password must be at least 6 characters long."}`
  - `409 Conflict`: `{"error": "An account with this email address already exists."}`

### `POST /login`
Authenticates student credentials and establishes a cryptographically signed HTTP-only session.
* **Request Body**:
  ```json
  {
    "email": "alex@trackmate.edu",
    "password": "Password123"
  }
  ```
* **Security Behavior**:
  - Uses constant-time PBKDF2 hash comparison (`check_password_hash`).
  - Clears pre-existing session data (`session.clear()`) before setting new credentials to eliminate session fixation.
  - Generates secure session cookie: `HttpOnly=True`, `SameSite=Lax`.
  - Generic anti-enumeration message prevents attacker user enumeration.
* **Response (200 OK)**:
  ```json
  {
    "message": "Login successful!",
    "redirect": "/",
    "user": {
      "user_id": 1,
      "name": "Alex Morgan",
      "email": "alex@trackmate.edu"
    }
  }
  ```
* **Errors**:
  - `401 Unauthorized`: `{"error": "Invalid email or password."}` (returned identically whether email is absent or password fails)

### `POST /logout` (also `GET /logout`)
Terminates the student session and deletes the session cookie.
* **Response (200 OK for JSON)**:
  ```json
  {
    "message": "Logged out successfully.",
    "redirect": "/login"
  }
  ```
* **Browser Navigation (`GET /logout`)**: Clears session and redirects directly to `/login`.

### `GET /api/auth/me`
Retrieves identity metadata of the currently authenticated student.
* **Response (200 OK - Authenticated)**:
  ```json
  {
    "authenticated": true,
    "user": {
      "user_id": 1,
      "name": "Alex Morgan",
      "email": "alex@trackmate.edu"
    }
  }
  ```
* **Response (401 Unauthorized - Unauthenticated)**:
  ```json
  {
    "authenticated": false,
    "error": "Authentication required. Please sign in."
  }
  ```

---

## 1. System Health & Diagnostics

### `GET /api/health`
Checks backend application health and MySQL database connectivity.
* **Response (200 OK - Connected)**:
  ```json
  {
    "app": "TrackMate",
    "status": "healthy",
    "database": "connected",
    "database_name": "trackmate_db",
    "error": null
  }
  ```
* **Response (503 Service Unavailable - Disconnected)**:
  ```json
  {
    "app": "TrackMate",
    "status": "degraded",
    "database": "disconnected",
    "database_name": "trackmate_db",
    "error": "Can't connect to MySQL server on 'localhost:3306'"
  }
  ```

---

## 2. Subjects Endpoints

### `GET /api/subjects`
Retrieves all academic subjects along with session counts and aggregated hours.
* **Response (200 OK)**:
  ```json
  [
    {
      "subject_id": 1,
      "subject_name": "Database Management System",
      "session_count": 5,
      "total_minutes": 380,
      "total_hours": 6.33,
      "created_at": "2026-10-21T05:00:00"
    }
  ]
  ```

### `POST /api/subjects`
Creates a new academic subject.
* **Request Body**:
  ```json
  {
    "subject_name": "Computer Networks"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Subject created successfully!",
    "subject_id": 6,
    "subject_name": "Computer Networks"
  }
  ```
* **Errors**:
  - `400 Bad Request`: `{"error": "Subject name is required."}`
  - `409 Conflict`: `{"error": "A subject with this name already exists."}`

### `PUT /api/subjects/<int:subject_id>`
Renames an existing subject.
* **Request Body**:
  ```json
  {
    "subject_name": "Advanced Database Systems"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Subject updated successfully!",
    "subject_id": 1,
    "subject_name": "Advanced Database Systems"
  }
  ```
* **Errors**: `400 Bad Request`, `404 Not Found`, `409 Conflict`.

### `DELETE /api/subjects/<int:subject_id>`
Deletes a subject if no study sessions are linked to it.
* **Response (200 OK)**: `{"message": "Subject deleted successfully!"}`
* **Response (400 Bad Request)**: `{"error": "Cannot delete subject: 3 study session(s) are linked to it."}`

---

## 3. Study Sessions Endpoints

### `GET /api/study-sessions`
Retrieves all recorded study sessions.
* **Query Parameters (Optional)**:
  - `subject_id` (int): Filter by subject ID
  - `start_date` (YYYY-MM-DD): Filter sessions from this date
  - `end_date` (YYYY-MM-DD): Filter sessions up to this date
* **Response (200 OK)**:
  ```json
  [
    {
      "session_id": 1,
      "subject_id": 1,
      "subject_name": "Database Management System",
      "topic": "Normalization (1NF, 2NF, 3NF, BCNF)",
      "study_date": "2026-10-21",
      "start_time": "09:00:00",
      "duration_minutes": 90,
      "duration_hours": 1.5,
      "notes": "Reviewed functional dependencies.",
      "created_at": "2026-10-21T09:00:00"
    }
  ]
  ```

### `POST /api/study-sessions`
Logs a new study session.
* **Request Body**:
  ```json
  {
    "subject_id": 1,
    "topic": "Transaction Processing & ACID Properties",
    "study_date": "2026-10-21",
    "start_time": "14:30:00",
    "duration_minutes": 60,
    "notes": "Serializability and lock-based protocols."
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Study session saved successfully!",
    "session_id": 8,
    "session": { ... }
  }
  ```
* **Errors**:
  - `400 Bad Request`: Invalid dates, duration $\le 0$, or missing fields.
  - `404 Not Found`: Given `subject_id` does not exist in database.

### `PUT /api/study-sessions/<int:session_id>`
Updates an existing study session.
* **Request Body**: Same schema as POST.
* **Response (200 OK)**:
  ```json
  {
    "message": "Study session updated successfully!",
    "session_id": 8,
    "session": { ... }
  }
  ```
* **Errors**: `400 Bad Request`, `404 Not Found`.

### `DELETE /api/study-sessions/<int:session_id>`
Deletes a study session.
* **Response (200 OK)**: `{"message": "Study session deleted successfully!"}`
* **Errors**: `404 Not Found`.

---

## 4. Daily Habits & Habit Logs Endpoints

### `GET /api/habits`
Returns all registered habits.
* **Response (200 OK)**:
  ```json
  [
    {
      "habit_id": 1,
      "habit_name": "Solve 1 LeetCode Problem",
      "description": "Daily algorithmic practice",
      "frequency": "Daily",
      "is_active": 1,
      "created_at": "2026-10-21T00:00:00"
    }
  ]
  ```

### `POST /api/habit-logs`
Idempotent upsert for daily habit completion.
* **Request Body**:
  ```json
  {
    "habit_id": 1,
    "log_date": "2026-10-21",
    "completed": true,
    "notes": "Solved 1 medium graph BFS problem"
  }
  ```
* **Response (201 Created / 200 OK)**:
  ```json
  {
    "message": "Habit log saved successfully!",
    "log_id": 12,
    "log": { ... }
  }
  ```

---

## 5. Analytics & Dashboard Statistics

### `GET /api/study-stats`
Aggregated overall metrics.
* **Response (200 OK)**:
  ```json
  {
    "total_sessions": 7,
    "total_minutes": 590,
    "total_hours": 9.83
  }
  ```

### `GET /api/habit-progress?today=YYYY-MM-DD`
Calculates daily habit completion rates.
* **Response (200 OK)**:
  ```json
  {
    "total_habits": 5,
    "completed_habits": 4,
    "remaining_habits": 1,
    "completion_percentage": 80.0
  }
  ```

### `GET /api/weekly-report?today=YYYY-MM-DD`
Aggregates study time per calendar day across the last 7 calendar days.
* **Response (200 OK)**:
  ```json
  [
    {
      "study_date": "2026-10-21",
      "total_sessions": 2,
      "total_minutes": 165,
      "total_hours": 2.75
    }
  ]
  ```

### `GET /api/subject-balance?days=30`
Evaluates curriculum distribution against fair-share targets.
* **Response (200 OK)**:
  ```json
  {
    "days": 30,
    "total_minutes": 590,
    "fair_share_percentage": 20.0,
    "needs_attention_count": 1,
    "summary": "Give Software Engineering some time next.",
    "subjects": [ ... ]
  }
  ```

---

## 6. Study Planner, Exams & Notes

### `GET /api/tasks` | `POST /api/tasks` | `PUT /api/tasks/<id>` | `DELETE /api/tasks/<id>`
Manages planner tasks with priority (`Low`, `Medium`, `High`), status (`Pending`, `Completed`), and due dates.

### `GET /api/exams` | `POST /api/exams` | `PUT /api/exams/<id>` | `DELETE /api/exams/<id>`
Manages exams with countdown calculations (`days_left`).

### `GET /api/notes` | `POST /api/notes` | `PUT /api/notes/<id>` | `DELETE /api/notes/<id>`
Manages revision notes, tags, and pinned statuses.

---

## 7. Data Export

### `GET /api/export/<dataset>.csv`
Downloads CSV dataset with UTF-8 BOM encoding for Excel.
* **Supported Datasets**: `study-sessions`, `habit-logs`, `tasks`, `notes`, `flashcards`.
* **Content-Type**: `text/csv`
* **Content-Disposition**: `attachment; filename="trackmate_study_sessions_YYYY-MM-DD.csv"`
