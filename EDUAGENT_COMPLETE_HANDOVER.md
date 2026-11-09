# EDUAGENT — Comprehensive Technical Handover & Developer Guide

> **Target Audience:** Incoming AI Coding Assistant / Antigravity Instance / Software Engineer  
> **Repository:** `EDUAGENT — Autonomous Multi-Agent AI Education Platform`  
> **Last Verified Build Status:** Clean compilation (`npm run build`), zero ESLint errors (`npm run lint`), all automated test suites passing (`36/36 tests passing`).  
> **Security Notice:** All API keys, secrets, and credentials in this document are sanitized with environment variable placeholders.

---

## 1. Project Overview and Objectives

**EDUAGENT** is a full-stack, autonomous, multi-agent AI educational platform engineered for higher-education computer science and engineering curricula. The platform replaces generic conversational chatbots with a coordinated team of six specialized pedagogical AI agents that guide university students through syllabus discovery, conceptual mastery, Socratic problem-solving, curated academic literature, lecture video retrieval, semester revision planning, and adaptive diagnostic assessments.

### Core Pedagogical Objectives
1. **Academic Grounding & Syllabus Confinement:** Ensure all AI tutor responses, practice problems, and study schedules strictly adhere to defined university syllabi (e.g., Data Structures, Operating Systems, Database Management Systems, Machine Learning) using curriculum-scoped knowledge stores and guardrails.
2. **Domain-Guarded Safety:** Reject out-of-domain queries (e.g., entertainment, politics, general coding hobbies unrelated to the university curriculum) gracefully, steering students back to their academic objectives.
3. **Personalized Learning Profiles:** Analyze historical assessment attempts, topic mastery percentages, and repeated conceptual errors in real time. Dynamically adjust pedagogical depth—providing accessible analogies for struggling students and rigorous formal proofs or asymptotic analyses for advanced learners.
4. **Socratic Inquiry vs. Direct Answer Retrieval:** Provide an interactive Socratic learning mode where students are guided toward discoveries through progressive, 3-tier scaffolding hints instead of immediate answer reveals.
5. **Deterministic Assessment & Analytics:** Deliver automated diagnostic quizzes with verified question structures, deterministic score calculations, and real-time weak-topic detection without data corruption or phantom scores.

---

## 2. Complete Technology Stack and Versions

EDUAGENT operates on a dual-stack setup: a **primary production full-stack TypeScript architecture** that powers the web UI, APIs, persistent stores, and real-time multi-agent orchestration, alongside a **companion Python prototype architecture** used for exploratory multi-agent coordination.

