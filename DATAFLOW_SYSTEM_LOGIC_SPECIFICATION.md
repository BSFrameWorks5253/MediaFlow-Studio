# DataFlow Studio — Exhaustive System Logic & Algorithmic Architecture Specification

## 1. System Overview & Foundational Architecture

### 1.1 Architectural Philosophy

The system is an offline-first, zero-data-loss, deterministic media ingestion and synchronization platform. It is engineered to process multi-terabyte production data sets consisting of RAW still photographs, high-bitrate video master files, multi-channel audio tracks, and sidecar metadata without manual intervention, namespace collisions, or silent data corruption.

### 1.2 Dual-Tier Decoupled Runtime Model

The platform operates on a decoupled architecture separating presentation logic from disk and I/O execution:

- **Presentation Tier**: Manages visual viewports, user input capture, progress display, dialog lifecycles, and interactive verification tables.

- **Native Backend Runtime Tier**: Runs multi-threaded directory scanners, atomic filesystem operations, token-parsing algorithms, string normalization heuristics, binary and chunked file copiers, and workbook serializers.

- **Asynchronous Signal-Slot Bridge**: Communication across the boundary occurs via strongly-typed, non-blocking asynchronous event dispatches. Long-running disk scans and batch transfers run on background worker threads, emitting progress and telemetry payloads to keep the user interface responsive.

### 1.3 Single-Instance Enforcement Protocol

To prevent write collisions and lock conflicts when multiple application processes are launched simultaneously:

1. Upon startup, the process attempts to bind a unique named local socket identifier (`DataFlow_Studio_SingleInstance_LocalServer_v3`).

1. If binding fails due to an existing active server:

- The secondary process establishes a client connection to the existing socket.

- It sends a wake-up packet to the active instance.

- The primary instance intercepts the connection, queries the operating system window manager, restores the window if minimized, brings it to the foreground, and forces active window focus.

- The secondary instance terminates immediately with exit code `0`.

1. If an orphaned socket endpoint remains from an abnormal system shutdown, the stale endpoint is purged and re-bound.

### 1.4 Operating System Taskbar & Shell Registration

- A persistent application user model ID (`BSFrameWorks.DataFlow.Studio.v3`) is registered directly with the operating system shell prior to window instantiation.

- Native window messaging APIs dispatch `WM_SETICON` calls directly to the window handle upon initialization to link both high-resolution (32x32) and low-resolution (16x16) icon resources into the operating system message pump.

## 2. Global Execution Pipeline Workflow

The complete media preparation lifecycle follows a deterministic six-stage pipeline:

[Raw Media Drive / Card]

│

▼

┌──────────────────────────┐

│ 1. PV Separator Engine   │ ──► Classifies and separates RAW photos from video/audio/sidecars

└────────────┬─────────────┘

▼

┌──────────────────────────┐

│ 2. Photo Matcher Engine  │ ──► Compares Remaining photos against Original, tags _U vs _R

└────────────┬─────────────┘

▼

┌──────────────────────────┐

│ 3. Video Transfer Engine │ ──► Synchronizes video clips with photo subfolders by sequence/token

└────────────┬─────────────┘

▼

┌──────────────────────────┐

│ 4. Thumbnail Separator   │ ──► Recursively extracts _P and _V thumbnail files into target tree

└────────────┬─────────────┘

▼

┌──────────────────────────┐

│ 5. Remaining Collector   │ ──► Consolidates date-level remaining folders into master tree

└────────────┬─────────────┘

▼

┌──────────────────────────┐

│ 6. Report Merger Engine  │ ──► Deep-merges multi-camera inventory spreadsheets into master workbook

└──────────────────────────┘

## 3. Detailed Engine Logic & Algorithms

### 3.1 Stage 1: Photo-Video RAW Separator Engine (PV Separator)

3.1.1 File Classification Taxonomy

The engine classifies all filesystem items into five distinct media categories based on case-insensitive file extension sets:

- **RAW Photo Extensions**:

- **Raster & Web Photo Extensions**:

- **Master Video Extensions**:

- **Audio Extensions**:

- **Sidecar Metadata Extensions**:

- Photo Sidecars: `.xmp`, `.aae`, `.nksc`, `.cos`

- Video Sidecars: `.xml`, `.srt`, `.thm`, `.vtt`

- Audio Sidecars: `.pkf`

- **System Skip Files**:

