import fs from 'fs';
import path from 'path';

export interface FileTypeStats {
  photos: number;
  videos: number;
  documents: number;
  audio: number;
  archives: number;
  others: number;
}

export interface SubfolderDetail {
  name: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  fileCount: number;
  subfolderCount: number;
}

export interface FolderVerificationItem {
  id: string;
  path: string;
  folderName: string;
  exists: boolean;
  accessible: boolean;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  totalFiles: number;
  totalSubfolders: number;
  fileTypes: FileTypeStats;
  topExtensions: { ext: string; count: number }[];
  subfolders: SubfolderDetail[];
  verifiedAt: string;
  status: 'verified' | 'error' | 'empty';
  errorMessage?: string;
}

export interface FolderVerificationSummary {
  verifiedAt: string;
  totalFolders: number;
  validFolders: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  totalFiles: number;
  totalSubfolders: number;
  fileTypes: FileTypeStats;
  items: FolderVerificationItem[];
  reports: {
    executive: string;
    compact: string;
    detailed: string;
    markdown: string;
  };
}

const PHOTO_EXTS = new Set([
  '.jpg', '.jpeg', '.jpe', '.png', '.heic', '.heif', '.hif', '.webp',
  '.tif', '.tiff', '.bmp', '.dib', '.raw', '.arw', '.cr2', '.cr3',
  '.nef', '.nrw', '.dng', '.orf', '.rw2', '.pef', '.raf', '.srw',
  '.psd', '.ai', '.svg', '.dcr', '.kdc', '.mrw', '.x3f'
]);

const VIDEO_EXTS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.mts', '.m2ts', '.mxf', '.wmv',
  '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.mod', '.tod',
  '.braw', '.r3d', '.vob', '.ogv'
]);

const DOC_EXTS = new Set([
  '.xlsx', '.xls', '.csv', '.docx', '.doc', '.pdf', '.txt', '.pptx',
  '.ppt', '.xml', '.json', '.rtf', '.odt', '.ods', '.odp'
]);

const AUDIO_EXTS = new Set([
  '.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg', '.wma', '.aiff',
  '.alac', '.pcm'
]);

