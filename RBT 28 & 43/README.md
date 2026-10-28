# Gym Management System

A web-based Gym Management System built with **Python, Flask, MySQL, HTML, and Bootstrap 5**. It helps gym staff manage members, trainers, memberships, and payments from a simple browser-based interface.

## Features

- **Dashboard**
  - Total registered members
  - Currently active memberships
  - Number of trainers
  - Total recorded payment revenue
  - Memberships expiring within the next seven days
- **Member management**
  - Add members with date of birth and address
  - Store multiple phone numbers for a member
  - Optionally assign a trainer
  - View member details, memberships, and payment history
  - Delete a member
- **Membership management**
  - Add Monthly, Quarterly, Half-Yearly, and Yearly plans
  - Automatically calculate the membership end date from the selected plan
  - View membership history for each member
- **Trainer management**
  - Add trainers with their specialization and contact number
  - See how many members are assigned to each trainer
- **Payment tracking**
  - Record payment amount, date, and payment mode
  - Supported modes: Cash, UPI, Card, and Net Banking
- **Responsive interface**
  - Uses Bootstrap 5 for a layout that adapts to different screen sizes
  - Displays success messages after common operations

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| Database | MySQL |
| Database driver | `mysql-connector-python` |
| Frontend | HTML,  Bootstrap 5 |
| Development server | Flask built-in server |

## Project Structure

```text
gym_app/
├── app.py
├── requirements.txt
└── templates/
    ├── base.html
    ├── index.html
    ├── members.html
    ├── member_detail.html
    ├── member_form.html
    └── trainers.html
```

- `app.py` — Flask routes, database queries, and application logic.
- `requirements.txt` — Python package dependencies.
- `templates/base.html` — Shared navigation, page layout, and flash messages.
- `templates/index.html` — Dashboard statistics and memberships expiring soon.
- `templates/members.html` — Member list and delete/view actions.
- `templates/member_form.html` — Form for registering a member.
- `templates/member_detail.html` — Member profile, membership history, and payments.
- `templates/trainers.html` — Trainer list, member counts, and trainer creation form.

## Prerequisites

Install the following before running the application:

- Python 3.10 or later (a recent supported Python 3 version is recommended)
- MySQL Server
- `pip`
- A MySQL database named `gym_db`, with the tables, view, and trigger expected by the application

## Database Setup

The application connects to MySQL using settings defined near the top of `app.py`:

```python
DB = dict(
    host="localhost",
    user="<your_username>",
    password="<your_password>",
    port=3306,
    database="gym_db"
)
```

1. Start your MySQL server.
2. Create the database if it does not already exist:

   ```sql
   CREATE DATABASE gym_db;
   USE gym_db;
   ```

3. Create and populate the schema before starting the app.

**Important:** This project archive does not include a SQL schema file. The application expects these database objects and fields to exist:

- `member`: `member_id`, `name`, `street`, `city`, `state`, `dob`, `trainer_id`
- `member_phone`: `member_id`, `phone_no`
- `trainer`: `trainer_id`, `trainer_name`, `specialization`, `phone_no`
- `membership`: `membership_no`, `member_id`, `plan_type`, `start_date`, `end_date`
- `payment`: `payment_id`, `member_id`, `amount`, `payment_date`, `payment_mode`
- `member_details` view: member profile data including `member_id`, `name`, `address`, `age`, `dob`, and `trainer_name`

The application also expects a MySQL trigger to generate `membership_no` when a membership is inserted. Ensure your schema defines suitable primary keys, foreign keys, and data types. `member_details` should calculate or expose the address, age, and trainer name fields used by the templates.

## Installation

Open a terminal and navigate to the project directory:

```bash
cd gym_app
```

### 1. Create a virtual environment

**Linux/macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows PowerShell:**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If installation fails because `requirements.txt` uses the editable entry `-e flask`, replace that line with `Flask` and install again:

```text
Flask
mysql-connector-python
```

Then run:

```bash
pip install -r requirements.txt
```

### 3. Configure the database connection

Update the `DB` dictionary in `app.py` with your local MySQL username, password, port, and database name. Do not commit real credentials to a public repository. For a deployed version, use environment variables or a secrets manager.

### 4. Run the application

```bash
python app.py
```

Open the local URL printed by Flask, usually:

```text
http://127.0.0.1:5000/
```

Stop the development server with `Ctrl+C`.

## Main Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Dashboard and summary statistics |
| `/members` | GET | List members |
| `/members/add` | GET, POST | Display and submit the add-member form |
| `/members/<mid>` | GET | View a member's profile, memberships, and payments |
| `/members/<mid>/membership` | POST | Add a membership plan |
| `/members/<mid>/payment` | POST | Record a payment |
| `/members/<mid>/delete` | POST | Delete a member |
| `/trainers` | GET, POST | List trainers and add a trainer |

## Membership Plan Durations

The application calculates the end date using these durations:

| Plan | Duration used by the app |
|---|---:|
| Monthly | 30 days |
| Quarterly | 90 days |
| Half-Yearly | 180 days |
| Yearly | 365 days |

These are fixed day counts, not calendar-month calculations.

## How It Works

1. A user opens the dashboard to view gym statistics.
2. Staff register a member and optionally assign a trainer and phone numbers.
3. The member profile displays the member's details and related records.
4. Staff can add membership plans and record payments from that profile.
5. The dashboard lists memberships ending within the next seven days.
6. Trainer records and their assigned-member counts are available from the Trainers page.

Flask handles HTTP requests and renders Jinja2 templates. The application queries MySQL through `mysql.connector`, while Bootstrap styles the interface.

## Known Limitations and Future Improvements

- The database schema and sample data are not included in this archive.
- Database credentials and Flask's secret key are hard-coded for local development; move them to environment variables before deployment.
- The app runs with Flask debug mode enabled; disable debug mode in production.
- Add authentication and role-based authorization before using the app with real gym data.
- Add server-side validation and error handling for invalid form values and database failures.
- Consider using transactions when saving a member and multiple phone numbers.
- Add member editing, trainer editing/deletion, search, filtering, and pagination.
- Add automated tests and a production WSGI server for deployment.
- Bootstrap is loaded from a CDN, so an internet connection is required for its stylesheet unless it is hosted locally.

## Security Note

This is a starter/demo project, not a production-ready system. Do not use the sample database password or secret key for a public deployment. Keep credentials private, disable debug mode, and add authentication, authorization, CSRF protection, input validation, and appropriate database permissions before handling real customer information.

## License

No license is included in the provided project archive. Add a `LICENSE` file if you intend to publish or distribute the project.
