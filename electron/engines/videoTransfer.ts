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
  matchType?: 'exact' | 'normalized' | 'camera_id' | 'shot_token' | 'sequence' | 'manual';
  confidence?: number;
  parentCategoryFolder?: string;
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
  suggestedFolder?: { name: string; path: string; reason: string };
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

interface PhotoSubfolderCandidate {
  name: string;
  path: string;
  dateFolder: string;
  hasPhotos: boolean;
  photoCount: number;
  isLeaf: boolean;
  clean: string;
  camId: string | null;
  shotToken: string | null;
  seq: string | null;
  parsed: SequenceParseResult;
  companionPhotoThumb?: string;
  parentCategoryName?: string;
}

export class VideoTransferEngine {
  private isScanning = false;
  private isTransferring = false;
  private abortController: AbortController | null = null;

  static cleanKey(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  static extractCameraId(s: string): string | null {
    const m = s.match(/(\d{7,8})/);
    return m ? m[1] : null;
  }

  static extractShotToken(s: string): string | null {
    const m = s.match(/[-_](\d{1,2}[a-z]{1,3})[-_]/i);
    if (m) return m[1].toLowerCase();
    const m2 = s.match(/[-_](waaz|namaz|bethak|ziyarat|isteqbal|fmb|mkb)[-_]/i);
    if (m2) return m2[1].toLowerCase();
    return null;
  }

  static extractSeq(s: string): string | null {
    const clean = s.replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}(?:[\s_-]+_?\d{1,2}[A-Za-z]*)?[\s_-]*/, '');
    const m = clean.match(/^(\d+[a-zA-Z]?)(?:[\s_-]|$)/);
    if (m) {
      const seq = m[1];
      return /^\d+$/.test(seq) ? seq.padStart(2, '0').toLowerCase() : seq.toLowerCase();
    }
    return null;
  }

  static isDateFolderName(name: string): boolean {
    const trimmed = name.trim();
    if (/^(?:\d{4}[-_.]\d{2}[-_.]\d{2}|\d{2}[-_.]\d{2}[-_.]\d{4})(?:[\s_-]+_?\d{1,2}[A-Za-z]*)?$/i.test(trimmed)) {
      return true;
    }
    if (/^(?:day|date|event|session)[\s_\-]*\d+/i.test(trimmed)) {
      return true;
    }
    return false;
  }

  static parseSequenceName(rawName: string): SequenceParseResult {
    const ext = path.extname(rawName);
    const stem = ext ? path.basename(rawName, ext).trim() : rawName.trim();

    // 1. Strip trailing video/thumbnail suffixes (-its-v, _v, -v, _p, -p, _copy, (1))
    let clean = stem.replace(/[-_](?:its|v|p)+(?:[-_]v|[-_]p)?$/i, '').trim();
    clean = clean.replace(/\s*\(\d+\)$/, '').trim();
    clean = clean.replace(/[-_](?:copy\s*\d*)$/i, '').trim();

    // 2. Strip leading date and session code (e.g. 1448-04-03 _02E- or 2026-09-01-)
    clean = clean.replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}(?:[\s_-]+_?\d{1,2}[A-Za-z]*)?[\s_-]*/, '').trim();

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

    // 1. Discover Date Folders
    // Check if the directory itself is a single date folder
    const vidDirectEntries = await fs.promises.readdir(cleanVid, { withFileTypes: true });
    const photoDirectEntries = await fs.promises.readdir(cleanPhoto, { withFileTypes: true });

    const vidChildDateEntries = vidDirectEntries.filter(
      (e) => e.isDirectory() && VideoTransferEngine.isDateFolderName(e.name)
    );
    const photoChildDateEntries = photoDirectEntries.filter(
      (e) => e.isDirectory() && VideoTransferEngine.isDateFolderName(e.name)
    );

    const videoDates = new Set<string>();
    const photoDates = new Set<string>();

    if (vidChildDateEntries.length > 0) {
      for (const e of vidChildDateEntries) videoDates.add(e.name);
    } else if (VideoTransferEngine.isDateFolderName(path.basename(cleanVid))) {
      videoDates.add(path.basename(cleanVid));
    }

    if (photoChildDateEntries.length > 0) {
      for (const e of photoChildDateEntries) photoDates.add(e.name);
    } else if (VideoTransferEngine.isDateFolderName(path.basename(cleanPhoto))) {
      photoDates.add(path.basename(cleanPhoto));
    }

    // Handle intermediate wrappers like "Videos" / "Photos" if child dates not found
    if (videoDates.size === 0) {
      for (const e of vidDirectEntries.filter((d) => d.isDirectory())) {
        try {
          const sub = path.join(cleanVid, e.name);
          const subEnts = await fs.promises.readdir(sub, { withFileTypes: true });
          for (const se of subEnts) {
            if (se.isDirectory() && VideoTransferEngine.isDateFolderName(se.name)) {
              videoDates.add(se.name);
            }
          }
        } catch {}
      }
    }
    if (photoDates.size === 0) {
      for (const e of photoDirectEntries.filter((d) => d.isDirectory())) {
        try {
          const sub = path.join(cleanPhoto, e.name);
          const subEnts = await fs.promises.readdir(sub, { withFileTypes: true });
          for (const se of subEnts) {
            if (se.isDirectory() && VideoTransferEngine.isDateFolderName(se.name)) {
              photoDates.add(se.name);
            }
          }
        } catch {}
      }
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

    // 2. Discover Photo Subfolders per Date Folder
    const photoSubfoldersByDate: Record<string, PhotoSubfolderCandidate[]> = {};
    const emptyPhotoFolders: EmptyPhotoFolderItem[] = [];

    const collectPhotoSubfolders = async (dateDir: string, dateTag: string) => {
      const list: PhotoSubfolderCandidate[] = [];

      const walk = async (currentDir: string, depth: number, parentCategory?: string) => {
        if (depth > 6) return;
        let ents: fs.Dirent[] = [];
        try {
          ents = await fs.promises.readdir(currentDir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const ent of ents) {
          if (!ent.isDirectory()) continue;
          const nameLower = ent.name.toLowerCase();
          if (nameLower.includes('remaining') || nameLower === 'thumbs' || nameLower === 'thumbnails') continue;

          const subPath = path.join(currentDir, ent.name);
          let childEnts: fs.Dirent[] = [];
          try {
            childEnts = await fs.promises.readdir(subPath, { withFileTypes: true });
          } catch {}

          const childDirs = childEnts.filter(
            (c) => c.isDirectory() && !c.name.toLowerCase().includes('remaining')
          );
          const photoFiles = childEnts.filter(
            (c) =>
              c.isFile() &&
              (ALL_PHOTO_EXTS.has(path.extname(c.name).toLowerCase()) ||
                THUMB_EXTS.has(path.extname(c.name).toLowerCase()))
          );

          // Find companion _p thumbnail inside this subfolder or in its parent
          let companionPhotoThumb: string | undefined;
          const directPThumb = childEnts.find(
            (c) => c.isFile() && /_p\.(jpg|jpeg|png)$/i.test(c.name)
          );
          if (directPThumb) {
            companionPhotoThumb = path.join(subPath, directPThumb.name);
          } else {
            // Check parent folder for {ent.name}_P.jpg
            const parentThumbName = `${ent.name}_p.jpg`;
            const parentThumbAlt = `${ent.name}_P.jpg`;
            const parentCandidate1 = path.join(currentDir, parentThumbName);
            const parentCandidate2 = path.join(currentDir, parentThumbAlt);
            if (fs.existsSync(parentCandidate1)) companionPhotoThumb = parentCandidate1;
            else if (fs.existsSync(parentCandidate2)) companionPhotoThumb = parentCandidate2;
          }

          const hasPhotos = photoFiles.length > 0;
          const isLeaf = childDirs.length === 0;

          if (isLeaf && !hasPhotos && childEnts.length === 0) {
            emptyPhotoFolders.push({
              id: `empty-${ent.name}-${emptyPhotoFolders.length + 1}`,
              folderName: ent.name,
              folderPath: subPath,
              dateFolder: dateTag,
              subfolderCount: 0,
              photoCount: 0,
              totalFileCount: 0,
              reason: 'Empty folder with 0 photos and 0 subfolders',
            });
          }

          const cand: PhotoSubfolderCandidate = {
            name: ent.name,
            path: subPath,
            dateFolder: dateTag,
            hasPhotos,
            photoCount: photoFiles.length,
            isLeaf,
            clean: VideoTransferEngine.cleanKey(ent.name),
            camId: VideoTransferEngine.extractCameraId(ent.name),
            shotToken: VideoTransferEngine.extractShotToken(ent.name),
            seq: VideoTransferEngine.extractSeq(ent.name),
            parsed: VideoTransferEngine.parseSequenceName(ent.name),
            companionPhotoThumb,
            parentCategoryName: parentCategory || (depth === 1 ? ent.name : undefined),
          };

          list.push(cand);
          await walk(subPath, depth + 1, parentCategory || ent.name);
        }
      };

      await walk(dateDir, 1);
      photoSubfoldersByDate[dateTag] = list;
    };

    if (photoDates.size > 0) {
      for (const d of photoDates) {
        const dLower = d.toLowerCase();
        const actualName = photoDatesLower.get(dLower) || d;
        const targetDateDir = path.join(cleanPhoto, actualName);
        if (fs.existsSync(targetDateDir)) {
          await collectPhotoSubfolders(targetDateDir, d);
        }
      }
    } else {
      // Single root
      await collectPhotoSubfolders(cleanPhoto, path.basename(cleanPhoto));
    }

    // 3. Discover Video Files per Date Folder
    interface DiscoveredVideo {
      file: string;
      fullPath: string;
      size: number;
      dateFolder: string;
      clean: string;
      camId: string | null;
      shotToken: string | null;
      seq: string | null;
      parsed: SequenceParseResult;
      companionVideoThumb?: string;
    }

    const videosList: DiscoveredVideo[] = [];

    const collectVideos = async (dateDir: string, dateTag: string) => {
      const walk = async (currentDir: string, depth: number) => {
        if (depth > 5) return;
        let ents: fs.Dirent[] = [];
        try {
          ents = await fs.promises.readdir(currentDir, { withFileTypes: true });
        } catch {
          return;
        }

        // Pre-index thumbnails in this folder for instant companion lookup
        const thumbsInDir = ents.filter(
          (e) => e.isFile() && /_v\.(jpg|jpeg|png)$/i.test(e.name)
        );

        for (const ent of ents) {
          const fullPath = path.join(currentDir, ent.name);
          if (ent.isDirectory()) {
            await walk(fullPath, depth + 1);
          } else if (ent.isFile()) {
            const ext = path.extname(ent.name).toLowerCase();
            if (VIDEO_TRANSFER_EXTS.has(ext)) {
              let size = 0;
              try {
                const stat = await fs.promises.stat(fullPath);
                size = stat.size;
              } catch {}

              const stem = path.basename(ent.name, ext);
              const vClean = VideoTransferEngine.cleanKey(stem);
              const vCam = VideoTransferEngine.extractCameraId(stem);
              const vToken = VideoTransferEngine.extractShotToken(stem);
              const vSeq = VideoTransferEngine.extractSeq(stem);

              // Look for companion _V thumbnail
              let companionVideoThumb: string | undefined;
              const directVThumb = thumbsInDir.find(
                (t) => path.basename(t.name, path.extname(t.name)).toLowerCase() === `${stem.toLowerCase()}_v`
              );
              if (directVThumb) {
                companionVideoThumb = path.join(currentDir, directVThumb.name);
              } else if (vCam) {
                const camThumb = thumbsInDir.find((t) => t.name.includes(vCam));
                if (camThumb) companionVideoThumb = path.join(currentDir, camThumb.name);
              }

              videosList.push({
                file: ent.name,
                fullPath,
                size,
                dateFolder: dateTag,
                clean: vClean,
                camId: vCam,
                shotToken: vToken,
                seq: vSeq,
                parsed: VideoTransferEngine.parseSequenceName(ent.name),
                companionVideoThumb,
              });
            }
          }
        }
      };

      await walk(dateDir, 1);
    };

    if (videoDates.size > 0) {
      for (const d of videoDates) {
        const dLower = d.toLowerCase();
        const actualName = videoDatesLower.get(dLower) || d;
        const targetDateDir = path.join(cleanVid, actualName);
        if (fs.existsSync(targetDateDir)) {
          await collectVideos(targetDateDir, d);
        }
      }
    } else {
      await collectVideos(cleanVid, path.basename(cleanVid));
    }

    // 4. Multi-Pass Intelligent Pairing Algorithm
    const matched: VideoMatchedPair[] = [];
    const unmatched: VideoUnmatchedItem[] = [];
    const pairedPhotoPaths = new Set<string>();

    for (const vid of videosList) {
      // Find candidate photo subfolders within the same date
      let candidates = photoSubfoldersByDate[vid.dateFolder] || [];
      if (candidates.length === 0 && (videoDates.size <= 1 || photoDates.size <= 1)) {
        candidates = Object.values(photoSubfoldersByDate).flat();
      }

      // Sort candidate folders: leaf folders with photos first, then leaf folders, then parents
      const sortedCandidates = [...candidates].sort((a, b) => {
        if (a.hasPhotos !== b.hasPhotos) return a.hasPhotos ? -1 : 1;
        if (a.isLeaf !== b.isLeaf) return a.isLeaf ? -1 : 1;
        return 0;
      });

      const vStem = path.basename(vid.file, path.extname(vid.file));
      let match: PhotoSubfolderCandidate | undefined;
      let matchType: 'exact' | 'normalized' | 'camera_id' | 'shot_token' | 'sequence' = 'exact';
      let confidence = 100;

      // Pass 1: Exact Name Match
      match = sortedCandidates.find((pf) => pf.name.toLowerCase() === vStem.toLowerCase());
      if (match) {
        matchType = 'exact';
        confidence = 100;
      }

      // Pass 2: Normalized Key Match (ignoring punctuation, spaces, +)
      if (!match) {
        match = sortedCandidates.find((pf) => pf.clean === vid.clean);
        if (match) {
          matchType = 'normalized';
          confidence = 95;
        }
      }

      // Pass 3: Camera Clip ID Match (unique 7-8 digit camera clip identifier)
      if (!match && vid.camId) {
        match = sortedCandidates.find((pf) => pf.camId && pf.camId === vid.camId);
        if (match) {
          matchType = 'camera_id';
          confidence = 90;
        }
      }

      // Pass 4: Shot Token Match (e.g. '01q', '04m', 'waaz', 'namaz')
      if (!match && vid.shotToken) {
        // First try matching both shotToken and sequence
        match = sortedCandidates.find(
          (pf) => pf.shotToken === vid.shotToken && (!vid.seq || !pf.seq || vid.seq === pf.seq)
        );
        if (!match) {
          match = sortedCandidates.find((pf) => pf.shotToken === vid.shotToken);
        }
        if (match) {
          matchType = 'shot_token';
          confidence = 85;
        }
      }

      // Pass 5: Sequence Match (e.g. sequence '01' === '01')
      if (!match && vid.seq) {
        match = sortedCandidates.find(
          (pf) => pf.seq === vid.seq && (!vid.shotToken || !pf.shotToken || vid.shotToken === pf.shotToken)
        );
        if (match) {
          matchType = 'sequence';
          confidence = 75;
        }
      }

      if (match) {
        pairedPhotoPaths.add(match.path);

        // Thumbnail resolution
        const hasVThumb = !!vid.companionVideoThumb && fs.existsSync(vid.companionVideoThumb);
        let pThumbPath = match.companionPhotoThumb;
        if (!pThumbPath) {
          // Check parent folder of match
          const parentDir = path.dirname(match.path);
          const pCandidate = path.join(parentDir, `${match.name}_P.jpg`);
          if (fs.existsSync(pCandidate)) pThumbPath = pCandidate;
        }

        matched.push({
          videoFile: vid.file,
          videoPath: vid.fullPath,
          videoSize: vid.size,
          photoFolder: match.name,
          photoFolderPath: match.path,
          dateFolder: vid.dateFolder,
          shotCode: vid.shotToken || vid.seq || vid.parsed.token,
          hasVideoThumb: hasVThumb,
          videoThumbPath: vid.companionVideoThumb,
          hasPhotoThumb: !!pThumbPath && fs.existsSync(pThumbPath),
          photoThumbPath: pThumbPath,
          matchType,
          confidence,
          parentCategoryFolder: match.parentCategoryName,
        });
      } else {
        const expectedPhotoDir =
          vid.dateFolder && photoDatesLower.has(vid.dateFolder.toLowerCase())
            ? path.join(cleanPhoto, photoDatesLower.get(vid.dateFolder.toLowerCase())!)
            : cleanPhoto;

        // Smart Suggested Match
        let suggestedFolder: { name: string; path: string; reason: string } | undefined;
        if (vid.seq) {
          const seqMatch = sortedCandidates.find((pf) => pf.seq === vid.seq);
          if (seqMatch) {
            suggestedFolder = {
              name: seqMatch.name,
              path: seqMatch.path,
              reason: `Matching sequence number (${vid.seq})`,
            };
          }
        } else if (vid.shotToken) {
          const tokenMatch = sortedCandidates.find((pf) => pf.shotToken === vid.shotToken);
          if (tokenMatch) {
            suggestedFolder = {
              name: tokenMatch.name,
              path: tokenMatch.path,
              reason: `Matching event code (${vid.shotToken})`,
            };
          }
        }

        const reason =
          !photoDatesLower.has(vid.dateFolder.toLowerCase()) && videoDates.size > 0
            ? `Date folder "${vid.dateFolder}" does not exist in Photo directory`
            : `No photo subfolder matching sequence "${vid.parsed.sequence}" or clip identifier found in "${vid.dateFolder || 'photos'}"`;

        unmatched.push({
          videoFile: vid.file,
          videoPath: vid.fullPath,
          videoDir: path.dirname(vid.fullPath),
          dateFolder: vid.dateFolder,
          shotCode: vid.parsed.token,
          cleanName: vid.parsed.cleanName,
          targetExpectedDir: expectedPhotoDir,
          reason,
          suggestedFolder,
        });

        issues.push({
          type: 'warning',
          category: 'clip',
          message: `Video clip "${vid.file}": ${reason}`,
          folderPath: path.dirname(vid.fullPath),
          dateFolder: vid.dateFolder,
        });
      }
    }

    // 5. Unmatched Photo Folders (Filter out parents of matched subfolders and ignored event folders)
    const unmatchedPhotoFolders: PhotoFolderUnmatchedItem[] = [];

    for (const [dateTag, candidates] of Object.entries(photoSubfoldersByDate)) {
      const correspondingVideoDir =
        dateTag && videoDatesLower.has(dateTag.toLowerCase())
          ? path.join(cleanVid, videoDatesLower.get(dateTag.toLowerCase())!)
          : cleanVid;

      for (const pf of candidates) {
        // Skip if already paired
        if (pairedPhotoPaths.has(pf.path)) continue;

        // Skip ignored candid event folders (MQ, MF, H)
        if (VideoTransferEngine.isIgnoredEventFolder(pf.name)) continue;

        // Skip parent folder if any of its children were paired
        const isParentOfPaired = Array.from(pairedPhotoPaths).some((pp) =>
          pp.startsWith(pf.path + path.sep)
        );
        if (isParentOfPaired) continue;

        // Skip child folder if its parent was paired
        const isChildOfPaired = Array.from(pairedPhotoPaths).some((pp) =>
          pf.path.startsWith(pp + path.sep)
        );
        if (isChildOfPaired) continue;

        // Skip folders that don't have photos and have no sequence formatting
        if (!pf.hasPhotos && !/^\d+[a-zA-Z]*[\s_\-]/.test(pf.name.trim())) continue;

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

    // Date mismatch flag
    const hasDateMismatch =
      videoDates.size > 0 &&
      photoDates.size > 0 &&
      !Array.from(videoDates).some((vd) =>
        Array.from(photoDates).some((pd) => pd.toLowerCase() === vd.toLowerCase())
      );

    // Clean photoFoldersByDate for UI dropdowns
    const cleanPfd: Record<string, { name: string; path: string }[]> = {};
    for (const [k, v] of Object.entries(photoSubfoldersByDate)) {
      cleanPfd[k] = v.map((item) => ({ name: item.name, path: item.path }));
    }

    this.isScanning = false;

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

        const isSameVolume =
          path.parse(pair.videoPath).root.toLowerCase() === path.parse(targetFile).root.toLowerCase();

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

        // Route companion thumbnails to parent directory of photo folder or into target folder
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
            await fs.promises.rename(rec.target, rec.source);
            restored++;
          }
        } else if (rec.mode === 'copy') {
          if (fs.existsSync(rec.target)) {
            await fs.promises.unlink(rec.target);
            unlinked++;
          }
        }

        // Clean companion thumbnails copied during transfer
        for (const tRec of rec.thumbRecords) {
          if (fs.existsSync(tRec.target) && tRec.target !== tRec.source) {
            try {
              await fs.promises.unlink(tRec.target);
            } catch {}
          }
        }
      } catch {}
    }

    return { restored, unlinked };
  }
}
