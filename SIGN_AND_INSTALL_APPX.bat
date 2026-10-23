@echo off
:: ============================================================
::  SIGN_AND_INSTALL_APPX.bat
::  Right-click this file and select "Run as administrator"
:: ============================================================
title MediaFlow Studio - AppX Local Trust & Install

echo.
echo ================================================================
echo   MediaFlow Studio - Store AppX Local Testing Installer
echo ================================================================
echo.

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [IMPORTANT]
    echo Administrator permissions are required to trust the test certificate in Windows.
    echo.
    echo Please right-click this file and select:
    echo   "Run as administrator"
    echo.
    pause
    exit /b 1
)

set APPX=release\MediaFlow Studio_Store_v5.0.0.appx
set CER=build\PartnerStore_Signing.cer
set PFX=build\PartnerStore_Signing.pfx
set CERT_PASS=BSFrameWorks2026!
set SIGNTOOL=C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe

if not exist "%SIGNTOOL%" (
    for /f "delims=" %%F in ('dir /s /b "C:\Program Files (x86)\Windows Kits\10\bin\*signtool.exe" 2^>nul ^| findstr "x64"') do set SIGNTOOL=%%F
)

echo [1/3] Adding certificate to Local Machine TrustedPeople and Root store...
certutil -addstore -f "TrustedPeople" "%CER%"
certutil -addstore -f "Root" "%CER%"
echo.

echo [2/3] Signing AppX package with Partner Store test certificate...
"%SIGNTOOL%" sign /fd SHA256 /f "%PFX%" /p "%CERT_PASS%" "%APPX%"
echo.

echo [3/3] Installing AppX package...
powershell -Command "Add-AppxPackage -Path '%~dp0%APPX%'"

if %errorLevel% equ 0 (
    echo.
    echo ================================================================
    echo   [SUCCESS] MediaFlow Studio v5.0.0 AppX installed successfully!
    echo ================================================================
    echo You can now find MediaFlow Studio in your Windows Start Menu.
) else (
    echo.
    echo [NOTICE] If installation failed, please ensure "Developer Mode" is ON:
    echo Windows Settings -> System -> For developers -> Developer Mode: ON
)

echo.
pause
