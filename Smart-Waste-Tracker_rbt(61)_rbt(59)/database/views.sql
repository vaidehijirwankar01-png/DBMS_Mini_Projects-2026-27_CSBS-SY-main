-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- Database Views
-- =============================================================================
-- Target: MySQL 8.0+
-- Description: Reusable views for dashboards, reports, and application queries.
--              Each view encapsulates complex joins and aggregations so the
--              application layer can query them as simple tables.
-- =============================================================================

USE smart_waste_db;

-- =============================================================================
-- VIEW 1: vw_collection_summary
-- Purpose: Single comprehensive view of every collection request with all
--          related details – citizen name, waste category, area, assigned
--          worker, and current status. Primary view for admin dashboards.
-- =============================================================================
CREATE OR REPLACE VIEW vw_collection_summary AS
SELECT  cr.request_id,
        cr.status,
        cr.preferred_date,
        cr.estimated_quantity_kg,
        cr.actual_quantity_kg,
        cr.pickup_address,
        cr.notes,
        cr.created_at,
        cr.completed_at,

        -- Citizen details
        u_cit.user_id          AS citizen_id,
        u_cit.full_name        AS citizen_name,
        u_cit.email            AS citizen_email,
        u_cit.phone            AS citizen_phone,

        -- Waste category
        wc.category_id,
        wc.category_name,
        wc.color_code,

        -- Area
        a.area_id,
        a.area_name,
        a.postal_code,

        -- Assigned worker (NULL if unassigned)
        w.worker_id,
        u_wkr.full_name        AS worker_name,
        asgn.assignment_status

FROM    collection_requests cr
        JOIN users u_cit             ON cr.citizen_id  = u_cit.user_id
        JOIN waste_categories wc     ON cr.category_id = wc.category_id
        JOIN areas a                 ON cr.area_id     = a.area_id
        LEFT JOIN assignments asgn   ON cr.request_id  = asgn.request_id
                                    AND asgn.assignment_status IN ('Active', 'Completed')
        LEFT JOIN workers w          ON asgn.worker_id  = w.worker_id
        LEFT JOIN users u_wkr        ON w.user_id       = u_wkr.user_id;

-- =============================================================================
-- VIEW 2: vw_area_waste_summary
-- Purpose: Area-level KPIs – total requests, total collected weight, average
--          quantity, and count of pending requests. Used for area comparison
--          dashboards and resource allocation.
-- =============================================================================
CREATE OR REPLACE VIEW vw_area_waste_summary AS
SELECT  a.area_id,
        a.area_name,
        a.postal_code,
        COUNT(cr.request_id)                                              AS total_requests,
        ROUND(SUM(CASE WHEN cr.actual_quantity_kg IS NOT NULL
                       THEN cr.actual_quantity_kg ELSE 0 END), 2)         AS total_collected_kg,
        ROUND(AVG(cr.estimated_quantity_kg), 2)                           AS avg_estimated_kg,
        SUM(CASE WHEN cr.status = 'Pending' THEN 1 ELSE 0 END)           AS pending_count,
        SUM(CASE WHEN cr.status = 'Completed' THEN 1 ELSE 0 END)         AS completed_count,
        SUM(CASE WHEN cr.status = 'Cancelled' THEN 1 ELSE 0 END)         AS cancelled_count
FROM    areas a
        LEFT JOIN collection_requests cr ON a.area_id = cr.area_id
GROUP BY a.area_id, a.area_name, a.postal_code;

-- =============================================================================
-- VIEW 3: vw_worker_performance
-- Purpose: Worker performance metrics – total assigned, total completed,
--          average citizen rating, and total kg collected. Used for worker
--          evaluation and workload balancing.
-- =============================================================================
CREATE OR REPLACE VIEW vw_worker_performance AS
SELECT  w.worker_id,
        u.full_name                                                       AS worker_name,
        u.email                                                           AS worker_email,
        w.availability_status,
        w.joining_date,
        w.total_collections,

        -- Assignment counts
        COUNT(DISTINCT asgn.assignment_id)                                AS total_assigned,
        SUM(CASE WHEN asgn.assignment_status = 'Completed' THEN 1 ELSE 0 END)
                                                                          AS total_completed,
        SUM(CASE WHEN asgn.assignment_status = 'Active' THEN 1 ELSE 0 END)
                                                                          AS currently_active,

        -- Performance metrics
        ROUND(AVG(fb.rating), 1)                                          AS avg_rating,
        ROUND(SUM(CASE WHEN asgn.assignment_status = 'Completed'
                       THEN cr.actual_quantity_kg ELSE 0 END), 2)         AS total_kg_collected

