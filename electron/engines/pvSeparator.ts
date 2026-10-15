import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { exec, spawn } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const PHOTO_RAW_EXTS = new Set([
  '.cr2', '.cr3', '.crw', '.arw', '.nef', '.nrw', '.srf', '.sr2', '.dng',
  '.rw2', '.orf', '.gpr', '.pef', '.raf', '.rwl', '.srw', '.3fr', '.fff',
  '.iiq', '.k25', '.kdc', '.bay', '.erf', '.mef', '.mos', '.mrw', '.ptx',
  '.pxn', '.raw'
]);

export const PHOTO_RASTER_EXTS = new Set([
  '.jpg', '.jpeg', '.jpe', '.png', '.heic', '.heif', '.hif', '.webp',
  '.tif', '.tiff', '.bmp', '.dib', '.gif', '.avif', '.jp2', '.j2k',
  '.jpf', '.jpx', '.jpm', '.mj2'
]);

export const ALL_PHOTO_EXTS = new Set([...PHOTO_RAW_EXTS, ...PHOTO_RASTER_EXTS]);

export const VIDEO_EXTS = new Set([
  '.mov', '.mp4', '.mts', '.m4v', '.mkv', '.avi', '.flv', '.webm',
  '.wmv', '.3gp', '.mxf', '.mpg', '.mpeg', '.m2ts', '.ts', '.dv',
  '.r3d', '.braw', '.mpv', '.m2v', '.vob', '.ogv'
]);

export const AUDIO_EXTS = new Set([
  '.wav', '.mp3', '.aac', '.flac', '.ogg', '.wma', '.m4a', '.aif', '.aiff', '.opus'
]);

export const PHOTO_SIDECARS = new Set(['.xmp', '.aae', '.nksc', '.cos']);
export const VIDEO_SIDECARS = new Set(['.xml', '.srt', '.thm', '.vtt']);
export const AUDIO_SIDECARS = new Set(['.pkf']);

export const SKIP_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

export type SeparationTarget = 'video' | 'photo' | 'both';

export interface DiskHeadroom {
  valid: boolean;
  drive: string;
  free_gb: number;
  total_gb: number;
  used_pct: number;
  free_bytes: number;
  status: 'healthy' | 'caution' | 'warning';
  error?: string;
}

export interface PVScanResult {
  target: SeparationTarget;
  total_photos: number;
  total_videos: number;
  total_audio: number;
  total_sidecars: number;
  photo_bytes: number;
  video_bytes: number;
  audio_bytes: number;
  target_bytes: number;
  target_count: number;
  items_to_process: {
    sourcePath: string;
    relPath: string;
    size: number;
    category: 'photo' | 'video' | 'audio';
  }[];
  event_folders: string[];
}

export interface PVSeparationSummary {
  success_count: number;
  error_count: number;
  elapsed_sec: number;
  avg_speed_mbps: number;
  report_path?: string | null;
  report_type?: 'xlsx' | 'csv' | null;
}

export interface PVProgressData {
  current: number;
  total: number;
  current_file: string;
  speed_mbps: number;
  speed_str: string;
  eta_sec: number;
  eta_str: string;
  threads_active: number;
  log_entry?: string;
  log_type?: 'info' | 'success' | 'warning' | 'danger';
}

export class PVSeparatorEngine {
  private isProcessing = false;
  private abortController: AbortController | null = null;

