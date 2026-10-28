# 🐾 PetCare – Pet Care & Veterinary Clinic Management System

A DBMS mini project: a database-driven web application for managing a veterinary clinic – owners, pets, doctors, appointments, treatments, medicines and billing.

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | **HTML5** | Page structure, forms |
| Frontend | **CSS3** (Flexbox, Grid, CSS variables) | Responsive layout, gradient theme |
| Frontend | **JavaScript (ES6)** | Live search, sorting, pagination, CSV export, edit forms |
| Frontend | **Chart.js 4.4** (bundled in `static/js/`) | Interactive dashboard charts |
| Frontend | Google Fonts – Poppins | Typography |
| Backend | **Python 3.10+** | Application language |
| Backend | **Flask** + Jinja2 | Routing, templates, JSON endpoints |
| Database | **MySQL 8.x** (InnoDB) | Storage, constraints, triggers, procedures, views |
| Connector | **mysql-connector-python** | Flask ⇄ MySQL |
| Tools | VS Code, MySQL Command Line / Workbench, Graphviz | Development, SQL, ER diagram |

---

## 2. Database Summary

| Item | Count |
|---|---|
| **Tables** | **9** |
| Views | 4 |
| Stored procedures | 3 |
| Functions | 2 |
| Triggers | 6 |
| Explicit indexes | 4 (plus automatic PK/UNIQUE indexes) |
| Sample SQL queries | 50 (`database/sample_queries.sql`) |

**The 9 tables:** `OWNER`, `OWNER_PHONE`, `PET`, `VETERINARIAN`, `APPOINTMENT`, `TREATMENT`, `MEDICINE`, `TREATMENT_MEDICINE`, `BILL`

**Sample data:** 10 owners (14 phone numbers) · 15 pets (6 species) · 5 vets · 20 appointments (10 completed, 3 cancelled, 7 scheduled) · 10 treatments · 15 medicines · 22 prescription lines · 10 bills (6 paid, 4 unpaid)

---

## 3. SQL Features Implemented

| Feature | Details |
|---|---|
| DDL & constraints | CREATE/DROP/ALTER, PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK, DEFAULT, ENUM |
| Keys | Primary, foreign, candidate, composite (`OWNER_PHONE`, `TREATMENT_MEDICINE`), alternate keys |
| Attribute types | Simple, composite (name), multivalued (phones), derived (pet age, bill total) |
| Relationships | 1:N, 1:0..1 and M:N (via `TREATMENT_MEDICINE`) |
| CRUD | INSERT, SELECT, UPDATE, DELETE |
| Joins | INNER, LEFT, RIGHT, CROSS, SELF, multi-table |
| Aggregates | COUNT, SUM, AVG, MIN, MAX · GROUP BY · HAVING |
| Subqueries | Scalar, correlated, IN, ANY/ALL, derived table · EXISTS / NOT EXISTS |
| Other | UNION, CASE, window function `RANK() OVER` |
| Views | `vw_appointment_details`, `vw_unpaid_bills`, `vw_low_stock`, `vw_vet_revenue` |
| Stored procedures | `sp_book_appointment`, `sp_pay_bill`, `sp_owner_summary` |
| Functions | `fn_pet_age`, `fn_owner_due` |
| Triggers | stock check · stock reduce · stock restore · treatment check · appointment auto-complete · bill calculation |
| Indexes | `idx_appt_date`, `idx_bill_status`, `idx_med_cat`, `idx_pet_species` |
| Transactions | START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT; ACID properties |
| Access control | GRANT / REVOKE |
| Normalization | UNF → 1NF → 2NF → 3NF (see `docs/DESIGN.md` and the project report) |

---

## 4. Website Features

