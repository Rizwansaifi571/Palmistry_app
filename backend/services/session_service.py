import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict


SESSION_PRICE_INR = int(os.getenv("SESSION_PRICE_INR", "1000"))
SESSION_DURATION_MINUTES = int(os.getenv("SESSION_DURATION_MINUTES", "25"))
SESSION_MAX_QUESTIONS = int(os.getenv("SESSION_MAX_QUESTIONS", "10"))


_sessions: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(value: datetime | None) -> str | None:
    if not value:
        return None
    return value.isoformat().replace("+00:00", "Z")


def _is_expired(session: Dict[str, Any]) -> bool:
    expires_at = session.get("expiresAt")
    return bool(expires_at and _utc_now() >= expires_at)


def _public_session(session: Dict[str, Any]) -> Dict[str, Any]:
    questions_used = int(session.get("questionsUsed", 0))
    max_questions = int(session.get("maxQuestions", SESSION_MAX_QUESTIONS))
    remaining = max(0, max_questions - questions_used)

    status = "active"
    if not session.get("active", False):
        status = "ended"
    elif _is_expired(session):
        status = "expired"

    return {
        "sessionId": session["sessionId"],
        "customerName": session.get("customerName", ""),
        "language": session.get("language", "english"),
        "priceInr": session.get("priceInr", SESSION_PRICE_INR),
        "maxQuestions": max_questions,
        "remainingQuestions": remaining,
        "questionsUsed": questions_used,
        "durationMinutes": session.get("durationMinutes", SESSION_DURATION_MINUTES),
        "expiresAt": _to_iso(session.get("expiresAt")),
        "startedAt": _to_iso(session.get("startedAt")),
        "endedAt": _to_iso(session.get("endedAt")),
        "status": status,
    }


def start_paid_session(customer_name: str, language: str = "english") -> Dict[str, Any]:
    customer = (customer_name or "").strip()
    if not customer:
        raise ValueError("Customer name is required to start paid session.")

    now = _utc_now()
    session = {
        "sessionId": uuid.uuid4().hex,
        "customerName": customer,
        "language": language or "english",
        "priceInr": SESSION_PRICE_INR,
        "durationMinutes": SESSION_DURATION_MINUTES,
        "maxQuestions": SESSION_MAX_QUESTIONS,
        "questionsUsed": 0,
        "startedAt": now,
        "expiresAt": now + timedelta(minutes=SESSION_DURATION_MINUTES),
        "endedAt": None,
        "active": True,
    }

    with _lock:
        _sessions[session["sessionId"]] = session

    return _public_session(session)


def get_session(session_id: str) -> Dict[str, Any] | None:
    if not session_id:
        return None
    with _lock:
        session = _sessions.get(session_id)
        return _public_session(session) if session else None


def validate_active_session(session_id: str) -> Dict[str, Any]:
    if not session_id:
        raise ValueError("Session is required. Start a premium session first.")

    with _lock:
        session = _sessions.get(session_id)
        if not session:
            raise ValueError("Session not found. Please start a new paid session.")

        if not session.get("active", False):
            raise ValueError("Session already ended. Start a new premium session.")

        if _is_expired(session):
            session["active"] = False
            session["endedAt"] = _utc_now()
            raise ValueError("Session expired. Start a new premium session to continue.")

        return _public_session(session)


def consume_question(session_id: str) -> Dict[str, Any]:
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            raise ValueError("Session not found. Please start a new paid session.")

        if not session.get("active", False):
            raise ValueError("Session already ended. Start a new premium session.")

        if _is_expired(session):
            session["active"] = False
            session["endedAt"] = _utc_now()
            raise ValueError("Session expired. Start a new premium session to continue.")

        if session["questionsUsed"] >= session["maxQuestions"]:
            raise ValueError("Question limit reached for this paid session.")

        session["questionsUsed"] += 1
        return _public_session(session)


def end_paid_session(session_id: str) -> Dict[str, Any]:
    if not session_id:
        raise ValueError("sessionId is required.")

    with _lock:
        session = _sessions.get(session_id)
        if not session:
            raise ValueError("Session not found.")

        session["active"] = False
        session["endedAt"] = _utc_now()
        return _public_session(session)
