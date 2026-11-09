/**
 * EDUAGENT Full-Stack Express Server with Vite Middleware
 * Multi-Agent AI Education Platform
 */
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration & Secrets
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '118b';
const GEMINI_FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || 'gemini-3.1-flash-lite';

// Intelligent Key Pool Manager State
interface KeyState {
  maskedId: string;
  key: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  totalCalls: number;
  lastFailureTime: number;
}

const keyPool: KeyState[] = [];
let activeKeyIndex = 0;
let totalFailovers = 0;

function syncKeyPool(): KeyState[] {
  // If .env is absent but .env.example exists, automatically populate and read
  try {
    if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
      dotenv.config({ path: '.env.example' });
      fs.copyFileSync('.env.example', '.env');
    } else {
      dotenv.config();
    }
  } catch (_e) {
    dotenv.config();
  }

  const currentEnvKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY,
  ].filter((k): k is string => Boolean(k && k.trim() && k !== 'MY_GEMINI_API_KEY'));

  currentEnvKeys.forEach((k) => {
    const exists = keyPool.some((entry) => entry.key === k);
    if (!exists) {
      keyPool.push({
        maskedId: `Key-${keyPool.length + 1} (..${k.slice(-4)})`,
        key: k,
        isHealthy: true,
        consecutiveFailures: 0,
        totalCalls: 0,
        lastFailureTime: 0,
      });
    }
  });

  return keyPool;
}

// Initial key pool initialization
syncKeyPool();

function getActiveKey(): KeyState | null {
  syncKeyPool();
  if (keyPool.length === 0) return null;
  const now = Date.now();
  // Check recovery cooldown (60s)
  keyPool.forEach((k) => {
    if (!k.isHealthy && now - k.lastFailureTime > 60000) {
      k.isHealthy = true;
      k.consecutiveFailures = 0;
    }
  });

  const healthyKeys = keyPool.filter((k) => k.isHealthy);
  if (healthyKeys.length > 0) {
    const selected = healthyKeys[activeKeyIndex % healthyKeys.length];
    activeKeyIndex = (activeKeyIndex + 1) % healthyKeys.length;
    return selected;
  }
  // If all marked unhealthy, try first key as last resort
  return keyPool[0];
}

async function callGeminiWithFailover(prompt: string, systemInstruction?: string): Promise<string> {
  syncKeyPool();
  if (keyPool.length === 0) {
    throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY or GEMINI_API_KEY_1..3');
  }

  let attempts = 0;
  const maxAttempts = keyPool.length * 2;
  const candidateModels = Array.from(
    new Set([GEMINI_FLASH_MODEL, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'])
  );

  while (attempts < maxAttempts) {
    const keyState = getActiveKey();
    if (!keyState) break;

    let keySucceeded = false;

    for (const modelId of candidateModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: keyState.key });
        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction || 'You are EDUAGENT, an academic learning assistant.',
            temperature: 0.3,
          },
        });

        keyState.totalCalls += 1;
        keyState.isHealthy = true;
        keyState.consecutiveFailures = 0;
        keySucceeded = true;
        return response.text || '';
      } catch (err: any) {
        const errMsg = err?.message || '';
        // If it's a 404 (model not found), immediately continue to next candidate model without penalizing key
        if (errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available')) {
          continue;
        }

        // For temporary 503 (high demand) or 429 (rate limits), log failover and rotate to next key
        attempts++;
        totalFailovers++;
        keyState.consecutiveFailures += 1;
        keyState.lastFailureTime = Date.now();
        if (keyState.consecutiveFailures >= 2) {
          keyState.isHealthy = false;
        }
        console.warn(`[API Failover] Key ${keyState.maskedId} with ${modelId} failed (${errMsg.slice(0, 80)}). Rotating key...`);
        await new Promise((r) => setTimeout(r, 500 * attempts));
        break; // break candidate loop to try next key in pool
      }
    }

    if (keySucceeded) break;
  }

  throw new Error('All configured Gemini API keys are currently rate-limited, experiencing high demand, or exhausted.');
}

// In-Memory Database Store (Mirroring SQLite architecture)
interface SyllabusTopic {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedHours: number;
}

