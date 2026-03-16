import base64
import json
import os
import re
from textwrap import dedent
from typing import Any, Dict, List

import requests
from openai import OpenAI


PALM_PROMPT = dedent(
    """
    You are "Sage Aarav" — a world-renowned palmist who has read over 50,000 palms across 30 countries, combining ancient Vedic chirology with modern psychological profiling.

    You are analyzing a REAL photograph of someone's palm. Study it carefully. Look for:
    - Life line: length, depth, curve, breaks, islands, chained sections
    - Heart line: direction, length, forks, markings, curve toward Jupiter mount
    - Head line: angle, depth, slope, separation from life line
    - Fate/Saturn line: presence, clarity, starting point, breaks
    - Sun/Apollo line: success and recognition indicator
    - Mounts: Venus (love/vitality), Jupiter (ambition/leadership), Saturn (discipline/karma), Sun (creativity/fame), Mercury (business/communication), Moon (intuition/imagination), Mars (courage/aggression)
    - Special markings: stars, triangles, squares, crosses, grilles, islands

    Generate a PREMIUM, deeply personalized reading for: {user_name}

    RULES for a truly premium reading:
    1. Mention at least 3 specific palm features you can observe (e.g., "your heart line curves sharply toward the Jupiter mount...", "the forked fate line at the midpoint...")
    2. Include time-based predictions with specificity: "In the next 3–6 months...", "By mid-next year..."
    3. Use surprising, specific language: "Only about 9% of palms carry this formation..."
    4. Show how lines interact: "The early separation of your head and life lines confirms..."
    5. Every sentence should feel private and confidential — like only this palm can reveal this
    6. The cosmicWarning must be a genuine, specific caution only visible in this palm
    7. The yearsForecast must have specific energy themes and timing
    8. Include ALL 6 reading sections: personality, career, finance, love, health, luck
    9. Each section must be 4–5 rich, specific sentences — no filler, no vague platitudes
    10. Focus on near-term trust-building timelines (next 2 weeks to next 12 months)
    11. Do NOT use age-band predictions like "35-40", "40-45", or "at age 30"

    Return ONLY raw JSON (no markdown, no backticks, no ```json, just the JSON object):
    {{
      "headline": "dramatic cinematic title — max 12 words",
      "intro": "3–4 sentence deeply personalized opening referencing specific observed palm features",
      "revealingInsight": "one cinematic, goosebump-worthy sentence revealing something unexpected about this person — a secret only this palm holds",
      "cosmicWarning": "one specific, honest caution this palm reveals — a blind spot or risk — important for them to hear, not scary",
      "yearsForecast": "2–3 sentences about what the next 12 months hold based on the palm — specific themes, energy shifts, timing",
      "luckyNumbers": [n1, n2, n3],
      "luckyColor": "one evocative color name",
      "luckyMonth": "month name",
      "starRatings": {{
        "personality": 4,
        "career": 4,
        "finance": 3,
        "love": 5,
        "health": 4,
        "luck": 3
      }},
      "sections": {{
        "personality": "4–5 sentences referencing personality traits visible in mounts and line formations",
        "career": "4–5 sentences with timing, specific opportunity indicators from fate/sun line",
        "finance": "4–5 sentences with specific financial patterns — abundance periods, caution zones",
        "love": "4–5 sentences about relationship energy and compatibility from heart line and Venus mount",
        "health": "4–5 sentences about vitality and energy patterns from the life line and health indicators",
        "luck": "4–5 sentences about fortune windows, lucky periods, and timing indicators"
      }}
    }}
    """
).strip()


QA_PROMPT = dedent(
    """
    You are "Sage Aarav" — a world-renowned palmist conducting a private premium session.

    The completed palm reading for {user_name}:
    {previous_reading}

    The client's question:
    {user_question}

    Guidelines:
    - Answer with authority and warmth — you already know their palm intimately
    - Reference specific elements from their reading when relevant
    - Give time-specific guidance when possible ("In the coming weeks...", "Before year's end...")
    - Include one practical action step alongside the mystical insight
    - Be concise but impactful — 3–4 sentences maximum, never vague
    - Use {user_name}'s name naturally once
    - Feel premium and exclusive — not like a chatbot, but like a trusted private guide
    - STRICT LANGUAGE COMPLIANCE: reply only in the selected session language/style from the language directive
    - If language is whatsapp: use only clean Roman Hinglish, no Devanagari, no awkward spellings, and no fully formal English paragraph
    - If language is whatsapp: do not use shortcuts/slang abbreviations like "u", "yr", "tmh", "bcoz", "btw"
    - Give near-term guidance only (weeks/months), avoid age-band predictions
    """
).strip()


PALM_VALIDATION_PROMPT = dedent(
        """
        You are an image gatekeeper for a palm-reading app.
        Decide if the uploaded image is valid for palm reading.

        Accept only when:
        - A clear open human palm is visible as the main subject.

        Reject when:
        - Face/selfie photo
        - Object/scenery/screenshot
        - Palm not visible clearly
        - Blurry/too dark/noisy image

        If unsure, reject.

        Return ONLY JSON:
        {
            "isPalm": true or false,
            "confidence": 0.0 to 1.0,
            "reason": "short reason"
        }
        """
).strip()


