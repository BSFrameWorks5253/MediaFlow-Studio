import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface EventMappingItem {
  eventName: string;
  abbreviation: string;
}

export interface FolderEventMatch {
  folderPath: string;
  folderName: string;
  dateSlot: string;
  seq: string;
  rawEventToken: string;
  stickerNumber: string;
  abbreviation: string;
  matchedEventName: string;
  its: string;
  matchedImages: {
    fileName: string;
    filePath: string;
    alreadyExists: boolean;
  }[];
}

export interface EventDistributorScanResult {
  excelPath?: string;
  imagesDirPath: string;
  targetWorkingDir: string;
  mappingsCount: number;
  availableImages: {
    fileName: string;
    filePath: string;
    matchedEventNames: string[];
    matchedAbbreviations: string[];
  }[];
  foldersMatched: FolderEventMatch[];
  unmatchedFolders: string[];
  totalPlannedCopies: number;
}

export interface EventDistributorSummary {
  success: boolean;
  totalFoldersProcessed: number;
  totalImagesCopied: number;
  skippedExisting: number;
  errors: string[];
}

export const BUILTIN_EVENT_MAPPINGS: EventMappingItem[] = [
  { eventName: 'Aqiqa', abbreviation: 'AQ' },
  { eventName: 'Bethak Majlis', abbreviation: 'BM' },
  { eventName: 'Bethak Qadam', abbreviation: 'BQ' },
  { eventName: 'Bethak Ziyafat', abbreviation: 'BZ' },
  { eventName: 'FMB', abbreviation: 'FMB' },
  { eventName: 'Haddiyat', abbreviation: 'H' },
  { eventName: 'Idaraat', abbreviation: 'ID' },
  { eventName: 'Iftettah', abbreviation: 'IF' },
  { eventName: 'Iftettah Sharaf', abbreviation: 'IFS' },
  { eventName: 'Isteqbal', abbreviation: 'IST' },
  { eventName: 'Kg Sharaf', abbreviation: 'KGS' },
  { eventName: 'Majlis', abbreviation: 'M' },
  { eventName: 'Mafsuhiyat', abbreviation: 'MF' },
  { eventName: 'Misbah', abbreviation: 'MISBAH' },
  { eventName: 'Mokib', abbreviation: 'MKB' },
  { eventName: 'Madrasa', abbreviation: 'MO' },
  { eventName: 'Misaq', abbreviation: 'MQ' },
  { eventName: 'Mulaqaat', abbreviation: 'MUL' },
  { eventName: 'Miyana', abbreviation: 'MYN' },
  { eventName: 'Majmui Ziyafat', abbreviation: 'MZ' },
  { eventName: 'Nikah', abbreviation: 'N' },
  { eventName: 'Namaz', abbreviation: 'NAMAZ' },
  { eventName: 'Online', abbreviation: 'ONLINE' },
  { eventName: 'Qadam', abbreviation: 'Q' },
  { eventName: 'Qadam Majlis Ziyafat', abbreviation: 'QMZ' },
  { eventName: 'Sharaf', abbreviation: 'SH' },
  { eventName: 'Shifa Qadam', abbreviation: 'SQ' },
  { eventName: 'Tijarat', abbreviation: 'TJR' },
  { eventName: 'Talaqqi', abbreviation: 'TQ' },
  { eventName: 'Tahneeq', abbreviation: 'TQN' },
  { eventName: 'Waaz', abbreviation: 'WAAZ' },
  { eventName: 'Wada', abbreviation: 'WD' },
  { eventName: 'Ziyafat', abbreviation: 'Z' },
  { eventName: 'Zafaf Olda', abbreviation: 'ZO' },
];

