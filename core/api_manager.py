"""
Intelligent 3-Key Gemini API Manager with Failover and Rotation
"""
import time
import logging
from typing import List, Optional, Dict, Any
from config.settings import CONFIGURED_GEMINI_KEYS, GEMINI_FLASH_MODEL

logger = logging.getLogger("eduagent.api_manager")

class ApiKeyHealth:
    def __init__(self, key: str, index: int):
        self.masked_id = f"Key-{index + 1} (..{key[-4:] if len(key) >= 4 else '****'})"
        self._key = key
        self.is_healthy = True
        self.consecutive_failures = 0
        self.last_failure_time = 0.0
        self.total_calls = 0
        self.total_tokens = 0
        self.last_error = ""

    def get_key(self) -> str:
        return self._key

    def record_success(self):
        self.is_healthy = True
        self.consecutive_failures = 0
        self.total_calls += 1
        self.last_error = ""

    def record_failure(self, error_msg: str):
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        self.last_error = error_msg
        if self.consecutive_failures >= 2:
            self.is_healthy = False
            logger.warning(f"API key {self.masked_id} marked temporarily unhealthy: {error_msg}")

    def should_recover(self, cooldown_seconds: float = 60.0) -> bool:
        if not self.is_healthy and (time.time() - self.last_failure_time > cooldown_seconds):
            self.is_healthy = True
            self.consecutive_failures = 0
            logger.info(f"API key {self.masked_id} cooled down and restored to pool.")
            return True
        return self.is_healthy


class MultiKeyGeminiManager:
    """
    Intelligent manager for up to 3 Gemini API keys with round-robin rotation,
    automatic failover on 429 / Quota errors, exponential backoff, and health tracking.
    """
    def __init__(self, keys: Optional[List[str]] = None, model: str = GEMINI_FLASH_MODEL):
        raw_keys = keys if keys is not None else CONFIGURED_GEMINI_KEYS
        self.keys_pool: List[ApiKeyHealth] = [
            ApiKeyHealth(k, i) for i, k in enumerate(raw_keys)
        ]
        self.current_index = 0
        self.model = model
        self.total_failovers = 0
        self.max_retries_per_call = max(len(self.keys_pool), 1)

    def get_configured_count(self) -> int:
        return len(self.keys_pool)

    def get_status_summary(self) -> Dict[str, Any]:
        """Provides status without revealing secrets."""
        return {
            "configured_count": len(self.keys_pool),
            "active_index": self.current_index,
            "total_failovers": self.total_failovers,
            "model": self.model,
            "keys_status": [
                {
                    "masked_id": k.masked_id,
                    "is_healthy": k.is_healthy,
                    "total_calls": k.total_calls,
                    "consecutive_failures": k.consecutive_failures,
                    "last_error": k.last_error
                }
                for k in self.keys_pool
            ]
        }

    def execute_with_failover(self, task_fn):
        """
        Executes a task lambda (which takes an active api_key string) with automatic failover across keys.
        Handles quota errors, 429s, network glitches, with exponential backoff.
        """
        if not self.keys_pool:
            raise RuntimeError(
                "No Gemini API keys are configured. Please set GEMINI_API_KEY, "
                "GEMINI_API_KEY_1, GEMINI_API_KEY_2, or GEMINI_API_KEY_3."
            )

        attempts = 0
        backoff_delay = 1.0

        while attempts < len(self.keys_pool) * 2:
            # Check for cooldown recoveries
            for key_health in self.keys_pool:
                key_health.should_recover()

            # Select current key
            key_health = self.keys_pool[self.current_index]
            api_key = key_health.get_key()

            candidate_models = [self.model, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest']
            # Remove duplicates preserving order
            seen_models = set()
            unique_models = []
            for m in candidate_models:
                if m not in seen_models:
                    seen_models.add(m)
                    unique_models.append(m)

            model_succeeded = False
            last_model_error = ""

            for model_candidate in unique_models:
                try:
                    result = task_fn(api_key, model_candidate)
                    key_health.record_success()
                    self.current_index = (self.current_index + 1) % len(self.keys_pool)
                    return result
                except Exception as model_err:
                    err_text = str(model_err)
                    last_model_error = err_text
                    if "404" in err_text or "not found" in err_text.lower() or "no longer" in err_text.lower():
                        # Deprecated or unrecognized model name, try next candidate model immediately
                        continue
                    # For other errors (e.g. 429 rate limit or 503 high demand), break to failover key
                    break

            # If all models failed on this key, handle key failover
            err_str = last_model_error
            key_health.record_failure(err_str)
            self.total_failovers += 1
            attempts += 1

            # Log failure safely without exposing key
            logger.error(f"API Call failed on {key_health.masked_id}. Attempt {attempts}. Reason: {err_str[:120]}")

            # Rotate to next key
            self.current_index = (self.current_index + 1) % len(self.keys_pool)

            # If rate limit or quota exceeded, apply short exponential backoff
            if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                time.sleep(backoff_delay)
                backoff_delay = min(backoff_delay * 1.5, 8.0)

        raise RuntimeError(
            "All configured Gemini API keys are currently exhausted, rate-limited, or unreachable. "
            f"Attempted {attempts} failovers across {len(self.keys_pool)} keys."
        )

# Global singleton instance
gemini_manager = MultiKeyGeminiManager()