3.1.2 Dynamic Sidecar Parent Association Algorithm

Sidecar files do not contain intrinsic media streams. To maintain sidecar linkage:

1. When directory traversal begins, every base stem (filename without extension) is indexed:

$$\text{stem\_map}[\text{lowercase}(\text{file\_stem})] \leftarrow \text{media\_type}$$

1. For any sidecar file encountered:

- Check if its stem exists in $\text{stem\_map}$.

- If present, classify the sidecar as the parent media type (e.g., `.xmp` matching a photo is tagged `photo`; `.thm` matching a video is tagged `video`).

- If not found in the local folder, fall back to the default sidecar mapping table.

3.1.3 Storage Headroom Pre-flight Probe

Before beginning file movement or copying, destination disk capacity is verified:

$$\text{FreeBytes} = \text{DiskUsage}(\text{Destination Path}).\text{free}$$

$$\text{TotalBytes} = \text{DiskUsage}(\text{Destination Path}).\text{total}$$

$$\text{UsedPercentage} = \left(\frac{\text{DiskUsage}.\text{used}}{\text{TotalBytes}}\right) \times 100$$

- Capacity thresholds:

- $\text{UsedPercentage} > 88\%$: Flagged as **Warning**.

- $75\% < \text{UsedPercentage} \le 88\%$: Flagged as **Caution**.

- $\text{UsedPercentage} \le 75\%$: Flagged as **Healthy**.

- **Execution Invariant**: If $\sum \text{Size}(\text{Photo Files}) > \text{FreeBytes}$, execution terminates immediately before altering any files.

3.1.4 Concurrency Tuning & Direct Streaming

Concurrency scales based on disk volume boundaries:

- **Same-Volume Move (`is_same_volume == True` and `mode == 'move'`)**:

- Configured for **32 parallel worker threads**.

- Executes instant atomic metadata renames at the filesystem level.

- **Cross-Volume Transfer (`is_same_volume == False` or `mode == 'copy'`)**:

- Throttled to **8 parallel worker threads** to prevent hardware bus saturation and head thrashing.

- Utilizes native operating system copy routines with flags allowing decrypted target writing.

- If native kernel routines are unavailable, streams data through an **8 MB chunk buffer**:

$$\text{Buffer Size} = 8 \times 1024 \times 1024 \text{ bytes (8,388,608 bytes)}$$

- File timestamps and attributes are copied from source to destination via `copystat`.

3.1.5 Rolling Window Throughput & EMA Formula

Telemetry is computed using a 1.5-second sliding window combined with an Exponential Moving Average (EMA):

1. Rolling sample window:

$$\text{window} = \{ s \in \text{samples} \mid \text{current\_time} - s.\text{time} \le 1.5 \}$$

1. Instantaneous transfer rate:

$$\text{Rate}_{\text{inst}} = \frac{\sum_{s \in \text{window}} s.\text{bytes}}{\max(0.25, \text{current\_time} - \text{window}[0].\text{time})}$$

1. Exponential Moving Average update:

$$\text{Rate}_{\text{EMA}} \leftarrow 0.8 \times \text{Rate}_{\text{EMA}} + 0.2 \times \text{Rate}_{\text{inst}}$$

1. Estimated Time of Arrival (ETA):

$$\text{ETA} = \left\lfloor \frac{\text{Total Bytes} - \text{Copied Bytes}}{\max(0.5, \text{Rate}_{\text{EMA}})} \right\rfloor$$

3.1.6 Post-Transfer Tree Pruning

When running in `move` mode, once all photo assets are moved, a post-order traversal evaluates the source directory tree:

- Examines each folder bottom-up.

- Deletes any leftover system junk files (`.ds_store`, `thumbs.db`).

- Deletes the folder node if it is empty.

### 3.2 Stage 2: Photo Status Tagger Engine (Photo Matcher)

3.2.1 Extension Scope

The engine processes photo files with the following extensions:

$$\text{Extensions} = \{ .cr2, .cr3, .nef, .arw, .raf, .dng, .orf, .rw2, .pef, .srw, .heic, .jpg, .jpeg, .png \}$$

3.2.2 Date-Folder Discovery Heuristics

Date-based folders are identified using two regular expression patterns:

1. Calendar format: Matching `\d{4}[-_.]\d{2}[-_.]\d{2}` (e.g., `2026-09-01`) or `\d{2}[-_.]\d{2}[-_.]\d{4}` (e.g., `01-09-2026`).

