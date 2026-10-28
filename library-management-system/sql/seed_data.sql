-- =====================================================================
-- DATABASE MANAGEMENT SYSTEM (DBMS) MINI PROJECT
-- Sample Data Seeding Script (DML)
-- Project: Library Management System
-- =====================================================================

-- 1. Insert Publishers
INSERT INTO publishers (publisher_id, name, address, phone, email) VALUES
(1, 'McGraw-Hill Education', '1325 Avenue of the Americas, New York, NY', '+1-800-338-3987', 'orders@mheducation.com'),
(2, 'Pearson Education', '80 Strand, London, WC2R 0RL, UK', '+44-20-7010-2000', 'support@pearson.com'),
(3, 'MIT Press', 'One Broadway, 12th Floor, Cambridge, MA', '+1-617-253-5646', 'mitpress-orders@mit.edu'),
(4, 'O''Reilly Media', '1005 Gravenstein Highway North, Sebastopol, CA', '+1-707-827-7000', 'info@oreilly.com'),
(5, 'Prentice Hall', 'Upper Saddle River, NJ', '+1-201-236-7000', 'contact@prenticehall.com'),
(6, 'Cambridge University Press', 'University Printing House, Cambridge, UK', '+44-1223-358331', 'information@cambridge.org'),
(7, 'Springer Science', 'Heidelberger Platz 3, Berlin, Germany', '+49-30-82787-0', 'service@springer.com');

-- 2. Insert Categories
INSERT INTO categories (category_id, category_name, description) VALUES
(1, 'Database Systems', 'Relational models, SQL, indexing, transaction processing, and query optimization'),
(2, 'Computer Science', 'Foundations of computing, data structures, algorithms, and complexity theory'),
(3, 'Artificial Intelligence', 'Machine learning, deep learning, computer vision, and neural architectures'),
(4, 'Software Engineering', 'System architecture, design patterns, clean code, agile methodologies'),
(5, 'Computer Networks', 'Network protocols, distributed systems, OSI model, socket programming'),
(6, 'Mathematics', 'Discrete mathematics, linear algebra, graph theory, probability, and statistics');

-- 3. Insert Authors
INSERT INTO authors (author_id, first_name, last_name, biography) VALUES
(1, 'Abraham', 'Silberschatz', 'Professor of Computer Science at Yale University; renowned DBMS and OS author'),
(2, 'Henry', 'Korth', 'Professor of Computer Science at Lehigh University; pioneer in database systems'),
(3, 'S.', 'Sudarshan', 'Professor of Computer Science at IIT Bombay; expert in database query processing'),
(4, 'Thomas', 'Cormen', 'Professor Emeritus of Computer Science at Dartmouth College; co-author of CLRS'),
(5, 'Charles', 'Leiserson', 'Professor of Computer Science and Engineering at MIT; ACM Fellow'),
(6, 'Ronald', 'Rivest', 'Cryptographer and Institute Professor at MIT; Turing Award Laureate (RSA)'),
(7, 'Clifford', 'Stein', 'Professor of Industrial Engineering and Operations Research at Columbia University'),
(8, 'Stuart', 'Russell', 'Professor of Computer Science at UC Berkeley; pioneer in artificial intelligence'),
(9, 'Peter', 'Norvig', 'Distinguished Education Fellow at Stanford and Research Director at Google'),
(10, 'Robert', 'Martin', 'Known colloquially as "Uncle Bob"; author of Clean Code and agile manifesto co-author'),
(11, 'Erich', 'Gamma', 'Renowned Swiss computer scientist and one of the Gang of Four (GoF) authors'),
(12, 'Andrew', 'Tanenbaum', 'Professor Emeritus at Vrije Universiteit Amsterdam; MINIX creator and networking author'),
(13, 'Donald', 'Knuth', 'Professor Emeritus at Stanford University; Father of Analysis of Algorithms, Turing Award'),
(14, 'Ian', 'Goodfellow', 'Computer scientist recognized as the pioneer of Generative Adversarial Networks (GANs)'),
(15, 'Kenneth', 'Rosen', 'Author of prominent discrete mathematics and telecommunications textbooks');

-- 4. Insert Books
INSERT INTO books (book_id, isbn, title, category_id, publisher_id, publication_year, total_copies, available_copies, shelf_location, price) VALUES
(1, '978-0078022159', 'Database System Concepts (7th Ed)', 1, 1, 2019, 6, 4, 'Shelf-DB-01', 89.99),
(2, '978-0133970777', 'Fundamentals of Database Systems', 1, 2, 2015, 5, 3, 'Shelf-DB-02', 95.50),
(3, '978-0262046305', 'Introduction to Algorithms (4th Ed)', 2, 3, 2022, 8, 5, 'Shelf-CS-01', 110.00),
(4, '978-0134610993', 'Artificial Intelligence: A Modern Approach', 3, 2, 2020, 5, 2, 'Shelf-AI-01', 120.00),
(5, '978-0132350884', 'Clean Code: Agile Software Craftsmanship', 4, 5, 2008, 7, 5, 'Shelf-SE-01', 45.00),
(6, '978-0201633610', 'Design Patterns: Elements of Reusable Object-Oriented Software', 4, 2, 1994, 4, 2, 'Shelf-SE-02', 54.99),
(7, '978-0132126953', 'Computer Networks (5th Ed)', 5, 2, 2010, 5, 3, 'Shelf-NW-01', 82.50),
(8, '978-0133591620', 'Modern Operating Systems (4th Ed)', 2, 2, 2014, 6, 4, 'Shelf-OS-01', 88.00),
(9, '978-0201896831', 'The Art of Computer Programming, Vol 1', 2, 2, 1997, 3, 2, 'Shelf-CS-02', 65.00),
(10, '978-0262035613', 'Deep Learning (Adaptive Computation)', 3, 3, 2016, 4, 3, 'Shelf-AI-02', 78.00),
(11, '978-0073383095', 'Discrete Mathematics and Its Applications', 6, 1, 2018, 6, 5, 'Shelf-MA-01', 92.00),
(12, '978-1492078005', 'Designing Data-Intensive Applications', 1, 4, 2017, 7, 4, 'Shelf-DB-03', 49.99);

