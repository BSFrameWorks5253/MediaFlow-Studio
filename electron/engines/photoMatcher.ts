import fs from 'fs';
import path from 'path';

export const PHOTO_MATCHER_EXTS = new Set([
  '.cr2', '.cr3', '.nef', '.arw', '.raf', '.dng', '.orf', '.rw2',
  '.pef', '.srw', '.heic', '.jpg', '.jpeg', '.png', '.tif', '.tiff'
]);

export interface PhotoPreStats {
  date_folder_count: number;
  total_original_photos: number;
  total_remaining_photos: number;
}

export interface PhotoMatchItem {
  filename: string;
  sourcePath: string;
  targetPath: string;
  targetFolder: string;
  dateFolder: string;
  baseClean: string;
  isUsed: boolean;
  status: 'Used' | 'Missing' | 'Ignored';
  targetFilename: string;
  extension: string;
  folderLabel?: string;
  willRename?: boolean;
}

export interface PhotoMatchScanResult {
  all_items: PhotoMatchItem[];
  totalRemaining: number;
  totalUsed: number;
  totalMissing: number;
  totalIgnored?: number;
  totalDuplicates: number;
  totalErrors: number;
  folderPairs?: Array<{ first: string; second: string; label: string }>;
}

export class PhotoMatcherEngine {
  private isScanning = false;
  private isRenaming = false;