1. Session format: Matching `^(?:day|date|event|session)[\s_\-]*\d+` (case-insensitive).

3.2.3 Directory Tree Partitioning

Files across the directory tree are partitioned into two sets:

1. **Original Photo Set**:

- Files located outside any directory path containing the token `remaining`.

- Filenames not ending in `_R`, `_U`, `_r`, or `_u`.

- The stem is stripped of legacy status tags and stored in an upper-case lookup set mapped to its Date folder:

$$\text{OriginalSet}[\text{DateFolder}] \leftarrow \text{Upper}(\text{CleanStem})$$

1. **Remaining Photo Set**:

- Files located within a path containing `remaining`, or

- Filenames whose stem ends with `_R` or `_U` (case-insensitive).

3.2.4 Status Matching & Renaming Rules

For each photo in the Remaining Photo Set:

1. Clean the base stem:

$$\text{base\_clean} = \text{regex\_replace}(\text{stem}, \text{"\_[URur]\$"}, \text{""})$$

$$\text{lookup\_key} = \text{Upper}(\text{base\_clean})$$

1. Lookup status:

$$\text{is\_used} = \text{lookup\_key} \in \text{OriginalSet}[\text{DateFolder}]$$

*(If DateFolder is not indexed, fallback to the global union of all original sets).*

1. Assign suffix:

- If $\text{is\_used} = \text{True}$: Status is `Used`, suffix is `_U`.

- If $\text{is\_used} = \text{False}$: Status is `Missing`, suffix is `_R`.

1. Construct target filename:

$$\text{TargetFilename} = \text{base\_clean} + \text{"\_"} + (\text{is\_used ? "U" : "R"}) + \text{extension}$$

3.2.5 Atomic Renaming & Report Generation

- Renames files in-place within their containing directories.

- If source and target paths are identical, the step is recorded as a successful no-op.

- If a target filename collision exists, the conflicting target is removed prior to rename.

- Automatically exports an Excel spreadsheet (`Photo_Match_Report_YYYYMMDD_HHMMSS.xlsx`) and an RFC-4180 CSV report into a `Document/` subfolder at the common ancestor directory.

### 3.3 Stage 3: Video-To-Photo Sequence Synchronizer (Video Transfer Engine)

3.3.1 Sequence & Token Decomposition Algorithm

Filenames and directory names are parsed into structured token representations using the following sequence:

1. Strip file extension:

$$\text{name} \leftarrow \text{PathStem}(\text{raw\_name})$$

1. Strip trailing thumbnail and video suffixes:

Regex: `[-_](?:its|v|p)+(?:[-_]v|[-_]p)?$` (case-insensitive)

1. Strip date prefixes:

Regex: `^\d{4}[-_.]\d{2}[-_.]\d{2}[\s_-]*`

1. Strip camera clip prefixes (e.g., `001 01-Q`, `C0001_01-Q`, `CAM1_01-Q`):

Regex: `^(?:[a-zA-Z]{0,4}\d{2,5})[\s_\-]+(\d+[a-zA-Z]?[\s_\-]+[a-zA-Z0-9]+(?:[\s_\-].*)?)$`

1. Extract sequence number and code token:

Regex: `^(\d+[a-zA-Z]?)(?:[\s_\-]+([a-zA-Z0-9]+))?`

- Numeric sequences are formatted with a 2-digit zero-pad (`1` $\rightarrow$ `01`).

- Suffix codes are normalized to lowercase.

- Token construction:

$$\text{Token} = \text{norm\_seq} + \text{"-"} + \text{norm\_code}$$

3.3.2 Strict Match Pair Decision Matrix

To pair a Video Item ($V$) with a Photo Subfolder Item ($P$):

1. **Critical Invariant**:

If both $V$ and $P$ have sequence numbers and:

$$V.\text{sequence} \ne P.\text{sequence}$$

**THE PAIR IS REJECTED IMMEDIATELY.**

1. **Rule 1 (Exact Clean Name Equality)**:

If $\text{lower}(V.\text{cleanName}) == \text{lower}(P.\text{cleanName})$, match is approved.

1. **Rule 2 (Token Equality)**:

If $V.\text{token} \ne \emptyset$ and $P.\text{token} \ne \emptyset$ and $V.\text{token} == P.\text{token}$, match is approved.

1. **Rule 3 (Sequence and Code Conformance)**:

