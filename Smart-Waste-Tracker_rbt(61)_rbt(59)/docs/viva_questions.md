# Comprehensive DBMS Viva Questions & Answers

**Project Title:** Smart Waste Collection & Segregation Tracker  
**Database System:** MySQL 8.0+ / InnoDB Engine  
**Backend:** Python Flask & `mysql-connector-python`  

---

### Q1: What is the primary difference between a DBMS and an RDBMS?
**Answer:** A DBMS (Database Management System) manages data stored as flat files or tables without strictly enforcing relational constraints or mathematical integrity. An RDBMS (Relational Database Management System) organizes data into relations (tables) conforming to Codd’s Relational Model, rigorously enforcing primary keys, foreign keys, and ACID transactional properties. Our project uses **MySQL 8.0**, a full RDBMS.

---

### Q2: What is a Primary Key? Give an example from your project.
**Answer:** A Primary Key is an attribute or set of attributes that uniquely identifies every tuple (row) in a table. It must contain unique values and cannot contain `NULL` (`UNIQUE` + `NOT NULL`).  
*Example:* `user_id` in the `users` table uniquely identifies every registered user.

---

### Q3: What is a Foreign Key? Why is referential integrity important?
**Answer:** A Foreign Key is a column or set of columns in a child table that references the Primary Key of a parent table, establishing an explicit relationship. Referential integrity guarantees that no foreign key value can point to a non-existent parent row.  
*Example:* `collection_requests.citizen_id` references `users(user_id)`. MySQL prevents inserting a collection request for an invalid citizen.

---

### Q4: What is Normalization, and what normal form does your database achieve?
**Answer:** Normalization is the systematic process of decomposing tables to minimize redundant data and eliminate insertion, update, and deletion anomalies. Our database is in **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)**:
- **1NF:** All attribute values are atomic; no repeating groups.
- **2NF:** In 1NF and contains zero partial functional dependencies on candidate keys.
- **3NF:** In 2NF and contains zero transitive dependencies ($X \to Y$ where $Y \to Z$).
- **BCNF:** Every functional determinant is a candidate key.

---

### Q5: Can you explain a Transitive Dependency that you eliminated?
**Answer:** In an unnormalized request table, we had:  
`request_id -> area_id` and `area_id -> postal_code`.  
Here, `postal_code` transitively depended on `request_id` via `area_id`. To reach 3NF, we extracted `areas(area_id, area_name, locality, postal_code)` into its own table, leaving only the foreign key `area_id` inside `collection_requests`.

---

### Q6: What are the ACID properties in database transactions? How does your project satisfy them?
**Answer:**
- **Atomicity:** All operations in a transaction succeed together or are rolled back completely. When dispatching a worker (`sp_assign_worker`), inserting into `assignments`, updating `collection_requests` to 'Assigned', and setting `workers` to 'Busy' are executed in a single atomic transaction.
- **Consistency:** Transactions transition the database from one valid state to another, preserving all schema constraints (`CHECK`, `FOREIGN KEY`).
- **Isolation:** Concurrency control prevents concurrent transactions from reading uncommitted data (`READ COMMITTED` or `REPEATABLE READ`). We use `SELECT ... FOR UPDATE` row locks.
- **Durability:** Committed transactions are permanently written to write-ahead logs (InnoDB redo logs) and persist even in the event of a power crash.

---

### Q7: Explain the difference between `INNER JOIN` and `LEFT OUTER JOIN`.
**Answer:**
- **INNER JOIN:** Returns only tuples that have matching values in both joined tables. If a user has zero collection requests, an `INNER JOIN` between `users` and `collection_requests` will exclude that user.
- **LEFT OUTER JOIN:** Returns all rows from the left table, matched with corresponding rows from the right table. If there is no match, `NULL` values are returned for right-table columns. We use `LEFT JOIN` on `users` to show citizens even if they have 0 requests.

---

### Q8: What is a Database View? What views did you create and why?
**Answer:** A View is a virtual table defined by a stored SQL query. It does not store physical data itself (unless materialized); rather, it executes the query dynamically when queried. Views enhance security by abstracting base tables and simplifying complex multi-table joins.  
*Views created in our project:*
- `vw_area_waste_summary`: Aggregates requests and total kilograms by service area.
- `vw_worker_performance`: Computes assigned tasks, completed tasks, and average rating per worker.
- `vw_monthly_statistics`: Groups collection metrics by month.

---

