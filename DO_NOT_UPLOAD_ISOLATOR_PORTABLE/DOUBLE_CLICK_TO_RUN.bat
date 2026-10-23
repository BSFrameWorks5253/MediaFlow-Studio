@echo off
title DO NOT UPLOAD Folder Isolator Tool
cd /d "%~dp0"

echo ====================================================================
echo  DO NOT UPLOAD Folder Isolator Tool
echo  Scans for 'Contributer' & 'Documents' and organizes them date-wise
echo ====================================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in system PATH.
    echo Please install Python 3.8+ or run from DATAFLOW Studio.
    pause
    exit /b 1
)

python isolate_do_not_upload.py
if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Tool finished or closed.
    pause
)