If $V.\text{sequence} == P.\text{sequence}$:

- If both have codes and $V.\text{code} == P.\text{code}$, match is approved.

- If either code is empty, match is approved.

1. **Rule 4 (Normalized String Collapse)**:

Collapse punctuation and whitespace:

$$\text{norm}(s) = \text{regex\_replace}(s, \text{"[\s_\-]+"}, \text{" "})$$

If $\text{norm}(V.\text{cleanName}) == \text{norm}(P.\text{cleanName})$, match is approved.

1. Unmatched items are classified as `MISMATCH` and routed to the manual pairing view.

3.3.3 Date Mismatch Quarantine Logic

When multiple date folders exist:

$$\text{Matching Dates} = \{ d_v \in \text{VideoDates} \mid \exists d_p \in \text{PhotoDates}: \text{norm}(d_v) == \text{norm}(d_p) \}$$

- If $\text{Matching Dates} == \emptyset$:

- Automatic pairing is blocked.

- A `dateMismatch` signal is emitted with the divergent date names.

- Automated transfer is prevented to avoid cross-event file pollution.

- Generic folder names (`video`, `videos`, `photo`, `photos`, `media`, `raw`, `selection`) are exempt from strict date matching when only single top-level folders exist.

3.3.4 Ignored Event Folders Exclusion Rule

Certain candid event subfolders never contain video files. Folders matching the following pattern are excluded from mismatch warnings:

$$\text{Pattern} = \text{"(?:^|[-_\s])\d*(?:MQ|MF|H)(?:[-_\s]|\$)" (case-insensitive)}$$

- Matches: `01-MQ`, `02-MQ`, `17-MQ`, `18-01MQ-50423626`, `01-MF`, `01-H`, `11-H`, etc.

3.3.5 Automated Companion Thumbnail Discovery

For each paired video file:

1. **Video Thumbnail (`_V.jpg`) Discovery**:

- Searches the video directory for image files ending in `_v.jpg`, `_v.png`, or `_v.jpeg`.

- Checks if the thumbnail's token matches the video shot code or starts with the video base stem.

1. **Photo Thumbnail (`_P.jpg`) Discovery**:

- Searches the destination photo subfolder for images ending in `_p.jpg`, `_p.png`, or `_p.jpeg`.

- If not found, searches the video folder for a companion `_P` thumbnail matching the video token.

3.3.6 Transfer Execution, Chunking & Collision Resolution

1. **Transfer Modes**:

- `copy`: Streams data in $1\text{ MB}$ chunks from source to target.

- `move`: Evaluates volume identifiers. Same-drive moves execute via atomic metadata renames; cross-drive moves stream in $1\text{ MB}$ chunks and unlink the source file upon verification.

1. **Collision Policies**:

- `skip`: Skips transfer if target file exists.

- `keepBoth`: Appends an incrementing counter before the extension:

$$\text{Target} = \text{base} + \text{"\_"} + \text{counter} + \text{ext}$$

1. **Companion Thumbnail Routing**:

- Discovered Video Thumbnails (`_V.jpg`) and Photo Thumbnails (`_P.jpg`) are copied to the **parent directory** of the destination photo subfolder.

1. **Undo Manifest Compilation**:

- Automatically writes an undo manifest in both Excel (`.xlsx`) and CSV formats to `Document/Video_Transfer_Undo_Manifest_YYYYMMDD_HHMMSS.xlsx`.

- Logs source paths, target paths, thumbnail paths, transfer mode, and timestamps.

1. **Reversible Undo Engine**:

- `undoTransfer` reads the manifest:

- For `move` records: Moves files back to their original source paths.

- For `copy` records: Unlinks transferred files and companion thumbnails from the destination.

### 3.4 Stage 4: Thumbnail Separator Engine (Thumbnail Shifter)

3.4.1 Classification Algorithm

Recursively scans the source tree for thumbnail files:

$$\text{Thumbnails} = \{ f \mid \text{ext}(f) \in \text{IMAGE\_EXTS} \land (\text{stem}(f).\text{upper}.\text{endswith}('_P') \lor \text{stem}(f).\text{upper}.\text{endswith}('_V')) \}$$

- Files ending in `_P`: Categorized as `photo` thumbnail.

- Files ending in `_V`: Categorized as `video` thumbnail.

3.4.2 Path Hierarchy Mirroring

For each thumbnail file:

