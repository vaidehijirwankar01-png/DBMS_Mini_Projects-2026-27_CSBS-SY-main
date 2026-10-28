-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- SQL Queries – Comprehensive Demonstration
-- =============================================================================
-- Target: MySQL 8.0+
-- Description: 25+ queries demonstrating SQL concepts from basic SELECTs
--              through complex JOINs, subqueries, aggregates, and transactions.
-- =============================================================================

USE smart_waste_db;

-- =============================================================================
-- QUERY 1: Basic SELECT with WHERE and ORDER BY
-- Retrieve all collection requests that are currently pending, ordered by
-- preferred pickup date (soonest first).
-- =============================================================================
SELECT  request_id,
        citizen_id,
        estimated_quantity_kg,
        pickup_address,
        preferred_date,
        status
FROM    collection_requests
WHERE   status = 'Pending'
ORDER BY preferred_date ASC;

-- =============================================================================
-- QUERY 2: SELECT DISTINCT
-- List all distinct statuses that currently exist in the collection_requests
-- table, giving us a quick view of system activity.
-- =============================================================================
SELECT DISTINCT status
FROM   collection_requests
ORDER BY FIELD(status, 'Pending', 'Assigned', 'In Progress',
               'Collected', 'Completed', 'Cancelled');

-- =============================================================================
-- QUERY 3: COUNT, SUM, AVG Aggregates
-- Get overall collection statistics: total requests, total weight estimated,
-- total weight actually collected, and average estimated quantity.
-- =============================================================================
SELECT  COUNT(*)                          AS total_requests,
        SUM(estimated_quantity_kg)        AS total_estimated_kg,
        SUM(actual_quantity_kg)           AS total_actual_kg,
        ROUND(AVG(estimated_quantity_kg), 2) AS avg_estimated_kg,
        ROUND(AVG(actual_quantity_kg), 2)    AS avg_actual_kg
FROM    collection_requests
WHERE   status != 'Cancelled';

-- =============================================================================
-- QUERY 4: GROUP BY with HAVING
-- Find waste categories that have received more than 5 collection requests.
-- Useful for identifying the most common waste types.
-- =============================================================================
SELECT  wc.category_name,
        COUNT(cr.request_id)             AS request_count,
        SUM(cr.estimated_quantity_kg)     AS total_estimated_kg
FROM    collection_requests cr
JOIN    waste_categories wc ON cr.category_id = wc.category_id
GROUP BY wc.category_id, wc.category_name
HAVING  COUNT(cr.request_id) > 5
ORDER BY request_count DESC;

-- =============================================================================
-- QUERY 5: INNER JOIN – Requests with Categories
-- Show each collection request alongside its waste category name and
-- colour code for UI display purposes.
-- =============================================================================
SELECT  cr.request_id,
        cr.preferred_date,
        cr.estimated_quantity_kg,
        cr.status,
        wc.category_name,
        wc.color_code
FROM    collection_requests cr
INNER JOIN waste_categories wc ON cr.category_id = wc.category_id
ORDER BY cr.request_id;

-- =============================================================================
-- QUERY 6: LEFT JOIN – Users with Their Requests (including those with none)
-- List ALL citizens and how many requests each has made. Citizens who have
-- never submitted a request will appear with a count of 0.
-- =============================================================================
SELECT  u.user_id,
        u.full_name,
        u.email,
        COUNT(cr.request_id) AS total_requests
FROM    users u
LEFT JOIN collection_requests cr ON u.user_id = cr.citizen_id
WHERE   u.role = 'citizen'
GROUP BY u.user_id, u.full_name, u.email
ORDER BY total_requests DESC;

-- =============================================================================
-- QUERY 7: Multi-table JOIN
-- Comprehensive request detail view joining requests with citizens, areas,
-- categories, and assigned workers (if any).
-- =============================================================================
SELECT  cr.request_id,
        u_cit.full_name                  AS citizen_name,
        a.area_name,
        wc.category_name,
        cr.estimated_quantity_kg,
        cr.actual_quantity_kg,
        cr.status,
        cr.preferred_date,
        u_wkr.full_name                  AS worker_name,
        asgn.assignment_status
