# Changelog

All notable changes to **MediaFlow Studio** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Calendar Versioning](https://calver.org/) (`YY.MM.DD`).

## [26.11.12] - 2026-11-12

### Added
- **Stage 2–6 Auto Run Pipeline**: Automated sequential runner across Stages 2 through 6 (Video Transfer, Photo Matcher, Remaining Shifter, Thumbnail Separator, and Event Distributor) with live progress tracking and conflict pause/resolution modal.
- **Internal Dual-Pane Sync Inspector**: Lightweight side-by-side photo and video comparator modal built directly into MediaFlow Studio as an in-app fallback when external Anything File Manager is not installed.
- **Structure Creator Auto-Linking**: Automatic path detection and wiring for Remaining Shifter and Thumbnail Shifter from Stage 01 Structure Creator.
- **Reset Active Structure Action**: Button in the Structure Generator header allowing instant reset of active Safar paths for standalone, independent folder processing.
- **Case-Sensitive Placard Abbreviations**: Multi-character matching logic prioritizing capitalized event abbreviations (e.g., `aQ` -> `Q`, `aZ` -> `Z`, `bZ` -> `Z`).

### Changed
- **Permanent Studio Pro Mode**: Completely removed the Simple Mode switcher and pill toggle from the sidebar, locking the interface into full 9-stage workstation mode.
- **High-Density Desktop Layout**: Streamlined workstation aesthetics with 33px sidebar items, 40px top bar, 10px glass card curvature, and 100% professional SVG iconography (zero emoji clutter).
- **Single Active Notification Architecture**: Replaced multi-toast stacking in `App.tsx` with a single active notification slot, 2.5s message debounce, and faster auto-dismiss (2.8s for success/info).
- **Silent Background Rescans**: Background rescans after executing transfers, renames, and separations now run silently (`handleScan(true)`) to ensure 1 user action produces exactly 1 clear notification.

### Fixed
- **Photo Folder Relocation Bug**: Eliminated post-transfer auto-move to `Main Data` in `VideoTransferPage.tsx`. Video files are now transferred strictly into their matched photo subfolders without relocating or cut/pasting the parent photo directory into previous Safar structures.
- **Multi-Toast Spam**: Resolved 3-toast notification storm when executing video transfers, photo tag renames, and file separations.
- **Mouse Event Incompatibility**: Resolved parameter type mismatch on `handleScan` across all pipeline pages when invoked directly from React button click events.
- **Silent Clipboard Priming**: Prevented dual notifications when saving report files in `FolderVerificationPage.tsx`.

---

## [6.0.0] - 2026-10-23
- Initial major release with Apple WWDC26 Liquid Glass UI and Anything Child App Ecosystem integration.
- Multi-camera PV separation pipeline and thumbnail memory management.
- Standalone Frameless Adobe Splash Window with live telemetry handoff.
- Automated Windows NSIS installer and Portable executable builds.
