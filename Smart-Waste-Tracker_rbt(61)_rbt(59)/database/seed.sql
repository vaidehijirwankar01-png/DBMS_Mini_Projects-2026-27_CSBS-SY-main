-- =============================================================================
-- Smart Waste Collection & Segregation Tracker
-- Seed Data – Realistic Sample Records
-- =============================================================================
-- Target: MySQL 8.0+ (run AFTER schema.sql)
-- Description: Populates all tables with realistic Indian-locale sample data
--              for development, testing, and demonstration purposes.
--
-- NOTE ON PASSWORDS:
--   All seed users have the default password "password123".
--   The placeholder hash below is NOT a real hash — the application's setup
--   script (or Flask shell) should regenerate proper Werkzeug-compatible
--   password hashes before production use.
-- =============================================================================

USE smart_waste_db;

-- Disable FK checks to allow flexible insertion order
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. AREAS (5 records)
-- Realistic Indian neighborhoods with 6-digit PIN codes.
-- =============================================================================
INSERT INTO areas (area_id, area_name, locality, postal_code) VALUES
(1, 'Green Valley',      'Green Valley Residential Layout, Whitefield',        '560066'),
(2, 'Riverside Colony',   'Riverside Colony, Near Hebbal Lake, Hebbal',         '560024'),
(3, 'Tech Park Area',     'ITPL Main Road, EPIP Zone, Whitefield',             '560048'),
(4, 'Old City Center',    'Chickpet, Avenue Road, Majestic Area',              '560002'),
(5, 'Lakeside Gardens',   'Lakeside Gardens, Bellandur, Outer Ring Road',      '560103');

-- =============================================================================
-- 2. WASTE CATEGORIES (4 records)
-- Standard Indian municipal waste classification with UI colour codes.
-- =============================================================================
INSERT INTO waste_categories (category_id, category_name, description, segregation_instructions, color_code) VALUES
(1, 'Wet/Organic',
    'Biodegradable kitchen and garden waste including food scraps, vegetable peels, fruit rinds, tea bags, and garden trimmings.',
    'Place in the GREEN bin. Wrap loose food waste in newspaper. Do not mix with plastic bags. Drain excess liquids before disposal. Includes: cooked food leftovers, eggshells, coffee grounds, small bones, flowers, and leaves.',
    '#2E7D32'),

(2, 'Dry Waste',
    'Non-biodegradable, non-hazardous waste such as paper, cardboard, packaging materials, cloth, and rubber.',
    'Place in the BLUE bin. Flatten cardboard boxes. Remove food residue from packaging. Keep dry. Includes: newspapers, magazines, cartons, thermocol, cloth, leather, rexine, coconut shells, and wooden items.',
    '#1565C0'),

(3, 'Recyclable',
    'Materials that can be reprocessed into new products, including plastics, metals, and glass.',
    'Place in the WHITE bin. Rinse containers to remove food residue. Remove caps from bottles. Crush cans and plastic bottles to save space. Includes: PET bottles, aluminium cans, glass bottles, tin cans, and clean plastic containers.',
    '#F9A825'),

(4, 'Hazardous',
    'Waste that poses a risk to health or the environment, including chemicals, electronics, batteries, and medical waste.',
    'Place in the RED bin. DO NOT mix with any other waste. Keep in original containers where possible. Seal tightly. Includes: batteries, paint cans, CFL/LED bulbs, expired medicines, syringes, pesticides, and e-waste (circuit boards, old phones).',
    '#C62828');

-- =============================================================================
-- 3. USERS (12 records)
-- 2 admins, 5 workers, 5 citizens.
-- Realistic Indian names. All passwords are "password123".
-- The hash below is a PLACEHOLDER – the setup script must regenerate real hashes.
-- =============================================================================

-- Placeholder password hash for "password123"
-- The application's setup/init script should call:
-- Default password for all seed users is 'password123'
-- Werkzeug scrypt hash generated for 'password123':
SET @pwd_hash = 'scrypt:32768:8:1$A3j4SaErBZmSSgGi$75a240a20a034264113fd83fe06c7303c43bc7e1fff5a4af40830ea71f04e1d46a776c299cc6fbc9913aeda3ddd36f0481898c96a3560923ff1b42abc65b22e6';

