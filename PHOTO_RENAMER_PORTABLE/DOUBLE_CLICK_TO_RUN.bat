@echo off
title Photo Status Matcher ^& Renamer (Portable)
cd /d "%~dp0"

echo ======================================================================
echo           PHOTO STATUS MATCHER ^& RENAMER (_U / _R TOOL)
echo ======================================================================
echo.

:: 1. Detect Python or Python Launcher
set "PYTHON_CMD="

python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=python"
    goto :python_found
)

py --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=py"
    goto :python_found
)

:: If Python is not found on client PC
echo ======================================================================
echo [ERROR] Python was not detected on this PC!
echo.
echo To run this application, please install Python 3:
echo   Method 1: Open PowerShell and type:
echo             winget install Python.Python.3.12
echo.
echo   Method 2: Download the official installer from:
echo             https://www.python.org/downloads/
echo             (Make sure to check "Add python.exe to PATH" during installation)
echo ======================================================================
echo.
pause
exit /b 1

:python_found
echo [+] Python detected:
%PYTHON_CMD% --version
echo.

:: 2. Check and install required libraries from requirements.txt
if exist "%~dp0requirements.txt" (
    echo [+] Checking and installing required libraries from requirements.txt...
    echo     Please wait, verifying dependencies...
    %PYTHON_CMD% -m pip install -r "%~dp0requirements.txt" --quiet --disable-pip-version-check
    if %ERRORLEVEL% EQU 0 (
        echo [+] All required libraries are ready and installed!
    ) else (
        echo [!] Warning: Some packages could not be installed. Attempting to start anyway...
    )
    echo.
)

:: 3. Launch application
echo [+] Launching Photo Status Matcher ^& Renamer...
echo.
%PYTHON_CMD% "%~dp0photo_renamer_tool.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Application exited with status code %ERRORLEVEL%.
    pause
)
