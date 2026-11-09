"""
EDUAGENT Student Study Progress and Assessment History Service
"""
import uuid
import json
from typing import List, Dict, Any, Optional
from database.db import get_connection

class StudyService:
    @staticmethod
    def get_student_progress(user_id: str, course_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Total syllabus topics in course
        cursor.execute("""
            SELECT count(t.id) as total_topics
            FROM syllabus_topics t
            JOIN units u ON t.unit_id = u.id
            WHERE u.course_id = ?
        """, (course_id,))
        total_topics = cursor.fetchone()["total_topics"]

        # Completed topics for this student
        cursor.execute("""
            SELECT topic_id, is_completed
            FROM learning_progress
            WHERE user_id = ? AND course_id = ? AND is_completed = 1
        """, (user_id, course_id))
        completed_rows = cursor.fetchall()
        completed_topic_ids = [r["topic_id"] for r in completed_rows]

        conn.close()
        return {
            "course_id": course_id,
            "total_topics": total_topics,
            "completed_count": len(completed_topic_ids),
            "completed_topic_ids": completed_topic_ids,
            "completion_percentage": round((len(completed_topic_ids) / total_topics * 100), 1) if total_topics > 0 else 0.0
        }

    @staticmethod
    def toggle_topic_completion(user_id: str, course_id: str, topic_id: str, is_completed: bool):
        conn = get_connection()
        with conn:
            conn.execute("""
                INSERT INTO learning_progress (id, user_id, course_id, topic_id, is_completed)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, topic_id) DO UPDATE SET is_completed = excluded.is_completed, updated_at = CURRENT_TIMESTAMP
            """, (f"prog-{uuid.uuid4().hex[:8]}", user_id, course_id, topic_id, 1 if is_completed else 0))
        conn.close()

    @staticmethod
    def record_assessment_result(user_id: str, course_id: str, unit_id: str, score: float, total_score: float, details: Dict[str, Any]) -> str:
        res_id = f"res-{uuid.uuid4().hex[:8]}"
        ass_id = f"ass-{uuid.uuid4().hex[:8]}"
        percentage = round((score / total_score * 100), 1) if total_score > 0 else 0.0

        conn = get_connection()
        with conn:
            # Create assessment record
            conn.execute("""
                INSERT INTO assessments (id, course_id, unit_id, title, questions_json)
                VALUES (?, ?, ?, ?, ?)
            """, (ass_id, course_id, unit_id, f"Unit Diagnostic Assessment", json.dumps(details.get("eval_details", []))))

            # Create result record
            conn.execute("""
                INSERT INTO assessment_results (id, assessment_id, user_id, score, total_score, percentage, user_answers_json, weak_topics, recommended_revision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                res_id,
                ass_id,
                user_id,
                score,
                total_score,
                percentage,
                json.dumps(details.get("eval_details", [])),
                json.dumps(details.get("weak_topics", [])),
                details.get("remediation_advice", "")
            ))
        conn.close()
        return res_id

    @staticmethod
    def get_assessment_history(user_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*, a.course_id, a.title as assessment_title, c.name as course_name, c.code as course_code
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            JOIN courses c ON a.course_id = c.id
            WHERE r.user_id = ?
            ORDER BY r.submitted_at DESC
        """, (user_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
