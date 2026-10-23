@echo off
title MediaFlow Studio — Publish Release to GitHub
cd /d "%~dp0"

echo ======================================================================
echo       MEDIAFLOW STUDIO — PUBLISH RELEASE TO GITHUB
echo ======================================================================
echo.

if "%GH_TOKEN%"=="" (
    if "%GITHUB_TOKEN%"=="" (
        echo [WARNING] Neither GH_TOKEN nor GITHUB_TOKEN environment variable is set!
        echo.
        echo To publish directly from your local terminal to GitHub Releases:
        echo   1. Generate a GitHub Personal Access Token (classic) with 'repo' scope at:
        echo      https://github.com/settings/tokens
        echo   2. Set it in your terminal before running this script:
        echo      set GH_TOKEN=your_token_here
        echo.
        echo OR create a git tag and push to GitHub to let GitHub Actions build
        echo and publish automatically:
        echo      git tag v5.2.0
        echo      git push origin v5.2.0
        echo.
        set /p USER_TOKEN="Enter your GitHub Token now (or press Enter to cancel): "
        if "!USER_TOKEN!"=="" (
            echo Cancelled.
            pause
            exit /b 1
        )
        set "GH_TOKEN=!USER_TOKEN!"
    )
)

echo.
echo [1/2] Building presentation assets, Vite bundle, and Electron engine...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Packaging and Publishing installers to GitHub Releases...
call npx electron-builder --win nsis msi --publish always
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Publishing to GitHub failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo [SUCCESS] Release published to GitHub Releases successfully!
echo Check: https://github.com/BSFrameWorks5253/MediaFlow-Studio/releases
echo ======================================================================
pause
