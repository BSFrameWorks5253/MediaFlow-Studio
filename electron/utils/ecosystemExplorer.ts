import { shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Checks whether Anything File Manager (AFM) is installed on this PC.
 * Checks official per-user and per-machine installation directories,
 * as well as Anything Hub installed apps directory.
 */
export function getInstalledAfmPath(): string | null {
  try {
    const localAppData = process.env.LOCALAPPDATA || '';
    const appData = process.env.APPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidateInstallPaths = [
      path.join(localAppData, 'Programs', 'Anything File Manager', 'Anything File Manager.exe'),
      path.join(localAppData, 'Programs', 'anything-file-manager', 'Anything File Manager.exe'),
      path.join(appData, 'Anything', 'installed-apps', 'anything-file-manager', 'Anything File Manager.exe'),
      path.join(localAppData, 'Anything', 'installed-apps', 'anything-file-manager', 'Anything File Manager.exe'),
      path.join(programFiles, 'Anything File Manager', 'Anything File Manager.exe'),
      path.join(programFilesX86, 'Anything File Manager', 'Anything File Manager.exe'),
      // Fallback dev/workspace candidate if present
      path.join(process.cwd(), '..', 'Media Viewer', 'release', 'win-unpacked', 'Anything File Manager.exe'),
    ];

    for (const p of candidateInstallPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  } catch (err) {
    console.warn('[EcosystemExplorer] Error detecting installed AFM:', err);
  }
  return null;
}

/**
 * Universal Ecosystem Explorer Bridge
 * - If Anything File Manager is installed: Opens target folder/file in AFM.
 * - Otherwise: Opens directly in the default Windows File Explorer.
 */
export async function openInEcosystemExplorer(folderOrFilePath: string): Promise<boolean> {
  if (!folderOrFilePath || !folderOrFilePath.trim()) return false;
  const target = path.resolve(folderOrFilePath.trim().replace(/^file:\/\/\/?/, ''));

  // 1. If AFM is installed, delegate to AFM
  const installedAfm = getInstalledAfmPath();
  if (installedAfm) {
    try {
      const child = spawn(installedAfm, [target], { detached: true, stdio: 'ignore' });
      child.unref();
      return true;
    } catch (e) {
      console.warn('[EcosystemExplorer] AFM launch failed, falling back to default Windows Explorer:', e);
    }
  }

  // 2. Otherwise: Open in Default Windows Explorer
  try {
    let stat: fs.Stats | null = null;
    try {
      stat = fs.statSync(target);
    } catch {}

    if (stat && stat.isFile()) {
      shell.showItemInFolder(target);
      return true;
    }

    if (fs.existsSync(target)) {
      const res = await shell.openPath(target);
      return !res;
    }

    // If target doesn't exist, open its parent directory
    const parent = path.dirname(target);
    if (fs.existsSync(parent)) {
      const res = await shell.openPath(parent);
      return !res;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Shows an item highlighted in its containing folder.
 * If AFM is installed, opens the file in AFM (which locates & selects it).
 * Otherwise uses native Windows shell.showItemInFolder.
 */
export async function showItemInEcosystemExplorer(filePath: string): Promise<boolean> {
  if (!filePath || !filePath.trim()) return false;
  const target = path.resolve(filePath.trim().replace(/^file:\/\/\/?/, ''));

  const installedAfm = getInstalledAfmPath();
  if (installedAfm) {
    try {
      const child = spawn(installedAfm, [target], { detached: true, stdio: 'ignore' });
      child.unref();
      return true;
    } catch (e) {
      console.warn('[EcosystemExplorer] AFM launch failed for item, falling back to shell:', e);
    }
  }

  try {
    if (fs.existsSync(target)) {
      shell.showItemInFolder(target);
      return true;
    }
    const parent = path.dirname(target);
    if (fs.existsSync(parent)) {
      shell.showItemInFolder(parent);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
