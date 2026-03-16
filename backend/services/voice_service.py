import os


def _safe_speed(value, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(0.75, min(1.35, number))

import requests


def synthesize_voice(text: str, language: str = "english", speed=None):
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID")
    if not api_key or not voice_id:
        return None

    selected = (language or "english").lower()
    language_hint = "Speak in Hindi naturally." if selected == "hindi" else ""
    if selected == "whatsapp":
        language_hint = "Speak in soft Hinglish with premium confidence."

    final_text = f"{language_hint} {text}".strip()

    default_speed = 0.98 if selected in {"hindi", "whatsapp"} else 1.03
    selected_speed = _safe_speed(speed, default_speed)

    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key,
        },
        json={
            "text": final_text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.72,
                "similarity_boost": 0.82,
                "style": 0.52,
                "use_speaker_boost": True,
                "speed": selected_speed,
            },
        },
        timeout=60,
    )

    if not response.ok:
        return None
    return response.content
