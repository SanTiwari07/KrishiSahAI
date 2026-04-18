"""
chatbot/routes.py — Flask Blueprint for Krishi Mitra Chat API
===============================================================
HTTP interface only — no LangChain or prompt logic in here.
All business logic is delegated to chain.py, memory.py, and prompts.py.

Endpoints
---------
POST /chatbot/chat
    Body:  { "session_id": str, "message": str,
             "farmData": {...}, "heatmapData": {...} }
    Reply: { "reply": str, "session_id": str }

POST /chatbot/reset
    Body:  { "session_id": str }
    Reply: { "ok": true }

GET  /chatbot/health
    Reply: { "status": "ok", "model": "...", "base_url": "..." }
"""
from __future__ import annotations

import logging
import uuid

from flask import Blueprint, request, jsonify

from .chain import invoke_chain
from .memory import append_message, clear_session, get_history
from .config import OLLAMA_MODEL, OLLAMA_BASE_URL
from .prompts import build_system_prompt

logger = logging.getLogger("chatbot.routes")

# ── Fallback data (used when frontend doesn't send context) ───────────────────
_FALLBACK_FARM = {
    "fieldName":   "Unknown Field",
    "area":        0,
    "date":        "Unknown",
    "confidence":  0,
    "cleanScenes": 0,
    "cvi":         0,
    "ndvi":        0,
    "evi":         0,
    "savi":        0,
    "ndmi":        0,
    "gndvi":       0,
}

_FALLBACK_HEATMAP = {
    "stressedPct":      0,
    "stressedLocation": "the field",
    "moderatePct":      0,
    "moderateLocation": "the field",
    "healthyPct":       0,
    "healthyLocation":  "the field",
}

# ── Blueprint ─────────────────────────────────────────────────────────────────
chatbot_bp = Blueprint("krishi_mitra_chatbot", __name__, url_prefix="/chatbot")


# ── POST /chatbot/chat ────────────────────────────────────────────────────────
@chatbot_bp.route("/chat", methods=["POST"])
def chat():
    body         = request.get_json(silent=True) or {}
    user_message = (body.get("message") or "").strip()
    session_id   = (body.get("session_id") or "").strip() or str(uuid.uuid4())

    farm_data    = body.get("farmData")    or _FALLBACK_FARM
    heatmap_data = body.get("heatmapData") or _FALLBACK_HEATMAP

    if not user_message:
        return jsonify({"error": "message field is required and must not be empty."}), 400

    # Build system prompt dynamically (it embeds current farm stats)
    system_prompt = build_system_prompt(farm_data, heatmap_data)

    # Retrieve history BEFORE appending the new user message
    history = get_history(session_id)

    logger.info(
        "[session=%s] User: %d chars | history depth=%d",
        session_id[:8], len(user_message), len(history),
    )

    try:
        reply = invoke_chain(system_prompt, history, user_message)
    except RuntimeError as exc:
        logger.warning("[session=%s] Chain error: %s", session_id[:8], exc)
        return jsonify({"error": str(exc), "session_id": session_id}), 502

    # Persist both turns only after a successful reply
    append_message(session_id, "user",      user_message)
    append_message(session_id, "assistant", reply)

    logger.info("[session=%s] Assistant replied (%d chars).", session_id[:8], len(reply))
    return jsonify({"reply": reply, "session_id": session_id}), 200


# ── POST /chatbot/reset ───────────────────────────────────────────────────────
@chatbot_bp.route("/reset", methods=["POST"])
def reset():
    """Clear conversation history for a session."""
    body       = request.get_json(silent=True) or {}
    session_id = (body.get("session_id") or "").strip()

    if not session_id:
        return jsonify({"error": "session_id is required."}), 400

    clear_session(session_id)
    logger.info("[session=%s] Session cleared.", session_id[:8])
    return jsonify({"ok": True, "session_id": session_id}), 200


# ── GET /chatbot/health ───────────────────────────────────────────────────────
@chatbot_bp.route("/health", methods=["GET"])
def health():
    """Quick liveness check — does not ping Ollama."""
    return jsonify({
        "status":   "ok",
        "model":    OLLAMA_MODEL,
        "base_url": OLLAMA_BASE_URL,
    }), 200