FROM    collection_requests cr
JOIN    users u_cit              ON cr.citizen_id  = u_cit.user_id
JOIN    areas a                  ON cr.area_id     = a.area_id
JOIN    waste_categories wc      ON cr.category_id = wc.category_id
LEFT JOIN assignments asgn       ON cr.request_id  = asgn.request_id
                                AND asgn.assignment_status = 'Active'
LEFT JOIN workers w              ON asgn.worker_id = w.worker_id
LEFT JOIN users u_wkr            ON w.user_id      = u_wkr.user_id
ORDER BY cr.request_id;

-- =============================================================================
-- QUERY 8: Subquery – Citizens with Above-Average Request Count
-- Find citizens whose total number of requests exceeds the average number
-- of requests per citizen.
-- =============================================================================
SELECT  u.user_id,
        u.full_name,
        COUNT(cr.request_id) AS request_count
FROM    users u
JOIN    collection_requests cr ON u.user_id = cr.citizen_id
WHERE   u.role = 'citizen'
GROUP BY u.user_id, u.full_name
HAVING  COUNT(cr.request_id) > (
            SELECT AVG(req_count)
            FROM (
                SELECT COUNT(*) AS req_count
                FROM   collection_requests
                GROUP BY citizen_id
            ) AS citizen_avg
        )
ORDER BY request_count DESC;

-- =============================================================================
-- QUERY 9: Correlated Subquery – Each Area's Latest Request
-- For each area, find the most recently created collection request.
-- Uses a correlated subquery to match the latest created_at per area.
-- =============================================================================
SELECT  cr.request_id,
        a.area_name,
        cr.status,
        cr.estimated_quantity_kg,
        cr.created_at
FROM    collection_requests cr
JOIN    areas a ON cr.area_id = a.area_id
WHERE   cr.created_at = (
            SELECT MAX(cr2.created_at)
            FROM   collection_requests cr2
            WHERE  cr2.area_id = cr.area_id
        )
ORDER BY cr.created_at DESC;

-- =============================================================================
-- QUERY 10: EXISTS – Workers Who Have Completed At Least One Collection
-- Find workers who have at least one assignment with status 'Completed'.
-- Uses EXISTS for efficient semi-join.
-- =============================================================================
SELECT  w.worker_id,
        u.full_name,
        w.total_collections
FROM    workers w
JOIN    users u ON w.user_id = u.user_id
WHERE   EXISTS (
            SELECT 1
            FROM   assignments asgn
            WHERE  asgn.worker_id = w.worker_id
            AND    asgn.assignment_status = 'Completed'
        )
ORDER BY w.total_collections DESC;

-- =============================================================================
-- QUERY 11: CASE Expression – Classify Waste Quantity
-- Categorize each request's estimated quantity as Small (< 3 kg),
-- Medium (3–8 kg), or Large (> 8 kg) for dashboard summaries.
-- =============================================================================
SELECT  cr.request_id,
        cr.estimated_quantity_kg,
        wc.category_name,
        CASE
            WHEN cr.estimated_quantity_kg < 3  THEN 'Small (< 3 kg)'
            WHEN cr.estimated_quantity_kg <= 8 THEN 'Medium (3–8 kg)'
            ELSE                                    'Large (> 8 kg)'
        END AS quantity_class,
        cr.status
FROM    collection_requests cr
JOIN    waste_categories wc ON cr.category_id = wc.category_id
ORDER BY cr.estimated_quantity_kg DESC;

-- =============================================================================
-- QUERY 12: Date Filtering – Last 30 Days' Requests
-- Retrieve all requests created within the last 30 days from the current date.
-- =============================================================================
SELECT  cr.request_id,
        u.full_name       AS citizen_name,
        wc.category_name,
        cr.estimated_quantity_kg,
        cr.status,
        cr.created_at
FROM    collection_requests cr
JOIN    users u             ON cr.citizen_id  = u.user_id
JOIN    waste_categories wc ON cr.category_id = wc.category_id
WHERE   cr.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY cr.created_at DESC;

-- =============================================================================
-- QUERY 13: Area-wise Waste Totals
-- Aggregate total estimated and actual waste quantities per area.
-- =============================================================================
SELECT  a.area_id,
        a.area_name,
        COUNT(cr.request_id)                     AS total_requests,
        ROUND(SUM(cr.estimated_quantity_kg), 2)  AS total_estimated_kg,
        ROUND(SUM(cr.actual_quantity_kg), 2)     AS total_actual_kg,
        ROUND(AVG(cr.estimated_quantity_kg), 2)  AS avg_estimated_kg
