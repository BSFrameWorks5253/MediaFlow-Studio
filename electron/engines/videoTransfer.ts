import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export const VIDEO_TRANSFER_EXTS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.mts', '.m2ts', '.mxf', '.wmv',
  '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.mod', '.tod'
]);

export const THUMB_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.thm', '.bmp', '.tiff', '.tif', '.heic'
]);

export const ALL_PHOTO_EXTS = new Set([
  '.jpg', '.jpeg', '.jpe', '.png', '.heic', '.heif', '.hif', '.webp',
  '.tif', '.tiff', '.bmp', '.dib', '.raw', '.arw', '.cr2', '.cr3',
  '.nef', '.nrw', '.dng', '.orf', '.rw2', '.pef', '.raf', '.srw'
]);

export interface SequenceParseResult {
  raw: string;
  cleanName: string;
  sequence: string;
  namePart: string;
  prefix: string;
  code: string;
  token: string;
}

export interface VideoMatchedPair {
  videoFile: string;
  videoPath: string;
  videoSize: number;
  photoFolder: string;
  photoFolderPath: string;
  dateFolder: string;
  shotCode: string;
  hasVideoThumb: boolean;
  videoThumbPath?: string;
  hasPhotoThumb: boolean;
  photoThumbPath?: string;
  manualOverride?: boolean;
}

export interface VideoUnmatchedItem {
  videoFile: string;
  videoPath: string;
  videoDir: string;
  dateFolder: string;
  shotCode: string;
  cleanName: string;
  targetExpectedDir?: string;
  reason: string;
}

export interface DateFolderStatus {
  date: string;
  inVideo: boolean;
  videoPath: string;
  inPhoto: boolean;
  photoPath: string;
  status: 'ok' | 'missing_in_photo' | 'missing_in_video';
}

export interface PhotoFolderUnmatchedItem {
  folderName: string;
  folderPath: string;
  dateFolder: string;
  shotCode: string;
  reason: string;
  videoFolderPath?: string;
}

export interface EmptyPhotoFolderItem {
  id: string;
  folderName: string;
  folderPath: string;
  dateFolder: string;
  subfolderCount: number;
  photoCount: number;
  totalFileCount: number;
  reason: string;
}

export interface ScanIssue {
  type: 'error' | 'warning' | 'info';
  category: 'path' | 'date' | 'clip' | 'folder';
  message: string;
  dateFolder?: string;
  folderPath?: string;
  missingOn?: 'video' | 'photo';
}

export interface VideoScanResult {
  matched: VideoMatchedPair[];
  unmatched: VideoUnmatchedItem[];
  unmatchedPhotoFolders: PhotoFolderUnmatchedItem[];
  emptyPhotoFolders: EmptyPhotoFolderItem[];
  dateMismatch: boolean;
  videoDates: string[];
  photoDates: string[];
  dateFolderStatuses: DateFolderStatus[];
  photoFoldersByDate: Record<string, { name: string; path: string }[]>;
  issues: ScanIssue[];
}

export interface UndoRecord {
  mode: 'copy' | 'move';
  source: string;
  target: string;
  thumbRecords: { source: string; target: string }[];
}

export class VideoTransferEngine {
  private isScanning = false;
  private isTransferring = false;
  private abortController: AbortController | null = null;

