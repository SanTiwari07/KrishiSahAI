"""
chatbot/chain.py — LangChain + ChatOllama Chain Factory
=========================================================
Stateless LCEL chain: prompt | llm | str_parser.
History is injected at call time — no internal state.
"""
from __future__ import annotations

import logging
from typing import Any

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

from .config import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_TEMPERATURE,
    OLLAMA_MAX_TOKENS,
)

logger = logging.getLogger("chatbot.chain")

# ── LLM singleton ─────────────────────────────────────────────────────────────
_llm: ChatOllama | None = None


def _get_llm() -> ChatOllama:
    """Lazy-init and return the shared ChatOllama instance."""
    global _llm
    if _llm is None:
        logger.info(
            "Initialising ChatOllama — model=%s  base_url=%s",
            OLLAMA_MODEL,
            OLLAMA_BASE_URL,
        )
        _llm = ChatOllama(
            model=OLLAMA_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=OLLAMA_TEMPERATURE,
            num_predict=OLLAMA_MAX_TOKENS,
        )
    return _llm


# ── Chain builder ─────────────────────────────────────────────────────────────
def build_chain(system_prompt: str):
    """
    Return LCEL chain: prompt | llm | parser

    Input dict: { "history": [HumanMessage|AIMessage, ...], "input": str }
    Output: plain string reply.
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])
    return prompt | _get_llm() | StrOutputParser()


def history_to_messages(history: list[dict[str, str]]) -> list:
    """Convert [{role, content}] list to LangChain message objects."""
    msgs = []
    for msg in history:
        role    = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            msgs.append(HumanMessage(content=content))
        elif role == "assistant":
            msgs.append(AIMessage(content=content))
    return msgs


# ── Public invocation helper ──────────────────────────────────────────────────
def invoke_chain(
    system_prompt: str,
    history: list[dict[str, str]],
    user_input: str,
) -> str:
    """
    Build chain, inject history, run, and return reply string.

    Raises RuntimeError if Ollama is unreachable or returns empty.
    """
    chain      = build_chain(system_prompt)
    lc_history = history_to_messages(history)

    try:
        reply: str = chain.invoke({
            "history": lc_history,
            "input":   user_input,
        })
    except Exception as exc:
        logger.error("Ollama invocation failed: %s", exc, exc_info=True)
        raise RuntimeError(
            "Could not reach Ollama (local LLM for Krishi Mitra). "
            "Start Ollama (e.g. `ollama serve`) and ensure the configured model is pulled. "
            "Map and satellite analysis use the Flask backend only and do not need Ollama."
        ) from exc

    if not reply or not reply.strip():
        raise RuntimeError("I could not process that. Please try asking again.")

    return reply.strip()
