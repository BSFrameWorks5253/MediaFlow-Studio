import fs from 'fs';
import path from 'path';

export interface RemainingFolderItem {
  id: string;
  folderName: string;
  originalPath: string;
  dateFolderName: string;
  targetPath: string;
  photoCount: number;
  folderSizeBytes: number;
  folderSizeFormatted: string;
}

export interface RemainingScanResult {
  items: RemainingFolderItem[];
  totalFolders: number;
  totalPhotos: number;
  totalBytes: number;
}

export interface ShiftManifestRecord {
  originalPath: string;
  newPath: string;
  folderName: string;
  dateFolder: string;
  photoCount: number;
  timestamp: string;
}

export class RemainingCollectorEngine {
  private isScanning = false;
  private isShifting = false;

  private isRemainingFolder(name: string): boolean {
    const n = name.toLowerCase().trim();
    if (n.includes('remain')) return true;
    return /(?:^|[\s_\-])rem(?:aining)?(?:[\s_\-]|photos?|$)/i.test(n);
  }

  private extractDateFolderName(fullPath: string, baseRoot: string): string {
    const rel = path.relative(baseRoot, fullPath);
    const parts = rel.split(path.sep).filter((p) => p && p !== '.');
    // Look backwards from parent segments
    for (let i = parts.length - 2; i >= 0; i--) {
      const part = parts[i];
      if (
        /\d{4}[-_.]\d{2}[-_.]\d{2}/.test(part) ||
        /\d{2}[-_.]\d{2}[-_.]\d{4}/.test(part) ||
        /^(?:day|date|event|session)[\s_\-]*\d+/i.test(part)
      ) {
        return part;
      }
    }
    // Fallback: immediate parent folder
    return parts.length >= 2 ? parts[parts.length - 2] : path.basename(baseRoot);
  }

  async scanDirectories(sourceDir: string, destDir?: string): Promise<RemainingScanResult> {
    const cleanSource = path.resolve(sourceDir.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanSource)) throw new Error(`Directory does not exist: ${cleanSource}`);

    this.isScanning = true;
    const foundItems: RemainingFolderItem[] = [];
    let totalPhotos = 0;
    let totalBytes = 0;

    const PHOTO_EXTS = new Set([
      '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif',
      '.cr2', '.cr3', '.nef', '.arw', '.raf', '.dng', '.orf', '.rw2', '.pef', '.srw', '.heic'
    ]);

    const countFolderDetails = async (dir: string): Promise<{ count: number; bytes: number }> => {
      let count = 0;
      let bytes = 0;
      const walk = async (curr: string) => {
        const ents = await fs.promises.readdir(curr, { withFileTypes: true });
        for (const e of ents) {
          const full = path.join(curr, e.name);
          if (e.isDirectory()) await walk(full);
          else if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            if (PHOTO_EXTS.has(ext)) {
              count++;
              const stat = await fs.promises.stat(full);
              bytes += stat.size;
            }
          }
        }
      };
      await walk(dir);
      return { count, bytes };
    };

    const traverse = async (curr: string) => {
      const ents = await fs.promises.readdir(curr, { withFileTypes: true });
      for (const ent of ents) {
        if (!ent.isDirectory()) continue;
        const full = path.join(curr, ent.name);

        if (this.isRemainingFolder(ent.name)) {
          // Boundary Lock: Treat subtree as single unit, do not recurse inside
          const dateFolder = this.extractDateFolderName(full, cleanSource);
          const details = await countFolderDetails(full);
          totalPhotos += details.count;
          totalBytes += details.bytes;

          let targetPath = '';
          if (destDir) {
            targetPath = path.join(path.resolve(destDir), dateFolder);
          }

          const szMB = (details.bytes / (1024 * 1024)).toFixed(1);
          const szGB = (details.bytes / (1024 * 1024 * 1024)).toFixed(2);
          const formatted = details.bytes > 1024 ** 3 ? `${szGB} GB` : `${szMB} MB`;

          foundItems.push({
            id: full,
            folderName: ent.name,
            originalPath: full,
            dateFolderName: dateFolder,
            targetPath,
            photoCount: details.count,
            folderSizeBytes: details.bytes,
            folderSizeFormatted: formatted,
          });
        } else {
          await traverse(full);
        }
      }
    };

    await traverse(cleanSource);
    this.isScanning = false;

    return {
      items: foundItems,
      totalFolders: foundItems.length,
      totalPhotos,
      totalBytes,
    };
  }

  async executeShift(
    items: RemainingFolderItem[],
    destDir: string,
    onProgress?: (curr: number, total: number, folder: string) => void
  ): Promise<{ success_count: number; error_count: number; manifestPath: string }> {
    this.isShifting = true;
    const cleanDest = path.resolve(destDir.replace(/^file:\/\/\/?/, ''));
    await fs.promises.mkdir(cleanDest, { recursive: true });

    const manifestRecords: ShiftManifestRecord[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let targetFolder = path.join(cleanDest, item.dateFolderName);

      // Collision handling: append _1, _2 if folder already exists
      if (fs.existsSync(targetFolder)) {
        let counter = 1;
        while (fs.existsSync(path.join(cleanDest, `${item.dateFolderName}_${counter}`))) {
          counter++;
        }
        targetFolder = path.join(cleanDest, `${item.dateFolderName}_${counter}`);
      }

      try {
        await fs.promises.rename(item.originalPath, targetFolder);
        manifestRecords.push({
          originalPath: item.originalPath,
          newPath: targetFolder,
          folderName: item.folderName,
          dateFolder: item.dateFolderName,
          photoCount: item.photoCount,
          timestamp: new Date().toISOString(),
        });
        successCount++;
        if (onProgress) onProgress(i + 1, items.length, item.folderName);
      } catch {
        errorCount++;
      }
    }

    // Save JSON manifest to Document/ folder
    const docDir = path.join(cleanDest, 'Document');
    await fs.promises.mkdir(docDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const manifestPath = path.join(docDir, `remaining_shift_manifest_${timestamp}.json`);
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifestRecords, null, 2), 'utf-8');

    this.isShifting = false;
    return { success_count: successCount, error_count: errorCount, manifestPath };
  }

  async undoShift(manifestPath: string): Promise<{ restored: number; failed: number }> {
    if (!fs.existsSync(manifestPath)) throw new Error(`Manifest not found: ${manifestPath}`);
    const records: ShiftManifestRecord[] = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));

    let restored = 0;
    let failed = 0;

    for (const rec of records.reverse()) {
      try {
        if (fs.existsSync(rec.newPath)) {
          await fs.promises.mkdir(path.dirname(rec.originalPath), { recursive: true });
          await fs.promises.rename(rec.newPath, rec.originalPath);
          restored++;
        }
      } catch {
        failed++;
      }
    }

    return { restored, failed };
  }
}
