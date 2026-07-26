# 💪 GymBud — AI-Powered Fitness Coach

GymBud is a full-stack mobile/web fitness application that uses **Gemini 1.5 Flash** to generate personalized training and nutrition programs based on your physique photos, goals, and performance data.

## ✨ Features

### 🎯 Initial Assessment & Onboarding
- Upload front, back, and side physique photos
- Set your target goals (mass gain, shredding, recomp, strength, endurance)
- Flag weak points (e.g., underdeveloped lower chest, lagging rear delts)
- Specify experience level and equipment access

### 🤖 AI Program Generation
- Gemini 1.5 Flash analyzes your text profile + visual data
- Generates a complete weekly split with advanced techniques (supersets, pre-exhaustion, myo-reps, drop sets)
- Creates a daily nutrition plan with macro targets, meal templates, and supplement suggestions
- Provides coaching notes with progression models and deload recommendations

### 📸 Daily Fitcheck & Album
- Snap a daily physique photo for AI-powered body composition tracking
- Time-lapse album to visualize your transformation over weeks/months
- AI compares current vs. baseline photos and tracks real changes

### 📝 Daily Logging
- Log meals with calorie/macro tracking
- Record workout performance (sets, reps, RPE, energy level, pump rating)
- Track sleep, water intake, mood, and soreness

### ⚡ Adaptive Adjustment Engine
- Automatic performance trend analysis after each workout log
- Detects overreaching, under-recovery, strength plateaus, and energy crashes
- Triggers plan modifications: volume reduction, rep scheme changes, deload recommendations
- Push notification reminders for hydration, macro targets, and adjusted daily volume

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React Native (Expo SDK 54) — iOS, Android, Web |
| **Backend** | FastAPI (Python 3.13) |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **Storage** | Supabase Storage (physique photos) |
| **AI Engine** | Google Gemini 1.5 Flash (structured JSON output) |
| **Auth** | Supabase Auth (JWT-based) |
| **Deployment** | Render (backend), Vercel/EAS (frontend) |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your actual keys

uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` • API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd mobile
npm install
npx expo start --web   # for web
npx expo start          # for mobile (scan QR with Expo Go)
```

### Database Setup

1. Go to your Supabase Dashboard → SQL Editor
2. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_buckets.sql`

## 📁 Project Structure

```
gym_bud/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── config.py        # Pydantic settings
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── dependencies.py  # Shared auth dependency
│   │   ├── routers/
│   │   │   ├── auth.py      # Signup/login/refresh/logout
│   │   │   ├── users.py     # Profile CRUD + onboarding
│   │   │   ├── plans.py     # AI plan generation
│   │   │   ├── daily_log.py # Daily logging + adaptation
│   │   │   └── fitcheck.py  # Photo upload + AI analysis
│   │   ├── services/
│   │   │   ├── gemini_service.py     # Gemini 1.5 Flash integration
│   │   │   └── adaptation_engine.py  # Performance trend analysis
│   │   └── utils/
│   │       ├── supabase_client.py    # Supabase client instances
│   │       └── storage.py           # Photo upload utility
│   ├── requirements.txt
│   └── .env.example
├── mobile/                  # React Native (Expo) frontend
│   ├── App.tsx              # Full MVP — all screens
│   ├── index.ts             # Expo entry point
│   ├── app.json             # Expo config
│   └── package.json
├── supabase/
│   └── migrations/          # SQL schema files
├── render.yaml              # Render.com deployment config
└── README.md
```

## 📄 API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/signup` | Create account + profile |
| `POST` | `/api/v1/auth/login` | Login, receive JWT |
| `POST` | `/api/v1/auth/refresh` | Refresh expired token |
| `POST` | `/api/v1/auth/logout` | Sign out |
| `POST` | `/api/v1/users/onboarding` | Complete onboarding (multipart) |
| `GET` | `/api/v1/users/me?user_id=` | Get profile |
| `PUT` | `/api/v1/users/me?user_id=` | Update profile |
| `POST` | `/api/v1/plans/generate` | AI plan generation |
| `GET` | `/api/v1/plans/active?user_id=` | Get active plan |
| `GET` | `/api/v1/plans/history?user_id=` | Plan version history |
| `POST` | `/api/v1/plans/adapt?user_id=` | Trigger adaptation engine |
| `POST` | `/api/v1/daily-log/log?user_id=` | Submit daily log |
| `GET` | `/api/v1/daily-log/logs?user_id=` | Get recent logs |
| `GET` | `/api/v1/daily-log/summary/{date}?user_id=` | Daily summary vs targets |
| `POST` | `/api/v1/fitcheck/upload` | Upload fitcheck photo |
| `GET` | `/api/v1/fitcheck/album?user_id=` | Photo album |
| `GET` | `/api/v1/fitcheck/progress?user_id=` | First vs latest comparison |
| `GET` | `/health` | Health check |

## 🔐 Environment Variables

See [`backend/.env.example`](backend/.env.example) for the full list.

## 📜 License

MIT
