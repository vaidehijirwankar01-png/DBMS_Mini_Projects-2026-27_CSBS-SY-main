-- PetCare: 50 sample queries | USE petcare_db first
USE petcare_db;

-- ===== A. CRUD =====
-- 1 Create owner
INSERT INTO owner(first_name,last_name,email,address) VALUES ('Test','User','test.user@example.com','Demo Street, Pune');
-- 2 Create phone for that owner
INSERT INTO owner_phone(owner_id,phone,phone_type) SELECT owner_id,'+91-90000-99999','Mobile' FROM owner WHERE email='test.user@example.com';
-- 3 Update
UPDATE owner SET address='Updated Address, Pune' WHERE email='test.user@example.com';
-- 4 Delete (phones cascade)
DELETE FROM owner WHERE email='test.user@example.com';
-- 5 Read with filter and sort
SELECT * FROM pet WHERE species='Dog' ORDER BY birth_date;
-- 6 Update reorder level
UPDATE medicine SET reorder_level = reorder_level + 5 WHERE medicine_id = 12;

-- ===== B. JOINS =====
-- 7 INNER JOIN: pets with owners
SELECT p.name, p.species, CONCAT(o.first_name,' ',o.last_name) AS owner FROM pet p JOIN owner o ON o.owner_id=p.owner_id;
-- 8 LEFT JOIN: pets never treated
SELECT p.pet_id, p.name FROM pet p LEFT JOIN appointment a ON a.pet_id=p.pet_id AND a.status='Completed'
LEFT JOIN treatment t ON t.appointment_id=a.appointment_id WHERE t.treatment_id IS NULL;
-- 9 Four-table join: appointment details
SELECT a.appointment_id, p.name pet, o.first_name owner, v.full_name vet, a.appt_date, a.status
FROM appointment a JOIN pet p ON p.pet_id=a.pet_id JOIN owner o ON o.owner_id=p.owner_id JOIN veterinarian v ON v.vet_id=a.vet_id;
-- 10 Self join: pairs of pets with same owner
SELECT p1.name AS pet1, p2.name AS pet2, p1.owner_id FROM pet p1 JOIN pet p2 ON p1.owner_id=p2.owner_id AND p1.pet_id<p2.pet_id;
-- 11 RIGHT JOIN: every vet with appointment count
SELECT v.full_name, COUNT(a.appointment_id) total FROM appointment a RIGHT JOIN veterinarian v ON v.vet_id=a.vet_id GROUP BY v.vet_id, v.full_name;
-- 12 CROSS JOIN: vets x species
SELECT v.full_name, s.species FROM veterinarian v CROSS JOIN (SELECT DISTINCT species FROM pet) s ORDER BY v.full_name LIMIT 15;
-- 13 M:N join: prescriptions
SELECT p.name pet, m.name medicine, tm.quantity, tm.dosage FROM treatment_medicine tm
JOIN treatment t ON t.treatment_id=tm.treatment_id JOIN appointment a ON a.appointment_id=t.appointment_id
JOIN pet p ON p.pet_id=a.pet_id JOIN medicine m ON m.medicine_id=tm.medicine_id ORDER BY p.name;
-- 14 Billing chain
SELECT b.bill_id, o.first_name owner, p.name pet, v.full_name vet, b.total_amount, b.payment_status
FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id JOIN appointment a ON a.appointment_id=t.appointment_id
JOIN pet p ON p.pet_id=a.pet_id JOIN owner o ON o.owner_id=p.owner_id JOIN veterinarian v ON v.vet_id=a.vet_id;

-- ===== C. AGGREGATES / GROUP BY / HAVING =====
-- 15 Pets per species
SELECT species, COUNT(*) total FROM pet GROUP BY species ORDER BY total DESC;
-- 16 Average weight per species
SELECT species, ROUND(AVG(weight_kg),2) avg_kg FROM pet GROUP BY species;
-- 17 Paid revenue per vet
SELECT v.full_name, SUM(b.total_amount) revenue FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
JOIN appointment a ON a.appointment_id=t.appointment_id JOIN veterinarian v ON v.vet_id=a.vet_id
WHERE b.payment_status='Paid' GROUP BY v.vet_id, v.full_name;
-- 18 MIN/MAX price by category
SELECT category, MIN(unit_price) cheapest, MAX(unit_price) costliest FROM medicine GROUP BY category;
-- 19 HAVING: owners with more than one pet
SELECT owner_id, COUNT(*) pets FROM pet GROUP BY owner_id HAVING COUNT(*) > 1;
-- 20 HAVING: vets with 3+ appointments
SELECT vet_id, COUNT(*) appts FROM appointment GROUP BY vet_id HAVING COUNT(*) >= 3;
-- 21 Monthly revenue
SELECT DATE_FORMAT(bill_date,'%Y-%m') month, SUM(total_amount) total FROM bill GROUP BY month ORDER BY month;
-- 22 Unpaid dues per owner
SELECT o.owner_id, o.first_name, SUM(b.total_amount) due FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
JOIN appointment a ON a.appointment_id=t.appointment_id JOIN pet p ON p.pet_id=a.pet_id JOIN owner o ON o.owner_id=p.owner_id
WHERE b.payment_status='Unpaid' GROUP BY o.owner_id, o.first_name HAVING due > 0;
-- 23 Appointments by status
SELECT status, COUNT(*) FROM appointment GROUP BY status;
-- 24 Top 5 prescribed medicines
SELECT m.name, SUM(tm.quantity) used FROM treatment_medicine tm JOIN medicine m ON m.medicine_id=tm.medicine_id
GROUP BY m.medicine_id, m.name ORDER BY used DESC LIMIT 5;

