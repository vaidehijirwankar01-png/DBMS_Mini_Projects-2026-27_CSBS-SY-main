-- ============================================================================
-- DevJourney — PostgreSQL Database Schema
-- DBMS Mini Project (2026-27 CSBS-SY)
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    github_username VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DSA Topics Table
CREATE TABLE IF NOT EXISTS dsa_topics (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    total_problems INT DEFAULT 0,
    solved_count INT DEFAULT 0
);

-- 3. DSA Problems Table
CREATE TABLE IF NOT EXISTS dsa_problems (
    id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES dsa_topics(id) ON DELETE CASCADE,
    problem_name VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50),
    leetcode_link TEXT,
    is_solved BOOLEAN DEFAULT FALSE
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tech_stack VARCHAR(255),
    status VARCHAR(50) DEFAULT 'in progress',
    progress INT DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Weekly Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    current_count INT DEFAULT 0,
    target_count INT DEFAULT 1,
    timeframe VARCHAR(100) DEFAULT 'this week',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Activity Log Table (Stores problem completion events for streak tracking)
CREATE TABLE IF NOT EXISTS activity (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    problem_id INT REFERENCES dsa_problems(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for Analytics and Lookups
CREATE INDEX IF NOT EXISTS idx_activity_user_completed ON activity(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_dsa_topics_user ON dsa_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_dsa_problems_topic ON dsa_problems(topic_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
