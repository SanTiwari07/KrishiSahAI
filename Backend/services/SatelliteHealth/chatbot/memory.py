"""
chatbot/memory.py — Thread-safe per-session conversation history
================================================================
Stores messages as [{role, content}] dicts.  Oldest pairs are trimmed when
the session exceeds CHATBOT_MAX_HISTORY messages so RAM stays bounded.
"""
from __future__ import annotations

import threading
from .config import CHATBOT_MAX_HISTORY

# ── In-process session store ──────────────────────────────────────────────────
_sessions: dict[str, list[dict[str, str]]] = {}
_lock = threading.Lock()


def get_history(session_id: str) -> list[dict[str, str]]:
    """Return a copy of the message history for the given session."""
    with _lock:
        return list(_sessions.get(session_id, []))


def append_message(session_id: str, role: str, content: str) -> None:
    """Append a message and trim oldest messages when over the limit."""
    with _lock:
        history = _sessions.setdefault(session_id, [])
        history.append({"role": role, "content": content})
        # Trim oldest entries when over limit
        while len(history) > CHATBOT_MAX_HISTORY:
            history.pop(0)


def clear_session(session_id: str) -> None:
    """Delete all history for a session."""
    with _lock:
        _sessions.pop(session_id, None)


def list_sessions() -> list[str]:
    """Return all active session IDs (for diagnostics)."""
    with _lock:
        return list(_sessions.keys())
