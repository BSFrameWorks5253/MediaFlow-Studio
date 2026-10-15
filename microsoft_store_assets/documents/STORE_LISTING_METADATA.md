# 🛒 Microsoft Store Listing Metadata — DataFlow Studio v4.0

This document contains the exact copy, specifications, and metadata fields formatted for entry into the **Microsoft Partner Center** for the official Microsoft Store listing.

---

## 1. Store Product Identity
* **App Name**: DataFlow Studio
* **Package Identity Name**: `BSFrameWorks.DataFlow.Studio.v4`
* **Publisher Display Name**: BSFrameWorks
* **Version**: `4.0.0`
* **Release Channel**: Production / Retail
* **Target Platforms**: Windows 10 (version 1903 / build 18362 or higher), Windows 11 (all versions)
* **Architecture**: `x64` (64-bit Intel/AMD)

---

## 2. Short Description (Subtitle)
> **Limit: Up to 100 characters**

```text
Professional Media Ingestion, Synchronization & Report Fusion Desktop Suite.
```
*(Character count: 76 characters)*

---

## 3. Full Product Description
> **Formatted for the Microsoft Store listing description field**

```text
DataFlow Studio v4.0 is a high-performance desktop production suite engineered for media producers, studio editors, event photographers, and enterprise videography teams. Designed to eliminate bottlenecks in high-volume post-production workflows, DataFlow Studio unites lightning-fast media ingestion, intelligent file segregation, multi-camera synchronization, and automated Excel report fusion into an elegant, unified pipeline.

Built from the ground up for Windows 10 and Windows 11, DataFlow Studio combines a 32-thread parallel worker engine with strict atomic filesystem operations to handle terabytes of 4K/8K footage and high-resolution RAW photo captures with zero data corruption risk.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY MODULES & PIPELINE ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ STAGE 00 • PV SEPARATOR
Instantly ingest mixed media dumps and atomically bifurcate photos (JPG, CR2, CR3, ARW, NEF, DNG) from video files (MP4, MOV, MXF) in milliseconds. Features automatic deletion audit manifests and zero-loss integrity verification.

⚡ STAGE 01 • UPLOAD STRUCTURE GENERATOR
Automatically construct standardized, clean production directory trees. Generates project hierarchies, camera subdirectories, and staging pools tailored for studio archive standards.

⚡ STAGE 02 • PHOTO STATUS TAGGER & MATCHER
Synchronize camera photo rosters with master event manifests. Automatically detect missing frames, tag selection statuses, and match capture sequences with multi-camera timestamps.

⚡ STAGE 03 • REMAINING SHIFTER & COLLECTOR
Filter out unselected, auxiliary, and overflow media files without manual hunting. Move unselected media into dedicated staging buckets with atomic speed.

⚡ STAGE 04 • EVENT IMAGE DISTRIBUTOR
Intelligently categorize and distribute master reference photographs across sub-events, teams, or client delivery folders using smart abbreviation indexes.

⚡ STAGE 05 • MULTI-CAMERA VIDEO TRANSFER ENGINE
High-throughput 8 MB chunk streaming engineered for high-bandwidth cross-drive NVMe/SSD data transfers. Intelligently maps multi-camera video clips (CAM1, C0001, 01-Q prefixes) directly to synchronized timeline bins.

⚡ STAGE 06 • THUMBNAIL SHIFTER
Isolate lightweight thumbnail proxies and preview files from master raw captures to accelerate cloud upload pipelines and client proofing.

⚡ STAGE 07 • DEEP-STYLE EXCEL FUSION ENGINE
Integrated Python openpyxl engine that merges disparate camera manifests, inventory reports, and billing sheets into a single master workbook. Preserves original font styling, cell borders, custom fills, and formula integrity with 1:1 fidelity.

⚡ PRODUCTION TOOLKIT
Includes standalone utilities for compound extension cleanup (.CR3.jpg → .jpg), video thumbnail suffix taggers (_V), and pre-flight storage headroom safety probes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTERPRISE SAFETY & PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 32-Thread Concurrency: Instantaneous atomic moving and renaming operations across local drives.
• Storage Headroom Probe: Proactively scans target drive free space before executing multi-gigabyte transfers to prevent disk saturation.
• 100% Local Processing: All operations run locally on your machine. Your media never leaves your hardware.
• Modern Liquid Interface: Built with high-DPI scaling, dark obsidian glass aesthetics, smooth animations, and customizable Aurora theme palettes.
```

---

## 4. Product Highlights & Features
> **Enter up to 20 key features in Microsoft Partner Center**