### Primary Full-Stack (Node.js & React 19)
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>=20.x` (Dev on v24.x) | Server runtime & tooling engine |
| **Backend Framework** | Express | `^4.21.2` | REST API routes, middleware, JSON stores |
| **Language** | TypeScript | `~5.8.2` / `^5.7.2` | Strict end-to-end typing across frontend & backend |
| **Frontend Framework** | React | `^19.0.0` / `19.0.1` | Client UI architecture with functional components & hooks |
| **Build Tool / Bundler** | Vite | `^6.2.0` | Fast HMR dev server & production client bundling |
| **Styling & CSS** | Tailwind CSS | `^4.0.0` (Tailwind v4) | Utility-first styling with `@tailwindcss/vite` |
| **Icons** | Lucide React | `^1.16.0` | Unified iconography across dashboard, agents, and navigation |
| **Math Rendering** | KaTeX | `^0.16.21` | High-fidelity mathematical and asymptotic formula rendering |
| **Markdown Parser** | Marked | `^15.0.7` | Markdown-to-HTML rendering with code blocks and KaTeX support |
| **Client Animations** | Canvas Confetti | `^1.9.4` | Gamified feedback for quiz mastery and milestone completions |
| **AI SDK** | `@google/genai` | `^0.1.2` | Official Google Gemini Generative AI SDK with model failovers |
| **Dev Execution** | `tsx` | `^4.19.3` | Direct execution of TypeScript backend scripts without transpile steps |

### Companion Prototype Stack (Python)
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | Python | `>=3.10` (Dev on 3.12) | Scripting & reference agent logic |
| **UI Framework** | Streamlit | `>=1.32.0` | Rapid prototype interactive interface (`app.py`) |
| **AI Client** | `google-generativeai` | `>=0.8.0` | Python client for Gemini models |
| **Relational DB** | SQLite3 | Native | Fallback relational storage (`database/eduagent.db`) |
| **API Framework** | FastAPI / Uvicorn | Optional | Lightweight microservice wrapper |

---

## 3. Project Folder and File Structure

```
c:\eduagent---autonomous-multi-agent-ai-education-platform (1)\
├── agents/                           # Python agent implementations
│   ├── coordinator.py                # Academic Coordinator router & intent classifier
│   ├── tutor.py                      # Academic Tutor agent
│   ├── research.py                   # Research & textbook citation agent
│   ├── video.py                      # YouTube video discovery agent
│   ├── planner.py                    # Semester study planner agent
│   └── assessment.py                 # Assessment generation and grading agent
├── core/                             # Core cross-agent utilities (Python)
│   ├── coordinator.py                # Python Coordinator class
│   └── domain_guard.py               # Out-of-domain keyword and syllabus guard
├── database/                         # Core persistence layer
│   ├── courses_store.json            # University courses, units, and syllabus topics
│   ├── student_state_store.json      # Student chat histories, quiz results, study plans
│   ├── users_store.json              # Student and administrator auth records
│   ├── db.py                         # Python SQLite database manager
│   ├── schema.sql                    # Relational database schema definition
│   └── eduagent.db                   # SQLite database file
├── public/                           # Static assets served by Vite
├── src/                              # React 19 Frontend source code
│   ├── components/                   # UI components
│   │   ├── AdministratorPanel.tsx    # Admin curriculum and student management
│   │   ├── Assessments.tsx           # 3-Stage Assessment engine (Setup, Quiz Taking, Results)
│   │   ├── AuthModal.tsx             # Public landing page, student & admin login modals
│   │   ├── CourseBrowser.tsx         # University course and unit exploration
│   │   ├── LearningAnalytics.tsx     # Student performance charts and mastery metrics
│   │   ├── Navigation.tsx            # Clean SaaS sidebar navigation
│   │   ├── ResearchAssistant.tsx     # Academic papers, textbooks, and citation finder
│   │   ├── SocraticHintMeter.tsx     # Interactive 3-tier progressive hint controller
│   │   ├── StudentDashboard.tsx      # Linear-inspired student overview & metrics
│   │   ├── StudyPlanner.tsx          # Adaptive weekly calendar & revision generator
│   │   ├── TopBar.tsx                # Context bar (Course selector, profile, logout)
│   │   ├── TutorWorkspace.tsx        # Chat interface with Normal & Socratic modes
│   │   └── VideoDiscovery.tsx        # Curated YouTube lecture video library
│   ├── tests/                        # Automated unit and integration tests
│   │   ├── assessment_consistency.test.ts # Quiz scoring & grading predicate tests
│   │   ├── eduagent_logic.test.ts    # Coordinator routing & domain guard tests
│   │   ├── personalized_tutor.test.ts # Adaptive learning profile & prompt tests
│   │   └── socratic_tutor.test.ts    # 3-Tier progressive hint state machine tests
│   ├── types/                        # TypeScript type definitions
│   │   └── index.ts                  # Centralized interfaces (User, ChatMessage, Course, etc.)
│   ├── App.tsx                       # Main application state, routing, and agent wiring
│   ├── index.css                     # Global Tailwind CSS imports & custom styles
│   └── main.tsx                      # React root entry point
├── .env                              # Local environment variables (DO NOT COMMIT SECRETS)
├── .env.example                      # Environment template for new setups
├── .gitignore                        # Git exclusion rules
├── app.py                            # Streamlit prototype entry point
├── eslint.config.js                  # ESLint flat config
├── package.json                      # Node dependencies and build scripts
├── server.ts                         # Express backend: APIs, multi-key Gemini manager, Socratic engine
├── tsconfig.json                     # TypeScript compiler configuration
├── tsconfig.app.json                 # Frontend client TypeScript configuration
├── tsconfig.node.json                # Vite/Node TypeScript configuration
└── vite.config.ts                    # Vite bundler configuration
```

---

## 4. Six-Agent Architecture and Coordination Workflow

EDUAGENT implements an autonomous multi-agent architecture where individual agents are coordinated through the **Academic Coordinator**.

```
                        +----------------------------+
                        |      Student Request       |
                        +--------------+-------------+
                                       |
                                       v
                        +----------------------------+
                        |    Academic Coordinator    |
                        |   - DomainGuard Check      |
                        |   - Intent Classification  |
                        +--------------+-------------+
                                       |
         +-----------------------------+-----------------------------+
         |              |              |              |              |
         v              v              v              v              v
   +-----------+  +-----------+  +-----------+  +-----------+  +-----------+
   | Academic  |  | Academic  |  |   Video   |  | Semester  |  |Assessment |
   |   Tutor   |  | Research  |  | Discovery |  |  Planner  |  |   Agent   |
   +-----------+  +-----------+  +-----------+  +-----------+  +-----------+
         |              |              |              |              |
         +-----------------------------+-----------------------------+
                                       |
                                       v
                        +----------------------------+
                        | Unified Response Pipeline  |
                        | - Student Profile Context  |
                        | - Socratic Scaffolding     |
                        | - KaTeX Formula Rendering  |
                        +----------------------------+
