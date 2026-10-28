CREATE DATABASE IF NOT EXISTS crop_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crop_management;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS storage;
DROP TABLE IF EXISTS harvests;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS crops;
DROP TABLE IF EXISTS fields;
DROP TABLE IF EXISTS farms;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS farmers;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE farmers (
  farmer_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(120),
  experience_years INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE farms (
  farm_id INT AUTO_INCREMENT PRIMARY KEY,
  farm_name VARCHAR(120) NOT NULL,
  area_acres DECIMAL(10,2) DEFAULT 0,
  location VARCHAR(180),
  farmer_id INT NULL,
  CONSTRAINT fk_farms_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE fields (
  field_id INT AUTO_INCREMENT PRIMARY KEY,
  field_name VARCHAR(100) NOT NULL,
  soil_type VARCHAR(80),
  area_acres DECIMAL(10,2) DEFAULT 0,
  farm_id INT NULL,
  CONSTRAINT fk_fields_farm FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE crops (
  crop_id INT AUTO_INCREMENT PRIMARY KEY,
  crop_name VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  season VARCHAR(50),
  quantity_kg DECIMAL(12,2) DEFAULT 0,
  field_id INT NULL,
  CONSTRAINT fk_crops_field FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE equipment (
  equipment_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_name VARCHAR(120) NOT NULL,
  equipment_type VARCHAR(80),
  quantity INT DEFAULT 1,
  status ENUM('Available','In Use','Maintenance') DEFAULT 'Available',
  farm_id INT NULL,
  CONSTRAINT fk_equipment_farm FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(120),
  address VARCHAR(220),
  city VARCHAR(80),
  postal_code VARCHAR(20)
);
CREATE TABLE harvests (
  harvest_id INT AUTO_INCREMENT PRIMARY KEY,
  crop_id INT NULL,
  harvest_date DATE NOT NULL,
  quantity_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  quality_grade ENUM('A','B','C') DEFAULT 'A',
  harvest_method VARCHAR(100),
  CONSTRAINT fk_harvests_crop FOREIGN KEY (crop_id) REFERENCES crops(crop_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE storage (
  storage_id INT AUTO_INCREMENT PRIMARY KEY,
  harvest_id INT NULL,
  storage_name VARCHAR(120) NOT NULL,
  capacity_kg DECIMAL(12,2) DEFAULT 0,
  stored_quantity_kg DECIMAL(12,2) DEFAULT 0,
  storage_date DATE,
  CONSTRAINT fk_storage_harvest FOREIGN KEY (harvest_id) REFERENCES harvests(harvest_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE purchases (
  purchase_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  crop_id INT NULL,
  purchase_date DATE NOT NULL,
  quantity_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  payment_status ENUM('Pending','Paid','Partially Paid') DEFAULT 'Pending',
  CONSTRAINT fk_purchases_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_purchases_crop FOREIGN KEY (crop_id) REFERENCES crops(crop_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Optional starter records; remove these INSERTs if you want an empty database.
INSERT INTO farmers (first_name,last_name,phone,email,experience_years) VALUES
('Aarav','Patil','9876543210','aarav@example.com',8),
('Meera','Shinde','9876501234','meera@example.com',5);
INSERT INTO farms (farm_name,area_acres,location,farmer_id) VALUES
('Green Valley Farm',12.50,'Pune, Maharashtra',1),
('Sunrise Farm',8.00,'Nashik, Maharashtra',2);
INSERT INTO fields (field_name,soil_type,area_acres,farm_id) VALUES
('North Field','Black soil',5.00,1),('River Field','Loamy',3.50,1),('East Field','Red soil',4.00,2);
INSERT INTO crops (crop_name,variety,season,quantity_kg,field_id) VALUES
('Wheat','HD-2967','Rabi',1800,1),('Tomato','Abhinav','Kharif',950,2),('Soybean','JS-335','Kharif',1200,3);
INSERT INTO equipment (equipment_name,equipment_type,quantity,status,farm_id) VALUES
('Tractor','Vehicle',1,'Available',1),('Seed Drill','Sowing',2,'In Use',2);
INSERT INTO customers (customer_name,phone,email,address,city,postal_code) VALUES
('Fresh Market Co.','9123456780','buy@example.com','Market Road','Pune','411001'),
('Harvest Foods','9988776655','orders@example.com','Main Street','Nashik','422001');
INSERT INTO harvests (crop_id,harvest_date,quantity_kg,quality_grade,harvest_method) VALUES
(1,'2026-10-01',750,'A','Combine harvester'),(2,'2026-10-05',420,'B','Manual');
INSERT INTO storage (harvest_id,storage_name,capacity_kg,stored_quantity_kg,storage_date) VALUES
(1,'Warehouse A',2000,750,'2026-10-01');
INSERT INTO purchases (customer_id,crop_id,purchase_date,quantity_kg,unit_price,payment_status) VALUES
(1,1,'2026-10-07',100,28.50,'Paid'),(2,2,'2026-10-08',50,42.00,'Pending');
