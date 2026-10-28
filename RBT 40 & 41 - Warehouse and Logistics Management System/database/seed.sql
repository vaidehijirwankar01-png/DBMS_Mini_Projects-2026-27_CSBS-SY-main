-- =====================================================================
-- Warehouse & Logistics Management System - Sample Seed Data
-- Database: logistics_db
-- =====================================================================

USE logistics_db;

-- ---------------------------------------------------------------------
-- 1. INSERT WAREHOUSES (5 Major Hubs)
-- ---------------------------------------------------------------------
INSERT INTO warehouse (warehouse_id, warehouse_name, state, city, locality, storage_capacity) VALUES
(1, 'Apex Western Logistics Hub', 'Maharashtra', 'Mumbai', 'Bhiwandi Cargo Zone', 15000),
(2, 'Capital Express Central Depot', 'Delhi', 'New Delhi', 'Okhla Industrial Area Phase-II', 12000),
(3, 'Silicon Valley Southern Hub', 'Karnataka', 'Bengaluru', 'Peenya Industrial Estate', 18000),
(4, 'Coromandel Coastal Logistics', 'Tamil Nadu', 'Chennai', 'Sriperumbudur SEZ', 10000),
(5, 'Eastern Gateway Fulfillment Center', 'West Bengal', 'Kolkata', 'Dankuni Logistics Park', 14000);

-- ---------------------------------------------------------------------
-- 2. INSERT PRODUCTS (20 Realistic Items Across 5 Categories)
-- ---------------------------------------------------------------------
INSERT INTO product (product_id, product_name, category, seller, price, sku) VALUES
(1, 'Ergonomic Industrial Barcode Scanner', 'Electronics', 'Honeywell Solutions', 149.99, 'ELEC-BCS-01'),
(2, 'Thermal Receipt & Shipping Label Printer', 'Electronics', 'Zebra Technologies', 289.50, 'ELEC-PRT-02'),
(3, 'Heavy Duty Hydraulic Pallet Jack 3-Ton', 'Industrial Equipment', 'Torin BigRed Corp', 420.00, 'IND-PLJ-03'),
(4, 'High-Strength Poly Strapping Roll (1000m)', 'Packaging', 'Signode Packaging', 45.00, 'PKG-STR-04'),
(5, 'Industrial Stretch Wrap Film (500mm x 400m)', 'Packaging', 'Berry Global', 24.50, 'PKG-SWF-05'),
(6, 'Ultra-Rugged Warehouse Tablet (10-inch)', 'Electronics', 'Panasonic Toughbook', 780.00, 'ELEC-TAB-06'),
(7, 'Reinforced Corrugated Shipping Boxes (Pack of 50)', 'Packaging', 'International Paper', 62.00, 'PKG-BOX-07'),
(8, 'Steel Toe Safety Work Boots (Size 10)', 'Safety Gear', 'Timberland PRO', 115.00, 'SFT-BOT-08'),
(9, 'High-Visibility Reflective Safety Vest (L)', 'Safety Gear', '3M Personal Safety', 18.50, 'SFT-VST-09'),
(10, 'Digital Heavy Crane Hanging Scale 1000kg', 'Industrial Equipment', 'Optima Scales', 195.00, 'IND-SCL-10'),
(11, 'Temperature Controlled Pharma Container', 'Pharma Logistics', 'CSafe Global', 550.00, 'PHM-CTR-11'),
(12, 'Insulated Thermal Pallet Cover', 'Packaging', 'Cold Chain Tech', 85.00, 'PKG-TPC-12'),
(13, 'Rechargeable LED Forklift Safety Halo Light', 'Safety Gear', 'Aero Safety Lights', 68.00, 'SFT-FKL-13'),
(14, 'Nitrile Industrial Chemical Gloves (Box of 100)', 'Safety Gear', 'Ansell Healthcare', 22.00, 'SFT-GLV-14'),
(15, 'Modular Heavy Duty Pallet Racking Upright', 'Storage & Racks', 'SSI Schaefer', 310.00, 'STR-RCK-15'),
(16, 'Collapsible Heavy Duty Plastic Bulk Container', 'Storage & Racks', 'Orbis Corporation', 145.00, 'STR-IBC-16'),
(17, 'RFID Long-Range Asset Tracking Tags (100-Pack)', 'Electronics', 'Alien Technology', 110.00, 'ELEC-RFD-17'),
(18, 'Pneumatic Cushion Air Pillow Roll (500m)', 'Packaging', 'Sealed Air', 38.00, 'PKG-APR-18'),
(19, 'Emergency Chemical Spill Clean Kit 50L', 'Safety Gear', 'New Pig Corp', 135.00, 'SFT-SPL-19'),
(20, 'IoT Cold Chain Temperature & GPS Data Logger', 'Electronics', 'Sensitech Inc', 95.00, 'ELEC-GPS-20');