1. Calculates its relative path from the source root:

$$\text{rel\_path} = \text{PathRelative}(\text{source\_file}, \text{source\_root})$$

$$\text{rel\_dir} = \text{DirectoryName}(\text{rel\_path})$$

1. Reconstructs the directory hierarchy in the target folder:

$$\text{target\_path} = \text{PathJoin}(\text{destination\_root}, \text{rel\_dir}, \text{filename})$$

1. Executes the transfer in either `copy` or `move` mode, logging speed and ETA, and writing an audit report to `Document/Thumbnail_Separation_Report_YYYYMMDD_HHMMSS.csv`.

### 3.5 Stage 5: Remaining Photos Collector Engine (Remaining Shifter)

3.5.1 Subtree Identification & Boundary Locking

Recursively locates folders matching:

- Substring match: Contains `remain` (case-insensitive).

- Word-boundary regex: `(?:^|[\s_\-])rem(?:aining)?(?:[\s_\-]|photos?|$)`.

- **Boundary Lock**: When a remaining folder is identified, its entire subtree is processed as a single unit; recursive sub-traversal within that folder is suppressed.

3.5.2 Parent Date Folder Resolution

To identify the corresponding event date:

- Evaluates ancestral path segments from root to folder.

- Returns the first segment satisfying the Date Folder heuristics (`YYYY-MM-DD`, `DD-MM-YYYY`, or `Day N`).

- If no date pattern is found, falls back to the immediate parent directory name.

3.5.3 Relocation & Collision Counter

- Folders are relocated to:

$$\text{TargetDir} = \text{PathJoin}(\text{DestinationRoot}, \text{DateFolderName})$$

- If $\text{TargetDir}$ already exists, appends an incrementing counter suffix:

$$\text{TargetDir}_{\text{final}} = \text{PathJoin}(\text{DestinationRoot}, \text{DateFolderName} + \text{"\_"} + \text{counter})$$

3.5.4 Multi-Sheet Excel Report Architecture

Generates an audit report containing two dedicated sheets:

1. **Summary Sheet**:

- Title block and KPI metrics table.

- Records total folders shifted, total photos moved, total volume, mode, and completion timestamps.

1. **Consolidated Folders Sheet**:

- Tabular record listing SR NO, Date Folder Name, Original Path, New Path, Photo Count, Folder Size, and Status.

1. **JSON State Manifest**:

- Exports `remaining_shift_manifest.json` containing complete path mappings for automated undo.

3.5.5 Undo Mechanism

When `undoShift` is triggered:

- Verifies that the initial operation was run in `move` mode.

- Iterates through manifest records in reverse order.

- Moves folders from `newPath` back to `originalPath`, recreating parent directories as needed.

### 3.6 Stage 6: Multi-Report Workbook Merger Engine (Report Merger)

3.6.1 Deep Cell Style Cloning Algorithm

Standard data copy operations discard styling. The merger engine executes a deep attribute clone on every cell:

- Font: Family name, size, bold, italic, underline, strikeout, color.

- Pattern Fill: Fill type (`solid`), foreground color, background color.

- Borders: Left, right, top, bottom, and diagonal border line styles and colors.

- Alignment: Horizontal alignment, vertical alignment, text wrap, indent, text rotation.

- Number Format: Excel format string.

- Protection: Cell locked and hidden flags.

3.6.2 Column & Row Dimension Synchronization

- Queries source column widths and copies them to the destination sheet.

- Preserves hidden column states.

- Replicates explicit row heights for header and title rows.

3.6.3 Specialized Sheet Fusion Handlers

1. **"Missing Files" Sheet**:

- Preserves row 1 header from the first workbook.

- Vertically stacks all data rows from subsequent workbooks, skipping duplicate header rows and cloning styles.

1. **"Folder Structure" Sheet**:

- Merges horizontally rather than vertically.

- Columns from Workbook 1 occupy destination columns $1 \dots N$.

- Columns from Workbook 2 occupy destination columns $N+1 \dots M$, preserving column widths and indent hierarchy.

1. **"Camera Summary" Sheet**:

- Scans column 1 for camera block markers matching `^Cam\s*\d+`.

- Extracts numeric values from `Total Found: (\d+)` and `Total Missing: (\d+)`.

- Sums totals across all workbooks for matching camera identifiers.

- Formats missing count cells with conditional warning styling if missing count $> 0$.

1. **Generic Tabular Sheets**:

