import json
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSES_JSON_PATH = os.path.join(BASE_DIR, 'database', 'courses_store.json')
DB_PATH = os.path.join(BASE_DIR, 'database', 'eduagent.db')

new_courses = [
    {
        "id": "course-cs203",
        "code": "CS203",
        "name": "Object-Oriented Programming",
        "semester": "Semester II",
        "description": "Core paradigms of object-oriented software development including data abstraction, encapsulation, inheritance, dynamic polymorphism, interface contracts, robust exception handling, generic collections, and stream-based I/O processing.",
        "referenceBooks": [
            "Java: The Complete Reference (12th Edition) by Herbert Schildt (McGraw Hill)",
            "Effective Java (3rd Edition) by Joshua Bloch (Addison-Wesley)",
            "Head First Java (3rd Edition) by Kathy Sierra, Bert Bates, Trisha Gee (O'Reilly)",
            "Object-Oriented Programming with C++ (8th Edition) by E. Balagurusamy (McGraw Hill)"
        ],
        "units": [
            {
                "id": "unit-203-1",
                "unitNumber": 1,
                "title": "Foundations of Object-Oriented Paradigm & Class Design",
                "description": "Procedural vs object-oriented design, encapsulation, classes, object lifecycle, constructors, method overloading, and the this reference.",
                "topics": [
                    { "id": "top-203-1-1", "title": "Principles of OOP: Abstraction, Encapsulation & Modularity", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-203-1-2", "title": "Class Syntax, State Representation & Object Instantiation", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-203-1-3", "title": "Constructors, Overloading & Reference Lifecycle Management", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            },
            {
                "id": "unit-203-2",
                "unitNumber": 2,
                "title": "Inheritance, Subtyping & Dynamic Polymorphism",
                "description": "Class hierarchies, code reuse, method overriding, super keyword, dynamic method dispatch, abstract classes, and pure virtual contracts.",
                "topics": [
                    { "id": "top-203-2-1", "title": "Single, Multilevel & Hierarchical Inheritance Hierarchies", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-203-2-2", "title": "Method Overriding vs Overloading & Dynamic Method Dispatch", "difficulty": "Medium", "estimatedHours": 3.0 },
                    { "id": "top-203-2-3", "title": "Abstract Base Classes, Pure Virtual Contracts & Sealed Types", "difficulty": "Hard", "estimatedHours": 3.0 }
                ]
            },
            {
                "id": "unit-203-3",
                "unitNumber": 3,
                "title": "Interfaces, Packages & Namespace Modularity",
                "description": "Interface definitions, multiple inheritance of type, default/static methods, package namespaces, access control specifiers, and static immutability.",
                "topics": [
                    { "id": "top-203-3-1", "title": "Interface Contracts & Decoupled Architecture Implementation", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-203-3-2", "title": "Package Namespace Organization & Access Specifiers (Public, Private, Protected)", "difficulty": "Easy", "estimatedHours": 1.5 },
                    { "id": "top-203-3-3", "title": "Static Class Members, Final Invariants & Immutability Patterns", "difficulty": "Medium", "estimatedHours": 2.0 }
                ]
            },
            {
                "id": "unit-203-4",
                "unitNumber": 4,
                "title": "Exception Handling, Stream I/O & File Processing",
                "description": "Checked and unchecked exceptions, try-catch-finally mechanisms, custom exception types, resource management (try-with-resources), and character/byte streams.",
                "topics": [
                    { "id": "top-203-4-1", "title": "Exception Hierarchy: Checked vs Unchecked Runtime Exceptions", "difficulty": "Medium", "estimatedHours": 2.0 },
                    { "id": "top-203-4-2", "title": "Robust Error Handling with Try-Catch-Finally & Custom Exceptions", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-203-4-3", "title": "Byte and Character Streams, File I/O & Object Serialization", "difficulty": "Hard", "estimatedHours": 3.0 }
                ]
            },
            {
                "id": "unit-203-5",
                "unitNumber": 5,
                "title": "Generics, Collections Framework & Concurrency Basics",
                "description": "Generic programming, type parameters, Java Collection Framework (List, Set, Map), iterators, thread lifecycle, and basic synchronization.",
                "topics": [
                    { "id": "top-203-5-1", "title": "Generic Classes, Type Parameters & Invariance Guarantees", "difficulty": "Hard", "estimatedHours": 3.0 },
                    { "id": "top-203-5-2", "title": "Collections Framework: ArrayList, LinkedList, HashSet, HashMap", "difficulty": "Medium", "estimatedHours": 3.0 },
                    { "id": "top-203-5-3", "title": "Multi-threading Foundations: Thread Lifecycle & Synchronization Locks", "difficulty": "Hard", "estimatedHours": 3.5 }
                ]
            }
        ]
    },
    {
        "id": "course-cs204",
        "code": "CS204",
        "name": "Computer Organization and Architecture",
        "semester": "Semester II",
        "description": "Comprehensive analysis of modern computer hardware systems, instruction set architecture (ISA), arithmetic logic unit design, processor datapath, pipelining hazards, cache memory hierarchy, and I/O bus interfaces.",
        "referenceBooks": [
            "Computer Organization and Architecture (11th Edition) by William Stallings (Pearson)",
            "Computer System Architecture (3rd Edition) by M. Morris Mano (Pearson)",
            "Computer Architecture: A Quantitative Approach (6th Edition) by Hennessy and Patterson (Morgan Kaufmann)"
        ],
        "units": [
            {
                "id": "unit-204-1",
                "unitNumber": 1,
                "title": "Digital Logic Foundations & Register Transfer",
                "description": "Data representations, fixed and IEEE 754 floating point arithmetic, register transfer language (RTL), bus structures, and micro-operations.",
                "topics": [
                    { "id": "top-204-1-1", "title": "Fixed-Point, Two's Complement & IEEE 754 Floating-Point Formats", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-204-1-2", "title": "Register Transfer Language (RTL) & Bus Transfer Invariants", "difficulty": "Medium", "estimatedHours": 2.0 },
                    { "id": "top-204-1-3", "title": "Arithmetic, Logic & Shift Micro-operations and ALU Design", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            },
            {
                "id": "unit-204-2",
                "unitNumber": 2,
                "title": "Central Processing Unit & Instruction Set Architecture",
                "description": "CPU organization, register sets, instruction formats, addressing modes, instruction cycle (fetch, decode, execute), CISC vs RISC paradigms.",
                "topics": [
                    { "id": "top-204-2-1", "title": "Instruction Fetch, Decode, Execute Cycle & Interrupts", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-204-2-2", "title": "Instruction Set Architectures & Addressing Modes (Immediate, Direct, Indirect, Indexed)", "difficulty": "Medium", "estimatedHours": 3.0 },
                    { "id": "top-204-2-3", "title": "RISC vs CISC Architectural Design Trade-offs", "difficulty": "Easy", "estimatedHours": 1.5 }
                ]
            },
            {
                "id": "unit-204-3",
                "unitNumber": 3,
                "title": "Processor Pipelining & Control Unit Design",
                "description": "Hardwired vs microprogrammed control units, instruction pipelining, pipeline throughput, structural, data, and control hazard resolution.",
                "topics": [
                    { "id": "top-204-3-1", "title": "Hardwired Control vs Microprogrammed Control Unit Architecture", "difficulty": "Hard", "estimatedHours": 3.0 },
                    { "id": "top-204-3-2", "title": "Instruction Pipelining Stages & Speedup Bounds", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-204-3-3", "title": "Pipelining Hazards (Data Dependencies, Branch Penalties) & Forwarding", "difficulty": "Hard", "estimatedHours": 3.5 }
                ]
            },
            {
                "id": "unit-204-4",
                "unitNumber": 4,
                "title": "Memory Hierarchy & Cache Memory Architectures",
                "description": "Memory hierarchy principles, locality of reference, semiconductor RAM/ROM, cache mappings (direct, associative, set-associative), and replacement algorithms.",
                "topics": [
                    { "id": "top-204-4-1", "title": "Memory Hierarchy Principles & Locality of Reference (Spatial vs Temporal)", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-204-4-2", "title": "Cache Mapping Functions: Direct, Associative, and Set-Associative Mapping", "difficulty": "Hard", "estimatedHours": 3.5 },
                    { "id": "top-204-4-3", "title": "Cache Replacement Policies (LRU, FIFO) & Write-Through vs Write-Back Strategies", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            },
            {
                "id": "unit-204-5",
                "unitNumber": 5,
                "title": "Input-Output Organization & Bus Interfacing",
                "description": "Peripheral devices, I/O interfaces, asynchronous data transfer, programmed I/O, interrupt-driven I/O, and Direct Memory Access (DMA).",
                "topics": [
                    { "id": "top-204-5-1", "title": "Programmed I/O vs Interrupt-Driven I/O Mechanisms", "difficulty": "Medium", "estimatedHours": 2.0 },
                    { "id": "top-204-5-2", "title": "Direct Memory Access (DMA) Controllers & Bus Arbitration", "difficulty": "Hard", "estimatedHours": 3.0 },
                    { "id": "top-204-5-3", "title": "Standard Peripheral Interfaces & System Interconnect Protocols (PCIe, USB)", "difficulty": "Easy", "estimatedHours": 1.5 }
                ]
            }
        ]
    },
    {
        "id": "course-cs301",
        "code": "CS301",
        "name": "Operating Systems",
        "semester": "Semester III",
        "description": "Exploration of computer operating system architecture, process management, multi-threading, CPU scheduling algorithms, process synchronization, deadlock handling, memory management, virtual memory paging, and file storage systems.",
        "referenceBooks": [
            "Operating System Concepts (10th Edition) by Silberschatz, Galvin, and Gagne (Wiley)",
            "Modern Operating Systems (5th Edition) by Andrew S. Tanenbaum and Herbert Bos (Pearson)",
            "Operating Systems: Three Easy Pieces by Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau (Free Online)"
        ],
        "units": [
            {
                "id": "unit-301-1",
                "unitNumber": 1,
                "title": "Operating System Structures & System Calls",
                "description": "OS services, user and operating-system interfaces, system calls, system programs, OS design and implementation (monolithic, layered, microkernel), and virtualization.",
                "topics": [
                    { "id": "top-301-1-1", "title": "OS Services, Dual-Mode Operation (User/Kernel) & Trap Mechanisms", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-301-1-2", "title": "System Calls, Parameter Passing & API Execution Pipelines", "difficulty": "Medium", "estimatedHours": 2.0 },
                    { "id": "top-301-1-3", "title": "Monolithic, Layered, Microkernel & Modular OS Architectures", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            },
            {
                "id": "unit-301-2",
                "unitNumber": 2,
                "title": "Process Management & CPU Scheduling",
                "description": "Process concepts, Process Control Block (PCB), context switching, thread models, multi-core programming, CPU scheduling criteria, and scheduling algorithms.",
                "topics": [
                    { "id": "top-301-2-1", "title": "Process Control Block (PCB), Process State Transitions & Context Switching", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-301-2-2", "title": "Threads, Multithreading Models & Kernel vs User-Level Threads", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-301-2-3", "title": "CPU Scheduling Algorithms: FCFS, SJF, Round Robin & Priority Scheduling", "difficulty": "Hard", "estimatedHours": 3.5 }
                ]
            },
            {
                "id": "unit-301-3",
                "unitNumber": 3,
                "title": "Process Synchronization & Deadlocks",
                "description": "Critical section problem, Peterson's solution, synchronization hardware, mutex locks, semaphores, monitors, classical synchronization problems, and deadlock characterization, prevention, avoidance (Banker's), and detection.",
                "topics": [
                    { "id": "top-301-3-1", "title": "Critical Section Problem, Race Conditions & Peterson's Solution", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-301-3-2", "title": "Counting & Binary Semaphores, Mutex Locks and Monitors", "difficulty": "Hard", "estimatedHours": 3.0 },
                    { "id": "top-301-3-3", "title": "Classical IPC Problems: Producer-Consumer, Dining Philosophers & Readers-Writers", "difficulty": "Hard", "estimatedHours": 3.5 },
                    { "id": "top-301-3-4", "title": "Deadlock Characterization, Prevention & Banker's Avoidance Algorithm", "difficulty": "Hard", "estimatedHours": 3.5 }
                ]
            },
            {
                "id": "unit-301-4",
                "unitNumber": 4,
                "title": "Main Memory & Virtual Memory Management",
                "description": "Memory management hardware, address binding, logical vs physical addresses, contiguous allocation, paging, segmentation, demand paging, page replacement algorithms, and thrashing.",
                "topics": [
                    { "id": "top-301-4-1", "title": "Logical vs Physical Address Spaces, MMU & Contiguous Memory Allocation", "difficulty": "Medium", "estimatedHours": 2.0 },
                    { "id": "top-301-4-2", "title": "Paging Architecture, Translation Lookaside Buffer (TLB) & Page Tables", "difficulty": "Hard", "estimatedHours": 3.5 },
                    { "id": "top-301-4-3", "title": "Virtual Memory, Demand Paging & Page Fault Servicing", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-301-4-4", "title": "Page Replacement Algorithms (FIFO, Optimal, LRU) & Thrashing Invariants", "difficulty": "Hard", "estimatedHours": 3.5 }
                ]
            },
            {
                "id": "unit-301-5",
                "unitNumber": 5,
                "title": "Storage Management & File Systems",
                "description": "File concept, access methods, directory structures, file allocation methods (contiguous, linked, indexed), free-space management, disk structure, and disk scheduling algorithms.",
                "topics": [
                    { "id": "top-301-5-1", "title": "File Concepts, Directory Organizations & Access Control Lists (ACL)", "difficulty": "Easy", "estimatedHours": 1.5 },
                    { "id": "top-301-5-2", "title": "File System Allocation Methods: Contiguous, Linked & Indexed Allocation", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-301-5-3", "title": "Disk Scheduling Algorithms: FCFS, SSTF, SCAN, C-SCAN & RAID Architectures", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            }
        ]
    },
    {
        "id": "course-cs401",
        "code": "CS401",
        "name": "Software Engineering",
        "semester": "Semester IV",
        "description": "Principles, methodologies, and tools for systematic software development across the entire lifecycle: process models, Agile frameworks, requirements engineering, architectural modeling, modular design, software testing, quality assurance, and modern DevOps CI/CD practices.",
        "referenceBooks": [
            "Software Engineering: A Practitioner's Approach (9th Edition) by Roger S. Pressman and Bruce R. Maxim (McGraw Hill)",
            "Software Engineering (10th Edition) by Ian Sommerville (Pearson)",
            "Clean Architecture: A Craftsman's Guide to Software Structure and Design by Robert C. Martin (Prentice Hall)",
            "The Pragmatic Programmer: Your Journey to Mastery (20th Anniversary Edition) by David Thomas and Andrew Hunt"
        ],
        "units": [
            {
                "id": "unit-401-1",
                "unitNumber": 1,
                "title": "Software Process Models & Agile Methodologies",
                "description": "Software engineering paradigm, software crises, linear sequential (Waterfall), incremental, evolutionary (Spiral) models, and Agile philosophies (Scrum, Kanban, Extreme Programming).",
                "topics": [
                    { "id": "top-401-1-1", "title": "Software Engineering Lifecycles & SDLC Phase Invariants", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-401-1-2", "title": "Traditional Process Models: Waterfall, Prototyping, Incremental & Spiral", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-401-1-3", "title": "Agile Software Development: Scrum Ceremonies, Sprints, User Stories & Kanban", "difficulty": "Medium", "estimatedHours": 3.0 }
                ]
            },
            {
                "id": "unit-401-2",
                "unitNumber": 2,
                "title": "Requirements Engineering & Analysis Modeling",
                "description": "Requirements inception, elicitation, negotiation, specification (SRS IEEE 830), functional vs non-functional requirements, use-case modeling, and UML activity/sequence diagrams.",
                "topics": [
                    { "id": "top-401-2-1", "title": "Requirements Elicitation, Stakeholder Analysis & IEEE 830 SRS Documentation", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-401-2-2", "title": "Functional vs Non-Functional Requirements & Traceability Matrices", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-401-2-3", "title": "UML Conceptual Modeling: Use-Case Diagrams, Activity & Sequence Diagrams", "difficulty": "Medium", "estimatedHours": 3.0 }
                ]
            },
            {
                "id": "unit-401-3",
                "unitNumber": 3,
                "title": "Architectural Design & Modularity Principles",
                "description": "Software architectural patterns (Layered, Client-Server, Event-Driven, Microservices), modular design principles, cohesion, coupling, and Gang of Four (GoF) design patterns.",
                "topics": [
                    { "id": "top-401-3-1", "title": "Architectural Styles: Monoliths, Layered, Microservices & Event-Driven Systems", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-401-3-2", "title": "Modularity Metrics: High Cohesion and Loose Coupling Invariants", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-401-3-3", "title": "Object-Oriented Design Patterns: Creational, Structural & Behavioral (GoF)", "difficulty": "Hard", "estimatedHours": 3.5 }
                ]
            },
            {
                "id": "unit-401-4",
                "unitNumber": 4,
                "title": "Software Verification, Validation & Testing",
                "description": "Verification vs validation, black-box testing, white-box testing, cyclomatic complexity, unit testing, integration strategies, and automated regression testing.",
                "topics": [
                    { "id": "top-401-4-1", "title": "Black-Box Testing: Equivalence Partitioning & Boundary Value Analysis", "difficulty": "Medium", "estimatedHours": 2.5 },
                    { "id": "top-401-4-2", "title": "White-Box Testing: Control Flow Graphs, Basis Path Testing & Cyclomatic Complexity", "difficulty": "Hard", "estimatedHours": 3.5 },
                    { "id": "top-401-4-3", "title": "Testing Hierarchy: Unit, Integration (Top-Down/Bottom-Up), System & Acceptance Testing", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            },
            {
                "id": "unit-401-5",
                "unitNumber": 5,
                "title": "Software Quality Assurance, Maintenance & DevOps",
                "description": "Software quality assurance (SQA), ISO 9001, CMMI process capability, code refactoring, technical debt, version control with Git, and CI/CD pipelines.",
                "topics": [
                    { "id": "top-401-5-1", "title": "Software Quality Assurance (SQA), Metrics & CMMI Maturity Levels", "difficulty": "Easy", "estimatedHours": 2.0 },
                    { "id": "top-401-5-2", "title": "Software Maintenance Categories (Corrective, Adaptive, Perfective) & Refactoring", "difficulty": "Medium", "estimatedHours": 2.0 },
                    { "id": "top-401-5-3", "title": "DevOps Practices: Continuous Integration / Continuous Deployment (CI/CD) & Git Workflows", "difficulty": "Medium", "estimatedHours": 2.5 }
                ]
            }
        ]
    }
]

# 1. Update courses_store.json
with open(COURSES_JSON_PATH, 'r', encoding='utf-8') as f:
    existing_courses = json.load(f)

for nc in new_courses:
    found = False
    for i, ec in enumerate(existing_courses):
        if ec['id'] == nc['id'] or ec['code'] == nc['code']:
            existing_courses[i] = nc
            found = True
            break
    if not found:
        existing_courses.append(nc)

with open(COURSES_JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(existing_courses, f, indent=2)

print(f"Updated {COURSES_JSON_PATH}. Total courses now: {len(existing_courses)}")

# 2. Sync to SQLite database eduagent.db
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

for c in existing_courses:
    ref_books = json.dumps(c.get('referenceBooks', []))
    cur.execute('''
        INSERT INTO courses (id, code, name, semester, description, reference_books)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            code=excluded.code,
            name=excluded.name,
            semester=excluded.semester,
            description=excluded.description,
            reference_books=excluded.reference_books
    ''', (c['id'], c['code'], c['name'], c['semester'], c.get('description', ''), ref_books))

    for u in c.get('units', []):
        cur.execute('''
            INSERT INTO units (id, course_id, unit_number, title, description)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                course_id=excluded.course_id,
                unit_number=excluded.unit_number,
                title=excluded.title,
                description=excluded.description
        ''', (u['id'], c['id'], u['unitNumber'], u['title'], u.get('description', '')))

        for t in u.get('topics', []):
            cur.execute('''
                INSERT INTO syllabus_topics (id, unit_id, title, difficulty, estimated_hours)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    unit_id=excluded.unit_id,
                    title=excluded.title,
                    difficulty=excluded.difficulty,
                    estimated_hours=excluded.estimated_hours
            ''', (t['id'], u['id'], t['title'], t.get('difficulty', 'Medium'), t.get('estimatedHours', 2.0)))

conn.commit()

cur.execute("SELECT COUNT(*) FROM courses")
c_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM units")
u_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM syllabus_topics")
t_count = cur.fetchone()[0]

print(f"SQLite eduagent.db synchronized successfully: {c_count} courses, {u_count} units, {t_count} topics.")

# List courses in DB
cur.execute("SELECT code, name, semester FROM courses ORDER BY semester, code")
for row in cur.fetchall():
    print(f"  [{row[2]}] {row[0]}: {row[1]}")

conn.close()