export class EventImageDistributorEngine {
  /**
   * Parse folder name into tokens.
   * Examples:
   *   1448-04-09_02E-27-12Q-40905764
   *   1448-04-09_02E-27-Q-
   *   1448-04-09 _01M-05-1M-
   */
  static parseFolderTokens(folderName: string): {
    dateSlot: string;
    seq: string;
    rawEventToken: string;
    stickerNumber: string;
    abbreviation: string;
    its: string;
  } | null {
    const clean = folderName.trim();
    const match = clean.match(/^(\d{4}[-_.]\d{2}[-_.]\d{2}(?:[\s_-]*\w+)?)[\-_](\d+[a-zA-Z]?)[\-_]([a-zA-Z0-9]+)(?:[\-_](\d*))?[\-_]?$/i);

    if (!match) {
      const parts = clean.split('-');
      if (parts.length >= 3) {
        const candidateDate = parts.slice(0, 3).join('-');
        const remainingParts = parts.slice(3);
        if (remainingParts.length >= 1) {
          const seq = remainingParts[0];
          const rawEvt = remainingParts[1] || '';
          const its = remainingParts[2] || '';

          const subM = rawEvt.match(/^(\d+)?([a-zA-Z]+)$/);
          return {
            dateSlot: candidateDate,
            seq,
            rawEventToken: rawEvt,
            stickerNumber: subM && subM[1] ? subM[1] : '',
            abbreviation: subM && subM[2] ? subM[2].toUpperCase() : rawEvt.toUpperCase(),
            its,
          };
        }
      }
      return null;
    }

    const dateSlot = match[1];
    const seq = match[2];
    const rawEventToken = match[3];
    const its = match[4] || '';

    const evtMatch = rawEventToken.match(/^(\d+)?([a-zA-Z]+)$/);
    const stickerNumber = evtMatch && evtMatch[1] ? evtMatch[1] : '';
    const abbreviation = evtMatch && evtMatch[2] ? evtMatch[2].toUpperCase() : rawEventToken.toUpperCase();

    return {
      dateSlot,
      seq,
      rawEventToken,
      stickerNumber,
      abbreviation,
      its,
    };
  }

