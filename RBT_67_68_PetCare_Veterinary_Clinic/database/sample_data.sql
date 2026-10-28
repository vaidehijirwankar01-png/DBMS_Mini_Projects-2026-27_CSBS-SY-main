-- Run AFTER schema.sql: mysql -u root -p < database/sample_data.sql
USE petcare_db;

INSERT INTO owner (first_name,last_name,email,address,registered_on) VALUES
('Aarav','Mehta','aarav.mehta@example.com','12 Lake View Road, Pune','2025-01-10'),
('Priya','Nair','priya.nair@example.com','45 Green Park, Pune','2025-02-14'),
('Rohan','Deshmukh','rohan.d@example.com','7 Rose Residency, Pune','2025-03-05'),
('Sneha','Kulkarni','sneha.k@example.com','88 Hill Crest, Pune','2025-04-18'),
('Vikram','Singh','vikram.singh@example.com','23 Palm Avenue, Pune','2025-05-21'),
('Ananya','Iyer','ananya.iyer@example.com','5 Orchid Lane, Pune','2025-06-02'),
('Karan','Patel','karan.patel@example.com','61 Sunrise Society, Pune','2025-07-11'),
('Meera','Joshi','meera.joshi@example.com','19 River Side, Pune','2025-08-09'),
('Arjun','Reddy','arjun.reddy@example.com','102 Maple Heights, Pune','2025-09-15'),
('Isha','Kapoor','isha.kapoor@example.com','34 Cedar Court, Pune','2025-10-01');

INSERT INTO owner_phone (owner_id,phone,phone_type) VALUES
(1,'+91-90000-10001','Mobile'),(1,'+91-20000-10001','Home'),
(2,'+91-90000-10002','Mobile'),(3,'+91-90000-10003','Mobile'),(3,'+91-90000-20003','Work'),
(4,'+91-90000-10004','Mobile'),(5,'+91-90000-10005','Mobile'),(5,'+91-20000-10005','Home'),
(6,'+91-90000-10006','Mobile'),(7,'+91-90000-10007','Mobile'),(8,'+91-90000-10008','Mobile'),
(8,'+91-90000-20008','Work'),(9,'+91-90000-10009','Mobile'),(10,'+91-90000-10010','Mobile');

INSERT INTO pet (owner_id,name,species,breed,gender,birth_date,weight_kg,microchip_no) VALUES
(1,'Bruno','Dog','Labrador','Male','2020-03-14',29.50,'CHIP1001'),
(1,'Misty','Cat','Persian','Female','2021-07-02',4.20,'CHIP1002'),
(2,'Coco','Dog','Beagle','Female','2019-11-20',11.80,'CHIP1003'),
(3,'Simba','Cat','Bengal','Male','2022-01-10',5.10,NULL),
(3,'Pico','Bird','Cockatiel','Male','2023-05-05',0.09,NULL),
(4,'Daisy','Dog','Golden Retriever','Female','2018-09-09',27.00,'CHIP1006'),
(5,'Thumper','Rabbit','Holland Lop','Male','2023-02-14',1.80,NULL),
(5,'Rocky','Dog','German Shepherd','Male','2017-12-01',34.00,'CHIP1008'),
(6,'Luna','Cat','Siamese','Female','2020-06-18',3.90,'CHIP1009'),
(7,'Nibbles','Hamster','Syrian','Male','2024-03-03',0.12,NULL),
(8,'Shelly','Turtle','Red-eared Slider','Female','2016-08-22',1.10,NULL),
(9,'Zeus','Dog','Rottweiler','Male','2021-04-25',42.30,'CHIP1012'),
(9,'Oreo','Cat','Domestic Shorthair','Male','2022-10-30',4.60,NULL),
(10,'Mango','Bird','Indian Ringneck','Female','2022-08-12',0.13,NULL),
(10,'Peanut','Dog','Pug','Male','2023-09-09',8.40,'CHIP1015');

INSERT INTO veterinarian (full_name,specialization,email,phone,consultation_fee) VALUES
('Dr. Kavita Rao','General Practice','kavita.rao@petcare.example','+91-98000-00001',500.00),
('Dr. Sameer Bhosale','Surgery','sameer.b@petcare.example','+91-98000-00002',900.00),
('Dr. Nisha Verma','Dermatology','nisha.v@petcare.example','+91-98000-00003',700.00),
('Dr. Rahul Menon','Exotic & Avian','rahul.m@petcare.example','+91-98000-00004',800.00),
('Dr. Tanvi Shah','Dentistry','tanvi.s@petcare.example','+91-98000-00005',650.00);