-- 5. Insert Book_Authors (Many-to-Many resolution)
INSERT INTO book_authors (book_id, author_id) VALUES
(1, 1), -- Silberschatz on Database System Concepts
(1, 2), -- Korth on Database System Concepts
(1, 3), -- Sudarshan on Database System Concepts
(2, 1), -- Silberschatz related reference
(3, 4), -- Cormen on CLRS
(3, 5), -- Leiserson on CLRS
(3, 6), -- Rivest on CLRS
(3, 7), -- Stein on CLRS
(4, 8), -- Russell on AI
(4, 9), -- Norvig on AI
(5, 10), -- Martin on Clean Code
(6, 11), -- Gamma on Design Patterns
(7, 12), -- Tanenbaum on Networks
(8, 12), -- Tanenbaum on Operating Systems
(9, 13), -- Knuth on TAOCP
(10, 14), -- Goodfellow on Deep Learning
(11, 15); -- Rosen on Discrete Math

-- 6. Insert Members
INSERT INTO members (member_id, first_name, last_name, email, phone, membership_type, join_date, max_books_allowed, status) VALUES
(1, 'Aarav', 'Sharma', 'aarav.sharma@univ.edu', '+91-9876543210', 'Student', '2024-08-15', 3, 'Active'),
(2, 'Priya', 'Patel', 'priya.patel@univ.edu', '+91-9876543211', 'Student', '2024-08-18', 3, 'Active'),
(3, 'Dr. Rajesh', 'Verma', 'r.verma@univ.edu', '+91-9876543212', 'Faculty', '2023-01-10', 6, 'Active'),
(4, 'Ananya', 'Iyer', 'ananya.iyer@univ.edu', '+91-9876543213', 'Student', '2024-09-01', 3, 'Active'),
(5, 'Vikram', 'Malhotra', 'vikram.m@univ.edu', '+91-9876543214', 'Student', '2024-09-05', 3, 'Suspended'),
(6, 'Prof. Sunita', 'Deshmukh', 's.deshmukh@univ.edu', '+91-9876543215', 'Faculty', '2022-07-20', 6, 'Active'),
(7, 'Rohan', 'Gupta', 'rohan.gupta@univ.edu', '+91-9876543216', 'Student', '2024-08-25', 3, 'Active'),
(8, 'Kavita', 'Nair', 'kavita.nair@community.org', '+91-9876543217', 'General', '2024-05-12', 2, 'Active');

-- 7. Insert Staff
INSERT INTO staff (staff_id, first_name, last_name, role, email, phone) VALUES
(1, 'Nisha', 'Reddy', 'Admin', 'nisha.reddy@library.univ.edu', '+91-9988776655'),
(2, 'Manoj', 'Kumar', 'Librarian', 'manoj.kumar@library.univ.edu', '+91-9988776656'),
(3, 'Swati', 'Joshi', 'Assistant', 'swati.joshi@library.univ.edu', '+91-9988776657');

-- 8. Insert Loans (Sample transactions: past returned, active, overdue)
INSERT INTO loans (loan_id, book_id, member_id, staff_id, issue_date, due_date, return_date, status) VALUES
(1, 1, 1, 2, '2024-09-01', '2024-09-15', '2024-09-14', 'Returned'),
(2, 3, 2, 2, '2024-09-05', '2024-09-19', '2024-09-22', 'Returned'), -- Returned 3 days late
(3, 4, 3, 1, '2024-10-01', '2024-10-31', NULL, 'Issued'),             -- Active Faculty loan
(4, 5, 4, 3, '2024-09-10', '2024-09-24', NULL, 'Overdue'),            -- Past due date
(5, 6, 5, 2, '2024-08-20', '2024-09-03', NULL, 'Overdue'),            -- Seriously overdue
(6, 12, 1, 2, '2024-10-10', '2024-10-24', NULL, 'Issued'),            -- Active Student loan
(7, 2, 7, 3, '2024-10-12', '2024-10-26', NULL, 'Issued'),             -- Active Student loan
(8, 7, 3, 1, '2024-10-05', '2024-11-05', NULL, 'Issued'),             -- Active Faculty loan
(9, 8, 8, 2, '2024-10-01', '2024-10-15', NULL, 'Overdue');            -- Overdue general loan

-- 9. Insert Fines (associated with late returns or overdue loans)
INSERT INTO fines (fine_id, loan_id, fine_amount, fine_date, paid_status, paid_date) VALUES
(1, 2, 15.00, '2024-09-22', 'Paid', '2024-09-22'),   -- Late return paid (3 days * Rs 5)
(2, 4, 50.00, '2024-09-25', 'Unpaid', NULL),         -- Unpaid fine on loan 4
(3, 5, 120.00, '2024-09-04', 'Unpaid', NULL);        -- Unpaid fine on loan 5