-- ===== D. SUBQUERIES / EXISTS =====
-- 25 Medicines pricier than average
SELECT name, unit_price FROM medicine WHERE unit_price > (SELECT AVG(unit_price) FROM medicine);
-- 26 Correlated: pets heavier than their species average
SELECT name, species, weight_kg FROM pet p WHERE weight_kg > (SELECT AVG(weight_kg) FROM pet WHERE species=p.species);
-- 27 EXISTS: owners with an unpaid bill
SELECT o.first_name, o.last_name FROM owner o WHERE EXISTS (
  SELECT 1 FROM pet p JOIN appointment a ON a.pet_id=p.pet_id JOIN treatment t ON t.appointment_id=a.appointment_id
  JOIN bill b ON b.treatment_id=t.treatment_id WHERE p.owner_id=o.owner_id AND b.payment_status='Unpaid');
-- 28 NOT EXISTS: vets with no cancelled appointment
SELECT full_name FROM veterinarian v WHERE NOT EXISTS (SELECT 1 FROM appointment a WHERE a.vet_id=v.vet_id AND a.status='Cancelled');
-- 29 IN: pets treated by dermatology vets
SELECT name FROM pet WHERE pet_id IN (SELECT a.pet_id FROM appointment a JOIN veterinarian v ON v.vet_id=a.vet_id WHERE v.specialization='Dermatology');
-- 30 ALL: the largest bill
SELECT * FROM bill WHERE total_amount >= ALL (SELECT total_amount FROM bill);
-- 31 Derived table: average bill per vet
SELECT d.full_name, ROUND(d.avg_bill,2) avg_bill FROM (
  SELECT v.full_name, AVG(b.total_amount) avg_bill FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
  JOIN appointment a ON a.appointment_id=t.appointment_id JOIN veterinarian v ON v.vet_id=a.vet_id GROUP BY v.vet_id, v.full_name) d;
-- 32 Scalar subquery: pets per owner
SELECT o.first_name, (SELECT COUNT(*) FROM pet p WHERE p.owner_id=o.owner_id) pets FROM owner o;
-- 33 UNION: all people in the system
SELECT first_name AS name, 'Owner' AS role FROM owner UNION SELECT full_name, 'Vet' FROM veterinarian;
-- 34 CASE with function: life stage
SELECT name, fn_pet_age(birth_date) age, CASE WHEN fn_pet_age(birth_date)<2 THEN 'Young' WHEN fn_pet_age(birth_date)<7 THEN 'Adult' ELSE 'Senior' END stage FROM pet;
-- 35 Window function: rank bills within each vet
SELECT v.full_name, b.bill_id, b.total_amount, RANK() OVER (PARTITION BY v.vet_id ORDER BY b.total_amount DESC) rnk
FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id JOIN appointment a ON a.appointment_id=t.appointment_id JOIN veterinarian v ON v.vet_id=a.vet_id;

-- ===== E. VIEWS / FUNCTIONS / PROCEDURES =====
-- 36
SELECT * FROM vw_appointment_details WHERE status='Scheduled' ORDER BY appt_date;
-- 37
SELECT * FROM vw_unpaid_bills;
-- 38
SELECT * FROM vw_low_stock;
-- 39
SELECT * FROM vw_vet_revenue ORDER BY paid_revenue DESC;
-- 40 Functions
SELECT o.first_name, fn_owner_due(o.owner_id) due FROM owner o ORDER BY due DESC;
-- 41 Procedure with result set
CALL sp_owner_summary(5);
-- 42 Procedure: book appointment 30 days ahead (then clean up)
CALL sp_book_appointment(2, 3, DATE_ADD(CURDATE(), INTERVAL 30 DAY), '10:00:00', 'Demo booking');
DELETE FROM appointment WHERE reason='Demo booking';
-- 43 Procedure: pay a bill (transaction inside)
CALL sp_pay_bill(7, 'Cash');

-- ===== F. TRANSACTIONS (ACID) =====
-- 44 COMMIT
START TRANSACTION;
UPDATE medicine SET stock_qty = stock_qty + 50 WHERE medicine_id = 12;
COMMIT;
-- 45 ROLLBACK
START TRANSACTION;
DELETE FROM medicine WHERE medicine_id = 15;   -- fails/undone anyway
ROLLBACK;
-- 46 SAVEPOINT
START TRANSACTION;
UPDATE medicine SET unit_price = unit_price + 1 WHERE medicine_id = 1;
SAVEPOINT after_first;
UPDATE medicine SET unit_price = unit_price + 100 WHERE medicine_id = 2;
ROLLBACK TO SAVEPOINT after_first;   -- undo only second update
COMMIT;
-- 47 Trigger demo: fails with 'Insufficient medicine stock'
-- INSERT INTO treatment_medicine VALUES (10, 8, 999, 'too many');

-- ===== G. INDEXES =====
-- 48
SHOW INDEX FROM appointment;
-- 49 Uses idx_appt_date
EXPLAIN SELECT * FROM appointment WHERE appt_date BETWEEN '2026-10-01' AND '2026-10-31';

-- ===== H. GRANT / REVOKE =====
-- 50 (run as root)
CREATE USER IF NOT EXISTS 'petcare_reception'@'localhost' IDENTIFIED BY 'Recep#123';
GRANT SELECT, INSERT, UPDATE ON petcare_db.appointment TO 'petcare_reception'@'localhost';
GRANT SELECT ON petcare_db.pet TO 'petcare_reception'@'localhost';
SHOW GRANTS FOR 'petcare_reception'@'localhost';
REVOKE UPDATE ON petcare_db.appointment FROM 'petcare_reception'@'localhost';
DROP USER 'petcare_reception'@'localhost';
