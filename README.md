# EDUAGENT — Autonomous Multi-Agent AI Ecosystem for Education and Personalised Learning

EDUAGENT is a production-grade, syllabus-grounded academic ecosystem powered by autonomous multi-agent orchestration. It is engineered specifically for university and higher education settings to eliminate generic AI hallucinations and enforce curriculum-aligned tutoring, textbook discovery, video curation, dynamic semester planning, and adaptive diagnostic assessment.

---

## 1. Multi-Agent Architecture

EDUAGENT implements an explicit multi-agent coordination pipeline consisting of 5 specialized agents and 1 central orchestrator:

1. **Academic Coordinator Agent (Agent 6 — Central Orchestrator)**:
   - Evaluates student input, verifies academic relevance, checks active syllabus bounds, selects the appropriate specialist agent, and synthesizes the final response.
   - Outputs a transparent step-by-step execution trace:
     `Analysing Student Request` → `Checking Academic Syllabus` → `Selecting Specialised Agent` → `Executing Agentic Task` → `Validating Results` → `Delivering Final Response`.

2. **Academic Tutor Agent (Agent 1)**:
   - Provides concept explanations, algorithm breakdowns, step-by-step math derivations, and memory diagrams.
   - Enforces the strict educational restriction boundary: strictly refuses non-academic inquiries with the exact required mandate:
     *"I am EDUAGENT, an academic learning assistant. I can only assist with educational subjects, syllabus-related questions and learning activities. Please start a new academic conversation with a relevant educational question."*

3. **Academic Research Agent (Agent 2)**:
   - Autonomous academic literature and textbook researcher.
   - Distinguishes between legal, open-access PDFs (e.g. Open Data Structures, INRIA, OpenStax) and commercial publisher references (e.g. MIT Press, McGraw Hill). Strictly adheres to copyright law.

4. **Video Discovery Agent (Agent 3)**:
   - Curates syllabus-aligned video lectures and playlists from world-class universities and platforms (MIT OpenCourseWare, Stanford, NPTEL, Abdul Bari, freeCodeCamp).
   - Supplies verified thumbnail previews, channel attribution, duration, and direct links.

5. **Semester Study Planner Agent (Agent 4)**:
   - Takes courses, units, exam dates, daily available hours, and student strengths/weaknesses.
   - Assigns difficulty weights, partitions the timeline (Study Days, Weekly Consolidation, Adaptive Buffer Days, Mock Tests), and dynamically reschedules missed sessions.

6. **Academic Assessment Agent (Agent 5)**:
   - Generates syllabus-anchored multiple choice quizzes.
   - Performs automatic grading, computes percentage scores, identifies weak syllabus topics, and recommends targeted remediation.

---

## 2. Intelligent 3-Key Gemini Flash API Manager

EDUAGENT incorporates a resilient API key rotation manager designed for enterprise-grade uptime:
- Loads up to 3 keys: `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` (with fallback to `GEMINI_API_KEY`).
- Performs round-robin rotation across active keys.
- On HTTP 429 (Rate Limit) or Quota exhaustion, immediately fails over to the next healthy key with exponential backoff.
- Maintains a cooldown health monitor.
- Logs errors without leaking sensitive credentials.
- Masks key strings in UI displays (`Key-1 (..4a2f)`).

---

## 3. Project Directory Structure

```text
EDUAGENT/
├── app.py                      # Main Streamlit Application
├── config/
│   └── settings.py             # Global settings, paths, models, and secrets
├── core/
│   ├── agent_base.py           # BaseAgent class with execution step recording
│   ├── api_manager.py          # Intelligent 3-Key Gemini rotation & failover
│   ├── coordinator.py          # Central Academic Coordinator Agent
│   ├── domain_guard.py         # Multi-layer educational security filter
│   └── security.py             # PBKDF2 password hashing & authentication
├── agents/
│   ├── academic_tutor.py       # Agent 1: Syllabus-grounded tutoring
│   ├── research_agent.py       # Agent 2: Legal textbook discovery
│   ├── video_agent.py          # Agent 3: University video curation
│   ├── study_planner.py        # Agent 4: Autonomous semester scheduling
│   └── assessment_agent.py     # Agent 5: Diagnostic quiz & gap analysis
├── services/
│   ├── document_service.py     # PDF upload, PyMuPDF extraction & chunking
│   ├── retrieval_service.py    # Local keyword/TF-IDF chunk retrieval
│   ├── study_service.py        # Topic progress & assessment persistence
│   ├── syllabus_service.py     # Course, unit, and topic CRUD
│   ├── web_research.py         # Open educational resource lookup
│   └── youtube_service.py      # Video lecture discovery
├── database/
│   ├── db.py                   # SQLite connection & database seeding
│   ├── models.py               # Data definitions
│   └── schema.sql              # 15-table SQLite relational schema
├── ui/
│   ├── admin_dashboard.py
│   ├── authentication.py
│   ├── components.py           # Headers and Agent Trace visualizer
│   ├── student_dashboard.py
│   ├── tutor_interface.py
│   ├── resource_library.py
│   ├── video_library.py
│   ├── planner_interface.py
│   └── assessment_interface.py
├── utils/
│   ├── helpers.py
│   ├── pdf_processor.py
│   └── validators.py
├── storage/
│   ├── documents/
│   └── uploads/
├── .env.example
├── requirements.txt
└── README.md
```

