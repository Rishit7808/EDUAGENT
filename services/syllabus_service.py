"""
EDUAGENT Syllabus & Course Management Service
"""
import uuid
import json
from typing import List, Dict, Any, Optional
from database.db import get_connection

class SyllabusService:
    @staticmethod
    def get_all_courses() -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM courses ORDER BY code ASC")
        rows = cursor.fetchall()
        courses = []
        for r in rows:
            c = dict(r)
            if c.get("reference_books"):
                try:
                    c["reference_books"] = json.loads(c["reference_books"])
                except Exception:
                    pass
            # Fetch units
            cursor.execute("SELECT * FROM units WHERE course_id = ? ORDER BY unit_number ASC", (c["id"],))
            units = []
            for u in cursor.fetchall():
                ud = dict(u)
                cursor.execute("SELECT * FROM syllabus_topics WHERE unit_id = ? ORDER BY title ASC", (ud["id"],))
                ud["topics"] = [dict(t) for t in cursor.fetchall()]
                units.append(ud)
            c["units"] = units
            courses.append(c)
        conn.close()
        return courses

    @staticmethod
    def get_course_by_id(course_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM courses WHERE id = ?", (course_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        c = dict(row)
        if c.get("reference_books"):
            try:
                c["reference_books"] = json.loads(c["reference_books"])
            except Exception:
                pass
        cursor.execute("SELECT * FROM units WHERE course_id = ? ORDER BY unit_number ASC", (course_id,))
        units = []
        for u in cursor.fetchall():
            ud = dict(u)
            cursor.execute("SELECT * FROM syllabus_topics WHERE unit_id = ? ORDER BY title ASC", (ud["id"],))
            ud["topics"] = [dict(t) for t in cursor.fetchall()]
            units.append(ud)
        c["units"] = units
        conn.close()
        return c

    @staticmethod
    def create_course(code: str, name: str, semester: str, description: str, reference_books: List[str]) -> str:
        course_id = f"course-{uuid.uuid4().hex[:8]}"
        conn = get_connection()
        with conn:
            conn.execute(
                "INSERT INTO courses (id, code, name, semester, description, reference_books) VALUES (?, ?, ?, ?, ?, ?)",
                (course_id, code.upper(), name, semester, description, json.dumps(reference_books))
            )
        conn.close()
        return course_id

    @staticmethod
    def update_course(course_id: str, code: str, name: str, semester: str, description: str, reference_books: List[str]):
        conn = get_connection()
        with conn:
            conn.execute(
                "UPDATE courses SET code = ?, name = ?, semester = ?, description = ?, reference_books = ? WHERE id = ?",
                (code.upper(), name, semester, description, json.dumps(reference_books), course_id)
            )
        conn.close()

    @staticmethod
    def delete_course(course_id: str):
        conn = get_connection()
        with conn:
            conn.execute("DELETE FROM courses WHERE id = ?", (course_id,))
        conn.close()

    @staticmethod
    def add_unit(course_id: str, unit_number: int, title: str, description: str) -> str:
        unit_id = f"unit-{uuid.uuid4().hex[:8]}"
        conn = get_connection()
        with conn:
            conn.execute(
                "INSERT INTO units (id, course_id, unit_number, title, description) VALUES (?, ?, ?, ?, ?)",
                (unit_id, course_id, unit_number, title, description)
            )
        conn.close()
        return unit_id

    @staticmethod
    def add_topic(unit_id: str, title: str, difficulty: str = "Medium", estimated_hours: float = 2.0) -> str:
        topic_id = f"top-{uuid.uuid4().hex[:8]}"
        conn = get_connection()
        with conn:
            conn.execute(
                "INSERT INTO syllabus_topics (id, unit_id, title, difficulty, estimated_hours) VALUES (?, ?, ?, ?, ?)",
                (topic_id, unit_id, title, difficulty, estimated_hours)
            )
        conn.close()
        return topic_id
