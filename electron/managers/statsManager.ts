import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface FolderMetrics {
  path: string;
  exists: boolean;
  fileCount: number;
  totalBytes: number;
  sizeStr: string;
  photoCount: number;
  videoCount: number;
  otherCount: number;
  subfolderCount: number;
}

export interface DateStatItem {
  id: string;
  dateName: string;
  mainDataPath: string;
  remainingPath: string;
  thumbnailsPath: string;
  mainDataMetrics: FolderMetrics;
  remainingMetrics: FolderMetrics;
  thumbnailsMetrics: FolderMetrics;
  eventFoldersCount: number;
  totalFiles: number;
  totalBytes: number;
  sizeStr: string;
  addedAt: string;
  updatedAt: string;
}

export interface SafarStatRecord {
  id: string;
  safarName: string;
  safarRootPath: string;
  pvFolderPath: string;
  remainingFolderPath: string;
  thumbnailsFolderPath: string;
  dates: DateStatItem[];
  totalDates: number;
  totalMainFiles: number;
  totalRemainingFiles: number;
  totalThumbnailsFiles: number;
  totalFiles: number;
  totalBytes: number;
  sizeStr: string;
  createdAt: string;
  lastModifiedAt: string;
}

const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff',
  '.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2',
  '.pef', '.srw', '.heic', '.raw'
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.wmv', '.flv',
  '.webm', '.mts', '.m2ts', '.mpg', '.mpeg', '.3gp'
]);

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

export class StatsManager {
  private statsFile: string;
  private records: SafarStatRecord[] = [];

  constructor() {
    let userData = process.cwd();
    try {
      if (app && typeof app.getPath === 'function') {
        userData = app.getPath('userData');
      }
    } catch {}
    this.statsFile = path.join(userData, 'safar_stats.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.statsFile)) {
        const raw = fs.readFileSync(this.statsFile, 'utf-8');
        this.records = JSON.parse(raw);
        if (!Array.isArray(this.records)) {
          this.records = [];
        }
      }
    } catch {
      this.records = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.statsFile, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (err) {
      console.error('[StatsManager] Failed to write stats:', err);
    }
  }

  /**
   * Deep scans a single directory and returns comprehensive metrics.
   */
  async computeFolderMetrics(folderPath: string): Promise<FolderMetrics> {
    const clean = path.resolve(folderPath.replace(/^file:\/\/\/?/, ''));
    const defaultMetrics: FolderMetrics = {
      path: clean,
      exists: false,
      fileCount: 0,
      totalBytes: 0,
      sizeStr: '0 B',
      photoCount: 0,
      videoCount: 0,
      otherCount: 0,
      subfolderCount: 0,
    };

    if (!clean || !fs.existsSync(clean)) {
      return defaultMetrics;
    }

    try {
      const rootStat = await fs.promises.stat(clean);
      if (!rootStat.isDirectory()) return defaultMetrics;

      defaultMetrics.exists = true;
      let fileCount = 0;
      let totalBytes = 0;
      let photoCount = 0;
      let videoCount = 0;
      let otherCount = 0;
      let subfolderCount = 0;

      const walk = async (curr: string, depth: number) => {
        const ents = await fs.promises.readdir(curr, { withFileTypes: true });
        for (const ent of ents) {
          if (ent.name.startsWith('.')) continue; // ignore hidden
          const full = path.join(curr, ent.name);
          if (ent.isDirectory()) {
            if (depth === 0) subfolderCount++;
            await walk(full, depth + 1);
          } else if (ent.isFile()) {
            fileCount++;
            try {
              const s = await fs.promises.stat(full);
              totalBytes += s.size;
            } catch {}

            const ext = path.extname(ent.name).toLowerCase();
            if (PHOTO_EXTENSIONS.has(ext)) {
              photoCount++;
            } else if (VIDEO_EXTENSIONS.has(ext)) {
              videoCount++;
            } else {
              otherCount++;
            }
          }
        }
      };

      await walk(clean, 0);

      return {
        path: clean,
        exists: true,
        fileCount,
        totalBytes,
        sizeStr: formatBytes(totalBytes),
        photoCount,
        videoCount,
        otherCount,
        subfolderCount,
      };
    } catch {
      return defaultMetrics;
    }
  }

