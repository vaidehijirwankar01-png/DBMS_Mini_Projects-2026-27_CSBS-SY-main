-- Daily Expense Tracker: queries
-- Each query has sample values (run directly in MySQL Workbench).
-- The commented line(s) below it use %s placeholders (for Python mysql-connector).
-- In Python, a literal % must be written as %% (for example '%%Y-%%m').
-- Note: queries 2, 3, 4, 7 and 8 change data. Re-run schema.sql to reset the sample data.

USE expense_tracker;

-- 1. List all expenses
-- Shows every expense with its category name, newest first.
SELECT e.expense_id, e.amount, c.name AS category, e.expense_date, e.note
FROM expenses e
JOIN categories c ON e.category_id = c.category_id
ORDER BY e.expense_date DESC, e.expense_id DESC;
-- SELECT e.expense_id, e.amount, c.name AS category, e.expense_date, e.note
-- FROM expenses e
-- JOIN categories c ON e.category_id = c.category_id
-- ORDER BY e.expense_date DESC, e.expense_id DESC;

-- 2. Insert an expense
-- Adds one new expense row.
INSERT INTO expenses (amount, category_id, expense_date, note)
VALUES (250.00, 1, '2026-10-05', 'Lunch at cafe');
-- INSERT INTO expenses (amount, category_id, expense_date, note)
-- VALUES (%s, %s, %s, %s);

-- 3. Update an expense
-- Changes the details of one expense, found by its expense_id.
UPDATE expenses
SET amount = 275.00, category_id = 1, expense_date = '2026-10-05', note = 'Lunch and juice'
WHERE expense_id = 3;
-- UPDATE expenses
-- SET amount = %s, category_id = %s, expense_date = %s, note = %s
-- WHERE expense_id = %s;

-- 4. Delete an expense
-- Removes one expense, found by its expense_id.
DELETE FROM expenses
WHERE expense_id = 3;
-- DELETE FROM expenses
-- WHERE expense_id = %s;

-- 5. Total spent per category for a month
-- Adds up the expenses of each category for the chosen month.
SELECT c.name AS category, SUM(e.amount) AS total_spent
FROM expenses e
JOIN categories c ON e.category_id = c.category_id
WHERE DATE_FORMAT(e.expense_date, '%Y-%m') = '2026-10'
GROUP BY c.name;
-- SELECT c.name AS category, SUM(e.amount) AS total_spent
-- FROM expenses e
-- JOIN categories c ON e.category_id = c.category_id
-- WHERE DATE_FORMAT(e.expense_date, '%%Y-%%m') = %s
-- GROUP BY c.name;

-- 6. Spent vs budget per category for a month
-- Shows limit, spent, remaining and status; categories with no expenses show spent = 0.
SELECT c.name AS category,
       b.limit_amount,
       IFNULL(SUM(e.amount), 0) AS spent,
       b.limit_amount - IFNULL(SUM(e.amount), 0) AS remaining,
       CASE
           WHEN IFNULL(SUM(e.amount), 0) > b.limit_amount THEN 'Over budget'
           ELSE 'OK'
       END AS status
FROM budgets b
JOIN categories c ON b.category_id = c.category_id
LEFT JOIN expenses e
       ON e.category_id = b.category_id
      AND DATE_FORMAT(e.expense_date, '%Y-%m') = b.month_year
WHERE b.month_year = '2026-10'
GROUP BY c.name, b.limit_amount;
-- SELECT c.name AS category,
--        b.limit_amount,
--        IFNULL(SUM(e.amount), 0) AS spent,
--        b.limit_amount - IFNULL(SUM(e.amount), 0) AS remaining,
--        CASE
--            WHEN IFNULL(SUM(e.amount), 0) > b.limit_amount THEN 'Over budget'
--            ELSE 'OK'
--        END AS status
-- FROM budgets b
-- JOIN categories c ON b.category_id = c.category_id
-- LEFT JOIN expenses e
--        ON e.category_id = b.category_id
--       AND DATE_FORMAT(e.expense_date, '%%Y-%%m') = b.month_year
-- WHERE b.month_year = %s
-- GROUP BY c.name, b.limit_amount;

-- 7. Insert or update a budget
-- Adds a budget, or changes the limit if that category and month already have one.
INSERT INTO budgets (category_id, month_year, limit_amount)
VALUES (1, '2026-10', 3500.00)
ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount);
-- INSERT INTO budgets (category_id, month_year, limit_amount)
-- VALUES (%s, %s, %s)
-- ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount);

-- 8. Backup expenses
-- Copies all rows from expenses into expenses_backup (backed_up_at fills itself).
INSERT INTO expenses_backup (expense_id, amount, category_id, expense_date, note)
SELECT expense_id, amount, category_id, expense_date, note
FROM expenses;
-- INSERT INTO expenses_backup (expense_id, amount, category_id, expense_date, note)
-- SELECT expense_id, amount, category_id, expense_date, note
-- FROM expenses;

-- 9. Show backups
-- Lists all backed up rows, latest backup first.
SELECT expense_id, amount, category_id, expense_date, note, backed_up_at
FROM expenses_backup
ORDER BY backed_up_at DESC;
-- SELECT expense_id, amount, category_id, expense_date, note, backed_up_at
-- FROM expenses_backup
-- ORDER BY backed_up_at DESC;

-- 10. List all categories
-- Fills the category dropdown in the add/edit form and the budget form.
SELECT category_id, name
FROM categories
ORDER BY name;
-- SELECT category_id, name
-- FROM categories
-- ORDER BY name;

-- 11. Get one expense
-- Loads a single expense to fill the edit form.
SELECT expense_id, amount, category_id, expense_date, note
FROM expenses
WHERE expense_id = 3;
-- SELECT expense_id, amount, category_id, expense_date, note
-- FROM expenses
-- WHERE expense_id = %s;
