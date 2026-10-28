-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- Database Schema Definition
-- =============================================================================
-- Target: MySQL 8.0+ with InnoDB engine
-- Description: Complete schema for managing urban waste collection, segregation,
--              recycling, and citizen-worker coordination.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DATABASE CREATION
-- Drop existing database (if any) and create a fresh instance.
-- WARNING: This will destroy all existing data in smart_waste_db!
-- -----------------------------------------------------------------------------
DROP DATABASE IF EXISTS smart_waste_db;
CREATE DATABASE smart_waste_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE smart_waste_db;

-- =============================================================================
-- 2. TABLE DEFINITIONS
-- Tables are created in dependency order:
--   Level 0 (no FKs)  : areas, waste_categories
--   Level 1            : users (depends on areas)
--   Level 2            : collection_requests (depends on users, waste_categories, areas)
--                        workers (depends on users)
--   Level 3            : assignments (depends on collection_requests, workers, users)
--                        segregation_records (depends on collection_requests, waste_categories, users)
--                        recycling_records (depends on collection_requests)
--                        feedback (depends on collection_requests, users)
--                        collection_status_history (depends on collection_requests, users)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: areas
-- Stores geographic service areas / zones for waste collection routing.
-- Each area represents a distinct locality or neighborhood.
-- -----------------------------------------------------------------------------
CREATE TABLE areas (
    area_id     INT             AUTO_INCREMENT,
    area_name   VARCHAR(100)    NOT NULL        COMMENT 'Display name of the service area',
    locality    VARCHAR(200)                    COMMENT 'Detailed locality / neighborhood description',
    postal_code VARCHAR(10)     NOT NULL        COMMENT 'PIN code or postal code for the area',
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
                                                COMMENT 'Record creation timestamp',

    PRIMARY KEY (area_id)
) ENGINE=InnoDB
  COMMENT='Geographic service areas for waste collection routing';

-- -----------------------------------------------------------------------------
-- Table: waste_categories
-- Master list of waste types used for classification and segregation.
-- Categories drive colour-coded bins, UI labels, and reporting.
-- -----------------------------------------------------------------------------
CREATE TABLE waste_categories (
    category_id             INT             AUTO_INCREMENT,
    category_name           VARCHAR(50)     NOT NULL        COMMENT 'Short label (e.g., Wet/Organic)',
    description             TEXT                            COMMENT 'Detailed description of the waste type',
    segregation_instructions TEXT                           COMMENT 'Instructions for citizens on how to segregate',
    color_code              VARCHAR(7)                      COMMENT 'Hex colour code for UI representation (e.g., #00FF00)',

    PRIMARY KEY (category_id),
    UNIQUE KEY uq_category_name (category_name)
) ENGINE=InnoDB
  COMMENT='Master table of waste categories for segregation';

