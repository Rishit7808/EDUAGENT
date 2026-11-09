"""
EDUAGENT Central Configuration Settings
"""
import os
from pathlib import Path
# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables safely
try:
    from dotenv import load_dotenv
    load_dotenv()
    if not os.getenv("GEMINI_API_KEY_1") and (BASE_DIR / ".env.example").exists():
        load_dotenv(BASE_DIR / ".env.example")
except ImportError:
    # Fallback to manual .env or .env.example parsing
    target_env = BASE_DIR / ".env" if (BASE_DIR / ".env").exists() else (BASE_DIR / ".env.example")
    if target_env.exists():
        with open(target_env, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
DOCUMENTS_DIR = STORAGE_DIR / "documents"
DATABASE_DIR = BASE_DIR / "database"
DB_PATH = DATABASE_DIR / "eduagent.db"

# Ensure runtime directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_DIR.mkdir(parents=True, exist_ok=True)

# Application Identity & Branding
APP_NAME = "EDUAGENT"
APP_TAGLINE = "Autonomous Intelligence for Education and Learning"
APP_VERSION = "2.0.0"

# Security & Access Control
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "118b")
JWT_SECRET = os.getenv("JWT_SECRET", "eduagent-super-secure-key-2026")

# Multi-Key Gemini API Configuration
# Prioritizes individual keys, then falls back to primary injected key
GEMINI_API_KEY_1 = os.getenv("GEMINI_API_KEY_1", "")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2", "")
GEMINI_API_KEY_3 = os.getenv("GEMINI_API_KEY_3", "")
PRIMARY_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

# Collect configured non-empty keys
CONFIGURED_GEMINI_KEYS = [
    key.strip()
    for key in [GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, PRIMARY_GEMINI_KEY]
    if key and key.strip() and key.strip() != "MY_GEMINI_API_KEY"
]

# Primary Gemini Flash Model ID (official current Google GenAI SDK model)
GEMINI_FLASH_MODEL = os.getenv("GEMINI_FLASH_MODEL", "gemini-3.1-flash-lite")

# YouTube Data API (optional)
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# Domain Restrictions
STRICT_DOMAIN_ENFORCEMENT = True
REFUSAL_MESSAGE = (
    "I am EDUAGENT, an academic learning assistant. I can only assist with "
    "educational subjects, syllabus-related questions and learning activities. "
    "Please start a new academic conversation with a relevant educational question."
)