const ARCHIVE_EXTS = new Set([
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso'
]);

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
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

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export class FolderVerifierEngine {
  /**
   * Recursively verifies and inspects a list of folder paths.
   */
  async verifyFolders(folderPaths: string[], customNote = ''): Promise<FolderVerificationSummary> {
    const items: FolderVerificationItem[] = [];
    const now = new Date();
    const verifiedAtStr = now.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Dedup and normalize
    const seenPaths = new Set<string>();
    const uniquePaths: string[] = [];
    for (const p of folderPaths) {
      if (!p || !p.trim()) continue;
      const clean = path.resolve(p.trim().replace(/^file:\/\/\/?/, ''));
      if (!seenPaths.has(clean.toLowerCase())) {
        seenPaths.add(clean.toLowerCase());
        uniquePaths.push(clean);
      }
    }

    for (let i = 0; i < uniquePaths.length; i++) {
      const folderPath = uniquePaths[i];
      const item = await this.verifySingleFolder(folderPath, `folder-${i + 1}`, verifiedAtStr);
      items.push(item);
    }

    // Calculate aggregated metrics
    let totalSizeBytes = 0;
    let totalFiles = 0;
    let totalSubfolders = 0;
    let validFolders = 0;

    const fileTypes: FileTypeStats = {
      photos: 0,
      videos: 0,
      documents: 0,
      audio: 0,
      archives: 0,
      others: 0,
    };

    for (const it of items) {
      if (it.exists && it.accessible) {
        validFolders++;
        totalSizeBytes += it.totalSizeBytes;
        totalFiles += it.totalFiles;
        totalSubfolders += it.totalSubfolders;
        fileTypes.photos += it.fileTypes.photos;
        fileTypes.videos += it.fileTypes.videos;
        fileTypes.documents += it.fileTypes.documents;
        fileTypes.audio += it.fileTypes.audio;
        fileTypes.archives += it.fileTypes.archives;
        fileTypes.others += it.fileTypes.others;
      }
    }

    const summary: FolderVerificationSummary = {
      verifiedAt: verifiedAtStr,
      totalFolders: items.length,
      validFolders,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      totalFiles,
      totalSubfolders,
      fileTypes,
      items,
      reports: {
        executive: '',
        compact: '',
        detailed: '',
        markdown: '',
      },
    };

    summary.reports = this.generateReports(summary, customNote);
    return summary;
  }

  /**
   * Verifies an individual directory tree
   */
  async verifySingleFolder(folderPath: string, id: string, verifiedAt: string): Promise<FolderVerificationItem> {
    const folderName = path.basename(folderPath) || folderPath;
    const item: FolderVerificationItem = {
      id,
      path: folderPath,
      folderName,
      exists: false,
      accessible: false,
      totalSizeBytes: 0,
      totalSizeFormatted: '0 B',
      totalFiles: 0,
      totalSubfolders: 0,
      fileTypes: {
        photos: 0,
        videos: 0,
        documents: 0,
        audio: 0,
        archives: 0,
        others: 0,
      },
      topExtensions: [],
      subfolders: [],
      verifiedAt,
      status: 'error',
    };

    try {
      if (!fs.existsSync(folderPath)) {
        item.errorMessage = 'Directory does not exist or drive is disconnected.';
        return item;
      }

      const rootStat = await fs.promises.stat(folderPath);
      if (!rootStat.isDirectory()) {
        item.errorMessage = 'Target path is a file, not a directory.';
        return item;
      }

      item.exists = true;
      item.accessible = true;

      const extMap: Record<string, number> = {};
      const subfolderMap = new Map<string, { size: number; files: number; subfolders: number }>();

      // Read immediate children to track direct subfolder metrics
      let directEntries: fs.Dirent[] = [];
      try {
        directEntries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      } catch (readErr: any) {
        item.accessible = false;
        item.errorMessage = 'Access denied or permission restricted.';
        return item;
      }

      for (const de of directEntries) {
        if (de.isDirectory() && !de.name.startsWith('.')) {
          subfolderMap.set(de.name, { size: 0, files: 0, subfolders: 0 });
        }
      }

      // Safe recursive traversal
      const visited = new Set<string>();

      const walk = async (currentDir: string, immediateChildName: string | null) => {
        let realPath: string;
        try {
          realPath = await fs.promises.realpath(currentDir);
          if (visited.has(realPath)) return;
          visited.add(realPath);
        } catch {
          return;
        }

        let entries: fs.Dirent[] = [];
        try {
          entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const ent of entries) {
          const fullPath = path.join(currentDir, ent.name);

          if (ent.isDirectory()) {
            if (ent.name.startsWith('.') || ent.name === '$RECYCLE.BIN' || ent.name === 'System Volume Information') {
              continue;
            }

            item.totalSubfolders++;
            const childKey = immediateChildName || (currentDir === folderPath ? ent.name : null);
            if (childKey && subfolderMap.has(childKey)) {
              const cur = subfolderMap.get(childKey)!;
              if (currentDir !== folderPath) {
                cur.subfolders++;
              }
            }

            await walk(fullPath, childKey);
          } else if (ent.isFile()) {
            item.totalFiles++;

            let size = 0;
            try {
              const fileStat = await fs.promises.stat(fullPath);
              size = fileStat.size;
            } catch {}

            item.totalSizeBytes += size;

            const childKey = immediateChildName;
            if (childKey && subfolderMap.has(childKey)) {
              const cur = subfolderMap.get(childKey)!;
              cur.size += size;
              cur.files++;
            }

            // Categorize by extension
            const ext = path.extname(ent.name).toLowerCase();
            if (ext) {
              extMap[ext] = (extMap[ext] || 0) + 1;
            } else {
              extMap['[no ext]'] = (extMap['[no ext]'] || 0) + 1;
            }

            if (PHOTO_EXTS.has(ext)) {
              item.fileTypes.photos++;
            } else if (VIDEO_EXTS.has(ext)) {
              item.fileTypes.videos++;
            } else if (DOC_EXTS.has(ext)) {
              item.fileTypes.documents++;
            } else if (AUDIO_EXTS.has(ext)) {
              item.fileTypes.audio++;
            } else if (ARCHIVE_EXTS.has(ext)) {
              item.fileTypes.archives++;
            } else {
              item.fileTypes.others++;
            }
          }
        }
      };

      await walk(folderPath, null);

      // Top extensions sorted by count
      item.topExtensions = Object.entries(extMap)
        .map(([ext, count]) => ({ ext, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Populate immediate subfolder summaries sorted by size descending
      item.subfolders = Array.from(subfolderMap.entries())
        .map(([name, data]) => ({
          name,
          path: path.join(folderPath, name),
          sizeBytes: data.size,
          sizeFormatted: formatBytes(data.size),
          fileCount: data.files,
          subfolderCount: data.subfolders,
        }))
        .sort((a, b) => b.sizeBytes - a.sizeBytes);

      item.totalSizeFormatted = formatBytes(item.totalSizeBytes);
      item.status = item.totalFiles === 0 && item.totalSubfolders === 0 ? 'empty' : 'verified';
    } catch (err: any) {
      item.status = 'error';
      item.errorMessage = 'Failed during directory verification.';
    }

    return item;
  }

  /**
   * Pre-generates copy-ready formatted reports tailored for managers/heads.
   */
  generateReports(summary: FolderVerificationSummary, customNote = ''): FolderVerificationSummary['reports'] {
    const validItems = summary.items.filter((it) => it.exists && it.accessible);

    // 1. Executive WhatsApp / Manager Format (Most popular for sending to boss)
    const execLines: string[] = [];
    if (customNote.trim()) {
      execLines.push(customNote.trim());
      execLines.push('');
    }
    execLines.push('*FOLDER VERIFICATION REPORT*');
    execLines.push(`*Date:* ${summary.verifiedAt}`);
    execLines.push('──────────────────────────────────────────');
    execLines.push('*OVERALL TOTALS:*');
    execLines.push(`• *Folders Checked:* ${summary.totalFolders} (${summary.validFolders} verified)`);
    execLines.push(`• *Combined Size:* ${summary.totalSizeFormatted} (${formatNumber(summary.totalSizeBytes)} bytes)`);
    execLines.push(`• *Total Files:* ${formatNumber(summary.totalFiles)} files`);
    execLines.push(`• *Total Subfolders:* ${formatNumber(summary.totalSubfolders)} directories`);

    // Media type breakdown if media is present
    const types: string[] = [];
    if (summary.fileTypes.photos > 0) types.push(`${formatNumber(summary.fileTypes.photos)} Photos`);
    if (summary.fileTypes.videos > 0) types.push(`${formatNumber(summary.fileTypes.videos)} Videos`);
    if (summary.fileTypes.documents > 0) types.push(`${formatNumber(summary.fileTypes.documents)} Documents`);
    if (summary.fileTypes.audio > 0) types.push(`${formatNumber(summary.fileTypes.audio)} Audio`);
    if (summary.fileTypes.others > 0) types.push(`${formatNumber(summary.fileTypes.others)} Others`);
    if (types.length > 0) {
      execLines.push(`• *Content Mix:* ${types.join(' | ')}`);
    }

    execLines.push('──────────────────────────────────────────');
    execLines.push('*FOLDER-WISE DETAILS:*');

    summary.items.forEach((it, index) => {
      execLines.push('');
      if (!it.exists || !it.accessible) {
        execLines.push(`*${index + 1}. [FAILED] ${it.folderName}*`);
        execLines.push(`   • Path: ${it.path}`);
        execLines.push(`   • Status: Error (${it.errorMessage || 'Inaccessible'})`);
        return;
      }

      execLines.push(`*${index + 1}. ${it.folderName}*`);
      execLines.push(`   • *Path:* ${it.path}`);
      execLines.push(`   • *Size:* ${it.totalSizeFormatted} (${formatNumber(it.totalSizeBytes)} bytes)`);
      execLines.push(`   • *Files:* ${formatNumber(it.totalFiles)} files`);
      execLines.push(`   • *Subfolders:* ${formatNumber(it.totalSubfolders)} folders`);

      const itTypes: string[] = [];
      if (it.fileTypes.photos > 0) itTypes.push(`${formatNumber(it.fileTypes.photos)} Photos`);
      if (it.fileTypes.videos > 0) itTypes.push(`${formatNumber(it.fileTypes.videos)} Videos`);
      if (it.fileTypes.documents > 0) itTypes.push(`${formatNumber(it.fileTypes.documents)} Docs`);
      if (it.fileTypes.others > 0) itTypes.push(`${formatNumber(it.fileTypes.others)} Others`);
      if (itTypes.length > 0) {
        execLines.push(`   • *Types:* ${itTypes.join(', ')}`);
      }

      // If there are top subfolders, list up to 5
      if (it.subfolders.length > 0) {
        const topSubs = it.subfolders.slice(0, 5).map((s) => `${s.name}: ${s.sizeFormatted} (${s.fileCount} files)`);
        execLines.push(`   • *Top Subfolders:* ${topSubs.join(' | ')}`);
        if (it.subfolders.length > 5) {
          execLines.push(`     ...and ${it.subfolders.length - 5} more subfolders`);
        }
      }
    });

    execLines.push('──────────────────────────────────────────');
    execLines.push(`*Verification Completed via MediaFlow Studio*`);

    // 2. Compact Format (One-line per folder)
    const compactLines: string[] = [];
    compactLines.push(`FOLDER VERIFICATION (${summary.validFolders}/${summary.totalFolders} FOLDERS):`);
    summary.items.forEach((it, idx) => {
      if (it.exists && it.accessible) {
        compactLines.push(
          `${idx + 1}. ${it.folderName}: ${it.totalSizeFormatted} | ${formatNumber(it.totalFiles)} files | ${formatNumber(it.totalSubfolders)} subfolders (${it.path})`
        );
      } else {
        compactLines.push(`${idx + 1}. ${it.folderName}: ERROR - ${it.errorMessage || 'Inaccessible'} (${it.path})`);
      }
    });
    compactLines.push(
      `TOTAL: ${summary.totalSizeFormatted} | ${formatNumber(summary.totalFiles)} files | ${formatNumber(summary.totalSubfolders)} subfolders`
    );

    // 3. Detailed Breakdown Format
    const detailLines: string[] = [];
    detailLines.push('================================================================');
    detailLines.push('MEDIAFLOW STUDIO — COMPREHENSIVE FOLDER VERIFICATION AUDIT');
    detailLines.push(`Generated: ${summary.verifiedAt}`);
    detailLines.push('================================================================');
    detailLines.push(`TOTAL VERIFIED SIZE: ${summary.totalSizeFormatted} (${formatNumber(summary.totalSizeBytes)} bytes)`);
    detailLines.push(`TOTAL FILE COUNT:    ${formatNumber(summary.totalFiles)}`);
    detailLines.push(`TOTAL SUBFOLDERS:    ${formatNumber(summary.totalSubfolders)}`);
    detailLines.push(`TOTAL FOLDERS AUDITED: ${summary.validFolders} of ${summary.totalFolders}`);
    detailLines.push('----------------------------------------------------------------');

    summary.items.forEach((it, idx) => {
      detailLines.push(`[FOLDER ${idx + 1}] ${it.folderName}`);
      detailLines.push(`Path:        ${it.path}`);
      detailLines.push(`Status:      ${it.status.toUpperCase()}`);
      if (it.exists && it.accessible) {
        detailLines.push(`Size:        ${it.totalSizeFormatted} (${formatNumber(it.totalSizeBytes)} bytes)`);
        detailLines.push(`Files:       ${formatNumber(it.totalFiles)}`);
        detailLines.push(`Subfolders:  ${formatNumber(it.totalSubfolders)}`);
        detailLines.push(
          `Categories:  Photos=${it.fileTypes.photos}, Videos=${it.fileTypes.videos}, Docs=${it.fileTypes.documents}, Audio=${it.fileTypes.audio}, Archives=${it.fileTypes.archives}, Others=${it.fileTypes.others}`
        );
        if (it.topExtensions.length > 0) {
          detailLines.push(
            `Extensions:  ${it.topExtensions.map((e) => `${e.ext.toUpperCase()} (${e.count})`).join(', ')}`
          );
        }
        if (it.subfolders.length > 0) {
          detailLines.push('Subfolders Breakdown:');
          it.subfolders.forEach((sub) => {
            detailLines.push(`  - ${sub.name.padEnd(28)} | ${sub.sizeFormatted.padStart(10)} | ${String(sub.fileCount).padStart(6)} files`);
          });
        }
      } else {
        detailLines.push(`Error:       ${it.errorMessage}`);
      }
      detailLines.push('----------------------------------------------------------------');
    });

    // 4. Markdown Table Format
    const mdLines: string[] = [];
    mdLines.push(`### Folder Verification Report`);
    mdLines.push(`*Generated on ${summary.verifiedAt} via MediaFlow Studio*`);
    mdLines.push('');
    mdLines.push(`**Summary:** ${summary.validFolders} folders | **Total Size:** ${summary.totalSizeFormatted} | **Total Files:** ${formatNumber(summary.totalFiles)} | **Total Subfolders:** ${formatNumber(summary.totalSubfolders)}`);
    mdLines.push('');
    mdLines.push('| # | Folder Name | Path | Size | Files | Subfolders | Status |');
    mdLines.push('|---|-------------|------|------|-------|------------|--------|');
    summary.items.forEach((it, idx) => {
      const statusIcon = it.status === 'verified' ? '[Verified]' : it.status === 'empty' ? '[Empty]' : '[Error]';
      mdLines.push(
        `| ${idx + 1} | **${it.folderName}** | \`${it.path}\` | ${it.totalSizeFormatted} | ${formatNumber(it.totalFiles)} | ${formatNumber(it.totalSubfolders)} | ${statusIcon} |`
      );
    });

    return {
      executive: execLines.join('\n'),
      compact: compactLines.join('\n'),
      detailed: detailLines.join('\n'),
      markdown: mdLines.join('\n'),
    };
  }
}
