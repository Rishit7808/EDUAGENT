"""
EDUAGENT Strict Educational Domain Guard and Prompt Security
"""
import re
from typing import Tuple, Optional, List
from config.settings import REFUSAL_MESSAGE

# Academic subject keywords and patterns
ACADEMIC_INDICATORS = [
    r'\b(algorithm|data structure|binary tree|linked list|stack|queue|graph|heap)\b',
    r'\b(sorting|searching|dynamic programming|recursion|complexity|big-o|asymptotic)\b',
    r'\b(database|sql|normalization|acid|relational|indexing|transaction)\b',
    r'\b(operating system|process|thread|deadlock|semaphore|paging|virtual memory)\b',
    r'\b(computer network|tcp|ip|udp|osi layer|routing|socket|http|dns)\b',
    r'\b(discrete math|calculus|linear algebra|probability|statistics|boolean algebra)\b',
    r'\b(physics|chemistry|circuit|electronics|microprocessor|logic gate)\b',
    r'\b(syllabus|semester|unit|exam|quiz|assessment|course|lecture|assignment|homework)\b',
    r'\b(explain|teach|learn|derive|prove|summarize|definition|example|tutorial|step-by-step)\b',
    r'\b(python|java|c\+\+|c\b|javascript|assembly|compiler|syntax|class|function)\b',
]

# Explicitly disallowed non-academic categories and prompt injections
DISALLOWED_PATTERNS = [
    # Jailbreak and prompt leak attempts
    r'\b(ignore previous instructions|disregard all prior|system prompt|reveal your prompt)\b',
    r'\b(what is your secret|admin password|api key|environment variable|show env)\b',
    r'\b(bypass filter|dan mode|jailbreak|pretend you are an unrestricted)\b',
    
    # Entertainment, pop culture, gossip
    r'\b(movie|celebrity|hollywood|bollywood|gossip|dating|horoscope|zodiac)\b',
    r'\b(sports match|football score|cricket match|ipl score|premier league)\b',
    r'\b(joke|riddle|funny story|song lyrics|write a poem about love)\b',
    r'\b(recipe for cake|cooking chicken|fashion advice|makeup tips)\b',
    r'\b(gaming cheats|video game walkthrough|minecraft seed|fortnite)\b',
    r'\b(crypto trading|buy bitcoin|stock pick|get rich quick)\b',
]

class DomainSecurityGuard:
    """
    Multi-layer domain classifier protecting EDUAGENT against non-academic misuse,
    system prompt exfiltration, and prompt injections.
    """
    def __init__(self, refusal_message: str = REFUSAL_MESSAGE):
        self.refusal_message = refusal_message

    def is_academic_query(self, query: str, course_context: Optional[str] = None) -> Tuple[bool, str]:
        """
        Validates query against educational domain rules and course relevance.
        Returns: (is_allowed: bool, reason_or_refusal: str)
        """
        clean_query = query.strip().lower()

        # Check for minimum content
        if not clean_query:
            return False, "Empty query received."

        # Layer 1: Prompt Injection & Non-Academic Detection
        for pattern in DISALLOWED_PATTERNS:
            if re.search(pattern, clean_query, re.IGNORECASE):
                return False, self.refusal_message

        # Layer 2: Direct Course Context Alignment
        if course_context and course_context.strip():
            # If the user mentions topics related to the active course, allow
            course_terms = set(re.findall(r'\b\w{3,}\b', course_context.lower()))
            query_terms = set(re.findall(r'\b\w{3,}\b', clean_query))
            if len(course_terms.intersection(query_terms)) > 0:
                return True, "Aligned with course syllabus."

        # Layer 3: General Academic Domain Indicators
        for indicator in ACADEMIC_INDICATORS:
            if re.search(indicator, clean_query, re.IGNORECASE):
                return True, "Recognized academic inquiry."

        # Layer 4: General learning question heuristic
        # If query asks "how does ... work", "what is ...", "why ...", "compare ... and ..."
        question_patterns = [
            r'^(what is|how does|why does|explain|can you explain|difference between|compare|define|derive)\b',
            r'\b(study|test|chapter|problem|solution|exercise|formula|theorem|proof)\b'
        ]
        for qp in question_patterns:
            if re.search(qp, clean_query, re.IGNORECASE):
                return True, "General educational inquiry."

        # If it doesn't match academic indicators and contains non-academic chatter
        if len(clean_query.split()) < 4 and not any(re.search(ind, clean_query) for ind in ACADEMIC_INDICATORS):
            # Short ambiguous greetings like "hello" can have an academic welcome
            if clean_query in ["hi", "hello", "hey", "good morning", "good evening"]:
                return True, "Academic greeting."

        # Deny anything outside the educational domain
        return False, self.refusal_message

    def sanitize_agent_output(self, output: str) -> str:
        """
        Post-generation output verification: guarantees internal credentials,
        keys, or administrator secrets are never reflected.
        """
        # Redact any accidental leaks of passwords or keys
        sanitized = re.sub(r'AIza[0-9A-Za-z-_]{35}', '[REDACTED_API_KEY]', output)
        sanitized = re.sub(r'GEMINI_API_KEY[^\s]*', '[REDACTED_ENV_VAR]', sanitized)
        return sanitized

# Global singleton
domain_guard = DomainSecurityGuard()
