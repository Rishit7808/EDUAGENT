"""
EDUAGENT Academic Coordinator Agent (Agent 6 - Central Orchestrator)
"""
from typing import Dict, Any, List, Optional
import time
from core.agent_base import BaseAgent, AgentExecutionStep
from core.domain_guard import domain_guard
from agents.academic_tutor import AcademicTutorAgent
from agents.research_agent import AcademicResearchAgent
from agents.video_agent import VideoDiscoveryAgent
from agents.study_planner import SemesterStudyPlannerAgent
from agents.assessment_agent import AcademicAssessmentAgent

class AcademicCoordinatorAgent(BaseAgent):
    """
    Central intelligence of EDUAGENT.
    Analyzes intent, verifies academic boundaries, routes tasks across the 5 specialized agents,
    orchestrates combined workflows, and synthesizes final educational responses.
    """
    def __init__(self):
        super().__init__(
            name="Academic Coordinator Agent",
            role="Central Intelligence & Multi-Agent Dispatcher",
            description="Coordinates multi-agent workflows, verifies academic boundaries, and delivers synthesized learning plans."
        )
        self.tutor_agent = AcademicTutorAgent()
        self.research_agent = AcademicResearchAgent()
        self.video_agent = VideoDiscoveryAgent()
        self.planner_agent = SemesterStudyPlannerAgent()
        self.assessment_agent = AcademicAssessmentAgent()

    def coordinate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinates full agentic pipeline:
        1. Analyzes student inquiry.
        2. Domain security check.
        3. Identifies relevant course and syllabus units.
        4. Selects specialized agent(s).
        5. Executes task(s).
        6. Validates and returns synthesized response with full execution trace.
        """
        self.clear_steps()
        query = payload.get("query", "").strip()
        course_name = payload.get("course_name", "Data Structures and Algorithms")
        course_code = payload.get("course_code", "CS201")
        unit_title = payload.get("unit_title", "")
        syllabus_topics = payload.get("syllabus_topics", [])
        retrieved_context = payload.get("retrieved_context", "")

        # Trace 1: Analysing student request
        step1 = self.log_step("Analysing Student Request", f"Parsing intent and semantic objectives: '{query[:80]}'")
        
        # Trace 2: Checking academic syllabus & domain security
        step2 = self.log_step("Checking Academic Syllabus", f"Verifying academic relevance against course {course_code}: {course_name}.")
        is_allowed, reason = domain_guard.is_academic_query(query, course_context=f"{course_name} {unit_title}")
        
        if not is_allowed:
            step2.fail("Non-academic topic detected. Enforcing domain refusal boundary.")
            return {
                "success": False,
                "agent": self.name,
                "selected_agent": "Domain Guard",
                "response": reason,  # Exact required refusal message
                "steps": self.get_steps_trace()
            }
        step2.complete(f"Academic validity confirmed ({reason}).")

        # Trace 3: Selecting specialised agent
        q_lower = query.lower()
        selected_agent = "Academic Tutor Agent"
        is_combined_workflow = False

        if any(w in q_lower for w in ["book", "textbook", "pdf", "open access", "download", "reference", "library"]):
            selected_agent = "Academic Research Agent"
        elif any(w in q_lower for w in ["video", "youtube", "lecture video", "playlist", "watch"]):
            selected_agent = "Video Discovery Agent"
        elif any(w in q_lower for w in ["plan", "timetable", "roadmap", "schedule", "reschedule", "semester plan"]):
            selected_agent = "Semester Study Planner Agent"
        elif any(w in q_lower for w in ["quiz", "test", "assessment", "mcq", "evaluate me"]):
            selected_agent = "Academic Assessment Agent"
        elif any(w in q_lower for w in ["and test", "teach me and quiz", "explain and test"]):
            is_combined_workflow = True
            selected_agent = "Academic Tutor & Assessment Agents (Composite)"

        step3 = self.log_step("Selecting Specialised Agent", f"Routing request to {selected_agent}.")
        step3.complete(f"Assigned specialist: {selected_agent}")

        # Trace 4: Executing research or tutoring task
        step4 = self.log_step("Executing Agentic Task", f"Delegating payload to {selected_agent} with full syllabus context.")
        
        composite_steps = []
        final_response = ""
        supplementary_data = {}

        if is_combined_workflow:
            # Step A: Tutor explanation
            tutor_result = self.tutor_agent.execute(payload)
            composite_steps.extend(tutor_result.get("steps", []))
            
            # Step B: Assessment generation
            quiz_result = self.assessment_agent.execute({
                **payload,
                "action": "generate",
                "question_count": 3
            })
            composite_steps.extend(quiz_result.get("steps", []))

            final_response = (
                f"{tutor_result.get('response', '')}\n\n"
                f"---\n### Interactive Practice Quiz\n"
                f"Test your understanding with these diagnostic questions generated by the Academic Assessment Agent:"
            )
            supplementary_data["assessment"] = quiz_result.get("assessment")
            step4.complete("Coordinated dual-agent tutoring and assessment workflow.")

        elif selected_agent == "Academic Research Agent":
            res = self.research_agent.execute(payload)
            composite_steps.extend(res.get("steps", []))
            resources = res.get("resources", [])
            supplementary_data["resources"] = resources
            final_response = (
                f"### Verified Academic Resources for {course_name}\n"
                f"{res.get('summary', '')}\n\n"
            )
            for r in resources:
                oa_badge = " [Open-Access PDF Available]" if r.get("is_open_access") else " [Official Publisher/Commercial Reference]"
                final_response += f"**{r['title']}** by {r['author']}{oa_badge}\n- {r['description']}\n- Source: {r['source_website']} ([Link]({r['url']}))\n\n"
            step4.complete(f"Retrieved {len(resources)} verified academic publications.")

        elif selected_agent == "Video Discovery Agent":
            res = self.video_agent.execute(payload)
            composite_steps.extend(res.get("steps", []))
            videos = res.get("videos", [])
            supplementary_data["videos"] = videos
            final_response = (
                f"### Syllabus-Aligned Video Lectures for {course_name}\n\n"
            )
            for v in videos:
                final_response += f"**[{v['title']}]({v['url']})**\n- Channel: {v['channel']} | Duration: {v['duration']} | Unit: {v['unit']}\n- Relevance: {v['relevance']}\n\n"
            step4.complete(f"Discovered {len(videos)} university lectures.")

        elif selected_agent == "Semester Study Planner Agent":
            res = self.planner_agent.execute(payload)
            composite_steps.extend(res.get("steps", []))
            plan = res.get("plan", {})
            supplementary_data["plan"] = plan
            final_response = (
                f"### Autonomous Semester Preparation Strategy\n"
                f"Generated roadmap covering {plan.get('total_study_days')} days with {plan.get('daily_hours')} study hours/day.\n"
                f"- Study Sessions: {plan.get('phases', {}).get('study_days')} days\n"
                f"- Revision & Consolidation: {plan.get('phases', {}).get('revision_sessions')} sessions\n"
                f"- Buffer & Catch-up Days: {plan.get('phases', {}).get('buffer_days')} days\n"
                f"- Mock Examinations: {plan.get('phases', {}).get('mock_tests')} sessions\n\n"
                f"You can view and check off your daily assignments in the **Semester Planner** tab."
            )
            step4.complete("Generated optimal pedagogical study timeline.")

        elif selected_agent == "Academic Assessment Agent":
            res = self.assessment_agent.execute({**payload, "action": "generate"})
            composite_steps.extend(res.get("steps", []))
            assessment = res.get("assessment", {})
            supplementary_data["assessment"] = assessment
            final_response = (
                f"### Syllabus Diagnostic Assessment: {course_name} ({unit_title or 'Unit Review'})\n"
                f"Generated {len(assessment.get('questions', []))} multiple-choice diagnostic questions to evaluate your understanding.\n"
                f"Please open the **Assessments** workspace to record your answers and receive immediate knowledge gap analysis."
            )
            step4.complete(f"Prepared {len(assessment.get('questions', []))} diagnostic questions.")

        else:
            # Default to Academic Tutor Agent
            res = self.tutor_agent.execute(payload)
            composite_steps.extend(res.get("steps", []))
            final_response = res.get("response", "")
            step4.complete("Concept explanation synthesized.")

        # Trace 5: Validating results
        step5 = self.log_step("Validating Results", "Auditing response against educational standards and redacting potential secrets.")
        sanitized_response = domain_guard.sanitize_agent_output(final_response)
        step5.complete("Academic integrity and security verified.")

        # Trace 6: Delivering final response
        step6 = self.log_step("Delivering Final Response", f"Transmitting synthesized output to student workspace.")
        step6.complete("Complete.")

        all_steps = self.get_steps_trace() + composite_steps

        return {
            "success": True,
            "agent": self.name,
            "selected_agent": selected_agent,
            "response": sanitized_response,
            "supplementary_data": supplementary_data,
            "steps": all_steps
        }

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.coordinate(payload)

# Global singleton coordinator
coordinator_agent = AcademicCoordinatorAgent()