FROM    workers w
        JOIN users u              ON w.user_id     = u.user_id
        LEFT JOIN assignments asgn ON w.worker_id  = asgn.worker_id
        LEFT JOIN collection_requests cr ON asgn.request_id = cr.request_id
        LEFT JOIN feedback fb      ON cr.request_id = fb.request_id
GROUP BY w.worker_id, u.full_name, u.email,
         w.availability_status, w.joining_date, w.total_collections;

-- =============================================================================
-- VIEW 4: vw_monthly_statistics
-- Purpose: Month-over-month collection metrics. Shows total requests,
--          completed requests, total kg collected, and recycled kg for each
--          calendar month. Used for trend analysis and management reports.
-- =============================================================================
CREATE OR REPLACE VIEW vw_monthly_statistics AS
SELECT  YEAR(cr.created_at)                                               AS report_year,
        MONTH(cr.created_at)                                              AS report_month,
        DATE_FORMAT(cr.created_at, '%Y-%m')                               AS month_label,

        -- Request counts
        COUNT(cr.request_id)                                              AS total_requests,
        SUM(CASE WHEN cr.status = 'Completed' THEN 1 ELSE 0 END)         AS completed_requests,
        SUM(CASE WHEN cr.status = 'Cancelled' THEN 1 ELSE 0 END)         AS cancelled_requests,

        -- Weight metrics
        ROUND(SUM(cr.estimated_quantity_kg), 2)                           AS total_estimated_kg,
        ROUND(SUM(CASE WHEN cr.status = 'Completed'
                       THEN cr.actual_quantity_kg ELSE 0 END), 2)         AS total_collected_kg,

        -- Recycled kg (from recycling_records via subquery)
        ROUND(IFNULL((
            SELECT SUM(rr.quantity_kg)
            FROM   recycling_records rr
            JOIN   collection_requests cr2 ON rr.request_id = cr2.request_id
            WHERE  DATE_FORMAT(rr.processed_at, '%Y-%m') = DATE_FORMAT(cr.created_at, '%Y-%m')
            AND    rr.processing_type IN ('Recycling', 'Composting')
        ), 0), 2)                                                         AS recycled_kg

FROM    collection_requests cr
GROUP BY YEAR(cr.created_at), MONTH(cr.created_at), DATE_FORMAT(cr.created_at, '%Y-%m')
ORDER BY report_year DESC, report_month DESC;

-- =============================================================================
-- VIEW 5: vw_category_wise_summary
-- Purpose: Per-category breakdown showing total requests, total weight,
--          average weight, and percentage share of overall waste. Useful for
--          understanding waste composition and planning processing capacity.
-- =============================================================================
CREATE OR REPLACE VIEW vw_category_wise_summary AS
SELECT  wc.category_id,
        wc.category_name,
        wc.color_code,

        COUNT(cr.request_id)                                              AS total_requests,
        ROUND(SUM(cr.estimated_quantity_kg), 2)                           AS total_estimated_kg,
        ROUND(SUM(cr.actual_quantity_kg), 2)                              AS total_actual_kg,
        ROUND(AVG(cr.estimated_quantity_kg), 2)                           AS avg_estimated_kg,

        -- Percentage of total estimated waste
        ROUND(
            SUM(cr.estimated_quantity_kg) * 100.0
            / NULLIF((SELECT SUM(estimated_quantity_kg)
                      FROM collection_requests
                      WHERE status != 'Cancelled'), 0),
            1
        )                                                                 AS pct_of_total,

        -- Segregation quality for this category
        (SELECT COUNT(*)
         FROM   segregation_records sr
         WHERE  sr.category_id = wc.category_id
         AND    sr.is_correctly_segregated = TRUE)                        AS correct_segregations,

        (SELECT COUNT(*)
         FROM   segregation_records sr
         WHERE  sr.category_id = wc.category_id
         AND    sr.is_correctly_segregated = FALSE)                       AS incorrect_segregations

