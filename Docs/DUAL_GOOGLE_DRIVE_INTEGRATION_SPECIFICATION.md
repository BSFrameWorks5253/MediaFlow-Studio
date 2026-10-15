# DataFlow Studio — Dual Google Drive Architecture & Implementation Guide

> Complete technical document detailing how DataFlow Studio executes all pipeline stages across two isolated Google Drive accounts (Main Drive & Reference Drive).

---

## 📑 Document Structure & Navigation

- **Core Blueprint Document**: [`Docs/blueprints/07_DUAL_GOOGLE_DRIVE_INTEGRATION_ARCHITECTURE.md`](blueprints/07_DUAL_GOOGLE_DRIVE_INTEGRATION_ARCHITECTURE.md)
- **Target Drives**:
  1. **Google Drive 01 ("Main Drive")**: Account 1 — Master RAW photos (`.CR3`, `.ARW`), Master ProRes/4K Video clips (`.MOV`, `.MP4`), and production archives.
  2. **Google Drive 02 ("Reference Drive")**: Account 2 — Extracted `_P` and `_V` thumbnails, `_R` remaining photos, event selection galleries, and client review workbooks.

---

## ⚡ Quick Architecture Overview

```
                        ┌────────────────────────────────────────────────────────┐
                        │                 DATAFLOW STUDIO DESKTOP                │
                        │        Fast Local Staging (NVMe/SSD Workspace)         │
                        └───────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼
                        ┌────────────────────────────────────────────────────────┐
                        │          DUAL-DRIVE CLOUD DISPATCH DAEMON              │
                        │  (Chunked 16MB Resumable Upload + Multi-Thread Stream) │
                        └─────────────┬────────────────────────────┬─────────────┘
                                      │                            │
             [High-Bitrate Masters & RAW Assets]   [Thumbnails, Previews & Reports]
                                      │                            │
                                      ▼                            ▼
                       ┌────────────────────────────┐┌────────────────────────────┐
                       │      GOOGLE DRIVE 01       ││      GOOGLE DRIVE 02       │
                       │       "MAIN DRIVE"         ││     "REFERENCE DRIVE"      │
                       │   Account 1: Master Vault  ││  Account 2: Client & Review│
                       ├────────────────────────────┤├────────────────────────────┤
                       │ • Master RAW Photos (.CR3) ││ • Extracted Photos (_P)    │
                       │ • Master 4K/8K Video (MOV) ││ • Extracted Video Clips(_V)│
                       │ • Synced Sequence Folders  ││ • Remaining Photos (_R)    │
                       │ • Production Archive Stills││ • Event Client Selections  │
                       │ • Master Excel Ingest Rep  ││ • Client Review Spreadsheets│
                       └────────────────────────────┘└────────────────────────────┘
```

---

## 🛠️ Key Implementation Pillars

1. **Dual OAuth 2.0 PKCE Authentication**:
   - Zero hardcoded client secrets.
   - Encrypted token storage using Windows DPAPI (`safeStorage`) in `userData/drive_credentials.enc`.
   - Independent session partitions (`persist:main_drive` and `persist:ref_drive`).

2. **16 MB Chunked Resumable Upload Engine (RFC 7233)**:
   - Chunk-by-chunk HTTP PUT requests to Google Drive API v3.
   - Automatic pause/resume upon network drops.
   - Zero lost bytes and MD5 checksum validation upon completion.

3. **Quota Doubling & Mitigation**:
   - Google Drive enforces a 750 GB/user/day upload limit.
   - Splitting workloads across 2 distinct accounts increases total daily ingest capacity to **1.5 TB/day**.

4. **Preserved High Ingestion Speed**:
   - All computationally expensive operations (RAW separation, EXIF parsing, thumbnail generation, video sequence token matching) remain 100% offline and instantaneous on local NVMe storage.
   - Cloud uploads occur asynchronously in the background via a dedicated worker pool.

---

For complete code examples (TypeScript, Electron Main Process, Auth Manager, Resumable Uploader), API rate limit handling, and UI mockups, refer to the full specification:
👉 [**Read Full Blueprint 07 Document**](blueprints/07_DUAL_GOOGLE_DRIVE_INTEGRATION_ARCHITECTURE.md)
