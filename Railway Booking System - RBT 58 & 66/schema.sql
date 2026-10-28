-- ============================================================================
-- RAILWAY TICKET BOOKING SYSTEM - RELATIONAL DATABASE SCHEMA (STAGE 2)
-- Derived strictly from approved ER Diagram: Railway_System_ERD.drawio
-- ============================================================================

CREATE DATABASE IF NOT EXISTS railway_db;
USE railway_db;

-- Drop child tables first to respect foreign key constraints
DROP TABLE IF EXISTS TICKET;
DROP TABLE IF EXISTS SEAT;
DROP TABLE IF EXISTS SCHEDULE;
DROP TABLE IF EXISTS COACH;
DROP TABLE IF EXISTS TRAIN;
DROP TABLE IF EXISTS ROUTE;
DROP TABLE IF EXISTS STATION;
DROP TABLE IF EXISTS PASSENGER;

-- ----------------------------------------------------------------------------
-- 1. PASSENGER ENTITY
-- ----------------------------------------------------------------------------
CREATE TABLE PASSENGER (
    Passenger_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Gender VARCHAR(10) NOT NULL,
    Date_of_Birth DATE NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Phone_No VARCHAR(15) NOT NULL,
    Address VARCHAR(255) NOT NULL,
    Aadhaar_No VARCHAR(12) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 2. STATION ENTITY
-- ----------------------------------------------------------------------------
CREATE TABLE STATION (
    Station_ID VARCHAR(10) PRIMARY KEY,
    Station_Name VARCHAR(120) NOT NULL,
    City VARCHAR(100) NOT NULL,
    State VARCHAR(100) NOT NULL,
    Zone VARCHAR(10) NOT NULL,
    Platform_Count INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 3. ROUTE ENTITY
-- ----------------------------------------------------------------------------
CREATE TABLE ROUTE (
    Route_ID INT AUTO_INCREMENT PRIMARY KEY,
    Source_Station VARCHAR(100) NOT NULL,
    Destination_Station VARCHAR(100) NOT NULL,
    Distance DECIMAL(8,2) NOT NULL,
    Travel_Time VARCHAR(30) NOT NULL,
    No_of_Stops INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 4. TRAIN ENTITY
-- ----------------------------------------------------------------------------
CREATE TABLE TRAIN (
    Train_No INT PRIMARY KEY,
    Train_Name VARCHAR(120) NOT NULL,
    Type VARCHAR(50) NOT NULL,
    Source_Station VARCHAR(100) NOT NULL,
    Destination_Station VARCHAR(100) NOT NULL,
    Total_Coaches INT NOT NULL DEFAULT 16,
    Running_Days VARCHAR(100) NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'On Time'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 5. COACH ENTITY
-- Related to TRAIN (HAS) and ROUTE (BELONGS_TO)
-- ----------------------------------------------------------------------------
CREATE TABLE COACH (
    Coach_ID INT AUTO_INCREMENT PRIMARY KEY,
    Train_No INT NOT NULL,
    Route_ID INT NOT NULL,
    Coach_No VARCHAR(10) NOT NULL,
    Coach_Type VARCHAR(50) NOT NULL,
    Class VARCHAR(20) NOT NULL,
    Capacity INT NOT NULL,
    Fare DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Train_No) REFERENCES TRAIN(Train_No) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (Route_ID) REFERENCES ROUTE(Route_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 6. SCHEDULE ENTITY
-- Related to STATION (HAS) and TRAIN (STOPS_AT)
-- ----------------------------------------------------------------------------
CREATE TABLE SCHEDULE (
    Schedule_ID INT AUTO_INCREMENT PRIMARY KEY,
    Train_No INT NOT NULL,
    Station_ID VARCHAR(10) NOT NULL,
    Arrival_Time TIME NULL,
    Departure_Time TIME NULL,
    Day_No INT NOT NULL DEFAULT 1,
    Platform_No INT NOT NULL DEFAULT 1,
    FOREIGN KEY (Train_No) REFERENCES TRAIN(Train_No) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (Station_ID) REFERENCES STATION(Station_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 7. SEAT ENTITY
-- ----------------------------------------------------------------------------
CREATE TABLE SEAT (
    Seat_ID INT AUTO_INCREMENT PRIMARY KEY,
    Coach_ID INT NULL,
    Coach_No VARCHAR(10) NOT NULL,
    Seat_No INT NOT NULL,
    Berth_Type VARCHAR(30) NOT NULL,
    FOREIGN KEY (Coach_ID) REFERENCES COACH(Coach_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 8. TICKET ENTITY
-- Related to PASSENGER (BOOKS) and SEAT (RESERVES)
-- ----------------------------------------------------------------------------
CREATE TABLE TICKET (
    Ticket_ID INT AUTO_INCREMENT PRIMARY KEY,
    Passenger_ID INT NOT NULL,
    Seat_ID INT NULL,
    Train_No INT NULL,
    PNR_No VARCHAR(10) NOT NULL UNIQUE,
    Booking_Date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Journey_Date DATE NOT NULL,
    Booking_Status VARCHAR(25) NOT NULL DEFAULT 'Confirmed',
    Class VARCHAR(15) NOT NULL,
    Quota VARCHAR(30) NOT NULL DEFAULT 'General',
    Amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Passenger_ID) REFERENCES PASSENGER(Passenger_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (Seat_ID) REFERENCES SEAT(Seat_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (Train_No) REFERENCES TRAIN(Train_No) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- FICTIONAL SAMPLE RECORDS FOR TESTING (STAGE 2)
-- All data below is clearly labelled test data
-- ============================================================================

-- [SAMPLE DATA] 1. PASSENGERS
INSERT INTO PASSENGER (Passenger_ID, Name, Gender, Date_of_Birth, Email, Phone_No, Address, Aadhaar_No) VALUES
(1, 'Aarav Sharma',   'Male',   '1995-04-12', 'aarav.sharma@example.test',   '9876543210', 'Flat 402, Green Park, New Delhi',        '123456789012'),
(2, 'Priya Patel',    'Female', '1998-09-23', 'priya.patel@example.test',    '9811223344', '12, Sunrise Apts, Navrangpura, Ahmedabad','234567890123'),
(3, 'Rohan Kulkarni', 'Male',   '1990-11-05', 'rohan.kulkarni@example.test', '9765432109', '45, Deccan Gymkhana, Pune',              '345678901234'),
(4, 'Ananya Iyer',    'Female', '2001-02-18', 'ananya.iyer@example.test',    '9988776655', '88, Anna Nagar West, Chennai',           '456789012345');

-- [SAMPLE DATA] 2. STATIONS
INSERT INTO STATION (Station_ID, Station_Name, City, State, Zone, Platform_Count) VALUES
('NDLS', 'New Delhi Railway Station',          'New Delhi',  'Delhi',         'NR',  16),
('MMCT', 'Mumbai Central',                     'Mumbai',     'Maharashtra',   'WR',  8),
('BSB',  'Varanasi Junction',                  'Varanasi',   'Uttar Pradesh', 'NR',  9),
('CNB',  'Kanpur Central',                     'Kanpur',     'Uttar Pradesh', 'NCR', 10),
('SBC',  'KSR Bengaluru City Junction',        'Bengaluru',  'Karnataka',     'SWR', 10),
('MAS',  'MGR Chennai Central',                'Chennai',    'Tamil Nadu',    'SR',  12),
('HWH',  'Howrah Junction',                    'Kolkata',    'West Bengal',   'ER',  23),
('ADI',  'Ahmedabad Junction',                 'Ahmedabad',  'Gujarat',       'WR',  12),
('SVDK', 'Shri Mata Vaishno Devi Katra',       'Katra',      'Jammu & Kashmir','NR', 5);

-- [SAMPLE DATA] 3. ROUTES
INSERT INTO ROUTE (Route_ID, Source_Station, Destination_Station, Distance, Travel_Time, No_of_Stops) VALUES
(1, 'New Delhi (NDLS)', 'Varanasi Junction (BSB)',       757.00,  '08h 00m', 2),
(2, 'New Delhi (NDLS)', 'Mumbai Central (MMCT)',        1384.00,  '15h 32m', 5),
(3, 'KSR Bengaluru (SBC)', 'MGR Chennai Central (MAS)',  358.00,  '04h 25m', 2),
(4, 'Howrah Junction (HWH)', 'New Delhi (NDLS)',        1447.00,  '17h 15m', 6);

-- [SAMPLE DATA] 4. TRAINS
INSERT INTO TRAIN (Train_No, Train_Name, Type, Source_Station, Destination_Station, Total_Coaches, Running_Days, Status) VALUES
(22436, 'Vande Bharat Express',     'Vande Bharat', 'NDLS', 'BSB',  16, 'Mon,Tue,Wed,Fri,Sat,Sun', 'On Time'),
(12952, 'Tejas Rajdhani Express',   'Rajdhani',     'NDLS', 'MMCT', 20, 'Daily',                   'On Time'),
(12028, 'Shatabdi Express',         'Shatabdi',     'SBC',  'MAS',  14, 'Daily except Tue',        'On Time'),
(12301, 'Howrah Rajdhani Express',  'Rajdhani',     'HWH',  'NDLS', 21, 'Daily',                   'On Time');

-- [SAMPLE DATA] 5. COACHES
INSERT INTO COACH (Coach_ID, Train_No, Route_ID, Coach_No, Coach_Type, Class, Capacity, Fare) VALUES
-- Vande Bharat (Train 22436, Route 1)
(1, 22436, 1, 'C1', 'AC Chair Car',          'CC', 78, 1750.00),
(2, 22436, 1, 'C2', 'AC Chair Car',          'CC', 78, 1750.00),
(3, 22436, 1, 'E1', 'Executive Chair Car',   'EC', 52, 3300.00),
-- Tejas Rajdhani (Train 12952, Route 2)
(4, 12952, 2, 'B1', 'AC 3 Tier',             '3A', 64, 2840.00),
(5, 12952, 2, 'B2', 'AC 3 Tier',             '3A', 64, 2840.00),
(6, 12952, 2, 'A1', 'AC 2 Tier',             '2A', 48, 3920.00),
(7, 12952, 2, 'H1', 'AC First Class',        '1A', 24, 4890.00),
-- Shatabdi Express (Train 12028, Route 3)
(8, 12028, 3, 'C1', 'AC Chair Car',          'CC', 78,  685.00),
(9, 12028, 3, 'E1', 'Executive Chair Car',   'EC', 52, 1280.00),
-- Howrah Rajdhani (Train 12301, Route 4)
(10, 12301, 4, 'B1', 'AC 3 Tier',            '3A', 64, 2620.00),
(11, 12301, 4, 'A1', 'AC 2 Tier',            '2A', 48, 3680.00);

-- [SAMPLE DATA] 6. SCHEDULES (Train Stops & Timings)
INSERT INTO SCHEDULE (Schedule_ID, Train_No, Station_ID, Arrival_Time, Departure_Time, Day_No, Platform_No) VALUES
-- 22436 Vande Bharat (NDLS -> CNB -> BSB)
(1, 22436, 'NDLS', NULL,       '06:00:00', 1, 16),
(2, 22436, 'CNB',  '10:08:00', '10:10:00', 1, 1),
(3, 22436, 'BSB',  '14:00:00', NULL,       1, 1),

-- 12952 Tejas Rajdhani (NDLS -> MMCT)
(4, 12952, 'NDLS', NULL,       '16:55:00', 1, 3),
(5, 12952, 'MMCT', '08:35:00', NULL,       2, 1),

-- 12028 Shatabdi (SBC -> MAS)
(6, 12028, 'SBC',  NULL,       '06:00:00', 1, 7),
(7, 12028, 'MAS',  '11:00:00', NULL,       1, 2),

-- 12301 Howrah Rajdhani (HWH -> CNB -> NDLS)
(8, 12301, 'HWH',  NULL,       '16:50:00', 1, 9),
(9, 12301, 'CNB',  '04:50:00', '04:55:00', 2, 1),
(10, 12301, 'NDLS', '10:05:00', NULL,       2, 1);

-- [SAMPLE DATA] 7. SEATS
INSERT INTO SEAT (Seat_ID, Coach_ID, Coach_No, Seat_No, Berth_Type) VALUES
(1, 1, 'C1', 12, 'Window'),
(2, 1, 'C1', 13, 'Aisle'),
(3, 4, 'B1', 21, 'Lower Berth'),
(4, 4, 'B1', 22, 'Middle Berth'),
(5, 4, 'B1', 23, 'Upper Berth'),
(6, 6, 'A1',  7, 'Side Lower');

-- [SAMPLE DATA] 8. TICKETS
INSERT INTO TICKET (Ticket_ID, Passenger_ID, Seat_ID, Train_No, PNR_No, Booking_Date, Journey_Date, Booking_Status, Class, Quota, Amount) VALUES
(1, 1, 1, 22436, '2849102834', '2026-10-15 10:14:00', '2026-10-20', 'Confirmed', 'CC', 'General', 1750.00),
(2, 2, 3, 12952, '4918273645', '2026-10-14 11:30:00', '2026-10-22', 'Confirmed', '3A', 'General', 2840.00),
(3, 3, 6, 12952, '7829104821', '2026-10-16 09:05:00', '2026-10-25', 'Confirmed', '2A', 'Tatkal',  4220.00),
(4, 4, 2, 12028, '9018273641', '2026-10-16 12:45:00', '2026-10-24', 'RAC',       'CC', 'Ladies',   685.00);
