@echo off
:: PaintPro Print Hub — Auto-Start Installer
:: Double-click this file once and the print hub will start automatically every time Windows boots.

set "SCRIPT=%~dp0print_hub.py"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\PaintPro Print Hub.bat"

echo.
echo  PaintPro Print Hub — Auto-Start Setup
echo  =======================================

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Python is not installed.
    echo  Download it free from python.org
    echo  Make sure to check "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)

:: Install requests if needed
echo  Installing requests library...
pip install requests --quiet

:: Write a small launcher into the Startup folder
echo @echo off > "%SHORTCUT%"
echo start /min pythonw "%SCRIPT%" >> "%SHORTCUT%"

echo.
echo  Done! The print hub will now start automatically every time Windows boots.
echo  It runs silently in the background — no window, no hassle.
echo.
echo  Starting it now for this session...
start /min pythonw "%SCRIPT%"
echo  Print hub is running.
echo.
pause
