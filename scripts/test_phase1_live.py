"""
End-to-end integration test for Phase 1 Personalized AI Tutor in EDUAGENT.
"""

import sys
import time
import json
import subprocess
import urllib.request
import urllib.error
import os

TEST_PORT = 3456
SERVER_URL = f"http://127.0.0.1:{TEST_PORT}"

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
    print("=== STARTING PHASE 1 PERSONALIZED AI TUTOR LIVE TEST ===")
    env = os.environ.copy()
    env["PORT"] = str(TEST_PORT)
    
    # 0. Start Server on isolated port
    server_proc = subprocess.Popen(["node", "dist/server.js"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for server to come online
    online = False
    for _ in range(30):
        try:
            status, data = request_json("/api/courses")
            if status == 200:
                online = True
                break
        except Exception:
            time.sleep(0.3)
            
    if not online:
        print(f"FAIL: Server failed to start on {SERVER_URL}")
        server_proc.kill()
        sys.exit(1)
        
    print(f"✓ Server running on {SERVER_URL}")
    
    try:
        # TEST 1: New Student (Unassessed)
        student_new = "student-test-new"
        status, profile_new = request_json(
            f"/api/student/learning-profile/{student_new}/CS201",
            headers={"x-user-id": student_new, "x-user-role": "student"}
        )
        assert status == 200, f"Expected 200, got {status}"
        assert profile_new["profile"]["masteryLevel"] == "Unassessed"
        assert profile_new["profile"]["weakTopics"] == []
        assert profile_new["profile"]["totalAssessments"] == 0
        assert profile_new["profile"]["courseAverageScore"] is None
        print("✓ Test 1 Passed: New student has clean Unassessed baseline without fabricated data")

        # TEST 2: Submit an actual quiz with weak topics for student A
        student_a = "student-test-a"
        quiz_submission = {
            "studentId": student_a,
            "courseCode": "CS201",
            "score": 40,
            "totalScore": 100,
            "details": {
                "score": 40,
                "total_score": 100,
                "percentage": 40,
                "weak_topics": ["AVL Trees & Self-Balancing Rotations"],
                "eval_details": [
                    {
                        "id": "q1",
                        "question": "AVL Single Right Rotation precondition",
                        "topic": "AVL Trees & Self-Balancing Rotations",
                        "is_correct": False,
                    },
                    {
                        "id": "q2",
                        "question": "AVL Left-Right double rotation sequence",
                        "topic": "AVL Trees & Self-Balancing Rotations",
                        "is_correct": False,
                    },
                    {
                        "id": "q3",
                        "question": "Binary Search Tree search invariance",
                        "topic": "Binary Search Trees (BST)",
                        "is_correct": True,
                    }
                ]
            }
        }
        status, res_sub = request_json("/api/assessments/submit", method="POST", data=quiz_submission)
        assert status == 200
        print("✓ Test 2 Passed: Submitted diagnostic assessment for Student A")

        # TEST 3: Student A learning profile reflects real scores, weak topics, and remedial recommendations
        status, profile_a = request_json(
            f"/api/student/learning-profile/{student_a}/CS201",
            headers={"x-user-id": student_a, "x-user-role": "student"}
        )
        assert status == 200
        prof = profile_a["profile"]
        assert prof["courseAverageScore"] == 40
        assert prof["masteryLevel"] == "Needs Attention"
        assert len(prof["weakTopics"]) == 1
        assert prof["weakTopics"][0]["topic"] == "AVL Trees & Self-Balancing Rotations"
        assert prof["weakTopics"][0]["missedCount"] == 2
        assert len(prof["repeatedMistakes"]) == 1
        assert "AVL Trees & Self-Balancing Rotations" in prof["repeatedMistakes"][0]
        assert prof["recommendations"]["conceptToRevise"] == "AVL Trees & Self-Balancing Rotations"
        assert prof["recommendations"]["recommendedLecture"]["channel"] == "Abdul Bari"
        print("✓ Test 3 Passed: Profile accurately diagnosed weak topics and repeated mistakes")

        # TEST 4: Student Privacy & Isolation Protection
        # Student B attempts to access Student A's private profile -> must return 403 Forbidden
        status, denied_res = request_json(
            f"/api/student/learning-profile/{student_a}/CS201",
            headers={"x-user-id": "student-test-intruder", "x-user-role": "student"}
        )
        assert status == 403, f"Expected 403 Forbidden for cross-student access, got {status}"
        print("✓ Test 4 Passed: Strict isolation verified - Student B cannot view Student A's profile")

        # TEST 5: AI Coordinator generates personalized adaptive response
        coord_req = {
            "query": "Explain how tree rotations work and maintain balance",
            "courseName": "Data Structures and Algorithms",
            "courseCode": "CS201",
            "unitTitle": "Unit 3: Queues and Trees",
            "syllabusTopics": ["Binary Search Trees (BST)", "AVL Trees & Self-Balancing Rotations"],
            "studentId": student_a
        }
        status, coord_res = request_json(
            "/api/agent/coordinate",
            method="POST",
            data=coord_req,
            headers={"x-user-id": student_a, "x-user-role": "student"}
        )
        assert status == 200
        assert coord_res["success"] is True
        assert "personalization" in coord_res
        pers = coord_res["personalization"]
        assert pers["masteryLevel"] == "Needs Attention"
        assert "Remedial" in pers["explanationMode"] or "Simplified" in pers["explanationMode"]
        assert "AVL Trees & Self-Balancing Rotations" in pers["weakTopics"]
        assert pers["recommendations"]["conceptToRevise"] == "AVL Trees & Self-Balancing Rotations"
        print("✓ Test 5 Passed: AI Coordinator synthesized adaptive explanation and returned personalization payload")

        # TEST 6: Save and restore conversation history with personalization metadata
        msg_payload = {
            "studentId": student_a,
            "courseId": "cs201",
            "unitId": "u3",
            "message": {
                "id": "msg-pers-1",
                "role": "assistant",
                "content": coord_res["response"],
                "selectedAgent": coord_res["selectedAgent"],
                "personalization": pers,
                "timestamp": "10:00 AM"
            }
        }
        status, save_res = request_json(
            "/api/tutor/history",
            method="POST",
            data=msg_payload,
            headers={"x-user-id": student_a, "x-user-role": "student"}
        )
        assert status == 200

        # Retrieve history
        status, hist_res = request_json(
            f"/api/tutor/history/{student_a}/cs201/u3",
            headers={"x-user-id": student_a, "x-user-role": "student"}
        )
        assert status == 200
        assert len(hist_res["messages"]) == 1
        restored_msg = hist_res["messages"][0]
        assert restored_msg["personalization"]["masteryLevel"] == "Needs Attention"
        assert restored_msg["personalization"]["recommendations"]["conceptToRevise"] == "AVL Trees & Self-Balancing Rotations"
        print("✓ Test 6 Passed: Conversation history persistence preserves personalization metadata")

        # TEST 7: Submit new high-scoring quiz and verify recommendations update dynamically
        quiz2_submission = {
            "studentId": student_a,
            "courseCode": "CS201",
            "score": 100,
            "totalScore": 100,
            "details": {
                "score": 100,
                "total_score": 100,
                "percentage": 100,
                "weak_topics": [],
                "eval_details": [
                    {
                        "id": "q4",
                        "question": "AVL Single Right Rotation precondition",
                        "topic": "AVL Trees & Self-Balancing Rotations",
                        "is_correct": True,
                    },
                    {
                        "id": "q5",
                        "question": "Binary Search Tree search invariance",
                        "topic": "Binary Search Trees (BST)",
                        "is_correct": True,
                    }
                ]
            }
        }
        request_json("/api/assessments/submit", method="POST", data=quiz2_submission)

        # Check updated profile: average of 40% and 100% = 70%
        status, updated_prof_res = request_json(
            f"/api/student/learning-profile/{student_a}/CS201",
            headers={"x-user-id": student_a, "x-user-role": "student"}
        )
        updated_prof = updated_prof_res["profile"]
        assert updated_prof["courseAverageScore"] == 70
        assert updated_prof["courseAssessmentsCount"] == 2
        assert updated_prof["masteryLevel"] == "Developing"
        print("✓ Test 7 Passed: Profile recommendations updated dynamically upon new quiz submission")

        print("\n🎉 ALL 7 PHASE 1 PERSONALIZED AI TUTOR LIVE TESTS PASSED SUCCESSFULLY!")

    finally:
        server_proc.kill()

if __name__ == "__main__":
    main()

