USE miniproject;

-- =========================================
-- 1. CUSTOMERS
-- =========================================

INSERT INTO Customers
(customer_id, name, email, phone, address, city)
VALUES

(1, 'Aarav Sharma', 'aarav@gmail.com', '9876500001', 'FC Road', 'Pune'),
(2, 'Diya Patel', 'diya@gmail.com', '9876500002', 'Baner Road', 'Pune'),
(3, 'Kabir Joshi', 'kabir@gmail.com', '9876500003', 'Wakad', 'Pune'),
(4, 'Ananya Deshmukh', 'ananya@gmail.com', '9876500004', 'Hinjewadi', 'Pune'),
(5, 'Vivaan Shah', 'vivaan@gmail.com', '9876500005', 'Kothrud', 'Pune'),
(6, 'Ishita Kulkarni', 'ishita@gmail.com', '9876500006', 'Viman Nagar', 'Pune'),
(7, 'Aryan Gupta', 'aryan@gmail.com', '9876500007', 'Aundh', 'Pune'),
(8, 'Meera Patil', 'meera@gmail.com', '9876500008', 'Pimpri', 'Pune'),
(12, 'Harish Dandekar', 'hd@gmail.com', '9976500008', 'Pimpri', 'Pune');


-- =========================================
-- 2. EMPLOYEES
-- =========================================

INSERT INTO Employees
(employee_id, name, email, phone, department, designation, joining_date)
VALUES
(1, 'Rahul Verma', 'rahul@company.com', '9823012345',
 'Sales', 'Sales Executive', '2025-01-10'),

(2, 'Priya Nair', 'priya@company.com', '9823012346',
 'Marketing', 'Marketing Manager', '2025-02-15'),

(3, 'Kunal Mehta', 'kunal@company.com', '9823012347',
 'Customer Support', 'Support Executive', '2025-03-20'),

(4, 'Sneha Rao', 'sneha@company.com', '9823012348',
 'Finance', 'Accountant', '2025-04-05'),

(5, 'Vikram Singh', 'vikram@company.com', '9823012349',
 'IT', 'Software Engineer', '2025-05-12'),

(6, 'Nisha Kapoor', 'nisha@company.com', '9823012350',
 'Sales', 'Sales Manager', '2024-08-20'),

(7, 'Riya Malhotra', 'riya@company.com', '9823012351',
 'Marketing', 'Marketing Executive', '2025-06-10'),

(8, 'Manish Yadav', 'manish@company.com', '9823012352',
 'Customer Support', 'Support Manager', '2024-09-15');


-- =========================================
-- 3. LEADS
-- =========================================

INSERT INTO Leads
(lead_id, customer_id, employee_id, source, status, lead_date)
VALUES
(1, 1, 1, 'Website', 'New', '2026-09-20'),
(2, 2, 2, 'Instagram', 'Contacted', '2026-09-21'),
(3, 3, 1, 'Referral', 'Qualified', '2026-09-22'),
(4, 4, 6, 'Email', 'Proposal', '2026-09-23'),
(5, 5, 7, 'Facebook', 'Negotiation', '2026-09-24'),
(6, 6, 2, 'Website', 'Converted', '2026-09-25'),
(7, 7, 6, 'Referral', 'Lost', '2026-09-26'),
(8, 8, 1, 'LinkedIn', 'Qualified', '2026-09-27');


-- =========================================
-- 4. PRODUCTS
-- =========================================

INSERT INTO Products
(product_id, product_name, category, price, stock)
VALUES
(1, 'CRM Basic', 'Software', 15000.00, 100),
(2, 'CRM Premium', 'Software', 30000.00, 50),
(3, 'Business Analytics', 'Service', 20000.00, 30),
(4, 'Marketing Automation', 'Software', 25000.00, 40),
(5, 'Customer Support Suite', 'Software', 18000.00, 60),
(6, 'Enterprise CRM', 'Software', 50000.00, 20);


-- =========================================
-- 5. DEALS
-- =========================================

INSERT INTO Deals
(deal_id, customer_id, employee_id, product_id,
 deal_amount, stage, deal_date)
VALUES
(1, 1, 1, 1, 15000.00, 'Closed Won', '2026-09-25'),
(2, 2, 2, 2, 30000.00, 'Negotiation', '2026-09-26'),
(3, 3, 1, 3, 20000.00, 'Proposal', '2026-09-27'),
(4, 4, 6, 4, 25000.00, 'Closed Won', '2026-09-28'),
(5, 5, 7, 5, 18000.00, 'Qualified', '2026-09-29'),
(6, 6, 2, 6, 50000.00, 'Closed Won', '2026-09-30'),
(7, 7, 6, 2, 30000.00, 'Closed Lost', '2026-10-01'),
(8, 8, 1, 3, 20000.00, 'Prospecting', '2026-10-02');


-- =========================================
-- 6. INTERACTIONS
-- =========================================

INSERT INTO Interactions
(interaction_id, customer_id, employee_id,
 interaction_type, interaction_date, notes)
VALUES
(1, 1, 1, 'Call',
 '2026-09-25', 'Discussed CRM Basic features'),

(2, 2, 2, 'Email',
 '2026-09-26', 'Sent CRM Premium quotation'),

(3, 3, 1, 'Meeting',
 '2026-09-27', 'Discussed business requirements'),

(4, 4, 6, 'Call',
 '2026-09-28', 'Discussed marketing automation'),

(5, 5, 7, 'Email',
 '2026-09-29', 'Sent product information'),

(6, 6, 2, 'Meeting',
 '2026-09-30', 'Finalized enterprise CRM deal'),

(7, 7, 6, 'Call',
 '2026-10-01', 'Customer rejected the proposal'),

(8, 8, 1, 'Meeting',
 '2026-10-02', 'Initial product discussion');