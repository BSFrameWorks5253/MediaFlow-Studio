@echo off
title MediaFlow Studio v4.1 — Windows MSI Installer Builder
cd /d "%~dp0"

echo ======================================================================
echo       MEDIAFLOW STUDIO v4.1 — ENTERPRISE MSI INSTALLER BUILDER
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
echo [2/2] Packaging Enterprise Windows MSI Installer via Electron Builder...
call npx electron-builder --win msi

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] MSI Packaging failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo [SUCCESS] DataFlow Studio Enterprise MSI generated successfully!
echo Output folder: "%~dp0release"
echo ======================================================================
echo.
explorer "%~dp0release"
pause
