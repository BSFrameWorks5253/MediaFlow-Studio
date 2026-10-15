import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ExcelInspectItem {
  path: string;
  name: string;
  size: string;
  sheets: string[];
  sheet_count: number;
  rows: number;
  valid: boolean;
  error?: string;
}

export interface ExcelMergeStats {
  files_merged: number;
  sheets_processed: number;
  total_rows_merged: number;
  missing_files_count: number;
  folder_columns_count: number;
  camera_summary_found: number;
  camera_summary_missing: number;
  issues_count: number;
  output_path: string;
}

export class ExcelMergerEngine {
  private scriptPath: string;

  constructor() {
    this.scriptPath = this.resolveScriptPath();
  }

  private resolveScriptPath(): string {
    const scriptName = 'excel_merger.py';
    const candidates = [
      // 1. Packaged production: resources/scripts/excel_merger.py (outside app.asar)
      path.join(process.resourcesPath || '', 'scripts', scriptName),
      // 2. Extra unpacked resources if unpacked by asarUnpack
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist-electron', 'engines', 'scripts', scriptName),
      // 3. Dev / local relative paths
      path.join(__dirname, 'scripts', scriptName).replace('app.asar', 'app.asar.unpacked'),
      path.join(process.cwd(), 'electron', 'engines', 'scripts', scriptName),
      path.join(process.cwd(), 'dist-electron', 'engines', 'scripts', scriptName),
    ];

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Default fallback to resources directory
    return path.join(process.resourcesPath || '', 'scripts', scriptName);
  }

  private runPython(action: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const py = spawn('python', [this.scriptPath, action, '-'], {
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code !== 0) {
          console.error('[ExcelMerger Engine Failure]:', { code, stderr, stdout });
          return reject(new Error('Excel processing failed. Please verify the spreadsheet format and retry.'));
        }
        try {
          const json = JSON.parse(stdout.trim());
          if (!json.success) {
            console.error('[ExcelMerger Application Error]:', json.error);
            return reject(new Error(typeof json.error === 'string' && json.error.length < 100 && !json.error.includes('\\') ? json.error : 'Excel processing could not be completed.'));
          }
          resolve(json);
        } catch (e: any) {
          console.error('[ExcelMerger JSON Parse Error]:', { stdout, error: e });
          reject(new Error('Failed to parse workbook response from Excel engine.'));
        }
      });

      // Write JSON payload to stdin
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    });
  }

  async scanDirectory(folderPath: string): Promise<string[]> {
    const res = await this.runPython('scan', folderPath);
    return res.files || [];
  }

  async inspectFiles(filePaths: string[]): Promise<ExcelInspectItem[]> {
    const res = await this.runPython('inspect', filePaths);
    return res.data || [];
  }

  async mergeFiles(filePaths: string[], outputPath?: string): Promise<ExcelMergeStats> {
    const res = await this.runPython('merge', {
      files: filePaths,
      output_path: outputPath || '',
    });
    return res.stats;
  }
}
