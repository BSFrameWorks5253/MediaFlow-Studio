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

export interface AfmDualSyncLaunchOptions {
  videoPath?: string;
  photoPath?: string;
  folderName?: string;
  date?: string;
  slot?: string;
}

export function launchAfmWithArgs(cliArgs: string[]): boolean {
  const installedAfm = getInstalledAfmPath();
  if (installedAfm && installedAfm.endsWith('.exe')) {
    try {
      const child = spawn(installedAfm, cliArgs, { detached: true, stdio: 'ignore' });
      child.unref();
      return true;
    } catch (e) {
      console.warn('[EcosystemExplorer] AFM exe launch failed:', e);
    }
  }

  // Check dev workspace candidate
  const devCandidates = [
    {
      electronExe: path.join(process.cwd(), '..', 'Media Viewer', 'node_modules', '.bin', 'electron.cmd'),
      entryScript: path.join(process.cwd(), '..', 'Media Viewer', 'dist-electron', 'main.js'),
      cwd: path.join(process.cwd(), '..', 'Media Viewer'),
    },
    {
      electronExe: 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything Apps\\Media Viewer\\node_modules\\.bin\\electron.cmd',
      entryScript: 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything Apps\\Media Viewer\\dist-electron\\main.js',
      cwd: 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything Apps\\Media Viewer',
    },
  ];

  for (const cand of devCandidates) {
    if (fs.existsSync(cand.electronExe) && fs.existsSync(cand.entryScript)) {
      try {
        const child = spawn(cand.electronExe, [cand.entryScript, ...cliArgs], {
          detached: true,
          stdio: 'ignore',
          cwd: cand.cwd,
          shell: true,
        });
        child.unref();
        return true;
      } catch (e) {
        console.warn('[EcosystemExplorer] Dev AFM launch failed:', e);
      }
    }
  }

  return false;
}

/**
 * Opens Anything File Manager in Synchronized Dual View:
 * Left side Video folder, Right side Photo folder,
 * with Folder Name, Date, and Slot displayed at the top.
 * Falls back gracefully to opening folders in Windows Explorer if AFM is absent.
 */
export async function openInAfmDualSync(options: AfmDualSyncLaunchOptions): Promise<boolean> {
  const cliArgs = [
    '--dual-sync',
    `--video=${options.videoPath || ''}`,
    `--photo=${options.photoPath || ''}`,
    `--folder=${options.folderName || ''}`,
    `--date=${options.date || ''}`,
    `--slot=${options.slot || ''}`,
  ];

  const launched = launchAfmWithArgs(cliArgs);
  if (launched) return true;

  // Fallback: If AFM cannot be launched, open both folders in Windows Explorer
  if (options.videoPath && fs.existsSync(options.videoPath)) {
    shell.openPath(options.videoPath);
  }
  if (options.photoPath && fs.existsSync(options.photoPath)) {
    shell.openPath(options.photoPath);
  }
  return false;
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
