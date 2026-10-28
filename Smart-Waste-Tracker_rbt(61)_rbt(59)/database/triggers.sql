-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- Database Triggers Definition
-- =============================================================================
-- Database: smart_waste_db
-- Description: Business rules, audit logging, and automated integrity triggers.
-- =============================================================================

USE smart_waste_db;

DROP TRIGGER IF EXISTS trg_before_request_insert;
DROP TRIGGER IF EXISTS trg_before_request_update;
DROP TRIGGER IF EXISTS trg_after_status_change;
DROP TRIGGER IF EXISTS trg_after_assignment_complete;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- Trigger 1: trg_before_request_insert
-- Fires: BEFORE INSERT ON collection_requests
-- Purpose: Validates that citizen preferred_date is not set in the past.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_before_request_insert
BEFORE INSERT ON collection_requests
FOR EACH ROW
BEGIN
    IF NEW.preferred_date < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Preferred collection date cannot be in the past.';
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- Trigger 2: trg_before_request_update
-- Fires: BEFORE UPDATE ON collection_requests
-- Purpose: Automatically sets completed_at timestamp when status transitions to 'Completed'.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_before_request_update
BEFORE UPDATE ON collection_requests
FOR EACH ROW
BEGIN
    -- If status transitioned to Completed and completed_at is NULL, stamp current time
    IF NEW.status = 'Completed' AND (OLD.status != 'Completed' OR OLD.status IS NULL) THEN
        IF NEW.completed_at IS NULL THEN
            SET NEW.completed_at = NOW();
        END IF;
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- Trigger 3: trg_after_status_change
-- Fires: AFTER UPDATE ON collection_requests
-- Purpose: Automatically maintains audit history in collection_status_history
--          whenever the status column changes.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_after_status_change
AFTER UPDATE ON collection_requests
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO collection_status_history (
            request_id,
            previous_status,
            new_status,
            changed_by,
            changed_at,
            remarks
        ) VALUES (
            NEW.request_id,
            OLD.status,
            NEW.status,
            NULL, -- System/Trigger logged
            NOW(),
            CONCAT('Automatic status audit log: transitioned from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- Trigger 4: trg_after_assignment_complete
-- Fires: AFTER UPDATE ON assignments
-- Purpose: When an assignment is marked Completed, automatically increment the
--          assigned worker's total_collections counter.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_after_assignment_complete
AFTER UPDATE ON assignments
FOR EACH ROW
BEGIN
    IF OLD.assignment_status != 'Completed' AND NEW.assignment_status = 'Completed' THEN
        UPDATE workers
        SET total_collections = total_collections + 1
        WHERE worker_id = NEW.worker_id;
    END IF;
END$$

DELIMITER ;

