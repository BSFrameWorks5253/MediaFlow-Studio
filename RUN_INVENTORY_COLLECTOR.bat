@echo off
title Inventory Report Collector — DataFlow Studio
cd /d "%~dp0"

echo ======================================================================
echo           DATAFLOW STUDIO — ALL INVENTORY REPORTS COLLECTOR
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

:: 2. Launch Inventory Report Collector
echo [+] Launching Inventory Report Collector...
%PYTHON_CMD% "%~dp0collect_inventory_reports.py" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Application exited with status code %ERRORLEVEL%.
    pause
)