FROM    areas a
LEFT JOIN collection_requests cr ON a.area_id = cr.area_id
GROUP BY a.area_id, a.area_name
ORDER BY total_estimated_kg DESC;

-- =============================================================================
-- QUERY 14: Category-wise Segregation Totals
-- Summarize segregation records per waste category, including counts of
-- correctly vs. incorrectly segregated batches.
-- =============================================================================
SELECT  wc.category_name,
        COUNT(sr.segregation_id)                                    AS total_records,
        ROUND(SUM(sr.quantity_kg), 2)                               AS total_segregated_kg,
        SUM(CASE WHEN sr.is_correctly_segregated = TRUE THEN 1 ELSE 0 END)  AS correct_count,
        SUM(CASE WHEN sr.is_correctly_segregated = FALSE THEN 1 ELSE 0 END) AS incorrect_count,
        ROUND(
            SUM(CASE WHEN sr.is_correctly_segregated = TRUE THEN 1 ELSE 0 END)
            * 100.0 / NULLIF(COUNT(sr.segregation_id), 0),
            1
        ) AS correct_pct
FROM    waste_categories wc
LEFT JOIN segregation_records sr ON wc.category_id = sr.category_id
GROUP BY wc.category_id, wc.category_name
ORDER BY total_segregated_kg DESC;

-- =============================================================================
-- QUERY 15: Worker Performance – Tasks Completed and Average Rating
-- For each worker, show the number of completed assignments, average citizen
-- rating, and total kilograms collected.
-- =============================================================================
SELECT  u.full_name                              AS worker_name,
        w.total_collections,
        COUNT(DISTINCT asgn.assignment_id)       AS assigned_tasks,
        SUM(CASE WHEN asgn.assignment_status = 'Completed' THEN 1 ELSE 0 END)
                                                 AS completed_tasks,
        ROUND(AVG(fb.rating), 1)                 AS avg_rating,
        ROUND(SUM(cr.actual_quantity_kg), 2)     AS total_kg_collected
FROM    workers w
JOIN    users u ON w.user_id = u.user_id
LEFT JOIN assignments asgn ON w.worker_id = asgn.worker_id
LEFT JOIN collection_requests cr ON asgn.request_id = cr.request_id
LEFT JOIN feedback fb ON cr.request_id = fb.request_id
GROUP BY w.worker_id, u.full_name, w.total_collections
ORDER BY completed_tasks DESC;

-- =============================================================================
-- QUERY 16: Monthly Collection Statistics
-- Group completed requests by month to show trends over time.
-- =============================================================================
SELECT  DATE_FORMAT(cr.completed_at, '%Y-%m')     AS month,
        COUNT(cr.request_id)                       AS completed_requests,
        ROUND(SUM(cr.actual_quantity_kg), 2)       AS total_collected_kg,
        ROUND(AVG(cr.actual_quantity_kg), 2)       AS avg_per_request_kg,
        COUNT(DISTINCT cr.citizen_id)              AS unique_citizens
FROM    collection_requests cr
WHERE   cr.status = 'Completed'
AND     cr.completed_at IS NOT NULL
GROUP BY DATE_FORMAT(cr.completed_at, '%Y-%m')
ORDER BY month DESC;

-- =============================================================================
-- QUERY 17: Recycling Percentage Calculation (handles division by zero)
-- Calculate what percentage of total collected waste was recycled vs. other
-- processing methods. Uses NULLIF to prevent division by zero.
-- =============================================================================
SELECT  rr.processing_type,
        ROUND(SUM(rr.quantity_kg), 2)            AS processed_kg,
        ROUND(
            SUM(rr.quantity_kg) * 100.0
            / NULLIF((SELECT SUM(quantity_kg) FROM recycling_records), 0),
            1
        )                                        AS percentage_of_total
FROM    recycling_records rr
GROUP BY rr.processing_type
ORDER BY processed_kg DESC;

-- =============================================================================
-- QUERY 18: Top 5 Areas by Waste Generation
-- Rank areas by total estimated waste to identify high-generation zones for
-- resource planning.
-- =============================================================================
SELECT  a.area_name,
        a.postal_code,
        COUNT(cr.request_id)                     AS total_requests,
        ROUND(SUM(cr.estimated_quantity_kg), 2)  AS total_estimated_kg,
        ROUND(AVG(cr.estimated_quantity_kg), 2)  AS avg_per_request_kg