```

### Agent Responsibilities & Implementation Details

#### 1. Academic Coordinator Agent
- **File:** `server.ts` (`/api/agent/coordinate`) & `agents/coordinator.py`
- **Role:** Primary orchestrator. Inspects user intent, syllabus scope, and context.
- **Domain Guard:** Validates whether the incoming query is within academic bounds. Rejects queries regarding non-educational topics with polite academic redirects.
- **Routing:** Routes requests to the appropriate specialist agent (`tutor`, `research`, `video`, `planner`, `assessment`).

#### 2. Academic Tutor Agent
- **File:** `server.ts` (`/api/agent/coordinate`, intent `'tutor'`) & `agents/tutor.py`
- **Role:** Curriculum-grounded pedagogical explanations.
- **Capabilities:**
  - Injects the active course and unit syllabus into the system prompt.
  - Generates step-by-step conceptual walkthroughs, code implementations, and KaTeX mathematical proofs.
  - Supports dual operational modes: **Normal Mode** (comprehensive answers) and **Socratic Mode** (guiding inquiries and progressive hints).

#### 3. Academic Research Agent
- **File:** `server.ts` (`/api/research/query`) & `agents/research.py`
- **Role:** Deep academic literature, authoritative textbooks, and standard research citations.
- **Capabilities:**
  - Pulls verified references (e.g., *Cormen et al. Introduction to Algorithms*, *Silberschatz Operating Systems Concepts*, *Alice & Bob Cryptographic Protocols*).
  - Generates formal IEEE/APA citations, key takeaways, and suggested reading sequences.

#### 4. Video Discovery Agent
- **File:** `server.ts` (`/api/videos/search`) & `agents/video.py`
- **Role:** Curated video lecture retrieval.
- **Capabilities:**
  - Connects to the YouTube Data API v3.
  - Scopes searches strictly to high-quality academic channels (e.g., MIT OpenCourseWare, Stanford Online, freeCodeCamp, 3Blue1Brown, CS50).
  - Falls back to verified curated offline video catalogs if the YouTube API quota is exceeded or offline.

#### 5. Semester Study Planner Agent
- **File:** `server.ts` (`/api/planner/generate`) & `agents/planner.py`
- **Role:** Adaptive revision schedules and exam preparation plans.
- **Capabilities:**
  - Analyzes days remaining until exams, weekly available study hours, and current topic mastery.
  - Formulates day-by-day study sessions balancing new concept acquisition, practice problems, and weak-topic revision.

#### 6. Assessment Agent
- **File:** `server.ts` (`/api/assessments/generate`, `/api/assessments/submit`) & `agents/assessment.py`
- **Role:** Diagnostic quiz generation, automated scoring, and diagnostic evaluation.
- **Capabilities:**
  - Generates curriculum-aligned Multiple Choice Questions (MCQs) with difficulty calibration (Easy, Medium, Hard).
  - Evaluates submissions deterministically, stores attempt history, updates topic mastery percentages, and surfaces flagged weak topics.

---

## 5. Implemented Features and Implementation Status

| Feature | Status | Primary Files | Verification |
| :--- | :--- | :--- | :--- |
| **Authentication & Role System** | Complete | `AuthModal.tsx`, `server.ts`, `users_store.json` | Student and Admin roles with credential security |
| **Public Landing Page** | Complete | `AuthModal.tsx` | 7-section responsive landing page |
| **Student Dashboard** | Complete | `StudentDashboard.tsx`, `App.tsx` | Linear-inspired UI, metrics calculated from real data |
| **Personalized AI Tutor** | Complete | `TutorWorkspace.tsx`, `server.ts` | Learning profile injection, mastery-adjusted depth |
| **Socratic Learning Mode** | Complete | `TutorWorkspace.tsx`, `SocraticHintMeter.tsx`, `server.ts` | 3-tier progressive hints, state machine |
| **3-Stage Assessment Engine** | Complete | `Assessments.tsx`, `server.ts` | Setup -> Dedicated Quiz Taking -> Results View |
| **Scoring Consistency Fix** | Complete | `Assessments.tsx`, `StudentDashboard.tsx`, `server.ts` | Incomplete/ungraded quizzes excluded from average |
| **Learning Analytics** | Complete | `LearningAnalytics.tsx` | Real mastery metrics, subject radar, progress breakdown |
| **Study Planner** | Complete | `StudyPlanner.tsx`, `server.ts` | AI-generated timetable based on remaining days & weak topics |
| **Academic Research** | Complete | `ResearchAssistant.tsx`, `server.ts` | Academic paper search, citations, and summaries |
| **Video Discovery** | Complete | `VideoDiscovery.tsx`, `server.ts` | YouTube API integration with academic channel filtering |
| **Administrator Panel** | Complete | `AdministratorPanel.tsx`, `server.ts` | Course management, student performance monitoring |
| **Course & Unit Browser** | Complete | `CourseBrowser.tsx`, `courses_store.json` | 8 CS courses, 37 units, 108 topics |
| **Multi-Key Gemini Failover**| Complete | `server.ts` | Pool rotation on HTTP 429 quota exhaustion |

---

## 6. Personalized AI Tutor Implementation

The Personalized AI Tutor modifies its teaching strategy based on each student's historical performance.

### Data Flow
1. **Performance Extraction:** When the student accesses the tutor workspace or sends a prompt, the backend (`server.ts`) queries `student_state_store.json` for that student's `assessmentHistory` and `completedTopicIds`.
2. **Student Learning Profile Assembly:**
   - Computes overall course average score and specific unit score.
   - Evaluates topic mastery: Topics scored `< 60%` are marked `NEEDS_ATTENTION`. Topics scored `>= 85%` are marked `MASTERED`.
   - Compiles a list of repeated mistake tags (e.g., `off-by-one errors`, `tree rotation imbalance`, `cache miss latency`).
3. **Prompt Scaffolding:**
   The backend injects this context into Gemini's system instructions:
   ```typescript
   // server.ts - Context Construction
   const studentProfilePrompt = `
   STUDENT LEARNING CONTEXT:
   - Student Name: ${user.name}
   - Active Course: ${course.code} - ${course.title}
   - Active Unit: Unit ${unit.number} - ${unit.title}
   - Course Mastery Level: ${masteryLevel} (Average Score: ${avgScore}%)
   - Identified Weak Topics in this Unit: ${weakTopicsList.join(', ') || 'None identified yet'}
   - Student Strength Areas: ${strengthsList.join(', ') || 'General fundamentals'}

   PEDAGOGICAL INSTRUCTIONS:
   ${isStruggling 
     ? 'The student is currently struggling in this unit. Use intuitive real-world analogies, step-by-step explanations, and simple visual descriptions before introducing formal code or mathematics.'
     : 'The student has demonstrated strong mastery. Provide deep, rigorous technical explanations, formal complexity proofs, and advanced edge cases.'}
   `;
   ```
4. **Adaptive Response Generation:** The tutor includes personalized follow-up recommendations at the end of responses, suggesting specific revision topics or practice questions based on the student's profile.

---

## 7. Socratic Learning Mode Implementation

The Socratic Learning Mode guides students to answers through structured questioning and incremental scaffolding.

### Mode Selector & State Persistence
- In `TutorWorkspace.tsx`, a toggle switch allows students to switch between **Normal Mode** (comprehensive answers) and **Socratic Mode**.
- The selected mode is stored in component state and sent with each query in the request payload (`learningMode: 'normal' | 'socratic'`).
- The conversation maintains a `socraticState` object tracking:
  - `activeProblem`: The problem or question currently being addressed.
  - `hintLevel`: Integer from `0` to `3`.
  - `hintsRevealed`: Array of revealed hint strings.
  - `isResolved`: Boolean indicating whether the student reached the solution.

### 3-Tier Progressive Hint System
| Hint Level | Pedagogical Designation | Behavior |
| :---: | :--- | :--- |
| **Level 0** | **Guiding Question** | Identifies the key concept and asks an open-ended question to stimulate thought without giving hints. |
| **Level 1** | **Conceptual Nudge** | Identifies the relevant theorem, data structure invariant, or core principle. |
| **Level 2** | **Structural / Pivot Hint** | Points out the specific pivot step, edge case, or mathematical relationship. |
| **Level 3** | **Blueprint / Skeleton** | Provides pseudocode or a structural skeleton with comments, leaving final details for the student. |
| **Reveal** | **Complete Explanation** | Unlocks the full explanation, code, and formal analysis when explicitly requested or after Hint 3. |

### Visual Hint Meter (`SocraticHintMeter.tsx`)
A 3-step progress bar visualizes hint progression. Students can click **"Request Next Hint"** or **"Reveal Full Solution"** at any point.

---

## 8. Assessment Generation, Evaluation and Scoring Logic

### Dedicated 3-Stage Quiz Lifecycle
In `Assessments.tsx`, the assessment interface is split into three distinct views:
1. `quizStage = 'setup'`: Allows configuring subject, unit, difficulty, and question count. Shows past assessment records and weak-topic cards. The quiz form is not rendered below this.
2. `quizStage = 'taking'`: Replaces the setup view with a focused, full-screen quiz interface featuring:
   - Topic and unit badges.
   - Question navigation palette (`1` to `N` pills with answered/unanswered states).
   - Single-question card with radio options.
   - Optional Socratic hint toggle per question.
   - Navigation controls (Previous, Next, Submit Assessment).
   - Safety modal confirming intentional exit to prevent accidental loss of progress.
3. `quizStage = 'results'`: Replaces the quiz-taking view with an evaluation summary:
   - Score percentage banner with pass/mastery indicators.
   - Detailed breakdown of each question (student's selection, correct answer, and explanation).
   - Option to practice missed concepts in Socratic Mode.

### Scoring Calculation & Consistency Rules
To prevent historical score display errors:
```typescript
// Assessment Scoring Predicate
export const isQuizGraded = (quiz: AssessmentResult): boolean => {
  return (
    quiz !== null &&
    quiz !== undefined &&
    typeof quiz.score === 'number' &&
    !isNaN(quiz.score) &&
    quiz.totalQuestions > 0 &&
    (quiz.status === 'completed' || quiz.status === 'graded' || quiz.status === undefined)
  );
};

