@echo off
echo ============================================================
echo Starting DevAlert Application
echo ============================================================
echo.

cd /d "%~dp0backend"
call .venv\Scripts\activate.bat
python app.py

pause