INSERT INTO users (user_id, full_name, email, password_hash, phone, role, area_id, is_active) VALUES
-- Admins (2)
(1,  'Arjun Mehta',       'admin@smartwaste.com',           @pwd_hash, '9876543210', 'admin',   1, TRUE),
(2,  'Priya Sharma',      'priya.sharma@smartwaste.in',     @pwd_hash, '9876543211', 'admin',   3, TRUE),

-- Workers (5)
(3,  'Ramesh Kumar',      'ramesh.kumar@smartwaste.in',     @pwd_hash, '9876543212', 'worker',  1, TRUE),
(4,  'Suresh Kumar',      'suresh.kumar@email.com',         @pwd_hash, '9876543213', 'worker',  2, TRUE),
(5,  'Lakshmi Devi',      'lakshmi.devi@smartwaste.in',     @pwd_hash, '9876543214', 'worker',  3, TRUE),
(6,  'Manoj Patil',       'manoj.patil@smartwaste.in',      @pwd_hash, '9876543215', 'worker',  4, TRUE),
(7,  'Anita Kumari',      'anita.kumari@smartwaste.in',     @pwd_hash, '9876543216', 'worker',  5, TRUE),

-- Citizens (5)
(8,  'Rahul Sharma',      'rahul.sharma@email.com',         @pwd_hash, '9876543217', 'citizen', 1, TRUE),
(9,  'Sneha Iyer',        'sneha.iyer@gmail.com',           @pwd_hash, '9876543218', 'citizen', 2, TRUE),
(10, 'Deepak Joshi',      'deepak.joshi@gmail.com',         @pwd_hash, '9876543219', 'citizen', 3, TRUE),
(11, 'Kavitha Nair',      'kavitha.nair@gmail.com',         @pwd_hash, '9876543220', 'citizen', 4, TRUE),
(12, 'Rajesh Gupta',      'rajesh.gupta@gmail.com',         @pwd_hash, '9876543221', 'citizen', 5, TRUE);

-- =============================================================================
-- 4. WORKERS (5 records)
-- Each row links to a user with role='worker'.
-- =============================================================================
INSERT INTO workers (worker_id, user_id, availability_status, joining_date, total_collections) VALUES
(1, 3,  'Available',  '2024-01-15', 45),
(2, 4,  'Available',  '2024-03-01', 38),
(3, 5,  'Busy',       '2024-06-10', 22),
(4, 6,  'Available',  '2024-02-20', 31),
(5, 7,  'On Leave',   '2024-08-05', 15);

-- =============================================================================
-- 5. COLLECTION REQUESTS (28 records)
-- Spread across all areas, categories, and statuses.
-- Dates span the last ~3 months (relative to October 2026).
-- =============================================================================
INSERT INTO collection_requests
    (request_id, citizen_id, category_id, area_id, estimated_quantity_kg, actual_quantity_kg,
     pickup_address, preferred_date, status, notes, created_at, completed_at) VALUES

-- ---- Completed requests (7) ----
(1,  8,  1, 1,  5.00,  4.80,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     '2026-08-05', 'Completed', 'Regular kitchen waste pickup',
     '2026-08-03 09:15:00', '2026-08-05 14:30:00'),

(2,  9,  2, 2, 12.50, 11.00,
     '15, Riverside Colony, Near Park, Hebbal',
     '2026-08-10', 'Completed', 'Old newspapers and cardboard',
     '2026-08-08 11:20:00', '2026-08-10 16:45:00'),

(3, 10,  3, 3,  8.00,  7.50,
     'Flat 204, Tech Towers, ITPL Main Road',
     '2026-08-15', 'Completed', 'Plastic bottles and aluminium cans from office',
     '2026-08-13 14:00:00', '2026-08-15 11:20:00'),

(4, 11,  1, 4,  3.50,  3.20,
     '78, Avenue Road, Chickpet, Old City',
     '2026-08-20', 'Completed', 'Kitchen waste and garden trimmings',
     '2026-08-18 08:45:00', '2026-08-20 15:10:00'),

(5, 12,  4, 5,  2.00,  1.80,
     '33, Lakeside Gardens, Block A, Bellandur',
     '2026-08-25', 'Completed', 'Old batteries and expired medicines',
     '2026-08-23 10:30:00', '2026-08-25 13:00:00'),

