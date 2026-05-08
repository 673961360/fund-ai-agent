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

REM Load custom Hermes address from .env if exists
if exist "%~dp0.env" (
    for /f "tokens=1* delims==" %%A in ('findstr /v "^#" "%~dp0.env"') do (
        set "%%A=%%B"
    )
    if defined UPSTREAM (
        echo [INFO] Using UPSTREAM=%UPSTREAM% from .env
    )
)

REM Default: disable auth unless AUTH_TOKEN or AUTH_DISABLED is already set
if not defined AUTH_TOKEN (
    if not defined AUTH_DISABLED set AUTH_DISABLED=1
)
if defined AUTH_DISABLED (
    echo [INFO] Auth is disabled (AUTH_DISABLED=%AUTH_DISABLED%)
)

echo [INFO] Starting hermes-web-ui...
hermes-web-ui start

echo.
pause
