import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

let cachedPythonPath: string | null = null;

/**
 * Robustly discovers the active Python executable on the host system.
 * Checks environment overrides, PATH executables (python, py, python3),
 * and standard Windows installation directories.
 */
export function getPythonExecutable(): string {
  if (cachedPythonPath) return cachedPythonPath;

  // 1. Explicit override from environment
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    cachedPythonPath = process.env.PYTHON_PATH;
    return cachedPythonPath;
  }

  // 2. Test standard PATH commands: 'python', 'py', 'python3'
  const commandCandidates = ['python', 'py', 'python3'];
  for (const cmd of commandCandidates) {
    try {
      const out = execSync(`${cmd} --version`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
      if (out && out.toLowerCase().includes('python')) {
        cachedPythonPath = cmd;
        return cachedPythonPath;
      }
    } catch {}
  }

  // 3. Scan common Windows installation directories
  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';

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

  for (const exePath of dirCandidates) {
    if (fs.existsSync(exePath)) {
      try {
        const out = execSync(`"${exePath}" --version`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
        if (out && out.toLowerCase().includes('python')) {
          cachedPythonPath = exePath;
          return cachedPythonPath;
        }
      } catch {}
    }
  }

  // Default fallback
  cachedPythonPath = 'python';
  return cachedPythonPath;
}
