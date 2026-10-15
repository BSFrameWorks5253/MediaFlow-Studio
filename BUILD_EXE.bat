@echo off
title MediaFlow Studio v4.1 — Windows Setup Builder
cd /d "%~dp0"

echo ======================================================================
echo       MEDIAFLOW STUDIO v4.1 — PRODUCTION WINDOWS SETUP BUILDER
echo ======================================================================
echo.

if not exist "node_modules" (
    echo [INFO] Dependencies not detected. Running npm install...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b %ERRORLEVEL%
    )
)

echo [1/2] Building presentation assets, Vite bundle, and Electron engine...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build compilation failed! Check errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Packaging Professional Windows Setup (.exe) via Electron Builder...
call npx electron-builder --win nsis

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Packaging failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo [SUCCESS] DataFlow Studio Setup generated successfully!
echo Output folder: "%~dp0release"
echo ======================================================================
echo.
explorer "%~dp0release"
pause