  /**
   * Automatically discovers companion Remaining and Thumbnails folders
   * outside the _P-V folder given a Date Folder or Safar Root.
   */
  private findOutsideFolders(safarRoot: string, dateName: string): {
    remainingFolder: string;
    thumbnailsFolder: string;
  } {
    let remainingFolder = '';
    let thumbnailsFolder = '';

    if (!safarRoot || !fs.existsSync(safarRoot)) {
      return { remainingFolder, thumbnailsFolder };
    }

    try {
      const topEntries = fs.readdirSync(safarRoot, { withFileTypes: true });
      const dirEntries = topEntries.filter((e) => e.isDirectory());

      // 1. Locate root Remaining directory
      const remCandidate = dirEntries.find((d) => /remaining/i.test(d.name));
      if (remCandidate) {
        const remRoot = path.join(safarRoot, remCandidate.name);
        // Look inside remRoot for date-specific subfolder
        if (fs.existsSync(remRoot)) {
          const subDirs = fs.readdirSync(remRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
          const cleanDateStem = dateName.split('_')[0].trim();
          const matchSub = subDirs.find(
            (s) =>
              s.name.toLowerCase() === dateName.toLowerCase() ||
              (cleanDateStem && s.name.startsWith(cleanDateStem))
          );
          remainingFolder = matchSub ? path.join(remRoot, matchSub.name) : remRoot;
        }
      }

      // 2. Locate root Thumbnails directory
      const thumbCandidate = dirEntries.find((d) => /thumb/i.test(d.name));
      if (thumbCandidate) {
        const thumbRoot = path.join(safarRoot, thumbCandidate.name);
        if (fs.existsSync(thumbRoot)) {
          const subDirs = fs.readdirSync(thumbRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
          const cleanDateStem = dateName.split('_')[0].trim();
          const matchSub = subDirs.find(
            (s) =>
              s.name.toLowerCase() === dateName.toLowerCase() ||
              (cleanDateStem && s.name.startsWith(cleanDateStem))
          );
          thumbnailsFolder = matchSub ? path.join(thumbRoot, matchSub.name) : thumbRoot;
        }
      }
    } catch {}

    return { remainingFolder, thumbnailsFolder };
  }

  /**
   * Scans a single Date folder (e.g. D:\To Delete\1448-10-Istefada ilmiyah\1448-10-Istefada ilmiyah_P-V\1448-04-05 _02E)
   * and auto-detects Safar Name, Safar Root, and external Remaining & Thumbnails folders.
   */
  async scanDateFolder(
    dateFolderPath: string,
    customSafarName?: string,
    customRemainingPath?: string,
    customThumbnailsPath?: string
  ): Promise<{
    dateStat: DateStatItem;
    detectedSafarName: string;
    detectedSafarRoot: string;
    detectedRemainingPath: string;
    detectedThumbnailsPath: string;
  }> {
    const cleanDatePath = path.resolve(dateFolderPath.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanDatePath)) {
      throw new Error(`Date folder path does not exist: "${cleanDatePath}"`);
    }

    const dateName = path.basename(cleanDatePath);
    const parentFolder = path.dirname(cleanDatePath);
    const potentialSafarRoot = path.dirname(parentFolder);

    // Detect safar name
    let detectedSafarName = customSafarName || '';
    let detectedSafarRoot = potentialSafarRoot;

    if (!detectedSafarName) {
      const parentName = path.basename(parentFolder);
      if (/_P-V$/i.test(parentName)) {
        detectedSafarName = parentName.replace(/_P-V$/i, '').trim();
      } else if (parentName.toLowerCase() === 'main data' && path.basename(potentialSafarRoot)) {
        detectedSafarName = path.basename(potentialSafarRoot);
      } else {
        detectedSafarName = path.basename(potentialSafarRoot) || parentName;
      }
    }

    // Auto-discover companion outside folders
    const autoOutside = this.findOutsideFolders(detectedSafarRoot, dateName);
    const finalRemainingPath = customRemainingPath || autoOutside.remainingFolder || '';
    const finalThumbnailsPath = customThumbnailsPath || autoOutside.thumbnailsFolder || '';

    // Calculate metrics in parallel
    const [mainMetrics, remMetrics, thumbMetrics] = await Promise.all([
      this.computeFolderMetrics(cleanDatePath),
      finalRemainingPath ? this.computeFolderMetrics(finalRemainingPath) : this.computeFolderMetrics(''),
      finalThumbnailsPath ? this.computeFolderMetrics(finalThumbnailsPath) : this.computeFolderMetrics(''),
    ]);

    const totalFiles = mainMetrics.fileCount + remMetrics.fileCount + thumbMetrics.fileCount;
    const totalBytes = mainMetrics.totalBytes + remMetrics.totalBytes + thumbMetrics.totalBytes;

    const dateStat: DateStatItem = {
      id: `${dateName}-${Date.now().toString(36)}`,
      dateName,
      mainDataPath: cleanDatePath,
      remainingPath: finalRemainingPath,
      thumbnailsPath: finalThumbnailsPath,
      mainDataMetrics: mainMetrics,
      remainingMetrics: remMetrics,
      thumbnailsMetrics: thumbMetrics,
      eventFoldersCount: mainMetrics.subfolderCount,
      totalFiles,
      totalBytes,
      sizeStr: formatBytes(totalBytes),
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      dateStat,
      detectedSafarName,
      detectedSafarRoot,
      detectedRemainingPath: finalRemainingPath,
      detectedThumbnailsPath: finalThumbnailsPath,
    };
  }

  /**
   * Scans an entire Safar Folder (e.g. D:\To Delete\1448-10-Istefada ilmiyah)
   * Finding the _P-V or Main Data folder, scanning each date subfolder,
   * linking external Remaining & Thumbnails, and producing a complete Safar record.
   */
  async scanSafarFolder(safarFolderPath: string): Promise<SafarStatRecord> {
    const cleanSafarRoot = path.resolve(safarFolderPath.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanSafarRoot)) {
      throw new Error(`Safar folder path does not exist: "${cleanSafarRoot}"`);
    }

    const safarName = path.basename(cleanSafarRoot);
    const entries = await fs.promises.readdir(cleanSafarRoot, { withFileTypes: true });
    const dirEntries = entries.filter((e) => e.isDirectory());

    // 1. Find _P-V or Main Data folder
    let pvFolder = '';
    const pvCandidate = dirEntries.find(
      (d) =>
        d.name.toLowerCase() === `${safarName.toLowerCase()}_p-v` ||
        /_p-v$/i.test(d.name) ||
        d.name.toLowerCase() === 'main data'
    );

    if (pvCandidate) {
      pvFolder = path.join(cleanSafarRoot, pvCandidate.name);
    } else {
      // Check if any subfolder contains subfolders with dates
      for (const d of dirEntries) {
        const subPath = path.join(cleanSafarRoot, d.name);
        try {
          const subs = fs.readdirSync(subPath, { withFileTypes: true }).filter((s) => s.isDirectory());
          if (subs.some((s) => /^\d{4}[-_]\d{2}[-_]\d{2}/.test(s.name))) {
            pvFolder = subPath;
            break;
          }
        } catch {}
      }
    }

    // 2. Find Remaining & Thumbnails root folders
    const remCandidate = dirEntries.find((d) => /remaining/i.test(d.name));
    const remRoot = remCandidate ? path.join(cleanSafarRoot, remCandidate.name) : '';

    const thumbCandidate = dirEntries.find((d) => /thumb/i.test(d.name));
    const thumbRoot = thumbCandidate ? path.join(cleanSafarRoot, thumbCandidate.name) : '';

    const dateItems: DateStatItem[] = [];

    if (pvFolder && fs.existsSync(pvFolder)) {
      const dateDirs = (await fs.promises.readdir(pvFolder, { withFileTypes: true }))
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'));

      for (const d of dateDirs) {
        const datePath = path.join(pvFolder, d.name);
        const { dateStat } = await this.scanDateFolder(datePath, safarName);
        dateItems.push(dateStat);
      }
    }

    // Aggregate totals
    const totalMainFiles = dateItems.reduce((acc, d) => acc + d.mainDataMetrics.fileCount, 0);
    const totalRemainingFiles = dateItems.reduce((acc, d) => acc + d.remainingMetrics.fileCount, 0);
    const totalThumbnailsFiles = dateItems.reduce((acc, d) => acc + d.thumbnailsMetrics.fileCount, 0);
    const totalFiles = totalMainFiles + totalRemainingFiles + totalThumbnailsFiles;
    const totalBytes = dateItems.reduce((acc, d) => acc + d.totalBytes, 0);

    const record: SafarStatRecord = {
      id: safarName.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      safarName,
      safarRootPath: cleanSafarRoot,
      pvFolderPath: pvFolder,
      remainingFolderPath: remRoot,
      thumbnailsFolderPath: thumbRoot,
      dates: dateItems,
      totalDates: dateItems.length,
      totalMainFiles,
      totalRemainingFiles,
      totalThumbnailsFiles,
      totalFiles,
      totalBytes,
      sizeStr: formatBytes(totalBytes),
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };

    return record;
  }