FROM    areas a
JOIN    collection_requests cr ON a.area_id = cr.area_id
WHERE   cr.status != 'Cancelled'
GROUP BY a.area_id, a.area_name, a.postal_code
ORDER BY total_estimated_kg DESC
LIMIT 5;

-- =============================================================================
-- QUERY 19: Requests with No Assignments (Orphan Detection)
-- Find collection requests that should have been assigned a worker but have
-- not been. Useful for admin dashboards to spot missed requests.
-- =============================================================================
SELECT  cr.request_id,
        u.full_name          AS citizen_name,
        a.area_name,
        wc.category_name,
        cr.preferred_date,
        cr.status,
        cr.created_at
FROM    collection_requests cr
JOIN    users u              ON cr.citizen_id  = u.user_id
JOIN    areas a              ON cr.area_id     = a.area_id
JOIN    waste_categories wc  ON cr.category_id = wc.category_id
LEFT JOIN assignments asgn   ON cr.request_id  = asgn.request_id
WHERE   asgn.assignment_id IS NULL
AND     cr.status NOT IN ('Cancelled')
ORDER BY cr.preferred_date ASC;

-- =============================================================================
-- QUERY 20: Feedback Analysis with Average Ratings
-- Summarize citizen feedback per area and category, including the count of
-- each star rating.
-- =============================================================================
SELECT  a.area_name,
        wc.category_name,
        COUNT(fb.feedback_id)                            AS feedback_count,
        ROUND(AVG(fb.rating), 2)                         AS avg_rating,
        MIN(fb.rating)                                   AS min_rating,
        MAX(fb.rating)                                   AS max_rating,
        SUM(CASE WHEN fb.rating >= 4 THEN 1 ELSE 0 END) AS positive_count,
        SUM(CASE WHEN fb.rating <= 2 THEN 1 ELSE 0 END) AS negative_count
FROM    feedback fb
JOIN    collection_requests cr ON fb.request_id = cr.request_id
JOIN    areas a                ON cr.area_id    = a.area_id
JOIN    waste_categories wc    ON cr.category_id = wc.category_id
GROUP BY a.area_id, a.area_name, wc.category_id, wc.category_name
ORDER BY avg_rating DESC;

-- =============================================================================
-- QUERY 21: INSERT Example
-- Insert a new collection request for a citizen.
-- =============================================================================
INSERT INTO collection_requests
    (citizen_id, category_id, area_id, estimated_quantity_kg,
     pickup_address, preferred_date, status, notes)
VALUES
    (8, 1, 1, 3.50,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     CURDATE() + INTERVAL 2 DAY,
     'Pending',
     'INSERT example – daily household kitchen waste');

-- Verify the insert
SELECT * FROM collection_requests WHERE request_id = LAST_INSERT_ID();

-- =============================================================================
-- QUERY 22: UPDATE Example
-- Update the status of a pending request to 'Cancelled' and add a note.
-- =============================================================================
UPDATE collection_requests
SET    status = 'Cancelled',
       notes  = CONCAT(IFNULL(notes, ''), ' | Cancelled via Query 22 demo.')
WHERE  request_id = LAST_INSERT_ID()
AND    status = 'Pending';

-- Verify the update
SELECT request_id, status, notes
FROM   collection_requests
WHERE  request_id = LAST_INSERT_ID();

-- =============================================================================
-- QUERY 23: DELETE Example (with safety)
-- Delete a cancelled request ONLY if it has no linked assignments, segregation
-- records, recycling records, or feedback. This prevents orphaned child rows.
-- =============================================================================
DELETE FROM collection_requests
WHERE  request_id = LAST_INSERT_ID()
AND    status = 'Cancelled'
AND    NOT EXISTS (SELECT 1 FROM assignments        WHERE request_id = LAST_INSERT_ID())
AND    NOT EXISTS (SELECT 1 FROM segregation_records WHERE request_id = LAST_INSERT_ID())
AND    NOT EXISTS (SELECT 1 FROM recycling_records   WHERE request_id = LAST_INSERT_ID())
AND    NOT EXISTS (SELECT 1 FROM feedback            WHERE request_id = LAST_INSERT_ID());

