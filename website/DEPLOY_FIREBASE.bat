@echo off
title DataFlow Studio — Deploy to Firebase Hosting
cd /d "%~dp0"

echo ======================================================================
echo           DATAFLOW STUDIO — FIREBASE HOSTING DEPLOYMENT
echo ======================================================================
echo.

echo Checking Firebase CLI installation...
where firebase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Firebase CLI not found globally. Running via npx firebase-tools...
    call npx firebase-tools deploy --only hosting
) else (
    echo [INFO] Using installed Firebase CLI...
    call firebase deploy --only hosting
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTE] If you have not logged in to Firebase yet, run:
    echo        npx firebase-tools login
    echo.
    echo [NOTE] To connect to your specific Firebase project ID, run:
    echo        npx firebase-tools use --add
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo [SUCCESS] Website successfully deployed to Firebase Hosting!
echo ======================================================================
echo.
pause
