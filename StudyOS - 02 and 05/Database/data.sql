-- It contains the information about user.
CREATE TABLE User(
	user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    current_year_of_study INT,
    goal_in_life VARCHAR(100)
);
USE StudyOS;
SELECT * FROM User;
SELECT * FROM Skills;
SELECT * FROM Resources;
SELECT * FROM Industry_Demand;
SELECT * FROM College_Subjects;



DESCRIBE College_Subjects;
DESCRIBE Resources;
-- It contains the user skills along with the knowladge.
CREATE TABLE Skills(
	skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL,
    level_of_skill VARCHAR(50)
);
ALTER TABLE Skills ADD COLUMN user_id INT NOT NULL;
ALTER TABLE Skills
ADD CONSTRAINT user_skill
FOREIGN KEY (user_id) REFERENCES User(user_id);

DROP TABLE Student_Skills;


-- It contains all the resources along with their level & links.
CREATE TABLE Resources(
	resource_id INT AUTO_INCREMENT PRIMARY KEY,
    course_level VARCHAR(50) NOT NULL,
	course_name VARCHAR(200),
    link_of_course VARCHAR(200) NOT NULL,
    course_outcomes VARCHAR(500) NOT NULL
);
ALTER TABLE Resources MODIFY course_level VARCHAR(100);
ALTER TABLE Resources ADD COLUMN skills VARCHAR(50) NOT NULL;
ALTER TABLE Resources MODIFY skills VARCHAR(100);
ALTER TABLE Resources ADD COLUMN domain VARCHAR(100);

INSERT INTO Resources(course_level,course_name,link_of_course,course_outcomes,skills) VALUES
('Beginner','MDN Learn Web Development','https://developer.mozilla.org/en-US/docs/Learn_web_development','Build and understand responsive web pages using core web technologies.','HTML, CSS, JavaScript basics, accessibility, and browser fundamentals'),
('Intermidate','JavaScript.info','https://javascript.info/','Write JavaScript confidently and understand the language beyond basic examples.','JavaScript syntax, functions, objects, asynchronous programming, and browser APIs'),
('Beginner','The Odin Project','https://www.theodinproject.com/paths/full-stack-javascript','Git,Database,Nodejs & Web Development Workflows.','Git,Nodejs(Basics),Working On Project'),
('Beginner','TypeScript Handbook','https://www.typescriptlang.org/docs/handbook/intro.html','Typescript(Basics) , Writing Safer js','Typescript'),
('Beginner','React official documentation','https://react.dev/learn','Build interactive user interfaces with React.','React');


INSERT INTO Resources(course_level,course_name,link_of_course,course_outcomes,skills,domain) VALUES
('Intermidate','Full Stack Open','https://fullstackopen.com/en/','Build a full-stack application and understand how its frontend and backend work together.','React, Node.js, APIs, databases, testing, and deployment','Backend'),
('Beginner','Node.js documentation','https://nodejs.org/docs/latest/api/','Understand the environment used to build Node.js backend applications.','Node.js runtime, modules, asynchronous code, and core APIs','Backend'),
('Intermidate','PostgreSQL tutorial and documentation','https://www.postgresql.org/docs/current/tutorial.html','Design and query a relational database for an application.','PostgreSQL','Backend');
SET SQL_SAFE_UPDATES = 0;
UPDATE Resources 
SET domain='Frontend'
WHERE resource_id IS NOT NULL;
SELECT * FROM Resources;
-- It has what industry actually want & in how much depth & importance is give to the specific skill.
CREATE TABLE Industry_Demand(
	id INT AUTO_INCREMENT PRIMARY KEY,
    job_role VARCHAR(100) NOT NULL,
    demands VARCHAR(500) NOT NULL
);
ALTER TABLE Industry_Demand ADD COLUMN skill_name VARCHAR(50) NOT NULL;
ALTER TABLE Industry_Demand ADD COLUMN required_level VARCHAR(50);
ALTER TABLE Industry_Demand ADD COLUMN importence VARCHAR(50);

-- INSERT INTO Industry_Demand()

DESCRIBE Industry_Demand;

-- Contains All Common College Subjects.
CREATE TABLE College_Subjects(
	sub_id INT AUTO_INCREMENT PRIMARY KEY,
    sub_name VARCHAR(100) NOT NULL,
    what_they_cover VARCHAR(200) NOT NULL
);

ALTER TABLE College_Subjects MODIFY skill_cover VARCHAR(100);

INSERT INTO College_Subjects VALUES
('OS','','');