def _language_instructions(language: str) -> str:
    choice = (language or "english").lower()
    if choice == "hindi":
        return (
            "Write entirely in natural Hindi (Devanagari). "
            "Keep tone respectful, warm, and spiritually confident."
        )
    if choice == "whatsapp":
        return (
            "Write in concise WhatsApp-style Hinglish using Roman Hindi + simple English only. "
            "Do NOT use Devanagari script. Keep spellings clean and natural (for example, use 'Agle', not 'Agne'). "
            "Keep it friendly, confident, premium, typo-free, and never use shortcut spellings like u/yr/tmh."
        )
    return "Write in polished, premium English."


def _strip_data_uri(image_data: str) -> str:
    if "," not in image_data:
        return image_data
    return image_data.split(",", 1)[1]


def _is_valid_base64_image(value: str) -> bool:
    if not value:
        return False
    try:
        base64.b64decode(value, validate=True)
        return True
    except Exception:
        return False


def _decoded_image_size(value: str) -> int:
    try:
        return len(base64.b64decode(value, validate=True))
    except Exception:
        return 0


def _normalize_text_for_language(text: str, language: str) -> str:
    if not isinstance(text, str):
        return text

    normalized = text.strip()
    choice = (language or "english").lower()
    if choice != "whatsapp":
        return normalized

    replacements = [
        ("Agne", "Agle"),
        ("agne", "agle"),
        ("aankhe", "ankhen"),
        ("Aankhe", "Ankhen"),
        ("haath ki aankhe", "haath ki rekhaen"),
        ("haath ki aankhon", "haath ki rekhaon"),
        ("paaya jane", "paaye jane"),
    ]
    for wrong, correct in replacements:
        normalized = normalized.replace(wrong, correct)

    spelling_fixes = [
        (r"\bu\b", "aap"),
        (r"\byr\b", "aapki"),
        (r"\btmh\b", "tum"),
        (r"\btmre\b", "tumhare"),
        (r"\btmhre\b", "tumhare"),
        (r"\btmhari\b", "tumhari"),
        (r"\btmhari\b", "tumhari"),
        (r"\bmeh\b", "mein"),
        (r"\bdevoloped\b", "developed"),
        (r"\bjese\b", "jaise"),
        (r"\br\b", "are"),
        (r"\bph\b", "percent"),
    ]
    for pattern, replacement in spelling_fixes:
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def _contains_devanagari(text: str) -> bool:
    return bool(re.search(r"[\u0900-\u097F]", text or ""))


def _rewrite_to_clean_whatsapp(text: str, provider: str) -> str:
    rewrite_prompt = (
        "Rewrite this answer into clean Roman Hinglish (WhatsApp style). "
        "Keep the original meaning and practical guidance. "
        "Do not use any Devanagari characters. "
        "Keep it concise and premium. Return only rewritten text.\n\n"
        f"Text:\n{text}"
    )

    if provider == "openai" and os.getenv("OPENAI_API_KEY"):
        rewritten = _chat_with_openai(
            [
                {"role": "system", "content": "You rewrite text exactly as instructed."},
                {"role": "user", "content": rewrite_prompt},
            ]
        ).strip()
        if rewritten:
            return rewritten

    if provider == "gemini" and os.getenv("GEMINI_API_KEY"):
        rewritten = _chat_with_gemini(rewrite_prompt).strip()
        if rewritten:
            return rewritten

    if provider == "groq" and os.getenv("GROQ_API_KEY"):
        rewritten = _chat_with_groq(
            [
                {"role": "system", "content": "You rewrite text exactly as instructed."},
                {"role": "user", "content": rewrite_prompt},
            ]
        ).strip()
        if rewritten:
            return rewritten

    return text


def _enforce_chat_language(answer: str, language: str, provider: str) -> str:
    normalized = _normalize_text_for_language(answer, language)
    if (language or "english").lower() == "whatsapp":
        if _contains_devanagari(normalized) or _needs_whatsapp_rewrite(normalized):
            rewritten = _rewrite_to_clean_whatsapp(normalized, provider)
            normalized = _normalize_text_for_language(rewritten, language)
            if _contains_devanagari(normalized):
                normalized = re.sub(r"[\u0900-\u097F]", "", normalized)
                normalized = re.sub(r"\s+", " ", normalized).strip()

        if _needs_whatsapp_rewrite(normalized):
            normalized = _normalize_text_for_language(
                "Tumhare sawal ka signal clear hai: agle kuch mahino mein focused action loge to result jaldi dikhega. "
                "Confusion se zyada consistency pe kaam karo.",
                language,
            )
    return normalized


def _normalize_reading_for_language(reading: Dict[str, Any], language: str) -> Dict[str, Any]:
    normalized = dict(reading)

    scalar_fields = [
        "headline",
        "intro",
        "revealingInsight",
        "cosmicWarning",
        "yearsForecast",
        "luckyColor",
        "luckyMonth",
    ]
    for field in scalar_fields:
        if isinstance(normalized.get(field), str):
            normalized[field] = _normalize_text_for_language(normalized[field], language)

    sections = normalized.get("sections")
    if isinstance(sections, dict):
        normalized["sections"] = {
            key: _normalize_text_for_language(value, language) if isinstance(value, str) else value
            for key, value in sections.items()
        }

    return normalized


