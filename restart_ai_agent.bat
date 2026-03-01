@echo off
title Nexvigil — Restart AI Agent (Smooth Stream)
echo.
echo  ============================================
echo   Nexvigil AI Agent Restart
echo  ============================================
echo.

set BACKEND=%~dp0Nexvigil_backend

echo [1] Stopping existing AI Agent processes...
taskkill /F /FI "WINDOWTITLE eq Nexvigil AI Agent*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq *ai_agent*" /T 2>nul
timeout /t 2 /nobreak >nul

echo [2] Setting all cameras to active...
cd /d "%BACKEND%"
if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat
python fix_cameras_active.py

echo.
echo [3] Starting AI Agent (Smooth Stream Edition)...
start "Nexvigil AI Agent" cmd /k "cd /d "%BACKEND%" && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && python ai_agent.py"

echo.
echo  Done! Stream should be smooth in 5-10 seconds.
echo  Watch the AI Agent window for "Write FPS: XX.X" logs.
echo.
pause
