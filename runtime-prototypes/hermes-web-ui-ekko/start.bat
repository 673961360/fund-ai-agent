@echo off
chcp 65001 >nul
echo ============================================
echo   Hermes Web UI (EKKO) - Start
echo ============================================
echo.

where hermes-web-ui >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] hermes-web-ui not found in PATH.
    echo [INFO] Install it first: npm install -g hermes-web-ui
    pause
    exit /b 1
)

echo [INFO] Disabling authentication (AUTH_DISABLED=1)...
set AUTH_DISABLED=1

echo [INFO] Starting hermes-web-ui...
hermes-web-ui start

echo.
pause
