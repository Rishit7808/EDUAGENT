"""
EDUAGENT - Autonomous Intelligence for Education and Learning
Main Application Entry Point (Streamlit UI)
"""
import streamlit as st
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database.db import init_db
from config.settings import ADMIN_PASSWORD, APP_NAME, APP_TAGLINE
from core.coordinator import coordinator_agent
from core.api_manager import gemini_manager
from core.security import hash_password, verify_password, verify_admin_password
from services.syllabus_service import SyllabusService
from services.document_service import DocumentService
from services.study_service import StudyService
from ui.components import render_header, render_agent_trace

# Page configuration
st.set_page_config(
    page_title="EDUAGENT - Multi-Agent Academic Platform",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize database schema and default courses on start
init_db()

# Session State Initialization
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "user_role" not in st.session_state:
    st.session_state.user_role = None
if "user_info" not in st.session_state:
    st.session_state.user_info = {}
if "selected_course_id" not in st.session_state:
    courses = SyllabusService.get_all_courses()
    st.session_state.selected_course_id = courses[0]["id"] if courses else ""
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# --- AUTHENTICATION SCREEN ---
if not st.session_state.authenticated:
    st.markdown(
        """
        <style>
        .auth-container {
            max-width: 480px;
            margin: 4rem auto;
            background: #0f172a;
            padding: 2.5rem;
            border-radius: 12px;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    st.markdown(
        f"""
        <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #6366f1; font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin: 0;">EDUAGENT</h1>
            <p style="color: #94a3b8; font-size: 1rem; margin-top: 0.5rem;">{APP_TAGLINE}</p>
        </div>
        """,
        unsafe_allow_html=True
    )

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        auth_mode = st.radio("Select Portal Access Mode", ["Student Access", "Administrator Portal"], horizontal=True)

        if auth_mode == "Administrator Portal":
            st.info("Demonstration Administrator Password: **118b**")
            with st.form("admin_login_form"):
                admin_pwd = st.text_input("Administrator Security Password", type="password")
                submit_admin = st.form_submit_button("Authenticate Administrator", use_container_width=True)

                if submit_admin:
                    if verify_admin_password(admin_pwd, ADMIN_PASSWORD):
                        st.session_state.authenticated = True
                        st.session_state.user_role = "admin"
                        st.session_state.user_info = {
                            "id": "admin-1",
                            "name": "Academic Administrator",
                            "role": "admin"
                        }
                        st.success("Authenticated as Administrator.")
                        st.rerun()
                    else:
                        st.error("Invalid administrator password. Please enter '118b'.")

        else:
            student_tab = st.tabs(["Student Login", "Register New Student Account"])
            with student_tab[0]:
                with st.form("student_login_form"):
                    email = st.text_input("Academic Email", value="student@eduagent.ac")
                    password = st.text_input("Password", type="password", value="student123")
                    submit_student = st.form_submit_button("Sign In to Student Workspace", use_container_width=True)

                    if submit_student:
                        st.session_state.authenticated = True
                        st.session_state.user_role = "student"
                        st.session_state.user_info = {
                            "id": "student-1",
                            "email": email,
                            "name": "Alex Morgan",
                            "role": "student",
                            "semester": "Semester III"
                        }
                        st.success("Welcome to EDUAGENT.")
                        st.rerun()

            with student_tab[1]:
                with st.form("student_reg_form"):
                    reg_name = st.text_input("Full Name")
                    reg_email = st.text_input("Academic Email")
                    reg_pass = st.text_input("Create Password", type="password")
                    reg_sem = st.selectbox("Current Semester", ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI", "Semester VII", "Semester VIII"])
                    submit_reg = st.form_submit_button("Create Account", use_container_width=True)
                    if submit_reg and reg_name and reg_email and reg_pass:
                        st.session_state.authenticated = True
                        st.session_state.user_role = "student"
                        st.session_state.user_info = {
                            "id": f"student-{hash(reg_email)%10000}",
                            "email": reg_email,
                            "name": reg_name,
                            "role": "student",
                            "semester": reg_sem
                        }
                        st.success("Account created successfully.")
                        st.rerun()

    st.stop()

# --- AUTHENTICATED APPLICATION INTERFACE ---
courses = SyllabusService.get_all_courses()
active_course = next((c for c in courses if c["id"] == st.session_state.selected_course_id), courses[0] if courses else None)

# --- SIDEBAR NAVIGATION ---
with st.sidebar:
    st.markdown(f"### 🎓 EDUAGENT")
    st.caption(f"Role: **{st.session_state.user_role.upper()}** | User: {st.session_state.user_info.get('name', 'User')}")

    if st.button("Log Out", use_container_width=True):
        st.session_state.authenticated = False
        st.session_state.user_role = None
        st.rerun()

    st.divider()

    # Active Course Selector for contextual agents
    if courses:
        course_names = {c["id"]: f"{c['code']} - {c['name']}" for c in courses}
        st.session_state.selected_course_id = st.selectbox(
            "Active Academic Course",
            options=list(course_names.keys()),
            format_func=lambda x: course_names.get(x, x),
            index=list(course_names.keys()).index(st.session_state.selected_course_id) if st.session_state.selected_course_id in course_names else 0
        )
        active_course = next((c for c in courses if c["id"] == st.session_state.selected_course_id), None)

    st.divider()

    if st.session_state.user_role == "admin":
        nav_section = st.radio(
            "Administrator Menu",
            ["Course Configuration", "Academic Materials", "Knowledge Boundary Control", "API Key Monitor"]
        )
    else:
        nav_section = st.radio(
            "Student Workspace",
            [
                "Dashboard",
                "My Courses",
                "AI Academic Tutor",
                "Book Library",
                "Video Learning",
                "Semester Planner",
                "Assessments",
                "Learning Progress",
                "Settings"
            ]
        )

# --- ADMINISTRATOR DASHBOARD VIEW ---
if st.session_state.user_role == "admin":
    if nav_section == "Course Configuration":
        render_header("Course & Syllabus Configuration", "Define academic boundaries, units, topics, and reference books", "Administrator")
        
        tab1, tab2 = st.tabs(["Existing Academic Courses", "Add New Course"])

        with tab1:
            for c in courses:
                with st.expander(f"📚 {c['code']} - {c['name']} ({c['semester']})", expanded=False):
                    st.write(f"**Description:** {c.get('description', '')}")
                    if c.get("reference_books"):
                        st.write("**Reference Books:**")
                        for b in c["reference_books"]:
                            st.markdown(f"- {b}")

                    st.markdown("#### Units and Syllabus Topics")
                    for u in c.get("units", []):
                        st.markdown(f"**Unit {u['unit_number']}: {u['title']}**")
                        st.caption(u.get("description", ""))
                        for t in u.get("topics", []):
                            diff_badge = f"`{t['difficulty']}`"
                            st.markdown(f"  • {t['title']} {diff_badge} - Est. {t['estimated_hours']} hrs")

                    col_del, _ = st.columns([1, 4])
                    with col_del:
                        if st.button(f"Delete Course {c['code']}", key=f"del_{c['id']}"):
                            SyllabusService.delete_course(c["id"])
                            st.success(f"Course {c['code']} removed.")
                            st.rerun()

        with tab2:
            st.markdown("#### Create New Curriculum Course")
            with st.form("new_course_form"):
                c_code = st.text_input("Course Code (e.g. CS301)")
                c_name = st.text_input("Course Name (e.g. Operating Systems)")
                c_sem = st.selectbox("Semester", ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI", "Semester VII", "Semester VIII"], index=2)
                c_desc = st.text_area("Course Description & Learning Objectives")
                c_books = st.text_area("Reference Books (one per line)", value="Operating System Concepts by Silberschatz\nModern Operating Systems by Tanenbaum")
                
                submitted = st.form_submit_button("Save Course Curriculum", use_container_width=True)
                if submitted and c_code and c_name:
                    book_list = [b.strip() for b in c_books.split("\n") if b.strip()]
                    new_id = SyllabusService.create_course(c_code, c_name, c_sem, c_desc, book_list)
                    # Add default unit
                    u_id = SyllabusService.add_unit(new_id, 1, "Introduction and Core Architecture", "Fundamental concepts, processes and system calls.")
                    SyllabusService.add_topic(u_id, "System Architecture & Kernel Models", "Easy", 2.0)
                    SyllabusService.add_topic(u_id, "Process Management and Context Switching", "Hard", 3.0)
                    st.success(f"Course {c_code} created successfully.")
                    st.rerun()

    elif nav_section == "Academic Materials":
        render_header("Academic Material Management", "Upload lecture notes, textbooks, and past papers to index local retrieval chunks", "Administrator")
        
        st.write(f"Uploading academic materials for **{active_course['code'] if active_course else 'Selected Course'}**")
        uploaded_file = st.file_uploader("Upload Academic PDF or Reference Document", type=["pdf", "txt"])
        doc_type = st.selectbox("Material Classification", ["lecture_notes", "textbook", "syllabus", "question_paper", "reference"])
        
        if uploaded_file and active_course:
            if st.button("Extract and Index Content into Local Vector Store", use_container_width=True):
                bytes_data = uploaded_file.read()
                doc_id = DocumentService.save_and_index_document(
                    course_id=active_course["id"],
                    filename=uploaded_file.name,
                    doc_type=doc_type,
                    file_bytes=bytes_data
                )
                st.success(f"Document '{uploaded_file.name}' parsed, chunked, and associated with {active_course['code']}.")

        st.markdown("#### Indexed Academic Documents")
        if active_course:
            docs = DocumentService.get_documents_by_course(active_course["id"])
            if docs:
                for d in docs:
                    st.markdown(f"- 📄 **{d['filename']}** (`{d['doc_type']}`) - Uploaded {d['uploaded_at']}")
            else:
                st.info("No documents uploaded yet for this course. Default syllabus definitions are active.")

    elif nav_section == "API Key Monitor":
        render_header("Intelligent 3-Key API Manager", "Monitor key rotation, failovers, and quota health status", "Administrator")
        status = gemini_manager.get_status_summary()
        col1, col2, col3 = st.columns(3)
        col1.metric("Configured API Keys", status["configured_count"])
        col2.metric("Total Failovers", status["total_failovers"])
        col3.metric("Active Model", status["model"])

        st.markdown("#### Key Pool Health Status")
        for k in status.get("keys_status", []):
            st.markdown(f"**{k['masked_id']}**: {'🟢 Healthy' if k['is_healthy'] else '🔴 Cooldown'} (Calls: {k['total_calls']}, Failures: {k['consecutive_failures']})")

    st.stop()

# --- STUDENT WORKSPACE VIEWS ---
if nav_section == "Dashboard":
    render_header("Student Academic Dashboard", "Overview of your syllabus progress, courses, and recommended tasks", "Student")
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Enrolled Courses", len(courses))
    total_units = sum(len(c.get("units", [])) for c in courses)
    col2.metric("Syllabus Units", total_units)
    prog = StudyService.get_student_progress(st.session_state.user_info.get("id", "student-1"), active_course["id"] if active_course else "")
    col3.metric("Topics Completed", f"{prog['completed_count']} / {prog['total_topics']}")
    col4.metric("Course Mastery", f"{prog['completion_percentage']}%")

    st.markdown("#### Quick Learning Actions")
    qa_col1, qa_col2, qa_col3 = st.columns(3)
    with qa_col1:
        st.markdown("##### 💬 AI Academic Tutor")
        st.caption("Ask questions strictly grounded in your official course syllabus.")
    with qa_col2:
        st.markdown("##### 📚 Book Library")
        st.caption("Browse open-access textbooks and official publisher references.")
    with qa_col3:
        st.markdown("##### 📅 Semester Planner")
        st.caption("View and adjust your personalized study schedule.")

elif nav_section == "My Courses":
    render_header("Curriculum & Syllabus Structure", f"Detailed unit breakdown for {active_course['name'] if active_course else ''}", "Student")
    if active_course:
        st.write(f"**Course Code:** `{active_course['code']}` | **Semester:** {active_course['semester']}")
        st.markdown(f"**Description:** {active_course.get('description', '')}")

        st.markdown("### Units and Syllabus Topics")
        for u in active_course.get("units", []):
            with st.expander(f"Unit {u['unit_number']}: {u['title']}", expanded=True):
                st.caption(u.get("description", ""))
                for t in u.get("topics", []):
                    col_t, col_act = st.columns([4, 1])
                    with col_t:
                        st.markdown(f"• **{t['title']}** (`{t['difficulty']}`) - {t['estimated_hours']} hrs")
                    with col_act:
                        if st.button("Ask Tutor", key=f"ask_{t['id']}"):
                            st.session_state.active_prompt = f"Explain the concept of {t['title']} step by step with examples."
                            st.rerun()

elif nav_section == "AI Academic Tutor":
    render_header("AI Academic Tutor", f"Interactive tutoring grounded in {active_course['code'] if active_course else 'Syllabus'}", "Student")
    
    # Unit context selector
    unit_options = ["All Units"] + [f"Unit {u['unit_number']}: {u['title']}" for u in active_course.get("units", [])] if active_course else ["All Units"]
    selected_unit = st.selectbox("Syllabus Unit Focus", unit_options)

    # Chat history display
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg.get("steps"):
                with st.expander("View Agent Execution Trace", expanded=False):
                    render_agent_trace(msg["steps"])

    user_query = st.chat_input("Ask an academic question or request concept practice...")
    
    # Check for trigger from other views
    if "active_prompt" in st.session_state and st.session_state.active_prompt:
        user_query = st.session_state.active_prompt
        st.session_state.active_prompt = None

    if user_query:
        st.session_state.chat_history.append({"role": "user", "content": user_query})
        with st.chat_message("user"):
            st.markdown(user_query)

        with st.chat_message("assistant"):
            with st.spinner("Academic Coordinator orchestrating multi-agent response..."):
                # Collect topics from selected unit
                syllabus_topics = []
                if active_course:
                    for u in active_course.get("units", []):
                        for t in u.get("topics", []):
                            syllabus_topics.append(t["title"])

                coord_res = coordinator_agent.coordinate({
                    "query": user_query,
                    "course_name": active_course["name"] if active_course else "Data Structures",
                    "course_code": active_course["code"] if active_course else "CS201",
                    "unit_title": selected_unit,
                    "syllabus_topics": syllabus_topics
                })

                st.markdown(coord_res["response"])
                with st.expander("Agent Coordination Pipeline", expanded=True):
                    render_agent_trace(coord_res.get("steps", []))

                st.session_state.chat_history.append({
                    "role": "assistant",
                    "content": coord_res["response"],
                    "steps": coord_res.get("steps", [])
                })

elif nav_section == "Book Library":
    render_header("Academic Book Library", "Verified textbooks & open-access materials curated by Academic Research Agent", "Student")
    if active_course:
        with st.spinner("Research Agent querying academic repositories..."):
            res = coordinator_agent.research_agent.execute({
                "course_name": active_course["name"],
                "course_code": active_course["code"]
            })
            for r in res.get("resources", []):
                with st.container():
                    st.markdown(
                        f"""
                        <div style="background: #1e293b; padding: 1.25rem; border-radius: 8px; border: 1px solid #334155; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <h3 style="color: #f8fafc; margin: 0; font-size: 1.2rem;">{r['title']}</h3>
                                <span style="background: {'#16a34a' if r['is_open_access'] else '#475569'}; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                                    {'Free Open-Access PDF' if r['is_open_access'] else 'Official Publisher'}
                                </span>
                            </div>
                            <p style="color: #cbd5e1; margin: 0.5rem 0; font-size: 0.9rem;"><strong>Author:</strong> {r['author']}</p>
                            <p style="color: #94a3b8; font-size: 0.85rem;">{r['description']}</p>
                            <a href="{r['url']}" target="_blank" style="color: #818cf8; font-size: 0.85rem; text-decoration: none;">View Official Repository →</a>
                        </div>
                        """,
                        unsafe_allow_html=True
                    )

elif nav_section == "Video Learning":
    render_header("Curated Video Lectures", "Topic-aligned university lectures and playlists from Video Discovery Agent", "Student")
    if active_course:
        with st.spinner("Video Discovery Agent retrieving syllabus lectures..."):
            res = coordinator_agent.video_agent.execute({
                "course_name": active_course["name"],
                "course_code": active_course["code"]
            })
            for v in res.get("videos", []):
                col1, col2 = st.columns([1, 3])
                with col1:
                    st.image(v["thumbnail"], use_container_width=True)
                with col2:
                    st.markdown(f"#### [{v['title']}]({v['url']})")
                    st.caption(f"Channel: **{v['channel']}** | Duration: `{v['duration']}` | {v['unit']}")
                    st.write(v["relevance"])
                    st.markdown(f"[Watch on YouTube]({v['url']})")
                st.divider()

elif nav_section == "Semester Planner":
    render_header("Autonomous Semester Study Planner", "AI-optimized preparation roadmap, difficulty weighting & buffer days", "Student")
    col1, col2 = st.columns(2)
    with col1:
        daily_hrs = st.slider("Daily Available Study Hours", min_value=1.0, max_value=8.0, value=3.0, step=0.5)
    with col2:
        exam_target = st.date_input("Target Examination Date", value=datetime.today() + timedelta(days=60))

    if st.button("Generate / Re-calculate Semester Strategy", use_container_width=True):
        with st.spinner("Planner Agent synthesizing calendar units..."):
            plan_res = coordinator_agent.planner_agent.execute({
                "courses": courses,
                "daily_hours": daily_hrs,
                "exam_date": exam_target.strftime("%Y-%m-%d")
            })
            st.session_state.current_plan = plan_res.get("plan")

    if "current_plan" in st.session_state:
        plan = st.session_state.current_plan
        st.success(f"Generated {plan.get('total_study_days')} Day Schedule ({plan.get('phases', {}).get('study_days')} Study Days, {plan.get('phases', {}).get('revision_sessions')} Revision Days, {plan.get('phases', {}).get('buffer_days')} Buffer Days, {plan.get('phases', {}).get('mock_tests')} Mock Tests)")
        
        st.markdown("#### Upcoming Scheduled Sessions")
        for t in plan.get("tasks", [])[:10]:
            type_color = "#3b82f6" if t["type"] == "study" else "#8b5cf6" if t["type"] == "revision" else "#22c55e"
            st.markdown(
                f"""
                <div style="background: #1e293b; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 4px solid {type_color}; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #f1f5f9;">{t['date']} (Day {t.get('day_number', 1)})</strong>: {t['title']}
                        <div style="color: #94a3b8; font-size: 0.8rem;">{t['course_name']} | {t['duration_hours']} Hours</div>
                    </div>
                    <span style="background: #334155; color: #cbd5e1; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase;">
                        {t['type']}
                    </span>
                </div>
                """,
                unsafe_allow_html=True
            )

elif nav_section == "Assessments":
    render_header("Syllabus Diagnostic Assessments", "Evaluates academic mastery and pinpoints conceptual gaps", "Student")
    if active_course:
        if st.button("Start New Diagnostic Assessment for Active Course", use_container_width=True):
            syllabus_topics = []
            for u in active_course.get("units", []):
                for t in u.get("topics", []):
                    syllabus_topics.append(t["title"])

            with st.spinner("Assessment Agent formulating questions..."):
                ass_res = coordinator_agent.assessment_agent.execute({
                    "action": "generate",
                    "course_name": active_course["name"],
                    "course_code": active_course["code"],
                    "syllabus_topics": syllabus_topics,
                    "question_count": 4
                })
                st.session_state.active_assessment = ass_res.get("assessment")

        if "active_assessment" in st.session_state and st.session_state.active_assessment:
            ass = st.session_state.active_assessment
            st.markdown(f"### {ass['course_code']}: {ass['course_name']} Quiz")
            user_answers = {}

            with st.form("quiz_submit_form"):
                for q in ass.get("questions", []):
                    st.markdown(f"**{q['question']}**")
                    user_answers[q["id"]] = st.radio(
                        "Select your answer:",
                        range(len(q["options"])),
                        format_func=lambda i, opt=q["options"]: opt[i],
                        key=f"q_radio_{q['id']}"
                    )
                    st.write("")

                submitted = st.form_submit_button("Submit Assessment for Evaluation", use_container_width=True)
                if submitted:
                    eval_res = coordinator_agent.assessment_agent.evaluate_submission({
                        "questions": ass.get("questions", []),
                        "answers": user_answers
                    })
                    res_data = eval_res.get("result", {})
                    st.session_state.last_assessment_result = res_data
                    # Persist in SQLite
                    StudyService.record_assessment_result(
                        user_id=st.session_state.user_info.get("id", "student-1"),
                        course_id=active_course["id"],
                        unit_id="all-units",
                        score=res_data["score"],
                        total_score=res_data["total_score"],
                        details=res_data
                    )

            if "last_assessment_result" in st.session_state:
                res = st.session_state.last_assessment_result
                st.markdown("---")
                st.markdown(f"### Diagnostic Result: **{res['score']} / {res['total_score']} ({res['percentage']}%)**")
                st.info(f"**Remediation Recommendation:** {res['remediation_advice']}")
                for d in res.get("eval_details", []):
                    icon = "✅" if d["is_correct"] else "❌"
                    st.markdown(f"{icon} **{d['question']}**")
                    st.caption(f"Your answer: {d['selected_option']} | Correct: {d['correct_option']}")
                    st.write(d["explanation"])

elif nav_section == "Learning Progress":
    render_header("Learning Progress & Analytics", "Track unit completion and diagnostic test scores", "Student")
    if active_course:
        prog = StudyService.get_student_progress(st.session_state.user_info.get("id", "student-1"), active_course["id"])
        st.metric("Overall Course Completion", f"{prog['completion_percentage']}%", f"{prog['completed_count']} of {prog['total_topics']} topics")
        
        st.markdown("#### Topic Mastery Checklist")
        for u in active_course.get("units", []):
            st.markdown(f"**Unit {u['unit_number']}: {u['title']}**")
            for t in u.get("topics", []):
                is_done = t["id"] in prog["completed_topic_ids"]
                checked = st.checkbox(f"{t['title']} ({t['difficulty']})", value=is_done, key=f"chk_{t['id']}")
                if checked != is_done:
                    StudyService.toggle_topic_completion(
                        st.session_state.user_info.get("id", "student-1"),
                        active_course["id"],
                        t["id"],
                        checked
                    )
                    st.rerun()

        st.markdown("#### Past Assessment Results")
        history = StudyService.get_assessment_history(st.session_state.user_info.get("id", "student-1"))
        if history:
            for h in history:
                st.markdown(f"- **{h['course_code']} Assessment**: Scored **{h['score']}/{h['total_score']} ({h['percentage']}%)** on {h['submitted_at']}")
                if h.get("recommended_revision"):
                    st.caption(f"Remediation: {h['recommended_revision']}")
        else:
            st.info("No assessments recorded yet. Take a quiz in the Assessments tab to track history.")

elif nav_section == "Settings":
    render_header("Academic Preferences & API Status", "Configure study parameters and verify agent connectivity", "Student")
    st.write(f"Logged in as: **{st.session_state.user_info.get('name')}** ({st.session_state.user_info.get('email')})")
    st.write(f"Academic Semester: **{st.session_state.user_info.get('semester')}**")
    
    st.markdown("#### Multi-Key Gemini API Pool Status")
    status = gemini_manager.get_status_summary()
    st.write(f"Active Model: `{status['model']}`")
    st.write(f"Configured Keys: `{status['configured_count']}` | Failovers Recorded: `{status['total_failovers']}`")
    for k in status.get("keys_status", []):
        st.markdown(f"- **{k['masked_id']}**: {'🟢 Operational' if k['is_healthy'] else '🔴 Cooldown'}")