def _needs_whatsapp_rewrite(text: str) -> bool:
    if not isinstance(text, str):
        return False

    if _contains_devanagari(text):
        return True

    tokens = re.findall(r"[A-Za-z']+", text.lower())
    if len(tokens) < 12:
        return False

    english_markers = {
        "the", "and", "your", "you", "will", "with", "this", "that", "for", "from",
        "about", "next", "months", "career", "financial", "relationship", "energy", "future",
    }
    hinglish_markers = {
        "hai", "hain", "ka", "ki", "ke", "tum", "aap", "mera", "meri", "mein", "se",
        "nahi", "hoga", "karo", "kar", "abhi", "agle", "ya", "pe", "apna", "kyun",
    }

    english_count = sum(1 for token in tokens if token in english_markers)
    hinglish_count = sum(1 for token in tokens if token in hinglish_markers)
    return english_count >= 4 and english_count >= (hinglish_count * 2)


def _enforce_reading_language(reading: Dict[str, Any], language: str, provider: str) -> Dict[str, Any]:
    normalized = _normalize_reading_for_language(reading, language)
    if (language or "english").lower() != "whatsapp":
        return normalized

    target_fields = ["headline", "intro", "revealingInsight", "cosmicWarning", "yearsForecast"]
    for field in target_fields:
        value = normalized.get(field)
        if isinstance(value, str):
            current = value
            if _needs_whatsapp_rewrite(current):
                current = _rewrite_to_clean_whatsapp(current, provider)
            current = _normalize_text_for_language(current, language)
            if _needs_whatsapp_rewrite(current):
                current = _normalize_text_for_language(
                    _rewrite_to_clean_whatsapp(current, provider),
                    language,
                )
            normalized[field] = current

    sections = normalized.get("sections")
    if isinstance(sections, dict):
        updated = {}
        for key, value in sections.items():
            if isinstance(value, str):
                current = value
                if _needs_whatsapp_rewrite(current):
                    current = _rewrite_to_clean_whatsapp(current, provider)
                current = _normalize_text_for_language(current, language)
                if _needs_whatsapp_rewrite(current):
                    current = _normalize_text_for_language(
                        _rewrite_to_clean_whatsapp(current, provider),
                        language,
                    )
                updated[key] = current
            else:
                updated[key] = value
        normalized["sections"] = updated

    if any(_needs_whatsapp_rewrite(v) for v in [
        normalized.get("intro", ""),
        normalized.get("revealingInsight", ""),
        normalized.get("cosmicWarning", ""),
        normalized.get("yearsForecast", ""),
    ] if isinstance(v, str)):
        normalized = _normalize_reading_for_language(_demo_reading("Seeker", "whatsapp"), "whatsapp")

    return normalized


def _remove_age_band_claims(text: str, language: str) -> str:
    if not isinstance(text, str):
        return text

    result = text
    replacement = "in the coming months"
    if (language or "english").lower() in {"hindi", "whatsapp"}:
        replacement = "agle kuch mahino mein"

    result = re.sub(r"\b\d{2}\s*[-–]\s*\d{2}\b", replacement, result)
    result = re.sub(r"\b(?:at|around|by)\s+age\s+\d{2}\b", replacement, result, flags=re.IGNORECASE)
    result = re.sub(r"\b(?:age|ages)\s+\d{2}\s*[-–]\s*\d{2}\b", replacement, result, flags=re.IGNORECASE)

    if (language or "english").lower() == "whatsapp":
        result = result.replace("years", "mahine")
        result = result.replace("year", "mahina")

    return re.sub(r"\s+", " ", result).strip()


def _enforce_near_term_reading(reading: Dict[str, Any], language: str) -> Dict[str, Any]:
    normalized = dict(reading)

    for field in ["headline", "intro", "revealingInsight", "cosmicWarning", "yearsForecast"]:
        value = normalized.get(field)
        if isinstance(value, str):
            normalized[field] = _remove_age_band_claims(value, language)

    sections = normalized.get("sections")
    if isinstance(sections, dict):
        normalized["sections"] = {
            key: _remove_age_band_claims(value, language) if isinstance(value, str) else value
            for key, value in sections.items()
        }

    return normalized


def _enforce_near_term_chat(answer: str, language: str) -> str:
    return _remove_age_band_claims(answer, language)


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return {}
    try:
        return json.loads(raw_text[start : end + 1])
    except Exception:
        return {}


def _parse_validation_result(raw_text: str) -> Dict[str, Any]:
    data = _extract_json_object(raw_text)
    is_palm = bool(data.get("isPalm", False))
    confidence_raw = data.get("confidence", 0)
    try:
        confidence = float(confidence_raw)
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))
    reason = str(data.get("reason", "Unable to verify palm image.")).strip()
    return {
        "isPalm": is_palm,
        "confidence": confidence,
        "reason": reason or "Unable to verify palm image.",
    }


def _validate_palm_with_openai(image_data: str) -> Dict[str, Any]:
    client = _openai_client()
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": PALM_VALIDATION_PROMPT},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{image_data}",
                    },
                ],
            }
        ],
    )
    raw_text = getattr(response, "output_text", "") or ""
    return _parse_validation_result(raw_text)


def _validate_palm_with_gemini(image_data: str) -> Dict[str, Any]:
    raw_text = _gemini_request(
        [
            {"text": PALM_VALIDATION_PROMPT},
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": image_data,
                }
            },
        ]
    )
    return _parse_validation_result(raw_text)


