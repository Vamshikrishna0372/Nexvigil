@echo off
title Nexvigil — ULTRA SMOOTH STARTUP
echo.
echo  ================================================
echo   Nexvigil Performance Startup (Single Process)
echo  ================================================
echo.

set PROJECT_ROOT=%~dp0
set BACKEND=%PROJECT_ROOT%Nexvigil_backend

echo [1] Cleaning up existing processes...
REM Kill any existing AI agent or rogue instances
taskkill /F /FI "WINDOWTITLE eq Nexvigil AI Agent*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Nexvigil Auth Server*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq *ai_agent*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq *auth_server*" /T 2>nul

REM Give a moment for ports/resources to release
timeout /t 2 /nobreak >nul

echo [2] Provisioning Database (Admin + Cameras)...
cd /d "%BACKEND%"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
python provision_admin.py

echo.
echo [3] Starting 3-Core Surveillance Engine...
echo     - Node Auth Server (Port 8081 / OAuth)
echo     - Python AI Agent (AI Detection Loop)
echo     - FastAPI Surveillance Hub (Main API / Port 8000)
echo.

REM Start Auth Server
start "Nexvigil Auth Server" cmd /k "cd /d "%BACKEND%" && node auth_server.js"

REM Start AI Agent
start "Nexvigil AI Agent" cmd /k "cd /d "%BACKEND%" && python ai_agent.py"

REM Start FastAPI Hub (Disabling reload for production stability to prevent watchfiles spam)
start "Nexvigil FastAPI Hub" cmd /k "cd /d "%BACKEND%" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload=False --log-level info"

echo.
echo  DONE.
echo  All 3 NexVigil Backend Components are now LIVE.
echo.
pause
