@echo off
echo ================================================
echo   Smart Energy Monitor — Starting Server
echo ================================================
echo.
cd /d "%~dp0"
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found! Download from https://python.org
    echo.
    pause
    exit /b 1
)
echo Starting server... (Ctrl+C to stop)
echo.
echo Open in browser:
echo   Dashboard: http://localhost:8000/index.html
echo   Website:   http://localhost:8000/website.html
echo   Admin:     http://localhost:8000/admin.html
echo.
start "" "http://localhost:8000/index.html"
python server.py
pause
