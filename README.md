# Nexvigil -- AI-Powered Intelligent Surveillance System

Nexvigil is an **AI & Machine Learning-powered Intelligent Surveillance
System** that modernizes traditional CCTV monitoring using **YOLOv8**,
**OpenCV**, and a **FastAPI** backend with a modern **React** dashboard.

The platform performs real-time object detection, generates intelligent
alerts with visual evidence, provides analytics, and includes an **AI
Chatbot** capable of interacting with the entire surveillance system
using natural language.

> **🌐 Live Demo:** https://nexvigil.vercel.app/\
> **⚠️ Demo Availability:** The live frontend is publicly accessible.
> Full system functionality is **available upon request**, as the
> backend, AI engine, and camera services must be running for real-time
> monitoring.

------------------------------------------------------------------------

## Features

-   Real-time AI surveillance monitoring
-   YOLOv8-based object detection
-   Multi-camera live monitoring
-   Intelligent alert generation
-   Evidence Vault for images & videos
-   Incident Timeline
-   Analytics Dashboard
-   Rule-Based Detection Engine
-   AI Chatbot for complete surveillance interaction
-   Camera management
-   Secure authentication
-   Responsive dashboard

### AI Chatbot Capabilities

The integrated AI Chatbot allows users to interact with the surveillance
platform using natural language.

Users can: - View total alerts - Check today's alerts - View incident
details - Monitor camera status - Access analytics insights - Manage
cameras - Retrieve surveillance information - Navigate system modules

------------------------------------------------------------------------

## Tech Stack

### Frontend

-   React.js
-   TypeScript
-   Tailwind CSS
-   Vite

### Backend

-   FastAPI
-   Python
-   REST APIs
-   Uvicorn

### AI & Machine Learning

-   YOLOv8
-   OpenCV

### Database

-   MongoDB

### Deployment

-   Vercel (Frontend)
-   ngrok (Backend Tunnel)

------------------------------------------------------------------------

## Project Structure

``` text
Nexvigil/
├── Nexvigil_frontend/
├── Nexvigil_backend/
│   ├── app/
│   ├── ai_agent/
│   ├── media/
│   └── main.py
```

------------------------------------------------------------------------

## Getting Started

### Clone Repository

``` bash
git clone https://github.com/Vamshikrishna0372/Nexvigil.git
cd Nexvigil
```

### Backend

``` bash
cd Nexvigil_backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### AI Engine

``` bash
python ai_agent.py
```

### Frontend

``` bash
cd Nexvigil_frontend
npm install
npm run dev
```

------------------------------------------------------------------------

## System Architecture

``` text
User
   │
React Frontend (Vercel)
   │
FastAPI Backend
   │
YOLOv8 + OpenCV
   │
MongoDB + Evidence Storage
```

------------------------------------------------------------------------

## Screenshots

-   Landing Page
-   Login
-   Dashboard
-   Live Monitoring
-   Camera Grid
-   Alerts
-   Incident Timeline
-   Evidence Vault
-   Analytics
-   Rule Engine
-   Camera Management
-   AI Chatbot

------------------------------------------------------------------------

## Key Highlights

-   AI & Machine Learning powered surveillance platform
-   Full-stack architecture using React and FastAPI
-   Real-time object detection using YOLOv8
-   Intelligent AI Chatbot for complete system interaction
-   Analytics-driven monitoring
-   Modular and scalable architecture

------------------------------------------------------------------------

## Future Enhancements

-   Face Recognition
-   Number Plate Recognition (ANPR)
-   Cloud Deployment
-   Mobile Application
-   Predictive AI Analytics

------------------------------------------------------------------------

## Connect

-   **GitHub:** https://github.com/Vamshikrishna0372
-   **LinkedIn:**
    https://www.linkedin.com/in/vamshi-krishna-nagula-174b6833a/
-   **Portfolio:** https://vamshi-portfolio-original.vercel.app/
-   **Email:** nagulavamshi1453@gmail.com

------------------------------------------------------------------------

## License

This project is developed for educational, research, and portfolio
purposes.

------------------------------------------------------------------------

::: {align="center"}
**Built with ❤️ by Vamshi Krishna Nagula**
:::
