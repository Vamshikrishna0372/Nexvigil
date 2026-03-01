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
REM Kill any existing AI agent or rogue python instances running the agent
taskkill /F /FI "WINDOWTITLE eq Nexvigil AI Agent*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq *ai_agent*" /T 2>nul

REM Give a moment for ports/resources to release
timeout /t 2 /nobreak >nul

echo [2] Ensuring cameras are active in DB...
cd /d "%BACKEND%"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
python fix_cameras_active.py

echo.
echo [3] Starting High-Performance AI Agent...
echo     - 3-Thread Architecture (Capture/YOLO/Write)
echo     - DSHOW Camera Access (Windows Low Latency)
echo     - Paced YOLO (2Hz)
echo     - Stream Loop (20 FPS Stable)
echo.
REM Start in a new window so logs are visible
start "Nexvigil AI Agent" cmd /k "cd /d "%BACKEND%" && python ai_agent.py"

echo.
echo  DONE.
echo  The video feed should now be ULTRA SMOOTH.
echo.
pause
