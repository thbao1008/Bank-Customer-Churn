@echo off
echo ============================================
echo Starting Bank Churn Prediction Backend...
echo ============================================
echo.

REM Go to Backend folder
cd /d "%~dp0"

REM Install requirements
echo [1/2] Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements-core.txt

echo.
echo [2/2] Starting FastAPI server...
echo Server will run at http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.

REM Run the backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