- For sheets like `Issues`, preserves the master header once and concatenates rows sequentially, replicating merged-cell ranges.

1. **Filesystem Lock Recovery**:

- If writing fails due to an external file lock (e.g., spreadsheet open in another application), the engine catches the permission exception, appends a timestamp suffix (`_YYYYMMDD_HHMMSS`), and saves the output under the alternative filename.

## 4. Auxiliary Subsystems & Management Architecture

### 4.1 Cloud Storage Dual-Session Isolation

To allow simultaneous access to Main Data drives and Reference Thumbnail drives without credential collisions:

- Two physically separated profile storage directories are maintained:

$$\text{Storage}_{\text{Main}} = \text{PathJoin}(\text{AppDir}, \text{"drive\_session\_data"}, \text{"main\_drive"})$$

$$\text{Storage}_{\text{Ref}} = \text{PathJoin}(\text{AppDir}, \text{"drive\_session\_data"}, \text{"ref\_drive"})$$

- Each session operates with independent cookies, cache, local storage, and authentication tokens.

- Session purge functions (`clearSession('main')` and `clearSession('ref')`) release pending file locks and clean directory caches independently.

### 4.2 Audit Activity & Delivery Catalog Subsystem

- **Central Event Journal (`activity_log.json`)**:

- Automatically logs every engine action with timestamp, action category, item count, and summary description.

- **Delivery Reports Manifest (`reports_log.json`)**:

- Catalogs all exported spreadsheets and manifests.

- Exposes actions to open files directly in the default operating system spreadsheet handler or reveal their location in the file explorer.

### 4.3 In-App Auto-Updater & Hot-Reload Subsystem

1. **Two-Tier Release Manifest Resolution**:

- **Tier 1**: Queries the repository release API endpoint.

- **Tier 2 (Fallback)**: If rate-limited, fetches the raw static manifest (`version.json`) directly from the repository.

1. **Semantic Version Evaluation**:

- Parses versions into integer tuples:

$$\text{parse}(v) = (M, m, p)$$

- Trigger condition:

$$\text{RemoteTuple} > \text{LocalTuple}$$

1. **Streamed Archive Patching**:

- Downloads update packages in $64\text{ KB}$ buffer blocks with byte telemetry.

- Extracts files to an isolated temporary directory.

- Updates core scripts and assets while preserving user configuration files (`app_config.json`, `drive_config.json`, session stores).

- Synchronizes `version.txt`.

1. **Process Self-Reboot**:

- Spawns a detached child process executing the main launcher and terminates the parent process to release filesystem locks.

## 5. Standalone Production Utility Tools

### 5.1 Extension Normalizer Tool

- **Objective**: Standardizes compound and nested camera extensions to clean extensions.

- **Rules**:

- `FILE.CR3.jpg` $\rightarrow$ `FILE.jpg`

- `FILE.ARW.jpg` $\rightarrow$ `FILE.jpg`

- `FILE.NEF.jpg` $\rightarrow$ `FILE.jpg`

- `PHOTO.CR3_V.jpg` $\rightarrow$ `PHOTO_V.jpg`

- `PHOTO.CR3_U.jpg` $\rightarrow$ `PHOTO_U.jpg`

- **Execution**: Evaluates regular expressions against file stems, strips nested format tags, verifies collision safety, and executes in-place renames.

### 5.2 Jumbled Video Recovery & Reshuffler Tool

- **Objective**: Corrects misfiled video clips placed into wrong photo subfolders within a date directory.

- **Logic**:

1. Recursively scans all subfolders within a Date folder.

1. Extracts sequence tokens from video files.

1. Compares the video token against the containing folder name.

1. If the video belongs to a different subfolder within the **same Date folder**, moves the video and companion `_v.jpg` thumbnail to the correct subfolder.

1. **Quarantine Logic**: If a video with the same sequence already exists at the destination, moves the duplicate to a designated `Quarantine/` folder rather than overwriting.

1. Exports recovery and quarantine manifests.

### 5.3 Suffix Taggers (`_P` and `_V`)

- **Objective**: Batch utilities for appending `_P` or `_V` suffixes in-place.

- **Safety**:

- Validates supported image extensions.

- Skips files that already possess `_P`, `-P`, `_V`, or `-V` suffixes.

- Preserves original filename extension casing.

## 6. Enterprise Cloud Ingestion Architecture (1 TB+ Transfers)

