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

export interface MissingThumbnailItem {
  folderRel: string;
  folderPath: string;
  missingType: 'photo' | 'video';
  expectedFilename: string;
  companionFilename?: string;
  reason: 'missing_companion' | 'count_deficit';
}

export interface FolderMismatchSummary {
  folderRel: string;
  folderPath: string;
  photoCount: number;
  videoCount: number;
  deficitCount: number;
  missingType: 'photo' | 'video' | 'mixed';
  missingItems: MissingThumbnailItem[];
  samplePresentItems: string[];
}

export interface ThumbnailScanResult {
  items: ThumbnailItem[];
  totalPhotos: number;
  totalVideos: number;
  totalBytes: number;
  isBalanced: boolean;
  totalMismatches: number;
  folderMismatches: FolderMismatchSummary[];
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

    // Group thumbnails by folder to check _P = _V balance and detect missing counterparts
    const folderMap = new Map<
      string,
      {
        folderPath: string;
        folderRel: string;
        photos: ThumbnailItem[];
        videos: ThumbnailItem[];
      }
    >();

    for (const item of items) {
      const folderPath = path.dirname(item.sourcePath);
      const folderRel = path.dirname(item.relPath);
      let entry = folderMap.get(folderPath);
      if (!entry) {
        entry = {
          folderPath,
          folderRel: folderRel === '.' ? '(Root)' : folderRel,
          photos: [],
          videos: [],
        };
        folderMap.set(folderPath, entry);
      }
      if (item.type === 'photo') {
        entry.photos.push(item);
      } else {
        entry.videos.push(item);
      }
    }

    const folderMismatches: FolderMismatchSummary[] = [];

    for (const entry of folderMap.values()) {
      const photoCount = entry.photos.length;
      const videoCount = entry.videos.length;

      // Group stems to detect missing pairs
      const photoStems = new Map<string, ThumbnailItem>();
      for (const p of entry.photos) {
        const ext = path.extname(p.filename);
        const stem = path.basename(p.filename, ext);
        const base = stem.replace(/_[pP]$/, '').toLowerCase();
        photoStems.set(base, p);
      }

      const videoStems = new Map<string, ThumbnailItem>();
      for (const v of entry.videos) {
        const ext = path.extname(v.filename);
        const stem = path.basename(v.filename, ext);
        const base = stem.replace(/_[vV]$/, '').toLowerCase();
        videoStems.set(base, v);
      }

      const missingItems: MissingThumbnailItem[] = [];

      // Check photo thumbnails missing matching video thumbnails
      for (const [baseKey, pItem] of photoStems.entries()) {
        if (!videoStems.has(baseKey)) {
          const ext = path.extname(pItem.filename);
          const rawStem = path.basename(pItem.filename, ext).replace(/_[pP]$/, '');
          missingItems.push({
            folderRel: entry.folderRel,
            folderPath: entry.folderPath,
            missingType: 'video',
            expectedFilename: `${rawStem}_V${ext}`,
            companionFilename: pItem.filename,
            reason: 'missing_companion',
          });
        }
      }

      // Check video thumbnails missing matching photo thumbnails
      for (const [baseKey, vItem] of videoStems.entries()) {
        if (!photoStems.has(baseKey)) {
          const ext = path.extname(vItem.filename);
          const rawStem = path.basename(vItem.filename, ext).replace(/_[vV]$/, '');
          missingItems.push({
            folderRel: entry.folderRel,
            folderPath: entry.folderPath,
            missingType: 'photo',
            expectedFilename: `${rawStem}_P${ext}`,
            companionFilename: vItem.filename,
            reason: 'missing_companion',
          });
        }
      }

      // Handle pure count deficit if stems didn't identify companions (e.g., mismatched naming)
      const deficit = Math.abs(photoCount - videoCount);
      if (photoCount !== videoCount && missingItems.length === 0) {
        const deficitType = photoCount > videoCount ? 'video' : 'photo';
        missingItems.push({
          folderRel: entry.folderRel,
          folderPath: entry.folderPath,
          missingType: deficitType,
          expectedFilename: `${deficit} ${deficitType === 'video' ? '_V (Video)' : '_P (Photo)'} thumbnail(s)`,
          reason: 'count_deficit',
        });
      }

      const isFolderBalanced = photoCount === videoCount && missingItems.length === 0;

      if (!isFolderBalanced) {
        let missingType: 'photo' | 'video' | 'mixed' = 'mixed';
        if (photoCount > videoCount) missingType = 'video';
        else if (videoCount > photoCount) missingType = 'photo';

        folderMismatches.push({
          folderRel: entry.folderRel,
          folderPath: entry.folderPath,
          photoCount,
          videoCount,
          deficitCount: deficit > 0 ? deficit : missingItems.length,
          missingType,
          missingItems,
          samplePresentItems: [...entry.photos, ...entry.videos].slice(0, 6).map((x) => x.filename),
        });
      }
    }

    const totalMismatches = folderMismatches.reduce(
      (acc, f) => acc + Math.max(f.deficitCount, f.missingItems.length),
      0
    );
    const isOverallBalanced = totalPhotos === totalVideos && folderMismatches.length === 0;

    return {
      items,
      totalPhotos,
      totalVideos,
      totalBytes,
      isBalanced: isOverallBalanced,
      totalMismatches,
      folderMismatches,
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