(6,  8,  2, 1,  6.00,  5.50,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     '2026-09-01', 'Completed', 'Monthly paper and packaging cleanup',
     '2026-08-30 16:00:00', '2026-09-01 12:30:00'),

(7,  9,  1, 2, 10.00,  9.20,
     '15, Riverside Colony, Near Park, Hebbal',
     '2026-09-05', 'Completed', 'Large garden waste from pruning',
     '2026-09-03 07:30:00', '2026-09-05 14:00:00'),

-- ---- Collected (awaiting final processing) (3) ----
(8, 10,  2, 3,  7.00,  6.80,
     'Flat 204, Tech Towers, ITPL Main Road',
     '2026-09-20', 'Collected', 'Packaging materials from office renovation',
     '2026-09-18 13:10:00', NULL),

(9, 11,  3, 4,  4.50,  4.00,
     '78, Avenue Road, Chickpet, Old City',
     '2026-09-25', 'Collected', 'Glass bottles and metal containers',
     '2026-09-23 09:00:00', NULL),

(10, 12,  1, 5,  6.50,  6.00,
     '33, Lakeside Gardens, Block A, Bellandur',
     '2026-09-28', 'Collected', 'Weekly kitchen waste',
     '2026-09-26 15:45:00', NULL),

-- ---- In Progress (4) ----
(11,  8,  3, 1,  9.00,  NULL,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     '2026-10-10', 'In Progress', 'Recyclable plastic from home renovation',
     '2026-10-08 08:00:00', NULL),

(12,  9,  4, 2,  1.50,  NULL,
     '15, Riverside Colony, Near Park, Hebbal',
     '2026-10-12', 'In Progress', 'E-waste: old laptop and phone chargers',
     '2026-10-10 12:30:00', NULL),

(13, 10,  1, 3, 15.00,  NULL,
     'Flat 204, Tech Towers, ITPL Main Road',
     '2026-10-14', 'In Progress', 'Cafeteria food waste – bulk pickup',
     '2026-10-12 07:45:00', NULL),

(14, 11,  2, 4,  5.00,  NULL,
     '78, Avenue Road, Chickpet, Old City',
     '2026-10-15', 'In Progress', 'Old textbooks and magazines',
     '2026-10-13 11:00:00', NULL),

-- ---- Assigned (waiting for worker to start) (4) ----
(15, 12,  1, 5,  4.00,  NULL,
     '33, Lakeside Gardens, Block A, Bellandur',
     '2026-10-18', 'Assigned', 'Regular weekly organic waste',
     '2026-10-16 09:20:00', NULL),

(16,  8,  3, 1,  3.00,  NULL,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     '2026-10-20', 'Assigned', 'Empty paint tins and containers',
     '2026-10-18 14:15:00', NULL),

(17,  9,  2, 2,  8.50,  NULL,
     '15, Riverside Colony, Near Park, Hebbal',
     '2026-10-22', 'Assigned', 'Cardboard from online shopping deliveries',
     '2026-10-20 10:00:00', NULL),

(18, 10,  1, 3, 11.00,  NULL,
     'Flat 204, Tech Towers, ITPL Main Road',
     '2026-10-23', 'Assigned', 'Kitchen and canteen waste',
     '2026-10-21 08:30:00', NULL),

-- ---- Pending (no worker assigned yet) (6) ----
(19, 11,  4, 4,  0.50,  NULL,
     '78, Avenue Road, Chickpet, Old City',
     '2026-10-25', 'Pending', 'Used CFL bulbs – handle with care',
     '2026-10-23 16:00:00', NULL),

(20, 12,  2, 5,  7.00,  NULL,
     '33, Lakeside Gardens, Block A, Bellandur',
     '2026-10-26', 'Pending', 'Old clothes and fabric scraps',
     '2026-10-24 11:30:00', NULL),

(21,  8,  1, 1,  4.50,  NULL,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     '2026-10-27', 'Pending', 'Daily household food waste',
     '2026-10-25 07:00:00', NULL),

