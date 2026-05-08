@echo off
chcp 65001 >nul
python "%~dp0hermes.py" start
if errorlevel 1 pause
