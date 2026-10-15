@echo off
title MediaFlow Studio v4.1 — Microsoft Store MSIX Builder
cd /d "%~dp0"

echo ======================================================================
echo    MEDIAFLOW STUDIO v4.1 — MICROSOFT STORE MSIX PACKAGING (BLUEPRINT 06)
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

echo [1/3] Generating Windows 10/11 Live Tile and Store Assets...
python scripts/generate_appx_assets.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to generate AppX assets!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Building presentation assets, Vite bundle, and Electron engine...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build compilation failed! Check errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Packaging Microsoft Store MSIX Package (.msix) via Electron Builder...
call npx electron-builder --win appx

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Packaging MSIX failed! Check errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo  [SUCCESS] Microsoft Store MSIX Package compiled successfully!
echo  Deliverable Location: release\MediaFlow Studio_Store_V4.1.0.msix
echo  Upload this package directly to Microsoft Partner Center.
echo ======================================================================
pause
