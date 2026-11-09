-- EDUAGENT SQLite Database Schema
-- Multi-Agent Educational Knowledge & Progression System

PRAGMA foreign_keys = ON;

-- 1. Users Table (Administrators and Students)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
    semester TEXT DEFAULT 'Semester III',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    semester TEXT NOT NULL,
    description TEXT,
    reference_books TEXT, -- JSON array of reference book titles/authors
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Units Table
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    unit_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 4. Syllabus Topics Table
CREATE TABLE IF NOT EXISTS syllabus_topics (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
    estimated_hours REAL DEFAULT 2.0,
    learning_objectives TEXT,
    FOREIGN KEY(unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- 5. Academic Documents Table
CREATE TABLE IF NOT EXISTS academic_documents (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    doc_type TEXT CHECK(doc_type IN ('textbook', 'lecture_notes', 'syllabus', 'question_paper', 'reference')) DEFAULT 'lecture_notes',
    file_path TEXT NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 6. Document Chunks Table (for local syllabus & document retrieval)
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    unit_id TEXT,
    FOREIGN KEY(document_id) REFERENCES academic_documents(id) ON DELETE CASCADE,
    FOREIGN KEY(unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- 7. Study Plans Table
CREATE TABLE IF NOT EXISTS study_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    semester_start DATE NOT NULL,
    semester_end DATE NOT NULL,
    exam_date DATE,
    daily_study_hours REAL DEFAULT 3.0,
    preferred_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Study Tasks Table
CREATE TABLE IF NOT EXISTS study_tasks (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    unit_id TEXT,
    topic_id TEXT,
    scheduled_date DATE NOT NULL,
    task_type TEXT CHECK(task_type IN ('study', 'revision', 'practice', 'mock_test', 'buffer')) DEFAULT 'study',
    title TEXT NOT NULL,
    duration_hours REAL DEFAULT 1.5,
    is_completed INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    FOREIGN KEY(plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 9. Learning Progress Table
CREATE TABLE IF NOT EXISTS learning_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY(topic_id) REFERENCES syllabus_topics(id) ON DELETE CASCADE
);

-- 10. Academic Resources Table (Research Agent discoveries)
CREATE TABLE IF NOT EXISTS academic_resources (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    unit_id TEXT,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    source_website TEXT,
    resource_type TEXT CHECK(resource_type IN ('open_access_pdf', 'university_notes', 'official_publisher', 'commercial_ref')),
    is_open_access INTEGER DEFAULT 1,
    url TEXT NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY(unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- 11. Video Resources Table (Video Discovery Agent)
CREATE TABLE IF NOT EXISTS video_resources (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    unit_id TEXT,
    topic_title TEXT,
    video_title TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration TEXT,
    relevance_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY(unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- 12. Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    unit_id TEXT,
    title TEXT NOT NULL,
    assessment_type TEXT CHECK(assessment_type IN ('quiz', 'mcq_test', 'descriptive')) DEFAULT 'quiz',
    questions_json TEXT NOT NULL, -- JSON array of questions, options, correct indices, explanations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 13. Assessment Results Table
CREATE TABLE IF NOT EXISTS assessment_results (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score REAL NOT NULL,
    total_score REAL NOT NULL,
    percentage REAL NOT NULL,
    user_answers_json TEXT NOT NULL,
    weak_topics TEXT, -- JSON array of identified gaps
    recommended_revision TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    unit_id TEXT,
    title TEXT DEFAULT 'Academic Discussion',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 15. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender TEXT CHECK(sender IN ('user', 'coordinator', 'tutor', 'system')) NOT NULL,
    content TEXT NOT NULL,
    agent_steps_json TEXT, -- JSON trace of agent decisions and reasoning
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