### Q9: What is a Stored Procedure? What are its benefits over application-layer SQL?
**Answer:** A Stored Procedure is a precompiled collection of SQL statements stored directly on the database server.  
*Benefits:*
1. **Performance:** Precompiled and cached by the database server.
2. **Network Traffic Reduction:** The client sends one `CALL sp_name(params)` command rather than transmitting multiple raw SQL strings back and forth.
3. **Security:** Users can be granted execution permission on the procedure without direct table access.
4. **Encapsulation:** Complex business logic and transactions reside inside the database engine.

---

### Q10: What is a Database Trigger? What triggers exist in your project?
**Answer:** A Trigger is a procedural code block that automatically executes in response to a specific DML event (`INSERT`, `UPDATE`, or `DELETE`) on a particular table.  
*Our Triggers:*
1. `trg_before_request_insert`: `BEFORE INSERT ON collection_requests` — Validates that preferred pickup date cannot be in the past (`NEW.preferred_date < CURDATE()`).
2. `trg_after_status_change`: `AFTER UPDATE ON collection_requests` — Automatically writes an audit row to `collection_status_history` whenever `status` is updated.
3. `trg_after_assignment_complete`: `AFTER UPDATE ON assignments` — Increments `workers.total_collections` when an assignment reaches 'Completed'.
4. `trg_before_request_update`: `BEFORE UPDATE ON collection_requests` — Automatically sets `completed_at = NOW()` when status becomes 'Completed'.

---

### Q11: What is SQL Injection? How does your project prevent it?
**Answer:** SQL Injection is a vulnerability where an attacker injects malicious SQL statements into input fields (e.g., `' OR '1'='1`), manipulating the query logic.  
*Prevention in our project:* We **never** concatenate user strings into SQL queries. Every database interaction uses **parameterized queries** with `%s` placeholders through `mysql-connector-python` (`cursor.execute(query, (param1, param2))`). Parameters are sent separately from the SQL statement, treating user inputs strictly as literals.

---

### Q12: Why did you use `DECIMAL(10,2)` instead of `FLOAT` or `DOUBLE` for waste quantities?
**Answer:** `FLOAT` and `DOUBLE` are approximate binary floating-point numbers subject to round-off errors due to IEEE 754 representations (e.g., $0.1 + 0.2 = 0.30000000000000004$). For scientific or commercial waste measurements, `DECIMAL(10,2)` stores numbers as exact packed fixed-point decimals, guaranteeing that $5.20\text{ kg} + 4.80\text{ kg}$ is precisely $10.00\text{ kg}$ without arithmetic inaccuracy.

---

### Q13: What is an Index? How does a B-Tree index work?
**Answer:** An index is an auxiliary data structure that enables fast retrieval of rows without performing a full-table scan ($O(N)$). MySQL InnoDB uses **B-Tree (Balanced Tree)** indexes. B-Trees keep data sorted and allow search, sequential access, insertions, and deletions in logarithmic time ($O(\log N)$).  
*Key indexes created:*
- `idx_requests_status` on `collection_requests(status)`
- `idx_requests_citizen` on `collection_requests(citizen_id)`
- `idx_assignments_worker` on `assignments(worker_id)`

---

### Q14: How do you inspect query performance in MySQL?
**Answer:** By prefixing the query with the `EXPLAIN` keyword (`EXPLAIN SELECT ...`). The output displays the execution plan:
- `type`: Access type (`const`, `ref`, `range`, `index`, or `ALL` for full scan).
- `possible_keys`: Indexes MySQL could use.
- `key`: The actual index chosen.
- `rows`: Estimated number of rows scanned.
- `Extra`: Additional details like `Using index`, `Using where`, `Using temporary`.

---

### Q15: What is the purpose of the `UNIQUE` constraint? Where did you use composite unique keys?
**Answer:** A `UNIQUE` constraint ensures all values in a column or set of columns are distinct.  
*Composite Unique Keys used:*
1. `unique_active_assignment (request_id, assignment_status)` in `assignments` — Prevents creating duplicate 'Active' assignments for the same collection request.
2. `unique_feedback (request_id, citizen_id)` in `feedback` — Enforces business rule that a citizen can only submit one feedback review per collection.

---

### Q16: What is a CHECK constraint? Give an example from your project.
**Answer:** A `CHECK` constraint specifies a boolean predicate that must evaluate to TRUE (or UNKNOWN) for every row inserted or updated. MySQL 8.0 fully enforces CHECK constraints.  
*Examples:*
- `CONSTRAINT chk_estimated_qty CHECK (estimated_quantity_kg > 0)`
- `CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5)`

