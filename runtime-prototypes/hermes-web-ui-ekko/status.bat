@echo off
chcp 65001 >nul
python "%~dp0hermes.py" status
if errorlevel 1 pause
