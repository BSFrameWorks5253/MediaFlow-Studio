import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

let cachedPythonPath: string | null = null;

/**
 * Robustly discovers the active Python executable on the host system.
 * Prioritizes executables that have openpyxl installed and direct
 * binary installations over Windows execution aliases.
 */
export function getPythonExecutable(): string {
  if (cachedPythonPath) return cachedPythonPath;

  const testCandidate = (exe: string): boolean => {
    try {
      const out = execSync(`"${exe}" -c "import openpyxl; print('OK')"`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      });
      if (out && out.includes('OK')) return true;
    } catch {}
    try {
      const out = execSync(`"${exe}" --version`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 2000,
      });
      if (out && out.toLowerCase().includes('python')) return true;
    } catch {}
    return false;
  };

  // 1. Explicit override from environment
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    if (testCandidate(process.env.PYTHON_PATH)) {
      cachedPythonPath = process.env.PYTHON_PATH;
      return cachedPythonPath;
    }
  }

  // 2. Scan common Windows installation directories FIRST (standalone binaries are most reliable)
  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const dirCandidates: string[] = [];

  // Local Pythoncore (e.g., Python 3.14/3.13/3.12 embedded/managed)
  const pyCoreParent = path.join(localAppData, 'Python');
  if (fs.existsSync(pyCoreParent)) {
    try {
      const entries = fs.readdirSync(pyCoreParent);
      for (const entry of entries) {
        dirCandidates.push(path.join(pyCoreParent, entry, 'python.exe'));
      }
    } catch {}
  }

  // Local Programs Python
  const pyProgramsParent = path.join(localAppData, 'Programs', 'Python');
  if (fs.existsSync(pyProgramsParent)) {
    try {
      const entries = fs.readdirSync(pyProgramsParent);
      for (const entry of entries) {
        dirCandidates.push(path.join(pyProgramsParent, entry, 'python.exe'));
      }
    } catch {}
  }

  // C:\Program Files\Python*
  if (fs.existsSync(programFiles)) {
    try {
      const entries = fs.readdirSync(programFiles).filter((e) => e.toLowerCase().startsWith('python'));
      for (const entry of entries) {
        dirCandidates.push(path.join(programFiles, entry, 'python.exe'));
      }
    } catch {}
  }

  // C:\Program Files (x86)\Python*
  if (fs.existsSync(programFilesX86)) {
    try {
      const entries = fs.readdirSync(programFilesX86).filter((e) => e.toLowerCase().startsWith('python'));
      for (const entry of entries) {
        dirCandidates.push(path.join(programFilesX86, entry, 'python.exe'));
      }
    } catch {}
  }

  // Test discovered concrete paths
  for (const exePath of dirCandidates) {
    if (fs.existsSync(exePath) && testCandidate(exePath)) {
      cachedPythonPath = exePath;
      return cachedPythonPath;
    }
  }

  // 3. Test standard PATH commands: 'python', 'py', 'python3'
  const commandCandidates = ['python', 'py', 'python3'];
  for (const cmd of commandCandidates) {
    if (testCandidate(cmd)) {
      cachedPythonPath = cmd;
      return cachedPythonPath;
    }
  }

  // Default fallback
  cachedPythonPath = 'python';
  return cachedPythonPath;
}
