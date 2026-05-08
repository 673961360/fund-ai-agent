@echo off
chcp 65001 >nul
echo ============================================
echo   Hermes Web UI (EKKO) - Install
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH.
    echo [INFO] Please install Node.js first: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js detected.
echo.

REM Install hermes-web-ui globally
echo [INFO] Installing hermes-web-ui globally...
npm install -g hermes-web-ui
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed. Check output above.
    pause
    exit /b 1
)

echo.
echo [OK] hermes-web-ui installed successfully.
echo.
echo [INFO] Configuring Hermes address...
python "%~dp0hermes.py" config
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Configuration failed.
    pause
    exit /b 1
)

echo.
echo [INFO] Launching...
python "%~dp0hermes.py" start
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start hermes-web-ui.
    pause
    exit /b 1
)

pause