def _validate_palm_with_groq(image_data: str) -> Dict[str, Any]:
    raw_text = _groq_request(
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PALM_VALIDATION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_data}",
                        },
                    },
                ],
            }
        ]
    )
    return _parse_validation_result(raw_text)


def _assert_palm_image_or_raise(image_data: str):
    provider = os.getenv("AI_PROVIDER", "demo").lower()
    strict_validation = os.getenv("STRICT_PALM_VALIDATION", "true").lower() == "true"
    result = None

    try:
        if provider == "openai" and os.getenv("OPENAI_API_KEY"):
            result = _validate_palm_with_openai(image_data)
        elif provider == "gemini" and os.getenv("GEMINI_API_KEY"):
            result = _validate_palm_with_gemini(image_data)
        elif provider == "groq" and os.getenv("GROQ_API_KEY"):
            result = _validate_palm_with_groq(image_data)
        elif strict_validation:
            raise ValueError("Palm verification unavailable. Configure an AI provider and try again.")
    except ValueError:
        raise
    except Exception:
        raise ValueError("Could not verify palm image. Please capture a clear open palm photo and retry.")

    if not result:
        return

    if (not result.get("isPalm")) or float(result.get("confidence", 0)) < 0.86:
        reason = result.get("reason", "Image is not a clear palm photo.")
        raise ValueError(f"Please upload a clear palm photo only (no face/selfie). {reason}")


def _json_or_fallback(raw_text: str, user_name: str, language: str) -> Dict[str, Any]:
    try:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw_text[start : end + 1])
    except json.JSONDecodeError:
        pass
    return _demo_reading(user_name, language)


def _reading_with_meta(
    reading: Dict[str, Any],
    mode: str,
    provider: str,
    reason: str | None = None,
) -> Dict[str, Any]:
    enriched = dict(reading)
    enriched["_meta"] = {
        "mode": mode,
        "provider": provider,
    }
    if reason:
        enriched["_meta"]["reason"] = reason
    return enriched


def _chat_with_meta(
    answer: str,
    mode: str,
    provider: str,
    reason: str | None = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "answer": answer,
        "_meta": {
            "mode": mode,
            "provider": provider,
        },
    }
    if reason:
        payload["_meta"]["reason"] = reason
    return payload