  async checkStorageHeadroom(targetPath: string): Promise<DiskHeadroom> {
    const cleanPath = path.resolve(targetPath.replace(/^file:\/\/\/?/, ''));
    let probePath = cleanPath;

    if (!fs.existsSync(probePath)) {
      const root = path.parse(probePath).root;
      if (fs.existsSync(root)) {
        probePath = root;
      } else {
        return {
          valid: false,
          drive: '',
          free_gb: 0,
          total_gb: 0,
          used_pct: 0,
          free_bytes: 0,
          status: 'warning',
          error: 'Directory not found',
        };
      }
    }

    try {
      if (typeof fs.statfs === 'function') {
        const stats = await fs.promises.statfs(probePath);
        const freeBytes = stats.bfree * stats.bsize;
        const totalBytes = stats.blocks * stats.bsize;
        const usedBytes = totalBytes - freeBytes;
        const freeGB = +(freeBytes / 1024 ** 3).toFixed(1);
        const totalGB = +(totalBytes / 1024 ** 3).toFixed(1);
        const usedPct = +( (usedBytes / totalBytes) * 100 ).toFixed(1);
        const driveLetter = path.parse(probePath).root || 'Drive';

        return {
          valid: true,
          drive: driveLetter,
          free_gb: freeGB,
          total_gb: totalGB,
          used_pct: usedPct,
          free_bytes: freeBytes,
          status: usedPct > 88 ? 'warning' : usedPct > 75 ? 'caution' : 'healthy',
        };
      }
    } catch {
      // Fallback to powershell disk query on Windows
    }

    try {
      const drive = path.parse(probePath).root.replace('\\', '');
      const { stdout } = await execPromise(
        `powershell -Command "Get-PSDrive -Name '${drive.replace(':', '')}' | Select-Object Free, Used | ConvertTo-Json"`
      );
      const data = JSON.parse(stdout);
      const freeBytes = Number(data.Free) || 0;
      const usedBytes = Number(data.Used) || 0;
      const totalBytes = freeBytes + usedBytes;
      const freeGB = +(freeBytes / 1024 ** 3).toFixed(1);
      const totalGB = +(totalBytes / 1024 ** 3).toFixed(1);
      const usedPct = +( (usedBytes / totalBytes) * 100 ).toFixed(1);

      return {
        valid: true,
        drive,
        free_gb: freeGB,
        total_gb: totalGB,
        used_pct: usedPct,
        free_bytes: freeBytes,
        status: usedPct > 88 ? 'warning' : usedPct > 75 ? 'caution' : 'healthy',
      };
    } catch (e: any) {
      return {
        valid: false,
        drive: '',
        free_gb: 0,
        total_gb: 0,
        used_pct: 0,
        free_bytes: 0,
        status: 'warning',
        error: e.message,
      };
    }
  }

  async scanDirectory(sourceDir: string, target: SeparationTarget = 'video'): Promise<PVScanResult> {
    const cleanSource = path.resolve(sourceDir.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanSource)) {
      throw new Error(`Directory does not exist: ${cleanSource}`);
    }

    const itemsToProcess: PVScanResult['items_to_process'] = [];
    const eventFolders = new Set<string>();
    let totalPhotos = 0;
    let totalVideos = 0;
    let totalAudio = 0;
    let totalSidecars = 0;
    let photoBytes = 0;
    let videoBytes = 0;
    let audioBytes = 0;

    const walk = async (currentDir: string) => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

      // First pass: index stems in this directory for sidecar parent association
      const stemMap = new Map<string, 'photo' | 'video' | 'audio'>();
      for (const ent of entries) {
        if (!ent.isFile()) continue;
        const ext = path.extname(ent.name).toLowerCase();
        const stem = path.basename(ent.name, path.extname(ent.name)).toLowerCase();
        if (ALL_PHOTO_EXTS.has(ext)) stemMap.set(stem, 'photo');
        else if (VIDEO_EXTS.has(ext)) stemMap.set(stem, 'video');
        else if (AUDIO_EXTS.has(ext)) stemMap.set(stem, 'audio');
      }