  static parseSequenceName(rawName: string): SequenceParseResult {
    const ext = path.extname(rawName);
    const stem = ext ? path.basename(rawName, ext).trim() : rawName.trim();

    // 1. Strip trailing video/thumbnail suffixes (-its-v, _v, -v, _p, -p)
    let clean = stem.replace(/[-_](?:its|v|p)+(?:[-_]v|[-_]p)?$/i, '').trim();
    // 2. Strip leading date format (e.g. 2026-09-01_ or 1448-03-12_)
    clean = clean.replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}[\s_-]*/, '').trim();

    // 3. Camera clip prefix like '001 01-Q', 'C0001_01-Q', 'CAM1_01-Q'
    const camMatch = clean.match(/^(?:[a-zA-Z]{0,4}\d{2,5})[\s_\-]+(\d+[a-zA-Z]?[\s_\-]+[a-zA-Z0-9]+(?:[\s_\-].*)?)$/);
    if (camMatch) {
      clean = camMatch[1].trim();
    }

    // 4. Extract sequence number and code
    const seqMatch = clean.match(/^(\d+[a-zA-Z]?)(?:[\s_\-]+([a-zA-Z0-9]+))?/);
    const sequence = seqMatch ? seqMatch[1] : '';
    const codePart = seqMatch && seqMatch[2] ? seqMatch[2] : '';

    const normSeq = /^\d+$/.test(sequence) ? sequence.padStart(2, '0') : sequence.toLowerCase();
    const normCode = codePart.toLowerCase();
    const token = normSeq && normCode ? `${normSeq}-${normCode}` : (normSeq || clean.toLowerCase());

    return {
      raw: rawName,
      cleanName: clean,
      sequence: normSeq,
      namePart: codePart || clean,
      prefix: codePart.toUpperCase(),
      code: normCode,
      token,
    };
  }

  static isMatchPair(vidParsed: SequenceParseResult, pfParsed: SequenceParseResult): boolean {
    const vSeq = vidParsed.sequence;
    const pSeq = pfParsed.sequence;
    const vCode = vidParsed.code;
    const pCode = pfParsed.code;
    const vTok = vidParsed.token;
    const pTok = pfParsed.token;
    const vClean = vidParsed.cleanName.toLowerCase();
    const pClean = pfParsed.cleanName.toLowerCase();

    // CRITICAL INVARIANT: Sequence conflict -> REJECT
    if (vSeq && pSeq && vSeq !== pSeq) {
      return false;
    }

    // Rule 1: Exact clean name match
    if (vClean && pClean && vClean === pClean) return true;

    // Rule 2: Token match (e.g. '01-q' === '01-q')
    if (vTok && pTok && vTok === pTok) return true;

    // Rule 3: Matching sequence and code
    if (vSeq && pSeq && vSeq === pSeq) {
      if (vCode && pCode && vCode === pCode) return true;
      if (!vCode || !pCode) return true;
    }

    // Rule 4: Normalized key collapse
    const vNorm = vClean.replace(/[\s_\-]+/g, ' ').trim();
    const pNorm = pClean.replace(/[\s_\-]+/g, ' ').trim();
    if (vNorm && pNorm && vNorm === pNorm) return true;

    return false;
  }

  static isIgnoredEventFolder(name: string): boolean {
    return /(?:^|[-_\s])\d*(?:MQ|MF|H)(?:[-_\s]|$)/i.test(name);
  }

  async scanDirectories(videoDir: string, photoDir: string): Promise<VideoScanResult> {
    const cleanVid = path.resolve(videoDir.replace(/^file:\/\/\/?/, ''));
    const cleanPhoto = path.resolve(photoDir.replace(/^file:\/\/\/?/, ''));

    const vidExists = fs.existsSync(cleanVid);
    const photoExists = fs.existsSync(cleanPhoto);

    if (!vidExists && !photoExists) {
      throw new Error('Both selected video and photo directories could not be found. Please verify the folder paths.');
    }
    if (!vidExists) {
      throw new Error('The selected video folder could not be found. Please verify the folder path.');
    }
    if (!photoExists) {
      throw new Error('The selected photo folder could not be found. Please verify the folder path.');
    }

    this.isScanning = true;

    // 1. Identify Date Folders in Video & Photo
    const videoDates = new Set<string>();
    const photoDates = new Set<string>();

    const isDateFolder = (n: string) =>
      /\d{4}[-_.]\d{2}[-_.]\d{2}/.test(n) || /\d{2}[-_.]\d{2}[-_.]\d{4}/.test(n) || /^(?:day|date|event|session)[\s_\-]*\d+/i.test(n);

    for (const ent of await fs.promises.readdir(cleanVid, { withFileTypes: true })) {
      if (ent.isDirectory() && isDateFolder(ent.name)) videoDates.add(ent.name);
    }
    for (const ent of await fs.promises.readdir(cleanPhoto, { withFileTypes: true })) {
      if (ent.isDirectory() && isDateFolder(ent.name)) photoDates.add(ent.name);
    }

    // Date folder status comparison
    const issues: ScanIssue[] = [];
    const dateFolderStatuses: DateFolderStatus[] = [];
    const allDates = new Set<string>([...videoDates, ...photoDates]);

    const videoDatesLower = new Map<string, string>();
    for (const vd of videoDates) videoDatesLower.set(vd.toLowerCase(), vd);

    const photoDatesLower = new Map<string, string>();
    for (const pd of photoDates) photoDatesLower.set(pd.toLowerCase(), pd);

    for (const d of allDates) {
      const inVid = videoDatesLower.has(d.toLowerCase());
      const inPhoto = photoDatesLower.has(d.toLowerCase());
      const matchedVidName = videoDatesLower.get(d.toLowerCase()) || d;
      const matchedPhotoName = photoDatesLower.get(d.toLowerCase()) || d;

      const vidPath = path.join(cleanVid, matchedVidName);
      const photoPath = path.join(cleanPhoto, matchedPhotoName);

      let status: 'ok' | 'missing_in_photo' | 'missing_in_video' = 'ok';
      if (inVid && !inPhoto) {
        status = 'missing_in_photo';
        issues.push({
          type: 'warning',
          category: 'date',
          message: `Date folder "${matchedVidName}" exists in Video folder, but is MISSING in Photo folder.`,
          dateFolder: matchedVidName,
          folderPath: vidPath,
          missingOn: 'photo',
        });
      } else if (!inVid && inPhoto) {
        status = 'missing_in_video';
        issues.push({
          type: 'warning',
          category: 'date',
          message: `Date folder "${matchedPhotoName}" exists in Photo folder, but is MISSING in Video folder.`,
          dateFolder: matchedPhotoName,
          folderPath: photoPath,
          missingOn: 'video',
        });
      }

      dateFolderStatuses.push({
        date: d,
        inVideo: inVid,
        videoPath: vidPath,
        inPhoto: inPhoto,
        photoPath: photoPath,
        status,
      });
    }

    const photoFoldersByDate: Record<string, { name: string; path: string; parsed: SequenceParseResult }[]> = {};
    const emptyPhotoFolders: EmptyPhotoFolderItem[] = [];

    // Scan photo subfolders
    const scanPhotoTree = async (currentDir: string, dateTag: string) => {
      const ents = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const ent of ents) {
        if (ent.isDirectory()) {
          const sub = path.join(currentDir, ent.name);
          if (isDateFolder(ent.name)) {
            await scanPhotoTree(sub, ent.name);
          } else {
            let subEnts: fs.Dirent[] = [];
            try {
              subEnts = await fs.promises.readdir(sub, { withFileTypes: true });
            } catch {}

            const childDirs = subEnts.filter((e) => e.isDirectory());
            const photoFiles = subEnts.filter((e) => {
              if (!e.isFile()) return false;
              const ext = path.extname(e.name).toLowerCase();
              return ALL_PHOTO_EXTS.has(ext) || THUMB_EXTS.has(ext);
            });

            // "if a folder has folder in it means that folder is not empty it in it"
            if (childDirs.length > 0) {
              if (!photoFoldersByDate[dateTag]) photoFoldersByDate[dateTag] = [];
              photoFoldersByDate[dateTag].push({
                name: ent.name,
                path: sub,
                parsed: VideoTransferEngine.parseSequenceName(ent.name),
              });
              await scanPhotoTree(sub, dateTag);
            } else {
              // Leaf folder with 0 subfolders: check if it has photos
              if (photoFiles.length === 0) {
                emptyPhotoFolders.push({
                  id: `empty-${ent.name}-${emptyPhotoFolders.length + 1}`,
                  folderName: ent.name,
                  folderPath: sub,
                  dateFolder: dateTag || path.basename(cleanPhoto),
                  subfolderCount: 0,
                  photoCount: 0,
                  totalFileCount: subEnts.filter((e) => e.isFile()).length,
                  reason: 'There are no photos in this folder',
                });
              } else {
                if (!photoFoldersByDate[dateTag]) photoFoldersByDate[dateTag] = [];
                photoFoldersByDate[dateTag].push({
                  name: ent.name,
                  path: sub,
                  parsed: VideoTransferEngine.parseSequenceName(ent.name),
                });
              }
            }
          }
        }
      }
    };

    const initialPhotoDate = photoDates.size > 0 ? '' : path.basename(cleanPhoto);
    await scanPhotoTree(cleanPhoto, initialPhotoDate);

    // Scan videos
    const videosList: { file: string; fullPath: string; size: number; dateFolder: string; parsed: SequenceParseResult }[] = [];
    const scanVideoTree = async (currentDir: string, dateTag: string) => {
      const ents = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const ent of ents) {
        const full = path.join(currentDir, ent.name);
        if (ent.isDirectory()) {
          const dName = isDateFolder(ent.name) ? ent.name : dateTag;
          await scanVideoTree(full, dName);
        } else if (ent.isFile()) {
          const ext = path.extname(ent.name).toLowerCase();
          if (VIDEO_TRANSFER_EXTS.has(ext)) {
            const stat = await fs.promises.stat(full);
            videosList.push({
              file: ent.name,
              fullPath: full,
              size: stat.size,
              dateFolder: dateTag || path.basename(cleanVid),
              parsed: VideoTransferEngine.parseSequenceName(ent.name),
            });
          }
        }
      }
    };

    await scanVideoTree(cleanVid, videoDates.size > 0 ? '' : path.basename(cleanVid));

    // Matching Algorithm
    const matched: VideoMatchedPair[] = [];
    const unmatched: VideoUnmatchedItem[] = [];

    // Pre-index thumbnails in video folder
    const videoThumbs: { file: string; path: string; parsed: SequenceParseResult }[] = [];
    const collectThumbs = async (dir: string) => {
      const ents = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const e of ents) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await collectThumbs(full);
        else if (e.isFile() && THUMB_EXTS.has(path.extname(e.name).toLowerCase())) {
          videoThumbs.push({ file: e.name, path: full, parsed: VideoTransferEngine.parseSequenceName(e.name) });
        }
      }
    };
    await collectThumbs(cleanVid);

    for (const vid of videosList) {
      // Find eligible photo folders (either same date or all if no dates)
      let eligiblePhotoFolders = photoFoldersByDate[vid.dateFolder] || [];
      if (eligiblePhotoFolders.length === 0) {
        // Flatten all if single session
        eligiblePhotoFolders = Object.values(photoFoldersByDate).flat();
      }

      let pairedFolder: { name: string; path: string } | null = null;

      for (const pf of eligiblePhotoFolders) {
        if (VideoTransferEngine.isMatchPair(vid.parsed, pf.parsed)) {
          pairedFolder = pf;
          break;
        }
      }

      if (pairedFolder) {
        // Look for companion _V.jpg and _P.jpg thumbnails
        let vThumbPath: string | undefined;
        let pThumbPath: string | undefined;

        for (const vt of videoThumbs) {
          const baseStem = path.basename(vid.file, path.extname(vid.file)).toLowerCase();
          const tStem = path.basename(vt.file, path.extname(vt.file)).toLowerCase();
          if (tStem.endsWith('_v') && (vt.parsed.token === vid.parsed.token || tStem.startsWith(baseStem))) {
            vThumbPath = vt.path;
            break;
          }
        }

        // Check destination folder for companion _P thumb
        try {
          const destEnts = await fs.promises.readdir(pairedFolder.path);
          for (const de of destEnts) {
            const ext = path.extname(de).toLowerCase();
            const stem = path.basename(de, ext).toLowerCase();
            if (THUMB_EXTS.has(ext) && stem.endsWith('_p')) {
              pThumbPath = path.join(pairedFolder.path, de);
              break;
            }
          }
        } catch {}

        matched.push({
          videoFile: vid.file,
          videoPath: vid.fullPath,
          videoSize: vid.size,
          photoFolder: pairedFolder.name,
          photoFolderPath: pairedFolder.path,
          dateFolder: vid.dateFolder,
          shotCode: vid.parsed.token,
          hasVideoThumb: !!vThumbPath,
          videoThumbPath: vThumbPath,
          hasPhotoThumb: !!pThumbPath,
          photoThumbPath: pThumbPath,
        });
      } else {
        const expectedPhotoDir = vid.dateFolder && photoDatesLower.has(vid.dateFolder.toLowerCase())
          ? path.join(cleanPhoto, photoDatesLower.get(vid.dateFolder.toLowerCase())!)
          : cleanPhoto;

        const reason = !photoDatesLower.has(vid.dateFolder.toLowerCase()) && videoDates.size > 0
          ? `Date folder "${vid.dateFolder}" does not exist in Photo directory`
          : `No photo subfolder matching sequence "${vid.parsed.sequence}" or token "${vid.parsed.token}" found in "${vid.dateFolder || 'photos'}"`;

        unmatched.push({
          videoFile: vid.file,
          videoPath: vid.fullPath,
          videoDir: path.dirname(vid.fullPath),
          dateFolder: vid.dateFolder,
          shotCode: vid.parsed.token,
          cleanName: vid.parsed.cleanName,
          targetExpectedDir: expectedPhotoDir,
          reason,
        });

        issues.push({
          type: 'warning',
          category: 'clip',
          message: `Video clip "${vid.file}" (${vid.parsed.token}): ${reason}`,
          folderPath: path.dirname(vid.fullPath),
          dateFolder: vid.dateFolder,
        });
      }
    }

    // Unmatched photo folders check
    const matchedPhotoFolderPaths = new Set(matched.map((m) => m.photoFolderPath));
    const unmatchedPhotoFolders: PhotoFolderUnmatchedItem[] = [];

    for (const [dateTag, pFolders] of Object.entries(photoFoldersByDate)) {
      const correspondingVideoDir = dateTag && videoDatesLower.has(dateTag.toLowerCase())
        ? path.join(cleanVid, videoDatesLower.get(dateTag.toLowerCase())!)
        : cleanVid;

      for (const pf of pFolders) {
        if (!matchedPhotoFolderPaths.has(pf.path)) {
          unmatchedPhotoFolders.push({
            folderName: pf.name,
            folderPath: pf.path,
            dateFolder: dateTag || '(Root)',
            shotCode: pf.parsed.token,
            reason: `No video master clip matched with sequence "${pf.parsed.sequence}" or token "${pf.parsed.token}"`,
            videoFolderPath: correspondingVideoDir,
          });
        }
      }
    }

    // Also check if any date folder itself is empty of subfolders and photos
    for (const dName of photoDates) {
      const dPath = path.join(cleanPhoto, dName);
      try {
        const dEnts = await fs.promises.readdir(dPath, { withFileTypes: true });
        const dDirs = dEnts.filter((e) => e.isDirectory());
        const dPhotos = dEnts.filter(
          (e) =>
            e.isFile() &&
            (ALL_PHOTO_EXTS.has(path.extname(e.name).toLowerCase()) ||
              THUMB_EXTS.has(path.extname(e.name).toLowerCase()))
        );
        if (dDirs.length === 0 && dPhotos.length === 0) {
          emptyPhotoFolders.push({
            id: `empty-date-${dName}`,
            folderName: dName,
            folderPath: dPath,
            dateFolder: dName,
            subfolderCount: 0,
            photoCount: 0,
            totalFileCount: dEnts.filter((e) => e.isFile()).length,
            reason: 'Date folder contains no subfolders and no photos',
          });
        }
      } catch {}
    }

    if (emptyPhotoFolders.length > 0) {
      issues.push({
        type: 'warning',
        category: 'folder',
        message: `Found ${emptyPhotoFolders.length} empty folder(s) containing no photos in the photo directory.`,
      });
    }

    this.isScanning = false;

    // Convert photoFoldersByDate to clean output
    const cleanPfd: Record<string, { name: string; path: string }[]> = {};
    for (const [k, v] of Object.entries(photoFoldersByDate)) {
      cleanPfd[k] = v.map((item) => ({ name: item.name, path: item.path }));
    }

    const hasDateMismatch = videoDates.size > 0 && photoDates.size > 0 &&
      !Array.from(videoDates).some((vd) => Array.from(photoDates).some((pd) => pd.toLowerCase() === vd.toLowerCase()));

    return {
      matched,
      unmatched,
      unmatchedPhotoFolders,
      emptyPhotoFolders,
      dateMismatch: hasDateMismatch,
      videoDates: Array.from(videoDates),
      photoDates: Array.from(photoDates),
      dateFolderStatuses,
      photoFoldersByDate: cleanPfd,
      issues,
    };
  }

  async executeTransfer(
    pairs: VideoMatchedPair[],
    mode: 'copy' | 'move' = 'copy',
    collisionPolicy: 'skip' | 'keepBoth' = 'keepBoth',
    onProgress?: (curr: number, total: number, file: string, speedStr: string) => void
  ): Promise<{ transferred: number; errors: number; manifestPath: string }> {
    this.isTransferring = true;
    this.abortController = new AbortController();

    const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB buffer
    const undoRecords: UndoRecord[] = [];
    let transferred = 0;
    let errors = 0;

    for (let i = 0; i < pairs.length; i++) {
      if (this.abortController.signal.aborted) break;

      const pair = pairs[i];
      let targetName = pair.videoFile;
      let targetFile = path.join(pair.photoFolderPath, targetName);

      if (fs.existsSync(targetFile)) {
        if (collisionPolicy === 'skip') {
          continue;
        } else {
          // keepBoth: append _1, _2
          const ext = path.extname(targetName);
          const stem = path.basename(targetName, ext);
          let counter = 1;
          while (fs.existsSync(path.join(pair.photoFolderPath, `${stem}_${counter}${ext}`))) {
            counter++;
          }
          targetName = `${stem}_${counter}${ext}`;
          targetFile = path.join(pair.photoFolderPath, targetName);
        }
      }

      try {
        await fs.promises.mkdir(pair.photoFolderPath, { recursive: true });

        const isSameVolume = path.parse(pair.videoPath).root.toLowerCase() === path.parse(targetFile).root.toLowerCase();

        if (mode === 'move' && isSameVolume) {
          await fs.promises.rename(pair.videoPath, targetFile);
        } else {
          const rStream = fs.createReadStream(pair.videoPath, { highWaterMark: CHUNK_SIZE });
          const wStream = fs.createWriteStream(targetFile, { highWaterMark: CHUNK_SIZE });
          await pipeline(rStream, wStream);

          const stat = await fs.promises.stat(pair.videoPath);
          await fs.promises.utimes(targetFile, stat.atime, stat.mtime);

          if (mode === 'move') {
            await fs.promises.unlink(pair.videoPath);
          }
        }

        const thumbRecords: { source: string; target: string }[] = [];

        // Route companion thumbnails to parent directory of photo folder
        const parentDest = path.dirname(pair.photoFolderPath);
        if (pair.videoThumbPath && fs.existsSync(pair.videoThumbPath)) {
          const vThumbTarget = path.join(parentDest, path.basename(pair.videoThumbPath));
          await fs.promises.copyFile(pair.videoThumbPath, vThumbTarget);
          thumbRecords.push({ source: pair.videoThumbPath, target: vThumbTarget });
        }
        if (pair.photoThumbPath && fs.existsSync(pair.photoThumbPath)) {
          const pThumbTarget = path.join(parentDest, path.basename(pair.photoThumbPath));
          if (pThumbTarget !== pair.photoThumbPath) {
            await fs.promises.copyFile(pair.photoThumbPath, pThumbTarget);
            thumbRecords.push({ source: pair.photoThumbPath, target: pThumbTarget });
          }
        }

        undoRecords.push({
          mode,
          source: pair.videoPath,
          target: targetFile,
          thumbRecords,
        });

        transferred++;

        if (onProgress) {
          onProgress(i + 1, pairs.length, pair.videoFile, 'Streaming');
        }
      } catch (err) {
        errors++;
      }
    }

    // Save Undo Manifest in Document/
    let manifestPath = '';
    if (pairs.length > 0) {
      const docDir = path.join(path.dirname(pairs[0].photoFolderPath), 'Document');
      await fs.promises.mkdir(docDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      manifestPath = path.join(docDir, `Video_Transfer_Undo_Manifest_${timestamp}.json`);
      await fs.promises.writeFile(manifestPath, JSON.stringify(undoRecords, null, 2), 'utf-8');
    }

    this.isTransferring = false;
    return { transferred, errors, manifestPath };
  }

  async undoTransfer(manifestPath: string): Promise<{ restored: number; unlinked: number }> {
    if (!fs.existsSync(manifestPath)) throw new Error('Transfer session manifest could not be found.');
    const records: UndoRecord[] = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));

    let restored = 0;
    let unlinked = 0;

    for (const rec of records.reverse()) {
      try {
        if (rec.mode === 'move') {
          if (fs.existsSync(rec.target)) {
            await fs.promises.mkdir(path.dirname(rec.source), { recursive: true });
            await fs.promises.rename(rec.target, rec.source);
            restored++;
          }
        } else if (rec.mode === 'copy') {
          if (fs.existsSync(rec.target)) {
            await fs.promises.unlink(rec.target);
            unlinked++;
          }
        }

        for (const tr of rec.thumbRecords) {
          if (fs.existsSync(tr.target)) {
            await fs.promises.unlink(tr.target);
          }
        }
      } catch {}
    }

    return { restored, unlinked };
  }
}
