import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface EventMappingItem {
  eventName: string;
  abbreviation: string;
  placardFileName?: string;
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
  expectedPlacardFile?: string;
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
  { eventName: 'Aqiqa', abbreviation: 'AQ', placardFileName: '__09 Aqeeqa Tasaweer Instructions.jpg' },
  { eventName: 'Bethak', abbreviation: 'Bethak' },
  { eventName: 'Bethak Majlis', abbreviation: 'BM', placardFileName: '__19 Bethak Majlis Tasaweer Instructions.jpg' },
  { eventName: 'Bethak Qadam', abbreviation: 'BQ', placardFileName: '__20 Bethak Qadam Tasaweer Instructions.jpg' },
  { eventName: 'Bethak QMZ', abbreviation: 'BQMZ' },
  { eventName: 'Bethak Ziyafat', abbreviation: 'BZ', placardFileName: '__18 Bethak Ziyafat Tasaweer Instructions.jpg' },
  { eventName: 'FMB', abbreviation: 'FMB' },
  { eventName: 'Haddiyat', abbreviation: 'H', placardFileName: '__07 Haddiyat Tasaweer Instructions.jpg' },
  { eventName: 'Idaraat', abbreviation: 'ID' },
  { eventName: 'Iftettah', abbreviation: 'IF' },
  { eventName: 'Iftettah Sharaf', abbreviation: 'IFS' },
  { eventName: 'Isteqbal', abbreviation: 'IST' },
  { eventName: 'Kg Sharaf', abbreviation: 'KGS' },
  { eventName: 'Majlis', abbreviation: 'M', placardFileName: '__02 Majlis Tasaweer Instructions.jpg' },
  { eventName: 'Mafsuhiyat', abbreviation: 'MF', placardFileName: '__06 Mafsuhiyat Tasaweer Instructions.jpg' },
  { eventName: 'Misbah', abbreviation: 'MISBAH' },
  { eventName: 'Mokib', abbreviation: 'MKB' },
  { eventName: 'Madrasa', abbreviation: 'MO' },
  { eventName: 'Misaq', abbreviation: 'MQ', placardFileName: '__04 Misaq Tasaweer Instructions.jpg' },
  { eventName: 'Mulaqaat', abbreviation: 'MUL' },
  { eventName: 'Miyana', abbreviation: 'MYN', placardFileName: '__12 Miyana Sharaf Tasaweer Instruction.jpg' },
  { eventName: 'Majmui Ziyafat', abbreviation: 'MZ', placardFileName: '__08 Majmui Ziyafat Tasaweer Instructions.jpg' },
  { eventName: 'Nikah', abbreviation: 'N', placardFileName: '__05 Nikah Tasaweer Instructions.jpg' },
  { eventName: 'Namaz', abbreviation: 'NAMAZ' },
  { eventName: 'Online', abbreviation: 'ONLINE' },
  { eventName: 'Other', abbreviation: 'OT' },
  { eventName: 'Qadam', abbreviation: 'Q', placardFileName: '__03 Qadam Tasaweer Instructions.jpg' },
  { eventName: 'Qadam Majlis Ziyafat', abbreviation: 'QMZ' },
  { eventName: 'Salaam', abbreviation: 'S' },
  { eventName: 'Sharaf', abbreviation: 'SH', placardFileName: '__11 Sharaf Tasaweer Instructions.jpg' },
  { eventName: 'Shifa Qadam', abbreviation: 'SQ' },
  { eventName: 'Tijarat', abbreviation: 'TJR' },
  { eventName: 'Talaqqi', abbreviation: 'TQ', placardFileName: '__16 Talaqi Sharaf Tasaweer Instruction.jpg' },
  { eventName: 'Tahneeq', abbreviation: 'TQN', placardFileName: '__17 Tahneeq Tasaweer Instructions.jpg' },
  { eventName: 'Waaz', abbreviation: 'WAAZ' },
  { eventName: 'Wada', abbreviation: 'WD' },
  { eventName: 'Ziyafat', abbreviation: 'Z', placardFileName: '__01 Ziyafat Tasaweer Instructions.jpg' },
  { eventName: 'Ziyarat', abbreviation: 'Ziyarat' },
  { eventName: 'Zafaf Olda', abbreviation: 'ZO', placardFileName: '__10 Zafaf Olda Tasaweer Instructions.jpg' },
];

