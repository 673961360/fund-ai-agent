@echo off
chcp 65001 >nul
echo ============================================
echo   Hermes Web UI (EKKO) - Update
echo ============================================
echo.

where hermes-web-ui >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] hermes-web-ui not found in PATH.
    pause
    exit /b 1
)

echo [INFO] Updating to latest version...
hermes-web-ui update

echo.
pause