  /**
   * Load Event mappings.
   * If an excelPath is provided and valid, it merges/overrides; otherwise returns hardcoded BUILTIN_EVENT_MAPPINGS.
   */
  async loadEventMappings(excelPath?: string): Promise<EventMappingItem[]> {
    if (!excelPath || !excelPath.trim() || !fs.existsSync(excelPath)) {
      return [...BUILTIN_EVENT_MAPPINGS];
    }

    const pythonCode = `
import openpyxl, json, sys
wb = openpyxl.load_workbook(r'''${excelPath}''', data_only=True)
ws = wb.active
mappings = []
rows = list(ws.iter_rows(values_only=True))
if rows:
    header = [str(c).strip().lower() if c is not None else '' for c in rows[0]]
    name_col = -1
    abbr_col = -1
    for idx, col in enumerate(header):
        if 'name' in col or 'event' in col:
            name_col = idx
        if 'abbrev' in col or 'code' in col:
            abbr_col = idx
    if name_col == -1: name_col = 0
    if abbr_col == -1: abbr_col = 1

    for r in rows[1:]:
        if not r or len(r) <= max(name_col, abbr_col): continue
        val_name = str(r[name_col]).strip() if r[name_col] is not None else ''
        val_abbr = str(r[abbr_col]).strip() if r[abbr_col] is not None else ''
        if val_name and val_abbr and val_name.lower() != 'none':
            mappings.append({"eventName": val_name, "abbreviation": val_abbr.upper()})

print(json.dumps(mappings))
`;

    return new Promise((resolve) => {
      const py = spawn('python', ['-c', pythonCode], { windowsHide: true });
      let stdout = '';
      py.stdout.on('data', (d) => (stdout += d.toString()));
      py.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            const list: EventMappingItem[] = JSON.parse(stdout.trim());
            if (Array.isArray(list) && list.length > 0) {
              return resolve(list);
            }
          } catch {}
        }
        resolve([...BUILTIN_EVENT_MAPPINGS]);
      });
      py.on('error', () => {
        resolve([...BUILTIN_EVENT_MAPPINGS]);
      });
    });
  }

  /**
   * Scan available event badge/reference images in the given images folder
   */
  async scanEventImages(
    imagesDirPath: string,
    mappings: EventMappingItem[]
  ): Promise<{
    fileName: string;
    filePath: string;
    matchedEventNames: string[];
    matchedAbbreviations: string[];
  }[]> {
    if (!fs.existsSync(imagesDirPath)) {
      throw new Error(`Images folder does not exist at: ${imagesDirPath}`);
    }

    const validImgExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif']);
    const files = await fs.promises.readdir(imagesDirPath);
    const results: {
      fileName: string;
      filePath: string;
      matchedEventNames: string[];
      matchedAbbreviations: string[];
    }[] = [];

    // Helper map from normalized text to mappings
    const abbrMap = new Map<string, EventMappingItem[]>();
    const nameMap = new Map<string, EventMappingItem[]>();

    for (const m of mappings) {
      const a = m.abbreviation.toUpperCase();
      const n = m.eventName.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!abbrMap.has(a)) abbrMap.set(a, []);
      abbrMap.get(a)!.push(m);

      if (!nameMap.has(n)) nameMap.set(n, []);
      nameMap.get(n)!.push(m);
    }

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!validImgExts.has(ext)) continue;

      const fullPath = path.join(imagesDirPath, file);
      const stat = await fs.promises.stat(fullPath);
      if (!stat.isFile()) continue;

      const stem = path.basename(file, ext).trim();
      const stemUpper = stem.toUpperCase();
      const stemNorm = stem.toLowerCase().replace(/[^a-z0-9]/g, '');

      const matchedNames = new Set<string>();
      const matchedAbbrs = new Set<string>();

      // Check direct abbreviation match (e.g. Q.jpg, 12Q.jpg, Qadam.jpg)
      if (abbrMap.has(stemUpper)) {
        for (const item of abbrMap.get(stemUpper)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
        }
      }

      // Check full event name match (e.g. Qadam.jpg)
      if (nameMap.has(stemNorm)) {
        for (const item of nameMap.get(stemNorm)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
        }
      }

      // Also check if stem matches after removing numbers, e.g. "12Q" -> "Q"
      const numStripped = stemUpper.replace(/^\d+/, '');
      if (numStripped && abbrMap.has(numStripped)) {
        for (const item of abbrMap.get(numStripped)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
        }
      }

      // Check if stem contains event name word
      for (const m of mappings) {
        const cleanName = m.eventName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanName && stemNorm === cleanName) {
          matchedAbbrs.add(m.abbreviation);
          matchedNames.add(m.eventName);
        }
      }

      results.push({
        fileName: file,
        filePath: fullPath,
        matchedEventNames: Array.from(matchedNames),
        matchedAbbreviations: Array.from(matchedAbbrs),
      });
    }

    return results;
  }

  /**
   * Scan destination workspace and match folders against event abbreviations
   */
  async scanDistributor(
    targetWorkingDir: string,
    imagesDirPath: string,
    excelPath?: string
  ): Promise<EventDistributorScanResult> {
    const mappings = await this.loadEventMappings(excelPath);
    const availableImages = await this.scanEventImages(imagesDirPath, mappings);

    // Build quick lookup for images by abbreviation and by full event name
    const imgByAbbr = new Map<string, typeof availableImages>();
    for (const img of availableImages) {
      for (const abbr of img.matchedAbbreviations) {
        if (!imgByAbbr.has(abbr)) imgByAbbr.set(abbr, []);
        imgByAbbr.get(abbr)!.push(img);
      }
    }

    const foldersMatched: FolderEventMatch[] = [];
    const unmatchedFolders: string[] = [];
    let totalPlannedCopies = 0;

    // Recursively or top-level find candidate folders
    const findCandidateFolders = async (dir: string, depth = 0): Promise<string[]> => {
      const candidates: string[] = [];
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'documents') continue;

          const fullSub = path.join(dir, entry.name);
          const parsed = EventImageDistributorEngine.parseFolderTokens(entry.name);
          if (parsed) {
            candidates.push(fullSub);
          } else if (depth < 3) {
            // Check subfolders (e.g. Master session folder containing event folders)
            const subCandidates = await findCandidateFolders(fullSub, depth + 1);
            candidates.push(...subCandidates);
          }
        }
      } catch {}
      return candidates;
    };

    const candidatePaths = await findCandidateFolders(targetWorkingDir);

    for (const folderPath of candidatePaths) {
      const folderName = path.basename(folderPath);
      const parsed = EventImageDistributorEngine.parseFolderTokens(folderName);

      if (!parsed) {
        unmatchedFolders.push(folderName);
        continue;
      }

      // Find matching abbreviation from mappings
      const matchedMapping = mappings.find(
        (m) =>
          m.abbreviation.toUpperCase() === parsed.abbreviation.toUpperCase() ||
          m.eventName.toUpperCase() === parsed.abbreviation.toUpperCase()
      );

      const matchedEventName = matchedMapping ? matchedMapping.eventName : '';
      const targetAbbr = parsed.abbreviation.toUpperCase();

      // Find matching images for this abbreviation
      const candidateImages = imgByAbbr.get(targetAbbr) || [];

      const folderMatchedImages: FolderEventMatch['matchedImages'] = [];

      for (const img of candidateImages) {
        const targetDestFile = path.join(folderPath, img.fileName);
        const alreadyExists = fs.existsSync(targetDestFile);
        if (!alreadyExists) {
          totalPlannedCopies++;
        }
        folderMatchedImages.push({
          fileName: img.fileName,
          filePath: img.filePath,
          alreadyExists,
        });
      }

      foldersMatched.push({
        folderPath,
        folderName,
        dateSlot: parsed.dateSlot,
        seq: parsed.seq,
        rawEventToken: parsed.rawEventToken,
        stickerNumber: parsed.stickerNumber,
        abbreviation: targetAbbr,
        matchedEventName,
        its: parsed.its,
        matchedImages: folderMatchedImages,
      });
    }

    return {
      excelPath,
      imagesDirPath,
      targetWorkingDir,
      mappingsCount: mappings.length,
      availableImages,
      foldersMatched,
      unmatchedFolders,
      totalPlannedCopies,
    };
  }

  /**
   * Execute copying the event images to the matched event folders
   */
  async executeDistribution(
    foldersMatched: FolderEventMatch[],
    onProgress?: (current: number, total: number, msg: string) => void
  ): Promise<EventDistributorSummary> {
    let totalImagesCopied = 0;
    let skippedExisting = 0;
    const errors: string[] = [];
    let foldersProcessed = 0;

    const totalOps = foldersMatched.reduce((acc, f) => acc + f.matchedImages.length, 0);
    let opIndex = 0;

    for (const folder of foldersMatched) {
      foldersProcessed++;
      for (const img of folder.matchedImages) {
        opIndex++;
        const destFile = path.join(folder.folderPath, img.fileName);

        if (fs.existsSync(destFile)) {
          skippedExisting++;
          continue;
        }

        try {
          await fs.promises.copyFile(img.filePath, destFile);
          totalImagesCopied++;
          if (onProgress) {
            onProgress(opIndex, totalOps, `Copied ${img.fileName} -> ${folder.folderName}`);
          }
        } catch (e: any) {
          errors.push(`Failed copying ${img.fileName} to ${folder.folderName}: ${e.message}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      totalFoldersProcessed: foldersProcessed,
      totalImagesCopied,
      skippedExisting,
      errors,
    };
  }
}
