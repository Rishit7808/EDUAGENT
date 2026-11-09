import urllib.request
import urllib.parse
import json
import sqlite3
import os
import sys
import subprocess
import time

BASE_URL = "http://localhost:3000"
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "eduagent.db")
COURSES_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "courses_store.json")

def api_get(endpoint, params=None):
    url = f"{BASE_URL}{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

def api_post(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    json_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=json_data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode('utf-8'))

print("=== EDUAGENT COURSE EXPANSION REGRESSION TEST SUITE ===")

# Test 1: JSON store and SQLite consistency
with open(COURSES_PATH, 'r', encoding='utf-8') as f:
    json_courses = json.load(f)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("SELECT code, name, semester FROM courses ORDER BY semester, code")
db_courses = cur.fetchall()
conn.close()

assert len(json_courses) == 8, f"Expected 8 courses in JSON store, got {len(json_courses)}"
assert len(db_courses) == 8, f"Expected 8 courses in SQLite DB, got {len(db_courses)}"
print(f"PASS: 8 courses confirmed in JSON store and SQLite DB.")

expected_codes = {'CS101', 'CS201', 'CS202', 'CS203', 'CS204', 'CS301', 'CS401', 'CS489'}
actual_codes = {c['code'] for c in json_courses}
assert actual_codes == expected_codes, f"Mismatch in course codes: {actual_codes ^ expected_codes}"
print(f"PASS: All 8 required course codes present: {sorted(list(actual_codes))}")