def _demo_reading(user_name: str, language: str) -> Dict[str, Any]:
    name = user_name.strip() or "Seeker"
    selected = (language or "english").lower()

    if selected == "hindi":
        return {
            "headline": f"{name} की नियति रेखा का अनकहा रहस्य",
            "intro": (
                f"{name}, आपकी हथेली में जीवन रेखा की गहरी और स्पष्ट लकीर बताती है कि आप "
                "ऊर्जा और जीवटता से भरे व्यक्ति हैं। शनि पर्वत की उभरी हुई स्थिति से साफ है कि "
                "आप अनुशासन और दृढ़ता के बल पर ही बड़े लक्ष्य पाते हैं। भाग्य रेखा का ऊपर की ओर "
                "झुकाव अगले 6-9 महीनों में एक महत्वपूर्ण मोड़ की भविष्यवाणी करता है।"
            ),
            "revealingInsight": (
                f"केवल 11% हथेलियों में यह संकेत दिखता है — {name}, आपके भीतर एक ऐसी शक्ति है "
                "जो अभी तक खुद आपको भी पूरी तरह नहीं पता।"
            ),
            "cosmicWarning": (
                "बुध पर्वत पर हल्की सी ग्रिल लाइन दिखती है — यह संकेत है कि आप कभी-कभी "
                "जरूरत से ज्यादा सोचते हैं और सही समय पर निर्णय लेने में पीछे रह जाते हैं। "
                "अगले 3 महीने अनावश्यक विश्लेषण की बजाय त्वरित कार्रवाई की मांग करते हैं।"
            ),
            "yearsForecast": (
                "अगले 12 महीने पुनर्निर्माण और नई शुरुआत के हैं। सितंबर-अक्टूबर का समय "
                "विशेष रूप से करियर और आर्थिक दृष्टि से उन्नति का संकेत देता है। "
                "व्यक्तिगत संबंधों में एक गहरा और टिकाऊ बदलाव आने वाला है।"
            ),
            "luckyNumbers": [7, 14, 33],
            "luckyColor": "नीला",
            "luckyMonth": "सितंबर",
            "starRatings": {
                "personality": 4,
                "career": 4,
                "finance": 3,
                "love": 5,
                "health": 4,
                "luck": 3,
            },
            "sections": {
                "personality": (
                    "आपकी हृदय रेखा बृहस्पति पर्वत की ओर मुड़ती है, जो आदर्शवादी और भावनात्मक रूप से गहरे स्वभाव का प्रतीक है। "
                    "आप भीड़ में जाने के बजाय अपनी ऊर्जा चुनिंदा लोगों पर लगाते हैं। "
                    "शुक्र पर्वत की स्थिति बताती है कि आपके भीतर असाधारण सहानुभूति और रचनात्मकता छुपी है। "
                    "मस्तिष्क रेखा का थोड़ा नीचे की ओर झुकाव कल्पनाशीलता और अंतर्ज्ञान की असामान्य क्षमता दर्शाता है।"
                ),
                "career": (
                    "भाग्य रेखा की स्पष्टता बताती है कि अगले 6 महीनों में करियर में एक महत्वपूर्ण अवसर सामने आएगा। "
                    "सूर्य रेखा की मौजूदगी यह स्पष्ट करती है कि आप जहाँ भी रचनात्मकता का उपयोग करेंगे, वहाँ पहचान मिलेगी। "
                    "आपकी सबसे बड़ी उन्नति तब होगी जब आप नेतृत्व या दृश्यमान भूमिका चुनेंगे, न कि परदे के पीछे काम करेंगे। "
                    "वर्ष के अंत तक एक ऐसा प्रस्ताव आएगा जो आपकी दिशा पूरी तरह बदल सकता है।"
                ),
                "finance": (
                    "हथेली पर धन रेखाएँ बताती हैं कि आपका वित्तीय विकास एकमुश्त नहीं, बल्कि धीरे-धीरे और मजबूती से होगा। "
                    "अगले 9 महीनों में एक ऐसा अवसर आएगा जो ठीक से पकड़ा जाए तो दीर्घकालिक स्थायित्व देगा। "
                    "मई से अगस्त के बीच आर्थिक सावधानी जरूरी है — बड़े निवेश के निर्णय देरी से लेना फायदेमंद होगा। "
                    "बुध पर्वत का संकेत है कि व्यापार या साझेदारी में आपकी बातचीत की शक्ति ही सबसे बड़ी संपत्ति है।"
                ),
                "love": (
                    "आपकी हृदय रेखा की लंबाई और गहराई बताती है कि आप प्रेम में पूरी तरह समर्पित होते हैं। "
                    "आप सतही आकर्षण नहीं, बल्कि भावनात्मक समझ और विश्वास की नींव पर रिश्ता बनाते हैं। "
                    "अगले 6 महीनों में एक ऐसा रिश्ता गहरा होगा जो आपको भीतर से बदल देगा। "
                    "शुक्र पर्वत पर स्पष्ट रेखा यह भी बताती है कि आपकी जिंदगी में प्रेम एक परिवर्तनकारी शक्ति बनने वाला है।"
                ),
                "health": (
                    "जीवन रेखा की गहराई और स्पष्टता एक मजबूत जीवन शक्ति और अच्छी रोग-प्रतिरोध क्षमता का संकेत देती है। "
                    "बीच में एक हल्का द्वीप चिन्ह दिखता है — यह थकान और तनाव के एक छोटे दौर की संभावना है, जो प्रबंधनीय है। "
                    "नियमित दिनचर्या और पर्याप्त नींद के साथ आपकी ऊर्जा असाधारण स्तर तक पहुँच सकती है। "
                    "मंगल पर्वत की स्थिति बताती है कि शारीरिक गतिविधि और व्यायाम आपके लिए सबसे अच्छी दवा है।"
                ),
                "luck": (
                    "हथेली पर सूर्य रेखा और भाग्य रेखा का मिलन बिंदु एक विशेष भाग्यशाली अवधि की ओर इशारा करता है। "
                    "सितंबर और अक्टूबर इस वर्ष आपके सबसे शुभ महीने हैं — नए प्रयास इसी अवधि में शुरू करें। "
                    "चंद्र पर्वत की उपस्थिति बताती है कि आपका सहज ज्ञान आपको सही समय पर सही जगह ले जाता है। "
                    "भाग्यशाली अंक 7, 14 और 33 आपकी जिंदगी में महत्वपूर्ण मोड़ों पर बार-बार प्रकट होंगे।"
                ),
            },
        }

    if selected == "whatsapp":
        return {
            "headline": f"{name} ka Hidden Destiny — Unlocked",
            "intro": (
                f"{name}, teri palm dekh ke ek cheez toh seedha clear hai — teri life line deep aur "
                "unbroken hai, matlab teri life force seriously strong hai. Jupiter mount ka vibe "
                "bol raha hai ki tujh mein leadership quality hai jo abhi poori tarah use nahi ho rahi. "
                "Fate line ka angle next 6-9 months mein ek major turning point indicate kar raha hai."
            ),
            "revealingInsight": (
                f"Sirf 11% palms mein yeh combination hota hai — {name}, tere andar ek rare "
                "creator energy hai jo log baad mein realize karte hain tha kya potential tha is insaan mein."
            ),
            "cosmicWarning": (
                "Mercury mount pe thodi si grille dikh rahi hai — yeh sign hai ki tu kabhi kabhi "
                "overthink karta/karti hai aur sahi time pe action lene mein thoda late ho jaata/jaati hai. "
                "Agle 3 months mein analysis se zyada execution pe focus karna padega."
            ),
            "yearsForecast": (
                "Agla 1 saal reinvention mode mein hai for you. September-October window "
                "career aur money ke liye especially strong hai. "
                "Personal relationships mein bhi ek deep shift aane wali hai jo genuinely life-changing hogi."
            ),
            "luckyNumbers": [7, 14, 33],
            "luckyColor": "Midnight Blue",
            "luckyMonth": "September",
            "starRatings": {
                "personality": 4,
                "career": 4,
                "finance": 3,
                "love": 5,
                "health": 4,
                "luck": 3,
            },
            "sections": {
                "personality": (
                    "Teri heart line Jupiter mount ki taraf curve karti hai — yeh rare hai and means "
                    "ki tu relationships mein idealistic aur emotionally deep hai. "
                    "Tu observations se move karta/karti hai, impulsive nahi — yeh actually ek superpower hai. "
                    "Venus mount ka vibe strong hai, matlab empathy aur creativity tere natural assets hain. "
                    "Head line ka slight downward slope bol raha hai imagination aur intuition — teri thinking genuinely different hai."
                ),
                "career": (
                    "Fate line clear aur deep hai — next 6 months mein ek solid career opportunity surface karegi. "
                    "Sun line ki presence confirm karti hai ki tujhe recognition tab milegi jab tu creative ya leadership role lega/legi. "
                    "Agla bada jump tab aayega jab tu safe play se nikal ke visible position choose karega/karegi. "
                    "Year end ke around ek proposal ya offer aayega jo teri direction completely change kar sakta hai — don't ignore it."
                ),
                "finance": (
                    "Palm pe wealth lines indicate karti hain ki tera financial growth ek saath nahi, "
                    "gradually build hoga — but very solid foundation ke saath. "
                    "Agle 9 months mein ek high-impact opportunity aayegi — agar usse properly grab kiya toh long-term stability confirm hai. "
                    "May se August ke beech large investments avoid karna better hoga — timing important hai. "
                    "Mercury mount ka hint hai ki negotiation aur communication skills tere liye sabse bada financial tool hai."
                ),
                "love": (
                    "Teri heart line ki length aur depth bolta hai ki tu love mein fully committed hota/hoti hai, "
                    "half-hearted nahi. Tu surface level attraction pe nahi, emotional understanding pe relationship build karta/karti hai. "
                    "Agles 6 months mein ek connection itna deepen hoga ki tu genuinely change feel karega/karegi. "
                    "Venus mount pe clear line hai — love teri life mein ek transformative force ki tarah kaam karega."
                ),
                "health": (
                    "Life line deep aur unbroken hai — teri physical energy aur immunity naturally strong hai. "
                    "Beech mein ek faint island dikh raha hai — yeh ek short phase of fatigue ya stress indicate karta hai, manageable hai. "
                    "Regular routine aur proper sleep ke saath teri energy levels extraordinary ho sakti hain. "
                    "Mars mount ki position indicate karti hai ki physical activity — gym, sports, walks — teri best medicine hai."
                ),
                "luck": (
                    "Sun line aur fate line ka meeting point ek special lucky period indicate karta hai jo approach kar raha hai. "
                    "September aur October is saal tere liye most auspicious months hain — new ventures inhi mein start karo. "
                    "Moon mount ki presence bolta hai tera gut feeling tujhe sahi time pe sahi jagah le jaata hai — trust it more. "
                    "Lucky numbers 7, 14, 33 tere life ke important turning points pe repeatedly show honge — note karna."
                ),
            },
        }

    return {
        "headline": f"{name}'s Palm Reveals a Rare Hidden Path",
        "intro": (
            f"{name}, the first thing your palm reveals is a deep, unbroken life line — a marker of "
            "exceptional vitality and inner resilience that fewer than one in five people carry at this strength. "
            "Your Jupiter mount is prominent, quietly declaring leadership energy that has not yet been fully unleashed. "
            "The angle of your fate line points toward a significant turning point in the next six to nine months — one that appears chosen rather than accidental."
        ),
        "revealingInsight": (
            f"Only about 11% of palms carry this particular formation — {name}, there is a rare creative force "
            "dormant inside you that even you have not fully realized yet, and the lines suggest it is very close to surfacing."
        ),
        "cosmicWarning": (
            "A faint grille marking on the Mercury mount signals a tendency to over-analyze and delay decisions past their ideal window. "
            "The next three months specifically call for action over analysis — hesitation here could cost an opportunity that does not return in the same form."
        ),
        "yearsForecast": (
            "The next twelve months carry a strong theme of reinvention and purposeful forward motion. "
            "September through October emerge as the most energetically aligned window for career and financial advancement. "
            "A personal relationship is set to deepen in a way that reshapes how you see your own future."
        ),
        "luckyNumbers": [7, 14, 33],
        "luckyColor": "Midnight Blue",
        "luckyMonth": "September",
        "starRatings": {
            "personality": 4,
            "career": 4,
            "finance": 3,
            "love": 5,
            "health": 4,
            "luck": 3,
        },
        "sections": {
            "personality": (
                "Your heart line curves sharply upward toward the Jupiter mount — a rare formation found in deeply idealistic, "
                "emotionally intelligent people who love with full commitment rather than cautious reserve. "
                "You carry an intense inner world but reveal it selectively; the lines speak of observation before action, which most people misread as hesitation. "
                "The Venus mount is well-developed, pointing to strong empathy and creative capacity that often surprises people who thought they knew you. "
                "Your slightly sloping head line confirms a mind wired for imagination and intuition — not conventional by nature, and fortunately so."
            ),
            "career": (
                "The fate line is clear and well-defined, confirming a meaningful career opportunity will surface in the next six months — not randomly, but as a direct result of groundwork already laid. "
                "A sun line is present, which is statistically uncommon and signals that recognition and visible success are written into this palm when creative or leadership roles are chosen. "
                "The greatest professional leap comes when you stop selecting only low-risk positions and step into something visible and directional. "
                "Around the year's final quarter, a proposal or offer will emerge that has the power to redirect your entire professional trajectory — do not dismiss it as too ambitious."
            ),
            "finance": (
                "The wealth indicators on this palm point to growth that builds steadily and compounds over time rather than arriving in a single dramatic wave. "
                "Approximately nine months from now, one high-impact financial opportunity will present itself — it rewards those who act decisively and without excessive hesitation. "
                "The May-to-August window carries a note of caution around large or irreversible financial commitments; patience during that stretch pays dividends. "
                "Your Mercury mount suggests that communication and negotiation are your most powerful financial tools — business built on those strengths will outperform any investment."
            ),
            "love": (
                "The length and depth of your heart line confirm that when you love, you do so completely — half-measures do not appear in this palm's emotional architecture. "
                "You are drawn not to surface chemistry but to emotional congruence and the kind of understanding that takes years to build but never erodes. "
                "In the next six months, one connection will deepen past a threshold that changes how you understand both yourself and your capacity for intimacy. "
                "The Venus mount carries a clear marking that speaks of love as a genuinely transformative force in your life — this is not a secondary theme here, it is a central one."
            ),
            "health": (
                "The life line is deep, strongly curved, and unbroken through its primary length — a consistent indicator of vigorous baseline health and a recovery speed that serves you well under pressure. "
                "A faint island formation appears in the mid-section of the line, suggesting a brief period of fatigue or lowered immunity within the coming year — manageable with awareness and intentional rest. "
                "With a consistent routine and guarded sleep quality, your energy ceiling is genuinely higher than average — the palm confirms the body can support ambitious goals when maintained. "
                "The Mars mount position indicates that physical movement — sustained, regular activity of any kind — functions as your most effective stress regulator and vitality amplifier."
            ),
            "luck": (
                "Where your sun line and fate line approach the same region of the palm, a window of elevated fortune is forming — this is not distant, it is within the next year's span. "
                "September and October carry the highest fortunate energy this year; new ventures, important conversations, and bold decisions initiated in that window carry unusual forward momentum. "
                "Your Moon mount is notably developed, which means your intuitive sense of timing — when you choose to listen to it — reliably positions you in the right place at the right moment. "
                "The numbers 7, 14, and 33 will appear at pivotal forks in your path; treat them as quiet confirmations that you are aligned, not as coincidence."
            ),
        },
    }


