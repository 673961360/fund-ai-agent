@echo off
chcp 65001 >nul
python "%~dp0hermes.py" update
if errorlevel 1 pause