# Start the server subprocess
print("Starting EDUAGENT server (node dist/server.js)...")
server_proc = subprocess.Popen(["node", "dist/server.js"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

# Wait for server to become healthy
connected = False
for attempt in range(15):
    time.sleep(1)
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/courses")
        with urllib.request.urlopen(req, timeout=2) as r:
            if r.status == 200:
                connected = True
                print("Server online and responding.")
                break
    except Exception:
        pass

if not connected:
    server_proc.terminate()
    print("FATAL: Server failed to start on port 3000 within 15 seconds.")
    sys.exit(1)

try:
    # Test 2: API /api/courses
    res_all = api_get("/api/courses")
    assert res_all.get('success') is True
    assert len(res_all.get('courses', [])) == 8
    print(f"PASS: /api/courses returns all 8 courses.")

    # Test 3: Semester filtering
    res_sem1 = api_get("/api/courses", {"semester": "Semester I"})
    codes_sem1 = [c['code'] for c in res_sem1['courses']]
    assert codes_sem1 == ['CS101'], f"Expected ['CS101'], got {codes_sem1}"
    print(f"PASS: Semester I filter: {codes_sem1}")

    res_sem2 = api_get("/api/courses", {"semester": "Semester II"})
    codes_sem2 = [c['code'] for c in res_sem2['courses']]
    assert sorted(codes_sem2) == ['CS203', 'CS204'], f"Expected ['CS203', 'CS204'], got {codes_sem2}"
    print(f"PASS: Semester II filter: {codes_sem2}")

    res_sem3 = api_get("/api/courses", {"semester": "Semester III"})
    codes_sem3 = [c['code'] for c in res_sem3['courses']]
    assert sorted(codes_sem3) == ['CS201', 'CS202', 'CS301'], f"Expected ['CS201', 'CS202', 'CS301'], got {codes_sem3}"
    print(f"PASS: Semester III filter: {codes_sem3}")

    res_sem4 = api_get("/api/courses", {"semester": "Semester IV"})
    codes_sem4 = [c['code'] for c in res_sem4['courses']]
    assert sorted(codes_sem4) == ['CS401', 'CS489'], f"Expected ['CS401', 'CS489'], got {codes_sem4}"
    print(f"PASS: Semester IV filter: {codes_sem4}")

    # Test 4: Existing user authentication regression
    res_admin_bad = api_post("/api/auth/admin-login", {"password": "wrongpassword"})
    assert res_admin_bad.get('success') is False
    print(f"PASS: Admin rejected on wrong password.")

    res_admin_good = api_post("/api/auth/admin-login", {"password": "118b"})
    assert res_admin_good.get('success') is True
    print(f"PASS: Admin authenticated with password '118b'.")

    res_stud_bad = api_post("/api/auth/student-login", {"email": "student@eduagent.ac", "password": "wrong"})
    assert res_stud_bad.get('success') is False
    print(f"PASS: Student rejected on wrong password.")

    res_stud_good = api_post("/api/auth/student-login", {"email": "student@eduagent.ac", "password": "student123"})
    assert res_stud_good.get('success') is True
    assert res_stud_good.get('user', {}).get('semester') == "Semester III"
    print(f"PASS: Existing student-1 authenticated with password 'student123'.")

    # Test 5: Register Semester II student and test planner
    test_email = f"sem2_student_{int(time.time())}@eduagent.ac"
    res_reg = api_post("/api/auth/student-register", {
        "name": "Priya Sharma",
        "email": test_email,
        "password": "Password123!",
        "semester": "Semester II"
    })
    assert res_reg.get('success') is True
    sem2_user_id = res_reg['user']['id']
    print(f"PASS: Registered Semester II student ({sem2_user_id}).")

    # Generate study plan for Semester II student
    res_plan = api_post("/api/planner/generate", {
        "studentId": sem2_user_id,
        "dailyHours": 3.0,
        "examDate": "2026-06-15",
        "weakSubject": "CS203"
    })
    assert res_plan.get('success') is True
    plan = res_plan['plan']
    assert len(plan['tasks']) > 0
    study_tasks = [t for t in plan['tasks'] if t['type'] == 'study']
    assert len(study_tasks) > 0
    plan_courses = {t['title'].split(':')[0].strip() for t in study_tasks}
    assert plan_courses.issubset({'CS203', 'CS204'}), f"Plan contains non-Semester II courses: {plan_courses}"
    print(f"PASS: Semester Planner generated {len(plan['tasks'])} tasks strictly for Semester II subjects ({plan_courses}).")

    # Test 6: Assessment generation for new courses
    res_quiz_oop = api_post("/api/assessments/generate", {
        "courseCode": "CS203",
        "unitId": "unit-203-1",
        "count": 5
    })
    assert res_quiz_oop.get('success') is True
    assert len(res_quiz_oop.get('questions', [])) == 5
    print(f"PASS: Assessment generator produced 5 questions for CS203 Unit 1.")

    res_quiz_os = api_post("/api/assessments/generate", {
        "courseCode": "CS301",
        "unitId": "unit-301-2",
        "count": 5
    })
    assert res_quiz_os.get('success') is True
    assert len(res_quiz_os.get('questions', [])) == 5
    print(f"PASS: Assessment generator produced 5 questions for CS301 Unit 2.")

    # Test 7: Academic Coordinator Agent query on new subjects
    res_coord_os = api_post("/api/agent/coordinate", {
        "query": "Explain process state transitions and the Process Control Block",
        "courseName": "Operating Systems",
        "courseCode": "CS301",
        "unitTitle": "Process Management & CPU Scheduling",
        "syllabusTopics": ["Process Control Block (PCB)", "Context Switching", "Process State Transitions"]
    })
    assert res_coord_os.get('success') is True
    assert len(res_coord_os.get('response', '')) > 50
    print(f"PASS: Academic Coordinator processed CS301 query with response length {len(res_coord_os['response'])}.")

    # Test 8: Non-academic query rejection by Domain Guard
    res_coord_disallowed = api_post("/api/agent/coordinate", {
        "query": "Tell me Hollywood movie gossip and who won the cricket match",
        "courseName": "Operating Systems",
        "courseCode": "CS301",
        "unitTitle": "Process Management",
        "syllabusTopics": ["PCB"]
    })
    assert res_coord_disallowed.get('success') is False
    print(f"PASS: Domain Guard rejected non-academic query.")

    print("\nALL 8 REGRESSION TESTS PASSED PERFECTLY!")

finally:
    server_proc.terminate()
    try:
        server_proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        server_proc.kill()
    print("EDUAGENT server stopped.")
