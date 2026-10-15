import fs from 'fs';
import path from 'path';

export const THUMB_SEPARATOR_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'
]);

export interface ThumbnailItem {
  filename: string;
  sourcePath: string;
  relPath: string;
  targetPath: string;
  type: 'photo' | 'video';
  size: number;
}

export interface ThumbnailScanResult {
  items: ThumbnailItem[];
  totalPhotos: number;
  totalVideos: number;
  totalBytes: number;
}

export class ThumbnailSeparatorEngine {
  private isScanning = false;
  private isProcessing = false;

  async scanDirectory(sourceDir: string, destDir?: string): Promise<ThumbnailScanResult> {
    const cleanSource = path.resolve(sourceDir.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanSource)) {
      throw new Error('Source media directory could not be found. Please verify the folder.');
    }

    this.isScanning = true;
    const items: ThumbnailItem[] = [];
    let totalPhotos = 0;
    let totalVideos = 0;
    let totalBytes = 0;

    const walk = async (curr: string) => {
      const ents = await fs.promises.readdir(curr, { withFileTypes: true });
      for (const ent of ents) {
        const full = path.join(curr, ent.name);
        if (ent.isDirectory()) {
          if (!ent.name.startsWith('.')) await walk(full);
        } else if (ent.isFile()) {
          const ext = path.extname(ent.name).toLowerCase();
          if (THUMB_SEPARATOR_EXTS.has(ext)) {
            const stem = path.basename(ent.name, ext);
            const isP = /_[pP]$/.test(stem);
            const isV = /_[vV]$/.test(stem);

            if (isP || isV) {
              const rel = path.relative(cleanSource, full);
              const stat = await fs.promises.stat(full);
              const target = destDir ? path.join(path.resolve(destDir), rel) : '';

              if (isP) totalPhotos++;
              if (isV) totalVideos++;
              totalBytes += stat.size;

              items.push({
                filename: ent.name,
                sourcePath: full,
                relPath: rel,
                targetPath: target,
                type: isP ? 'photo' : 'video',
                size: stat.size,
              });
            }
          }
        }
      }
    };

    await walk(cleanSource);
    this.isScanning = false;

    return {
      items,
      totalPhotos,
      totalVideos,
      totalBytes,
    };
  }

  async executeSeparation(
    items: ThumbnailItem[],
    destDir: string,
    mode: 'copy' | 'move' = 'copy'
  ): Promise<{ success_count: number; error_count: number; report_path: string }> {
    this.isProcessing = true;
    const cleanDest = path.resolve(destDir.replace(/^file:\/\/\/?/, ''));
    let successCount = 0;
    let errorCount = 0;

    const logRows: { file: string; src: string; dst: string; mode: string }[] = [];

    for (const item of items) {
      const target = path.join(cleanDest, item.relPath);
      try {
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        if (mode === 'move') {
          await fs.promises.rename(item.sourcePath, target);
        } else {
          await fs.promises.copyFile(item.sourcePath, target);
          const stat = await fs.promises.stat(item.sourcePath);
          await fs.promises.utimes(target, stat.atime, stat.mtime);
        }
        successCount++;
        logRows.push({ file: item.filename, src: item.sourcePath, dst: target, mode });
      } catch {
        errorCount++;
      }
    }

    // Export CSV report
    const docDir = path.join(cleanDest, 'Document');
    await fs.promises.mkdir(docDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const reportPath = path.join(docDir, `Thumbnail_Separation_Report_${timestamp}.csv`);

    const csvContent =
      'Filename,Source,Target,Mode\n' +
      logRows.map((r) => `"${r.file}","${r.src}","${r.dst}","${r.mode}"`).join('\n');
    await fs.promises.writeFile(reportPath, csvContent, 'utf-8');

    this.isProcessing = false;
    return {
      success_count: successCount,
      error_count: errorCount,
      report_path: reportPath,
    };
  }
}