(22,  9,  3, 2,  2.50,  NULL,
     '15, Riverside Colony, Near Park, Hebbal',
     '2026-10-28', 'Pending', 'PET bottles and tin cans',
     '2026-10-26 09:45:00', NULL),

(23, 10,  2, 3,  6.00,  NULL,
     'Flat 204, Tech Towers, ITPL Main Road',
     '2026-10-29', 'Pending', 'Thermocol packaging and bubble wrap',
     '2026-10-27 13:15:00', NULL),

(24, 12,  1, 5,  5.50,  NULL,
     '33, Lakeside Gardens, Block A, Bellandur',
     '2026-10-30', 'Pending', 'Kitchen waste after Diwali celebrations',
     '2026-10-28 10:00:00', NULL),

-- ---- Cancelled (2) ----
(25, 11,  2, 4,  3.00,  NULL,
     '78, Avenue Road, Chickpet, Old City',
     '2026-09-10', 'Cancelled', 'Cancelled – disposed via local vendor',
     '2026-09-08 14:00:00', NULL),

(26,  8,  1, 1,  2.00,  NULL,
     '42, 3rd Cross, Green Valley Layout, Whitefield',
     '2026-09-15', 'Cancelled', 'Cancelled – quantity too small, combined with next pickup',
     '2026-09-13 08:30:00', NULL),

-- ---- Additional requests for data richness (2) ----
(27,  9,  1, 2,  3.00,  2.80,
     '15, Riverside Colony, Near Park, Hebbal',
     '2026-10-05', 'Completed', 'Small kitchen waste batch',
     '2026-10-03 06:30:00', '2026-10-05 11:00:00'),

(28, 12,  3, 5,  5.00,  NULL,
     '33, Lakeside Gardens, Block A, Bellandur',
     '2026-10-28', 'Pending', 'Mixed recyclables – bottles and cans',
     '2026-10-26 08:00:00', NULL);

-- =============================================================================
-- 6. ASSIGNMENTS (18 records)
-- Assignments exist for requests in Assigned, In Progress, Collected, or
-- Completed statuses. Cancelled assignments map to cancelled requests.
-- =============================================================================
INSERT INTO assignments
    (assignment_id, request_id, worker_id, assigned_by, assigned_at, assignment_status) VALUES

-- Completed assignments (for completed requests)
(1,   1,  1, 1, '2026-08-04 10:00:00', 'Completed'),
(2,   2,  2, 1, '2026-08-09 09:30:00', 'Completed'),
(3,   3,  3, 2, '2026-08-14 08:00:00', 'Completed'),
(4,   4,  4, 1, '2026-08-19 11:00:00', 'Completed'),
(5,   5,  5, 2, '2026-08-24 09:15:00', 'Completed'),
(6,   6,  1, 1, '2026-08-31 07:30:00', 'Completed'),
(7,   7,  2, 2, '2026-09-04 10:45:00', 'Completed'),
(8,  27,  2, 1, '2026-10-04 08:00:00', 'Completed'),

-- Active assignments (for Collected status)
(9,   8,  3, 2, '2026-09-19 08:00:00', 'Active'),
(10,  9,  4, 1, '2026-09-24 10:30:00', 'Active'),
(11, 10,  1, 2, '2026-09-27 09:00:00', 'Active'),

-- Active assignments (for In Progress status)
(12, 11,  1, 1, '2026-10-09 07:00:00', 'Active'),
(13, 12,  4, 2, '2026-10-11 08:30:00', 'Active'),
(14, 13,  3, 1, '2026-10-13 06:45:00', 'Active'),
(15, 14,  4, 1, '2026-10-14 09:00:00', 'Active'),

-- Active assignments (for Assigned status)
(16, 15,  1, 2, '2026-10-17 08:00:00', 'Active'),
(17, 16,  3, 1, '2026-10-19 10:15:00', 'Active'),
(18, 17,  2, 2, '2026-10-21 07:30:00', 'Active');

-- =============================================================================
-- 7. SEGREGATION RECORDS (12 records)
-- Breakdown of collected waste into categories for completed/collected requests.
-- =============================================================================
INSERT INTO segregation_records
    (segregation_id, request_id, category_id, quantity_kg, is_correctly_segregated,
     segregation_status, recorded_by, remarks) VALUES

