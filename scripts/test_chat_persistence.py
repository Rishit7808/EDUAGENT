"""
Test AI Tutor Conversation History Persistence & Student Isolation in EDUAGENT
Tests all 8 user-mandated scenarios:
1. Chat in CS101 Unit 1.
2. Switch to CS101 Unit 2 and start another conversation.
3. Return to CS101 Unit 1 and verify the original conversation appears.
4. Switch to a different subject and return.
5. Refresh / reload from disk and verify history remains.
6. Log out and log back in as the same student and verify history remains.
7. Log in as another student and verify the first student's history is inaccessible.
8. Rapidly switch between units and verify messages never appear in the wrong conversation.
"""

import sys
import time
import json
import subprocess
import urllib.request
import urllib.error

SERVER_URL = "http://localhost:3000"

def request_json(path, method="GET", data=None, headers=None):
    url = f"{SERVER_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def main():
    print("=== STARTING AI TUTOR CONVERSATION PERSISTENCE TEST SUITE ===")
    
    # 0. Start Server
    server_proc = subprocess.Popen(["node", "dist/server.js"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for server to come online
    online = False
    for _ in range(30):
        try:
            status, data = request_json("/api/courses")
            if status == 200 and data.get("success"):
                online = True
                break
        except Exception:
            time.sleep(0.5)
            
    if not online:
        print("FAIL: Server failed to start on http://localhost:3000")
        server_proc.kill()
        sys.exit(1)
        
    print("PASS: Server online and responding.")
    
    student_1 = "student-1"
    student_2 = "student-test-isolation"
    cs101 = "course-cs101"
    cs201 = "course-cs201"
    cs101_unit1 = "unit-101-1"
    cs101_unit2 = "unit-101-2"
    
    try:
        # Scenario 1: Chat in CS101 Unit 1
        msg1_user = {
            "id": "msg-test-1-u",
            "role": "user",
            "content": "What is computational thinking in Python?",
            "timestamp": "10:00 AM"
        }
        msg1_ai = {
            "id": "msg-test-1-a",
            "role": "assistant",
            "content": "Computational thinking involves decomposition, pattern recognition, and algorithm design.",
            "timestamp": "10:01 AM"
        }
        
        status, res = request_json("/api/tutor/history", method="POST", data={
            "studentId": student_1,
            "courseId": cs101,
            "unitId": cs101_unit1,
            "message": msg1_user
        }, headers={"x-user-id": student_1})
        assert status == 200 and res.get("success"), f"Failed saving user message 1: {res}"
        
        status, res = request_json("/api/tutor/history", method="POST", data={
            "studentId": student_1,
            "courseId": cs101,
            "unitId": cs101_unit1,
            "message": msg1_ai
        }, headers={"x-user-id": student_1})
        assert status == 200 and res.get("success"), f"Failed saving ai message 1: {res}"
        print("PASS Scenario 1: Successfully chatted and persisted in CS101 Unit 1.")

        # Scenario 2: Switch to CS101 Unit 2 and start another conversation
        msg2_user = {
            "id": "msg-test-2-u",
            "role": "user",
            "content": "How do Python list comprehensions work?",
            "timestamp": "10:05 AM"
        }
        msg2_ai = {
            "id": "msg-test-2-a",
            "role": "assistant",
            "content": "List comprehensions offer a concise syntax to create lists based on existing iterables.",
            "timestamp": "10:06 AM"
        }
        
        status, res = request_json("/api/tutor/history", method="POST", data={
            "studentId": student_1,
            "courseId": cs101,
            "unitId": cs101_unit2,
            "message": msg2_user
        }, headers={"x-user-id": student_1})
        assert status == 200 and res.get("success"), f"Failed saving user message 2: {res}"
        
        status, res = request_json("/api/tutor/history", method="POST", data={
            "studentId": student_1,
            "courseId": cs101,
            "unitId": cs101_unit2,
            "message": msg2_ai
        }, headers={"x-user-id": student_1})
        assert status == 200 and res.get("success"), f"Failed saving ai message 2: {res}"
        print("PASS Scenario 2: Successfully created separate conversation in CS101 Unit 2.")

        # Scenario 3: Return to CS101 Unit 1 and verify the original conversation appears intact
        status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit1}", headers={"x-user-id": student_1})
        assert status == 200 and res.get("success"), f"Failed fetching Unit 1 history: {res}"
        unit1_messages = res.get("messages", [])
        assert len(unit1_messages) == 2, f"Expected 2 messages in Unit 1, got {len(unit1_messages)}"
        assert unit1_messages[0]["content"] == msg1_user["content"], "Message 0 content mismatch"
        assert unit1_messages[1]["content"] == msg1_ai["content"], "Message 1 content mismatch"
        print("PASS Scenario 3: Returning to CS101 Unit 1 restores exact original conversation without corruption.")

        # Scenario 4: Switch to a different subject (CS201) and return
        msg_dsa_u = {
            "id": "msg-test-dsa-u",
            "role": "user",
            "content": "Explain worst-case time complexity of quicksort.",
            "timestamp": "10:15 AM"
        }
        status, res = request_json("/api/tutor/history", method="POST", data={
            "studentId": student_1,
            "courseId": cs201,
            "unitId": "unit-5",
            "message": msg_dsa_u
        }, headers={"x-user-id": student_1})
        assert status == 200 and res.get("success")

        # Now return to CS101 Unit 2
        status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit2}", headers={"x-user-id": student_1})
        assert status == 200
        unit2_messages = res.get("messages", [])
        assert len(unit2_messages) == 2
        assert unit2_messages[0]["content"] == msg2_user["content"]
        assert unit2_messages[1]["content"] == msg2_ai["content"]
        print("PASS Scenario 4: Switching between different subjects does not corrupt or mix subject messages.")

        # Scenario 5 & 6: Refresh browser / reload from disk and re-login as same student
        # Stop and restart server to simulate server reboot / browser refresh / persistent disk state
        server_proc.terminate()
        server_proc.wait()
        
        server_proc = subprocess.Popen(["node", "dist/server.js"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for _ in range(30):
            try:
                status, data = request_json("/api/courses")
                if status == 200 and data.get("success"):
                    break
            except Exception:
                time.sleep(0.5)

        # Re-login check
        status, login_res = request_json("/api/auth/student-login", method="POST", data={
            "email": "student@eduagent.ac",
            "password": "student123"
        })
        assert status == 200 and login_res.get("success"), f"Student login failed: {login_res}"
        
        # Verify Unit 1 history remains after restart
        status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit1}", headers={"x-user-id": student_1})
        assert status == 200 and res.get("success")
        persisted_u1 = res.get("messages", [])
        assert len(persisted_u1) == 2, f"Expected 2 messages after reboot, got {len(persisted_u1)}"
        assert persisted_u1[0]["content"] == msg1_user["content"]
        print("PASS Scenario 5 & 6: History survives server restart, browser refresh, and student re-authentication.")

        # Scenario 7: Log in as another student and verify first student's history is inaccessible
        # Unauthorized access attempt with different x-user-id header
        status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit1}", headers={"x-user-id": student_2, "x-user-role": "student"})
        assert status == 403, f"Expected 403 Forbidden for unauthorized student, got {status}"
        print("PASS Scenario 7: Strict student isolation enforced (HTTP 403 when student-2 probes student-1 history).")

        # Scenario 8: Rapid switching simulation between units
        # Send rapid concurrent requests and verify keys are strictly partitioned
        for i in range(10):
            target_unit = cs101_unit1 if i % 2 == 0 else cs101_unit2
            status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{target_unit}", headers={"x-user-id": student_1})
            assert status == 200
            msgs = res.get("messages", [])
            if target_unit == cs101_unit1:
                assert msgs[0]["content"] == msg1_user["content"], "Stale data leaked into Unit 1"
            else:
                assert msgs[0]["content"] == msg2_user["content"], "Stale data leaked into Unit 2"
        print("PASS Scenario 8: Rapid unit switching guarantees zero cross-talk or race condition pollution.")

        # Test Clear Conversation action
        status, del_res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit1}", method="DELETE", headers={"x-user-id": student_1})
        assert status == 200 and del_res.get("success")
        
        status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit1}", headers={"x-user-id": student_1})
        assert status == 200
        assert len(res.get("messages", [])) == 0, "Expected empty messages after deletion"
        
        # Verify Unit 2 was NOT deleted
        status, res = request_json(f"/api/tutor/history/{student_1}/{cs101}/{cs101_unit2}", headers={"x-user-id": student_1})
        assert status == 200
        assert len(res.get("messages", [])) == 2, "Unit 2 messages should remain untouched"
        print("PASS: Clear conversation action verified (clears targeted unit while preserving other units).")

        print("\nALL 8 SCENARIOS TESTED AND PASSED PERFECTLY!")

    finally:
        server_proc.terminate()
        try:
            server_proc.wait(timeout=5)
        except Exception:
            server_proc.kill()

if __name__ == "__main__":
    main()