// Average Score Calculation
export const calculateAssessmentAverage = (history: AssessmentResult[]): number => {
  const gradedQuizzes = history.filter(isQuizGraded);
  if (gradedQuizzes.length === 0) return 0;
  
  const totalPercentage = gradedQuizzes.reduce((sum, q) => {
    // Normalizes score whether stored as raw correct count or percentage
    const percentage = q.score <= q.totalQuestions && q.totalQuestions > 0
      ? (q.score / q.totalQuestions) * 100
      : q.score;
    return sum + percentage;
  }, 0);
  
  return Math.round(totalPercentage / gradedQuizzes.length);
};
```
- **Zero-History Guard:** When no graded quizzes exist, the UI renders `—` (em-dash) and `"No Quizzes Evaluated"` instead of `0%` or mock data.

---

## 9. Weak-Topic Detection and Learning Analytics

### Detection Algorithm (`server.ts` & `LearningAnalytics.tsx`)
1. **Aggregated Topic Frequency:** The system scans all graded quizzes for a student.
2. For each question answered incorrectly:
   - Increments `incorrectCount` for the question's `topicId` or `topicName`.
   - Records the error category (e.g., `Syntax`, `Conceptual`, `Asymptotic Calculation`).
3. For each question answered correctly:
   - Increments `correctCount`.
4. **Weak-Topic Classification:**
   - A topic is classified as a **Weak Topic** if:
     $$\text{Mastery Rate} = \frac{\text{Correct Answers}}{\text{Total Questions on Topic}} < 0.60$$
     and total attempts $\ge 2$.
   - A topic is classified as **Mastered** if $\text{Mastery Rate} \ge 0.85$.
5. **Real-Time Remediation Integration:**
   - Weak topics are displayed in `StudentDashboard.tsx`, `Assessments.tsx`, and `StudyPlanner.tsx`.
   - Clicking **"Practice with AI Tutor"** on a weak topic navigates to `TutorWorkspace.tsx` and automatically pre-fills a prompt focused on that topic.

---

## 10. Student Authentication and Data Persistence

### Security & Privacy Rules
- **Public Credential Redaction:** No demo credentials, hardcoded passwords, or administrator default keys are exposed in the landing page or login dialogs.
- **Role Isolation:**
  - `student`: Access to personal dashboard, AI tutor, assessments, planner, research, and video library.
  - `admin`: Access to curriculum authoring, student performance overview, and course management (`AdministratorPanel.tsx`).

### Persistence Architecture
EDUAGENT stores state in structured JSON files in the `database/` folder:
- `users_store.json`: User credentials, roles, registered dates, and profile metadata.
- `courses_store.json`: Courses, semester levels, units, topics, and syllabus definitions.
- `student_state_store.json`: Student progress organized by `studentId`:
  - `completedTopicIds`: Array of finished topic ID strings.
  - `assessmentHistory`: Array of `AssessmentResult` objects.
  - `chatHistory`: Conversation threads keyed by `studentId:courseCode:unitId`.
  - `studyPlans`: Saved revision timetables.

---

## 11. Database Structure and Important JSON Files

### 1. `database/courses_store.json`
Structure of curriculum records:
```json
[
  {
    "id": "course-cs201",
    "code": "CS201",
    "title": "Data Structures and Algorithms",
    "semester": 2,
    "description": "Fundamental data structures, algorithmic complexity, sorting, graphs, and dynamic programming.",
    "units": [
      {
        "id": "cs201-u1",
        "number": 1,
        "title": "Asymptotic Analysis & Linear Structures",
        "topics": [
          { "id": "cs201-u1-t1", "title": "Big-O, Omega, and Theta Notations", "difficulty": "Easy" },
          { "id": "cs201-u1-t2", "title": "Dynamic Arrays & Amortized Analysis", "difficulty": "Medium" }
        ]
      }
    ]
  }
]
```

### 2. `database/student_state_store.json`
Structure of student state:
```json
{
  "students": {
    "student-1": {
      "completedTopicIds": ["cs201-u1-t1", "cs201-u1-t2"],
      "assessmentHistory": [
        {
          "id": "quiz-1710000000000",
          "courseCode": "CS201",
          "unitId": "cs201-u1",
          "unitTitle": "Asymptotic Analysis & Linear Structures",
          "score": 4,
          "totalQuestions": 5,
          "percentage": 80,
          "status": "completed",
          "submittedAt": "2026-11-05T14:30:00.000Z",
          "details": []
        }
      ],
      "chatHistory": {
        "student-1:CS201:cs201-u1": [
          {
            "id": "msg-1",
            "sender": "student",
            "content": "Explain AVL tree balance factors.",
            "timestamp": "2026-11-05T15:00:00.000Z"
          }
        ]
      },
      "studyPlans": []
    }
  }
}
```

---

## 12. Important Backend API Endpoints

The Express server runs from `server.ts` on port 3000 (proxied via Vite during development).

### Authentication
- `POST /api/auth/login`: Authenticates student or admin. Returns user session profile.
- `POST /api/auth/register`: Creates a new student record in `users_store.json`.
- `GET /api/auth/me`: Validates existing session.

### Agent Coordination & Tutoring
- `POST /api/agent/coordinate`: Main multi-agent entry point. Accepts `{ studentId, query, courseCode, unitId, learningMode, socraticState }`. Routes to appropriate agent and returns formatted responses with KaTeX support.
- `GET /api/tutor/history`: Retrieves chat history for a specific student, course, and unit.
- `DELETE /api/tutor/history`: Clears active chat history for a unit.

### Assessments
- `POST /api/assessments/generate`: Generates an assessment using Gemini with prompt constraints. Returns questions, options, difficulty ratings, and hints.
- `POST /api/assessments/submit`: Accepts student answers, computes scores, stores results in `student_state_store.json`, and updates weak-topic profiles.
- `GET /api/assessments/history/:studentId`: Returns assessment attempts for a student.

### Research, Videos & Planning
- `POST /api/research/query`: Generates textbook references and academic citations.
- `POST /api/videos/search`: Queries YouTube Data API v3 or returns curated fallback lecture videos.
- `POST /api/planner/generate`: Generates an adaptive study timetable based on syllabus requirements and upcoming exam dates.

---

## 13. Gemini API and YouTube API Integration Details

### Gemini Multi-Key Failover Pool (`server.ts`)
To handle API rate limits (HTTP 429) during intensive tutoring sessions, `server.ts` implements a multi-key failover manager:
```typescript
// server.ts - Key Pool Manager
const geminiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_BACKUP,
  process.env.GEMINI_API_KEY_BACKUP2
].filter(Boolean) as string[];

