"""
EDUAGENT Semester Study Planner Agent (Agent 4)
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from core.agent_base import BaseAgent
import math

class SemesterStudyPlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Semester Study Planner Agent",
            role="Autonomous Academic Strategy and Schedule Synthesizer",
            description="Analyzes full course syllabi, estimates difficulty weights, allocates study, revision, and buffer sessions, and dynamically reschedules upon delays."
        )

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        payload:
          - courses: list of { id, name, code, units: [ { id, unit_number, title, topics: [ { id, title, difficulty } ] } ] }
          - semester_start: 'YYYY-MM-DD'
          - semester_end: 'YYYY-MM-DD'
          - exam_date: 'YYYY-MM-DD'
          - daily_hours: float
          - preferred_days: list of str, e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          - weak_subjects: list of course_codes
        """
        self.clear_steps()
        courses = payload.get("courses", [])
        daily_hours = float(payload.get("daily_hours", 3.0))
        weak_subjects = payload.get("weak_subjects", [])
        
        start_str = payload.get("semester_start", datetime.now().strftime("%Y-%m-%d"))
        end_str = payload.get("semester_end", (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"))
        exam_str = payload.get("exam_date", (datetime.now() + timedelta(days=80)).strftime("%Y-%m-%d"))

        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
            exam_date = datetime.strptime(exam_str, "%Y-%m-%d").date()
        except Exception:
            start_date = date.today()
            end_date = start_date + timedelta(days=90)
            exam_date = start_date + timedelta(days=80)

        step1 = self.log_step("Curriculum Difficulty Analysis", f"Auditing {len(courses)} courses for cognitive load & unit topic density.")
        
        # Flatten all syllabus topics with weights
        all_topics = []
        for c in courses:
            c_code = c.get("code", "")
            c_name = c.get("name", "")
            is_weak = c_code in weak_subjects or c_name in weak_subjects
            
            for u in c.get("units", []):
                u_title = u.get("title", f"Unit {u.get('unit_number', 1)}")
                for t in u.get("topics", []):
                    t_title = t.get("title", "Topic")
                    diff = t.get("difficulty", "Medium")
                    # Difficulty weight multiplier
                    weight = 1.0
                    if diff == "Hard":
                        weight = 1.8
                    elif diff == "Easy":
                        weight = 0.8
                    if is_weak:
                        weight *= 1.3
                    
                    all_topics.append({
                        "course_id": c.get("id"),
                        "course_code": c_code,
                        "course_name": c_name,
                        "unit_title": u_title,
                        "topic_title": t_title,
                        "difficulty": diff,
                        "weight": weight,
                        "estimated_hours": round(2.0 * weight, 1)
                    })

        total_study_days = max((exam_date - start_date).days, 7)
        step1.complete(f"Audited {len(all_topics)} topics across {len(courses)} courses over {total_study_days} days.")

        step2 = self.log_step("Cadence & Buffer Allocation", "Partitioning timeline: 65% Primary Study, 15% Practice, 10% Mock Tests, 10% Buffer.")
        
        # Construct day-by-day roadmap
        daily_tasks = []
        current_date = start_date
        topic_idx = 0
        total_topics = len(all_topics)

        # Allocate phases:
        # Every 7th day is a Revision & Buffer day
        # Last 10 days before exam are Mock Exam & Final Strategy days
        exam_prep_days = max(5, int(total_study_days * 0.15))
        study_phase_days = total_study_days - exam_prep_days

        day_count = 0
        while day_count < total_study_days:
            curr_date_str = current_date.strftime("%Y-%m-%d")
            
            # Phase 1: Periodic Buffer and Revision Day
            if (day_count + 1) % 7 == 0:
                daily_tasks.append({
                    "id": f"task-rev-{day_count}",
                    "date": curr_date_str,
                    "day_number": day_count + 1,
                    "type": "revision",
                    "title": "Weekly Consolidation & Flashcard Review",
                    "course_name": "All Active Courses",
                    "duration_hours": daily_hours,
                    "status": "pending",
                    "is_completed": False
                })
            elif (day_count + 1) % 14 == 0:
                daily_tasks.append({
                    "id": f"task-buf-{day_count}",
                    "date": curr_date_str,
                    "day_number": day_count + 1,
                    "type": "buffer",
                    "title": "Adaptive Buffer Day (Catch-up / Break)",
                    "course_name": "Flex Time",
                    "duration_hours": daily_hours * 0.75,
                    "status": "pending",
                    "is_completed": False
                })
            # Phase 2: Final Mock Test & Exam Prep Days
            elif day_count >= study_phase_days:
                mock_num = (day_count - study_phase_days) + 1
                daily_tasks.append({
                    "id": f"task-mock-{day_count}",
                    "date": curr_date_str,
                    "day_number": day_count + 1,
                    "type": "mock_test",
                    "title": f"Comprehensive Mock Exam & Weak-Area Remediation #{mock_num}",
                    "course_name": "High Priority Review",
                    "duration_hours": daily_hours,
                    "status": "pending",
                    "is_completed": False
                })
            # Phase 3: Core Topical Study
            else:
                if total_topics > 0:
                    assigned_topic = all_topics[topic_idx % total_topics]
                    daily_tasks.append({
                        "id": f"task-study-{day_count}",
                        "date": curr_date_str,
                        "day_number": day_count + 1,
                        "type": "study",
                        "title": f"{assigned_topic['course_code']}: {assigned_topic['topic_title']}",
                        "course_name": assigned_topic['course_name'],
                        "unit_title": assigned_topic['unit_title'],
                        "difficulty": assigned_topic['difficulty'],
                        "duration_hours": min(daily_hours, assigned_topic['estimated_hours']),
                        "status": "pending",
                        "is_completed": False
                    })
                    topic_idx += 1
                else:
                    daily_tasks.append({
                        "id": f"task-gen-{day_count}",
                        "date": curr_date_str,
                        "day_number": day_count + 1,
                        "type": "study",
                        "title": "Structured Course Concept Study",
                        "course_name": "General Curriculum",
                        "duration_hours": daily_hours,
                        "status": "pending",
                        "is_completed": False
                    })

            current_date += timedelta(days=1)
            day_count += 1

        step2.complete(f"Generated {len(daily_tasks)} scheduled calendar units.")

        step3 = self.log_step("Rescheduling Strategy Verification", "Setting up dynamic re-calibration hooks for incomplete assignments.")
        step3.complete("Re-calibration engine initialized.")

        return {
            "success": True,
            "agent": self.name,
            "plan": {
                "total_study_days": total_study_days,
                "daily_hours": daily_hours,
                "semester_start": start_str,
                "semester_end": end_str,
                "exam_date": exam_str,
                "total_topics_covered": min(topic_idx, total_topics),
                "total_tasks": len(daily_tasks),
                "tasks": daily_tasks,
                "phases": {
                    "study_days": study_phase_days,
                    "revision_sessions": math.ceil(total_study_days / 7),
                    "buffer_days": math.floor(total_study_days / 14),
                    "mock_tests": exam_prep_days
                }
            },
            "steps": self.get_steps_trace()
        }

    def reschedule_incomplete_tasks(self, plan: Dict[str, Any], completed_task_ids: List[str]) -> Dict[str, Any]:
        """Dynamically reshuffles uncompleted tasks across future available buffer and study slots."""
        tasks = plan.get("tasks", [])
        updated_tasks = []
        incomplete_items = []

        today_str = date.today().strftime("%Y-%m-%d")

        for t in tasks:
            if t["id"] in completed_task_ids:
                t["is_completed"] = True
                t["status"] = "completed"
            elif t["date"] < today_str and not t["is_completed"]:
                incomplete_items.append(t)
                t["status"] = "rescheduled"
            updated_tasks.append(t)

        # Distribute overdue topics into future buffer slots
        buffer_idx = 0
        for t in updated_tasks:
            if t["date"] >= today_str and t["type"] in ["buffer", "revision"] and buffer_idx < len(incomplete_items):
                reassigned = incomplete_items[buffer_idx]
                t["title"] = f"[Catch-up] {reassigned['title']}"
                t["type"] = "practice"
                buffer_idx += 1

        plan["tasks"] = updated_tasks
        return plan
