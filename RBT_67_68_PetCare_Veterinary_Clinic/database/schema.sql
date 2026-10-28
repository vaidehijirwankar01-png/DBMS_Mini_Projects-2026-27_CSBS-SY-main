-- PetCare schema | MySQL 8.x | run: mysql -u root -p < database/schema.sql
DROP DATABASE IF EXISTS petcare_db;
CREATE DATABASE petcare_db CHARACTER SET utf8mb4;
USE petcare_db;

CREATE TABLE owner (
  owner_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(40) NOT NULL,
  last_name VARCHAR(40) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,                 -- candidate/alternate key
  address VARCHAR(200),
  registered_on DATE NOT NULL DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

CREATE TABLE owner_phone (                            -- multivalued attribute of OWNER
  owner_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_type ENUM('Mobile','Home','Work') NOT NULL DEFAULT 'Mobile',
  PRIMARY KEY (owner_id, phone),                      -- composite key
  UNIQUE KEY uq_phone (phone),                        -- alternate key
  FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pet (
  pet_id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(40) NOT NULL,
  species ENUM('Dog','Cat','Rabbit','Bird','Hamster','Turtle') NOT NULL,
  breed VARCHAR(50),
  gender ENUM('Male','Female') NOT NULL,
  birth_date DATE NOT NULL,                           -- age is a DERIVED attribute (fn_pet_age)
  weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0),
  microchip_no VARCHAR(20) UNIQUE,
  UNIQUE KEY uq_owner_petname (owner_id, name),       -- composite candidate key
  FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE veterinarian (
  vet_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(80) NOT NULL,
  specialization VARCHAR(60) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  consultation_fee DECIMAL(8,2) NOT NULL CHECK (consultation_fee >= 0)
) ENGINE=InnoDB;

CREATE TABLE appointment (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  pet_id INT NOT NULL,
  vet_id INT NOT NULL,
  appt_date DATE NOT NULL,
  appt_time TIME NOT NULL,
  reason VARCHAR(200) NOT NULL,
  status ENUM('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  UNIQUE KEY uq_vet_slot (vet_id, appt_date, appt_time),   -- no double-booking a vet
  UNIQUE KEY uq_pet_slot (pet_id, appt_date, appt_time),   -- no double-booking a pet
  FOREIGN KEY (pet_id) REFERENCES pet(pet_id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES veterinarian(vet_id)
) ENGINE=InnoDB;

CREATE TABLE treatment (
  treatment_id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE,                 -- 1:1 with appointment
  diagnosis VARCHAR(150) NOT NULL,
  procedure_name VARCHAR(100) NOT NULL,
  procedure_cost DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (procedure_cost >= 0),
  treated_on DATE NOT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE medicine (
  medicine_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL CHECK (unit_price > 0),
  stock_qty INT NOT NULL CHECK (stock_qty >= 0),
  reorder_level INT NOT NULL DEFAULT 10,
  expiry_date DATE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE treatment_medicine (                     -- M:N resolver
  treatment_id INT NOT NULL,
  medicine_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  dosage VARCHAR(60),
  PRIMARY KEY (treatment_id, medicine_id),
  FOREIGN KEY (treatment_id) REFERENCES treatment(treatment_id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicine(medicine_id)
) ENGINE=InnoDB;

CREATE TABLE bill (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  treatment_id INT NOT NULL UNIQUE,
  bill_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,  -- price snapshots (filled by trigger)
  procedure_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  medicine_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
  payment_method ENUM('Cash','Card','UPI') NULL,
  CHECK (payment_status = 'Unpaid' OR payment_method IS NOT NULL),
  FOREIGN KEY (treatment_id) REFERENCES treatment(treatment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- INDEXES
CREATE INDEX idx_appt_date   ON appointment(appt_date);
CREATE INDEX idx_bill_status ON bill(payment_status);
CREATE INDEX idx_med_cat     ON medicine(category);
CREATE INDEX idx_pet_species ON pet(species);

-- VIEWS
CREATE VIEW vw_appointment_details AS
SELECT a.appointment_id, a.appt_date, a.appt_time, p.name AS pet_name, p.species,
       CONCAT(o.first_name,' ',o.last_name) AS owner_name, v.full_name AS vet_name,
       a.reason, a.status
FROM appointment a JOIN pet p ON p.pet_id=a.pet_id
JOIN owner o ON o.owner_id=p.owner_id JOIN veterinarian v ON v.vet_id=a.vet_id;

CREATE VIEW vw_unpaid_bills AS
SELECT b.bill_id, CONCAT(o.first_name,' ',o.last_name) AS owner_name, p.name AS pet_name,
       b.total_amount, b.bill_date
FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
JOIN appointment a ON a.appointment_id=t.appointment_id
JOIN pet p ON p.pet_id=a.pet_id JOIN owner o ON o.owner_id=p.owner_id
WHERE b.payment_status='Unpaid';

CREATE VIEW vw_low_stock AS
SELECT medicine_id, name, stock_qty, reorder_level FROM medicine WHERE stock_qty <= reorder_level;

CREATE VIEW vw_vet_revenue AS
SELECT v.vet_id, v.full_name, COUNT(DISTINCT a.appointment_id) AS appointments,
       COALESCE(SUM(CASE WHEN b.payment_status='Paid' THEN b.total_amount END),0) AS paid_revenue
FROM veterinarian v LEFT JOIN appointment a ON a.vet_id=v.vet_id
LEFT JOIN treatment t ON t.appointment_id=a.appointment_id
LEFT JOIN bill b ON b.treatment_id=t.treatment_id GROUP BY v.vet_id, v.full_name;

DELIMITER //

-- FUNCTIONS
CREATE FUNCTION fn_pet_age(p_birth DATE) RETURNS INT NOT DETERMINISTIC NO SQL
RETURN TIMESTAMPDIFF(YEAR, p_birth, CURDATE())//

CREATE FUNCTION fn_owner_due(p_owner INT) RETURNS DECIMAL(10,2) READS SQL DATA
BEGIN
  DECLARE v_due DECIMAL(10,2);
  SELECT COALESCE(SUM(b.total_amount),0) INTO v_due
  FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
  JOIN appointment a ON a.appointment_id=t.appointment_id
  JOIN pet p ON p.pet_id=a.pet_id
  WHERE p.owner_id=p_owner AND b.payment_status='Unpaid';
  RETURN v_due;
END//

-- TRIGGERS
CREATE TRIGGER trg_tm_check_stock BEFORE INSERT ON treatment_medicine FOR EACH ROW
BEGIN
  IF (SELECT stock_qty FROM medicine WHERE medicine_id=NEW.medicine_id) < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient medicine stock';
  END IF;
END//

CREATE TRIGGER trg_tm_reduce_stock AFTER INSERT ON treatment_medicine FOR EACH ROW
  UPDATE medicine SET stock_qty = stock_qty - NEW.quantity WHERE medicine_id=NEW.medicine_id//

CREATE TRIGGER trg_tm_restore_stock AFTER DELETE ON treatment_medicine FOR EACH ROW
  UPDATE medicine SET stock_qty = stock_qty + OLD.quantity WHERE medicine_id=OLD.medicine_id//

CREATE TRIGGER trg_treatment_check BEFORE INSERT ON treatment FOR EACH ROW
BEGIN
  IF (SELECT status FROM appointment WHERE appointment_id=NEW.appointment_id)='Cancelled' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot treat a cancelled appointment';
  END IF;
END//

CREATE TRIGGER trg_treatment_complete AFTER INSERT ON treatment FOR EACH ROW
  UPDATE appointment SET status='Completed' WHERE appointment_id=NEW.appointment_id//

CREATE TRIGGER trg_bill_calc BEFORE INSERT ON bill FOR EACH ROW
BEGIN
  DECLARE v_fee, v_proc, v_med DECIMAL(10,2);
  SELECT v.consultation_fee, t.procedure_cost INTO v_fee, v_proc
  FROM treatment t JOIN appointment a ON a.appointment_id=t.appointment_id
  JOIN veterinarian v ON v.vet_id=a.vet_id WHERE t.treatment_id=NEW.treatment_id;
  SELECT COALESCE(SUM(tm.quantity*m.unit_price),0) INTO v_med
  FROM treatment_medicine tm JOIN medicine m ON m.medicine_id=tm.medicine_id
  WHERE tm.treatment_id=NEW.treatment_id;
  SET NEW.consultation_fee=v_fee, NEW.procedure_cost=v_proc, NEW.medicine_cost=v_med,
      NEW.total_amount=v_fee+v_proc+v_med;
END//

-- STORED PROCEDURES (transactions: ACID)
CREATE PROCEDURE sp_book_appointment(IN p_pet INT, IN p_vet INT, IN p_date DATE, IN p_time TIME, IN p_reason VARCHAR(200))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  IF p_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot book an appointment in the past';
  END IF;
  IF EXISTS (SELECT 1 FROM appointment WHERE vet_id=p_vet AND appt_date=p_date AND appt_time=p_time) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Veterinarian already booked for this slot';
  END IF;
  INSERT INTO appointment(pet_id,vet_id,appt_date,appt_time,reason) VALUES (p_pet,p_vet,p_date,p_time,p_reason);
  COMMIT;
END//

CREATE PROCEDURE sp_pay_bill(IN p_bill INT, IN p_method VARCHAR(10))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  UPDATE bill SET payment_status='Paid', payment_method=p_method
  WHERE bill_id=p_bill AND payment_status='Unpaid';
  IF ROW_COUNT()=0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Bill not found or already paid';
  END IF;
  COMMIT;
END//

CREATE PROCEDURE sp_owner_summary(IN p_owner INT)
BEGIN
  SELECT o.owner_id, CONCAT(o.first_name,' ',o.last_name) AS owner_name,
         COUNT(DISTINCT p.pet_id) AS pets, COUNT(DISTINCT a.appointment_id) AS appointments,
         fn_owner_due(o.owner_id) AS amount_due
  FROM owner o LEFT JOIN pet p ON p.owner_id=o.owner_id
  LEFT JOIN appointment a ON a.pet_id=p.pet_id
  WHERE o.owner_id=p_owner GROUP BY o.owner_id;
END//

DELIMITER ;
