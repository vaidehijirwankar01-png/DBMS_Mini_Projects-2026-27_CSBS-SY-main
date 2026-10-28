# Campus Skill Exchange & Peer Learning Management System

A DBMS mini project built with Flask + MySQL.

## Features
- Student registration/login
- Add skills a student can teach
- Add skills a student wants to learn
- SQL-based peer skill matching
- Send and accept learning requests
- Schedule online/offline learning sessions
- Submit ratings and feedback
- MySQL relational schema with PK, FK, composite keys, constraints and joins

## Setup
1. Install MySQL and create/open MySQL Workbench.
2. Run `schema.sql`.
3. Open `app.py` and replace `YOUR_MYSQL_PASSWORD` with your MySQL root password.
4. Open terminal in this folder and run:

```bash
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

5. Open `http://127.0.0.1:5000`.

## Suggested demo
Create two accounts. Student A adds Python to "I want to learn" and C++ to "I can teach". Student B adds Python to "I can teach" and C++ to "I want to learn". Login as A, open Matches, send a request, login as B, accept it, then schedule a session and submit feedback.

## DBMS viva topics
- Primary/foreign/composite keys
- Many-to-many relationship through bridge tables
- Normalization
- JOIN and GROUP BY
- Aggregate functions
- Constraints and transactions
- Views/triggers can be added as an extension