  /**
   * Adds or updates a single DateStatItem inside a Safar record.
   * If the Safar doesn't exist, it creates a new Safar record.
   */
  async addOrUpdateDateToSafar(
    safarName: string,
    safarRoot: string,
    dateStat: DateStatItem
  ): Promise<SafarStatRecord> {
    const cleanName = safarName.trim();
    if (!cleanName) throw new Error('Safar name cannot be empty.');

    const safarId = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    let record = this.records.find((r) => r.id === safarId || r.safarName.toLowerCase() === cleanName.toLowerCase());

    if (!record) {
      record = {
        id: safarId,
        safarName: cleanName,
        safarRootPath: safarRoot,
        pvFolderPath: path.dirname(dateStat.mainDataPath),
        remainingFolderPath: path.dirname(dateStat.remainingPath || ''),
        thumbnailsFolderPath: path.dirname(dateStat.thumbnailsPath || ''),
        dates: [],
        totalDates: 0,
        totalMainFiles: 0,
        totalRemainingFiles: 0,
        totalThumbnailsFiles: 0,
        totalFiles: 0,
        totalBytes: 0,
        sizeStr: '0 B',
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      };
      this.records.unshift(record);
    }

    // Check if this date already exists in the record
    const existingIndex = record.dates.findIndex(
      (d) => d.dateName.toLowerCase() === dateStat.dateName.toLowerCase()
    );

    if (existingIndex >= 0) {
      record.dates[existingIndex] = {
        ...dateStat,
        updatedAt: new Date().toISOString(),
      };
    } else {
      record.dates.push(dateStat);
    }

    // Sort dates alphabetically
    record.dates.sort((a, b) => a.dateName.localeCompare(b.dateName));

    // Recalculate totals
    record.totalDates = record.dates.length;
    record.totalMainFiles = record.dates.reduce((acc, d) => acc + d.mainDataMetrics.fileCount, 0);
    record.totalRemainingFiles = record.dates.reduce((acc, d) => acc + d.remainingMetrics.fileCount, 0);
    record.totalThumbnailsFiles = record.dates.reduce((acc, d) => acc + d.thumbnailsMetrics.fileCount, 0);
    record.totalFiles = record.totalMainFiles + record.totalRemainingFiles + record.totalThumbnailsFiles;
    record.totalBytes = record.dates.reduce((acc, d) => acc + d.totalBytes, 0);
    record.sizeStr = formatBytes(record.totalBytes);
    record.lastModifiedAt = new Date().toISOString();

    if (safarRoot && !record.safarRootPath) {
      record.safarRootPath = safarRoot;
    }

    this.save();
    return record;
  }