-- Request 1 (Wet/Organic, 4.80 kg actual)
(1,  1, 1, 4.50, TRUE,  'Verified',   3, 'Well segregated kitchen waste'),
(2,  1, 2, 0.30, FALSE, 'Incorrect',  3, 'Small amount of plastic bags found mixed in'),

-- Request 2 (Dry, 11.00 kg actual)
(3,  2, 2, 10.50, TRUE,  'Verified',  4, 'Clean newspapers and cardboard'),
(4,  2, 3, 0.50,  TRUE,  'Verified',  4, 'Some recyclable plastic mixed in'),

-- Request 3 (Recyclable, 7.50 kg actual)
(5,  3, 3, 7.00, TRUE,  'Verified',   5, 'Properly crushed PET bottles'),
(6,  3, 2, 0.50, FALSE, 'Incorrect',  5, 'Paper labels not removed from bottles'),

-- Request 4 (Wet/Organic, 3.20 kg actual)
(7,  4, 1, 3.20, TRUE,  'Verified',   6, 'Good segregation of garden waste'),

-- Request 5 (Hazardous, 1.80 kg actual)
(8,  5, 4, 1.80, TRUE,  'Verified',   7, 'Batteries and medicines properly packed'),

-- Request 6 (Dry, 5.50 kg actual)
(9,  6, 2, 5.00, TRUE,  'Verified',   3, 'Clean and dry packaging materials'),
(10, 6, 1, 0.50, FALSE, 'Incorrect',  3, 'Food-stained paper found in dry waste'),

-- Request 7 (Wet/Organic, 9.20 kg actual)
(11, 7, 1, 9.00, TRUE,  'Verified',   4, 'Large batch of garden trimmings'),
(12, 7, 2, 0.20, TRUE,  'Verified',   4, 'Small amount of twine and rope');

-- =============================================================================
-- 8. RECYCLING RECORDS (10 records)
-- How collected waste was ultimately processed/disposed.
-- =============================================================================
INSERT INTO recycling_records
    (recycling_id, request_id, quantity_kg, processing_type, destination, processed_at, notes) VALUES

(1,  1,  4.50, 'Composting',         'Green Valley Composting Yard, Whitefield',
     '2026-08-06 10:00:00', 'Kitchen waste composted successfully'),
(2,  1,  0.30, 'Landfill',           'Mandur Landfill Site',
     '2026-08-06 10:00:00', 'Contaminated plastic – not recyclable'),

(3,  2, 10.50, 'Recycling',          'KK Recyclers Pvt. Ltd., Peenya',
     '2026-08-11 09:00:00', 'Paper and cardboard sent for pulping'),
(4,  2,  0.50, 'Recycling',          'KK Recyclers Pvt. Ltd., Peenya',
     '2026-08-11 09:00:00', 'Plastic segregated and sent for recycling'),

(5,  3,  7.50, 'Recycling',          'EcoPlast Industries, Electronic City',
     '2026-08-16 14:00:00', 'PET bottles and cans processed'),

(6,  4,  3.20, 'Composting',         'Old City Community Compost Pit',
     '2026-08-21 11:30:00', 'Mixed garden and kitchen waste composted'),

(7,  5,  1.80, 'Special Treatment',  'Karnataka State Pollution Control Board Facility',
     '2026-08-26 16:00:00', 'Batteries sent for lead recovery; medicines incinerated'),

(8,  6,  5.50, 'Recycling',          'KK Recyclers Pvt. Ltd., Peenya',
     '2026-09-02 08:30:00', 'Clean packaging recycled into new products'),

(9,  7,  9.00, 'Composting',         'Hebbal Ward Composting Centre',
     '2026-09-06 10:00:00', 'Garden trimmings composted within 45 days'),

(10, 27,  2.80, 'Composting',        'Hebbal Ward Composting Centre',
     '2026-10-06 09:00:00', 'Small kitchen batch composted');

-- =============================================================================
-- 9. FEEDBACK (8 records)
-- Citizens rate completed collections. One feedback per request per citizen.
-- =============================================================================
INSERT INTO feedback
    (feedback_id, request_id, citizen_id, rating, comments, submitted_at) VALUES

(1, 1,  8, 5, 'Excellent service! Worker arrived on time and handled everything carefully.',
   '2026-08-05 18:00:00'),