let currentKeyIndex = 0;

export async function callGeminiWithFailover(prompt: string, systemInstruction?: string) {
  let attempts = 0;
  while (attempts < geminiKeys.length) {
    const activeKey = geminiKeys[currentKeyIndex];
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text;
    } catch (err: any) {
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`[Gemini Pool] Key index ${currentKeyIndex} exhausted. Rotating to next key...`);
        currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
        attempts++;
      } else {
        throw err;
      }
    }
  }
  throw new Error('All Gemini API keys in the rotation pool have been exhausted.');
}
```

### Supported Models
- Primary Model: `gemini-2.5-flash` (balanced latency and reasoning capacity).
- Fallback Model: `gemini-1.5-pro` (for complex proof derivations and study planning).

### YouTube Data API v3
- Key configuration: `YOUTUBE_API_KEY` in `.env`.
- Query constraints: Appends channel restrictions (e.g., `MIT OpenCourseWare`, `Stanford`, `NPTEL`) to prevent low-quality video recommendations.

---

## 14. Frontend Architecture, Routing and UI Components

The application is structured as a single-page application (SPA) in React 19, with views toggled based on the active navigation item:

```
src/App.tsx (Root Controller)
├── TopBar.tsx (Course/Unit Selector, Profile Dropdown, Mode Indicators)
├── Navigation.tsx (Sidebar navigation: Dashboard, Tutor, Assessments, Analytics, Planner, Research, Videos)
└── Main Content Container
    ├── StudentDashboard.tsx   (Active when view === 'dashboard')
    ├── TutorWorkspace.tsx     (Active when view === 'tutor')
    │   └── SocraticHintMeter.tsx
    ├── Assessments.tsx        (Active when view === 'assessments')
    │   ├── Setup Stage
    │   ├── Quiz Taking Stage
    │   └── Results Stage
    ├── LearningAnalytics.tsx  (Active when view === 'analytics')
    ├── StudyPlanner.tsx       (Active when view === 'planner')
    ├── ResearchAssistant.tsx  (Active when view === 'research')
    ├── VideoDiscovery.tsx     (Active when view === 'videos')
    ├── CourseBrowser.tsx      (Active when view === 'courses')
    └── AdministratorPanel.tsx (Active when view === 'admin')
