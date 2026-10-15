; ====================================================================
; MEDIAFLOW STUDIO - ENTERPRISE WINDOWS NSIS INSTALLER (BLUEPRINT 05)
; ====================================================================

Unicode true
!define PRODUCT_NAME "MediaFlow Studio"
!define PRODUCT_VERSION "4.1.0"
!define PRODUCT_PUBLISHER "BSFrameWorks"
!define PRODUCT_WEB_SITE "https://github.com/BSFrameWorks/dataflow-studio"
!define EXECUTABLE_NAME "MediaFlow Studio.exe"

SetCompressor /SOLID lzma
RequestExecutionLevel user

; ── MODERN UI 2 ───────────────────────────────────────────────────────
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "..\public\assets\app.ico"
!define MUI_UNICON "..\public\assets\app.ico"

; Custom Left Sidebar Banner (164x314 BMP) & Top Header (150x57 BMP)
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "..\build\installerHeader.bmp"
!define MUI_HEADERIMAGE_RIGHT

!define MUI_WELCOMEFINISHPAGE_BITMAP "..\build\installerSidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "..\build\uninstallerSidebar.bmp"

; ── INSTALLATION PAGES ────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXECUTABLE_NAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch MediaFlow Studio v${PRODUCT_VERSION}"
!insertmacro MUI_PAGE_FINISH

; ── UNINSTALLER PAGES ─────────────────────────────────────────────────
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; ── CORE FILES INSTALLATION ───────────────────────────────────────────
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "..\release\win-unpacked\*.*"

  ; Create Start Menu & Desktop Shortcuts
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${EXECUTABLE_NAME}"
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${EXECUTABLE_NAME}"
  
  ; Register Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Windows Add/Remove Programs Registry Entries
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME} v${PRODUCT_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" '"$INSTDIR\${EXECUTABLE_NAME}"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
SectionEnd

; ── UNINSTALLATION ────────────────────────────────────────────────────
Section "Uninstall"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\*.*"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

  ; Remove uninstallation registry keys
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

  ; Clean app directory (preserves %APPDATA%/userData per Blueprint 01 & 05)
  RMDir /r "$INSTDIR"
SectionEnd
