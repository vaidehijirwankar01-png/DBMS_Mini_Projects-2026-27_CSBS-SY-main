-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- Database Indexes & Performance Optimization
-- =============================================================================
-- Database: smart_waste_db
-- Description: B-Tree indexes for accelerating search, filtering, join operations,
--              and analytical queries across the relational schema.
-- =============================================================================

USE smart_waste_db;

-- -----------------------------------------------------------------------------
-- 1. COLLECTION REQUESTS INDEXES
-- Most critical operational table; heavily filtered and joined.
-- -----------------------------------------------------------------------------

-- Filter by lifecycle status (e.g. finding all 'Pending' requests for assignment)
CREATE INDEX idx_requests_status 
ON collection_requests(status);

-- Filter citizen's personal history and dashboard queries
CREATE INDEX idx_requests_citizen 
ON collection_requests(citizen_id);

-- Scheduling and daily route planning by preferred pickup date
CREATE INDEX idx_requests_preferred_date 
ON collection_requests(preferred_date);

-- Area-wise geospatial aggregation and dispatch routing
CREATE INDEX idx_requests_area 
ON collection_requests(area_id);

-- Waste category-wise breakdown and segregation reporting
CREATE INDEX idx_requests_category 
ON collection_requests(category_id);

-- Composite index for citizen portal status queries
CREATE INDEX idx_requests_citizen_status 
ON collection_requests(citizen_id, status);


-- -----------------------------------------------------------------------------
-- 2. WORKER & ASSIGNMENTS INDEXES
-- Accelerates worker dispatch lookups and active assignment resolution.
-- -----------------------------------------------------------------------------

-- Find active or completed assignments for a specific worker
CREATE INDEX idx_assignments_worker 
ON assignments(worker_id);

-- Lookup assignment corresponding to a collection request
CREATE INDEX idx_assignments_request 
ON assignments(request_id);

-- Composite index for worker task status filtering
CREATE INDEX idx_assignments_worker_status 
ON assignments(worker_id, assignment_status);

-- Filter workers by current availability status (Available / Busy / On Leave)
CREATE INDEX idx_workers_availability 
ON workers(availability_status);


-- -----------------------------------------------------------------------------
-- 3. AUDIT, SEGREGATION, RECYCLING & FEEDBACK INDEXES
-- Accelerates child table lookups during request detail display and reporting.
-- -----------------------------------------------------------------------------

-- Retrieve segregation verification records for a request
CREATE INDEX idx_segregation_request 
ON segregation_records(request_id);

-- Retrieve recycling and disposal records for a request
CREATE INDEX idx_recycling_request 
ON recycling_records(request_id);

-- Retrieve feedback records associated with a request
CREATE INDEX idx_feedback_request 
ON feedback(request_id);

-- Retrieve status transition history for a request
CREATE INDEX idx_status_history_request 
ON collection_status_history(request_id);


-- -----------------------------------------------------------------------------
-- 4. USERS & GEOGRAPHY INDEXES
-- -----------------------------------------------------------------------------

-- Filter users by role ('admin', 'citizen', 'worker')
CREATE INDEX idx_users_role 
ON users(role);

-- Group users by geographic residential area
CREATE INDEX idx_users_area 
ON users(area_id);


-- =============================================================================
-- EXPLAIN QUERY PERFORMANCE EXAMPLES
-- Demonstrates query optimization and index usage to faculty / evaluators.
-- =============================================================================

-- Example A: Explain search for Pending requests in a specific area
EXPLAIN
SELECT request_id, citizen_id, estimated_quantity_kg, preferred_date
FROM collection_requests
WHERE status = 'Pending' AND area_id = 1;

-- Example B: Explain citizen history with sorting
EXPLAIN
SELECT request_id, category_id, status, preferred_date
FROM collection_requests
WHERE citizen_id = 3
ORDER BY preferred_date DESC;

-- Example C: Explain worker assignment resolution join
EXPLAIN
SELECT a.assignment_id, w.worker_id, u.full_name, cr.pickup_address, cr.status
FROM assignments a
JOIN workers w ON a.worker_id = w.worker_id
JOIN users u ON w.user_id = u.user_id
JOIN collection_requests cr ON a.request_id = cr.request_id
WHERE a.assignment_status = 'Active';