```

---

## 15. UI/UX Design System and Styling Guidelines

The UI uses a design system inspired by modern productivity and learning platforms (e.g., Linear, Coursera, Brilliant).

### Color Palette
- **Primary:** Deep Academic Blue (`#2563EB`, `bg-blue-600`)
- **Secondary / Accent:** Teal (`#0D9488`, `text-teal-600`) & Amber Warmth (`#F59E0B`, `bg-amber-500`)
- **Neutral Dark:** Slate/Navy (`#0F172A`, `#1E293B`)
- **Neutral Light:** Off-white canvas (`#F8FAFC`, `bg-slate-50`)
- **Surface Cards:** Pure White (`#FFFFFF`, `bg-white`, `border-slate-200`)

### Layout Rules
- **Typography:** Clean sans-serif hierarchy (`Inter`, `system-ui`) with monospace fonts reserved for code blocks.
- **Card Styling:** `rounded-xl`, `border border-slate-200`, subtle elevation with `shadow-sm`, avoiding heavy drop shadows.
- **Formula Presentation:** KaTeX inline math (`$...$`) and block math (`$$...$$`) styled with proper spacing to prevent layout shifts.

---

## 16. Known Issues, Limitations and Resolved Bugs

### Resolved Bugs
1. **Assessment Average Inconsistency (Resolved):**
   - *Issue:* Dashboard showed 0% average despite completed quizzes.
   - *Fix:* Standardized `isQuizGraded()` predicate across `Assessments.tsx`, `StudentDashboard.tsx`, and `LearningAnalytics.tsx`. Raw marks are normalized against total question counts.
