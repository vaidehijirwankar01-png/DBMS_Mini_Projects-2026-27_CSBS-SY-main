# SQL Queries Explanation Guide: Smart Waste Collection & Segregation Tracker

This guide documents the implementation, theoretical purpose, relational algebra mapping, and expected result set format for the comprehensive collection of SQL queries located in `database/queries.sql`.

---

### Query 1: Basic SELECT with WHERE and ORDER BY
**Concept:** Relational Selection ($\sigma$) and Projection ($\pi$) with sorting.
```sql
SELECT request_id, estimated_quantity_kg, pickup_address, preferred_date, status
FROM collection_requests
WHERE status = 'Pending'
ORDER BY preferred_date ASC, created_at DESC;
```
* **Explanation:** Filters active requests awaiting worker dispatch (`status = 'Pending'`). Results are ordered chronologically by requested pickup date, and secondarily by submission timestamp.
* **Output Format:** Tabular result with columns: `request_id`, `estimated_quantity_kg`, `pickup_address`, `preferred_date`, `status`.

---

### Query 2: SELECT DISTINCT
**Concept:** Duplicate tuple elimination.
```sql
SELECT DISTINCT a.postal_code, a.area_name
FROM areas a
JOIN collection_requests cr ON a.area_id = cr.area_id
WHERE cr.status IN ('Assigned', 'In Progress');
```
* **Explanation:** Retrieves the distinct list of postal codes and areas that currently have active, in-progress pickups without repeating area names.
* **Output Format:** Distinct list of `postal_code`, `area_name`.

---

### Query 3: Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)
**Concept:** Aggregation without grouping over the whole relation.
```sql
SELECT 
    COUNT(*) AS total_completed_requests,
    SUM(actual_quantity_kg) AS total_kg_collected,
    AVG(actual_quantity_kg) AS avg_pickup_weight_kg,
    MIN(actual_quantity_kg) AS smallest_pickup_kg,
    MAX(actual_quantity_kg) AS largest_pickup_kg
FROM collection_requests
WHERE status = 'Completed';
```
* **Explanation:** Computes municipal summary metrics over all successfully fulfilled collections.
* **Output Format:** Single row containing: `total_completed_requests`, `total_kg_collected`, `avg_pickup_weight_kg`, `smallest_pickup_kg`, `largest_pickup_kg`.

---

### Query 4: GROUP BY with HAVING
**Concept:** Group aggregation with post-aggregate predicate filtering.
```sql
SELECT 
    a.area_name,
    COUNT(cr.request_id) AS total_requests,
    COALESCE(SUM(cr.actual_quantity_kg), 0) AS total_collected_kg
FROM areas a
JOIN collection_requests cr ON a.area_id = cr.area_id
GROUP BY a.area_id, a.area_name
HAVING COUNT(cr.request_id) >= 3;
```
* **Explanation:** Groups pickup requests by geographic area, computing total collections and weight, and filters out areas that have fewer than 3 requests.
* **Output Format:** Rows of `area_name`, `total_requests`, `total_collected_kg`.

---

### Query 5: INNER JOIN
**Concept:** Relational Theta Join ($\bowtie$) matching tuples on equal keys.
```sql
SELECT 
    cr.request_id,
    u.full_name AS citizen_name,
    wc.category_name,
    cr.estimated_quantity_kg,
    cr.status
FROM collection_requests cr
INNER JOIN users u ON cr.citizen_id = u.user_id
INNER JOIN waste_categories wc ON cr.category_id = wc.category_id;
```
* **Explanation:** Fetches collection requests along with citizen names and waste categories by matching foreign keys.
* **Output Format:** Columns: `request_id`, `citizen_name`, `category_name`, `estimated_quantity_kg`, `status`.

---

### Query 6: LEFT OUTER JOIN
**Concept:** Preserving all tuples from the left relation regardless of match.
```sql
SELECT 
    u.user_id,
    u.full_name AS citizen_name,
    u.email,
    COUNT(cr.request_id) AS total_requests_submitted
FROM users u
LEFT JOIN collection_requests cr ON u.user_id = cr.citizen_id
WHERE u.role = 'citizen'
GROUP BY u.user_id, u.full_name, u.email
ORDER BY total_requests_submitted DESC;
```
* **Explanation:** Shows all registered citizens, including those who have never submitted a collection request (returns count 0).
* **Output Format:** `user_id`, `citizen_name`, `email`, `total_requests_submitted`.

---

