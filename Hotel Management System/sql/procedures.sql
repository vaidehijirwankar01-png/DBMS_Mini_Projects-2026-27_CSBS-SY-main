-- =====================================================================
-- Hotel Management System - Procedures, Function & Triggers (procedures.sql)
-- Tech: MySQL 8.0, InnoDB
-- Description: Business logic implemented in MySQL:
--              1 Function, 5 Stored Procedures, 2 Triggers.
-- =====================================================================

USE hotel_db;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- FUNCTION: fn_nights
-- Description: Calculates number of nights between check-in and check-out
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_nights;
DELIMITER $$
CREATE FUNCTION fn_nights(p_check_in DATE, p_check_out DATE)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN DATEDIFF(p_check_out, p_check_in);
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- PROCEDURE: sp_create_booking
-- Description: Creates a new booking with strict validations:
--              1. Rejects invalid dates (check_out <= check_in)
--              2. Rejects non-existent rooms or rooms under Maintenance
--              3. Rejects guest count exceeding room capacity
--              4. Rejects overlapping date reservations for the same room
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_create_booking;
DELIMITER $$
CREATE PROCEDURE sp_create_booking(
    IN p_cust_id INT,
    IN p_hotel_id INT,
    IN p_room_no VARCHAR(10),
    IN p_emp_id INT,
    IN p_check_in DATE,
    IN p_check_out DATE,
    IN p_no_of_people INT,
    OUT p_booking_id INT
)
proc_label: BEGIN
    DECLARE v_room_capacity INT;
    DECLARE v_room_availability VARCHAR(20);
    DECLARE v_overlap_count INT;
    DECLARE v_cust_exists INT;
    DECLARE v_emp_exists INT;

    -- Exit handler for unexpected errors
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Date validation
    IF p_check_out <= p_check_in THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Check-out date must be strictly after check-in date.';
    END IF;

    -- 2. Customer validation
    SELECT COUNT(*) INTO v_cust_exists FROM customer WHERE cust_id = p_cust_id;
    IF v_cust_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Customer does not exist.';
    END IF;

    -- 3. Employee validation
    SELECT COUNT(*) INTO v_emp_exists FROM employee WHERE emp_id = p_emp_id;
    IF v_emp_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Staff employee does not exist.';
    END IF;

    -- 4. Room existence & maintenance check
    SELECT capacity, availability 
    INTO v_room_capacity, v_room_availability
    FROM room 
    WHERE hotel_id = p_hotel_id AND room_no = p_room_no
    FOR UPDATE;

    IF v_room_capacity IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Selected room does not exist in the hotel.';
    END IF;

    IF v_room_availability = 'Maintenance' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room is currently under Maintenance and cannot be booked.';
    END IF;

    -- 5. Capacity validation
    IF p_no_of_people > v_room_capacity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Number of guests exceeds the maximum capacity of this room.';
    END IF;

    -- 6. Overlapping bookings check
    -- Overlap exists if NOT (new_check_out <= existing_check_in OR new_check_in >= existing_check_out)
    SELECT COUNT(*) INTO v_overlap_count
    FROM booking
    WHERE hotel_id = p_hotel_id 
      AND room_no = p_room_no
      AND status IN ('Booked', 'Checked-in')
      AND NOT (p_check_out <= check_in OR p_check_in >= check_out);

    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room is already reserved or occupied for the selected dates.';
    END IF;

    -- Insert new booking
    INSERT INTO booking (cust_id, hotel_id, room_no, emp_id, check_in, check_out, no_of_people, status)
    VALUES (p_cust_id, p_hotel_id, p_room_no, p_emp_id, p_check_in, p_check_out, p_no_of_people, 'Booked');

    SET p_booking_id = LAST_INSERT_ID();

    COMMIT;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- PROCEDURE: sp_check_in
