@echo off
python "%~dp0hermes.py" %*
if errorlevel 1 pause
