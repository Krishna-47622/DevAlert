@echo off
echo STARTING DEBUG > debug_bat.txt
echo [CHECKING GLOBAL PYTHON] >> debug_bat.txt
python --version >> debug_bat.txt 2>&1
python ultimate_db_fix.py >> debug_bat.txt 2>&1

echo [CHECKING VENV PYTHON] >> debug_bat.txt
.venv\Scripts\python.exe --version >> debug_bat.txt 2>&1
.venv\Scripts\python.exe ultimate_db_fix.py >> debug_bat.txt 2>&1

echo FINISHED >> debug_bat.txt
