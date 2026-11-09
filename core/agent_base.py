"""
EDUAGENT Base Agent Architecture
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import time
from core.api_manager import gemini_manager
from core.domain_guard import domain_guard

class AgentExecutionStep:
    def __init__(self, step_name: str, description: str, status: str = "running"):
        self.step_name = step_name
        self.description = description
        self.status = status  # "running", "completed", "failed"
        self.timestamp = time.time()

    def complete(self, details: str = ""):
        self.status = "completed"
        if details:
            self.description = f"{self.description} -> {details}"

    def fail(self, error: str = ""):
        self.status = "failed"
        if error:
            self.description = f"{self.description} [ERROR: {error}]"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step": self.step_name,
            "description": self.description,
            "status": self.status,
            "timestamp": self.timestamp
        }


class BaseAgent(ABC):
    """
    Abstract base class for all EDUAGENT specialized agents.
    Enforces distinct responsibility, explicit tool invocation, execution step recording,
    and strict educational grounding.
    """
    def __init__(self, name: str, role: str, description: str):
        self.name = name
        self.role = role
        self.description = description
        self.system_prompt = ""
        self.steps: List[AgentExecutionStep] = []

    def log_step(self, step_name: str, description: str) -> AgentExecutionStep:
        step = AgentExecutionStep(step_name, description, "running")
        self.steps.append(step)
        return step

    def clear_steps(self):
        self.steps = []

    def get_steps_trace(self) -> List[Dict[str, Any]]:
        return [s.to_dict() for s in self.steps]

    def call_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Invokes Gemini using multi-key manager with automatic rotation and failover."""
        def _invoke(api_key: str, model_id: str) -> str:
            # We use Google GenAI SDK if available, or official REST interface
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction or self.system_prompt,
                        "temperature": 0.3,
                    }
                )
                return response.text or ""
            except Exception as direct_err:
                # Fallback to requests if SDK is initializing or in edge container
                import requests
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3}
                }
                if system_instruction or self.system_prompt:
                    payload["systemInstruction"] = {
                        "parts": [{"text": system_instruction or self.system_prompt}]
                    }
                res = requests.post(url, json=payload, timeout=25)
                res.raise_for_status()
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

        raw_output = gemini_manager.execute_with_failover(_invoke)
        return domain_guard.sanitize_agent_output(raw_output)

    @abstractmethod
    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Subclasses must implement agent-specific execution workflow."""
        pass
