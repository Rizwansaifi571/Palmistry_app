# AI Palm Reading Experience

A premium full-stack palmistry web application with a futuristic UI, webcam palm capture, AI-powered reading, voice narration, and follow-up Q&A.

## Paid Stall Model (₹1000 per customer)

- Every customer session is started from the landing screen as a paid session.
- Default session fee is ₹1000 (`SESSION_PRICE_INR`).
- Analysis, voice narration, and follow-up Q&A are tied to an active session ID.
- Each session has configurable time and Q&A limits:
	- `SESSION_DURATION_MINUTES` (default: 25)
	- `SESSION_MAX_QUESTIONS` (default: 10)
- Session enforcement is enabled by default via `REQUIRE_PAID_SESSION=true`.

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion
- Backend: Flask, Flask-CORS
- AI: OpenAI Vision or Gemini, with a demo fallback mode
- Voice: ElevenLabs via backend, with browser Speech Synthesis fallback on the frontend

## Project Structure

- `frontend/` React application
- `backend/` Flask API

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

### Backend

- `AI_PROVIDER=openai` or `gemini`
- `OPENAI_API_KEY=`
- `GEMINI_API_KEY=`
- `ELEVENLABS_API_KEY=`
- `ELEVENLABS_VOICE_ID=`
- `FLASK_ENV=development`
- `REQUIRE_PAID_SESSION=true`
- `SESSION_PRICE_INR=1000`
- `SESSION_DURATION_MINUTES=25`
- `SESSION_MAX_QUESTIONS=10`

### Frontend

Optional: create `frontend/.env.local`

- `VITE_API_BASE_URL=http://127.0.0.1:5000`

## Run Locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Notes

- If no AI keys are configured, the app still works in demo mode with a generated reading.
- If ElevenLabs is not configured, the frontend automatically falls back to browser text-to-speech.
- Webcam and microphone features require browser permission.