-- ---------------------------------------------------------------------
-- 3. INSERT CARRIERS (5 Leading Freight & Express Carriers)
-- ---------------------------------------------------------------------
INSERT INTO carrier (carrier_id, company_name, transport_type, rating, is_active) VALUES
(1, 'BlueDart Express Air & Ground', 'Air', 4.8, TRUE),
(2, 'Delhivery Freight Network', 'Road', 4.6, TRUE),
(3, 'DTDC Express Logistics', 'Road', 4.3, TRUE),
(4, 'Container Corporation Freight Line', 'Rail', 4.7, TRUE),
(5, 'Maersk Intermodal Sea Shipping', 'Sea', 4.9, TRUE);

-- ---------------------------------------------------------------------
-- 4. INSERT CARRIER CONTACTS (Multivalued support contacts)
-- ---------------------------------------------------------------------
INSERT INTO carrier_contact (carrier_id, contact, contact_type) VALUES
(1, '+91-22-2839-6444', 'Toll Free Support'),
(1, 'operations@bluedart-express.com', 'Dispatch Email'),
(1, '+91-98200-11223', 'Emergency Hot-line'),
(2, '+91-124-671-9500', 'Customer Care'),
(2, 'freight.support@delhivery.com', 'Dispatch Email'),
(3, '+91-80-2536-5032', 'Regional Helpdesk'),
(3, 'tracking@dtdc.com', 'Email Support'),
(4, '+91-11-4167-3093', 'Rail Freight Coordination'),
(4, 'railfreight@concor.co.in', 'Cargo Operations'),
(5, '+91-22-6658-8888', 'Maritime Logistics Desk'),
(5, 'booking.india@maersk.com', 'Sea Freight Support');

-- ---------------------------------------------------------------------
-- 5. INSERT INVENTORY STOCKS
-- Note: Must be inserted BEFORE shipment items so trigger checks pass!
-- ---------------------------------------------------------------------
INSERT INTO inventory_stock (stock_id, warehouse_id, product_id, quantity_available, min_threshold, last_restock_date) VALUES
-- Warehouse 1 (Mumbai)
(1, 1, 1, 120, 15, '2026-09-01'),
(2, 1, 2, 85, 10, '2026-09-05'),
(3, 1, 3, 25, 5, '2026-08-20'),
(4, 1, 4, 300, 40, '2026-09-12'),
(5, 1, 5, 450, 50, '2026-09-15'),
(6, 1, 6, 40, 8, '2026-09-10'),
(7, 1, 7, 500, 60, '2026-09-02'),
(8, 1, 8, 110, 20, '2026-09-14'),
(9, 1, 9, 8, 20, '2026-08-15'),  -- Low Stock trigger test
(10, 1, 11, 35, 10, '2026-09-18'),

-- Warehouse 2 (Delhi NCR)
(11, 2, 1, 90, 15, '2026-09-03'),
(12, 2, 2, 60, 10, '2026-09-08'),
(13, 2, 4, 250, 40, '2026-09-11'),
(14, 2, 7, 350, 50, '2026-09-04'),
(15, 2, 8, 95, 15, '2026-09-16'),
(16, 2, 10, 18, 5, '2026-09-07'),
(17, 2, 13, 5, 15, '2026-08-25'),  -- Low Stock trigger test
(18, 2, 14, 280, 30, '2026-09-20'),
(19, 2, 17, 140, 25, '2026-09-12'),

-- Warehouse 3 (Bengaluru)
(20, 3, 1, 150, 20, '2026-09-10'),
(21, 3, 2, 110, 15, '2026-09-15'),
(22, 3, 6, 75, 10, '2026-09-18'),
(23, 3, 11, 50, 10, '2026-09-22'),
(24, 3, 17, 220, 30, '2026-09-17'),
(25, 3, 20, 95, 15, '2026-09-21'),
(26, 3, 15, 30, 8, '2026-09-05'),
(27, 3, 16, 65, 10, '2026-09-08'),
(28, 3, 12, 4, 15, '2026-08-30'),  -- Low Stock trigger test

-- Warehouse 4 (Chennai)
(29, 4, 3, 35, 5, '2026-09-02'),
(30, 4, 5, 320, 40, '2026-09-14'),
(31, 4, 8, 140, 20, '2026-09-19'),
(32, 4, 10, 22, 5, '2026-09-11'),
(33, 4, 18, 180, 25, '2026-09-16'),
(34, 4, 19, 6, 12, '2026-08-28'),  -- Low Stock trigger test

-- Warehouse 5 (Kolkata)
(35, 5, 2, 45, 10, '2026-09-06'),
(36, 5, 4, 210, 35, '2026-09-13'),
(37, 5, 7, 400, 50, '2026-09-15'),
(38, 5, 14, 190, 25, '2026-09-22'),
(39, 5, 16, 40, 10, '2026-09-09');