2. **Public Credential Leakage (Resolved):**
   - *Issue:* Hardcoded admin credentials displayed on the public landing screen.
   - *Fix:* Removed hints from `AuthModal.tsx` while preserving form functionality.
3. **Quiz Long-Scroll Clutter (Resolved):**
   - *Issue:* Generated quizzes appeared below the setup form, requiring excessive vertical scrolling.
   - *Fix:* Replaced with a 3-stage full-screen view (`setup`, `taking`, `results`).
4. **Tutor Chat Horizontal Balance (Resolved):**
   - *Issue:* Empty right-hand panel caused layout asymmetry in the chat interface.
   - *Fix:* Removed unused panel and centered conversation within an expanded `max-w-4xl` readable column.

### Current Limitations
- **Multi-device Sync:** Data persistence uses local JSON stores on disk. Moving across devices requires migrating the `database/*.json` files.
- **Local Sandbox Networking:** Local server ports started inside sandboxed CLI sessions cannot be accessed directly by external browsers unless launched with appropriate host-binding options.

---

## 17. Automated Tests and Test Coverage

EDUAGENT includes automated unit test suites built on the Node.js native test runner and executed with `tsx`:
- Run individual suites:
  - `npx tsx src/tests/assessment_consistency.test.ts`
  - `npx tsx src/tests/eduagent_logic.test.ts`
  - `npx tsx src/tests/personalized_tutor.test.ts`
  - `npx tsx src/tests/socratic_tutor.test.ts`
