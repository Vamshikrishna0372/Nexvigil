# Nexvigil - Execution & Deployment Guide

## Architecture Overview
```
[Your Laptop] ──── FastAPI (port 8000) ──── ngrok tunnel ──── [Internet]
                        │                                           │
                   AI Agent                                  Vercel Frontend
                  (ai_agent.py)                      (nexvigil.vercel.app)
```

---

## 🚀 Quick Start (Windows - All At Once)

Double-click the appropriate batch file in the root folder:
- **`start_nexvigil.bat`** — Backend + AI Agent + Frontend
- **`ultra_smooth_startup.bat`** — Optimized startup
- **`restart_ai_agent.bat`** — Restart AI Agent only

---

## 🛠️ Individual Component Commands

### 1. Backend API (FastAPI — runs on localhost:8000)

```powershell
# THE PERFECT RESET & START COMMAND (Kills stuck processes + starts)
cd Nexvigil_backend
$p8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; if ($p8000) { Stop-Process -Id $p8000.OwningProcess -Force }; python main.py
```

> ✅ Backend available at: **http://localhost:8000**  
> ✅ API docs at: **http://localhost:8000/docs**

---

### 2. AI Model Agent (YOLOv8 Surveillance)

```powershell
cd Nexvigil_backend
.\venv\Scripts\activate

python fix_cameras_active.py   # force cameras online
python ai_agent.py             # start AI surveillance
```

---

### 3. NGROK Tunnel (Exposes Backend to Internet)

> **Install ngrok first:** https://ngrok.com/download  
> Create a free account and run `ngrok config add-authtoken YOUR_TOKEN` once.

```powershell
# In a NEW terminal window — keep this running alongside backend
.\ngrok.exe http 8000
```

**After ngrok starts, you'll see something like:**
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy that HTTPS URL and update TWO places:**

#### 3a. Backend `.env` (in `Nexvigil_backend/.env`):
```env
NGROK_URL=https://abc123.ngrok-free.app
FRONTEND_URL=https://YOUR-APP.vercel.app
ENVIRONMENT=production
```
Then **restart the backend** (`ctrl+C` → `python main.py`)

#### 3b. Vercel Environment Variable:
Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**  
Set:
```
VITE_API_BASE_URL = https://abc123.ngrok-free.app/api/v1
```
Then **Redeploy** in Vercel (Deployments → "..." → Redeploy).

> ⚠️ **Important:** Free ngrok URLs change every restart. Paid ngrok plans have static URLs.
> Every time you restart ngrok, update both `.env` and Vercel env var.

---

### 4. Frontend — Local Development

```powershell
cd Nexvigil_frontend
npm install

# For local dev (talking to local backend)
# Create .env.local:
echo VITE_API_BASE_URL=http://localhost:8000/api/v1 > .env.local

npm run dev
```

> ✅ Frontend at: **http://localhost:8080** (or check terminal)

---

### 5. Frontend — Vercel Deployment

**One-time setup:**
```powershell
# Install Vercel CLI
npm install -g vercel

cd Nexvigil_frontend

# Login and link project
vercel login
vercel link

# Deploy to production
vercel --prod
```

**After each ngrok URL change, redeploy:**
```powershell
cd Nexvigil_frontend
vercel --prod
```

Or trigger from: **Vercel Dashboard → Deployments → Redeploy**

---

## 📁 File Storage — How It Works

| Stored in DB | Example value                      |
|-------------|-------------------------------------|
| `video_path` | `recordings/alert_cam01_abc123.mp4` |
| `screenshot_path` | `screenshots/frame_abc123.jpg` |

The backend serves files at:
```
https://NGROK-URL.ngrok-free.app/media/recordings/alert_cam01_abc123.mp4
```

The frontend constructs URLs automatically using `VITE_API_BASE_URL`:
```js
// In api.ts — works for localhost, ngrok, and vercel automatically
getVideoUrl: (path) => `${BASE_URL}/media/${path}`
```

**✅ No absolute URLs stored in DB — only relative paths.**

---

## 🔧 Utility Scripts (in `Nexvigil_backend/`)

| Script | Purpose |
|--------|---------|
| `python fix_cameras_active.py` | Force all cameras online |
| `python seed_rules.py` | Reset/update AI detection rules |
| `python check_db.py` | Verify MongoDB connection |

---

## 🔐 Environment Variables Reference

### Backend (`Nexvigil_backend/.env`)
```env
MONGO_URI=mongodb://localhost:27017/nexvigil
SECRET_KEY=your-secret-key
INTERNAL_API_KEY=your-internal-key
ENVIRONMENT=production
NGROK_URL=https://YOUR-NGROK-ID.ngrok-free.app
FRONTEND_URL=https://YOUR-APP.vercel.app
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

### Frontend — Vercel Environment Variables
```env
VITE_API_BASE_URL=https://YOUR-NGROK-ID.ngrok-free.app/api/v1
```

---

## 🔄 Daily Startup Checklist

1. ▶ Start **MongoDB** (if not running as a service)
2. ▶ Start **Backend**: `python main.py`
3. ▶ Start **ngrok**: `ngrok http 8000`
4. 📋 Copy new ngrok HTTPS URL
5. ✏️ Update `NGROK_URL` in `Nexvigil_backend/.env` → restart backend
6. ✏️ Update `VITE_API_BASE_URL` in Vercel → redeploy
7. ▶ Start **AI Agent**: `python ai_agent.py`
8. 🌐 Open your Vercel URL on any device!
