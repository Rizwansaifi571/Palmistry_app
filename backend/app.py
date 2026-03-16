import base64
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from services.ai_service import analyze_palm, answer_follow_up
from services.session_service import (
    consume_question,
    end_paid_session,
    get_session,
    start_paid_session,
    validate_active_session,
)
from services.voice_service import synthesize_voice


load_dotenv()

app = Flask(__name__)
CORS(app)
REQUIRE_PAID_SESSION = os.getenv("REQUIRE_PAID_SESSION", "true").lower() == "true"


def _validate_payload(payload: Dict[str, Any], required_fields: List[str]) -> List[str]:
    return [field for field in required_fields if not payload.get(field)]


@app.get("/api/health")
def healthcheck():
    return jsonify(
        {
            "status": "ok",
            "provider": os.getenv("AI_PROVIDER", "demo"),
            "requirePaidSession": REQUIRE_PAID_SESSION,
        }
    )


@app.get("/")
def root():
    return jsonify(
        {
            "service": "AI Palmistry Backend",
            "status": "running",
            "health": "/api/health",
            "endpoints": [
                "/api/session/start",
                "/api/session/end",
                "/api/session/<session_id>",
                "/api/analyze",
                "/api/chat",
                "/api/voice",
            ],
        }
    )


@app.post("/api/session/start")
def start_session():
    payload = request.get_json(silent=True) or {}
    missing = _validate_payload(payload, ["name"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        session = start_paid_session(
            customer_name=payload["name"],
            language=payload.get("language", "english"),
        )
        return jsonify({"session": session})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/session/end")
def end_session():
    payload = request.get_json(silent=True) or {}
    missing = _validate_payload(payload, ["sessionId"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        session = end_paid_session(payload["sessionId"])
        return jsonify({"session": session})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/session/<session_id>")
def get_session_status(session_id: str):
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found."}), 404
    return jsonify({"session": session})


@app.post("/api/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    missing = _validate_payload(payload, ["image", "name"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    session_state = None
    session_id = payload.get("sessionId")
    if REQUIRE_PAID_SESSION:
        try:
            session_state = validate_active_session(session_id)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 402
    elif session_id:
        try:
            session_state = validate_active_session(session_id)
        except ValueError:
            session_state = None

    try:
        reading = analyze_palm(
            image_data=payload["image"],
            user_name=payload["name"],
            language=payload.get("language", "english"),
        )
        if session_state:
            reading["_session"] = session_state
        return jsonify(reading)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Palm analysis failed: {exc}"}), 500


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    missing = _validate_payload(payload, ["question", "reading", "name"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    session_state = None
    session_id = payload.get("sessionId")
    if REQUIRE_PAID_SESSION:
        try:
            session_state = validate_active_session(session_id)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 402
    elif session_id:
        try:
            session_state = validate_active_session(session_id)
        except ValueError:
            session_state = None

    history = payload.get("history", [])
    try:
        response = answer_follow_up(
            question=payload["question"],
            previous_reading=payload["reading"],
            user_name=payload["name"],
            history=history,
            language=payload.get("language", "english"),
        )
        if session_state:
            response["_session"] = consume_question(session_id)
        return jsonify(response)
    except Exception as exc:
        return jsonify({"error": f"Q&A failed: {exc}"}), 500


@app.post("/api/voice")
def voice():
    payload = request.get_json(silent=True) or {}
    missing = _validate_payload(payload, ["text"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    session_id = payload.get("sessionId")
    if REQUIRE_PAID_SESSION:
        try:
            validate_active_session(session_id)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 402

    audio = synthesize_voice(
        text=payload["text"],
        language=payload.get("language", "english"),
        speed=payload.get("speed"),
    )
    if not audio:
        return jsonify({"audio": None, "provider": "browser"})

    return jsonify(
        {
            "audio": base64.b64encode(audio).decode("utf-8"),
            "mimeType": "audio/mpeg",
            "provider": "elevenlabs",
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