1. **Instant Atomic Media Separation**: Rapidly segregates RAW/JPEG photos from video assets without full-disk duplication.
2. **Multi-Camera Clip Synchronization**: Matches camera prefixes (`CAM1`, `001 01-Q`, `C0001`) with master shooting schedules.
3. **High-Throughput Cross-Drive Engine**: 8 MB streaming transfer buffer optimized for fast NVMe, SSD, and external drive ingestion.
4. **Python-Powered Excel Fusion**: Deep style cloning preserving cell borders, font families, colors, and complex Excel formulas.
5. **32-Thread Concurrency Architecture**: Accelerates bulk rename, move, and directory sorting operations.
6. **Pre-Flight Disk Safety Probes**: Verifies target drive capacity prior to ingestion to prevent disk-full crashes.
7. **Automated Audit Manifests**: Automatically outputs Excel audit trails and deletion verification manifests.
8. **Compound Extension Normalizer**: Cleans camera anomalies such as `.CR3.jpg` and `.NEF.jpg` into clean filenames.
9. **Event Reference Image Distributor**: Automatically sorts master event photographs into designated subfolders.
10. **Cloud Sync Staging**: Prepares clean, standardized directory structures optimized for Google Drive and OneDrive sync.
11. **Native High-DPI Windows Support**: Razor-sharp typography and crisp icon scaling on 1080p, 1440p, and 4K displays.
12. **Customizable Aurora Themes**: Includes Obsidian Pro, Hyper Emerald, Sunset Glow, and Stealth Indigo visual themes.
13. **Local & Air-Gapped Operation**: Runs completely offline without mandatory accounts, cloud logins, or telemetry tracking.
14. **Non-Destructive Workflows**: Safeguards source media integrity with transactional checks and atomic rename mechanisms.

---

## 5. What's New in Version 4.0 (Release Notes)
```text
DataFlow Studio v4.0 Release Notes:
• Professional Setup Installer: New polished, customizable Windows installation wizard with desktop and Start Menu integration.
• Enhanced Excel Fusion Engine: Improved cell formatting preservation and multi-sheet camera summary reporting via openpyxl.
• Faster Disk Probing: Real-time drive headroom calculation before multi-gigabyte ingestion.
• UI & Performance Polish: Updated v4.0 PRO navigation badges, enhanced high-DPI font rendering, and updated Aurora theme presets.
• Windows 11 Compatibility: Certified for Windows 11 23H2/24H2 with improved taskbar group management.
```

---

## 6. Search Terms / Keywords
> **Up to 7 keywords, maximum 30 characters each**

1. `media ingestion`
2. `photo organizer`
3. `video sync`
4. `excel merger`
5. `file batch rename`
6. `production workflow`
7. `camera transfer`

---

## 7. System Requirements

| Specification | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Windows 10 (x64) version 1903+ | Windows 11 (x64) version 22H2+ |
| **Architecture** | 64-bit (x64 Intel / AMD) | 64-bit (x64 Intel / AMD) |
| **Processor** | Dual-core 2.0 GHz | Quad-core 3.0 GHz or higher |
| **Memory (RAM)** | 4 GB | 8 GB or 16 GB |
| **Storage** | 300 MB free space (for app installation) | Fast NVMe SSD storage for media work |
| **Display** | 1280 x 800 | 1920 x 1080 (Full HD) or higher |
| **Graphics** | DirectX 11 compatible GPU | Dedicated GPU with hardware acceleration |

---

## 8. Store Categorization & Content Rating
* **Primary Category**: `Developer tools` OR `Productivity`
* **Secondary Category**: `Photo & video` / `Utilities & tools`
* **Age Rating (IARC Rating Questionnaire Answers)**:
  * Contains violence? **No**
  * Contains bad language? **No**
  * Contains sexual content? **No**
  * Contains controlled substances? **No**
  * Shares user location? **No**
  * Allows users to exchange messages? **No**
  * Shares personal data? **No**
  * **Resulting Rating**: **PEGI 3 / ESRB Everyone / Universal (All Ages)**

---

## 9. Pricing & Availability
* **Base Price**: Free / Paid (as per publisher strategy)
* **Markets**: Worldwide (all 241 countries and regions)
* **Licensing**: Standard Application License Terms (SALT) or BSFrameWorks Commercial EULA

---

## 10. Notes for Microsoft Certification Reviewers
> **Copy this exact block into the "Notes for certification" field in Microsoft Partner Center**

```text
DataFlow Studio is a desktop utility application for professional media file management, photo/video organization, and local Excel report generation.

Testing Instructions:
1. The application does NOT require any user login, account creation, or online subscription to test.
2. Launch the application. The main Workspace Overview dashboard will load immediately.
3. Test Stage 00 (PV Separator) or Stage 01 (Upload Structure) by selecting any local test directory containing sample JPG or MP4 files.
4. All file operations and processing occur locally on the machine.
5. In Settings, various UI visual themes (Obsidian, Sunset, Emerald) and concurrency settings can be toggled.
```