---

### Q17: What is the difference between `DELETE`, `TRUNCATE`, and `DROP`?
**Answer:**
- **DELETE:** A DML statement that removes rows matching a `WHERE` clause. It fires `BEFORE/AFTER DELETE` triggers, generates individual row undo/redo logs, and can be rolled back inside a transaction.
- **TRUNCATE:** A DDL statement that deallocates data pages of the table, resetting auto-increment counters. It is much faster than `DELETE`, cannot be filtered with `WHERE`, and does not fire row triggers.
- **DROP:** A DDL statement that completely removes the table schema, indexes, constraints, and data from the data dictionary.

---

### Q18: What is the difference between `WHERE` and `HAVING`?
**Answer:**
- **`WHERE`:** Filters individual tuples *before* grouping and aggregation occurs. It cannot contain aggregate functions (`WHERE SUM(qty) > 10` is invalid).
- **`HAVING`:** Filters grouped summary rows *after* the `GROUP BY` clause evaluates aggregates (`HAVING COUNT(cr.request_id) >= 3`).

---

### Q19: What is a Correlated Subquery?
**Answer:** A subquery that references columns from the outer query. It cannot be executed independently of the outer query; it executes once for every tuple processed by the outer query.  
*Example:* Finding the latest request for each service area by correlating `inner_cr.area_id = outer_a.area_id`.

---

### Q20: What is a Connection Pool? Why did you implement one in `db.py`?
**Answer:** A Connection Pool maintains a cache of open database connections that can be reused by incoming requests. Establishing a TCP connection, completing TLS handshakes, and authenticating with MySQL is computationally expensive. Connection pooling via `mysql.connector.pooling.MySQLConnectionPool` reuses existing connections, drastically improving web throughput and preventing connection exhaustion under concurrent citizen traffic.

---

### Q21: How are passwords stored securely in this project?
**Answer:** Passwords are never stored in plaintext. When a user registers or is created, the system uses Werkzeug's `generate_password_hash` to compute a salted cryptographic hash using the **scrypt** algorithm (`scrypt:32768:8:1$salt$hash`). During login, `check_password_hash` compares the entered password with the stored hash using constant-time verification to prevent timing attacks.

---

### Q22: What is the lifecycle state machine of a collection request?
**Answer:**  
$$\text{Pending} \xrightarrow{\text{Admin Dispatch}} \text{Assigned} \xrightarrow{\text{Worker En Route}} \text{In Progress} \xrightarrow{\text{Physical Pickup}} \text{Collected} \xrightarrow{\text{Facility Deposition}} \text{Completed}$$  
- A request may also transition to `Cancelled` from `Pending` or `Assigned`.
- Invalid transitions (e.g., jumping from `Pending` directly to `Completed`) are strictly rejected by `collection_service.py` and `sp_update_collection_status`.

---

### Q23: How do you handle potential division-by-zero errors in recycling analytics?
**Answer:** In Query 17 and `reporting_service.py`, when computing $\text{Recycling Rate} = \frac{\text{Recycled}}{\text{Total Collected}} \times 100$, if no waste has yet been collected, $\text{Total Collected} = 0$. In SQL, we wrap the denominator in `NULLIF(total_collected, 0)` so division by zero safely evaluates to `NULL` rather than throwing a runtime arithmetic exception.

---

### Q24: What is the purpose of `ON UPDATE CURRENT_TIMESTAMP`?
**Answer:** It is a MySQL timestamp attribute that automatically updates the column's value to the current server timestamp whenever any column in that row is modified via an `UPDATE` statement, providing automated audit tracking without requiring application-level datetime code.

---

### Q25: Why did you choose InnoDB instead of MyISAM?
**Answer:**
1. **ACID Transactions:** InnoDB supports `START TRANSACTION`, `COMMIT`, and `ROLLBACK`; MyISAM does not.
2. **Foreign Key Constraints:** InnoDB enforces relational foreign key integrity; MyISAM ignores foreign key definitions.
3. **Row-Level Locking:** InnoDB locks only the specific rows being modified (`FOR UPDATE`), allowing high concurrent throughput, whereas MyISAM uses coarse table-level locking.
4. **Crash Recovery:** InnoDB features a write-ahead redo log for automatic recovery after server crashes.

