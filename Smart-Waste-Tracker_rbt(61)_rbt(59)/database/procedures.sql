-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- Stored Procedures Definition
-- =============================================================================
-- Database: smart_waste_db
-- Description: Stored procedures with input validation, transactional integrity,
--              and error handling for core business operations.
-- =============================================================================

USE smart_waste_db;

DROP PROCEDURE IF EXISTS sp_create_collection_request;
DROP PROCEDURE IF EXISTS sp_assign_worker;
DROP PROCEDURE IF EXISTS sp_update_collection_status;
DROP PROCEDURE IF EXISTS sp_get_collection_summary;
DROP PROCEDURE IF EXISTS sp_process_recycling;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- Procedure 1: sp_create_collection_request
-- Purpose: Validates input parameters and creates a new waste collection request.
-- Parameters:
--   p_citizen_id   : User ID of the requesting citizen
--   p_category_id  : Waste category ID
--   p_area_id      : Service area ID
--   p_est_quantity : Estimated quantity in kilograms (> 0)
--   p_address      : Full pickup address
--   p_pref_date    : Preferred pickup date (must be today or future)
--   p_notes        : Additional citizen instructions
--   OUT p_request_id : Newly created request ID
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_create_collection_request(
    IN  p_citizen_id     INT,
    IN  p_category_id    INT,
    IN  p_area_id        INT,
    IN  p_est_quantity   DECIMAL(10,2),
    IN  p_address        TEXT,
    IN  p_pref_date      DATE,
    IN  p_notes          TEXT,
    OUT p_request_id     INT
)
BEGIN
    -- Validate citizen existence
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_citizen_id AND role = 'citizen' AND is_active = TRUE) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid or inactive citizen ID.';
    END IF;

    -- Validate category existence
    IF NOT EXISTS (SELECT 1 FROM waste_categories WHERE category_id = p_category_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid waste category ID.';
    END IF;

    -- Validate area existence
    IF NOT EXISTS (SELECT 1 FROM areas WHERE area_id = p_area_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid area ID.';
    END IF;

    -- Validate quantity
    IF p_est_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Estimated quantity must be greater than zero.';
    END IF;

    -- Validate pickup date (cannot be before today)
    IF p_pref_date < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Preferred collection date cannot be in the past.';
    END IF;

    -- Insert collection request
    INSERT INTO collection_requests (
        citizen_id,
        category_id,
        area_id,
        estimated_quantity_kg,
        pickup_address,
        preferred_date,
        status,
        notes,
        created_at
    ) VALUES (
        p_citizen_id,
        p_category_id,
        p_area_id,
        p_est_quantity,
        p_address,
        p_pref_date,
        'Pending',
        p_notes,
        NOW()
    );

    SET p_request_id = LAST_INSERT_ID();

    -- Status history initial log
    INSERT INTO collection_status_history (
        request_id,
        previous_status,
        new_status,
        changed_by,
        changed_at,
        remarks
    ) VALUES (
        p_request_id,
        NULL,
        'Pending',
        p_citizen_id,
        NOW(),
        'Request initially created by citizen'
    );
END$$


-- -----------------------------------------------------------------------------
-- Procedure 2: sp_assign_worker
-- Purpose: Atomically assigns a sanitation worker to a pending request.
--          Validates request status and worker availability.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_assign_worker(
    IN p_request_id INT,
    IN p_worker_id  INT,
    IN p_admin_id   INT
)
BEGIN
    DECLARE v_curr_status VARCHAR(20);
    DECLARE v_worker_avail VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check request status
    SELECT status INTO v_curr_status
    FROM collection_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_curr_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection request does not exist.';
    END IF;

    IF v_curr_status != 'Pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Worker can only be assigned to a Pending request.';
    END IF;

    -- Check worker availability
    SELECT availability_status INTO v_worker_avail
    FROM workers
    WHERE worker_id = p_worker_id
    FOR UPDATE;

    IF v_worker_avail IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sanitation worker does not exist.';
    END IF;

    IF v_worker_avail != 'Available' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected worker is not currently Available.';
    END IF;

    -- Create assignment record
    INSERT INTO assignments (
        request_id,
        worker_id,
        assigned_by,
        assigned_at,
        assignment_status
    ) VALUES (
        p_request_id,
        p_worker_id,
        p_admin_id,
        NOW(),
        'Active'
    );

    -- Update request status
    UPDATE collection_requests
    SET status = 'Assigned',
        updated_at = NOW()
    WHERE request_id = p_request_id;

    -- Update worker status
    UPDATE workers
    SET availability_status = 'Busy'
    WHERE worker_id = p_worker_id;

    -- Record status transition in history
    INSERT INTO collection_status_history (
        request_id,
        previous_status,
        new_status,
        changed_by,
        changed_at,
        remarks
    ) VALUES (
        p_request_id,
        'Pending',
        'Assigned',
        p_admin_id,
        NOW(),
        CONCAT('Assigned to worker ID: ', p_worker_id)
    );

    COMMIT;
END$$


-- -----------------------------------------------------------------------------
-- Procedure 3: sp_update_collection_status
-- Purpose: Handles request status lifecycle transitions (Assigned -> In Progress ->
--          Collected -> Completed) with appropriate transaction handling.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_update_collection_status(
    IN p_request_id INT,
    IN p_new_status VARCHAR(20),
    IN p_user_id    INT,
    IN p_actual_qty DECIMAL(10,2),
    IN p_remarks    TEXT
)
BEGIN
    DECLARE v_prev_status VARCHAR(20);
    DECLARE v_worker_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_prev_status
    FROM collection_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_prev_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection request not found.';
    END IF;

    -- Validate permitted transitions
    IF v_prev_status = 'Pending' AND p_new_status NOT IN ('Assigned', 'Cancelled') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid transition from Pending.';
    ELSEIF v_prev_status = 'Assigned' AND p_new_status NOT IN ('In Progress', 'Cancelled') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid transition from Assigned.';
    ELSEIF v_prev_status = 'In Progress' AND p_new_status NOT IN ('Collected') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid transition from In Progress.';
    ELSEIF v_prev_status = 'Collected' AND p_new_status NOT IN ('Completed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid transition from Collected.';
    END IF;

    -- Update request
    IF p_new_status = 'Collected' THEN
        IF p_actual_qty IS NULL OR p_actual_qty < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Actual collected quantity must be non-negative.';
        END IF;

        UPDATE collection_requests
        SET status = p_new_status,
            actual_quantity_kg = p_actual_qty,
            updated_at = NOW()
        WHERE request_id = p_request_id;

    ELSEIF p_new_status = 'Completed' THEN
        UPDATE collection_requests
        SET status = p_new_status,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE request_id = p_request_id;

        -- Find worker and release them to Available
        SELECT worker_id INTO v_worker_id
        FROM assignments
        WHERE request_id = p_request_id AND assignment_status = 'Active'
        LIMIT 1;

        IF v_worker_id IS NOT NULL THEN
            UPDATE assignments
            SET assignment_status = 'Completed'
            WHERE request_id = p_request_id AND worker_id = v_worker_id;

            UPDATE workers
            SET availability_status = 'Available',
                total_collections = total_collections + 1
            WHERE worker_id = v_worker_id;
        END IF;

    ELSEIF p_new_status = 'Cancelled' THEN
        UPDATE collection_requests
        SET status = p_new_status,
            updated_at = NOW()
        WHERE request_id = p_request_id;

        -- Release assigned worker if any
        SELECT worker_id INTO v_worker_id
        FROM assignments
        WHERE request_id = p_request_id AND assignment_status = 'Active'
        LIMIT 1;

        IF v_worker_id IS NOT NULL THEN
            UPDATE assignments
            SET assignment_status = 'Cancelled'
            WHERE request_id = p_request_id AND worker_id = v_worker_id;

            UPDATE workers
            SET availability_status = 'Available'
            WHERE worker_id = v_worker_id;
        END IF;

    ELSE
        UPDATE collection_requests
        SET status = p_new_status,
            updated_at = NOW()
        WHERE request_id = p_request_id;
    END IF;

    -- Record status history
    INSERT INTO collection_status_history (
        request_id,
        previous_status,
        new_status,
        changed_by,
        changed_at,
        remarks
    ) VALUES (
        p_request_id,
        v_prev_status,
        p_new_status,
        p_user_id,
        NOW(),
        p_remarks
    );

    COMMIT;
END$$


-- -----------------------------------------------------------------------------
-- Procedure 4: sp_get_collection_summary
-- Purpose: Aggregates collection performance metrics for a specified date range.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_get_collection_summary(
    IN p_start_date DATE,
    IN p_end_date   DATE
)
BEGIN
    SELECT 
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_requests,
        COALESCE(SUM(estimated_quantity_kg), 0) AS total_estimated_kg,
        COALESCE(SUM(actual_quantity_kg), 0) AS total_collected_kg,
        COALESCE(AVG(actual_quantity_kg), 0) AS avg_collection_kg
    FROM collection_requests
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
END$$


-- -----------------------------------------------------------------------------
-- Procedure 5: sp_process_recycling
-- Purpose: Records recycling / processing details for a completed collection request.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_process_recycling(
    IN p_request_id      INT,
    IN p_quantity_kg     DECIMAL(10,2),
    IN p_processing_type VARCHAR(50),
    IN p_destination     VARCHAR(200),
    IN p_notes           TEXT
)
BEGIN
    DECLARE v_status VARCHAR(20);

    IF p_quantity_kg <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recycling quantity must be greater than zero.';
    END IF;

    SELECT status INTO v_status
    FROM collection_requests
    WHERE request_id = p_request_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection request does not exist.';
    END IF;

    IF v_status NOT IN ('Collected', 'Completed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recycling can only be recorded for Collected or Completed requests.';
    END IF;

    INSERT INTO recycling_records (
        request_id,
        quantity_kg,
        processing_type,
        destination,
        processed_at,
        notes
    ) VALUES (
        p_request_id,
        p_quantity_kg,
        p_processing_type,
        p_destination,
        NOW(),
        p_notes
    );
END$$

DELIMITER ;