INSERT INTO medicine (name,category,unit_price,stock_qty,reorder_level,expiry_date) VALUES
('Amoxicillin 250mg','Antibiotic',12.00,200,30,'2027-08-31'),
('Meloxicam 1.5mg','Painkiller',18.50,150,25,'2027-05-31'),
('Cetirizine 10mg','Antihistamine',4.00,300,40,'2027-12-31'),
('Metronidazole 200mg','Antibiotic',9.50,180,30,'2027-03-31'),
('Prednisolone 5mg','Steroid',7.25,120,20,'2027-06-30'),
('Ivermectin Dewormer','Antiparasitic',22.00,80,15,'2027-09-30'),
('Frontline Spot-On','Antiparasitic',350.00,40,8,'2028-01-31'),
('Nobivac Rabies Vaccine','Vaccine',450.00,10,10,'2027-02-28'),
('Ear Cleanse Solution','Topical',180.00,25,5,'2027-10-31'),
('Probiotic Sachet','Supplement',35.00,100,20,'2027-11-30'),
('Enrofloxacin 50mg','Antibiotic',15.00,90,20,'2027-04-30'),
('Calcium Syrup','Supplement',220.00,11,10,'2027-07-31'),
('Chloramphenicol Eye Drops','Topical',95.00,35,8,'2027-01-31'),
('Omeprazole 10mg','Gastro',11.00,110,20,'2027-08-15'),
('Vitamin B-Complex','Supplement',6.00,60,15,'2027-09-15');

-- 1-10 completed | 11-13 cancelled | 14-20 scheduled (future)
INSERT INTO appointment (pet_id,vet_id,appt_date,appt_time,reason,status) VALUES
(1,1,'2026-09-21','10:00','Annual checkup & vaccination','Completed'),
(2,3,'2026-09-23','11:30','Skin itching','Completed'),
(3,1,'2026-09-25','09:30','Ear infection','Completed'),
(5,4,'2026-09-28','14:00','Feather plucking','Completed'),
(6,2,'2026-10-01','10:30','Leg injury','Completed'),
(7,4,'2026-10-03','12:00','Tooth overgrowth','Completed'),
(8,5,'2026-10-05','15:00','Dental cleaning','Completed'),
(9,1,'2026-10-07','16:00','Eye discharge','Completed'),
(12,2,'2026-10-08','09:00','Stomach upset','Completed'),
(15,3,'2026-10-09','17:00','Food allergy','Completed'),
(4,1,'2026-10-10','10:00','Vaccination','Cancelled'),
(10,4,'2026-10-12','11:00','Weight check','Cancelled'),
(13,5,'2026-10-13','13:00','Dental check','Cancelled'),
(1,1,'2026-10-16','10:00','Follow-up visit','Scheduled'),
(11,4,'2026-10-17','11:00','Shell health check','Scheduled'),
(14,4,'2026-10-19','09:30','Wing clipping','Scheduled'),
(4,1,'2026-10-20','10:00','Vaccination (rebooked)','Scheduled'),
(3,3,'2026-10-21','15:30','Skin recheck','Scheduled'),
(6,2,'2026-10-22','12:00','Post-injury review','Scheduled'),
(13,5,'2026-10-23','14:30','Dental check','Scheduled');

INSERT INTO treatment (appointment_id,diagnosis,procedure_name,procedure_cost,treated_on) VALUES
(1,'Healthy - routine','Rabies vaccination',150.00,'2026-09-21'),
(2,'Allergic dermatitis','Skin scraping',250.00,'2026-09-23'),
(3,'Otitis externa','Ear flush',200.00,'2026-09-25'),
(4,'Stress-induced plucking','Behaviour consult',100.00,'2026-09-28'),
(5,'Soft-tissue sprain','X-ray & bandaging',800.00,'2026-10-01'),
(6,'Incisor overgrowth','Tooth trimming',300.00,'2026-10-03'),
(7,'Dental tartar','Scaling & polishing',1200.00,'2026-10-05'),
(8,'Conjunctivitis','Eye wash',120.00,'2026-10-07'),
(9,'Gastritis','IV fluids',600.00,'2026-10-08'),
(10,'Food allergy','Allergy test',450.00,'2026-10-09');

-- Triggers auto-reduce medicine stock
INSERT INTO treatment_medicine (treatment_id,medicine_id,quantity,dosage) VALUES
(1,8,1,'1 dose subcutaneous'),(1,6,1,'Single oral dose'),
(2,3,10,'1 tablet daily'),(2,5,7,'1 tablet daily, tapering'),
(3,9,1,'Clean ear once daily'),(3,1,14,'1 tablet twice daily'),
(4,15,20,'1 tablet daily'),(4,10,5,'1 sachet daily'),
(5,2,7,'1 tablet daily'),(5,14,10,'1 tablet daily'),
(6,12,2,'5 ml daily'),(6,10,3,'1 sachet daily'),
(7,4,10,'1 tablet twice daily'),(7,2,5,'1 tablet daily'),
(8,13,1,'2 drops thrice daily'),(8,11,7,'1 tablet daily'),
(9,14,14,'1 tablet daily'),(9,10,5,'1 sachet daily'),(9,4,10,'1 tablet twice daily'),
(10,3,14,'1 tablet daily'),(10,5,10,'1 tablet daily'),(10,7,1,'Spot-on monthly');

-- Amounts are auto-computed by trigger trg_bill_calc
INSERT INTO bill (treatment_id,bill_date,payment_status,payment_method) VALUES
(1,'2026-09-21','Paid','UPI'),(2,'2026-09-23','Paid','Card'),(3,'2026-09-25','Paid','Cash'),
(4,'2026-09-28','Paid','UPI'),(5,'2026-10-01','Paid','Card'),(6,'2026-10-03','Paid','Cash'),
(7,'2026-10-05','Unpaid',NULL),(8,'2026-10-07','Unpaid',NULL),
(9,'2026-10-08','Unpaid',NULL),(10,'2026-10-09','Unpaid',NULL);
