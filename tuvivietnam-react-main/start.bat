@echo off
setlocal
title Tu Vi Hong An - Start All Services
echo Starting all website services...
set "PROJECT_DIR=%~dp0"
set "START_SCRIPT=%PROJECT_DIR%deployment\scripts\start_local.py"
if not exist "%START_SCRIPT%" (
    echo Startup script not found: "%START_SCRIPT%"
    pause
    exit /b 1
)
where python >nul 2>nul
if not errorlevel 1 (
    python -X utf8 "%START_SCRIPT%"
) else (
    py -3 -X utf8 "%START_SCRIPT%"
)
if errorlevel 1 (
    echo.
    echo Startup failed. Read the messages above, then press any key to close.
    pause >nul
)
endlocal