def _openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return OpenAI(api_key=api_key)


def _groq_model() -> str:
    return os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct").strip() or "meta-llama/llama-4-scout-17b-16e-instruct"


def _groq_request(messages: List[Dict[str, Any]]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": _groq_model(),
            "messages": messages,
            "temperature": 0.7,
        },
        timeout=60,
    )
    response.raise_for_status()

    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Groq returned no choices")

    message = choices[0].get("message") or {}
    content = message.get("content", "")
    if not content.strip():
        raise RuntimeError("Groq returned an empty response")
    return content


def _gemini_request(parts: List[Dict[str, Any]]) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model_candidates = [
        os.getenv("GEMINI_MODEL", "").strip(),
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
    ]
    model_candidates = [model for model in model_candidates if model]

    last_error = None
    for model_name in model_candidates:
        try:
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                params={"key": api_key},
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": parts}]},
                timeout=60,
            )
            response.raise_for_status()

            data = response.json()
            candidates = data.get("candidates") or []
            if not candidates:
                raise RuntimeError("Gemini returned no candidates")

            content = candidates[0].get("content") or {}
            text_parts = content.get("parts") or []
            text = "".join(part.get("text", "") for part in text_parts)
            if not text.strip():
                raise RuntimeError("Gemini returned an empty response")
            return text
        except Exception as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code and status_code != 404:
                raise
            last_error = exc

    raise RuntimeError(f"Gemini request failed for all candidate models: {last_error}")