[Local 1TB Storage]

│

▼

[Scanner & State DB] ─── Tracks [Pending / Uploading / Completed / Failed]

│

▼

[Thread Pool (4-8 Streams)]

│

├── Worker 1: Stream 64MB Chunk ──► [HTTP PUT Range: 0-67108863] ──► [Cloud Storage]

├── Worker 2: Stream 64MB Chunk ──► [HTTP PUT Range: 67108864-...] ──► [Cloud Storage]

└── Worker 3: Checksum Query    ──► [Compare MD5/SHA-256 Hash]   ──► [Mark Verified]

### 6.1 Chunked Resumable Upload Mechanics

1. **Session Initiation**:

- Sends metadata request with `uploadType=resumable`.

- Receives a unique upload session URI.

1. **Byte-Range Chunk Streaming**:

- Reads files in configured blocks ($16\text{ MB} \dots 64\text{ MB}$).

- Sends chunks via HTTP `PUT` requests with `Content-Range` headers:

1. **Crash Recovery & Offset Interrogation**:

- If connection drops or system reboots, the state database retains the session URI.

- Upon restart, queries the remote endpoint:

- Server returns received byte range (e.g., `Range: bytes=0-52428799`).

- Transfer resumes from byte $52,428,800$, avoiding re-transmission of existing bytes.

1. **Memory Footprint Bounds**:

- Memory usage remains constant ($< 200\text{ MB}$) regardless of dataset size ($10\text{ GB} \dots 2\text{ TB}$), as data streams directly from disk buffers.

### 6.2 Checksum & Data Integrity Verification

- Calculates SHA-256 or MD5 hashes incrementally during disk streaming.

- Compares computed checksum against the remote hash returned upon upload completion.

- Re-queues any chunk or file with hash divergence.

### 6.3 Daily Quota Management (750 GB Threshold)

- Tracks cumulative bytes transferred within a rolling 24-hour window.

- When nearing $745\text{ GB}$, the engine throttles bandwidth or pauses transfers and schedules execution to resume at the daily quota reset.

## 7. Error Recovery, Rollback & Boundary Invariant Matrix



## 8. Determinism & Integrity Guarantees

1. **Idempotence**: Running any scan or status evaluator multiple times produces identical results without altering filesystem states.

1. **Metadata Preservation**: All file transfer routines preserve original creation and modification timestamps (`copystat`).

1. **Audit Trail**: Every file mutation records an undo manifest in both structured workbook (`.xlsx`) and universal tabular (`.csv`) formats.

1. **Data Isolation**: Main production media and reference preview sessions maintain completely separated filesystem storage directories.



| Subsystem / Operation | Failure Mode | Detection Invariant | Automatic Recovery / Rollback Action |

| --- | --- | --- | --- |

| **PV Separator** | Target drive runs out of space | Free bytes probe $< \sum \text{file sizes}$ | Terminates before write. Pre-copied files remain intact; remaining files flagged pending. |

| **PV Separator** | Cross-volume move interrupted | Network or disk disconnect | Chunk stream fails; source file remains intact because unlinking occurs only after verified write. |

| **Photo Matcher** | Target file already exists | Filesystem collision error | If target is identical stem, no-op. If distinct file, removes target prior to rename. |

| **Photo Matcher** | Non-image files encountered | Extension validation failure | Bypasses non-photo files; continues remaining batch. |

| **Video Transfer** | Sequence number conflict (e.g. `01` vs `16`) | $V.\text{seq} \ne P.\text{seq}$ | Rejects pair immediately; shifts item to mismatch view for manual resolution. |

| **Video Transfer** | Date folder names diverge | $\text{MatchingDates} == \emptyset$ | Blocks automatic pairing; emits date mismatch warning to prevent cross-event contamination. |

| **Video Transfer** | Erroneous transfer executed | Operator triggers `Undo` | Reads manifest; unlinks copied files; restores moved files to source paths. |

| **Report Merger** | Output file locked by external application | Filesystem permission error | Traps error, appends timestamp suffix (`_YYYYMMDD_HHMMSS`), and saves under new path. |

| **Remaining Collector** | Target date folder exists in destination | Directory collision | Appends incrementing counter suffix (`_1`, `_2`) to avoid folder overwrite. |

| **Application Process** | Stale socket from previous crash | Socket bind failure on boot | Purges stale socket identifier; establishes clean IPC server. |