FROM    waste_categories wc
        LEFT JOIN collection_requests cr ON wc.category_id = cr.category_id
                                        AND cr.status != 'Cancelled'
GROUP BY wc.category_id, wc.category_name, wc.color_code
ORDER BY total_estimated_kg DESC;

-- =============================================================================
-- VIEW 6: vw_citizen_request_history
-- Purpose: Citizen-facing view of their own requests with all relevant
--          details. The application filters by citizen_id at query time.
--          Includes assigned worker, feedback status, and current status.
-- =============================================================================
CREATE OR REPLACE VIEW vw_citizen_request_history AS
SELECT  cr.request_id,
        cr.citizen_id,
        u_cit.full_name                    AS citizen_name,
        wc.category_name,
        wc.color_code,
        a.area_name,
        cr.estimated_quantity_kg,
        cr.actual_quantity_kg,
        cr.pickup_address,
        cr.preferred_date,
        cr.status,
        cr.notes,
        cr.created_at,
        cr.completed_at,

        -- Assigned worker (if any)
        u_wkr.full_name                    AS assigned_worker,

        -- Feedback (if given)
        fb.rating                          AS feedback_rating,
        fb.comments                        AS feedback_comments,
        CASE WHEN fb.feedback_id IS NOT NULL THEN TRUE ELSE FALSE END
                                           AS has_feedback

FROM    collection_requests cr
        JOIN users u_cit             ON cr.citizen_id  = u_cit.user_id
        JOIN waste_categories wc     ON cr.category_id = wc.category_id
        JOIN areas a                 ON cr.area_id     = a.area_id
        LEFT JOIN assignments asgn   ON cr.request_id  = asgn.request_id
                                    AND asgn.assignment_status IN ('Active', 'Completed')
        LEFT JOIN workers w          ON asgn.worker_id  = w.worker_id
        LEFT JOIN users u_wkr        ON w.user_id       = u_wkr.user_id
        LEFT JOIN feedback fb        ON cr.request_id   = fb.request_id
                                    AND cr.citizen_id    = fb.citizen_id;

-- =============================================================================
-- VIEW 7: vw_pending_assignments
-- Purpose: Shows collection requests that are in 'Pending' status and do NOT
--          have an active worker assignment. Admins use this view to identify
--          requests needing assignment.
-- =============================================================================
CREATE OR REPLACE VIEW vw_pending_assignments AS
SELECT  cr.request_id,
        u_cit.full_name            AS citizen_name,
        u_cit.phone                AS citizen_phone,
        wc.category_name,
        wc.color_code,
        a.area_name,
        a.postal_code,
        cr.estimated_quantity_kg,
        cr.pickup_address,
        cr.preferred_date,
        cr.notes,
        cr.created_at,
        DATEDIFF(CURDATE(), cr.created_at) AS days_waiting

FROM    collection_requests cr
        JOIN users u_cit         ON cr.citizen_id  = u_cit.user_id
        JOIN waste_categories wc ON cr.category_id = wc.category_id
        JOIN areas a             ON cr.area_id     = a.area_id
        LEFT JOIN assignments asgn ON cr.request_id = asgn.request_id
                                  AND asgn.assignment_status = 'Active'
WHERE   cr.status = 'Pending'
AND     asgn.assignment_id IS NULL
ORDER BY cr.preferred_date ASC;

-- =============================================================================
-- Views creation complete.
-- Summary:
--   1. vw_collection_summary      – Full request details (admin dashboard)
--   2. vw_area_waste_summary      – Area-level KPIs
--   3. vw_worker_performance      – Worker metrics and ratings
--   4. vw_monthly_statistics      – Monthly trend analysis
--   5. vw_category_wise_summary   – Category breakdown with percentages
--   6. vw_citizen_request_history – Citizen's own request history
--   7. vw_pending_assignments     – Unassigned pending requests
-- =============================================================================