def _analyze_with_openai(image_data: str, user_name: str, language: str) -> Dict[str, Any]:
    client = _openai_client()
    prompt = (
        f"{PALM_PROMPT.format(user_name=user_name)}\n\n"
        f"Language directive: {_language_instructions(language)}"
    )
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{image_data}",
                    },
                ],
            }
        ],
    )
    raw_text = getattr(response, "output_text", "") or ""
    return _json_or_fallback(raw_text, user_name, language)


def _analyze_with_gemini(image_data: str, user_name: str, language: str) -> Dict[str, Any]:
    prompt = (
        f"{PALM_PROMPT.format(user_name=user_name)}\n\n"
        f"Language directive: {_language_instructions(language)}"
    )
    raw_text = _gemini_request(
        [
            {"text": prompt},
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": image_data,
                }
            },
        ]
    )
    return _json_or_fallback(raw_text, user_name, language)


def _analyze_with_groq(image_data: str, user_name: str, language: str) -> Dict[str, Any]:
    prompt = (
        f"{PALM_PROMPT.format(user_name=user_name)}\n\n"
        f"Language directive: {_language_instructions(language)}"
    )
    raw_text = _groq_request(
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_data}",
                        },
                    },
                ],
            }
        ]
    )
    return _json_or_fallback(raw_text, user_name, language)