-- =============================================================================
-- QUERY 24: Transaction with COMMIT
-- Atomically assign a worker to a pending request:
--   1. Update request status to 'Assigned'
--   2. Create an assignment record
--   3. Update worker availability to 'Busy'
-- All three steps succeed or none do.
-- =============================================================================
START TRANSACTION;

    -- Step 1: Update request status
    UPDATE collection_requests
    SET    status = 'Assigned'
    WHERE  request_id = 19
    AND    status = 'Pending';

    -- Step 2: Create assignment
    INSERT INTO assignments (request_id, worker_id, assigned_by, assignment_status)
    VALUES (19, 4, 1, 'Active');

    -- Step 3: Mark worker as busy
    UPDATE workers
    SET    availability_status = 'Busy'
    WHERE  worker_id = 4;

COMMIT;

-- Verify the transaction
SELECT cr.request_id, cr.status, asgn.worker_id, asgn.assignment_status
FROM   collection_requests cr
JOIN   assignments asgn ON cr.request_id = asgn.request_id
WHERE  cr.request_id = 19;

-- =============================================================================
-- QUERY 25: Transaction with ROLLBACK on Error
-- Demonstrate a transaction that detects an error condition and rolls back.
-- Scenario: Try to assign a worker who is 'On Leave' – should roll back.
-- =============================================================================
START TRANSACTION;

    -- Check worker availability before proceeding
    SET @worker_status = (SELECT availability_status FROM workers WHERE worker_id = 5);

    -- Attempt the assignment (this will be rolled back)
    INSERT INTO assignments (request_id, worker_id, assigned_by, assignment_status)
    VALUES (20, 5, 1, 'Active');

    -- If worker is on leave, ROLLBACK; otherwise COMMIT
    -- Note: In a stored procedure, this would use IF/ELSE with DECLARE HANDLER.
    -- Here we demonstrate the ROLLBACK concept.

ROLLBACK;

-- After ROLLBACK, verify no assignment was created for request 20 with worker 5
SELECT COUNT(*) AS should_be_zero
FROM   assignments
WHERE  request_id = 20
AND    worker_id = 5;

-- =============================================================================
-- BONUS QUERY 26: Window Function – Running Total of Collections per Month
-- Uses ROW_NUMBER and SUM OVER for analytical reporting (MySQL 8.0+).
-- =============================================================================
SELECT  DATE_FORMAT(cr.completed_at, '%Y-%m')    AS month,
        COUNT(*)                                  AS monthly_collections,
        ROUND(SUM(cr.actual_quantity_kg), 2)      AS monthly_kg,
        ROUND(SUM(SUM(cr.actual_quantity_kg))
              OVER (ORDER BY DATE_FORMAT(cr.completed_at, '%Y-%m')), 2)
                                                  AS running_total_kg
FROM    collection_requests cr
WHERE   cr.status = 'Completed'
AND     cr.completed_at IS NOT NULL
GROUP BY DATE_FORMAT(cr.completed_at, '%Y-%m')
ORDER BY month;

-- =============================================================================
-- BONUS QUERY 27: UNION – Combined Activity Feed
-- Merge recent request creations and status changes into a single
-- chronological activity feed.
-- =============================================================================
(
    SELECT  'New Request'     AS event_type,
            cr.request_id,
            u.full_name       AS actor,
            cr.status         AS detail,
            cr.created_at     AS event_time
    FROM    collection_requests cr
    JOIN    users u ON cr.citizen_id = u.user_id
    ORDER BY cr.created_at DESC
    LIMIT 5
)
UNION ALL
(
    SELECT  'Status Change'   AS event_type,
            csh.request_id,
            u.full_name       AS actor,
            CONCAT(csh.previous_status, ' → ', csh.new_status) AS detail,
            csh.changed_at    AS event_time
    FROM    collection_status_history csh
    LEFT JOIN users u ON csh.changed_by = u.user_id
    ORDER BY csh.changed_at DESC
    LIMIT 5
)
ORDER BY event_time DESC;

-- =============================================================================
-- End of Queries File
-- Total: 27 queries covering SELECT, JOIN, subqueries, aggregates, CASE,
--        date functions, window functions, INSERT, UPDATE, DELETE,
--        transactions (COMMIT & ROLLBACK), and UNION.
-- =============================================================================
