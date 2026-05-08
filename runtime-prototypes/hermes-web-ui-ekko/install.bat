@echo off
chcp 65001 >nul
echo ============================================
echo   Hermes Web UI (EKKO) - Install ^& Start
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH.
    echo [INFO] Please install Node.js first: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js detected.
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found in PATH.
    pause
    exit /b 1
)

echo [INFO] Installing hermes-web-ui globally...
npm install -g hermes-web-ui

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installation failed. Check npm output above.
    pause
    exit /b 1
)

echo.
echo [OK] hermes-web-ui installed successfully.
echo.
echo [INFO] Starting...
call start.bat