### Query 7: Multi-Table JOIN (5 Tables)
**Concept:** Multi-way join connecting disparate relational domains.
```sql
SELECT 
    cr.request_id,
    u.full_name AS citizen_name,
    wc.category_name,
    ar.area_name,
    wu.full_name AS assigned_worker,
    cr.status
FROM collection_requests cr
JOIN users u ON cr.citizen_id = u.user_id
JOIN waste_categories wc ON cr.category_id = wc.category_id
JOIN areas ar ON cr.area_id = ar.area_id
LEFT JOIN assignments a ON cr.request_id = a.request_id AND a.assignment_status = 'Active'
LEFT JOIN workers w ON a.worker_id = w.worker_id
LEFT JOIN users wu ON w.user_id = wu.user_id;
```
* **Explanation:** Joins request, citizen, category, area, and dispatched sanitation worker for master dispatch visibility.
* **Output Format:** Complete request view with all human-readable entity labels.

---

### Query 8: Subquery in WHERE Clause
**Concept:** Scalar subquery evaluation.
```sql
SELECT 
    request_id,
    citizen_id,
    estimated_quantity_kg,
    status
FROM collection_requests
WHERE estimated_quantity_kg > (
    SELECT AVG(estimated_quantity_kg) 
    FROM collection_requests
);
```
* **Explanation:** Identifies requests whose estimated volume is greater than the global average pickup size.
* **Output Format:** Filtered collection requests.

---

### Query 9: Correlated Subquery
**Concept:** Subquery whose inner predicate depends on the outer row.
```sql
SELECT 
    a.area_id,
    a.area_name,
    cr.request_id AS latest_request_id,
    cr.created_at AS latest_request_time
FROM areas a
JOIN collection_requests cr ON a.area_id = cr.area_id
WHERE cr.created_at = (
    SELECT MAX(inner_cr.created_at)
    FROM collection_requests inner_cr
    WHERE inner_cr.area_id = a.area_id
);
```
* **Explanation:** For every service area, dynamically retrieves its most recently submitted collection request.
* **Output Format:** `area_id`, `area_name`, `latest_request_id`, `latest_request_time`.

---

### Query 10: EXISTS Operator
**Concept:** Semi-join verifying row existence.
```sql
SELECT 
    w.worker_id,
    u.full_name AS worker_name,
    w.availability_status
FROM workers w
JOIN users u ON w.user_id = u.user_id
WHERE EXISTS (
    SELECT 1 
    FROM assignments a
    WHERE a.worker_id = w.worker_id
      AND a.assignment_status = 'Completed'
);
```
* **Explanation:** Retrieves workers who have successfully fulfilled at least one collection assignment.
* **Output Format:** `worker_id`, `worker_name`, `availability_status`.

---

### Query 11: CASE Conditional Expression
**Concept:** Dynamic row-level classification.
```sql
SELECT 
    request_id,
    estimated_quantity_kg,
    CASE 
        WHEN estimated_quantity_kg < 5.0 THEN 'Small Household Bag (<5kg)'
        WHEN estimated_quantity_kg BETWEEN 5.0 AND 20.0 THEN 'Medium Bulk (5-20kg)'
        ELSE 'Commercial / Heavy Load (>20kg)'
    END AS load_classification
FROM collection_requests;
```
* **Explanation:** Categorizes requests into operational payload sizes for dispatch truck capacity planning.
* **Output Format:** `request_id`, `estimated_quantity_kg`, `load_classification`.

---

### Query 12: Date-Based Filtering
**Concept:** Temporal filtering using `CURDATE()` and `INTERVAL`.
```sql
SELECT 
    request_id,
    preferred_date,
    status
FROM collection_requests
WHERE preferred_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
  AND status = 'Pending';
```
* **Explanation:** Identifies all pending pickups scheduled within the upcoming 7 days for route optimization.
* **Output Format:** `request_id`, `preferred_date`, `status`.

---

### Query 13: Area-Wise Waste Totals
**Concept:** Multi-metric area aggregation.
```sql
SELECT 
    a.area_name,
    a.postal_code,
    COUNT(cr.request_id) AS total_pickups,
    COALESCE(SUM(cr.actual_quantity_kg), 0) AS total_kg_collected
FROM areas a
LEFT JOIN collection_requests cr ON a.area_id = cr.area_id
GROUP BY a.area_id, a.area_name, a.postal_code
ORDER BY total_kg_collected DESC;
```
* **Explanation:** Ranks municipal areas by total waste generated in kilograms.

---

### Query 14: Category-Wise Segregation Totals
**Concept:** Aggregating segregation audit quantities.
```sql
SELECT 
    wc.category_name,
    COUNT(sr.segregation_id) AS audit_count,
    COALESCE(SUM(sr.quantity_kg), 0) AS total_segregated_kg,
    SUM(CASE WHEN sr.is_correctly_segregated = TRUE THEN 1 ELSE 0 END) AS clean_segregations,
    SUM(CASE WHEN sr.is_correctly_segregated = FALSE THEN 1 ELSE 0 END) AS mixed_segregations
FROM waste_categories wc
LEFT JOIN segregation_records sr ON wc.category_id = sr.category_id
GROUP BY wc.category_id, wc.category_name;
```
* **Explanation:** Provides a detailed compliance audit breakdown per waste stream.