  /**
   * Saves or updates a complete Safar record.
   */
  async saveSafarRecord(record: SafarStatRecord): Promise<SafarStatRecord> {
    const existingIndex = this.records.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      this.records[existingIndex] = {
        ...record,
        lastModifiedAt: new Date().toISOString(),
      };
    } else {
      this.records.unshift(record);
    }
    this.save();
    return record;
  }

  getStats(): SafarStatRecord[] {
    return this.records;
  }

  getRecentSafars(limit = 8): SafarStatRecord[] {
    return [...this.records]
      .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
      .slice(0, limit);
  }

  findSafars(query: string): SafarStatRecord[] {
    if (!query || !query.trim()) {
      return this.getRecentSafars(10);
    }
    const q = query.trim().toLowerCase();
    return this.records.filter(
      (r) =>
        r.safarName.toLowerCase().includes(q) ||
        r.safarRootPath.toLowerCase().includes(q) ||
        r.dates.some((d) => d.dateName.toLowerCase().includes(q))
    );
  }

  deleteDate(safarId: string, dateId: string): boolean {
    const record = this.records.find((r) => r.id === safarId);
    if (!record) return false;

    record.dates = record.dates.filter((d) => d.id !== dateId);
    record.totalDates = record.dates.length;
    record.totalMainFiles = record.dates.reduce((acc, d) => acc + d.mainDataMetrics.fileCount, 0);
    record.totalRemainingFiles = record.dates.reduce((acc, d) => acc + d.remainingMetrics.fileCount, 0);
    record.totalThumbnailsFiles = record.dates.reduce((acc, d) => acc + d.thumbnailsMetrics.fileCount, 0);
    record.totalFiles = record.totalMainFiles + record.totalRemainingFiles + record.totalThumbnailsFiles;
    record.totalBytes = record.dates.reduce((acc, d) => acc + d.totalBytes, 0);
    record.sizeStr = formatBytes(record.totalBytes);
    record.lastModifiedAt = new Date().toISOString();

    this.save();
    return true;
  }

  deleteSafar(safarId: string): boolean {
    const prevLen = this.records.length;
    this.records = this.records.filter((r) => r.id !== safarId);
    if (this.records.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  exportStats(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.records, null, 2);
    }

    // CSV format
    const rows: string[] = [
      'Safar Name,Date Folder,Total Files,Main Files,Main Photos,Main Videos,Remaining Files,Thumbnails Files,Total Size (Bytes),Size,Updated At'
    ];

    for (const s of this.records) {
      for (const d of s.dates) {
        rows.push([
          `"${s.safarName.replace(/"/g, '""')}"`,
          `"${d.dateName.replace(/"/g, '""')}"`,
          d.totalFiles,
          d.mainDataMetrics.fileCount,
          d.mainDataMetrics.photoCount,
          d.mainDataMetrics.videoCount,
          d.remainingMetrics.fileCount,
          d.thumbnailsMetrics.fileCount,
          d.totalBytes,
          `"${d.sizeStr}"`,
          `"${d.updatedAt}"`,
        ].join(','));
      }
    }

    return rows.join('\r\n');
  }
}