- Current status: **4 test suites passing, 36 total tests passing (0 failures)**.

### Test Suites
1. **`src/tests/assessment_consistency.test.ts`**
   - Verifies `isQuizGraded` filtering logic.
   - Tests score calculation and percentage normalization.
   - Tests zero-history edge cases.
2. **`src/tests/eduagent_logic.test.ts`**
   - Tests `DomainGuard` out-of-scope query rejection.
   - Tests Academic Coordinator routing logic.
3. **`src/tests/personalized_tutor.test.ts`**
   - Tests student learning profile construction.
   - Tests weak-topic detection criteria.
4. **`src/tests/socratic_tutor.test.ts`**
   - Tests 3-tier progressive hint state machine.
   - Tests hint reveal order and terminal solution unlocking.

---

## 18. Environment Variables and Configuration

Create a `.env` file in the project root:

```ini
# Server Port Configuration
PORT=3000

# Google Gemini API Keys (Failover Rotation Pool)
GEMINI_API_KEY=your_primary_gemini_api_key_here
GEMINI_API_KEY_BACKUP=your_secondary_gemini_api_key_here
GEMINI_API_KEY_BACKUP2=your_tertiary_gemini_api_key_here

# YouTube Data API v3 Key
YOUTUBE_API_KEY=your_youtube_api_key_here

# Environment Flag
NODE_ENV=development
```

---

## 19. How to Set Up and Run the Project Locally

### Prerequisites
- Node.js version `20.x` or later (tested on Node.js v24).
- `npm` package manager.
- Git.

### Installation Steps
```bash
# 1. Clone or copy project repository to target machine
cd "path/to/eduagent"

# 2. Install all dependencies
npm install

# 3. Create environment configuration
cp .env.example .env
# Open .env and add your valid GEMINI_API_KEY

# 4. Verify code cleanliness and type integrity
npm run lint
npm run build
npx tsx src/tests/assessment_consistency.test.ts

# 5. Start the full-stack development server
npm run dev
```

### Accessing the Platform
- Open your browser and navigate to: `http://localhost:3000`
- Click **"Sign In"** or register a new student account to access the workspace.

---

## 20. Recommended Next Steps for Development

1. **Persistent Relational Database Migration:** Migrate `database/*.json` stores to PostgreSQL or SQLite via Prisma/Drizzle ORM for higher concurrency and ACID guarantees.
2. **Streaming AI Responses (SSE):** Implement Server-Sent Events (SSE) for the Academic Tutor to stream tokens in real-time, reducing perceived latency.
3. **Direct PDF / Slide Ingestion (RAG):** Enable students to upload specific university lecture slides or syllabi, using vector embeddings (e.g., ChromaDB, pgvector) for retrieval-augmented generation.
4. **Voice / Speech Interface:** Integrate the Gemini Live API / Web Speech API for interactive spoken Socratic dialogues.

---

## 21. Deployment Recommendations

### Production Containerization (Docker)
Create a standard multi-stage `Dockerfile`:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/database ./database
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
```

### Production Hosting Platforms
- **Frontend & API:** Deployable to Railway, Render, Fly.io, or AWS ECS as a unified containerized service.
- **CORS & Proxying:** Ensure the client bundle is served from the same origin or configure CORS headers appropriately in `server.ts`.

---

## 22. Instructions Specifically for the New Antigravity Instance

When resuming development of EDUAGENT on a new Antigravity instance:

1. **Environment Initialization:**
   - Run `npm run lint` and `npm run build` to verify that the TypeScript compiler and Vite bundling succeed without errors.
   - Run `npx tsx src/tests/assessment_consistency.test.ts` (and the other test suites in `src/tests/`) to verify that the test runner passes without issues.
2. **Reviewing Code Changes:**
   - Keep data transformations pure and ensure `isQuizGraded()` is respected whenever updating assessment and dashboard calculations.
   - Verify that UI updates in `TutorWorkspace.tsx` preserve both Normal and Socratic learning modes.
   - Ensure `server.ts` routes maintain proper error handling for the Gemini API key rotation pool.
3. **Preserving Design Continuity:**
   - Maintain the Linear/Coursera-inspired aesthetic (rounded-xl cards, subtle slate borders, clean iconography from Lucide).
   - Ensure all mathematical outputs continue to use KaTeX rendering (`$...$` for inline, `$$...$$` for display blocks).

---

*Document compiled and verified for the EDUAGENT Platform repository.*
