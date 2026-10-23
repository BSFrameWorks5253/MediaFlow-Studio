@echo off
title Photo Status Matcher ^& Renamer Tool
cd /d "%~dp0"

echo ======================================================================
echo           PHOTO STATUS MATCHER ^& RENAMER (_U / _R TOOL)
echo ======================================================================
echo.

:: 1. Detect Python
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

echo [ERROR] Python is not installed or not in PATH!
pause
exit /b 1

:python_found
echo [+] Python detected:
%PYTHON_CMD% --version
echo.

:: 2. Check and install requirements if requirements.txt exists
if exist "%~dp0requirements.txt" (
    echo [+] Verifying and installing required libraries...
    %PYTHON_CMD% -m pip install -r "%~dp0requirements.txt" --quiet --disable-pip-version-check
    echo [+] Libraries verified!
    echo.
)

:: 3. Launch application
echo [+] Launching Photo Status Matcher...
%PYTHON_CMD% "%~dp0photo_renamer_tool.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Application exited with status code %ERRORLEVEL%.
    pause
)
