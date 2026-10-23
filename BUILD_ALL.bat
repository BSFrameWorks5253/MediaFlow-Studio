@echo off
title MediaFlow Studio v4.1 — All-in-One Package Creator (EXE + MSI + MSIX)
cd /d "%~dp0"

echo ======================================================================
echo    MEDIAFLOW STUDIO v4.1 — MASTER RELEASE PACKAGING SUITE
echo    Targets: Setup EXE + Enterprise MSI + Microsoft Store AppX/MSIX
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

echo [1/3] Generating presentation assets, visual tiles and AppX manifests...
call npm run build:installer-assets

echo.
echo [2/3] Compiling frontend (Vite) and backend (Electron TypeScript)...
call npm run build:vite
call npm run build:electron

echo.
echo [3/3] Packaging All Targets (NSIS EXE, WiX MSI, Microsoft Store AppX)...
call npx electron-builder --win nsis msi appx

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Packaging failed! Check errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo [SUCCESS] All packages generated successfully!
echo Output Directory: "%~dp0release"
echo ======================================================================
pause