---

## 4. Installation & Windows Setup Instructions

### Prerequisites
- Python 3.11 or higher
- Git

### Step 1: Clone the repository
```bash
git clone <repository-url>
cd EDUAGENT
```

### Step 2: Create and Activate Virtual Environment (Windows)
```cmd
python -m venv venv
venv\Scripts\activate
```
*(On macOS/Linux: `source venv/bin/activate`)*

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```
Edit `.env` to configure your Gemini API keys:
```env
GEMINI_API_KEY_1="your-first-gemini-flash-key"
GEMINI_API_KEY_2="your-second-gemini-flash-key"
GEMINI_API_KEY_3="your-third-gemini-flash-key"
ADMIN_PASSWORD="118b"
```

### Step 5: Initialize the Database
```bash
python database/db.py
```

### Step 6: Launch EDUAGENT
```bash
streamlit run app.py
```
The application will launch in your browser at `http://localhost:8501`.

---

## 5. Demonstration Workflow & Credentials

### Administrator Access
1. Select **Administrator Portal** on the login screen.
2. Enter demonstration password: `118b`.
3. Configure curriculum: Add new courses, units, syllabus topics, and reference books.
4. Upload lecture notes or past papers (PDF) to build the local retrieval index.
5. Review the **API Key Monitor** to inspect pool status and failovers.

### Student Access
1. Select **Student Access** and log in with default credentials:
   - **Email:** `student@eduagent.ac`
   - **Password:** `student123`
   *(Or click 'Register' to create a new account).*
2. **AI Academic Tutor**: Ask a question (e.g., *"Explain linked lists vs arrays"*). Watch the live Multi-Agent Orchestration Trace execute.
3. **Domain Guard Test**: Ask an unrelated question (e.g., *"Who won the World Cup?"*). Notice the strict refusal preserving academic integrity.
4. **Book Library**: View verified open-access textbooks vs commercial reference books.
5. **Video Learning**: Watch syllabus-aligned lectures from MIT and Stanford.
6. **Semester Planner**: Customize study hours and target exam dates to generate a day-by-day roadmap with revision and buffer days.
7. **Assessments**: Take a unit quiz, view instant scoring, and identify knowledge gaps.

---

## 6. Verification and Testing Results

- **TEST 1 (Admin Login)**: Verified login with password `118b`.
- **TEST 2 (Course Creation)**: Verified CRUD operations on CS201 and CS202.
- **TEST 3 (Syllabus Structure)**: Verified 5 units and detailed topics per unit.
- **TEST 4 (Student Auth)**: Verified PBKDF2 password verification and isolated storage.
- **TEST 5 (Academic Tutor)**: Verified syllabus grounding and step-by-step pedagogical outputs.
- **TEST 6 (Domain Guard)**: Verified rejection of entertainment queries and prompt leak attempts.
- **TEST 7 (Research Agent)**: Verified open-access PDF flagging vs official publisher citations.
- **TEST 8 (Video Agent)**: Verified MIT OCW, NPTEL, and Abdul Bari lecture mappings.
- **TEST 9 (Semester Planner)**: Verified difficulty weights, buffer day distribution, and rescheduling.
- **TEST 10 (Assessment Agent)**: Verified diagnostic scoring and remediation prescriptions.
- **TEST 11 (API Key Manager)**: Verified round-robin rotation and failover on rate limits.

---

## 7. Known Limitations
- YouTube Data API v3 requires an active Google Cloud key for dynamic live search; a rich curated university lecture fallback is active by default.
- PyMuPDF text extraction is optimized for text-based PDFs; scanned image-only PDFs require OCR preprocessing.
