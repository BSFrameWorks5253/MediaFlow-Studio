import fs from 'fs';
import path from 'path';
import { getInstalledAfmPath } from '../utils/ecosystemExplorer';

export interface DualSyncFileItem {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  mtime: number;
  ext: string;
  isVideo: boolean;
  isPhoto: boolean;
  tag?: string;
  isTargetClip?: boolean;
}

export interface DualSyncInspectionResult {
  isAfmInstalled: boolean;
  afmExePath: string | null;
  folderName: string;
  date: string;
  slot: string;
  videoFolder: {
    path: string;
    exists: boolean;
    files: DualSyncFileItem[];
    totalSizeBytes: number;
    totalSizeFormatted: string;
    selectedClipName?: string;
  };
  photoFolder: {
    path: string;
    exists: boolean;
    files: DualSyncFileItem[];
    totalSizeBytes: number;
    totalSizeFormatted: string;
  };
}

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.mkv', '.avi', '.m4v', '.mts', '.m2ts', '.wmv', '.flv', '.webm'
]);

const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.arw', '.cr2', '.cr3', '.nef', '.dng', '.heic', '.raw'
]);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function detectTag(fileName: string): string | undefined {
  const base = path.parse(fileName).name.toUpperCase();
  if (base.endsWith('_P')) return '_P';
  if (base.endsWith('_V')) return '_V';
  if (base.endsWith('_U')) return '_U';
  if (base.endsWith('_R')) return '_R';
  return undefined;
}

export async function inspectDualSync(options: {
  videoPath?: string;
  photoPath?: string;
  folderName?: string;
  date?: string;
  slot?: string;
}): Promise<DualSyncInspectionResult> {
  const afmPath = getInstalledAfmPath();
  const isAfmInstalled = !!afmPath;

  const rawVideoPath = (options.videoPath || '').trim();
  const rawPhotoPath = (options.photoPath || '').trim();

  let targetVideoDir = rawVideoPath;
  let targetClipName: string | undefined = undefined;

  // If videoPath is a direct file path, resolve its parent folder and mark the target clip
  if (rawVideoPath && fs.existsSync(rawVideoPath)) {
    try {
      const stat = fs.statSync(rawVideoPath);
      if (stat.isFile()) {
        targetClipName = path.basename(rawVideoPath);
        targetVideoDir = path.dirname(rawVideoPath);
      }
    } catch {}
  }

  // 1. Inspect Video Folder
  const videoFiles: DualSyncFileItem[] = [];
  let videoTotalBytes = 0;
  const videoExists = !!targetVideoDir && fs.existsSync(targetVideoDir);

  if (videoExists) {
    try {
      const entries = await fs.promises.readdir(targetVideoDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isVid = VIDEO_EXTENSIONS.has(ext);
          const isPic = PHOTO_EXTENSIONS.has(ext);
          if (isVid || isPic) {
            const fullPath = path.join(targetVideoDir, entry.name);
            const stat = await fs.promises.stat(fullPath);
            videoTotalBytes += stat.size;
            videoFiles.push({
              fileName: entry.name,
              filePath: fullPath,
              sizeBytes: stat.size,
              sizeFormatted: formatBytes(stat.size),
              mtime: stat.mtimeMs,
              ext: ext.replace(/^\./, '').toUpperCase(),
              isVideo: isVid,
              isPhoto: isPic,
              tag: detectTag(entry.name),
              isTargetClip: targetClipName ? entry.name.toLowerCase() === targetClipName.toLowerCase() : false,
            });
          }
        }
      }
      // Sort video files: target clip first, then natural alphabetical
      videoFiles.sort((a, b) => {
        if (a.isTargetClip) return -1;
        if (b.isTargetClip) return 1;
        return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
      });
    } catch (e) {
      console.warn('[DualSyncInspector] Failed to read video dir:', e);
    }
  }

  // 2. Inspect Photo Folder
  const photoFiles: DualSyncFileItem[] = [];
  let photoTotalBytes = 0;
  const photoExists = !!rawPhotoPath && fs.existsSync(rawPhotoPath);

  if (photoExists) {
    try {
      const entries = await fs.promises.readdir(rawPhotoPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isVid = VIDEO_EXTENSIONS.has(ext);
          const isPic = PHOTO_EXTENSIONS.has(ext);
          if (isPic || isVid) {
            const fullPath = path.join(rawPhotoPath, entry.name);
            const stat = await fs.promises.stat(fullPath);
            photoTotalBytes += stat.size;
            photoFiles.push({
              fileName: entry.name,
              filePath: fullPath,
              sizeBytes: stat.size,
              sizeFormatted: formatBytes(stat.size),
              mtime: stat.mtimeMs,
              ext: ext.replace(/^\./, '').toUpperCase(),
              isVideo: isVid,
              isPhoto: isPic,
              tag: detectTag(entry.name),
            });
          }
        }
      }
      photoFiles.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }));
    } catch (e) {
      console.warn('[DualSyncInspector] Failed to read photo dir:', e);
    }
  }

  const folderName =
    options.folderName ||
    (rawPhotoPath ? path.basename(rawPhotoPath) : '') ||
    (targetVideoDir ? path.basename(targetVideoDir) : 'Media Session');

  return {
    isAfmInstalled,
    afmExePath: afmPath,
    folderName,
    date: options.date || '',
    slot: options.slot || '',
    videoFolder: {
      path: targetVideoDir,
      exists: videoExists,
      files: videoFiles,
      totalSizeBytes: videoTotalBytes,
      totalSizeFormatted: formatBytes(videoTotalBytes),
      selectedClipName: targetClipName,
    },
    photoFolder: {
      path: rawPhotoPath,
      exists: photoExists,
      files: photoFiles,
      totalSizeBytes: photoTotalBytes,
      totalSizeFormatted: formatBytes(photoTotalBytes),
    },
  };
}