-- ---------------------------------------------------------------------
-- 6. INSERT SHIPMENTS (Varied Statuses & Routes)
-- ---------------------------------------------------------------------
INSERT INTO shipment (shipment_id, tracking_no, carrier_id, source_warehouse_id, destination_address, estimated_delivery, status, created_at) VALUES
(1, 'TRK-2026-MUM-1001', 1, 1, 'Plot 45, MIDC Industrial Area, Pune, MH', '2026-10-02', 'Delivered', '2026-09-20 10:15:00'),
(2, 'TRK-2026-MUM-1002', 2, 1, 'Survey 88, Whitefield Tech Zone, Bengaluru, KA', '2026-10-05', 'In Transit', '2026-09-26 14:30:00'),
(3, 'TRK-2026-DEL-2001', 3, 2, 'Sector 62 Electronic City, Noida, UP', '2026-09-28', 'Delivered', '2026-09-24 09:00:00'),
(4, 'TRK-2026-DEL-2002', 4, 2, 'Container Depot, Tughlakabad, New Delhi', '2026-10-06', 'Pending', '2026-09-27 16:45:00'),
(5, 'TRK-2026-BLR-3001', 1, 3, 'Bio-Pharma Tech Hub, Hyderabad, TS', '2026-10-01', 'In Transit', '2026-09-26 11:20:00'),
(6, 'TRK-2026-BLR-3002', 2, 3, 'Electronics SEZ, Sri City, AP', '2026-10-03', 'Pending', '2026-09-28 08:30:00'),
(7, 'TRK-2026-CHE-4001', 5, 4, 'Port Terminal 3, Ennore Harbor, Chennai, TN', '2026-10-10', 'In Transit', '2026-09-25 15:10:00'),
(8, 'TRK-2026-KOL-5001', 3, 5, 'Industrial Growth Centre, Patna, BR', '2026-09-27', 'Delivered', '2026-09-22 13:00:00'),
(9, 'TRK-2026-DEL-2003', 2, 2, 'Cyber Gateway Building, Gurugram, HR', '2026-09-25', 'Delivered', '2026-09-23 11:00:00'),
(10, 'TRK-2026-MUM-1003', 1, 1, 'Automobile Zone, Chakan, Pune, MH', '2026-10-04', 'Pending', '2026-09-28 12:00:00'),
(11, 'TRK-2026-CHE-4002', 2, 4, 'Textile Hub, Tirupur, TN', '2026-10-07', 'Pending', '2026-09-28 14:15:00'),
(12, 'TRK-2026-KOL-5002', 4, 5, 'Heavy Engineering Yard, Jamshedpur, JH', '2026-10-08', 'In Transit', '2026-09-27 17:00:00'),
(13, 'TRK-2026-MUM-1004', 3, 1, 'Commercial Street, Surat, GJ', '2026-09-26', 'Delivered', '2026-09-24 10:00:00'),
(14, 'TRK-2026-BLR-3003', 1, 3, 'Aerospace SEZ, Devanahalli, Bengaluru, KA', '2026-09-25', 'Cancelled', '2026-09-23 16:00:00'),
(15, 'TRK-2026-DEL-2004', 3, 2, 'Industrial Estate, Faridabad, HR', '2026-09-20', 'Delivered', '2026-09-18 09:30:00');

-- ---------------------------------------------------------------------
-- 7. INSERT SHIPMENT ITEMS
-- Note: Trigger 'trg_deduct_stock' will automatically deduct the shipped
-- quantities from the respective warehouse's inventory_stock!
-- ---------------------------------------------------------------------
INSERT INTO shipment_item (shipment_id, item_no, product_id, quantity_shipped) VALUES
-- Shipment 1 (From Warehouse 1)
(1, 1, 1, 5),
(1, 2, 2, 3),
(1, 3, 5, 20),

-- Shipment 2 (From Warehouse 1)
(2, 1, 4, 15),
(2, 2, 7, 25),

-- Shipment 3 (From Warehouse 2)
(3, 1, 1, 6),
(3, 2, 2, 4),

-- Shipment 4 (From Warehouse 2)
(4, 1, 7, 30),
(4, 2, 14, 10),

-- Shipment 5 (From Warehouse 3)
(5, 1, 11, 4),
(5, 2, 20, 8),

-- Shipment 6 (From Warehouse 3)
(6, 1, 1, 10),
(6, 2, 6, 5),
(6, 3, 17, 20),

-- Shipment 7 (From Warehouse 4)
(7, 1, 3, 2),
(7, 2, 5, 40),

-- Shipment 8 (From Warehouse 5)
(8, 1, 4, 20),
(8, 2, 7, 35),

-- Shipment 9 (From Warehouse 2)
(9, 1, 8, 8),
(9, 2, 10, 2),

-- Shipment 10 (From Warehouse 1)
(10, 1, 2, 2),
(10, 2, 6, 2),

-- Shipment 11 (From Warehouse 4)
(11, 1, 8, 12),
(11, 2, 18, 15),

-- Shipment 12 (From Warehouse 5)
(12, 1, 14, 15),
(12, 2, 16, 5),

-- Shipment 13 (From Warehouse 1)
(13, 1, 1, 4),
(13, 2, 8, 6),

-- Shipment 14 (From Warehouse 3 - Cancelled test)
(14, 1, 6, 2),

-- Shipment 15 (From Warehouse 2)
(15, 1, 4, 25),
(15, 2, 8, 5);
