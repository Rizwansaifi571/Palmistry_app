# Palmistry App

AI-powered palm reading web app with:
- live webcam palm capture
- premium reading generation
- voice narration with speed control
- follow-up Q&A chat
- session-based stall usage flow

This project is split into:
- `frontend/` → React + Vite UI
- `backend/` → Flask API services

---

## Features

- Palm scan capture from browser camera
- AI-generated palm reading with sections:
  - personality
  - career
  - finance
  - love
  - health
  - luck
- Lucky profile (numbers, color, month)
- Voice playback (ElevenLabs or browser fallback)
- Narration speed control in UI
- WhatsApp Hinglish / Hindi / English language modes
- Session control for stall/customer usage
- Palm-image validation before analysis

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Framer Motion

### Backend
- Flask
- Flask-CORS
- Waitress
- OpenAI / Gemini / Groq (configurable)

---

## Project Structure

```text
Palmistry/
  frontend/
    src/
    package.json
  backend/
    app.py
    serve.py
    requirements.txt
    services/
      ai_service.py
      voice_service.py
      session_service.py
```

---

## Local Setup

### 1) Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python serve.py
```

Backend runs on `http://127.0.0.1:5000` by default.

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Environment Variables

Create `backend/.env`.

### AI provider

- `AI_PROVIDER=openai` or `gemini` or `groq` or `demo`
- `OPENAI_API_KEY=...`
- `GEMINI_API_KEY=...`
- `GROQ_API_KEY=...`

### Voice

- `ELEVENLABS_API_KEY=...`
- `ELEVENLABS_VOICE_ID=...`

### Session controls

- `REQUIRE_PAID_SESSION=true`
- `SESSION_PRICE_INR=1000`
- `SESSION_DURATION_MINUTES=25`
- `SESSION_MAX_QUESTIONS=10`

### Validation

- `STRICT_PALM_VALIDATION=true`

### Frontend env (optional)

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

If not set, frontend uses relative `/api` routes (works with Vite proxy in dev).

---

## API Endpoints

- `GET /` → service info
- `GET /api/health` → health + provider
- `POST /api/session/start` → start customer session
- `POST /api/session/end` → end session
- `GET /api/session/<session_id>` → session status
- `POST /api/analyze` → palm reading generation
- `POST /api/chat` → follow-up Q&A
- `POST /api/voice` → speech audio generation

---

## Deployment

### Recommended

- Frontend: **Vercel** or **Netlify**
- Backend: **Render** / **Railway** / **Fly.io** / VM

Then set frontend env:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Why not full backend on Vercel/Netlify directly?

This app has image + AI + voice workloads, which are more stable on a persistent Python backend service than on strict serverless limits.

---

## Troubleshooting

### Backend fails to start

- Ensure dependencies are installed in the active environment:
  - `pip install -r backend/requirements.txt`
- Run from backend folder:
  - `cd backend`
  - `python serve.py`

### Port 5000 already in use

```powershell
$conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
```

### Face image still analyzed

- Set `STRICT_PALM_VALIDATION=true`
- Ensure AI provider key is configured (for validation checks)
- Re-capture image with clear open palm in frame

### WhatsApp Hinglish quality

- Select `WhatsApp Style (Hinglish)` before scan
- Generate a fresh reading (language changes do not retro-convert old result text)

---

## License

Private project. Add a license file if you plan to open source.