-- -----------------------------------------------------------------------------
-- Table: users
-- Central user table covering all roles: admin, citizen, worker.
-- Role-based access control is enforced at the application layer using the
-- 'role' ENUM column. Workers have an additional detail row in the workers table.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id       INT             AUTO_INCREMENT,
    full_name     VARCHAR(100)    NOT NULL        COMMENT 'Full display name of the user',
    email         VARCHAR(100)    NOT NULL        COMMENT 'Login email – must be unique',
    password_hash VARCHAR(255)    NOT NULL        COMMENT 'Werkzeug-compatible password hash',
    phone         VARCHAR(15)                     COMMENT 'Contact phone number',
    role          ENUM('admin', 'citizen', 'worker')
                                  NOT NULL
                                  DEFAULT 'citizen'
                                                  COMMENT 'Application role for access control',
    area_id       INT             DEFAULT NULL    COMMENT 'Home area of the user (nullable)',
    is_active     BOOLEAN         DEFAULT TRUE    COMMENT 'Soft-delete flag; FALSE = deactivated',
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
                                                  COMMENT 'Account creation timestamp',
    updated_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP
                                                  COMMENT 'Last profile update timestamp',

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_user_email (email),

    -- A user optionally belongs to an area; if the area is removed, keep the user.
    CONSTRAINT fk_users_area
        FOREIGN KEY (area_id) REFERENCES areas (area_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='All application users (admins, citizens, workers)';

-- -----------------------------------------------------------------------------
-- Table: collection_requests
-- Core transactional table. Each row represents a citizen's request to have
-- waste picked up from a specified address.
-- Lifecycle: Pending -> Assigned -> In Progress -> Collected -> Completed
--            (or Cancelled at any point)
-- -----------------------------------------------------------------------------
CREATE TABLE collection_requests (
    request_id          INT             AUTO_INCREMENT,
    citizen_id          INT             NOT NULL        COMMENT 'Citizen who raised this request',
    category_id         INT             NOT NULL        COMMENT 'Primary waste category',
    area_id             INT             NOT NULL        COMMENT 'Service area for pickup',
    estimated_quantity_kg DECIMAL(10,2) NOT NULL        COMMENT 'Citizen-estimated weight in kg',
    actual_quantity_kg  DECIMAL(10,2)   DEFAULT NULL    COMMENT 'Worker-measured weight after pickup',
    pickup_address      TEXT            NOT NULL        COMMENT 'Full address for waste collection',
    preferred_date      DATE            NOT NULL        COMMENT 'Citizen-preferred pickup date',
    status              ENUM('Pending', 'Assigned', 'In Progress',
                             'Collected', 'Completed', 'Cancelled')
                                        NOT NULL
                                        DEFAULT 'Pending'
                                                        COMMENT 'Current lifecycle status',
    notes               TEXT                            COMMENT 'Additional instructions or comments',
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    completed_at        DATETIME        DEFAULT NULL    COMMENT 'Timestamp when status became Completed',

    PRIMARY KEY (request_id),

    -- Quantity checks
    CONSTRAINT chk_estimated_qty CHECK (estimated_quantity_kg > 0),
    CONSTRAINT chk_actual_qty    CHECK (actual_quantity_kg >= 0),

    -- Foreign keys
    CONSTRAINT fk_requests_citizen
        FOREIGN KEY (citizen_id) REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_requests_category
        FOREIGN KEY (category_id) REFERENCES waste_categories (category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_requests_area
        FOREIGN KEY (area_id) REFERENCES areas (area_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Citizen waste collection requests – core transactional table';

-- -----------------------------------------------------------------------------
-- Table: workers
-- Extended profile for users with role='worker'. Tracks availability and
-- cumulative collection count for performance monitoring.
-- -----------------------------------------------------------------------------
CREATE TABLE workers (
    worker_id           INT             AUTO_INCREMENT,
    user_id             INT             NOT NULL        COMMENT 'Link to the users table',
    availability_status ENUM('Available', 'Busy', 'On Leave')
                                        DEFAULT 'Available'
                                                        COMMENT 'Current scheduling availability',
    joining_date        DATE            NOT NULL        COMMENT 'Date worker joined the service',
    total_collections   INT             DEFAULT 0       COMMENT 'Cumulative completed collections',

    PRIMARY KEY (worker_id),
    UNIQUE KEY uq_worker_user (user_id),

    CONSTRAINT fk_workers_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Worker-specific details linked to the users table';

-- -----------------------------------------------------------------------------
-- Table: assignments
-- Maps collection requests to workers. An admin assigns a worker; the unique
-- key prevents two active assignments for the same request.
-- -----------------------------------------------------------------------------
CREATE TABLE assignments (
    assignment_id     INT         AUTO_INCREMENT,
    request_id        INT         NOT NULL    COMMENT 'Collection request being assigned',
    worker_id         INT         NOT NULL    COMMENT 'Worker assigned to this request',
    assigned_by       INT         NOT NULL    COMMENT 'Admin who made the assignment',
    assigned_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    assignment_status ENUM('Active', 'Completed', 'Cancelled')
                                  DEFAULT 'Active'
                                              COMMENT 'Current state of this assignment',

    PRIMARY KEY (assignment_id),

    -- Prevent duplicate active assignments for the same request
    UNIQUE KEY unique_active_assignment (request_id, assignment_status),

    CONSTRAINT fk_assignments_request
        FOREIGN KEY (request_id) REFERENCES collection_requests (request_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_assignments_worker
        FOREIGN KEY (worker_id) REFERENCES workers (worker_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_assignments_admin
        FOREIGN KEY (assigned_by) REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Worker-to-request assignment records';

-- -----------------------------------------------------------------------------
-- Table: segregation_records
-- Records how waste from a request was segregated into categories.
-- Used to track whether citizens segregated waste correctly.
-- -----------------------------------------------------------------------------
CREATE TABLE segregation_records (
    segregation_id          INT             AUTO_INCREMENT,
    request_id              INT             NOT NULL    COMMENT 'Parent collection request',
    category_id             INT             NOT NULL    COMMENT 'Waste category of this portion',
    quantity_kg             DECIMAL(10,2)   NOT NULL    COMMENT 'Weight segregated into this category',
    is_correctly_segregated BOOLEAN         DEFAULT NULL
                                                        COMMENT 'NULL=not yet verified, TRUE/FALSE=verified',
    segregation_status      ENUM('Pending', 'Verified', 'Incorrect')
                                            DEFAULT 'Pending',
    recorded_by             INT             DEFAULT NULL COMMENT 'Worker/admin who recorded this',
    recorded_at             TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    remarks                 TEXT                        COMMENT 'Notes on segregation quality',

    PRIMARY KEY (segregation_id),

    CONSTRAINT chk_segregation_qty CHECK (quantity_kg >= 0),

    CONSTRAINT fk_segregation_request
        FOREIGN KEY (request_id) REFERENCES collection_requests (request_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_segregation_category
        FOREIGN KEY (category_id) REFERENCES waste_categories (category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_segregation_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Detailed segregation breakdown per collection request';

-- -----------------------------------------------------------------------------
-- Table: recycling_records
-- Tracks how collected waste was processed (recycled, composted, landfilled, etc.).
-- Links back to the original collection request for end-to-end traceability.
-- -----------------------------------------------------------------------------
CREATE TABLE recycling_records (
    recycling_id    INT             AUTO_INCREMENT,
    request_id      INT             NOT NULL        COMMENT 'Source collection request',
    quantity_kg     DECIMAL(10,2)   NOT NULL        COMMENT 'Weight processed',
    processing_type ENUM('Recycling', 'Composting', 'Landfill',
                         'Incineration', 'Special Treatment')
                                    NOT NULL        COMMENT 'Method of processing/disposal',
    destination     VARCHAR(200)                    COMMENT 'Processing facility or site name',
    processed_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT                            COMMENT 'Additional processing notes',

    PRIMARY KEY (recycling_id),

    CONSTRAINT chk_recycling_qty CHECK (quantity_kg >= 0),

    CONSTRAINT fk_recycling_request
        FOREIGN KEY (request_id) REFERENCES collection_requests (request_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Waste processing and recycling disposition records';

-- -----------------------------------------------------------------------------
-- Table: feedback
-- Citizens rate the collection service after completion.
-- Enforces one feedback per citizen per request via a unique key.
-- -----------------------------------------------------------------------------
CREATE TABLE feedback (
    feedback_id  INT         AUTO_INCREMENT,
    request_id   INT         NOT NULL    COMMENT 'Collection request being rated',
    citizen_id   INT         NOT NULL    COMMENT 'Citizen providing the feedback',
    rating       INT         NOT NULL    COMMENT 'Star rating 1 (worst) to 5 (best)',
    comments     TEXT                    COMMENT 'Free-text feedback',
    submitted_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (feedback_id),

    -- One feedback per citizen per request
    UNIQUE KEY unique_feedback (request_id, citizen_id),

    -- Rating must be between 1 and 5
    CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5),

    CONSTRAINT fk_feedback_request
        FOREIGN KEY (request_id) REFERENCES collection_requests (request_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_feedback_citizen
        FOREIGN KEY (citizen_id) REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Citizen feedback and ratings for completed collections';

-- -----------------------------------------------------------------------------
-- Table: collection_status_history
-- Audit trail for every status change on a collection request.
-- Populated by the application layer or by triggers.
-- -----------------------------------------------------------------------------
CREATE TABLE collection_status_history (
    history_id      INT         AUTO_INCREMENT,
    request_id      INT         NOT NULL    COMMENT 'Collection request whose status changed',
    previous_status VARCHAR(20)             COMMENT 'Status before the change (NULL for initial)',
    new_status      VARCHAR(20) NOT NULL    COMMENT 'Status after the change',
    changed_by      INT         DEFAULT NULL COMMENT 'User who triggered the change',
    changed_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    remarks         TEXT                    COMMENT 'Reason or notes for the status change',

    PRIMARY KEY (history_id),

    CONSTRAINT fk_history_request
        FOREIGN KEY (request_id) REFERENCES collection_requests (request_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_history_changed_by
        FOREIGN KEY (changed_by) REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Audit log of collection request status transitions';

-- =============================================================================
-- Schema creation complete.
-- Next steps:
--   1. Run indexes.sql   to add performance indexes
--   2. Run triggers.sql  to add business-rule triggers
--   3. Run procedures.sql to add stored procedures
--   4. Run views.sql     to add reporting views
--   5. Run seed.sql      to populate sample data
-- =============================================================================
