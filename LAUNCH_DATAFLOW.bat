@echo off
title MediaFlow Studio — Creative Production Suite
cd /d "%~dp0"

echo ===================================================
echo  MediaFlow Studio — React + Electron Desktop Launcher
echo ===================================================

if "%1"=="--dev" goto RUN_DEV
if "%1"=="dev" goto RUN_DEV

if "%1"=="--build" (
    echo [INFO] Rebuilding production UI bundle...
    call npm run build:vite
)

if not exist "node_modules" (
    echo [INFO] First-time setup: Installing dependencies...
    call npm install
)

if not exist "dist" (
    echo [INFO] Building UI bundle...
    call npm run build:vite
)

call npm run build:electron

echo [INFO] Launching DataFlow Studio desktop app...
call npx electron dist-electron/main.js
goto END

:RUN_DEV
echo [INFO] Starting DataFlow Studio in Development Mode (Live HMR)...
call npm run dev

:END
