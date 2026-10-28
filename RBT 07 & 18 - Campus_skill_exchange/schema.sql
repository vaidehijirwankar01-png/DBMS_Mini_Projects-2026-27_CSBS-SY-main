CREATE DATABASE IF NOT EXISTS campus_skill_exchange;
USE campus_skill_exchange;

CREATE TABLE student (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20),
  department VARCHAR(80) NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 1 AND 4),
  division VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE skill (
  skill_id INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL UNIQUE,
  category_id INT,
  FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE SET NULL
);

CREATE TABLE student_teaches (
  student_id INT NOT NULL,
  skill_id INT NOT NULL,
  level ENUM('Beginner','Intermediate','Advanced') DEFAULT 'Beginner',
  PRIMARY KEY(student_id, skill_id),
  FOREIGN KEY(student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skill(skill_id) ON DELETE CASCADE
);

CREATE TABLE student_learns (
  student_id INT NOT NULL,
  skill_id INT NOT NULL,
  desired_level ENUM('Beginner','Intermediate','Advanced') DEFAULT 'Beginner',
  PRIMARY KEY(student_id, skill_id),
  FOREIGN KEY(student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skill(skill_id) ON DELETE CASCADE
);

CREATE TABLE learning_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  skill_id INT NOT NULL,
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message VARCHAR(500),
  status ENUM('Pending','Accepted','Rejected','Completed','Cancelled') DEFAULT 'Pending',
  FOREIGN KEY(sender_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY(receiver_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skill(skill_id) ON DELETE CASCADE
);

CREATE TABLE session (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  teacher_id INT NOT NULL,
  learner_id INT NOT NULL,
  skill_id INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INT NOT NULL,
  mode ENUM('Online','Offline') DEFAULT 'Online',
  meeting_link VARCHAR(500),
  status ENUM('Scheduled','Completed','Cancelled') DEFAULT 'Scheduled',
  FOREIGN KEY(request_id) REFERENCES learning_request(request_id) ON DELETE CASCADE,
  FOREIGN KEY(teacher_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY(learner_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skill(skill_id) ON DELETE CASCADE
);

CREATE TABLE feedback (
  feedback_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment VARCHAR(500),
  feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, student_id),
  FOREIGN KEY(session_id) REFERENCES session(session_id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES student(student_id) ON DELETE CASCADE
);

CREATE TABLE availability (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY(student_id) REFERENCES student(student_id) ON DELETE CASCADE
);

INSERT INTO category(category_name) VALUES
('Programming'),('Database'),('Design'),('Communication'),('Business'),('Data & AI');

INSERT INTO skill(skill_name,category_id) VALUES
('C++',1),('Python',1),('Java',1),('Web Development',1),('React',1),('SQL',2),('MySQL',2),
('UI/UX Design',3),('Graphic Design',3),('Video Editing',3),('Public Speaking',4),('Presentation Skills',4),
('Excel',5),('Entrepreneurship',5),('Machine Learning',6),('Data Analysis',6);
