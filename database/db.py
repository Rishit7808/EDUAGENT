import sqlite3
import os
import sys
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.settings import DB_PATH, DATABASE_DIR
from core.security import hash_password

def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with dict-like row factory and foreign keys enabled."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes schema and seeds default administrative courses and demo student."""
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    schema_path = DATABASE_DIR / "schema.sql"

    conn = get_connection()
    with conn:
        with open(schema_path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())

        # Check if admin user already exists
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        if not cursor.fetchone():
            # Seed default admin (Password is verified against ADMIN_PASSWORD env var in code, seed hash for completeness)
            admin_hash = hash_password("118b")
            cursor.execute(
                "INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)",
                ("admin-1", "admin@eduagent.ac", admin_hash, "Administrator", "admin")
            )

        # Check if default student exists
        cursor.execute("SELECT id FROM users WHERE email = 'student@eduagent.ac' LIMIT 1")
        if not cursor.fetchone():
            student_hash = hash_password("student123")
            cursor.execute(
                "INSERT INTO users (id, email, password_hash, full_name, role, semester) VALUES (?, ?, ?, ?, ?, ?)",
                ("student-1", "student@eduagent.ac", student_hash, "Alex Morgan", "student", "Semester III")
            )

        # Seed standard sample course: Data Structures and Algorithms CS201
        cursor.execute("SELECT id FROM courses WHERE code = 'CS201' LIMIT 1")
        if not cursor.fetchone():
            course_id = "course-cs201"
            ref_books = json.dumps([
                "Introduction to Algorithms by Thomas H. Cormen (MIT Press)",
                "Data Structures and Algorithms in C++ by Michael T. Goodrich",
                "Open Data Structures by Pat Morin (Free Open-Access)"
            ])
            cursor.execute(
                "INSERT INTO courses (id, code, name, semester, description, reference_books) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    course_id,
                    "CS201",
                    "Data Structures and Algorithms",
                    "Semester III",
                    "Core computer science curriculum covering linear and non-linear data structures, algorithmic complexity analysis, asymptotic notation, and algorithm design paradigms.",
                    ref_books
                )
            )

            # Insert 5 units
            units_data = [
                ("unit-1", course_id, 1, "Introduction to Data Structures", "Abstract Data Types, Arrays, Time and Space Complexity Analysis, Asymptotic Notation."),
                ("unit-2", course_id, 2, "Arrays, Linked Lists and Stacks", "Singly Linked Lists, Doubly Linked Lists, Circular Lists, Stack Operations and Applications, Infix to Postfix Conversion."),
                ("unit-3", course_id, 3, "Queues and Trees", "Linear Queues, Circular Queues, Priority Queues, Binary Trees, Binary Search Trees (BST), Tree Traversals, AVL Trees."),
                ("unit-4", course_id, 4, "Graphs and Graph Algorithms", "Graph Representations (Adjacency Matrix & List), Breadth First Search (BFS), Depth First Search (DFS), Shortest Path (Dijkstra), Minimum Spanning Tree (Prim & Kruskal)."),
                ("unit-5", course_id, 5, "Sorting and Searching", "Linear & Binary Search, Bubble, Selection, Insertion Sort, Divide and Conquer: Merge Sort and Quick Sort, Heap Sort.")
            ]

            for u_id, c_id, u_num, u_title, u_desc in units_data:
                cursor.execute(
                    "INSERT INTO units (id, course_id, unit_number, title, description) VALUES (?, ?, ?, ?, ?)",
                    (u_id, c_id, u_num, u_title, u_desc)
                )

            # Insert topics
            topics_data = [
                # Unit 1
                ("top-1-1", "unit-1", "Abstract Data Types (ADT)", "Easy", 1.5),
                ("top-1-2", "unit-1", "Asymptotic Notations (Big-O, Omega, Theta)", "Medium", 2.5),
                ("top-1-3", "unit-1", "Time and Space Complexity Analysis", "Hard", 3.0),
                # Unit 2
                ("top-2-1", "unit-2", "Singly and Doubly Linked Lists", "Medium", 2.5),
                ("top-2-2", "unit-2", "Stack Implementation and Pointer Operations", "Medium", 2.0),
                ("top-2-3", "unit-2", "Stack Applications: Expression Evaluation", "Hard", 3.0),
                # Unit 3
                ("top-3-1", "unit-3", "Circular Queues and Priority Queues", "Medium", 2.5),
                ("top-3-2", "unit-3", "Binary Search Trees (BST) & Operations", "Medium", 3.0),
                ("top-3-3", "unit-3", "AVL Trees and Rotations", "Hard", 3.5),
                # Unit 4
                ("top-4-1", "unit-4", "Graph Representations: Matrix and Adjacency List", "Easy", 1.5),
                ("top-4-2", "unit-4", "BFS and DFS Traversals", "Medium", 2.5),
                ("top-4-3", "unit-4", "Dijkstra Shortest Path Algorithm", "Hard", 3.5),
                # Unit 5
                ("top-5-1", "unit-5", "Binary Search and Boundary Conditions", "Easy", 1.5),
                ("top-5-2", "unit-5", "Merge Sort and Divide-and-Conquer Recurrence", "Medium", 2.5),
                ("top-5-3", "unit-5", "Quick Sort and Partitioning Strategies", "Hard", 3.0)
            ]

            for t_id, u_id, t_title, t_diff, t_hrs in topics_data:
                cursor.execute(
                    "INSERT INTO syllabus_topics (id, unit_id, title, difficulty, estimated_hours) VALUES (?, ?, ?, ?, ?)",
                    (t_id, u_id, t_title, t_diff, t_hrs)
                )

            # Seed a second course: Database Management Systems CS202
            c2_id = "course-cs202"
            cursor.execute(
                "INSERT INTO courses (id, code, name, semester, description, reference_books) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    c2_id,
                    "CS202",
                    "Database Management Systems",
                    "Semester III",
                    "Relational database design, ER modeling, SQL, relational algebra, normal forms (1NF through BCNF), and transaction concurrency control.",
                    json.dumps(["Database System Concepts by Silberschatz", "Fundamentals of Database Systems by Elmasri & Navathe"])
                )
            )

            c2_units = [
                ("unit-202-1", c2_id, 1, "Introduction and ER Modeling", "Database architectures, data independence, Entity-Relationship model."),
                ("unit-202-2", c2_id, 2, "Relational Model and SQL", "Relational algebra, DDL, DML, nested queries, joins."),
                ("unit-202-3", c2_id, 3, "Database Normalization", "Functional dependencies, 1NF, 2NF, 3NF, Boyce-Codd Normal Form (BCNF)."),
                ("unit-202-4", c2_id, 4, "Transaction Processing and Concurrency", "ACID properties, serializability, two-phase locking (2PL).")
            ]
            for u_id, c_id, u_num, u_title, u_desc in c2_units:
                cursor.execute(
                    "INSERT INTO units (id, course_id, unit_number, title, description) VALUES (?, ?, ?, ?, ?)",
                    (u_id, c_id, u_num, u_title, u_desc)
                )

    conn.close()

if __name__ == "__main__":
    init_db()
    print("EDUAGENT database initialized successfully.")
