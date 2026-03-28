# 🛡️ Nexvigil – AI-Powered Intelligent Surveillance System

Nexvigil is a full-stack **AI-driven surveillance platform** designed to enhance traditional CCTV monitoring using **computer vision and real-time analytics**.
The system detects suspicious activities from live video streams using deep learning models and automatically generates **alerts with visual evidence (images & videos)**.

🚀 **Live Frontend:** [https://nexvigil.vercel.app/](https://nexvigil.vercel.app/)

---

## ✨ Features

* 🎯 **Real-Time Object Detection**

  * Uses YOLOv8 for detecting people, objects, and anomalies
* 📡 **Live Video Monitoring**

  * Stream live camera feed directly in dashboard
* 🚨 **Automated Alert System**

  * Generates alerts with captured images & video clips
* 📸 **Evidence Management**

  * Stores and displays images/videos for each alert
* ⚙️ **Rule-Based Detection Engine**

  * Configure conditions for triggering alerts
* 📊 **Analytics Dashboard**

  * Monitor system activity and detection statistics
* 🔔 **Smart Notifications**

  * Professional alert system with severity levels
* 📱 **Responsive UI**

  * Works across desktop, tablet, and mobile devices
* 🌐 **Remote Access via Secure Tunnel**

  * Uses ngrok to expose local backend securely

---

## 🛠️ Tech Stack

### 🎨 Frontend

* React.js
* TypeScript
* Tailwind CSS
* Vite

### ⚙️ Backend

* FastAPI (Python)
* REST APIs
* Uvicorn

### 🤖 AI & Computer Vision

* YOLOv8 (Ultralytics)
* OpenCV
* Real-time video processing

### 🗄️ Database

* MongoDB

### 🔐 Server Bridge / Networking

* ngrok (secure tunneling for local backend exposure)

### 🎬 UI & Components

* Shadcn UI (Radix UI)
* Custom dashboard components

### 🌐 Deployment

* Vercel (Frontend)

---

## 📁 Project Structure

```text
Nexvigil/
├── Nexvigil_frontend/        # React frontend (Vercel deployed)
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Dashboard pages
│   │   ├── services/         # API integration
│   │   ├── contexts/         # State management
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── Nexvigil_backend/         # FastAPI backend
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── services/         # Business logic
│   │   ├── models/           # Database models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── core/             # Config & settings
│   ├── media/                # Captured images & videos
│   ├── ai_agent/             # AI detection logic
│   └── main.py               # Backend entry point
```

---

## 🚀 Getting Started

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Vamshikrishna0372/Nexvigil.git
cd Nexvigil
```

---

### 2️⃣ Setup Backend

```bash
cd Nexvigil_backend
pip install -r requirements.txt
```

Create `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/nexvigil
SECRET_KEY=your_secret_key
NGROK_URL=https://your-ngrok-url
```

Run backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 3️⃣ Start AI Detection Engine

```bash
python ai_agent.py
```

---

### 4️⃣ Start ngrok (Server Bridge)

```bash
ngrok http 8000
```

Copy HTTPS URL and update frontend env.

---

### 5️⃣ Setup Frontend

```bash
cd Nexvigil_frontend
npm install
```

Create `.env`:

```env
VITE_API_BASE_URL=https://your-ngrok-url
```

Run frontend locally:

```bash
npm run dev
```

---

## 🔄 System Architecture

```text
User Device (Mobile/Laptop)
        ↓
Vercel Frontend (React)
        ↓
ngrok Secure Tunnel (HTTPS)
        ↓
Local Backend (FastAPI)
        ↓
AI Engine (YOLOv8 + OpenCV)
        ↓
MongoDB + Media Storage
```

---

## 📸 Media & Streaming

* Images and videos are captured and stored in `/media`
* Live stream served using `StreamingResponse`
* Accessible via ngrok public URL

---

## 🎯 Key Highlights

* Full-stack AI application with real-time processing
* Integration of deep learning model into web system
* Secure backend exposure using ngrok
* Scalable modular architecture
* Production-ready frontend deployment

---

## ⚠️ Important Notes

* Backend runs locally → requires ngrok for remote access
* ngrok URL changes on restart (free version)
* System works only when backend + AI agent are running

---

## 🤝 Connect With Me

* 💻 GitHub: https://github.com/Vamshikrishna0372
* 🔗 LinkedIn: https://www.linkedin.com/in/vamshi-krishna-nagula-174b6833a/
* 📧 Email: [nagulavamshi1453@gmail.com](mailto:nagulavamshi1453@gmail.com)

---

## 📄 License

This project is for educational and portfolio purposes.

---

<div align="center">

🚀 Built with passion by **Vamshi Krishna Nagula**

</div>