  findSiblingRemainingDir(selectedDir: string): string {
    try {
      const clean = path.resolve(selectedDir.replace(/^file:\/\/\/?/, ''));
      const parent = path.dirname(clean);
      const base = path.basename(clean);
      const candidates = [
        `${base}_Remaings`,
        `${base}_Remaining`,
        `${base}_Remainings`,
        `${base}_Remaing`,
        `${base}_Rem`,
        'Remaining',
        'Remaings',
        'Remainings',
      ];
      for (const cand of candidates) {
        const full = path.join(parent, cand);
        if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
          return full;
        }
      }
    } catch {}
    return '';
  }

  private isDateFolderName(name: string): boolean {
    if (/\d{4}[-_.]\d{2}[-_.]\d{2}/.test(name) || /\d{2}[-_.]\d{2}[-_.]\d{4}/.test(name)) {
      return true;
    }
    return /^(?:day|date|event|session)[\s_\-]*\d+/i.test(name);
  }

  private cleanStem(filename: string): string {
    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    return stem.replace(/_[URur]$/, '');
  }

  private isIgnored(filename: string, ignoredSuffixes: string[] = ['_P', '_V']): boolean {
    const ext = path.extname(filename).toLowerCase();
    if (!PHOTO_MATCHER_EXTS.has(ext)) return true;
    const stem = path.basename(filename, ext).toUpperCase();
    for (const s of ignoredSuffixes) {
      const clean = s.trim().toUpperCase().replace(/^_/, '');
      if (stem.endsWith(`_${clean}`) || stem.endsWith(clean)) {
        return true;
      }
    }
    return false;
  }

  private async getSubdirectories(dirPath: string): Promise<string[]> {
    if (!fs.existsSync(dirPath)) return [];
    const skipNames = new Set(['document', 'documents', 'document_reports', '__pycache__']);
    const ents = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return ents
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !skipNames.has(e.name.toLowerCase()))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  private async collectPhotosRecursively(dirPath: string, ignoredSuffixes: string[]): Promise<Set<string>> {
    const keys = new Set<string>();
    const skipNames = new Set(['document', 'documents', 'document_reports', '__pycache__']);

    const walk = async (curr: string) => {
      try {
        const ents = await fs.promises.readdir(curr, { withFileTypes: true });
        for (const e of ents) {
          if (e.isDirectory()) {
            if (!e.name.startsWith('.') && !skipNames.has(e.name.toLowerCase())) {
              await walk(path.join(curr, e.name));
            }
          } else if (e.isFile()) {
            if (!this.isIgnored(e.name, ignoredSuffixes)) {
              const clean = this.cleanStem(e.name).toUpperCase();
              keys.add(clean);
            }
          }
        }
      } catch {}
    };

    if (fs.existsSync(dirPath)) {
      await walk(dirPath);
    }
    return keys;
  }

  async getPreStats(dirPath: string): Promise<PhotoPreStats> {
    const cleanPath = path.resolve(dirPath.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanPath)) {
      return { date_folder_count: 0, total_original_photos: 0, total_remaining_photos: 0 };
    }

    const dateFolders = new Set<string>();
    let totalOrig = 0;
    let totalRem = 0;

    const entries = await fs.promises.readdir(cleanPath, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory() && this.isDateFolderName(ent.name)) {
        dateFolders.add(ent.name);
      }
    }

    const walk = async (curr: string) => {
      const ents = await fs.promises.readdir(curr, { withFileTypes: true });
      const rel = path.relative(cleanPath, curr);
      const parts = rel.split(path.sep).filter((p) => p && p !== '.');
      const isRem = parts.some((p) => p.toLowerCase().includes('remaining'));

      for (const e of ents) {
        const full = path.join(curr, e.name);
        if (e.isDirectory()) {
          if (!e.name.startsWith('.')) {
            await walk(full);
          }
        } else if (e.isFile()) {
          const ext = path.extname(e.name).toLowerCase();
          if (PHOTO_MATCHER_EXTS.has(ext)) {
            const stem = path.basename(e.name, ext);
            if (isRem || /_[URur]$/.test(stem)) {
              totalRem++;
            } else {
              totalOrig++;
            }
          }
        }
      }
    };

    await walk(cleanPath);

    return {
      date_folder_count: dateFolders.size || (totalRem > 0 ? 1 : 0),
      total_original_photos: totalOrig,
      total_remaining_photos: totalRem,
    };
  }

  /**
   * Two-path scanner matching Selected Photos (firstPath) vs All Photos (secondPath).
   * - Ignores JPG/photos ending with _P and _V
   * - Matches subfolders by order (1st folder = 1st folder) or by name
   * - Tags matched photos with _U and unmatched photos with _R in the secondPath
   */
  async scanTwoPaths(
    firstPath: string,
    secondPath: string,
    options?: { matchByOrder?: boolean; ignoredSuffixes?: string[] }
  ): Promise<PhotoMatchScanResult> {
    const cleanFirst = path.resolve(firstPath.replace(/^file:\/\/\/?/, ''));
    const cleanSecond = path.resolve(secondPath.replace(/^file:\/\/\/?/, ''));

    const firstExists = fs.existsSync(cleanFirst);
    const secondExists = fs.existsSync(cleanSecond);

    if (!firstExists && !secondExists) {
      throw new Error('Both selected photo directories could not be found. Please verify the folder locations.');
    }
    if (!firstExists) {
      throw new Error('The Selected Photos directory could not be found. Please verify the folder location.');
    }
    if (!secondExists) {
      throw new Error('The All Photos directory could not be found. Please verify the folder location.');
    }

    const matchByOrder = options?.matchByOrder !== false; // Default true
    const ignoredSuffixes = options?.ignoredSuffixes || ['_P', '_V'];

    const firstSubs = await this.getSubdirectories(cleanFirst);
    const secondSubs = await this.getSubdirectories(cleanSecond);

    interface FolderPair {
      firstDir: string | null;
      secondDir: string | null;
      label: string;
    }

    const folderPairs: FolderPair[] = [];

    if (firstSubs.length === 0 && secondSubs.length === 0) {
      folderPairs.push({
        firstDir: cleanFirst,
        secondDir: cleanSecond,
        label: 'Root Directory (Direct)',
      });
    } else if (matchByOrder) {
      const maxCount = Math.max(firstSubs.length, secondSubs.length);
      for (let i = 0; i < maxCount; i++) {
        const fName = firstSubs[i];
        const sName = secondSubs[i];
        folderPairs.push({
          firstDir: fName ? path.join(cleanFirst, fName) : null,
          secondDir: sName ? path.join(cleanSecond, sName) : null,
          label: `Folder #${i + 1}: ${fName || '[None]'} ⟷ ${sName || '[None]'}`,
        });
      }
    } else {
      // Match by identical name (case-insensitive)
      const secondMap = new Map<string, string>();
      for (const s of secondSubs) {
        secondMap.set(s.toLowerCase(), s);
      }
      const matchedSecond = new Set<string>();

      for (const f of firstSubs) {
        const sMatch = secondMap.get(f.toLowerCase());
        if (sMatch) {
          matchedSecond.add(sMatch.toLowerCase());
          folderPairs.push({
            firstDir: path.join(cleanFirst, f),
            secondDir: path.join(cleanSecond, sMatch),
            label: `Name Match: ${f} ⟷ ${sMatch}`,
          });
        } else {
          folderPairs.push({
            firstDir: path.join(cleanFirst, f),
            secondDir: null,
            label: `Name: ${f} ⟷ [No Match]`,
          });
        }
      }

      for (const s of secondSubs) {
        if (!matchedSecond.has(s.toLowerCase())) {
          folderPairs.push({
            firstDir: null,
            secondDir: path.join(cleanSecond, s),
            label: `Name: [No Match] ⟷ ${s}`,
          });
        }
      }
    }

    // Collect global reference keys across all selected folders as fallback
    const globalReferenceKeys = await this.collectPhotosRecursively(cleanFirst, ignoredSuffixes);

    let totalUsed = 0;
    let totalMissing = 0;
    let totalIgnored = 0;
    const allItems: PhotoMatchItem[] = [];

    for (const pair of folderPairs) {
      if (!pair.secondDir || !fs.existsSync(pair.secondDir)) {
        continue;
      }

      // Collect reference clean stems recursively from firstDir
      const referenceKeys = pair.firstDir && fs.existsSync(pair.firstDir)
        ? await this.collectPhotosRecursively(pair.firstDir, ignoredSuffixes)
        : new Set<string>();

      // Walk target files in secondDir recursively (skipping Document/reports)
      const targetFiles: string[] = [];
      const skipNames = new Set(['document', 'documents', 'document_reports', '__pycache__']);
      const walkTarget = async (curr: string) => {
        try {
          const ents = await fs.promises.readdir(curr, { withFileTypes: true });
          for (const e of ents) {
            if (e.isDirectory()) {
              if (!e.name.startsWith('.') && !skipNames.has(e.name.toLowerCase())) {
                await walkTarget(path.join(curr, e.name));
              }
            } else if (e.isFile()) {
              const ext = path.extname(e.name).toLowerCase();
              if (PHOTO_MATCHER_EXTS.has(ext)) {
                targetFiles.push(path.join(curr, e.name));
              }
            }
          }
        } catch {}
      };
      await walkTarget(pair.secondDir);

      const dateFolder = path.basename(pair.secondDir);

      for (const fullPath of targetFiles) {
        const fileName = path.basename(fullPath);
        const ext = path.extname(fileName);

        if (this.isIgnored(fileName, ignoredSuffixes)) {
          totalIgnored++;
          allItems.push({
            filename: fileName,
            sourcePath: fullPath,
            targetPath: fullPath,
            targetFolder: path.dirname(fullPath),
            dateFolder,
            baseClean: path.basename(fileName, ext),
            isUsed: false,
            status: 'Ignored',
            targetFilename: fileName,
            extension: ext,
            folderLabel: pair.label,
            willRename: false,
          });
          continue;
        }

        const baseClean = this.cleanStem(fileName);
        const lookupKey = baseClean.toUpperCase();
        const isUsed = referenceKeys.has(lookupKey) || globalReferenceKeys.has(lookupKey);

        if (isUsed) totalUsed++;
        else totalMissing++;

        const targetFilename = `${baseClean}_${isUsed ? 'U' : 'R'}${ext}`;
        const targetPath = path.join(path.dirname(fullPath), targetFilename);
        const willRename = fileName !== targetFilename;

        allItems.push({
          filename: fileName,
          sourcePath: fullPath,
          targetPath,
          targetFolder: path.dirname(fullPath),
          dateFolder,
          baseClean,
          isUsed,
          status: isUsed ? 'Used' : 'Missing',
          targetFilename,
          extension: ext,
          folderLabel: pair.label,
          willRename,
        });
      }
    }

    return {
      all_items: allItems,
      totalRemaining: allItems.length,
      totalUsed,
      totalMissing,
      totalIgnored,
      totalDuplicates: 0,
      totalErrors: 0,
      folderPairs: folderPairs.map((p) => ({
        first: p.firstDir || '',
        second: p.secondDir || '',
        label: p.label,
      })),
    };
  }

  async scanDirectory(dirPath: string): Promise<PhotoMatchScanResult> {
    const cleanPath = path.resolve(dirPath.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanPath)) {
      throw new Error('Target directory could not be found. Please verify the folder location.');
    }

    this.isScanning = true;

    const dateFolders = new Set<string>();
    const origPhotosByDate = new Map<string, Set<string>>();
    const allOriginalsGlobal = new Set<string>();
    const remPhotosList: { fullPath: string; fileName: string; dateFolder: string; isIgnored?: boolean }[] = [];

    const topEntries = await fs.promises.readdir(cleanPath, { withFileTypes: true });
    for (const ent of topEntries) {
      if (ent.isDirectory() && this.isDateFolderName(ent.name)) {
        dateFolders.add(ent.name);
      }
    }

    const walk = async (curr: string) => {
      const ents = await fs.promises.readdir(curr, { withFileTypes: true });
      const rel = path.relative(cleanPath, curr);
      const parts = rel.split(path.sep).filter((p) => p && p !== '.');
      const dName = parts.length > 0 && dateFolders.has(parts[0])
        ? parts[0]
        : (parts[0] || path.basename(cleanPath));
      const isRem = parts.some((p) => p.toLowerCase().includes('remaining'));

      for (const e of ents) {
        const full = path.join(curr, e.name);
        if (e.isDirectory()) {
          if (!e.name.startsWith('.')) await walk(full);
        } else if (e.isFile()) {
          const ext = path.extname(e.name).toLowerCase();
          if (PHOTO_MATCHER_EXTS.has(ext)) {
            const stem = path.basename(e.name, ext);
            const isIgn = this.isIgnored(e.name, ['_P', '_V']);

            if (isRem || /_[URur]$/.test(stem)) {
              remPhotosList.push({ fullPath: full, fileName: e.name, dateFolder: dName, isIgnored: isIgn });
            } else if (!isIgn) {
              const cleanStem = stem.replace(/_[URur]$/, '').toUpperCase();
              if (!origPhotosByDate.has(dName)) {
                origPhotosByDate.set(dName, new Set());
              }
              origPhotosByDate.get(dName)!.add(cleanStem);
              allOriginalsGlobal.add(cleanStem);
            }
          }
        }
      }
    };

    await walk(cleanPath);

    let totalUsed = 0;
    let totalMissing = 0;
    let totalIgnored = 0;
    const allItems: PhotoMatchItem[] = [];

    for (const item of remPhotosList) {
      const ext = path.extname(item.fileName);
      const stem = path.basename(item.fileName, ext);
      const baseClean = stem.replace(/_[URur]$/, '');
      const lookupKey = baseClean.toUpperCase();

      if (item.isIgnored) {
        totalIgnored++;
        allItems.push({
          filename: item.fileName,
          sourcePath: item.fullPath,
          targetPath: item.fullPath,
          targetFolder: path.dirname(item.fullPath),
          dateFolder: item.dateFolder,
          baseClean,
          isUsed: false,
          status: 'Ignored',
          targetFilename: item.fileName,
          extension: ext,
          folderLabel: item.dateFolder,
          willRename: false,
        });
        continue;
      }

      const dateSet = origPhotosByDate.get(item.dateFolder);
      const isUsed = dateSet ? dateSet.has(lookupKey) : allOriginalsGlobal.has(lookupKey);

      if (isUsed) totalUsed++;
      else totalMissing++;

      const targetFilename = `${baseClean}_${isUsed ? 'U' : 'R'}${ext}`;
      const targetPath = path.join(path.dirname(item.fullPath), targetFilename);

      allItems.push({
        filename: item.fileName,
        sourcePath: item.fullPath,
        targetPath,
        targetFolder: path.dirname(item.fullPath),
        dateFolder: item.dateFolder,
        baseClean,
        isUsed,
        status: isUsed ? 'Used' : 'Missing',
        targetFilename,
        extension: ext,
        folderLabel: item.dateFolder,
        willRename: item.fileName !== targetFilename,
      });
    }

    this.isScanning = false;

    return {
      all_items: allItems,
      totalRemaining: remPhotosList.length,
      totalUsed,
      totalMissing,
      totalIgnored,
      totalDuplicates: 0,
      totalErrors: 0,
      folderPairs: Array.from(dateFolders).map(df => ({ first: '', second: '', label: df })),
    };
  }

  async executeRename(
    items: PhotoMatchItem[],
    dryRun = false
  ): Promise<{ success_count: number; error_count: number; report_path: string; skipped_count: number }> {
    this.isRenaming = true;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    const reportRows: { original: string; renamed: string; status: string; path: string }[] = [];

    for (const item of items) {
      if (item.status === 'Ignored' || item.sourcePath === item.targetPath) {
        skippedCount++;
        reportRows.push({
          original: item.filename,
          renamed: item.targetFilename,
          status: item.status === 'Ignored' ? 'Ignored (_P/_V)' : 'Already Tagged',
          path: item.targetPath,
        });
        continue;
      }

      if (dryRun) {
        successCount++;
        reportRows.push({
          original: item.filename,
          renamed: item.targetFilename,
          status: `[Dry Run] ${item.status}`,
          path: item.targetPath,
        });
        continue;
      }

      try {
        if (fs.existsSync(item.targetPath)) {
          await fs.promises.unlink(item.targetPath);
        }
        await fs.promises.rename(item.sourcePath, item.targetPath);
        item.sourcePath = item.targetPath;
        item.filename = item.targetFilename;
        item.willRename = false;
        successCount++;
        reportRows.push({
          original: item.filename,
          renamed: item.targetFilename,
          status: item.status,
          path: item.targetPath,
        });
      } catch (err) {
        errorCount++;
        reportRows.push({
          original: item.filename,
          renamed: item.targetFilename,
          status: 'Error Renaming',
          path: item.sourcePath,
        });
      }
    }

    // Export CSV report to Document subfolder (SEQUORA standard)
    let reportPath = '';
    if (items.length > 0) {
      let baseDir = path.dirname(items[0].sourcePath);
      // Find root directory above 'Remaining'
      while (
        baseDir &&
        (path.basename(baseDir).toLowerCase().includes('remaining') ||
          path.basename(path.dirname(baseDir)).toLowerCase().includes('remaining'))
      ) {
        baseDir = path.dirname(baseDir);
      }
      const docDir = path.join(baseDir, 'Document');
      await fs.promises.mkdir(docDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      reportPath = path.join(docDir, `Photo_Match_Report_${timestamp}.csv`);

      const csvHeader = 'Original Name,Renamed Target,Status,Folder\n';
      const csvContent = reportRows
        .map((r) => `"${r.original}","${r.renamed}","${r.status}","${r.path}"`)
        .join('\n');
      await fs.promises.writeFile(reportPath, csvHeader + csvContent, 'utf-8');
    }

    this.isRenaming = false;
    return {
      success_count: successCount,
      error_count: errorCount,
      report_path: reportPath,
      skipped_count: skippedCount,
    };
  }
}
