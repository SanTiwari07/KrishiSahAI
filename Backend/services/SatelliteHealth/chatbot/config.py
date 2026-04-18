"""
chatbot/config.py — Chatbot configuration loader
=================================================
Reads Ollama settings and session limits from environment variables.
Falls back to safe defaults so the backend starts without a .env.
"""
import os

# ── Ollama ────────────────────────────────────────────────────────────────────
OLLAMA_BASE_URL: str   = os.getenv("OLLAMA_BASE_URL",    "http://localhost:11434")
OLLAMA_MODEL: str      = os.getenv("OLLAMA_MODEL",       "llama3.2")
OLLAMA_TEMPERATURE: float = float(os.getenv("OLLAMA_TEMPERATURE", "0.7"))
OLLAMA_MAX_TOKENS: int    = int(os.getenv("OLLAMA_MAX_TOKENS",    "512"))

# ── Session management ────────────────────────────────────────────────────────
# Maximum number of messages stored per session before oldest are trimmed.
CHATBOT_MAX_HISTORY: int = int(os.getenv("CHATBOT_MAX_HISTORY", "20"))

# ── Logging ───────────────────────────────────────────────────────────────────
CHATBOT_LOG_LEVEL: str = os.getenv("CHATBOT_LOG_LEVEL", "INFO")
