-- Daily Expense Tracker and Budget Tracker
-- MySQL 8 script: creates the database, tables and sample data

CREATE DATABASE IF NOT EXISTS expense_tracker;
USE expense_tracker;

-- Drop old tables first (child tables before parent) so the script can be re-run
DROP TABLE IF EXISTS expenses_backup;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;

-- categories: list of expense types like Food, Travel, Rent
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- expenses: every money spent, linked to one category
CREATE TABLE expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category_id INT NOT NULL,
    expense_date DATE NOT NULL,
    note VARCHAR(200),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- budgets: monthly spending limit for each category (month_year looks like '2026-10')
CREATE TABLE budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    month_year CHAR(7) NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL CHECK (limit_amount > 0),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    UNIQUE (category_id, month_year)
);

-- expenses_backup: copy of old expenses with the time it was backed up
-- (no foreign key and no auto increment, so it keeps data as it is)
CREATE TABLE expenses_backup (
    expense_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category_id INT NOT NULL,
    expense_date DATE NOT NULL,
    note VARCHAR(200),
    backed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data: categories (ids become 1 to 5 in this order)
INSERT INTO categories (name) VALUES
('Food'),
('Travel'),
('Rent'),
('Shopping'),
('Bills');

-- Sample data: 12 expenses in October 2026 (all on or before 5 Oct)
-- category_id: 1 = Food, 2 = Travel, 3 = Rent, 4 = Shopping, 5 = Bills
INSERT INTO expenses (amount, category_id, expense_date, note) VALUES
(150.00,   1, '2026-10-01', 'Breakfast at canteen'),
(320.50,   1, '2026-10-04', 'Dinner with friends'),
(1800.00,  1, '2026-10-03', 'Monthly groceries'),
(60.00,    2, '2026-10-02', 'Bus pass recharge'),
(450.00,   2, '2026-10-04', 'Train ticket home'),
(8000.00,  3, '2026-10-05', 'Hostel rent for October'),
(1299.00,  4, '2026-10-03', 'New headphones'),
(750.00,   4, '2026-10-05', 'T-shirts and jeans'),
(399.00,   5, '2026-10-02', 'Mobile recharge'),
(850.00,   5, '2026-10-04', 'Electricity bill'),
(220.00,   1, '2026-10-05', 'Snacks and juice'),
(120.00,   2, '2026-10-05', 'Auto rickshaw fare');

-- Sample data: October 2026 budget for each category
-- Shopping is 2000 so that it shows "Over budget" (spent is 2049)
INSERT INTO budgets (category_id, month_year, limit_amount) VALUES
(1, '2026-10', 3000.00),
(2, '2026-10', 1000.00),
(3, '2026-10', 8000.00),
(4, '2026-10', 2000.00),
(5, '2026-10', 1500.00);
