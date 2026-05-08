@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting dev server...
echo.
echo ========================================
echo   Hermes Chat Prototype
echo   Open http://localhost:5173 or http://^<LAN-IP^>:5173
echo   Press Ctrl+C to stop
echo ========================================
echo.

call npm run dev

pause