(2, 2,  9, 4, 'Good pickup, but worker was 30 minutes late.',
   '2026-08-10 20:00:00'),
(3, 3, 10, 5, 'Very professional. Appreciated the segregation tips given by the worker.',
   '2026-08-15 17:30:00'),
(4, 4, 11, 3, 'Decent service but the worker could not carry all the waste in one trip.',
   '2026-08-20 19:00:00'),
(5, 5, 12, 5, 'Hazardous waste handled with proper safety gear. Very impressed!',
   '2026-08-25 16:00:00'),
(6, 6,  8, 4, 'Timely as always. Small issue with scheduling but resolved quickly.',
   '2026-09-01 15:00:00'),
(7, 7,  9, 2, 'Worker did not bring proper bags for garden waste. Had to use my own.',
   '2026-09-05 19:30:00'),
(8, 27, 9, 4, 'Quick pickup. Satisfied with the service.',
   '2026-10-05 14:00:00');

-- =============================================================================
-- 10. COLLECTION STATUS HISTORY (18 records)
-- Audit trail of status transitions for requests.
-- =============================================================================
INSERT INTO collection_status_history
    (history_id, request_id, previous_status, new_status, changed_by, changed_at, remarks) VALUES

-- Request 1 lifecycle
(1,  1, NULL,           'Pending',      8,  '2026-08-03 09:15:00', 'Request created by citizen'),
(2,  1, 'Pending',      'Assigned',     1,  '2026-08-04 10:00:00', 'Assigned to worker Ramesh Kumar'),
(3,  1, 'Assigned',     'In Progress',  3,  '2026-08-05 09:00:00', 'Worker started pickup'),
(4,  1, 'In Progress',  'Collected',    3,  '2026-08-05 12:00:00', 'Waste collected and weighed'),
(5,  1, 'Collected',    'Completed',    1,  '2026-08-05 14:30:00', 'Processing confirmed. Request closed.'),

-- Request 2 lifecycle (abbreviated)
(6,  2, NULL,           'Pending',      9,  '2026-08-08 11:20:00', 'Request created by citizen'),
(7,  2, 'Pending',      'Assigned',     1,  '2026-08-09 09:30:00', 'Assigned to Suresh Yadav'),
(8,  2, 'Assigned',     'Completed',    1,  '2026-08-10 16:45:00', 'Completed – fast-tracked'),

-- Request 11 (In Progress)
(9,  11, NULL,          'Pending',      8,  '2026-10-08 08:00:00', 'Request created'),
(10, 11, 'Pending',     'Assigned',     1,  '2026-10-09 07:00:00', 'Assigned to Ramesh Kumar'),
(11, 11, 'Assigned',    'In Progress',  3,  '2026-10-10 08:30:00', 'Worker en route'),

-- Request 15 (Assigned)
(12, 15, NULL,          'Pending',      12, '2026-10-16 09:20:00', 'Request created'),
(13, 15, 'Pending',     'Assigned',     2,  '2026-10-17 08:00:00', 'Assigned to Ramesh Kumar'),

-- Request 25 (Cancelled)
(14, 25, NULL,          'Pending',      11, '2026-09-08 14:00:00', 'Request created'),
(15, 25, 'Pending',     'Cancelled',    11, '2026-09-09 10:00:00', 'Cancelled by citizen'),

-- Request 19 (Pending – just created)
(16, 19, NULL,          'Pending',      11, '2026-10-23 16:00:00', 'Request created'),

-- Request 27 lifecycle
(17, 27, NULL,          'Pending',      9,  '2026-10-03 06:30:00', 'Request created'),
(18, 27, 'Pending',     'Completed',    1,  '2026-10-05 11:00:00', 'Fast-tracked completion');

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Seed data complete.
-- Summary:
--   Areas               :  5 records
--   Waste Categories     :  4 records
--   Users                : 12 records (2 admin + 5 worker + 5 citizen)
--   Workers              :  5 records
--   Collection Requests  : 28 records
--   Assignments          : 18 records
--   Segregation Records  : 12 records
--   Recycling Records    : 10 records
--   Feedback             :  8 records
--   Status History       : 18 records
-- =============================================================================
