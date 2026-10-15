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
    const devPath = path.join(__dirname, 'scripts', 'excel_merger.py');
    const prodPath = path.join(process.resourcesPath || '', 'scripts', 'excel_merger.py');
    this.scriptPath = fs.existsSync(devPath) ? devPath : prodPath;
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
          return reject(new Error(stderr || stdout || `Process exited with code ${code}`));
        }
        try {
          const json = JSON.parse(stdout.trim());
          if (!json.success) {
            return reject(new Error(json.error || 'Unknown Excel engine error'));
          }
          resolve(json);
        } catch (e: any) {
          reject(new Error(`Failed to parse Python output: ${stdout} (${e.message})`));
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