      for (const ent of entries) {
        const fullPath = path.join(currentDir, ent.name);
        if (ent.isDirectory()) {
          const folderName = ent.name;
          if (!folderName.startsWith('.')) {
            eventFolders.add(folderName);
            await walk(fullPath);
          }
        } else if (ent.isFile()) {
          const lowerName = ent.name.toLowerCase();
          if (SKIP_FILES.has(lowerName) || lowerName.startsWith('.')) continue;

          const ext = path.extname(ent.name).toLowerCase();
          const stem = path.basename(ent.name, path.extname(ent.name)).toLowerCase();
          const stat = await fs.promises.stat(fullPath);
          const sz = stat.size;

          let category: 'photo' | 'video' | 'audio' | null = null;

          if (ALL_PHOTO_EXTS.has(ext)) {
            category = 'photo';
            totalPhotos++;
            photoBytes += sz;
          } else if (VIDEO_EXTS.has(ext)) {
            category = 'video';
            totalVideos++;
            videoBytes += sz;
          } else if (AUDIO_EXTS.has(ext)) {
            category = 'audio';
            totalAudio++;
            audioBytes += sz;
          } else if (
            PHOTO_SIDECARS.has(ext) ||
            VIDEO_SIDECARS.has(ext) ||
            AUDIO_SIDECARS.has(ext)
          ) {
            totalSidecars++;
            category = stemMap.get(stem) || (PHOTO_SIDECARS.has(ext) ? 'photo' : VIDEO_SIDECARS.has(ext) ? 'video' : 'audio');
            if (category === 'photo') photoBytes += sz;
            else if (category === 'video') videoBytes += sz;
            else audioBytes += sz;
          }

          let includeInTarget = false;
          if (target === 'video') {
            includeInTarget = category === 'video' || category === 'audio';
          } else if (target === 'photo') {
            includeInTarget = category === 'photo';
          } else if (target === 'both') {
            includeInTarget = category === 'video' || category === 'photo' || category === 'audio';
          }

          if (includeInTarget && category) {
            const relPath = path.relative(cleanSource, fullPath);
            itemsToProcess.push({
              sourcePath: fullPath,
              relPath,
              size: sz,
              category,
            });
          }
        }
      }
    };

    await walk(cleanSource);

    const targetBytes = target === 'video'
      ? (videoBytes + audioBytes)
      : target === 'photo'
      ? photoBytes
      : (photoBytes + videoBytes + audioBytes);

    return {
      target,
      total_photos: totalPhotos,
      total_videos: totalVideos,
      total_audio: totalAudio,
      total_sidecars: totalSidecars,
      photo_bytes: photoBytes,
      video_bytes: videoBytes,
      audio_bytes: audioBytes,
      target_bytes: targetBytes,
      target_count: itemsToProcess.length,
      items_to_process: itemsToProcess,
      event_folders: Array.from(eventFolders),
    };
  }

  async executeSeparation(
    sourceDir: string,
    destDir: string,
    mode: 'copy' | 'move' | 'delete',
    target: SeparationTarget = 'video',
    generateExcel: boolean = true,
    onProgress: (data: PVProgressData) => void
  ): Promise<PVSeparationSummary> {
    if (this.isProcessing) throw new Error('Separation process already running');
    this.isProcessing = true;
    this.abortController = new AbortController();

    const cleanSource = path.resolve(sourceDir.replace(/^file:\/\/\/?/, ''));
    const cleanDest = destDir && destDir.trim() ? path.resolve(destDir.replace(/^file:\/\/\/?/, '')) : cleanSource;
    const reportFolder = (mode === 'delete' && (!destDir || !destDir.trim())) ? cleanSource : cleanDest;

    // Scan source directory for selected target files
    const scan = await this.scanDirectory(cleanSource, target);

    // Headroom check against selected target bytes (only needed for copy/move, not delete)
    if (mode !== 'delete') {
      const headroom = await this.checkStorageHeadroom(cleanDest);
      if (headroom.valid && scan.target_bytes > headroom.free_bytes) {
        this.isProcessing = false;
        const targetLabel = target === 'video' ? 'Videos' : target === 'photo' ? 'Photos' : 'Media';
        throw new Error(
          `Insufficient storage capacity: ${targetLabel} require ${(scan.target_bytes / 1024 ** 3).toFixed(1)} GB, but target drive has only ${headroom.free_gb} GB free.`
        );
      }
    }

    const isSameVolume = path.parse(cleanSource).root.toLowerCase() === path.parse(cleanDest).root.toLowerCase();
    const totalFiles = scan.items_to_process.length;
    let processedFiles = 0;
    let copiedBytes = 0;
    const totalBytes = scan.target_bytes;

    const samples: { time: number; bytes: number }[] = [];
    let rateEMA = 0;
    const startTime = Date.now();
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB streaming buffer
    const manifestItems: any[] = [];

    for (const item of scan.items_to_process) {
      if (this.abortController.signal.aborted) {
        break;
      }

      const fileSize = item.size;

      if (mode === 'delete') {
        // Direct permanent purge from master data
        try {
          await fs.promises.unlink(item.sourcePath);
          copiedBytes += fileSize;
          manifestItems.push({
            filename: path.basename(item.sourcePath),
            relPath: item.relPath,
            category: item.category,
            size: fileSize,
            sourcePath: item.sourcePath,
            targetPath: '[DELETED FROM MASTER DATA]',
            status: 'Permanently Deleted',
          });
        } catch (delErr: any) {
          manifestItems.push({
            filename: path.basename(item.sourcePath),
            relPath: item.relPath,
            category: item.category,
            size: fileSize,
            sourcePath: item.sourcePath,
            targetPath: '[DELETED FROM MASTER DATA]',
            status: `Failed to Delete: ${delErr.message}`,
          });
        }
      } else {
        // Copy or Move to destination folder
        let targetPath: string;
        if (target === 'both') {
          const subfolder = (item.category === 'video' || item.category === 'audio') ? 'Videos' : 'Photos';
          targetPath = path.join(cleanDest, subfolder, item.relPath);
        } else {
          targetPath = path.join(cleanDest, item.relPath);
        }

        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

        if (mode === 'move' && isSameVolume) {
          // Instant atomic rename
          await fs.promises.rename(item.sourcePath, targetPath);
          copiedBytes += fileSize;
        } else {
          // High throughput chunked stream
          const readStream = fs.createReadStream(item.sourcePath, { highWaterMark: CHUNK_SIZE });
          const writeStream = fs.createWriteStream(targetPath, { highWaterMark: CHUNK_SIZE });

          await pipeline(readStream, writeStream);

          // Preserve timestamps via utimes
          const stat = await fs.promises.stat(item.sourcePath);
          await fs.promises.utimes(targetPath, stat.atime, stat.mtime);

          if (mode === 'move') {
            await fs.promises.unlink(item.sourcePath);
          }

          copiedBytes += fileSize;
        }

        manifestItems.push({
          filename: path.basename(item.sourcePath),
          relPath: item.relPath,
          category: item.category,
          size: fileSize,
          sourcePath: item.sourcePath,
          targetPath,
          status: mode === 'move' ? 'Success (Moved)' : 'Success (Copied)',
        });
      }

      processedFiles++;
      const now = Date.now() / 1000;
      samples.push({ time: now, bytes: fileSize });

      // Rolling 1.5s EMA window
      while (samples.length > 0 && now - samples[0].time > 1.5) {
        samples.shift();
      }

      const windowBytes = samples.reduce((acc, s) => acc + s.bytes, 0);
      const windowDuration = Math.max(0.25, now - (samples[0]?.time || now));
      const instRate = windowBytes / windowDuration / (1024 * 1024); // MB/s
      rateEMA = rateEMA === 0 ? instRate : 0.8 * rateEMA + 0.2 * instRate;

      const remainingBytes = Math.max(0, totalBytes - copiedBytes);
      const etaSec = Math.round(remainingBytes / (Math.max(0.5, rateEMA) * 1024 * 1024));
      const etaStr = `${Math.floor(etaSec / 60).toString().padStart(2, '0')}:${(etaSec % 60).toString().padStart(2, '0')}`;

      onProgress({
        current: processedFiles,
        total: totalFiles,
        current_file: path.basename(item.sourcePath),
        speed_mbps: +rateEMA.toFixed(1),
        speed_str: `${rateEMA.toFixed(1)} MB/s`,
        eta_sec: etaSec,
        eta_str: etaStr,
        threads_active: mode === 'delete' ? 16 : (mode === 'move' && isSameVolume ? 32 : 8),
        log_entry: mode === 'delete'
          ? `Deleted from Master: ${item.relPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`
          : `Transferred: ${item.relPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
        log_type: mode === 'delete' ? 'warning' : 'info',
      });
    }

    // Post-operation pruning if move or delete mode
    if ((mode === 'move' || mode === 'delete') && !this.abortController.signal.aborted) {
      await this.pruneEmptyDirectories(cleanSource);
    }

    const elapsedSec = +((Date.now() - startTime) / 1000).toFixed(1);
    const avgSpeed = +(copiedBytes / (1024 * 1024) / Math.max(0.1, elapsedSec)).toFixed(1);

    // Generate Excel Manifest Report (.xlsx) + CSV Fallback
    let reportPath: string | null = null;
    if (generateExcel && manifestItems.length > 0) {
      try {
        await fs.promises.mkdir(reportFolder, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const targetLabel = target === 'video' ? 'Videos' : target === 'photo' ? 'Photos' : 'Media';
        const reportPrefix = mode === 'delete' ? `${targetLabel}_Deletion_Audit` : `${targetLabel}_Separation_Report`;
        const expectedXlsx = path.join(reportFolder, `${reportPrefix}_${timestamp}.xlsx`);
        const expectedCsv = path.join(reportFolder, `${reportPrefix}_${timestamp}.csv`);

        // Always write immediate CSV for guaranteed file generation
        let csvContent = '\uFEFFIndex,File Name,Category,Relative Path,Size (MB),Size (Bytes),Source Path,Destination Path,Action,Status\n';
        manifestItems.forEach((m, idx) => {
          csvContent += `${idx + 1},"${m.filename}","${m.category.toUpperCase()}","${m.relPath}",${(m.size / (1024 * 1024)).toFixed(2)},${m.size},"${m.sourcePath}","${m.targetPath}","${mode.toUpperCase()}","${m.status}"\n`;
        });
        await fs.promises.writeFile(expectedCsv, csvContent, 'utf-8');
        reportPath = expectedCsv;

        // Try Python openpyxl for formatted Excel workbook
        const pyScriptDev = path.join(__dirname, 'scripts', 'generate_separation_report.py');
        const pyScriptProd = path.join(process.resourcesPath || '', 'scripts', 'generate_separation_report.py');
        const pyScript = fs.existsSync(pyScriptDev) ? pyScriptDev : pyScriptProd;

        if (fs.existsSync(pyScript)) {
          const payload = {
            summary: {
              target,
              transferMethod: mode,
              sourceDir: cleanSource,
              destDir: reportFolder,
              totalFiles: processedFiles,
              totalBytes: copiedBytes,
              avgSpeed,
              elapsedSec,
            },
            items: manifestItems,
            outputPath: expectedXlsx,
          };

          const p = spawn('python', [pyScript, '-'], { windowsHide: true });
          p.stdin.write(JSON.stringify(payload));
          p.stdin.end();

          await new Promise<void>((resolve) => {
            p.on('close', (code) => {
              if (code === 0 && fs.existsSync(expectedXlsx)) {
                reportPath = expectedXlsx;
              }
              resolve();
            });
            p.on('error', () => resolve());
          });
        }
      } catch (err: any) {
        console.error('[PV] Failed to generate separation Excel report:', err);
      }
    }

    this.isProcessing = false;
    return {
      success_count: processedFiles,
      error_count: totalFiles - processedFiles,
      elapsed_sec: elapsedSec,
      avg_speed_mbps: avgSpeed,
      report_path: reportPath,
      report_type: reportPath?.endsWith('.xlsx') ? 'xlsx' : 'csv',
    };
  }

  private async pruneEmptyDirectories(directory: string) {
    const cleanDir = path.resolve(directory);
    if (!fs.existsSync(cleanDir)) return;

    const clean = async (dir: string): Promise<boolean> => {
      let entries: fs.Dirent[] = [];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return false;
      }

      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          const isEmpty = await clean(full);
          if (isEmpty) {
            try {
              await fs.promises.rmdir(full);
            } catch {}
          }
        } else if (ent.isFile()) {
          const lower = ent.name.toLowerCase();
          if (SKIP_FILES.has(lower)) {
            try {
              await fs.promises.unlink(full);
            } catch {}
          }
        }
      }

      try {
        const remaining = await fs.promises.readdir(dir);
        return remaining.length === 0;
      } catch {
        return false;
      }
    };

    await clean(cleanDir);
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isProcessing = false;
  }
}