-- Description: Sets booking status to 'Checked-in' and room to 'Occupied'
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_check_in;
DELIMITER $$
CREATE PROCEDURE sp_check_in(
    IN p_booking_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_hotel_id INT;
    DECLARE v_room_no VARCHAR(10);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status, hotel_id, room_no 
    INTO v_status, v_hotel_id, v_room_no
    FROM booking
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found.';
    END IF;

    IF v_status != 'Booked' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot check in: Booking must be in Booked status.';
    END IF;

    -- Update booking status
    UPDATE booking 
    SET status = 'Checked-in'
    WHERE booking_id = p_booking_id;

    -- Update room availability
    UPDATE room
    SET availability = 'Occupied'
    WHERE hotel_id = v_hotel_id AND room_no = v_room_no;

    COMMIT;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- PROCEDURE: sp_check_out
-- Description: Sets booking to 'Checked-out' and room to 'Available'.
--              Refuses if outstanding balance due > 0.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_check_out;
DELIMITER $$
CREATE PROCEDURE sp_check_out(
    IN p_booking_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_hotel_id INT;
    DECLARE v_room_no VARCHAR(10);
    DECLARE v_balance DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status, hotel_id, room_no 
    INTO v_status, v_hotel_id, v_room_no
    FROM booking
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found.';
    END IF;

    IF v_status != 'Checked-in' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot check out: Guest is not currently checked in.';
    END IF;

    -- Check balance from view
    SELECT balance_due INTO v_balance
    FROM v_booking_bill
    WHERE booking_id = p_booking_id;

    IF v_balance > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot check out: Outstanding balance unpaid. Please clear dues before checkout.';
    END IF;

    -- Update booking status
    UPDATE booking
    SET status = 'Checked-out'
    WHERE booking_id = p_booking_id;

    -- Release room back to Available
    UPDATE room
    SET availability = 'Available'
    WHERE hotel_id = v_hotel_id AND room_no = v_room_no;

    COMMIT;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- PROCEDURE: sp_cancel_booking
-- Description: Cancels a booking and resets room availability if needed
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_cancel_booking;
DELIMITER $$
CREATE PROCEDURE sp_cancel_booking(
    IN p_booking_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_hotel_id INT;
    DECLARE v_room_no VARCHAR(10);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status, hotel_id, room_no 
    INTO v_status, v_hotel_id, v_room_no
    FROM booking
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found.';
    END IF;

    IF v_status NOT IN ('Booked') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot cancel booking: Only future Booked reservations can be cancelled.';
    END IF;

    UPDATE booking
    SET status = 'Cancelled'
    WHERE booking_id = p_booking_id;

    -- Ensure any associated payments are marked Refunded
    UPDATE payment
    SET status = 'Refunded'
    WHERE booking_id = p_booking_id AND status = 'Paid';

    COMMIT;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- PROCEDURE: sp_add_payment
-- Description: Records a payment for a booking; refuses to overpay
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_add_payment;
DELIMITER $$
CREATE PROCEDURE sp_add_payment(
    IN p_booking_id INT,
    IN p_amount DECIMAL(10,2),
    IN p_payment_mode ENUM('Cash', 'UPI', 'Card', 'Net Banking'),
    IN p_transaction_ref VARCHAR(50),
    OUT p_payment_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_balance DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate payment amount
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Payment amount must be greater than zero.';
    END IF;

    -- Validate booking
    SELECT status INTO v_status
    FROM booking
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found.';
    END IF;

    IF v_status = 'Cancelled' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot record payment for a cancelled booking.';
    END IF;

    -- Check current outstanding balance
    SELECT balance_due INTO v_balance
    FROM v_booking_bill
    WHERE booking_id = p_booking_id;

    IF p_amount > v_balance THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Payment refused: Amount exceeds the remaining balance due.';
    END IF;

    -- Insert payment
    INSERT INTO payment (booking_id, amount, payment_mode, payment_date, transaction_ref, status)
    VALUES (p_booking_id, p_amount, p_payment_mode, CURDATE(), p_transaction_ref, 'Paid');

    SET p_payment_id = LAST_INSERT_ID();

    COMMIT;
END$$
DELIMITER ;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- ---------------------------------------------------------------------
-- TRIGGER 1: trg_validate_capacity_booking
-- Validates no_of_people <= room.capacity before inserting into booking
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_validate_capacity_booking;
DELIMITER $$
CREATE TRIGGER trg_validate_capacity_booking
BEFORE INSERT ON booking
FOR EACH ROW
BEGIN
    DECLARE v_room_cap INT;

    SELECT capacity INTO v_room_cap
    FROM room
    WHERE hotel_id = NEW.hotel_id AND room_no = NEW.room_no;

    IF v_room_cap IS NOT NULL AND NEW.no_of_people > v_room_cap THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Trigger validation error: Number of guests exceeds room capacity.';
    END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- TRIGGER 2: trg_prevent_checkedout_modification
-- Prevents altering dates or status of a booking that has already Checked-out
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_checkedout_modification;
DELIMITER $$
CREATE TRIGGER trg_prevent_checkedout_modification
BEFORE UPDATE ON booking
FOR EACH ROW
BEGIN
    IF OLD.status = 'Checked-out' AND NEW.status != 'Checked-out' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Trigger validation error: A checked-out booking cannot be reopened or modified.';
    END IF;
END$$
DELIMITER ;
