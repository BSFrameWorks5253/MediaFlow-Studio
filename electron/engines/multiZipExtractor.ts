import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getPythonExecutable } from '../utils/pythonResolver';

export interface ZipPartInfo {
  path: string;
  filename: string;
  file_count: number;
  uncompressed_bytes: number;
  size_bytes: number;
  error?: string;
}

export interface ZipScanResult {
  zips: ZipPartInfo[];
  total_files: number;
  total_uncompressed_bytes: number;
  suggested_output_name: string;
}

export interface ZipGroupInfo {
  groupName: string;
  files: string[];
  totalSizeFormatted: string;
  count: number;
}

export class MultiZipExtractorEngine {
  private scriptPath: string;

  constructor() {
    this.scriptPath = this.resolveScriptPath();
  }

  private resolveScriptPath(): string {
    const scriptName = 'multi_zip_extractor.py';
    const candidates = [
      path.join(process.resourcesPath || '', 'scripts', scriptName),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist-electron', 'engines', 'scripts', scriptName),
      path.join(process.cwd(), 'electron', 'engines', 'scripts', scriptName),
      path.join(process.cwd(), 'dist-electron', 'engines', 'scripts', scriptName),
      path.join(__dirname, 'scripts', scriptName).replace('app.asar', 'app.asar.unpacked'),
      path.join(__dirname, '..', 'scripts', scriptName).replace('app.asar', 'app.asar.unpacked'),
    ];

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return path.join(process.resourcesPath || '', 'scripts', scriptName);
  }

  /**
   * Scans a directory to find multi-part Google Drive / split zip files
   * (e.g. drive-download-...-001.zip, folder-001.zip, part1.zip).
   */
  async scanDirectoryForZipSets(dirPath: string): Promise<ZipGroupInfo[]> {
    if (!fs.existsSync(dirPath)) return [];

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const zipFiles: string[] = [];

    for (const ent of entries) {
      if (ent.isFile() && ent.name.toLowerCase().endsWith('.zip')) {
        zipFiles.push(path.join(dirPath, ent.name));
      }
    }

    // Group files by prefix (strip -001, -002, _part1, (1), etc.)
    const groupMap = new Map<string, string[]>();

    for (const zp of zipFiles) {
      const base = path.basename(zp, '.zip');
      // Normalize suffix like -001, -002, _001, _part1, (1)
      const cleanPrefix = base
        .replace(/[-_.]*(?:00\d|\d{2,3}|part\d+|download-\d+t\d+z?)[-_.]*$/i, '')
        .replace(/[-_.]*(?:001|002|003|004|005|006|007|008|009|\d+)$/i, '')
        .trim() || base;

      const groupKey = cleanPrefix.length > 0 ? cleanPrefix : 'Google_Drive_Archive';
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(zp);
    }

    const groups: ZipGroupInfo[] = [];
    for (const [groupName, files] of groupMap.entries()) {
      let totalBytes = 0;
      for (const f of files) {
        try {
          const st = fs.statSync(f);
          totalBytes += st.size;
        } catch {}
      }

      let sizeFormatted = `${totalBytes} B`;
      if (totalBytes >= 1024 * 1024 * 1024) sizeFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      else if (totalBytes >= 1024 * 1024) sizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
      else if (totalBytes >= 1024) sizeFormatted = `${(totalBytes / 1024).toFixed(0)} KB`;

      groups.push({
        groupName,
        files: files.sort(),
        totalSizeFormatted: sizeFormatted,
        count: files.length,
      });
    }

    return groups;
  }

  /**
   * Scans a set of zip files to get total uncompressed bytes, file count, and suggested target folder name.
   */
  async scanZipFiles(zipPaths: string[]): Promise<ZipScanResult> {
    const pyExe = getPythonExecutable();
    const cleanZips = zipPaths.filter((p) => p && fs.existsSync(p));

    if (cleanZips.length === 0) {
      return {
        zips: [],
        total_files: 0,
        total_uncompressed_bytes: 0,
        suggested_output_name: 'Extracted_Archive',
      };
    }

    return new Promise((resolve, reject) => {
      const args = [this.scriptPath, '--action', 'scan', '--zips', ...cleanZips];
      const proc = spawn(pyExe, args, { windowsHide: true });

      let resultData: ZipScanResult | null = null;
      let errText = '';

      proc.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'scan_result') {
              // Compute suggested name
              const firstBase = path.basename(cleanZips[0], '.zip');
              const cleanName = firstBase
                .replace(/[-_.]*(?:001|002|003|004|005|\d{2,3})[-_.]*$/i, '')
                .replace(/^drive-download-\d+t\d+z?[-_]*/i, '')
                .trim() || 'Drive_Unified_Folder';

              resultData = {
                ...parsed.data,
                suggested_output_name: cleanName,
              };
            }
          } catch {}
        }
      });

      proc.stderr.on('data', (chunk) => {
        errText += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && resultData) {
          resolve(resultData);
        } else {
          // If python failed, do basic fallback
          const firstBase = path.basename(cleanZips[0], '.zip');
          resolve({
            zips: cleanZips.map((p) => ({
              path: p,
              filename: path.basename(p),
              file_count: 0,
              uncompressed_bytes: 0,
              size_bytes: 0,
            })),
            total_files: 0,
            total_uncompressed_bytes: 0,
            suggested_output_name: firstBase,
          });
        }
      });
    });
  }

  /**
   * Executes multi-part zip extraction with real-time progress callbacks.
   */
  async extractMultiPart(
    zipPaths: string[],
    outputDir: string,
    flattenOuter = true,
    onProgress?: (progress: any) => void
  ): Promise<{ success: boolean; output_dir: string; files_extracted: number; total_bytes: number }> {
    const pyExe = getPythonExecutable();
    const cleanZips = zipPaths.filter((p) => p && fs.existsSync(p));

    if (cleanZips.length === 0) {
      throw new Error('No valid zip files provided for extraction.');
    }

    fs.mkdirSync(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        '--action',
        'extract',
        '--output-dir',
        outputDir,
        '--zips',
        ...cleanZips,
      ];

      if (flattenOuter) {
        args.push('--flatten-outer');
      }

      const proc = spawn(pyExe, args, { windowsHide: true });
      let finalResult: any = null;
      let errOutput = '';

      proc.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'progress' && onProgress) {
              onProgress(parsed);
            } else if (parsed.type === 'done') {
              finalResult = parsed;
            } else if (parsed.type === 'error') {
              errOutput = parsed.message || 'Extraction error';
            }
          } catch {}
        }
      });

      proc.stderr.on('data', (chunk) => {
        errOutput += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && finalResult && finalResult.success) {
          resolve(finalResult);
        } else {
          reject(new Error(errOutput || 'Failed to complete multi-part zip extraction.'));
        }
      });
    });
  }
}
