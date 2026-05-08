@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo   Hermes Web UI (EKKO) - Hermes Address
echo ============================================
echo.

set "ENV_FILE=%~dp0.env"
set "FOUND_COUNT=0"

echo [1/2] Scanning local ports for Hermes Agent...
echo.

for %%P in (8056 8642 3000 5000 8080 8888) do (
    netstat -aon | findstr "0.0.0.0:%%P " | findstr LISTENING >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [+] Port %%P is listening
        set /a FOUND_COUNT+=1
        set "PORT_!FOUND_COUNT!=%%P"
    )
)

echo.
if !FOUND_COUNT! equ 0 (
    echo   (No Hermes found on common ports)
    echo   Tip: Hermes Agent default port is 8056
) else (
    echo   Found !FOUND_COUNT! listening port(s).
)
echo.

echo [2/2] Select Hermes Agent address:
echo.

set "MENU_INDEX=1"
for /L %%i in (1,1,!FOUND_COUNT!) do (
    set "P=!PORT_%%i!"
    echo   !MENU_INDEX!) 127.0.0.1:!P!
    set "CHOICE_!MENU_INDEX!=!P!"
    set /a MENU_INDEX+=1
)

set "MENU_CUSTOM=!MENU_INDEX!"
set /a MENU_INDEX+=1
echo   !MENU_CUSTOM!) Custom address (manual input)

set "MENU_CANCEL=!MENU_INDEX!"
set /a MENU_INDEX+=1
echo   !MENU_CANCEL!) Cancel (do nothing)

echo.
set /p USER_INPUT="Enter number to select: "

if "!USER_INPUT!"=="" goto invalid
if "!USER_INPUT!"=="!MENU_CANCEL!" goto cancel
if "!USER_INPUT!"=="!MENU_CUSTOM!" goto custom
if "!USER_INPUT!"=="" goto invalid

set "SELECTED=!CHOICE_%USER_INPUT%!"
if "!SELECTED!"=="" goto invalid

set "UPSTREAM=http://127.0.0.1:!SELECTED!"
goto save

:custom
echo.
set /p CUSTOM_ADDR="Enter Hermes address (e.g. http://192.168.1.100:8056): "
set "UPSTREAM=!CUSTOM_ADDR!"
goto save

:cancel
echo.
echo [INFO] Cancelled. No changes made.
pause
exit /b 0

:invalid
echo.
echo [ERROR] Invalid selection.
pause
exit /b 1

:save
echo.
echo [INFO] Saving UPSTREAM=!UPSTREAM! to .env file...
echo UPSTREAM=!UPSTREAM!> "%ENV_FILE%"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to save .env file.
    pause
    exit /b 1
)

echo.
echo [OK] Configuration saved successfully!
echo.
echo   UPSTREAM=!UPSTREAM!
echo.
echo Next step: run start.bat to launch with the new address.
echo.
pause
exit /b 0
