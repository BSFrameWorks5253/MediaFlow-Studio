# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **Media Uploaders**, Ingest Operators, and Digital Imaging Technicians (DITs) working in high-pressure studio, event, and production environments. They are tasked with offloading, organizing, synchronizing, and validating multi-terabyte batches of raw photos and video footage from camera cards and local drives before cloud handoff, distribution, or editing.

## Product Purpose

DataFlow Studio is an offline-first, zero-data-loss, deterministic desktop media ingestion, organization, and spreadsheet fusion platform. It eliminates manual sorting errors, namespace collisions, and silent data corruption across massive multi-camera production archives, delivering verifiable, structured outputs ready for storage, client review, and Google Drive upload.

## Positioning

Unlike generic file copy utilities or manual explorer workflows, DataFlow Studio provides a deterministic, multi-stage processing pipeline built specifically for media production pipelines: automated Photo/Video separation, token-based video-to-photo folder matching, dual-thumbnail extraction (`_P` / `_V`), remaining asset reconciliation (`_U` vs `_R`), and deep-merging of multi-camera inventory spreadsheets with atomic filesystem guarantees.

## Operating Context

- Desktop environment (Windows native shell integration, registered Application User Model ID `BSFrameWorks.DataFlow.Studio.v4`, single-instance mutex enforcement).
- Interfacing with fast external SSDs, high-speed CFexpress/SD cards, local NVMe staging drives, and structured Google Drive folder hierarchies.
- Processing multi-terabyte datasets comprising RAW stills (.CR3, .ARW, .NEF, etc.), ProRes/MP4/MOV videos, WAV multi-track audio, sidecar metadata, and Excel inventory sheets.
- High-stress shoot turnarounds where data loss or misplaced footage has immediate financial and operational consequences.

## Capabilities and Constraints

- **P/V Separator**: Deterministic separation of RAW photos from video, audio, and sidecar media.
- **Photo Matcher**: Compares Remaining photos against Original baseline, tagging `_U` (Used) vs `_R` (Remaining).
- **Video Transfer Engine**: Matches and synchronizes video clips into corresponding photo subfolders using sequence numbers and token matching.
- **Thumbnail Separator**: Extracts and aggregates `_P` and `_V` thumbnail assets for lightweight browsing.
- **Remaining Collector**: Consolidates date-level remaining media into master production trees.
- **Excel Report Fusion**: Deep-merges multi-camera inventory workbooks and generates comprehensive separation telemetry.
- **Isolated Utilities**: Standalone tools (Event Distributor, Do Not Upload isolator, Google Drive folder tree generator).
- **Technical Constraints**: Offline-first operation, deterministic I/O, no reliance on active internet connectivity for core processing, strict zero-data-loss and non-destructive source policies.

## Brand Commitments

- **Product Name**: MediaFlow Studio (by BSFrameWorks).
- **Brand Voice**: Precision-engineered, dependable, professional, technical, robust.
- **Aesthetic Direction**: High-tech studio workstation, obsidian dark mode, dynamic liquid aurora accents, glassmorphic HUD styling with responsive micro-feedback.

## Evidence on Hand

- Complete system logic and algorithmic architecture specification (`DATAFLOW_SYSTEM_LOGIC_SPECIFICATION.md`).
- Fully implemented Electron + React 19 + TypeScript codebase with custom themes and modular engine architectures (`src/`, `electron/`).
- Python native worker and report fusion engines (`electron/engines/scripts/`).

## Product Principles

1. **Zero Data Loss & Determinism Above All**: File operations, moves, and renames must be verifiable, deterministic, and safe against crashes or disk interruptions.
2. **Built for Ingest Speed & Cognitive Clarity**: Ingest operators need immediate, glanceable status, unblocked UI threads, and explicit confirmation for batch operations.
3. **Robust Separation of Concerns**: High-performance backend filesystem operations decoupled from the responsive visual viewport.
4. **Resilient Offline First**: Full functionality without external service dependencies, respecting local storage topologies and high-bandwidth drive buses.

## Accessibility & Inclusion

- Keyboard navigability across tables and process controls.
- High-contrast text legibility against dark glass surfaces and aurora accents.
- Distinct color coding paired with descriptive status badges (not relying solely on color to communicate success, warning, or error states).