---

### Query 15: Worker Performance and Rating Analysis
**Concept:** Aggregation with outer join to feedback table.
```sql
SELECT 
    w.worker_id,
    u.full_name AS worker_name,
    w.availability_status,
    COUNT(a.assignment_id) AS total_assigned_tasks,
    SUM(CASE WHEN a.assignment_status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
    ROUND(COALESCE(AVG(f.rating), 0), 2) AS average_rating
FROM workers w
JOIN users u ON w.user_id = u.user_id
LEFT JOIN assignments a ON w.worker_id = a.worker_id
LEFT JOIN feedback f ON a.request_id = f.request_id
GROUP BY w.worker_id, u.full_name, w.availability_status
ORDER BY average_rating DESC, completed_tasks DESC;
```
* **Explanation:** Computes performance scorecards for sanitation workers.

---

### Query 16: Monthly Collection Trends
**Concept:** Chronological grouping by `DATE_FORMAT`.
```sql
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') AS collection_month,
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests,
    COALESCE(SUM(actual_quantity_kg), 0) AS total_kg
FROM collection_requests
GROUP BY collection_month
ORDER BY collection_month ASC;
```
* **Explanation:** Produces monthly data feeds for Chart.js bar and line graphs.

---

### Query 17: Recycling Percentage Calculation with Division-by-Zero Handling
**Concept:** Safe arithmetic with `NULLIF` and subqueries.
```sql
SELECT 
    COALESCE(SUM(rr.quantity_kg), 0) AS total_recycled_kg,
    collected_summary.total_collected_kg,
    ROUND(
        (COALESCE(SUM(rr.quantity_kg), 0) / NULLIF(collected_summary.total_collected_kg, 0)) * 100, 
        2
    ) AS recycling_percentage
FROM recycling_records rr
CROSS JOIN (
    SELECT COALESCE(SUM(actual_quantity_kg), 0) AS total_collected_kg
    FROM collection_requests
    WHERE status IN ('Collected', 'Completed')
) AS collected_summary
GROUP BY collected_summary.total_collected_kg;
```
* **Explanation:** Calculates municipal diversion percentage while preventing division-by-zero crashes.

---

### Query 18: Unassigned / Orphan Request Detection
**Concept:** Finding pending requests without active worker assignments.
```sql
SELECT 
    cr.request_id,
    cr.pickup_address,
    cr.preferred_date,
    cr.status
FROM collection_requests cr
LEFT JOIN assignments a ON cr.request_id = a.request_id AND a.assignment_status = 'Active'
WHERE cr.status = 'Pending' AND a.assignment_id IS NULL;
```
* **Explanation:** Verifies queue integrity so no pending pickup is lost.

---

### Query 19: Feedback Sentiment & Rating Analysis
**Concept:** Distribution of citizen satisfaction scores.
```sql
SELECT 
    f.rating,
    COUNT(*) AS total_reviews,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM feedback)), 1) AS percentage
FROM feedback f
GROUP BY f.rating
ORDER BY f.rating DESC;
```
* **Explanation:** Computes 1-to-5 star rating distribution percentages.

---

### Query 20: Transaction with COMMIT
**Concept:** ACID Atomic Worker Assignment.
```sql
START TRANSACTION;

INSERT INTO assignments (request_id, worker_id, assigned_by, assigned_at, assignment_status)
VALUES (1, 2, 1, NOW(), 'Active');

UPDATE collection_requests
SET status = 'Assigned', updated_at = NOW()
WHERE request_id = 1;

UPDATE workers
SET availability_status = 'Busy'
WHERE worker_id = 2;

INSERT INTO collection_status_history (request_id, previous_status, new_status, changed_by, changed_at, remarks)
VALUES (1, 'Pending', 'Assigned', 1, NOW(), 'Assigned via transaction');

COMMIT;
```
* **Explanation:** Guarantees that assignment creation, status transition, worker lock, and audit logging succeed as one indivisible unit.

---

### Query 21: Transaction with ROLLBACK Demonstration
**Concept:** Atomic rollback on constraint failure.
```sql
START TRANSACTION;

-- Attempting update
UPDATE collection_requests SET status = 'Completed' WHERE request_id = 99999;

-- Condition detected: request does not exist
ROLLBACK;
```
* **Explanation:** Demonstrates reversing partial changes when an error is detected.

