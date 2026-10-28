-- =====================================================================
-- Warehouse & Logistics Management System - Full Setup Script
-- Database: logistics_db
-- Run this in MySQL Workbench or via command line:
-- mysql -u root -p < setup_all.sql
-- =====================================================================

SOURCE schema.sql;
SOURCE seed.sql;

SELECT 'Database logistics_db setup and seeded successfully!' AS Status;