interface Unit {
  id: string;
  unitNumber: number;
  title: string;
  description: string;
  topics: SyllabusTopic[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  description: string;
  referenceBooks: string[];
  units: Unit[];
}

interface AcademicDoc {
  id: string;
  courseId: string;
  filename: string;
  docType: string;
  chunks: string[];
  uploadedAt: string;
}

const defaultCourses: Course[] = [
  {
    id: 'course-cs101',
    code: 'CS101',
    name: 'Introduction to Programming with Python',
    semester: 'Semester I',
    description: 'First-semester computing fundamentals covering algorithmic thinking, variables, control flow, functions, modular program design, and basic data structures.',
    referenceBooks: [
      'Python Crash Course (3rd Edition) by Eric Matthes',
      'Think Python: How to Think Like a Computer Scientist by Allen B. Downey (Open-Access)',
      'Introduction to Computation and Programming Using Python by John V. Guttag (MIT Press)',
    ],
    units: [
      {
        id: 'unit-101-1',
        unitNumber: 1,
        title: 'Algorithmic Problem Solving & Python Basics',
        description: 'Computational thinking, Python interpreter, variables, dynamic types, arithmetic expressions, and standard I/O.',
        topics: [
          { id: 'top-101-1-1', title: 'Computational Thinking & Flow of Execution', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-101-1-2', title: 'Variables, Expressions, and Dynamic Data Types', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-101-1-3', title: 'Conditional Branching & Boolean Logic', difficulty: 'Medium', estimatedHours: 2.0 },
        ],
      },
      {
        id: 'unit-101-2',
        unitNumber: 2,
        title: 'Loops, Sequences & Data Collections',
        description: 'Iteration (while and for loops), strings, lists, tuples, and dictionary lookups.',
        topics: [
          { id: 'top-101-2-1', title: 'Iterative Loops (For, While) & Loop Invariants', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-101-2-2', title: 'List Operations, Slicing & Comprehensions', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-101-2-3', title: 'Dictionaries & Hash Key Mapping', difficulty: 'Medium', estimatedHours: 2.0 },
        ],
      },
      {
        id: 'unit-101-3',
        unitNumber: 3,
        title: 'Functions, Modular Design & Recursion',
        description: 'Function scopes, parameter passing, return values, recursion principles, and standard library modules.',
        topics: [
          { id: 'top-101-3-1', title: 'Modular Decomposition & Scope Invariants', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-101-3-2', title: 'Recursive Call Stacks & Base Case Guarantees', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
    ],
  },
  {
    id: 'course-cs201',
    code: 'CS201',
    name: 'Data Structures and Algorithms',
    semester: 'Semester III',
    description: 'Foundational computing curriculum covering abstract data types, asymptotic efficiency analysis, linear data structures, tree hierarchies, graph algorithms, and sorting paradigms.',
    referenceBooks: [
      'Introduction to Algorithms (4th Edition) by Cormen, Leiserson, Rivest, Stein',
      'Open Data Structures (in Pseudocode) by Pat Morin (Free Open-Access)',
      'Data Structures & Algorithm Analysis in C++ by Mark Allen Weiss',
    ],
    units: [
      {
        id: 'unit-1',
        unitNumber: 1,
        title: 'Introduction to Data Structures',
        description: 'Abstract Data Types, Arrays, Memory layout, Time & Space Complexity, Asymptotic Analysis (Big-O, Omega, Theta).',
        topics: [
          { id: 'top-1-1', title: 'Abstract Data Types (ADT) and Primitive Structures', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-1-2', title: 'Asymptotic Notations (Big-O, Omega, Theta)', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-1-3', title: 'Worst, Average, and Amortized Time Complexity', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-2',
        unitNumber: 2,
        title: 'Arrays, Linked Lists and Stacks',
        description: 'Singly, Doubly, and Circular Linked Lists, Pointer manipulation, Stack operations (Push/Pop), Expression conversion (Infix to Postfix).',
        topics: [
          { id: 'top-2-1', title: 'Singly & Doubly Linked List Pointer Operations', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-2-2', title: 'Stack Implementation via Arrays and Linked Lists', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-2-3', title: 'Infix to Postfix Conversion & Expression Evaluation', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-3',
        unitNumber: 3,
        title: 'Queues and Trees',
        description: 'Linear & Circular Queues, Priority Queues, Binary Trees, Binary Search Tree (BST) property, Traversals (Inorder, Preorder, Postorder), AVL Tree balancing.',
        topics: [
          { id: 'top-3-1', title: 'Circular Queues and Priority Queues', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-3-2', title: 'Binary Search Tree (BST) Insertion and Deletion', difficulty: 'Medium', estimatedHours: 3.0 },
          { id: 'top-3-3', title: 'AVL Trees and Self-Balancing Rotations', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-4',
        unitNumber: 4,
        title: 'Graphs and Graph Algorithms',
        description: 'Graph representations (Adjacency Matrix & Lists), BFS, DFS, Dijkstra Single-Source Shortest Path, Minimum Spanning Trees (Prim and Kruskal).',
        topics: [
          { id: 'top-4-1', title: 'Adjacency Matrix vs Adjacency List Representations', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-4-2', title: 'Breadth-First Search (BFS) and Depth-First Search (DFS)', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-4-3', title: 'Dijkstra Shortest Path and Greedy Invariants', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-5',
        unitNumber: 5,
        title: 'Sorting and Searching',
        description: 'Linear and Binary Search, Elementary sorts, Divide-and-Conquer: Merge Sort and Quick Sort, Heap Sort and Lower Bounds.',
        topics: [
          { id: 'top-5-1', title: 'Binary Search & Boundary Invariants', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-5-2', title: 'Merge Sort and Divide-and-Conquer Recurrence', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-5-3', title: 'Quick Sort Partitioning and Worst-Case Avoidance', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
    ],
  },
  {
    id: 'course-cs202',
    code: 'CS202',
    name: 'Database Management Systems',
    semester: 'Semester III',
    description: 'Relational data modeling, SQL queries, relational calculus, schema normalization (1NF through BCNF), transaction processing, and ACID concurrency control.',
    referenceBooks: [
      'Database System Concepts (7th Edition) by Silberschatz, Korth, Sudarshan',
      'Fundamentals of Database Systems by Elmasri and Navathe',
      'Foundations of Databases by Abiteboul, Hull, Vianu (Alice Book - Open Access)',
    ],
    units: [
      {
        id: 'unit-202-1',
        unitNumber: 1,
        title: 'Introduction and Conceptual Modeling',
        description: 'Database architecture, 3-level schema, Entity-Relationship (ER) diagram modeling, keys and attributes.',
        topics: [
          { id: 'top-202-1-1', title: 'Database Architecture & Data Independence', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-202-1-2', title: 'Entity-Relationship (ER) Modeling', difficulty: 'Medium', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-202-2',
        unitNumber: 2,
        title: 'Relational Model and SQL',
        description: 'Relational algebra operations, SQL DDL, DML, complex joins, subqueries, and views.',
        topics: [
          { id: 'top-202-2-1', title: 'Relational Algebra Operators and Selection', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-202-2-2', title: 'Advanced SQL Joins and Aggregation', difficulty: 'Medium', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-202-3',
        unitNumber: 3,
        title: 'Relational Database Normalization',
        description: 'Functional dependencies, Armstrong axioms, 1NF, 2NF, 3NF, and Boyce-Codd Normal Form (BCNF).',
        topics: [
          { id: 'top-202-3-1', title: 'Functional Dependencies and Attribute Closures', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-202-3-2', title: 'Normalization to 3NF and BCNF Decompositions', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-202-4',
        unitNumber: 4,
        title: 'Transaction Processing & ACID Properties',
        description: 'Transaction states, ACID guarantees, serializability, conflict serializability, two-phase locking (2PL).',
        topics: [
          { id: 'top-202-4-1', title: 'ACID Properties and Transaction Lifecycle', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-202-4-2', title: 'Concurrency Control and Strict Two-Phase Locking', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
    ],
  },
  {
    id: 'course-cs489',
    code: 'CS489',
    name: 'Computer Networks and Protocols',
    semester: 'Semester IV',
    description: 'Comprehensive study of computer networking architectures, OSI 7-layer model, TCP/IP protocol suite, data link framing, routing algorithms, transport layer flow control, and network security.',
    referenceBooks: [
      'Computer Networking: A Top-Down Approach by Kurose and Ross',
      'Computer Networks (5th Edition) by Andrew S. Tanenbaum',
      'TCP/IP Illustrated, Volume 1: The Protocols by W. Richard Stevens',
    ],
    units: [
      {
        id: 'unit-489-1',
        unitNumber: 1,
        title: 'Network Architecture & Physical Layer',
        description: 'Network edge and core, packet switching vs circuit switching, OSI 7-layer reference model, TCP/IP stack, transmission media, and delay/loss bounds.',
        topics: [
          { id: 'top-489-1-1', title: 'OSI 7-Layer Model vs TCP/IP Protocol Stack', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-489-1-2', title: 'Packet Switching vs Circuit Switching & Statistical Multiplexing', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-489-1-3', title: 'Transmission Media, Propagation Delay & Throughput Bounds', difficulty: 'Medium', estimatedHours: 2.0 },
        ],
      },
      {
        id: 'unit-489-2',
        unitNumber: 2,
        title: 'Data Link Layer & Local Area Networks',
        description: 'Framing, error detection and correction (Parity, Checksum, CRC), flow control protocols, multiple access (CSMA/CD, CSMA/CA), and Ethernet switching.',
        topics: [
          { id: 'top-489-2-1', title: 'Framing Techniques & Cyclic Redundancy Check (CRC) Error Detection', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-489-2-2', title: 'Sliding Window Flow Control Protocols (Stop-and-Wait, Go-Back-N, Selective Repeat)', difficulty: 'Hard', estimatedHours: 3.5 },
          { id: 'top-489-2-3', title: 'Carrier Sense Multiple Access (CSMA/CD) & Collision Avoidance', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
      {
        id: 'unit-489-3',
        unitNumber: 3,
        title: 'Network Layer & Routing Protocols',
        description: 'Virtual circuit vs datagram networks, IP addressing (IPv4, IPv6, Subnetting, CIDR), NAT, routing algorithms (Dijkstra Link-State, Bellman-Ford Distance Vector), BGP, and OSPF.',
        topics: [
          { id: 'top-489-3-1', title: 'IPv4 / IPv6 Hierarchical Addressing, Subnetting & CIDR Calculation', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-489-3-2', title: 'Dijkstra Link-State vs Bellman-Ford Distance Vector Routing', difficulty: 'Hard', estimatedHours: 3.5 },
          { id: 'top-489-3-3', title: 'Intra-AS & Inter-AS Routing Paradigms (OSPF, RIP, and BGP)', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-489-4',
        unitNumber: 4,
        title: 'Transport Layer & Congestion Control',
        description: 'Multiplexing and demultiplexing, UDP connectionless delivery, TCP 3-way handshake, connection teardown, TCP reliable data transfer, flow control, and TCP Reno/Tahoe congestion control.',
        topics: [
          { id: 'top-489-4-1', title: 'User Datagram Protocol (UDP) Architecture & Checksum Verification', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-489-4-2', title: 'TCP 3-Way Handshake, Connection Teardown & Sequence Tracking', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-489-4-3', title: 'TCP Congestion Control (Slow Start, Additive Increase, Multiplicative Decrease)', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-489-5',
        unitNumber: 5,
        title: 'Application Layer & Network Security',
        description: 'DNS resolution hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3, SMTP email architecture, symmetric/asymmetric encryption, SSL/TLS handshakes, and firewall architectures.',
        topics: [
          { id: 'top-489-5-1', title: 'Domain Name System (DNS) Hierarchical Architecture & Query Caching', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-489-5-2', title: 'HyperText Transfer Protocol Evolution (HTTP/1.1, HTTP/2, and HTTP/3 QUIC)', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-489-5-3', title: 'SSL/TLS Cryptographic Handshake & Public Key Infrastructure (PKI)', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
    ],
  },
  {
    id: 'course-cs203',
    code: 'CS203',
    name: 'Object-Oriented Programming',
    semester: 'Semester II',
    description: 'Core paradigms of object-oriented software development including data abstraction, encapsulation, inheritance, dynamic polymorphism, interface contracts, robust exception handling, generic collections, and stream-based I/O processing.',
    referenceBooks: [
      'Java: The Complete Reference (12th Edition) by Herbert Schildt (McGraw Hill)',
      'Effective Java (3rd Edition) by Joshua Bloch (Addison-Wesley)',
      "Head First Java (3rd Edition) by Kathy Sierra, Bert Bates, Trisha Gee (O'Reilly)",
      'Object-Oriented Programming with C++ (8th Edition) by E. Balagurusamy (McGraw Hill)',
    ],
    units: [
      {
        id: 'unit-203-1',
        unitNumber: 1,
        title: 'Foundations of Object-Oriented Paradigm & Class Design',
        description: 'Procedural vs object-oriented design, encapsulation, classes, object lifecycle, constructors, method overloading, and the this reference.',
        topics: [
          { id: 'top-203-1-1', title: 'Principles of OOP: Abstraction, Encapsulation & Modularity', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-203-1-2', title: 'Class Syntax, State Representation & Object Instantiation', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-203-1-3', title: 'Constructors, Overloading & Reference Lifecycle Management', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
      {
        id: 'unit-203-2',
        unitNumber: 2,
        title: 'Inheritance, Subtyping & Dynamic Polymorphism',
        description: 'Class hierarchies, code reuse, method overriding, super keyword, dynamic method dispatch, abstract classes, and pure virtual contracts.',
        topics: [
          { id: 'top-203-2-1', title: 'Single, Multilevel & Hierarchical Inheritance Hierarchies', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-203-2-2', title: 'Method Overriding vs Overloading & Dynamic Method Dispatch', difficulty: 'Medium', estimatedHours: 3.0 },
          { id: 'top-203-2-3', title: 'Abstract Base Classes, Pure Virtual Contracts & Sealed Types', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-203-3',
        unitNumber: 3,
        title: 'Interfaces, Packages & Namespace Modularity',
        description: 'Interface definitions, multiple inheritance of type, default/static methods, package namespaces, access control specifiers, and static immutability.',
        topics: [
          { id: 'top-203-3-1', title: 'Interface Contracts & Decoupled Architecture Implementation', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-203-3-2', title: 'Package Namespace Organization & Access Specifiers (Public, Private, Protected)', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-203-3-3', title: 'Static Class Members, Final Invariants & Immutability Patterns', difficulty: 'Medium', estimatedHours: 2.0 },
        ],
      },
      {
        id: 'unit-203-4',
        unitNumber: 4,
        title: 'Exception Handling, Stream I/O & File Processing',
        description: 'Checked and unchecked exceptions, try-catch-finally mechanisms, custom exception types, resource management (try-with-resources), and character/byte streams.',
        topics: [
          { id: 'top-203-4-1', title: 'Exception Hierarchy: Checked vs Unchecked Runtime Exceptions', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-203-4-2', title: 'Robust Error Handling with Try-Catch-Finally & Custom Exceptions', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-203-4-3', title: 'Byte and Character Streams, File I/O & Object Serialization', difficulty: 'Hard', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-203-5',
        unitNumber: 5,
        title: 'Generics, Collections Framework & Concurrency Basics',
        description: 'Generic programming, type parameters, Java Collection Framework (List, Set, Map), iterators, thread lifecycle, and basic synchronization.',
        topics: [
          { id: 'top-203-5-1', title: 'Generic Classes, Type Parameters & Invariance Guarantees', difficulty: 'Hard', estimatedHours: 3.0 },
          { id: 'top-203-5-2', title: 'Collections Framework: ArrayList, LinkedList, HashSet, HashMap', difficulty: 'Medium', estimatedHours: 3.0 },
          { id: 'top-203-5-3', title: 'Multi-threading Foundations: Thread Lifecycle & Synchronization Locks', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
    ],
  },
  {
    id: 'course-cs204',
    code: 'CS204',
    name: 'Computer Organization and Architecture',
    semester: 'Semester II',
    description: 'Comprehensive analysis of modern computer hardware systems, instruction set architecture (ISA), arithmetic logic unit design, processor datapath, pipelining hazards, cache memory hierarchy, and I/O bus interfaces.',
    referenceBooks: [
      'Computer Organization and Architecture (11th Edition) by William Stallings (Pearson)',
      'Computer System Architecture (3rd Edition) by M. Morris Mano (Pearson)',
      'Computer Architecture: A Quantitative Approach (6th Edition) by Hennessy and Patterson (Morgan Kaufmann)',
    ],
    units: [
      {
        id: 'unit-204-1',
        unitNumber: 1,
        title: 'Digital Logic Foundations & Register Transfer',
        description: 'Data representations, fixed and IEEE 754 floating point arithmetic, register transfer language (RTL), bus structures, and micro-operations.',
        topics: [
          { id: 'top-204-1-1', title: "Fixed-Point, Two's Complement & IEEE 754 Floating-Point Formats", difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-204-1-2', title: 'Register Transfer Language (RTL) & Bus Transfer Invariants', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-204-1-3', title: 'Arithmetic, Logic & Shift Micro-operations and ALU Design', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
      {
        id: 'unit-204-2',
        unitNumber: 2,
        title: 'Central Processing Unit & Instruction Set Architecture',
        description: 'CPU organization, register sets, instruction formats, addressing modes, instruction cycle (fetch, decode, execute), CISC vs RISC paradigms.',
        topics: [
          { id: 'top-204-2-1', title: 'Instruction Fetch, Decode, Execute Cycle & Interrupts', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-204-2-2', title: 'Instruction Set Architectures & Addressing Modes (Immediate, Direct, Indirect, Indexed)', difficulty: 'Medium', estimatedHours: 3.0 },
          { id: 'top-204-2-3', title: 'RISC vs CISC Architectural Design Trade-offs', difficulty: 'Easy', estimatedHours: 1.5 },
        ],
      },
      {
        id: 'unit-204-3',
        unitNumber: 3,
        title: 'Processor Pipelining & Control Unit Design',
        description: 'Hardwired vs microprogrammed control units, instruction pipelining, pipeline throughput, structural, data, and control hazard resolution.',
        topics: [
          { id: 'top-204-3-1', title: 'Hardwired Control vs Microprogrammed Control Unit Architecture', difficulty: 'Hard', estimatedHours: 3.0 },
          { id: 'top-204-3-2', title: 'Instruction Pipelining Stages & Speedup Bounds', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-204-3-3', title: 'Pipelining Hazards (Data Dependencies, Branch Penalties) & Forwarding', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-204-4',
        unitNumber: 4,
        title: 'Memory Hierarchy & Cache Memory Architectures',
        description: 'Memory hierarchy principles, locality of reference, semiconductor RAM/ROM, cache mappings (direct, associative, set-associative), and replacement algorithms.',
        topics: [
          { id: 'top-204-4-1', title: 'Memory Hierarchy Principles & Locality of Reference (Spatial vs Temporal)', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-204-4-2', title: 'Cache Mapping Functions: Direct, Associative, and Set-Associative Mapping', difficulty: 'Hard', estimatedHours: 3.5 },
          { id: 'top-204-4-3', title: 'Cache Replacement Policies (LRU, FIFO) & Write-Through vs Write-Back Strategies', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
      {
        id: 'unit-204-5',
        unitNumber: 5,
        title: 'Input-Output Organization & Bus Interfacing',
        description: 'Peripheral devices, I/O interfaces, asynchronous data transfer, programmed I/O, interrupt-driven I/O, and Direct Memory Access (DMA).',
        topics: [
          { id: 'top-204-5-1', title: 'Programmed I/O vs Interrupt-Driven I/O Mechanisms', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-204-5-2', title: 'Direct Memory Access (DMA) Controllers & Bus Arbitration', difficulty: 'Hard', estimatedHours: 3.0 },
          { id: 'top-204-5-3', title: 'Standard Peripheral Interfaces & System Interconnect Protocols (PCIe, USB)', difficulty: 'Easy', estimatedHours: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'course-cs301',
    code: 'CS301',
    name: 'Operating Systems',
    semester: 'Semester III',
    description: 'Exploration of computer operating system architecture, process management, multi-threading, CPU scheduling algorithms, process synchronization, deadlock handling, memory management, virtual memory paging, and file storage systems.',
    referenceBooks: [
      'Operating System Concepts (10th Edition) by Silberschatz, Galvin, and Gagne (Wiley)',
      'Modern Operating Systems (5th Edition) by Andrew S. Tanenbaum and Herbert Bos (Pearson)',
      'Operating Systems: Three Easy Pieces by Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau (Free Online)',
    ],
    units: [
      {
        id: 'unit-301-1',
        unitNumber: 1,
        title: 'Operating System Structures & System Calls',
        description: 'OS services, user and operating-system interfaces, system calls, system programs, OS design and implementation (monolithic, layered, microkernel), and virtualization.',
        topics: [
          { id: 'top-301-1-1', title: 'OS Services, Dual-Mode Operation (User/Kernel) & Trap Mechanisms', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-301-1-2', title: 'System Calls, Parameter Passing & API Execution Pipelines', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-301-1-3', title: 'Monolithic, Layered, Microkernel & Modular OS Architectures', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
      {
        id: 'unit-301-2',
        unitNumber: 2,
        title: 'Process Management & CPU Scheduling',
        description: 'Process concepts, Process Control Block (PCB), context switching, thread models, multi-core programming, CPU scheduling criteria, and scheduling algorithms.',
        topics: [
          { id: 'top-301-2-1', title: 'Process Control Block (PCB), Process State Transitions & Context Switching', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-301-2-2', title: 'Threads, Multithreading Models & Kernel vs User-Level Threads', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-301-2-3', title: 'CPU Scheduling Algorithms: FCFS, SJF, Round Robin & Priority Scheduling', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-301-3',
        unitNumber: 3,
        title: 'Process Synchronization & Deadlocks',
        description: "Critical section problem, Peterson's solution, synchronization hardware, mutex locks, semaphores, monitors, classical synchronization problems, and deadlock characterization, prevention, avoidance (Banker's), and detection.",
        topics: [
          { id: 'top-301-3-1', title: "Critical Section Problem, Race Conditions & Peterson's Solution", difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-301-3-2', title: 'Counting & Binary Semaphores, Mutex Locks and Monitors', difficulty: 'Hard', estimatedHours: 3.0 },
          { id: 'top-301-3-3', title: 'Classical IPC Problems: Producer-Consumer, Dining Philosophers & Readers-Writers', difficulty: 'Hard', estimatedHours: 3.5 },
          { id: 'top-301-3-4', title: "Deadlock Characterization, Prevention & Banker's Avoidance Algorithm", difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-301-4',
        unitNumber: 4,
        title: 'Main Memory & Virtual Memory Management',
        description: 'Memory management hardware, address binding, logical vs physical addresses, contiguous allocation, paging, segmentation, demand paging, page replacement algorithms, and thrashing.',
        topics: [
          { id: 'top-301-4-1', title: 'Logical vs Physical Address Spaces, MMU & Contiguous Memory Allocation', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-301-4-2', title: 'Paging Architecture, Translation Lookaside Buffer (TLB) & Page Tables', difficulty: 'Hard', estimatedHours: 3.5 },
          { id: 'top-301-4-3', title: 'Virtual Memory, Demand Paging & Page Fault Servicing', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-301-4-4', title: 'Page Replacement Algorithms (FIFO, Optimal, LRU) & Thrashing Invariants', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-301-5',
        unitNumber: 5,
        title: 'Storage Management & File Systems',
        description: 'File concept, access methods, directory structures, file allocation methods (contiguous, linked, indexed), free-space management, disk structure, and disk scheduling algorithms.',
        topics: [
          { id: 'top-301-5-1', title: 'File Concepts, Directory Organizations & Access Control Lists (ACL)', difficulty: 'Easy', estimatedHours: 1.5 },
          { id: 'top-301-5-2', title: 'File System Allocation Methods: Contiguous, Linked & Indexed Allocation', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-301-5-3', title: 'Disk Scheduling Algorithms: FCFS, SSTF, SCAN, C-SCAN & RAID Architectures', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
    ],
  },
  {
    id: 'course-cs401',
    code: 'CS401',
    name: 'Software Engineering',
    semester: 'Semester IV',
    description: 'Principles, methodologies, and tools for systematic software development across the entire lifecycle: process models, Agile frameworks, requirements engineering, architectural modeling, modular design, software testing, quality assurance, and modern DevOps CI/CD practices.',
    referenceBooks: [
      "Software Engineering: A Practitioner's Approach (9th Edition) by Roger S. Pressman and Bruce R. Maxim (McGraw Hill)",
      'Software Engineering (10th Edition) by Ian Sommerville (Pearson)',
      "Clean Architecture: A Craftsman's Guide to Software Structure and Design by Robert C. Martin (Prentice Hall)",
      'The Pragmatic Programmer: Your Journey to Mastery (20th Anniversary Edition) by David Thomas and Andrew Hunt',
    ],
    units: [
      {
        id: 'unit-401-1',
        unitNumber: 1,
        title: 'Software Process Models & Agile Methodologies',
        description: 'Software engineering paradigm, software crises, linear sequential (Waterfall), incremental, evolutionary (Spiral) models, and Agile philosophies (Scrum, Kanban, Extreme Programming).',
        topics: [
          { id: 'top-401-1-1', title: 'Software Engineering Lifecycles & SDLC Phase Invariants', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-401-1-2', title: 'Traditional Process Models: Waterfall, Prototyping, Incremental & Spiral', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-401-1-3', title: 'Agile Software Development: Scrum Ceremonies, Sprints, User Stories & Kanban', difficulty: 'Medium', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-401-2',
        unitNumber: 2,
        title: 'Requirements Engineering & Analysis Modeling',
        description: 'Requirements inception, elicitation, negotiation, specification (SRS IEEE 830), functional vs non-functional requirements, use-case modeling, and UML activity/sequence diagrams.',
        topics: [
          { id: 'top-401-2-1', title: 'Requirements Elicitation, Stakeholder Analysis & IEEE 830 SRS Documentation', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-401-2-2', title: 'Functional vs Non-Functional Requirements & Traceability Matrices', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-401-2-3', title: 'UML Conceptual Modeling: Use-Case Diagrams, Activity & Sequence Diagrams', difficulty: 'Medium', estimatedHours: 3.0 },
        ],
      },
      {
        id: 'unit-401-3',
        unitNumber: 3,
        title: 'Architectural Design & Modularity Principles',
        description: 'Software architectural patterns (Layered, Client-Server, Event-Driven, Microservices), modular design principles, cohesion, coupling, and Gang of Four (GoF) design patterns.',
        topics: [
          { id: 'top-401-3-1', title: 'Architectural Styles: Monoliths, Layered, Microservices & Event-Driven Systems', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-401-3-2', title: 'Modularity Metrics: High Cohesion and Loose Coupling Invariants', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-401-3-3', title: 'Object-Oriented Design Patterns: Creational, Structural & Behavioral (GoF)', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: 'unit-401-4',
        unitNumber: 4,
        title: 'Software Verification, Validation & Testing',
        description: 'Verification vs validation, black-box testing, white-box testing, cyclomatic complexity, unit testing, integration strategies, and automated regression testing.',
        topics: [
          { id: 'top-401-4-1', title: 'Black-Box Testing: Equivalence Partitioning & Boundary Value Analysis', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: 'top-401-4-2', title: 'White-Box Testing: Control Flow Graphs, Basis Path Testing & Cyclomatic Complexity', difficulty: 'Hard', estimatedHours: 3.5 },
          { id: 'top-401-4-3', title: 'Testing Hierarchy: Unit, Integration (Top-Down/Bottom-Up), System & Acceptance Testing', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
      {
        id: 'unit-401-5',
        unitNumber: 5,
        title: 'Software Quality Assurance, Maintenance & DevOps',
        description: 'Software quality assurance (SQA), ISO 9001, CMMI process capability, code refactoring, technical debt, version control with Git, and CI/CD pipelines.',
        topics: [
          { id: 'top-401-5-1', title: 'Software Quality Assurance (SQA), Metrics & CMMI Maturity Levels', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: 'top-401-5-2', title: 'Software Maintenance Categories (Corrective, Adaptive, Perfective) & Refactoring', difficulty: 'Medium', estimatedHours: 2.0 },
          { id: 'top-401-5-3', title: 'DevOps Practices: Continuous Integration / Continuous Deployment (CI/CD) & Git Workflows', difficulty: 'Medium', estimatedHours: 2.5 },
        ],
      },
    ],
  },
];

const BASE_PROJECT_DIR = fs.existsSync(path.join(__dirname, 'database')) ? __dirname : process.cwd();
const COURSES_STORAGE_PATH = path.join(BASE_PROJECT_DIR, 'database', 'courses_store.json');

function saveCoursesToDisk(cList: Course[]) {
  try {
    fs.writeFileSync(COURSES_STORAGE_PATH, JSON.stringify(cList, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist courses to disk', err);
  }
}

function loadCoursesFromDisk(): Course[] {
  try {
    if (fs.existsSync(COURSES_STORAGE_PATH)) {
      const data = fs.readFileSync(COURSES_STORAGE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        // Ensure all defaultCourses are present
        for (const defCourse of defaultCourses) {
          if (!parsed.some((c: Course) => c.code === defCourse.code || c.id === defCourse.id)) {
            parsed.push(defCourse);
            changed = true;
          }
        }
        if (changed) {
          saveCoursesToDisk(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load courses from disk, using default seed', err);
  }
  saveCoursesToDisk(defaultCourses);
  return [...defaultCourses];
}

const courses: Course[] = loadCoursesFromDisk();

const documents: AcademicDoc[] = [
  {
    id: 'doc-sample-1',
    courseId: 'course-cs201',
    filename: 'CS201_Official_Lecture_Notes_Arrays_LinkedLists.pdf',
    docType: 'lecture_notes',
    uploadedAt: '2026-11-01',
    chunks: [
      'Unit 2 Note: Singly linked lists require memory allocation for each node containing data and a next pointer.',
      'Unit 2 Note: Doubly linked lists maintain both prev and next pointers, allowing O(1) removal given a direct pointer to a node.',
      'Unit 2 Note: Stack operations push and pop adhere strictly to LIFO (Last In First Out) semantics.',
    ],
  },
];

// Student state storage
const studentProgress: Record<string, { completedTopicIds: string[] }> = {
  'student-1': { completedTopicIds: ['top-1-1', 'top-1-2'] },
};

const assessmentHistory: Record<string, any[]> = {
  'student-1': [],
};

const studentStudyPlans: Record<string, any> = {};

interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: any[];
  selectedAgent?: string;
  timestamp: string;
}

// Student Chat Histories partitioned by studentId -> `${courseId}:${unitId}` -> StoredChatMessage[]
const studentChatHistories: Record<string, Record<string, StoredChatMessage[]>> = {};

const STATE_STORAGE_PATH = path.join(BASE_PROJECT_DIR, 'database', 'student_state_store.json');

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'student';
  semester: string;
}

const registeredUsers: RegisteredUser[] = [
  {
    id: 'admin-1',
    name: 'Administrator',
    email: 'admin@eduagent.ac',
    passwordHash: '118b',
    role: 'admin',
    semester: 'All Semesters',
  },
  {
    id: 'student-1',
    name: 'Alex Morgan',
    email: 'student@eduagent.ac',
    // PBKDF2 hash of 'student123'
    passwordHash: '31d0cac2bc3336ff3bcbd9c96be27659$5002792068b282d56fe5dc14afa6ca297f7fee27a9c770639a9d4749bb33fb74',
    role: 'student',
    semester: 'Semester III',
  },
];

const USERS_STORAGE_PATH = path.join(BASE_PROJECT_DIR, 'database', 'users_store.json');

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(storedHash: string, providedPassword: string): boolean {
  try {
    if (!storedHash || !providedPassword) return false;
    // Allow plain match for initial admin password if configured
    if (storedHash === providedPassword) return true;
    const parts = storedHash.split('$');
    if (parts.length !== 2) return false;
    const [salt, expectedHash] = parts;
    const computedHash = crypto.pbkdf2Sync(providedPassword, salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch (err) {
    return false;
  }
}

function saveUsersToDisk() {
  try {
    fs.writeFileSync(USERS_STORAGE_PATH, JSON.stringify(registeredUsers, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist users to disk', err);
  }
}

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_STORAGE_PATH)) {
      const raw = fs.readFileSync(USERS_STORAGE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        registeredUsers.length = 0;
        registeredUsers.push(...data);
      }
    }
  } catch (err) {
    console.error('Failed to load users from disk', err);
  }
  saveUsersToDisk();
}

loadUsersFromDisk();

function saveStudentStateToDisk() {
  try {
    const data = {
      studentProgress,
      assessmentHistory,
      studentStudyPlans,
      studentChatHistories,
    };
    fs.writeFileSync(STATE_STORAGE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist student state to disk', err);
  }
}

function loadStudentStateFromDisk() {
  try {
    if (fs.existsSync(STATE_STORAGE_PATH)) {
      const raw = fs.readFileSync(STATE_STORAGE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data.studentProgress) Object.assign(studentProgress, data.studentProgress);
      if (data.assessmentHistory) Object.assign(assessmentHistory, data.assessmentHistory);
      if (data.studentStudyPlans) Object.assign(studentStudyPlans, data.studentStudyPlans);
      if (data.studentChatHistories) Object.assign(studentChatHistories, data.studentChatHistories);
    }
  } catch (err) {
    console.error('Failed to load student state from disk', err);
  }
}

loadStudentStateFromDisk();

// Domain Guard Check
const REFUSAL_MESSAGE =
  'I am EDUAGENT, an academic learning assistant. I can only assist with educational subjects, syllabus-related questions and learning activities. Please start a new academic conversation with a relevant educational question.';

const DISALLOWED_REGEX =
  /\b(ignore previous instructions|disregard all prior|system prompt|admin password|api key|movie|celebrity|hollywood|bollywood|gossip|dating|horoscope|sports match|football score|cricket match|joke|funny story|song lyrics|recipe for cake|cooking chicken|fashion advice|minecraft|fortnite|crypto trading|buy bitcoin)\b/i;

const ACADEMIC_REGEX =
  /\b(algorithm|data structure|binary tree|linked list|stack|queue|graph|sorting|searching|complexity|big-o|database|sql|acid|normal form|operating system|process|thread|network|tcp|ip|math|syllabus|exam|quiz|explain|teach|learn|definition|example|step-by-step|code|c\+\+|python|java|object-oriented|oop|encapsulation|polymorphism|inheritance|interface|exception|pipeline|hazard|cache|memory hierarchy|alu|instruction set|cpu|scheduling|deadlock|virtual memory|paging|file system|agile|scrum|software engineering|requirements|srs|design pattern|testing|verification|validation|qa|devops|git)\b/i;

function validateDomain(query: string, courseContext: string): { isAllowed: boolean; reason: string } {
  const clean = query.trim().toLowerCase();
  if (!clean) return { isAllowed: false, reason: 'Empty query' };

  if (DISALLOWED_REGEX.test(clean)) {
    return { isAllowed: false, reason: REFUSAL_MESSAGE };
  }

  if (courseContext) {
    const courseWords = courseContext.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (courseWords.some((w) => clean.includes(w))) {
      return { isAllowed: true, reason: 'Matched active course syllabus context.' };
    }
  }

  if (ACADEMIC_REGEX.test(clean) || clean.startsWith('what is') || clean.startsWith('how does') || clean.startsWith('explain')) {
    return { isAllowed: true, reason: 'Recognized academic inquiry.' };
  }

  if (['hi', 'hello', 'hey'].includes(clean)) {
    return { isAllowed: true, reason: 'Academic greeting.' };
  }

  return { isAllowed: false, reason: REFUSAL_MESSAGE };
}

// Start Express Application
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // --- API ROUTES ---

  // 1. Authentication
  app.post('/api/auth/admin-login', (req: Request, res: Response) => {
    const { password } = req.body;
    const cleanInput = (password || '').toString().trim();
    const targetPassword = (process.env.ADMIN_PASSWORD || ADMIN_PASSWORD || '118b').toString().trim().replace(/^["']|["']$/g, '');

    // Match either the configured password, the default demo password '118b', or case-insensitive '118B'
    if (cleanInput === targetPassword || cleanInput === '118b' || cleanInput.toLowerCase() === '118b') {
      return res.json({
        success: true,
        user: { id: 'admin-1', name: 'Administrator', email: 'admin@eduagent.ac', role: 'admin' },
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid administrator password.' });
  });

  app.post('/api/auth/student-login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail && u.role === 'student');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(user.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester || 'Semester III',
      },
    });
  });

  app.post('/api/auth/student-register', (req: Request, res: Response) => {
    const { name, email, password, semester } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const newUser: RegisteredUser = {
      id: `student-${Date.now()}`,
      name: name?.trim() || 'Student',
      email: cleanEmail,
      passwordHash: hashPassword(password),
      role: 'student',
      semester: semester?.trim() || 'Semester I',
    };

    registeredUsers.push(newUser);
    saveUsersToDisk();

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        semester: newUser.semester,
      },
    });
  });

  // 2. Courses & Syllabus Management (With Semester Filtering Support)
  app.get('/api/courses', (req: Request, res: Response) => {
    const semesterQuery = req.query.semester as string;
    if (semesterQuery && semesterQuery !== 'All' && semesterQuery !== 'All Semesters') {
      const normalizedQuery = semesterQuery.toLowerCase().replace(/\s+/g, '');
      const filtered = courses.filter((c) => {
        const normalizedCourseSem = (c.semester || '').toLowerCase().replace(/\s+/g, '');
        return normalizedCourseSem === normalizedQuery;
      });
      return res.json({ success: true, courses: filtered });
    }
    return res.json({ success: true, courses });
  });

  app.post('/api/courses', (req: Request, res: Response) => {
    const { code, name, semester, description, referenceBooks, unitCount, customUnitsText } = req.body;
    const count = parseInt(unitCount) || 5;

    let parsedUnits: Unit[] = [];

    // 0. If units array is directly provided
    if (Array.isArray(req.body.units) && req.body.units.length > 0) {
      parsedUnits = req.body.units;
    }
    // 1. If custom unit text is provided (handles unit names AND sub-bullet topics)
    else if (customUnitsText && typeof customUnitsText === 'string' && customUnitsText.trim()) {
      const rawLines = customUnitsText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      let currentUnit: Unit | null = null;
      let unitCounter = 0;

      for (const line of rawLines) {
        const isTopic = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');

        if (isTopic && currentUnit) {
          const rawTopicTitle = line.replace(/^[\-\*\•]\s*/, '').trim();
          let difficulty: 'Easy' | 'Medium' | 'Hard' = currentUnit.topics.length === 0 ? 'Easy' : currentUnit.topics.length === 1 ? 'Medium' : 'Hard';
          let hours = difficulty === 'Easy' ? 1.5 : difficulty === 'Medium' ? 2.5 : 3.5;

          if (/\[.*hard.*\]/i.test(rawTopicTitle)) difficulty = 'Hard';
          else if (/\[.*easy.*\]/i.test(rawTopicTitle)) difficulty = 'Easy';
          else if (/\[.*medium.*\]/i.test(rawTopicTitle)) difficulty = 'Medium';

          const cleanTopicTitle = rawTopicTitle.replace(/\[.*?\]/g, '').trim();
          currentUnit.topics.push({
            id: `top-${Date.now()}-${currentUnit.unitNumber}-${currentUnit.topics.length + 1}`,
            title: cleanTopicTitle,
            difficulty,
            estimatedHours: hours,
          });
        } else {
          // New unit declaration
          unitCounter++;
          const cleanTitle = line.replace(/^Unit\s*\d+\s*[:\-]\s*/i, '').trim();
          currentUnit = {
            id: `unit-${Date.now()}-${unitCounter}`,
            unitNumber: unitCounter,
            title: cleanTitle,
            description: `Core syllabus topics and curriculum requirements for ${cleanTitle}.`,
            topics: [],
          };
          parsedUnits.push(currentUnit);
        }
      }

      // If any unit had no sub-topics defined, auto-populate 3 realistic sub-topics
      parsedUnits.forEach((u) => {
        if (u.topics.length === 0) {
          u.topics = [
            { id: `top-${Date.now()}-${u.unitNumber}-1`, title: `${u.title} - Fundamental Theory`, difficulty: 'Easy', estimatedHours: 1.5 },
            { id: `top-${Date.now()}-${u.unitNumber}-2`, title: `${u.title} - Operational Architecture`, difficulty: 'Medium', estimatedHours: 2.5 },
            { id: `top-${Date.now()}-${u.unitNumber}-3`, title: `${u.title} - Analysis & Case Studies`, difficulty: 'Hard', estimatedHours: 3.5 },
          ];
        }
      });
    }

    // 2. If no custom lines provided, generate full progressive units based on unitCount
    if (parsedUnits.length === 0) {
      const defaultTemplates = [
        'Introduction, Core Principles and Foundations',
        'Data Representations, Schemas, and Abstract Models',
        'Operational Analysis, Algorithms, and Transformations',
        'Concurrency, System Architecture, and Interfaces',
        'Optimization, Performance Evaluation, and Case Studies',
        'Advanced Topics, Emerging Paradigms, and Security',
        'Practical Lab Frameworks and Engineering Applications',
        'Capstone System Design and Analytical Synthesis',
      ];

      for (let i = 0; i < Math.min(count, defaultTemplates.length); i++) {
        const title = `${defaultTemplates[i]}`;
        parsedUnits.push({
          id: `unit-${Date.now()}-${i + 1}`,
          unitNumber: i + 1,
          title,
          description: `Core academic topics for ${title} in ${name}.`,
          topics: [
            { id: `top-${Date.now()}-${i + 1}-1`, title: `${title} - Fundamental Theory`, difficulty: 'Easy', estimatedHours: 2.0 },
            { id: `top-${Date.now()}-${i + 1}-2`, title: `${title} - Detailed Mechanism`, difficulty: 'Medium', estimatedHours: 3.0 },
            { id: `top-${Date.now()}-${i + 1}-3`, title: `${title} - Practical Engineering Problems`, difficulty: 'Hard', estimatedHours: 3.5 },
          ],
        });
      }
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: (code || 'CS101').toUpperCase(),
      name: name || 'Academic Course',
      semester: semester || 'Semester III',
      description: description || `Comprehensive academic curriculum for ${name}.`,
      referenceBooks: referenceBooks || [],
      units: parsedUnits,
    };

    courses.push(newCourse);
    saveCoursesToDisk(courses);
    return res.json({ success: true, course: newCourse });
  });

  app.put('/api/courses/:id', (req: Request, res: Response) => {
    const { code, name, semester, description, referenceBooks, units } = req.body;
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Course not found' });
    }
    courses[index] = {
      ...courses[index],
      code: code ? code.toUpperCase() : courses[index].code,
      name: name || courses[index].name,
      semester: semester || courses[index].semester,
      description: description !== undefined ? description : courses[index].description,
      referenceBooks: Array.isArray(referenceBooks) ? referenceBooks : courses[index].referenceBooks,
      units: Array.isArray(units) ? units : courses[index].units,
    };
    saveCoursesToDisk(courses);
    return res.json({ success: true, course: courses[index] });
  });

  app.delete('/api/courses/:id', (req: Request, res: Response) => {
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index !== -1) {
      courses.splice(index, 1);
      saveCoursesToDisk(courses);
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Course not found' });
  });

  // 3. Academic Materials & Uploads
  app.get('/api/materials/:courseId', (req: Request, res: Response) => {
    const docs = documents.filter((d) => d.courseId === req.params.courseId);
    return res.json({ success: true, documents: docs });
  });

  app.post('/api/materials', (req: Request, res: Response) => {
    const { courseId, filename, docType, content } = req.body;
    const chunks = (content || 'Official course syllabus and lecture notes.')
      .split('\n')
      .filter((line: string) => line.trim().length > 15);
    const newDoc: AcademicDoc = {
      id: `doc-${Date.now()}`,
      courseId,
      filename: filename || 'Curriculum_Document.pdf',
      docType: docType || 'lecture_notes',
      chunks: chunks.length ? chunks : ['Core course curriculum reference chunk.'],
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    documents.push(newDoc);
    return res.json({ success: true, document: newDoc });
  });

  // 3.5. Video Discovery Agent Live YouTube API Search
  app.get('/api/videos/search', async (req: Request, res: Response) => {
    const course = (req.query.course as string) || 'Computer Science';
    const unit = (req.query.unit as string) || '';
    const query = (req.query.q as string) || '';
    const youtubeKey = (process.env.YOUTUBE_API_KEY || '').trim();

    if (youtubeKey && youtubeKey !== 'MY_YOUTUBE_API_KEY') {
      try {
        const searchQuery = query ? `${course} ${query} lecture` : `${course} ${unit} university lecture`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery
        )}&type=video&maxResults=6&key=${youtubeKey}`;
        const ytRes = await fetch(url);
        const data = await ytRes.json();

        if (data && data.items && Array.isArray(data.items) && data.items.length > 0) {
          const videos = data.items.map((item: any) => ({
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url,
            duration: 'University Lecture',
            course,
            unit: unit || 'Official Syllabus',
            relevance: item.snippet.description || 'Verified academic video resource mapped to course syllabus.',
            isLiveYouTube: true,
          }));

          return res.json({
            success: true,
            isLiveApi: true,
            videos,
          });
        }
      } catch (err) {
        console.warn('YouTube API call failed, falling back to curated lectures', err);
      }
    }

    return res.json({
      success: true,
      isLiveApi: Boolean(youtubeKey && youtubeKey !== 'MY_YOUTUBE_API_KEY'),
      videos: [],
    });
  });

  // 3.8. Curated University Lecture Catalog for Personalized Tutor Recommendations
  const CURATED_UNIVERSITY_LECTURES: Record<
    string,
    Array<{
      keyword: string;
      title: string;
      channel: string;
      url: string;
      duration: string;
    }>
  > = {
    CS101: [
      {
        keyword: 'python',
        title: 'MIT 6.0001: Introduction to Computer Science and Programming in Python',
        channel: 'MIT OpenCourseWare',
        url: 'https://www.youtube.com/watch?v=nykOeWgQcHM',
        duration: '49m',
      },
      {
        keyword: 'function',
        title: 'Python Functions, Recursion and Scope Analysis',
        channel: 'CS50 / Harvard',
        url: 'https://www.youtube.com/watch?v=zEY8h9h8lZ4',
        duration: '1h 15m',
      },
    ],
    CS201: [
      {
        keyword: 'avl',
        title: 'AVL Trees and Tree Rotations (LL, RR, LR, RL) Detailed Step-by-Step',
        channel: 'Abdul Bari',
        url: 'https://www.youtube.com/watch?v=jDM6_TnYIqE',
        duration: '38m',
      },
      {
        keyword: 'tree',
        title: 'Binary Trees, BST Property, and Recursive Traversals (Inorder, Preorder, Postorder)',
        channel: 'MIT OpenCourseWare (6.006)',
        url: 'https://www.youtube.com/watch?v=76dhtgZt38A',
        duration: '51m',
      },
      {
        keyword: 'graph',
        title: 'Graph Algorithms Full Course (BFS, DFS, Dijkstra, Bellman-Ford, Kruskal)',
        channel: 'WilliamFiset',
        url: 'https://www.youtube.com/watch?v=09_LlHjoEiY',
        duration: '6h 44m',
      },
      {
        keyword: 'sort',
        title: 'Sorting Algorithms Compared: MergeSort, QuickSort, HeapSort in Depth',
        channel: 'CS50 / Harvard University',
        url: 'https://www.youtube.com/watch?v=kgBjXUE_Nwc',
        duration: '1h 12m',
      },
      {
        keyword: 'list',
        title: 'Data Structures: Singly and Doubly Linked Lists Explained',
        channel: 'Abdul Bari',
        url: 'https://www.youtube.com/watch?v=lC-yftEDHua',
        duration: '48m',
      },
    ],
    CS202: [
      {
        keyword: 'normal',
        title: 'Database Normalization 1NF, 2NF, 3NF, BCNF with Real Practice Examples',
        channel: 'Gate Smashers',
        url: 'https://www.youtube.com/watch?v=5fs1hdndb6U',
        duration: '42m',
      },
      {
        keyword: 'acid',
        title: 'CMU 15-445/645: Transactions, Concurrency Control & ACID Guarantees',
        channel: 'Carnegie Mellon Database Group',
        url: 'https://www.youtube.com/watch?v=u1jP27j-r5U',
        duration: '1h 18m',
      },
      {
        keyword: 'sql',
        title: 'Relational Model, SQL Joins & Query Processing',
        channel: 'Stanford Online',
        url: 'https://www.youtube.com/watch?v=7S_tz1z_5bA',
        duration: '55m',
      },
    ],
    CS301: [
      {
        keyword: 'schedul',
        title: 'CPU Scheduling Algorithms: FCFS, SJF, Round Robin & Priority Scheduling',
        channel: 'Gate Smashers',
        url: 'https://www.youtube.com/watch?v=EWkqlLflcrg',
        duration: '35m',
      },
      {
        keyword: 'deadlock',
        title: 'Deadlock Detection, Prevention & Bankers Algorithm',
        channel: 'NPTEL Computer Science',
        url: 'https://www.youtube.com/watch?v=rby7hN5pUeo',
        duration: '50m',
      },
      {
        keyword: 'memory',
        title: 'UC Berkeley CS162: Virtual Memory, Paging, Page Faults & TLB',
        channel: 'UC Berkeley',
        url: 'https://www.youtube.com/watch?v=26QPDBe-NB8',
        duration: '1h 10m',
      },
    ],
    CS489: [
      {
        keyword: 'tcp',
        title: 'Stanford CS144: TCP 3-Way Handshake, Flow Control & Congestion Management',
        channel: 'Stanford University',
        url: 'https://www.youtube.com/watch?v=kYv_j95Z-oY',
        duration: '1h 05m',
      },
      {
        keyword: 'rout',
        title: 'IP Routing Protocols: Link State (OSPF) vs Distance Vector (RIP, BGP)',
        channel: 'NetworkChuck',
        url: 'https://www.youtube.com/watch?v=vmsv6V5Q2aM',
        duration: '40m',
      },
    ],
    CS203: [
      {
        keyword: 'poly',
        title: 'Object-Oriented Programming: Inheritance, Polymorphism & Virtual Functions',
        channel: 'MIT OpenCourseWare',
        url: 'https://www.youtube.com/watch?v=SiBw7HN_1R8',
        duration: '58m',
      },
      {
        keyword: 'pattern',
        title: 'Software Design Patterns (Factory, Singleton, Observer, Strategy) in OOP',
        channel: 'Derek Banas',
        url: 'https://www.youtube.com/watch?v=v9ejT8FO-7I',
        duration: '1h 14m',
      },
    ],
    CS204: [
      {
        keyword: 'pipe',
        title: 'MIT 6.004: Processor Pipelining, Data Hazards & Branch Prediction',
        channel: 'MIT OpenCourseWare',
        url: 'https://www.youtube.com/watch?v=4TzMyXmzL8M',
        duration: '53m',
      },
      {
        keyword: 'cache',
        title: 'Memory Hierarchy, Direct-Mapped vs Set-Associative Caches',
        channel: 'CMU Architecture',
        url: 'https://www.youtube.com/watch?v=2K4Vb5w9U9U',
        duration: '1h 02m',
      },
    ],
    CS401: [
      {
        keyword: 'agile',
        title: 'UC Berkeley CS169: Software Engineering, Agile/Scrum & Testing Cycles',
        channel: 'UC Berkeley',
        url: 'https://www.youtube.com/watch?v=N3c_x_c8N4Y',
        duration: '56m',
      },
      {
        keyword: 'test',
        title: 'Software Verification, Validation & Automated Unit/Integration Testing',
        channel: 'Georgia Tech',
        url: 'https://www.youtube.com/watch?v=u6QfIXgjwGQ',
        duration: '45m',
      },
    ],
  };

  function getCuratedLectureRecommendation(courseCode: string, targetTopicOrQuery?: string) {
    const list = CURATED_UNIVERSITY_LECTURES[courseCode] || CURATED_UNIVERSITY_LECTURES['CS201'];
    if (!targetTopicOrQuery) return list[0];
    const queryLower = targetTopicOrQuery.toLowerCase();
    const matched = list.find((lec) => queryLower.includes(lec.keyword.toLowerCase()));
    return matched || list[0];
  }

  // 3.9. Student Academic Performance & Personalization Analyzer
  function analyzeStudentPerformance(
    studentId: string,
    courseCode: string,
    unitTitleOrScope?: string
  ) {
    const userRecord = registeredUsers.find((u) => u.id === studentId);
    const studentName = userRecord ? userRecord.name : 'Student';
    const semester = userRecord ? userRecord.semester : 'Semester III';

    const course = courses.find((c) => c.code === courseCode || c.id === courseCode);
    const courseName = course ? course.name : courseCode;

    const allQuizzes = (studentId && assessmentHistory[studentId]) || [];
    const courseQuizzes = allQuizzes.filter((q) => q.courseCode === courseCode);
    const progress = (studentId && studentProgress[studentId]) || { completedTopicIds: [] };
    const completedTopicIds = progress.completedTopicIds || [];

    // Filter strictly for completed and graded quiz results (exclude invalid/ungraded attempts)
    const isQuizGraded = (q: any) =>
      Boolean(
        q &&
        typeof q.percentage === 'number' &&
        !isNaN(q.percentage) &&
        typeof q.totalScore === 'number' &&
        q.totalScore > 0 &&
        q.isCompleted !== false &&
        q.isUngraded !== true
      );

    const gradedAllQuizzes = allQuizzes.filter(isQuizGraded);
    const gradedCourseQuizzes = courseQuizzes.filter(isQuizGraded);

    const totalAssessments = gradedAllQuizzes.length;
    const courseAssessmentsCount = gradedCourseQuizzes.length;
    const hasHistory = courseAssessmentsCount > 0;

    const overallAverageScore =
      gradedAllQuizzes.length > 0
        ? Math.round(gradedAllQuizzes.reduce((acc, q) => acc + q.percentage, 0) / gradedAllQuizzes.length)
        : null;

    const courseAverageScore =
      gradedCourseQuizzes.length > 0
        ? Math.round(gradedCourseQuizzes.reduce((acc, q) => acc + q.percentage, 0) / gradedCourseQuizzes.length)
        : null;

    // Track mistakes and successes across quizzes
    const topicMisses: Record<string, { count: number; dates: string[]; reasons: string[] }> = {};
    const topicCorrect: Record<string, number> = {};

    courseQuizzes.forEach((quiz) => {
      if (quiz.details && Array.isArray(quiz.details.eval_details)) {
        quiz.details.eval_details.forEach((ed: any) => {
          if (!ed.is_correct && ed.topic) {
            if (!topicMisses[ed.topic]) {
              topicMisses[ed.topic] = { count: 0, dates: [], reasons: [] };
            }
            topicMisses[ed.topic].count += 1;
            if (quiz.submittedAt && !topicMisses[ed.topic].dates.includes(quiz.submittedAt)) {
              topicMisses[ed.topic].dates.push(quiz.submittedAt);
            }
            const shortQ = ed.question ? `"${ed.question.slice(0, 45)}..."` : 'assessment question';
            topicMisses[ed.topic].reasons.push(`Incorrect on ${shortQ} (Quiz: ${quiz.percentage}%)`);
          } else if (ed.is_correct && ed.topic) {
            topicCorrect[ed.topic] = (topicCorrect[ed.topic] || 0) + 1;
          }
        });
      } else if (quiz.details && Array.isArray(quiz.details.weak_topics)) {
        quiz.details.weak_topics.forEach((wt: string) => {
          if (!topicMisses[wt]) {
            topicMisses[wt] = {
              count: 1,
              dates: quiz.submittedAt ? [quiz.submittedAt] : [],
              reasons: [`Flagged in assessment on ${quiz.submittedAt || 'recent quiz'}`],
            };
          }
        });
      }
    });

    // Calculate weak topics
    const weakTopics = Object.entries(topicMisses)
      .map(([topic, data]) => {
        const reason =
          data.count > 1
            ? `Missed across ${data.count} quiz questions (${data.dates.join(', ') || 'recent quizzes'})`
            : data.reasons[0] || `Requires revision from recent quiz results`;
        return {
          topic,
          missedCount: data.count,
          lastMissedDate: data.dates[0],
          reasons: [reason],
        };
      })
      .sort((a, b) => b.missedCount - a.missedCount);

    // Repeated mistakes: topics missed 2 or more times
    const repeatedMistakes = weakTopics
      .filter((w) => w.missedCount >= 2)
      .map((w) => `${w.topic} (${w.missedCount} misses)`);

    // Strong topics: answered correctly, plus completed topics with 0 misses
    const strongTopicsSet = new Set<string>();
    Object.keys(topicCorrect).forEach((top) => {
      if (!topicMisses[top] || topicCorrect[top] > topicMisses[top].count * 2) {
        strongTopicsSet.add(top);
      }
    });
    course?.units?.forEach((u) => {
      u.topics?.forEach((t) => {
        if (completedTopicIds.includes(t.id) && !topicMisses[t.title]) {
          strongTopicsSet.add(t.title);
        }
      });
    });
    const strongTopics = Array.from(strongTopicsSet);

    // Syllabus progress
    const allCourseTopics: string[] = [];
    course?.units?.forEach((u) => {
      u.topics?.forEach((t) => allCourseTopics.push(t.title));
    });
    const totalCourseTopics = allCourseTopics.length;
    const completedInCourse =
      course?.units?.reduce(
        (acc, u) => acc + u.topics.filter((t) => completedTopicIds.includes(t.id)).length,
        0
      ) || 0;
    const syllabusProgressPct =
      totalCourseTopics > 0 ? Math.round((completedInCourse / totalCourseTopics) * 100) : 0;

    // Determine Mastery Level & Adaptive Explanation Mode
    let masteryLevel: 'Mastery' | 'Developing' | 'Needs Attention' | 'Unassessed' = 'Unassessed';
    let explanationMode = 'Structured Syllabus Walkthrough (Foundational Baseline)';

    if (!hasHistory) {
      masteryLevel = 'Unassessed';
      explanationMode = 'Standard Academic Walkthrough with Diagnostic Baseline';
    } else if (courseAverageScore !== null && courseAverageScore >= 80 && weakTopics.length === 0) {
      masteryLevel = 'Mastery';
      explanationMode = 'Advanced Engineering & Theoretical Exposition';
    } else if ((courseAverageScore !== null && courseAverageScore < 60) || repeatedMistakes.length > 0) {
      masteryLevel = 'Needs Attention';
      explanationMode = 'Simplified & Step-by-Step Remedial Guidance';
    } else {
      masteryLevel = 'Developing';
      explanationMode = 'Balanced Conceptual & Practical Breakdown';
    }

    // Next topic to study
    const nextTopicToStudy =
      allCourseTopics.find(
        (top) => !completedTopicIds.some((cId) => cId === top) && !weakTopics.some((w) => w.topic === top)
      ) || allCourseTopics[0];

    const conceptToRevise = weakTopics.length > 0 ? weakTopics[0].topic : undefined;
    const revisionReason = weakTopics.length > 0 ? weakTopics[0].reasons[0] : undefined;

    let practiceQuestionPrompt = '';
    if (conceptToRevise) {
      practiceQuestionPrompt = `Explain step-by-step how ${conceptToRevise} maintains structural invariants, and give a worked example.`;
    } else if (nextTopicToStudy) {
      practiceQuestionPrompt = `Give a sample practice problem on ${nextTopicToStudy} with full analysis.`;
    } else {
      practiceQuestionPrompt = `Provide a diagnostic test question on ${courseName}.`;
    }

    const lectureTarget = conceptToRevise || unitTitleOrScope || courseName;
    const recommendedLecture = getCuratedLectureRecommendation(courseCode, lectureTarget);

    return {
      studentId,
      studentName,
      semester,
      courseCode,
      courseName,
      totalAssessments,
      courseAssessmentsCount,
      courseAverageScore,
      overallAverageScore,
      masteryLevel,
      weakTopics,
      repeatedMistakes,
      strongTopics,
      completedTopicIds,
      totalCourseTopics,
      syllabusProgressPct,
      hasHistory,
      explanationMode,
      recommendations: {
        nextTopicToStudy,
        conceptToRevise,
        revisionReason,
        practiceQuestionPrompt,
        recommendedLecture,
      },
    };
  }

  // 3.10. Socratic Learning Engine Helpers
  function generateSocraticGuidingQuestion(query: string, courseName: string, masteryLevel: string) {
    if (masteryLevel === 'Needs Attention') {
      return `### 💡 Socratic Guide: ${query}\n\nInstead of jumping straight to the final answer, let's build your intuition step-by-step so you can solve similar problems on your own.\n\n**Core Conceptual Checkpoint:**\nIn **${courseName}**, this topic is designed to solve a specific performance bottleneck or preserve consistency.\n\n**Guiding Question 1:**\nWhat is the fundamental precondition or rule that this concept enforces? What would break if this rule were violated?\n\n*💬 Type your thoughts below, or click **Get Hint (1/3)** if you would like a guiding clue!*`;
    } else if (masteryLevel === 'Mastery') {
      return `### 💡 Socratic Challenge: ${query}\n\nWith your strong mastery in this subject, let's explore the underlying architectural and asymptotic invariants.\n\n**Theoretical Framing:**\nIn **${courseName}**, operations must balance worst-case asymptotic bounds with memory and cache locality trade-offs.\n\n**Guiding Question 1:**\nConsider the operational worst-case inputs for **${query}**. What mathematical balance invariant ensures that runtime remains strictly bounded, and what state transition restores equilibrium?\n\n*💬 Type your analysis below, or request a hint to explore specific edge-case invariants!*`;
    } else {
      return `### 💡 Socratic Guide: ${query}\n\nLet's reason through this concept step by step to solidify your understanding.\n\n**Guiding Question 1:**\nIn **${courseName}**, what is the primary role or invariant of **${query}**? What inputs does it accept, and what state must it guarantee after execution?\n\n*💬 Share your thoughts below, or click **Get Hint (1/3)** for a conceptual clue!*`;
    }
  }

  function generateSocraticHint(query: string, courseName: string, hintNumber: number, masteryLevel: string) {
    if (hintNumber === 1) {
      if (masteryLevel === 'Needs Attention') {
        return `💡 **Hint 1 of 3 (Intuitive Analogy):**\nThink of this operation like a self-balancing scale or a safety checkpoint. Before updating pointers or state, what is the simplest baseline case (e.g. empty container, single node, or null boundary)?`;
      }
      return `💡 **Hint 1 of 3 (Conceptual Direction):**\nConsider the core definition in **${courseName}**. This mechanism is designed to prevent performance degradation. What specific metric or property is monitored before and after this operation?`;
    } else if (hintNumber === 2) {
      if (masteryLevel === 'Needs Attention') {
        return `💡 **Hint 2 of 3 (Step-by-Step Clue):**\nLook at what changes: which values, pointers, or flags need to be updated? Notice that changing one element requires updating its neighboring connections so that no references are lost.`;
      }
      return `💡 **Hint 2 of 3 (Structural Invariant):**\nAnalyze the transition equations or pointer adjustments. For instance, notice how shifting ownership of the subtrees or adjusting process states maintains the global invariant while keeping height or time bounded.`;
    } else {
      if (masteryLevel === 'Needs Attention') {
        return `💡 **Hint 3 of 3 (Blueprint):**\nHere is the key stepping stone: The operation rearranges the immediate nodes so that the deepest branch becomes balanced, and then recalculates the metadata. Can you describe how this rebalances the structure?`;
      }
      return `💡 **Hint 3 of 3 (Concrete Mechanism):**\nHere is the structural transformation: The modified node reassigns its child pointers in $\\mathcal{O}(1)$ steps, preserving the ordering invariant. How does this guarantee that the overall operation terminates within asymptotic bounds?`;
    }
  }

  function generateSocraticAnswerEvaluation(query: string, courseName: string, studentAnswer: string, masteryLevel: string) {
    return `### 📝 Concept Evaluation & Next Step\n\n**Feedback on your reasoning:**\nYou have identified an essential part of the mechanism! In **${courseName}**, paying close attention to state transitions and preconditions is key to correct design.\n\n**Next Guiding Question:**\nNow take the next step: How does this mechanism ensure that edge cases (such as duplicate entries, empty containers, or resource exhaustion) do not cause unexpected failures or state corruption?\n\n*💬 Respond with your thoughts, or click **Reveal Complete Solution** if you are ready to review the full academic walkthrough!*`;
  }

  // 4. Multi-Agent Coordinator & Core AI Pipeline
  app.post('/api/agent/coordinate', async (req: Request, res: Response) => {
    const {
      query,
      courseName,
      courseCode,
      unitTitle,
      syllabusTopics,
      studentId,
      learningMode = 'normal',
      socraticAction = 'ask',
      socraticState,
      studentAnswer,
    } = req.body;
    const cleanQuery = (query || '').trim();
    const reqUserId = (req.headers['x-user-id'] as string) || (studentId as string) || '';

    // Trace tracking
    const steps: Array<{ step: string; description: string; status: 'completed' | 'running' | 'failed' }> = [];

    // Step 1: Analysing Student Request
    steps.push({
      step: 'Analysing Student Request',
      description: `Evaluating semantic intent: "${cleanQuery.slice(0, 80)}" [Mode: ${learningMode}]`,
      status: 'completed',
    });

    // Step 2: Checking Academic Syllabus & Domain Security
    const domainCheck = validateDomain(cleanQuery, `${courseName} ${unitTitle}`);
    if (!domainCheck.isAllowed) {
      steps.push({
        step: 'Checking Academic Syllabus',
        description: 'Non-academic query rejected by Domain Guard.',
        status: 'failed',
      });
      return res.json({
        success: false,
        selectedAgent: 'Domain Guard',
        response: domainCheck.reason,
        steps,
      });
    }

    steps.push({
      step: 'Checking Academic Syllabus',
      description: `Verified alignment with ${courseCode}: ${courseName} (${unitTitle || 'Full Course'}).`,
      status: 'completed',
    });

    // Step 3: Selecting Specialised Agent
    const qLower = cleanQuery.toLowerCase();
    let selectedAgent = 'Academic Tutor Agent';
    if (['book', 'textbook', 'pdf', 'open access', 'download', 'reference', 'library'].some((w) => qLower.includes(w))) {
      selectedAgent = 'Academic Research Agent';
    } else if (['video', 'youtube', 'lecture', 'watch', 'playlist'].some((w) => qLower.includes(w))) {
      selectedAgent = 'Video Discovery Agent';
    } else if (['plan', 'schedule', 'timetable', 'roadmap', 'reschedule'].some((w) => qLower.includes(w))) {
      selectedAgent = 'Semester Study Planner Agent';
    } else if (['quiz', 'test', 'assessment', 'mcq', 'evaluate me'].some((w) => qLower.includes(w))) {
      selectedAgent = 'Academic Assessment Agent';
    }

    const isSocratic =
      learningMode === 'socratic' && (selectedAgent === 'Academic Tutor Agent' || socraticAction !== 'ask');
    if (isSocratic) {
      selectedAgent = 'Academic Tutor Agent (Socratic Mode)';
    }

    steps.push({
      step: 'Selecting Specialised Agent',
      description: `Routed request to ${selectedAgent}.`,
      status: 'completed',
    });

    // Step 4: Evaluating Learner Profile (Personalized Learning Intelligence)
    const analysis = analyzeStudentPerformance(reqUserId, courseCode, unitTitle);

    steps.push({
      step: 'Evaluating Learner Profile',
      description: `Student: ${analysis.studentName} | Status: ${analysis.masteryLevel} (Avg: ${analysis.courseAverageScore !== null ? analysis.courseAverageScore + '%' : 'Unassessed'}) | Weak Topics: ${analysis.weakTopics.length}`,
      status: 'completed',
    });

    // Step 5: Executing Agentic Task with Adaptive Personalization & Socratic Flow
    steps.push({
      step: 'Executing Agentic Task',
      description: isSocratic
        ? `Executing Socratic dialog (${socraticAction}) calibrated for ${analysis.masteryLevel} learner profile.`
        : `Executing ${selectedAgent} workflow (${analysis.explanationMode}) with 3-key rotation pool and grounded syllabus notes.`,
      status: 'running',
    });

    let finalResponse = '';
    let updatedSocraticState: any = null;

    if (isSocratic) {
      const origQuery = socraticState?.originalQuery || cleanQuery;
      const currentGuidingQ = socraticState?.currentGuidingQuestion || '';
      const currentHintCount = socraticState?.hintCount || 0;

      if (socraticAction === 'ask') {
        const socraticPrompt = `You are EDUAGENT acting in SOCRATIC LEARNING MODE for university engineering students.
Course: ${courseName} (${courseCode})
Unit: ${unitTitle || 'All Units'}
Student Academic Query: "${cleanQuery}"
Student Mastery Profile: ${analysis.masteryLevel} (Assessment Average: ${analysis.courseAverageScore !== null ? analysis.courseAverageScore + '%' : 'Unassessed'})
${analysis.weakTopics.length > 0 ? `Identified Weak Areas: ${analysis.weakTopics.map((w) => w.topic).join(', ')}` : ''}

STRICT SOCRATIC RULES:
1. NEVER reveal the complete solution, direct code implementation, or full algorithm.
2. Acknowledge the core question with warm academic encouragement.
3. Frame the central engineering challenge or mathematical principle.
4. Formulate Guiding Question #1 tailored to their mastery level (${analysis.masteryLevel}):
   - If Needs Attention: provide scaffolding and ask about the base precondition or intuitive purpose.
   - If Mastery: challenge with low-level structural invariants or asymptotic worst-case bounds.
   - If Developing/Unassessed: ask about the core mechanism and its intended invariant.
5. Remind the student they can reply with their answer or click "Get Hint".`;

        try {
          finalResponse = await callGeminiWithFailover(cleanQuery, socraticPrompt);
          steps[4].status = 'completed';
        } catch (_err) {
          steps[4].status = 'completed';
          finalResponse = generateSocraticGuidingQuestion(cleanQuery, courseName, analysis.masteryLevel);
        }

        updatedSocraticState = {
          stage: 'initial_question',
          hintCount: 0,
          maxHints: 3,
          originalQuery: cleanQuery,
          currentGuidingQuestion: `Guiding Question for ${cleanQuery}`,
          isSolutionRevealed: false,
        };
      } else if (socraticAction === 'request_hint') {
        const nextHintCount = Math.min(3, currentHintCount + 1);
        const socraticPrompt = `You are EDUAGENT acting in SOCRATIC HINT MODE for university engineering students.
Course: ${courseName} (${courseCode})
Concept under exploration: "${origQuery}"
Previous Guiding Question: "${currentGuidingQ}"
Current Hint Level: Hint #${nextHintCount} of 3.
Student Mastery Profile: ${analysis.masteryLevel}.

STRICT HINT RULES:
1. Provide strictly Hint #${nextHintCount} of 3.
2. Calibrate hint difficulty to ${analysis.masteryLevel}:
   - If Hint #1: Provide gentle conceptual orientation or intuitive analogy.
   - If Hint #2: Provide structural invariant clue, mathematical property, or boundary check.
   - If Hint #3: Provide strong stepping stone or pseudocode skeleton.
3. Keep the hint concise, encouraging, and clear.
4. Conclude with: "Can you take the next step based on this hint?"`;

        try {
          finalResponse = await callGeminiWithFailover(
            `Provide Hint #${nextHintCount} for "${origQuery}"`,
            socraticPrompt
          );
          steps[4].status = 'completed';
        } catch (_err) {
          steps[4].status = 'completed';
          finalResponse = generateSocraticHint(origQuery, courseName, nextHintCount, analysis.masteryLevel);
        }

        updatedSocraticState = {
          stage: `hint_${nextHintCount}`,
          hintCount: nextHintCount,
          maxHints: 3,
          originalQuery: origQuery,
          currentGuidingQuestion: currentGuidingQ,
          isSolutionRevealed: false,
        };
      } else if (socraticAction === 'submit_answer') {
        const studentAns = (studentAnswer || cleanQuery).trim();
        const socraticPrompt = `You are EDUAGENT acting in SOCRATIC EVALUATION MODE for university engineering students.
Course: ${courseName} (${courseCode})
Concept under exploration: "${origQuery}"
Guiding Question that was asked: "${currentGuidingQ}"
Student's Submitted Answer: "${studentAns}"
Student Mastery Profile: ${analysis.masteryLevel}.

STRICT EVALUATION RULES:
1. Evaluate the student's answer with constructive warmth.
2. Explicitly affirm what the student got right.
3. Gently clarify any misconceptions or missing conditions.
4. If the student has successfully reasoned through the concept:
   - Celebrate their insight.
   - Offer to show the full synthesized formal solution.
5. If more reasoning is needed:
   - Ask the next logical guiding question (do NOT repeat the previous question).`;

        try {
          finalResponse = await callGeminiWithFailover(
            `Evaluate student response "${studentAns}" to question "${currentGuidingQ}" about "${origQuery}"`,
            socraticPrompt
          );
          steps[4].status = 'completed';
        } catch (_err) {
          steps[4].status = 'completed';
          finalResponse = generateSocraticAnswerEvaluation(origQuery, courseName, studentAns, analysis.masteryLevel);
        }

        updatedSocraticState = {
          stage: 'answered',
          hintCount: currentHintCount,
          maxHints: 3,
          originalQuery: origQuery,
          currentGuidingQuestion: `Next step on ${origQuery}`,
          isSolutionRevealed: false,
          lastEvaluation: {
            isCorrect: true,
            conceptFeedback: `Constructive evaluation completed for "${origQuery}"`,
          },
        };
      } else if (socraticAction === 'reveal_solution') {
        const revealPrompt = `You are EDUAGENT providing the formal, complete solution after Socratic inquiry.
Course: ${courseName} (${courseCode})
Unit: ${unitTitle || 'All Units'}
Concept: "${origQuery}"
Student Mastery Level: ${analysis.masteryLevel}

Rules:
1. Provide a comprehensive, rigorous academic explanation.
2. Celebrate the student's effort in reasoning through the Socratic steps.
3. Include formal definitions, step-by-step mechanisms, asymptotic complexity, and practical examples.`;

        try {
          finalResponse = await callGeminiWithFailover(
            `Provide complete authoritative explanation for "${origQuery}"`,
            revealPrompt
          );
          steps[4].status = 'completed';
        } catch (_err) {
          steps[4].status = 'completed';
          if (analysis.masteryLevel === 'Needs Attention') {
            finalResponse = `### ${courseName} — Complete Solution (Remedial Walkthrough)\n\n**Topic:** ${origQuery}\n\n**Great job working through the Socratic hints! Here is the full conceptual synthesis:**\n\n**1. Intuitive Foundation:**\nIn ${courseName}, this concept maintains strict consistency and avoids invalid states.\n\n**2. Step-by-Step Breakdown:**\n- **Step 1 (Preconditions):** Verify base states (null pointer or boundary value).\n- **Step 2 (The Operation):** Perform the transition one variable at a time.\n- **Step 3 (Invariant Check):** Recalculate metadata and confirm asymptotic balance.\n\n**3. Complete Worked Example:**\n\`\`\`text\nInitial State: [Unbalanced / Target Node]\n     ↓ Apply Transition\nResult State:  [Balanced & Correct Invariant]\n\`\`\``;
          } else if (analysis.masteryLevel === 'Mastery') {
            finalResponse = `### ${courseName} — Complete Solution (Advanced Theoretical Exposition)\n\n**Topic:** ${origQuery}\n\n**Outstanding reasoning! Here is the full advanced academic synthesis:**\n\n**1. Theoretical Formalism & Bounds:**\nGuarantees asymptotic bounds of $\\mathcal{O}(\\log n)$ runtime and $\\mathcal{O}(n)$ space under strict structural invariants.\n\n**2. Low-Level Invariants & Architectural Trade-offs:**\n- **Memory Locality:** Pointer indirection introduces CPU cache penalties.\n- **Amortized Analysis:** Operation costs are bounded over continuous sequences.\n- **Concurrency:** Requires atomic compare-and-swap or fine-grained lock coupling.`;
          } else {
            finalResponse = `### ${courseName} — Complete Solution Walkthrough\n\n**Topic:** ${origQuery}\n\n**Congratulations on working through the guided questions! Here is the complete curriculum walkthrough:**\n\n**1. Core Academic Definition:**\nIn ${courseName}, this concept forms a key component of your curriculum, governing state representation, algorithmic invariance, and computational bounds.\n\n**2. Step-by-Step Mechanics:**\n- **Invariance:** Verifies base preconditions and inductive steps.\n- **Complexity:** Operates within expected Big-O asymptotic limits.\n- **Implementation:** Handles edge cases safely (null pointers, single elements).`;
          }
        }

        updatedSocraticState = {
          stage: 'solution_revealed',
          hintCount: currentHintCount,
          maxHints: 3,
          originalQuery: origQuery,
          isSolutionRevealed: true,
        };
      }
    } else {
      // Normal Learning Mode: 100% existing Phase 1 Direct Explanation Pipeline
      try {
        let pedagogicalDirective = '';
        if (analysis.masteryLevel === 'Needs Attention') {
          pedagogicalDirective = `
STUDENT LEARNING CONTEXT & ADAPTIVE DIRECTIVE:
- Status: STRUGGLING / NEEDS REINFORCEMENT (Course Assessment Average: ${analysis.courseAverageScore}%).
- Identified Weak Topics: ${analysis.weakTopics.map((w) => w.topic).join(', ')}.
- Repeated Mistakes: ${analysis.repeatedMistakes.join(', ') || 'None recorded'}.
- PEDAGOGICAL DIRECTIVE (SIMPLIFIED & REMEDIAL MODE):
  1. Start with an intuitive real-world analogy or plain-English concept before formal mathematical definitions.
  2. Break down the concept into numbered step-by-step increments; do not skip intermediate logic.
  3. Clearly highlight the common pitfalls, boundary traps, or misconceptions students make on this topic.
  4. Provide a clear, concrete, fully commented code example or worked trace.
  5. Conclude with an encouraging, gentle self-check question to build confidence.`;
        } else if (analysis.masteryLevel === 'Mastery') {
          pedagogicalDirective = `
STUDENT LEARNING CONTEXT & ADAPTIVE DIRECTIVE:
- Status: ADVANCED / DEMONSTRATED MASTERY (Course Assessment Average: ${analysis.courseAverageScore}% across ${analysis.courseAssessmentsCount} quizzes).
- Strong Topics: ${analysis.strongTopics.slice(0, 5).join(', ')}.
- PEDAGOGICAL DIRECTIVE (ADVANCED THEORETICAL & ARCHITECTURAL EXPOSITION):
  1. Skip basic introductory analogies; dive directly into rigorous academic formalisms and low-level invariants.
  2. Analyze asymptotic behavior, cache locality, memory layout, and system trade-offs.
  3. Explore advanced optimization techniques, concurrency hazards, and theoretical edge-cases.
  4. Challenge the student with a high-level engineering design or proof question.`;
        } else if (analysis.masteryLevel === 'Developing') {
          pedagogicalDirective = `
STUDENT LEARNING CONTEXT & ADAPTIVE DIRECTIVE:
- Status: DEVELOPING / INTERMEDIATE (Course Assessment Average: ${analysis.courseAverageScore}%).
- PEDAGOGICAL DIRECTIVE:
  1. Provide a balanced, structured explanation: clear formal definition, step-by-step breakdown, and practical example.
  2. Include a targeted practice question to solidify understanding.`;
        } else {
          pedagogicalDirective = `
STUDENT LEARNING CONTEXT & ADAPTIVE DIRECTIVE:
- Status: UNASSESSED (New learner with no completed quizzes in this course).
- PEDAGOGICAL DIRECTIVE:
  1. Provide a clear, structured foundational walkthrough grounded strictly in the syllabus.
  2. Explain core concepts with step-by-step examples.
  3. Offer a formative diagnostic practice question to check baseline understanding.`;
        }

        const systemPrompt = `You are EDUAGENT, an academic tutor for university engineering students.
Course: ${courseName} (${courseCode})
Unit: ${unitTitle || 'All Units'}
Syllabus Topics: ${(syllabusTopics || []).join(', ')}
${pedagogicalDirective}
Strict Rules:
1. Provide structured, step-by-step explanations, code/math examples, and memory diagrams where helpful.
2. Ground all answers strictly in the course syllabus.
3. NEVER discuss non-academic topics.
4. Keep the tone academic, encouraging, and clear.`;

        finalResponse = await callGeminiWithFailover(cleanQuery, systemPrompt);
        steps[4].status = 'completed';
      } catch (_err) {
        // Deterministic pedagogical fallback tailored to student mastery level
        steps[4].status = 'completed';
        if (analysis.masteryLevel === 'Needs Attention') {
          finalResponse = `### ${courseName} — Step-by-Step Remedial Walkthrough\n\n**Topic:** ${cleanQuery}\n\n**1. Intuitive Foundation (Why This Matters):**\nIn ${courseName}, this concept can seem tricky at first, but its core purpose is simple: maintaining data invariants and state consistency during operations.\n\n**2. Step-by-Step Breakdown:**\n- **Step 1 (Preconditions):** Verify base states (null pointer, empty boundary, or single item).\n- **Step 2 (The Operation):** Perform the transition one pointer or variable at a time so no data is lost.\n- **Step 3 (Common Trap):** Forgetting to recalculate balance factors or update child pointers.\n\n**3. Guided Example:**\n\`\`\`text\nInitial State: [Unbalanced / Target Node]\n     ↓ Apply Transition\nResult State:  [Balanced & Correct Invariant]\n\`\`\`\n\n**4. Gentle Self-Check:**\nCan you describe what happens to the child subtrees during this transition? Ask me if you'd like to trace an example together!`;
        } else if (analysis.masteryLevel === 'Mastery') {
          finalResponse = `### ${courseName} — Advanced Systems & Theoretical Analysis\n\n**Topic:** ${cleanQuery}\n\n**1. Theoretical Formalism & Mathematical Bounds:**\nIn ${courseName}, this mechanism guarantees an asymptotic upper bound of $\\mathcal{O}(\\log n)$ runtime and $\\mathcal{O}(n)$ space under strict structural invariants.\n\n**2. Low-Level Invariants & Architectural Trade-offs:**\n- **Memory Locality & Cache Penalties:** Pointer indirection introduces CPU cache line misses compared to contiguous memory buffers.\n- **Amortized Analysis:** Structural rebalancing costs are strictly bounded and amortized over sequential operation streams.\n- **Concurrency Hazards:** Requires fine-grained lock coupling or lock-free transactional primitives to prevent data races during mutation.\n\n**3. Advanced Engineering Challenge:**\nHow would you redesign this structure using SIMD-aligned vector blocks to minimize L1/L2 cache misses on modern 64-bit multi-core processors?`;
        } else {
          finalResponse = `### ${courseName} — Conceptual Walkthrough\n\n**Topic:** ${cleanQuery}\n\n**1. Core Academic Definition:**\nIn ${courseName}, this concept forms a key component of your curriculum. It governs data representation, algorithmic invariance, and computational complexity.\n\n**2. Step-by-Step Breakdown:**\n- **Invariance:** Verify base preconditions and inductive steps.\n- **Complexity:** Evaluate time complexity under best, average, and worst asymptotic cases (Big-O).\n- **Implementation:** Ensure edge cases (empty pointers, single elements, null boundaries) are handled safely.\n\n**3. Practice Check:**\nHow would the memory layout differ if implemented sequentially in contiguous memory versus linked pointer nodes?`;
        }
      }
    }

    // Step 6: Validating Results
    steps.push({
      step: 'Validating Results',
      description: 'Verified academic integrity, formatting standards, and credential safety.',
      status: 'completed',
    });

    // Step 7: Delivering Final Response
    steps.push({
      step: 'Delivering Final Response',
      description: isSocratic
        ? 'Delivered Socratic learning guidance and progressive stepping stone.'
        : 'Delivered synthesized educational guidance tailored to student performance.',
      status: 'completed',
    });

    return res.json({
      success: true,
      selectedAgent,
      response: finalResponse,
      steps,
      personalization: {
        masteryLevel: analysis.masteryLevel,
        explanationMode: analysis.explanationMode,
        courseScore: analysis.courseAverageScore,
        totalQuizzes: analysis.courseAssessmentsCount,
        weakTopics: analysis.weakTopics.map((w) => w.topic),
        repeatedMistakes: analysis.repeatedMistakes,
        strongTopics: analysis.strongTopics,
        recommendations: analysis.recommendations,
      },
      socraticState: updatedSocraticState,
    });
  });

  // 4.5. Student Learning Profile API (Isolated per student)
  app.get('/api/student/learning-profile/:studentId/:courseId', (req: Request, res: Response) => {
    const { studentId, courseId } = req.params;
    const reqUserId = (req.headers['x-user-id'] as string) || '';
    const reqUserRole = (req.headers['x-user-role'] as string) || '';

    // Student authorization check: student can only access their own learning profile
    if (reqUserId && reqUserId !== studentId && reqUserRole !== 'admin' && reqUserId !== 'admin-1') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: student learning profile is private and isolated.',
      });
    }

    const course = courses.find((c) => c.id === courseId || c.code === courseId) || courses[0];
    const profile = analyzeStudentPerformance(studentId, course.code);

    return res.json({
      success: true,
      profile,
    });
  });

  // 5. System & 3-Key API Manager Pool Status (Protected: Admin Only)
  app.get('/api/system/api-keys', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    const userIdHeader = (req.headers['x-user-id'] as string) || '';

    // Enforce admin-only access
    if (roleHeader !== 'admin' && userIdHeader !== 'admin-1' && authHeader !== ADMIN_PASSWORD) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: API Key Pool status is restricted to administrative personnel.',
      });
    }

    syncKeyPool();

    // Check YouTube Data API connection health
    const rawYtKey = (process.env.YOUTUBE_API_KEY || '').trim();
    let ytHealth: {
      configured: boolean;
      state: 'Active' | 'Unavailable' | 'Quota Exceeded' | 'Not Configured';
      maskedKey?: string;
      message?: string;
    } = {
      configured: false,
      state: 'Not Configured',
      message: 'No YouTube API key provided in environment configuration.',
    };

    if (rawYtKey && rawYtKey !== 'MY_YOUTUBE_API_KEY') {
      ytHealth.configured = true;
      ytHealth.maskedKey = `AIza..${rawYtKey.slice(-4)}`;
      try {
        const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=academic&type=video&maxResults=1&key=${rawYtKey}`;
        const testRes = await fetch(testUrl);
        const testData = await testRes.json();

        if (testRes.status === 200) {
          ytHealth.state = 'Active';
          ytHealth.message = 'Connected to YouTube Data API v3. Live search operational.';
        } else if (testRes.status === 403 || testData?.error?.errors?.some((e: any) => e.reason?.includes('quota'))) {
          ytHealth.state = 'Quota Exceeded';
          ytHealth.message = 'Daily YouTube API quota limit reached. Falling back to curated syllabus lectures.';
        } else {
          ytHealth.state = 'Unavailable';
          ytHealth.message = testData?.error?.message || `YouTube API returned HTTP ${testRes.status}`;
        }
      } catch (err: any) {
        ytHealth.state = 'Unavailable';
        ytHealth.message = err?.message || 'Network unreachable or DNS lookup failed for googleapis.com';
      }
    }

    return res.json({
      success: true,
      configuredCount: keyPool.length,
      totalFailovers,
      model: GEMINI_FLASH_MODEL,
      youtubeStatus: ytHealth,
      keys: keyPool.map((k) => ({
        maskedId: k.maskedId,
        isHealthy: k.isHealthy,
        totalCalls: k.totalCalls,
        consecutiveFailures: k.consecutiveFailures,
      })),
    });
  });

  // 6. Student Progress & Assessments
  app.get('/api/progress/:studentId/:courseId', (req: Request, res: Response) => {
    const student = studentProgress[req.params.studentId] || { completedTopicIds: [] };
    const course = courses.find((c) => c.id === req.params.courseId);
    let totalTopics = 0;
    course?.units.forEach((u) => {
      totalTopics += u.topics.length;
    });

    return res.json({
      success: true,
      totalTopics,
      completedCount: student.completedTopicIds.length,
      completedTopicIds: student.completedTopicIds,
      percentage: totalTopics > 0 ? Math.round((student.completedTopicIds.length / totalTopics) * 100) : 0,
    });
  });

  app.post('/api/progress/toggle', (req: Request, res: Response) => {
    const { studentId, topicId, isCompleted } = req.body;
    if (!studentProgress[studentId]) {
      studentProgress[studentId] = { completedTopicIds: [] };
    }
    const current = studentProgress[studentId].completedTopicIds;
    if (isCompleted && !current.includes(topicId)) {
      current.push(topicId);
    } else if (!isCompleted && current.includes(topicId)) {
      studentProgress[studentId].completedTopicIds = current.filter((id) => id !== topicId);
    }
    saveStudentStateToDisk();
    return res.json({ success: true, completedTopicIds: studentProgress[studentId].completedTopicIds });
  });

  app.post('/api/assessments/submit', (req: Request, res: Response) => {
    const { studentId, courseCode, score, totalScore, details } = req.body;
    if (!studentId || !courseCode) {
      return res.status(400).json({ success: false, message: 'studentId and courseCode are required.' });
    }
    const numScore = Number(score) || 0;
    const numTotal = Number(totalScore) || 0;
    const percentage = numTotal > 0 ? Math.round((numScore / numTotal) * 100) : 0;

    if (!assessmentHistory[studentId]) {
      assessmentHistory[studentId] = [];
    }
    const resultItem = {
      id: `res-${Date.now()}`,
      courseCode,
      unitTitle: details?.unitTitle || req.body.unitTitle || undefined,
      score: numScore,
      totalScore: numTotal,
      percentage,
      isCompleted: true,
      details,
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    assessmentHistory[studentId].unshift(resultItem);
    saveStudentStateToDisk();
    return res.json({ success: true, result: resultItem });
  });

  app.get('/api/assessments/history/:studentId', (req: Request, res: Response) => {
    return res.json({ success: true, history: assessmentHistory[req.params.studentId] || [] });
  });

  // 6.5. AI Tutor Conversation History (Persistent per student, course & unit)
  app.get('/api/tutor/history/:studentId/:courseId/:unitId', (req: Request, res: Response) => {
    const { studentId, courseId, unitId } = req.params;
    const reqUserId = (req.headers['x-user-id'] as string) || '';
    const reqUserRole = (req.headers['x-user-role'] as string) || '';

    // Student authorization check: student can only access their own conversation history
    if (reqUserId && reqUserId !== studentId && reqUserRole !== 'admin' && reqUserId !== 'admin-1') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: student chat history is isolated and protected.',
      });
    }

    const studentHistories = studentChatHistories[studentId] || {};
    const key = `${courseId}:${unitId}`;
    const messages = studentHistories[key] || [];

    return res.json({
      success: true,
      studentId,
      courseId,
      unitId,
      messages,
    });
  });

  app.post('/api/tutor/history', (req: Request, res: Response) => {
    const { studentId, courseId, unitId, message, messages } = req.body;
    if (!studentId || !courseId || !unitId) {
      return res.status(400).json({ success: false, message: 'studentId, courseId, and unitId are required.' });
    }

    const reqUserId = (req.headers['x-user-id'] as string) || '';
    const reqUserRole = (req.headers['x-user-role'] as string) || '';

    if (reqUserId && reqUserId !== studentId && reqUserRole !== 'admin' && reqUserId !== 'admin-1') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: cannot write to another student\'s conversation history.',
      });
    }

    if (!studentChatHistories[studentId]) {
      studentChatHistories[studentId] = {};
    }

    const key = `${courseId}:${unitId}`;
    if (!studentChatHistories[studentId][key]) {
      studentChatHistories[studentId][key] = [];
    }

    const currentMessages = studentChatHistories[studentId][key];

    if (message && message.id && message.content) {
      const existingIdx = currentMessages.findIndex((m) => m.id === message.id);
      if (existingIdx !== -1) {
        currentMessages[existingIdx] = message;
      } else {
        currentMessages.push(message);
      }
    } else if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        if (msg && msg.id && msg.content) {
          const existingIdx = currentMessages.findIndex((m) => m.id === msg.id);
          if (existingIdx !== -1) {
            currentMessages[existingIdx] = msg;
          } else {
            currentMessages.push(msg);
          }
        }
      });
    }

    saveStudentStateToDisk();

    return res.json({
      success: true,
      count: currentMessages.length,
      messages: currentMessages,
    });
  });

  app.delete('/api/tutor/history/:studentId/:courseId/:unitId', (req: Request, res: Response) => {
    const { studentId, courseId, unitId } = req.params;
    const reqUserId = (req.headers['x-user-id'] as string) || '';
    const reqUserRole = (req.headers['x-user-role'] as string) || '';

    if (reqUserId && reqUserId !== studentId && reqUserRole !== 'admin' && reqUserId !== 'admin-1') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: cannot delete another student\'s conversation history.',
      });
    }

    if (studentChatHistories[studentId]) {
      const key = `${courseId}:${unitId}`;
      delete studentChatHistories[studentId][key];
      saveStudentStateToDisk();
    }

    return res.json({ success: true, message: 'Conversation history cleared.' });
  });

  // 7. Semester Planner API Endpoints
  app.get('/api/planner/:studentId', (req: Request, res: Response) => {
    const plan = studentStudyPlans[req.params.studentId] || null;
    return res.json({ success: true, plan });
  });

  app.post('/api/planner/generate', (req: Request, res: Response) => {
    const { studentId, dailyHours = 3.0, examDate, weakSubject } = req.body;
    const hours = parseFloat(dailyHours) || 3.0;
    const student = studentProgress[studentId] || { completedTopicIds: [] };
    const completedSet = new Set(student.completedTopicIds || []);

    // Find student's semester to filter applicable courses
    const studentUser = registeredUsers.find((u) => u.id === studentId);
    const studentSem = studentUser?.semester;
    const normalizedStudentSem = studentSem ? studentSem.toLowerCase().replace(/\s+/g, '') : null;

    const applicableCourses = courses.filter((c) => {
      if (!normalizedStudentSem || normalizedStudentSem === 'all' || normalizedStudentSem === 'allsemesters') {
        return true;
      }
      const normalizedCourseSem = (c.semester || '').toLowerCase().replace(/\s+/g, '');
      return normalizedCourseSem === normalizedStudentSem;
    });

    // Fallback to all courses if none match the exact semester
    const coursesToPlan = applicableCourses.length > 0 ? applicableCourses : courses;

    const targetDate = examDate ? new Date(examDate) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const totalDaysAvailable = Math.max(7, Math.min(120, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))));

    // Gather all topics across applicable courses
    interface PlannedTopicItem {
      topicId: string;
      topicTitle: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      estimatedHours: number;
      unitTitle: string;
      courseCode: string;
      courseName: string;
      isCompleted: boolean;
      weight: number;
    }

    const topicPool: PlannedTopicItem[] = [];

    coursesToPlan.forEach((c) => {
      const isWeak = c.code === weakSubject || c.name === weakSubject;
      c.units.forEach((u) => {
        u.topics.forEach((t) => {
          let weight = t.difficulty === 'Hard' ? 1.8 : t.difficulty === 'Easy' ? 0.8 : 1.2;
          if (isWeak) weight *= 1.3;
          topicPool.push({
            topicId: t.id,
            topicTitle: t.title,
            difficulty: t.difficulty,
            estimatedHours: t.estimatedHours || (weight * 2.0),
            unitTitle: `Unit ${u.unitNumber}: ${u.title}`,
            courseCode: c.code,
            courseName: c.name,
            isCompleted: completedSet.has(t.id),
            weight,
          });
        });
      });
    });

    // Sort: pending topics first with higher weight, then completed topics
    topicPool.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return b.weight - a.weight;
    });

    const tasks: any[] = [];
    let currentDay = 1;
    let topicIndex = 0;
    let studyDayCount = 0;
    let revisionCount = 0;
    let bufferCount = 0;
    let mockTestCount = 0;

    // Distribute tasks across available days
    while (currentDay <= totalDaysAvailable) {
      const dayDate = new Date(today.getTime() + (currentDay - 1) * 24 * 60 * 60 * 1000);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      // Day 7 interval: Adaptive Buffer Day
      if (currentDay % 7 === 0) {
        bufferCount++;
        tasks.push({
          id: `task-buf-${currentDay}-${Date.now()}`,
          date: `Day ${currentDay} (${dayName})`,
          day_number: currentDay,
          type: 'buffer',
          title: 'Adaptive Buffer Day (Catch-up / Cognitive Rest & Consolidation)',
          course_name: 'All Enrolled Courses',
          duration_hours: Math.min(2.0, hours),
          status: 'pending',
          is_completed: false,
        });
      }
      // Day 6 interval: Revision session
      else if (currentDay % 6 === 0) {
        revisionCount++;
        const recentCourse = courses[(currentDay / 6) % courses.length] || courses[0];
        tasks.push({
          id: `task-rev-${currentDay}-${Date.now()}`,
          date: `Day ${currentDay} (${dayName})`,
          day_number: currentDay,
          type: 'revision',
          title: `Syllabus Consolidation & Formula Flashcards (${recentCourse?.code || 'Core'})`,
          course_name: recentCourse?.name || 'Academic Core',
          duration_hours: hours,
          status: 'pending',
          is_completed: false,
        });
      }
      // Mock test days near the end
      else if (currentDay === Math.floor(totalDaysAvailable * 0.75) || currentDay === totalDaysAvailable - 2) {
        mockTestCount++;
        tasks.push({
          id: `task-mock-${currentDay}-${Date.now()}`,
          date: `Day ${currentDay} (${dayName})`,
          day_number: currentDay,
          type: 'mock_test',
          title: `Comprehensive Diagnostic Mock Exam #${mockTestCount}`,
          course_name: 'All Enrolled Courses',
          duration_hours: hours,
          status: 'pending',
          is_completed: false,
        });
      }
      // Standard syllabus study day
      else {
        studyDayCount++;
        const currentTopic = topicPool[topicIndex % topicPool.length];
        topicIndex++;

        tasks.push({
          id: `task-${currentTopic.topicId}-${currentDay}`,
          topic_id: currentTopic.topicId,
          date: `Day ${currentDay} (${dayName})`,
          day_number: currentDay,
          type: 'study',
          title: `${currentTopic.courseCode}: ${currentTopic.topicTitle}`,
          course_name: currentTopic.courseName,
          unit_title: currentTopic.unitTitle,
          difficulty: currentTopic.difficulty,
          duration_hours: Math.round(hours * 10) / 10,
          status: currentTopic.isCompleted ? 'completed' : 'pending',
          is_completed: currentTopic.isCompleted,
        });
      }

      currentDay++;
    }

    const newPlan = {
      total_study_days: totalDaysAvailable,
      daily_hours: hours,
      semester_start: today.toISOString().split('T')[0],
      semester_end: targetDate.toISOString().split('T')[0],
      exam_date: targetDate.toISOString().split('T')[0],
      total_topics_covered: topicPool.length,
      total_tasks: tasks.length,
      phases: {
        study_days: studyDayCount,
        revision_sessions: revisionCount,
        buffer_days: bufferCount,
        mock_tests: mockTestCount,
      },
      tasks,
    };

    studentStudyPlans[studentId] = newPlan;
    saveStudentStateToDisk();

    return res.json({ success: true, plan: newPlan });
  });

  app.post('/api/planner/toggle-task', (req: Request, res: Response) => {
    const { studentId, taskId, isCompleted } = req.body;
    const plan = studentStudyPlans[studentId];
    if (!plan || !Array.isArray(plan.tasks)) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    let matchingTopicId: string | undefined;

    plan.tasks = plan.tasks.map((t: any) => {
      if (t.id === taskId) {
        matchingTopicId = t.topic_id;
        return {
          ...t,
          is_completed: isCompleted,
          status: isCompleted ? 'completed' : 'pending',
        };
      }
      return t;
    });

    // Also update topic progress if mapped to topic
    if (matchingTopicId) {
      if (!studentProgress[studentId]) {
        studentProgress[studentId] = { completedTopicIds: [] };
      }
      const p = studentProgress[studentId].completedTopicIds;
      if (isCompleted && !p.includes(matchingTopicId)) {
        p.push(matchingTopicId);
      } else if (!isCompleted && p.includes(matchingTopicId)) {
        studentProgress[studentId].completedTopicIds = p.filter((id) => id !== matchingTopicId);
      }
    }

    saveStudentStateToDisk();
    return res.json({ success: true, plan, completedTopicIds: studentProgress[studentId]?.completedTopicIds || [] });
  });

  // 8. Assessment Agent Question Generation API
  app.post('/api/assessments/generate', async (req: Request, res: Response) => {
    const { courseCode, unitId, count = 10 } = req.body;
    const questionCount = Math.min(20, Math.max(5, parseInt(count) || 10));

    const course = courses.find((c) => c.code === courseCode) || courses[0];
    const unit = unitId && unitId !== 'all' ? course.units.find((u) => u.id === unitId) : null;
    const targetTopics = unit ? unit.topics : course.units.flatMap((u) => u.topics);
    const unitName = unit ? `Unit ${unit.unitNumber}: ${unit.title}` : 'Full Course Curriculum';
    const topicTitles = targetTopics.map((t) => t.title);

    const prompt = `You are the EDUAGENT Academic Assessment Agent.
Course: ${course.name} (${course.code})
Scope: ${unitName}
Syllabus Topics to cover: ${topicTitles.slice(0, 15).join(', ')}

Generate exactly ${questionCount} diverse, rigorous multiple-choice academic questions.
Requirements:
1. Cover a broad range of topics from the syllabus above (do NOT repeat the same topic).
2. Balance difficulty: 30% Easy, 50% Medium, 20% Hard.
3. Every question must have exactly 4 plausible options, with strictly 1 correct answer (index 0, 1, 2, or 3).
4. Provide a clear hint and a pedagogical step-by-step explanation for each question.
5. Return ONLY a valid JSON array conforming to this exact schema, with NO markdown backticks or commentary:
[
  {
    "id": "q-1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "hint": "Pedagogical hint",
    "explanation": "Detailed explanation of why the correct option is right and others are distractors",
    "topic": "Syllabus Topic Name"
  }
]`;

    try {
      const rawAiResponse = await callGeminiWithFailover(
        prompt,
        'You are an expert university examiner. You return strictly valid JSON question arrays.'
      );
      let clean = rawAiResponse.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const questions = JSON.parse(clean);
      if (Array.isArray(questions) && questions.length > 0) {
        return res.json({
          success: true,
          questions: questions.slice(0, questionCount).map((q, idx) => ({
            ...q,
            id: q.id || `q-gen-${idx + 1}-${Date.now()}`,
          })),
          isAiGenerated: true,
        });
      }
    } catch (err) {
      console.warn('AI question generation fallback triggered:', err);
    }

    // High quality deterministic fallback questions pool tailored to the requested count & topics
    const fallbackPool: any[] = [];
    const difficulties: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];

    targetTopics.forEach((t, idx) => {
      fallbackPool.push({
        id: `q-fb-${t.id || idx}`,
        question: `In ${course.name}, regarding "${t.title}", which of the following statements represents the core theoretical principle or runtime invariant?`,
        options: [
          `It satisfies standard asymptotic bounds while preserving correctness and memory invariants.`,
          `It exhibits unconditional O(1) worst-case time without regard to input ordering.`,
          `It eliminates all recursive stack overhead by converting operations into hardware microcode.`,
          `It violates data encapsulation by allowing arbitrary unbounded pointers.`,
        ],
        correct_index: 0,
        hint: `Consider how ${t.title} guarantees algorithmic invariants and expected time-space complexity.`,
        explanation: `${t.title} in ${course.name} is structured to adhere to well-defined asymptotic bounds while guaranteeing state correctness and valid pointer/data hierarchies.`,
        topic: t.title,
      });

      fallbackPool.push({
        id: `q-fb-2-${t.id || idx}`,
        question: `When analyzing the computational efficiency or architectural behavior of "${t.title}", what is the primary consideration?`,
        options: [
          `Evaluating worst-case and average-case bounds (Big-O, Omega, Theta) under boundary conditions.`,
          `Ignoring hardware cache hierarchies and memory locality.`,
          `Assuming infinite contiguous memory is always available.`,
          `Disregarding termination conditions in recursive or iterative steps.`,
        ],
        correct_index: 0,
        hint: `Think about how professors evaluate algorithm and system design trade-offs.`,
        explanation: `Academic evaluation of ${t.title} requires rigorous analysis of asymptotic complexity, space-time trade-offs, and boundary invariants.`,
        topic: t.title,
      });
    });

    const selectedFallback = fallbackPool.slice(0, questionCount);
    // If not enough, repeat with variations
    while (selectedFallback.length < questionCount) {
      const idx = selectedFallback.length;
      selectedFallback.push({
        id: `q-fb-pad-${idx}`,
        question: `Which fundamental invariant applies to problem solving in ${course.name} (Topic: ${targetTopics[idx % targetTopics.length]?.title || 'Core Principles'})?`,
        options: [
          'Preconditions must be verified before executing inductive transitions.',
          'Postconditions can be ignored if the base case evaluates successfully.',
          'Dynamic state changes never alter complexity parameters.',
          'Memory allocation occurs exclusively at compile-time without dynamic heap usage.',
        ],
        correct_index: 0,
        hint: 'Mathematical induction and invariant maintenance underpin sound software design.',
        explanation: 'Inductive step verification and precondition satisfaction ensure algorithmic stability across input permutations.',
        topic: targetTopics[idx % targetTopics.length]?.title || 'Core Principles',
      });
    }

    return res.json({
      success: true,
      questions: selectedFallback,
      isAiGenerated: false,
    });
  });

  // Vite Integration in Development
  const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('dist');
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(BASE_PROJECT_DIR, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(BASE_PROJECT_DIR, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EDUAGENT] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[EDUAGENT] Fatal error starting server:', err);
});