def analyze_palm(image_data: str, user_name: str, language: str = "english") -> Dict[str, Any]:
    clean_image = _strip_data_uri(image_data)
    if not clean_image:
        raise ValueError("Invalid image payload")
    if not _is_valid_base64_image(clean_image):
        raise ValueError("Invalid image format. Please capture palm photo again.")
    if _decoded_image_size(clean_image) < 6000:
        raise ValueError("Image quality too low. Please upload a clear palm photo with full hand visible.")

    _assert_palm_image_or_raise(clean_image)

    provider = os.getenv("AI_PROVIDER", "demo").lower()
    if provider == "openai" and os.getenv("OPENAI_API_KEY"):
        try:
            result = _enforce_near_term_reading(_enforce_reading_language(
                _analyze_with_openai(clean_image, user_name, language),
                language,
                "openai",
            ), language)
            return _reading_with_meta(
                result,
                mode="ai",
                provider="openai",
            )
        except Exception as exc:
            fallback_reason = str(exc)
    else:
        fallback_reason = None
    if provider == "gemini" and os.getenv("GEMINI_API_KEY"):
        try:
            result = _enforce_near_term_reading(_enforce_reading_language(
                _analyze_with_gemini(clean_image, user_name, language),
                language,
                "gemini",
            ), language)
            return _reading_with_meta(
                result,
                mode="ai",
                provider="gemini",
            )
        except Exception as exc:
            fallback_reason = str(exc)
    if provider == "groq" and os.getenv("GROQ_API_KEY"):
        try:
            result = _enforce_near_term_reading(_enforce_reading_language(
                _analyze_with_groq(clean_image, user_name, language),
                language,
                "groq",
            ), language)
            return _reading_with_meta(
                result,
                mode="ai",
                provider="groq",
            )
        except Exception as exc:
            fallback_reason = str(exc)
    return _reading_with_meta(
        _enforce_near_term_reading(_enforce_reading_language(_demo_reading(user_name, language), language, provider), language),
        mode="demo",
        provider=provider,
        reason=fallback_reason,
    )


def _chat_with_openai(messages: List[Dict[str, str]]) -> str:
    client = _openai_client()
    response = client.responses.create(model="gpt-4.1-mini", input=messages)
    return getattr(response, "output_text", "") or ""


def _chat_with_gemini(prompt: str) -> str:
    return _gemini_request([{"text": prompt}])


def _chat_with_groq(messages: List[Dict[str, str]]) -> str:
    return _groq_request(messages)


def answer_follow_up(
    question: str,
    previous_reading: Dict[str, Any],
    user_name: str,
    history: List[Dict[str, str]],
    language: str = "english",
) -> Dict[str, Any]:
    provider = os.getenv("AI_PROVIDER", "demo").lower()
    fallback_reason = None
    reading_text = json.dumps(previous_reading, ensure_ascii=False)
    prompt = QA_PROMPT.format(
        previous_reading=reading_text,
        user_question=question,
        user_name=user_name,
    )
    prompt = f"{prompt}\nLanguage directive: {_language_instructions(language)}"

    if provider == "openai" and os.getenv("OPENAI_API_KEY"):
        messages = [{"role": "system", "content": prompt}]
        for item in history[-6:]:
            if item.get("role") in {"user", "assistant"} and item.get("content"):
                messages.append({"role": item["role"], "content": item["content"]})
        messages.append({"role": "user", "content": question})
        try:
            result = _chat_with_openai(messages).strip()
            if result:
                return _chat_with_meta(
                    _enforce_near_term_chat(_enforce_chat_language(result, language, "openai"), language),
                    mode="ai",
                    provider="openai",
                )
        except Exception as exc:
            fallback_reason = str(exc)

    if provider == "gemini" and os.getenv("GEMINI_API_KEY"):
        history_text = "\n".join(
            f"{item.get('role', 'user')}: {item.get('content', '')}" for item in history[-6:]
        )
        try:
            result = _chat_with_gemini(f"{prompt}\nConversation so far:\n{history_text}").strip()
            if result:
                return _chat_with_meta(
                    _enforce_near_term_chat(_enforce_chat_language(result, language, "gemini"), language),
                    mode="ai",
                    provider="gemini",
                )
        except Exception as exc:
            fallback_reason = str(exc)

    if provider == "groq" and os.getenv("GROQ_API_KEY"):
        messages = [{"role": "system", "content": prompt}]
        for item in history[-6:]:
            if item.get("role") in {"user", "assistant"} and item.get("content"):
                messages.append({"role": item["role"], "content": item["content"]})
        messages.append({"role": "user", "content": question})
        try:
            result = _chat_with_groq(messages).strip()
            if result:
                return _chat_with_meta(
                    _enforce_near_term_chat(_enforce_chat_language(result, language, "groq"), language),
                    mode="ai",
                    provider="groq",
                )
        except Exception as exc:
            fallback_reason = str(exc)

    if (language or "english").lower() == "hindi":
        return _chat_with_meta(
            (
                f"{user_name}, आपके प्रश्न में संकोच की रेखा दिखती है, कमजोरी की नहीं। "
                "संकेत यह है कि उत्तर बाहर नहीं, आपके अगले साहसी कदम में छिपा है।"
            ),
            mode="demo",
            provider=provider,
            reason=fallback_reason,
        )

    if (language or "english").lower() == "whatsapp":
        return _chat_with_meta(
            (
                f"{user_name}, tumhare question mein doubt ka signal hai, defeat ka nahi. "
                "Palm reading clear bol rahi hai: next breakthrough tab aayega jab tum apne instinct pe action loge."
            ),
            mode="demo",
            provider=provider,
            reason=fallback_reason,
        )

    return _chat_with_meta(
        (
            f"{user_name}, the question you asked points to a line of hesitation rather than fate. "
            "Your reading suggests clarity comes when you act on the insight you already sensed, not when you wait for a perfect sign."
        ),
        mode="demo",
        provider=provider,
        reason=fallback_reason,
    )