- **Dashboard** – KPI cards, 4 interactive charts (click to drill down), low-stock alerts, unpaid bills, upcoming appointments
- **CRUD pages** – Owners, Pets, Veterinarians, Appointments, Treatments, Prescriptions, Medicines, Billing (add / edit / delete)
- **Profiles** – click an owner or pet name for a full profile (pets, visits, bills, medicines)
- **Billing** – automatic totals, "Mark paid", printable invoice
- **Reports** – 8 live SQL reports with the query shown
- **Table tools** – live search, column sorting, pagination, CSV export
- **Data rules in the UI** – past bookings, double-booking, insufficient stock and foreign-key errors are shown as messages

---

## 5. Folder Structure

```
petcare/
├── app.py                      # Flask backend
├── requirements.txt
├── README.md
├── database/
│   ├── schema.sql              # tables, indexes, views, functions, triggers, procedures
│   ├── sample_data.sql         # fictional sample data
│   └── sample_queries.sql      # 50 SQL queries
├── docs/
│   ├── DESIGN.md               # ER diagram, schema, keys, FDs, normalization
│   ├── er_diagram.png
│   └── PetCare_Project_Report.docx
├── templates/                  # base, dashboard, table, profile, reports, invoice
└── static/
    ├── css/style.css
    └── js/                     # app.js, dashboard.js, chart.umd.js
```

---

## 6. How to Run

### Prerequisites
Python 3.10+ and MySQL Server 8.x installed and running.

### Step 1 – Create the database (once)
Open a terminal **in the `petcare` folder** and start MySQL:
```
mysql -u root -p
```
At the `mysql>` prompt:
```sql
source database/schema.sql
source database/sample_data.sql
exit
```
> **PowerShell note:** the `<` redirect (`mysql -u root -p < file.sql`) does not work in PowerShell. Use `source` as above, or `cmd /c "mysql -u root -p < database\schema.sql"`.

### Step 2 – Install dependencies
```
pip install -r requirements.txt
```

### Step 3 – Set your MySQL password
Either edit the `password=` default in `app.py`, **or** set an environment variable in the same terminal:
```powershell
# PowerShell
$env:DB_PASSWORD="your_mysql_password"
# Command Prompt:  set DB_PASSWORD=your_mysql_password
# Mac / Linux:     export DB_PASSWORD=your_mysql_password
```
Optional: `DB_HOST` and `DB_USER` can be set the same way (defaults: `localhost`, `root`).

### Step 4 – Start the app
```
python app.py
```
Open **http://127.0.0.1:5000** in your browser. Stop the server with `Ctrl + C`.

> Steps 1–2 are one-time. Day to day you only run `python app.py`.

---

## 7. Resetting the Data
Re-running both SQL files restores the original sample data (this erases your changes):
```sql
source database/schema.sql
source database/sample_data.sql
```
To keep a backup first (run in PowerShell, not inside `mysql>`):
```
mysqldump -u root -p petcare_db > backup.sql
```

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `Access denied for user 'root'` | Wrong/placeholder password – set it in `app.py` or `$env:DB_PASSWORD` |
| `mysql` is not recognized | Add MySQL's `bin` folder to PATH, or use the full path to `mysql.exe` |
| Charts empty | No bills/prescriptions in the DB – reload the sample data |
| `Cannot delete … foreign key constraint fails` | The record is still used elsewhere (e.g. a vet with appointments). Remove the dependent records first |
| Old CSS/JS shown | Hard-refresh the browser with `Ctrl + F5` |

---

## 9. Business Rules Enforced by the Database

- A vet or a pet cannot be booked twice at the same date and time
- Appointments cannot be booked in the past (stored procedure)
- A prescription cannot exceed medicine stock; stock is reduced automatically
- A cancelled appointment cannot be treated
- Bill totals = consultation fee + procedure cost + medicine cost (trigger)
- A paid bill must record a payment method
- Deleting an owner cascades to their pets, appointments, treatments, prescriptions, bills and phone numbers; vets and medicines in use are protected

---

*Fictional data only. Built as a DBMS mini project.*