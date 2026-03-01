@echo off
title Nexvigil System Launcher

echo ==========================================
echo        Starting Nexvigil System
echo ==========================================
echo.

set PROJECT_ROOT=%~dp0

REM ------------------------------
REM START BACKEND
REM ------------------------------
echo Starting Nexvigil Backend...

call :START_COMPONENT "Nexvigil Backend" "%PROJECT_ROOT%Nexvigil_backend" "python main.py"


REM Wait few seconds before starting AI
timeout /t 5 >nul

REM ------------------------------
REM FIND AI AGENT FILE
REM ------------------------------
echo Searching for AI agent file...

REM Check for ai_agent\main.py OR ai_agent.py
set AI_FILE=
if exist "%PROJECT_ROOT%Nexvigil_backend\ai_agent\main.py" (
    set AI_FILE=ai_agent\main.py
) else if exist "%PROJECT_ROOT%Nexvigil_backend\ai_agent.py" (
    set AI_FILE=ai_agent.py
)

if "%AI_FILE%"=="" (
    echo.
    echo ERROR: AI Agent file (ai_agent/main.py or ai_agent.py) not found!
    echo Please verify the location in Nexvigil_backend folder.
    pause
    exit /b
)

echo Found AI Agent at: %AI_FILE%
echo.

REM ------------------------------
REM START AI AGENT
REM ------------------------------
echo Starting Nexvigil AI Agent...

call :START_COMPONENT "Nexvigil AI Agent" "%PROJECT_ROOT%Nexvigil_backend" "python %AI_FILE%"

REM ------------------------------
REM START FRONTEND
REM ------------------------------
echo Starting Nexvigil Frontend...

call :START_COMPONENT "Nexvigil Frontend" "%PROJECT_ROOT%Nexvigil_frontend" "npm run dev"

echo.
echo Nexvigil System Started Successfully!
echo.
pause
goto :EOF

REM Function to start component in new window
:START_COMPONENT
start "%~1" cmd /k "cd /d %~2 && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && echo %~1 is running... && %~3"
exit /b