export class EventImageDistributorEngine {
  /**
   * Parse folder name into tokens.
   * Examples:
   *   1448-04-09_02E-27-12Q-40905764
   *   1448-04-09_02E-27-Q-
   *   1448-04-09_01M-05-1M-
   *   27-12Q-40905764
   *   01-Q
   *   0042_Ceremony_Q_Bride
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
    if (!clean) return null;

    // 1. Standard full canonical pattern: e.g. 1448-04-09_02E-27-12Q-40905764 or 1448-04-09_01M-05-1M-
    const fullMatch = clean.match(/^(\d{4}[-_.]\d{2}[-_.]\d{2}(?:[\s_-]*\w+)?)[\-_](\d+[a-zA-Z]?)[\-_]([a-zA-Z0-9]+)(?:[\-_](\d*))?[\-_]?$/i);
    if (fullMatch) {
      const dateSlot = fullMatch[1];
      const seq = fullMatch[2];
      const rawEventToken = fullMatch[3];
      const its = fullMatch[4] || '';

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

    // 2. Local pattern: e.g. 27-12Q-40905764 or 27-12Q or 01-Q
    const localMatch = clean.match(/^(\d+[a-zA-Z]?)[\-_]([a-zA-Z0-9]+)(?:[\-_](\d*))?[\-_]?$/i);
    if (localMatch) {
      const seq = localMatch[1];
      const rawEventToken = localMatch[2];
      const its = localMatch[3] || '';

      const evtMatch = rawEventToken.match(/^(\d+)?([a-zA-Z]+)$/);
      const stickerNumber = evtMatch && evtMatch[1] ? evtMatch[1] : '';
      const abbreviation = evtMatch && evtMatch[2] ? evtMatch[2].toUpperCase() : rawEventToken.toUpperCase();

      return {
        dateSlot: '',
        seq,
        rawEventToken,
        stickerNumber,
        abbreviation,
        its,
      };
    }

    // 3. Fallback: split by hyphens/underscores/spaces, e.g. 0042_Ceremony_Q_Bride or 1448-04-09-02E-27-12Q
    const tokens = clean.split(/[\-_.\s]+/);
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const subM = tok.match(/^(\d+)?([a-zA-Z]+)$/);
      if (subM && subM[2]) {
        const candidateAbbr = subM[2].toUpperCase();
        const isKnown = BUILTIN_EVENT_MAPPINGS.some(
          (m) => m.abbreviation.toUpperCase() === candidateAbbr || m.eventName.toUpperCase() === candidateAbbr
        );
        if (isKnown) {
          const seq = i > 0 && /^\d+/.test(tokens[i - 1]) ? tokens[i - 1] : (tokens[0] || '');
          return {
            dateSlot: '',
            seq,
            rawEventToken: tok,
            stickerNumber: subM[1] || '',
            abbreviation: candidateAbbr,
            its: tokens[i + 1] && /^\d{6,}$/.test(tokens[i + 1]) ? tokens[i + 1] : '',
          };
        }
      }
    }

    return null;
  }

  /**
   * Load Event mappings.
   * If an excelPath is provided and valid, it merges/overrides;
   * otherwise checks default 'C:\Users\Burhanuddin\OneDrive\Desktop\Pla Cards.xlsx'
   * or returns BUILTIN_EVENT_MAPPINGS with placard filenames.
   */
  async loadEventMappings(excelPath?: string): Promise<EventMappingItem[]> {
    let resolvedExcel = excelPath?.trim();
    const defaultExcelPath = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Pla Cards.xlsx';

    if (!resolvedExcel || !fs.existsSync(resolvedExcel)) {
      if (fs.existsSync(defaultExcelPath)) {
        resolvedExcel = defaultExcelPath;
      } else {
        return [...BUILTIN_EVENT_MAPPINGS];
      }
    }

    const pythonCode = `
import openpyxl, json, sys
try:
    wb = openpyxl.load_workbook(r'''${resolvedExcel}''', data_only=True)
    ws = wb.active
    mappings = []
    rows = list(ws.iter_rows(values_only=True))
    if rows:
        header = [str(c).strip().lower() if c is not None else '' for c in rows[0]]
        name_col = -1
        abbr_col = -1
        placard_col = -1
        for idx, col in enumerate(header):
            if 'name' in col or 'event' in col:
                name_col = idx
            if 'abbrev' in col or 'code' in col:
                abbr_col = idx
            if 'placard' in col or 'instruction' in col or 'file' in col:
                placard_col = idx
        if name_col == -1: name_col = 0
        if abbr_col == -1: abbr_col = 1
        if placard_col == -1 and len(header) >= 3: placard_col = 2

        for r in rows[1:]:
            if not r or len(r) <= max(name_col, abbr_col): continue
            val_name = str(r[name_col]).strip() if r[name_col] is not None else ''
            val_abbr = str(r[abbr_col]).strip() if r[abbr_col] is not None else ''
            val_placard = ''
            if placard_col != -1 and len(r) > placard_col and r[placard_col] is not None:
                p_raw = str(r[placard_col]).strip()
                if p_raw.lower() not in ('none (skipped)', 'none', 'skipped', ''):
                    val_placard = p_raw
            if val_name and val_abbr and val_name.lower() != 'none':
                item = {"eventName": val_name, "abbreviation": val_abbr.upper()}
                if val_placard:
                    item["placardFileName"] = val_placard
                mappings.append(item)

    print(json.dumps(mappings))
except Exception as e:
    print(json.dumps([]))
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
      throw new Error('Master event reference images folder could not be found.');
    }

    const validImgExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif']);
    const files = await fs.promises.readdir(imagesDirPath);
    const results: {
      fileName: string;
      filePath: string;
      matchedEventNames: string[];
      matchedAbbreviations: string[];
    }[] = [];

    // Helper maps for fast lookups
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
      const stemNormNoDigits = stemNorm.replace(/^\d+/, '');
      const fileLower = file.toLowerCase();

      const matchedNames = new Set<string>();
      const matchedAbbrs = new Set<string>();

      // 1. Direct or normalized match with mapping placardFileName (e.g. "__03 Qadam Tasaweer Instructions.jpg")
      for (const m of mappings) {
        if (!m.placardFileName) continue;
        const pFile = m.placardFileName.toLowerCase();
        const pStem = path.basename(m.placardFileName, path.extname(m.placardFileName));
        const pNorm = pStem.toLowerCase().replace(/[^a-z0-9]/g, '');
        const pNormNoDigits = pNorm.replace(/^\d+/, '');

        if (
          fileLower === pFile ||
          stemNorm === pNorm ||
          (stemNormNoDigits && stemNormNoDigits === pNormNoDigits) ||
          (pNormNoDigits && stemNorm.includes(pNormNoDigits))
        ) {
          matchedAbbrs.add(m.abbreviation);
          matchedNames.add(m.eventName);
        }
      }

      // 2. Direct abbreviation match (e.g. Q.jpg, 12Q.jpg)
      if (abbrMap.has(stemUpper)) {
        for (const item of abbrMap.get(stemUpper)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
        }
      }

      // 3. Abbreviation with leading digits stripped (e.g. "12Q" -> "Q")
      const numStripped = stemUpper.replace(/^\d+/, '');
      if (numStripped && abbrMap.has(numStripped)) {
        for (const item of abbrMap.get(numStripped)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
        }
      }

      // 4. Exact event name match (e.g. Qadam.jpg, Ziyafat.jpg)
      if (nameMap.has(stemNorm)) {
        for (const item of nameMap.get(stemNorm)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
        }
      }

      // 5. Event name with leading digits stripped (e.g. "01 Ziyafat" -> "Ziyafat")
      if (stemNormNoDigits && nameMap.has(stemNormNoDigits)) {
        for (const item of nameMap.get(stemNormNoDigits)!) {
          matchedAbbrs.add(item.abbreviation);
          matchedNames.add(item.eventName);
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

    // Build quick lookup for images by abbreviation
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

    // Recursively find candidate folders, skipping quarantine & non-media directories
    const findCandidateFolders = async (dir: string, depth = 0): Promise<string[]> => {
      const candidates: string[] = [];
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const lowerName = entry.name.toLowerCase();
          if (
            entry.name.startsWith('.') ||
            lowerName === 'documents' ||
            lowerName === 'do not upload' ||
            lowerName === 'dnu'
          ) {
            continue;
          }

          const fullSub = path.join(dir, entry.name);
          const parsed = EventImageDistributorEngine.parseFolderTokens(entry.name);
          if (parsed) {
            candidates.push(fullSub);
          } else if (depth < 4) {
            // Check subfolders (e.g. Master session folder or date folder containing event folders)
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

      // Find matching mapping
      const matchedMapping = mappings.find(
        (m) =>
          m.abbreviation.toUpperCase() === parsed.abbreviation.toUpperCase() ||
          m.eventName.toUpperCase() === parsed.abbreviation.toUpperCase()
      );

      const matchedEventName = matchedMapping ? matchedMapping.eventName : '';
      const expectedPlacardFile = matchedMapping ? matchedMapping.placardFileName : undefined;
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
        expectedPlacardFile,
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
          console.error(`[EventImageDistributor Error] ${img.fileName} -> ${folder.folderName}:`, e);
          errors.push(`Could not copy ${img.fileName} to ${folder.folderName} (file is in use or access denied).`);
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
