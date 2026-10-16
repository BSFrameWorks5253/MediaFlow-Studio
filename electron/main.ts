import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { PVSeparatorEngine } from './engines/pvSeparator';
import { PhotoMatcherEngine } from './engines/photoMatcher';
import { VideoTransferEngine } from './engines/videoTransfer';
import { ThumbnailSeparatorEngine } from './engines/thumbnailSeparator';
import { RemainingCollectorEngine } from './engines/remainingCollector';
import { ExcelMergerEngine } from './engines/excelMerger';
import { ProductionToolsEngine } from './engines/productionTools';
import { GoogleDriveManager } from './engines/../managers/googleDriveManager';
import { ActivityReportsManager } from './engines/../managers/activityReportsManager';
import { EventImageDistributorEngine } from './engines/eventImageDistributor';
import { WorkstationAutoUpdater, UpdateInfo } from './managers/autoUpdater';

// Windows Taskbar Model ID
const APP_USER_MODEL_ID = 'BSFrameWorks.MediaFlow.Studio.v4';
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

// Windows High-DPI Support for crisp text rendering
app.commandLine.appendSwitch('high-dpi-support', '1');

// Single-Instance Enforcement
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('[INFO] Another instance of MediaFlow Studio is already running.');
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;

// Initialize Backend Engines
const pvEngine = new PVSeparatorEngine();
const photoEngine = new PhotoMatcherEngine();
const videoEngine = new VideoTransferEngine();
const thumbEngine = new ThumbnailSeparatorEngine();
const remainingEngine = new RemainingCollectorEngine();
const excelEngine = new ExcelMergerEngine();
const toolsEngine = new ProductionToolsEngine();
const driveManager = new GoogleDriveManager();
const activityManager = new ActivityReportsManager();
const eventDistributorEngine = new EventImageDistributorEngine();

// App Config Store
const configPath = path.join(app.getPath('userData'), 'app_config.json');
let appConfig = {
  theme: 'dark',
  zoomLevel: 1.0,
  auroraPreset: 'obsidian',
  dryRun: true,
  backupEnabled: true,
  autoExportReport: true,
  eventExcelPath: '',
  eventImagesDirPath: '',
};

try {
  if (fs.existsSync(configPath)) {
    appConfig = { ...appConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
  }
} catch {}

function saveAppConfig(newConfig: any) {
  try {
    appConfig = { ...appConfig, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2), 'utf-8');
  } catch {}
}

function createWindow() {
  const iconCandidate1 = path.join(__dirname, '../public/assets/app.ico');
  const iconCandidate2 = path.join(__dirname, '../dist/assets/app.ico');
  const iconPath = fs.existsSync(iconCandidate1) ? iconCandidate1 : (fs.existsSync(iconCandidate2) ? iconCandidate2 : undefined);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    title: 'MediaFlow Studio v4.0 — Creative Production Suite',
    icon: iconPath,
    backgroundColor: '#131722',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
      webSecurity: false,
    },
  });

  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));
  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  const loadFallbackBundle = () => {
    if (fs.existsSync(distHtmlPath)) {
      console.log('[PROD_LOAD] Loading local production bundle:', distHtmlPath);
      mainWindow?.loadFile(distHtmlPath);
    } else {
      console.warn('[LOAD_WARN] dist/index.html not found, displaying recovery launcher');
      mainWindow?.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>MediaFlow Studio — Build Notice</title>
            <style>
              body { background: #07080d; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { max-width: 520px; padding: 36px; border-radius: 20px; background: rgba(22, 28, 45, 0.9); border: 1px solid rgba(0, 242, 254, 0.35); text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
              h1 { color: #00F2FE; font-size: 22px; margin-bottom: 12px; font-weight: 800; }
              p { color: #94a3b8; font-size: 13.5px; line-height: 1.6; margin-bottom: 18px; }
              code { background: rgba(0, 242, 254, 0.1); padding: 4px 10px; border-radius: 6px; color: #38bdf8; font-family: monospace; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>MediaFlow Studio Desktop Runtime</h1>
              <p>The local presentation bundle has not been compiled yet or the development server is starting up.</p>
              <p>Please run the following command in the project directory:<br><br><code>npm run build</code><br><br>Or launch via <code>LAUNCH_DATAFLOW.bat</code></p>
            </div>
          </body>
          </html>
        `)}`
      );
    }
  };

  mainWindow.webContents.on('did-fail-load', (e, code, desc, validatedURL) => {
    console.error('[LOAD_ERROR]', code, desc, validatedURL);
    // Ignore aborted redirects (code -3)
    if (code !== -3 && validatedURL && (validatedURL.includes('5173') || validatedURL.includes('localhost'))) {
      console.log('[FALLBACK] Dev server unreachable, falling back to local dist bundle');
      loadFallbackBundle();
    }
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[RENDERER_CONSOLE] [L${line}] ${message} (${sourceId})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[LOAD_SUCCESS] Window webContents finished loading');
    mainWindow?.webContents.executeJavaScript(`
      console.log("[INSPECT] Root HTML length:", document.getElementById('root')?.innerHTML.length);
      console.log("[INSPECT] electronAPI available:", typeof window.electronAPI);
      console.log("[INSPECT] document title:", document.title);
    `).catch(err => console.error('[INSPECT_ERR]', err));

    // Non-blocking auto-update check 6 seconds after boot (Blueprint 01)
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[AUTO_UPDATER] Running silent background release check...');
        WorkstationAutoUpdater.checkForUpdates(mainWindow).catch((e) =>
          console.warn('[AUTO_UPDATER] Background check error:', e)
        );
      }
    }, 6000);
  });

  if (isDev) {
    console.log('[DEV_LOAD] Attempting connection to dev server: http://127.0.0.1:5173');
    mainWindow.loadURL('http://127.0.0.1:5173').catch((err) => {
      console.warn('[DEV_LOAD_WARN] Failed to load 127.0.0.1:5173, loading local bundle:', err);
      loadFallbackBundle();
    });
  } else {
    loadFallbackBundle();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Config
  ipcMain.handle('app:get-config', () => appConfig);
  ipcMain.handle('app:save-config', (_, cfg) => {
    saveAppConfig(cfg);
    return appConfig;
  });

  // Window Controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

  // Native Dialogs
  ipcMain.handle('dialog:select-directory', async (_, title?: string, startDir?: string) => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: title || 'Select Directory',
      defaultPath: startDir || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
    return res.canceled ? '' : res.filePaths[0];
  });

  ipcMain.handle('dialog:select-open-file', async (_, title?: string, filter?: any) => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: title || 'Select File',
      filters: filter || [],
      properties: ['openFile'],
    });
    return res.canceled ? '' : res.filePaths[0];
  });

  ipcMain.handle('dialog:select-open-files', async (_, title?: string, filter?: any) => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: title || 'Select Files',
      filters: filter || [],
      properties: ['openFile', 'multiSelections'],
    });
    return res.canceled ? [] : res.filePaths;
  });

  ipcMain.handle('dialog:select-save-file', async (_, title?: string, filter?: any) => {
    const res = await dialog.showSaveDialog(mainWindow!, {
      title: title || 'Save File',
      filters: filter || [],
    });
    return res.canceled ? '' : res.filePath;
  });

  ipcMain.handle('shell:open-path', async (_, targetPath: string) => {
    if (!targetPath || !targetPath.trim()) return 'No path provided';
    const clean = path.resolve(targetPath.replace(/^file:\/\/\/?/, ''));
    if (fs.existsSync(clean)) {
      return await shell.openPath(clean);
    }
    // If target doesn't exist, open its parent directory so the user can inspect
    const parent = path.dirname(clean);
    if (fs.existsSync(parent)) {
      await shell.openPath(parent);
      return `Target does not exist: "${path.basename(clean)}". Opened parent folder: "${parent}"`;
    }
    return `Path does not exist: ${clean}`;
  });

  ipcMain.handle('shell:show-item-in-folder', (_, targetPath: string) => {
    if (!targetPath || !targetPath.trim()) return;
    const clean = path.resolve(targetPath.replace(/^file:\/\/\/?/, ''));
    shell.showItemInFolder(clean);
  });

  ipcMain.handle('path:check-exists', async (_, targetPath: string) => {
    if (!targetPath || !targetPath.trim()) {
      return { exists: false, isDir: false, resolvedPath: '', fileCount: 0, parentExists: false, parentPath: '' };
    }
    try {
      const clean = path.resolve(targetPath.replace(/^file:\/\/\/?/, ''));
      const exists = fs.existsSync(clean);
      let isDir = false;
      let fileCount = 0;
      if (exists) {
        const stat = fs.statSync(clean);
        isDir = stat.isDirectory();
        if (isDir) {
          const files = fs.readdirSync(clean);
          fileCount = files.length;
        }
      }
      const parent = path.dirname(clean);
      const parentExists = fs.existsSync(parent);
      return { exists, isDir, resolvedPath: clean, fileCount, parentExists, parentPath: parent };
    } catch {
      return { exists: false, isDir: false, resolvedPath: targetPath, fileCount: 0, parentExists: false, parentPath: '' };
    }
  });

  // Upload Structure Generator (Structure A)
  ipcMain.handle('workspace:create-upload-structure', async (_, baseDir: string, safarName: string) => {
    if (!baseDir || !baseDir.trim()) {
      throw new Error('Base destination directory must be selected.');
    }
    const cleanSafar = (safarName || '').trim().replace(/[<>:"/\\|?*]/g, '_');
    if (!cleanSafar) {
      throw new Error('Valid Safar name must be provided.');
    }

    const cleanBase = path.resolve(baseDir.replace(/^file:\/\/\/?/, ''));
    const safarRoot = path.join(cleanBase, cleanSafar);
    const mainDataPath = path.join(safarRoot, 'Main Data', cleanSafar);
    const thumbnailsPath = path.join(safarRoot, 'Thumbnails', cleanSafar);
    const remainingPath = path.join(safarRoot, 'Remaining', cleanSafar);

    fs.mkdirSync(mainDataPath, { recursive: true });
    fs.mkdirSync(thumbnailsPath, { recursive: true });
    fs.mkdirSync(remainingPath, { recursive: true });

    return {
      safarRoot,
      mainDataPath,
      thumbnailsPath,
      remainingPath,
      safarName: cleanSafar,
      success: true,
    };
  });

  // Move Merged Photo/Video Folder to Upload Structure (Main Data/[Safar Name])
  ipcMain.handle('workspace:move-merged-folder', async (_, sourceDir: string, targetMainDataDir: string) => {
    const cleanSource = path.resolve((sourceDir || '').replace(/^file:\/\/\/?/, ''));
    const cleanTarget = path.resolve((targetMainDataDir || '').replace(/^file:\/\/\/?/, ''));

    if (!fs.existsSync(cleanSource)) {
      throw new Error('The source photo/video directory could not be found.');
    }

    if (cleanSource.toLowerCase() === cleanTarget.toLowerCase()) {
      return { success: true, movedCount: 0, targetPath: cleanTarget, message: 'Source and target are the same directory.' };
    }

    await fs.promises.mkdir(cleanTarget, { recursive: true });

    const entries = await fs.promises.readdir(cleanSource, { withFileTypes: true });
    let movedCount = 0;

    for (const ent of entries) {
      const srcItem = path.join(cleanSource, ent.name);
      const dstItem = path.join(cleanTarget, ent.name);

      try {
        await fs.promises.rename(srcItem, dstItem);
      } catch {
        // Cross-device or filesystem lock: fallback to recursive copy + delete
        await fs.promises.cp(srcItem, dstItem, { recursive: true });
        await fs.promises.rm(srcItem, { recursive: true, force: true });
      }
      movedCount++;
    }

    // Attempt to remove empty source directory
    try {
      await fs.promises.rm(cleanSource, { recursive: true, force: true });
    } catch {}

    return {
      success: true,
      movedCount,
      targetPath: cleanTarget,
    };
  });

  // 1. PV Separator
  ipcMain.handle('pv:check-storage-headroom', async (_, targetPath: string) => {
    return await pvEngine.checkStorageHeadroom(targetPath);
  });

  ipcMain.handle('pv:scan', async (_, sourceDir: string, target?: any) => {
    return await pvEngine.scanDirectory(sourceDir, target);
  });

  ipcMain.handle('pv:execute', async (_, sourceDir: string, destDir: string, mode: 'copy' | 'move' | 'delete', target?: any, generateExcel?: boolean) => {
    return await pvEngine.executeSeparation(sourceDir, destDir, mode, target, generateExcel, (prog) => {
      mainWindow?.webContents.send('pv:progress', prog);
    });
  });

  ipcMain.handle('pv:cancel', () => {
    pvEngine.cancel();
  });

  // 2. Photo Matcher
  ipcMain.handle('photo:get-pre-stats', async (_, dirPath: string) => {
    return await photoEngine.getPreStats(dirPath);
  });

  ipcMain.handle('photo:scan', async (_, dirPath: string) => {
    return await photoEngine.scanDirectory(dirPath);
  });

  ipcMain.handle('photo:scan-two-paths', async (_, firstPath: string, secondPath: string, options?: any) => {
    return await photoEngine.scanTwoPaths(firstPath, secondPath, options);
  });

  ipcMain.handle('photo:find-remaining-dir', async (_, selectedDir: string) => {
    return photoEngine.findSiblingRemainingDir(selectedDir);
  });

  ipcMain.handle('photo:execute-rename', async (_, items: any[], dryRun?: boolean) => {
    return await photoEngine.executeRename(items, dryRun);
  });

  // 3. Video Transfer
  ipcMain.handle('video:scan', async (_, videoDir: string, photoDir: string) => {
    return await videoEngine.scanDirectories(videoDir, photoDir);
  });

  ipcMain.handle('video:execute-transfer', async (_, pairs: any[], mode: 'copy' | 'move', collisionPolicy: string) => {
    return await videoEngine.executeTransfer(pairs, mode, collisionPolicy as any, (curr, tot, fn, spd) => {
      mainWindow?.webContents.send('video:progress', curr, tot, fn, spd);
    });
  });

  ipcMain.handle('video:undo-transfer', async (_, manifestPath: string) => {
    return await videoEngine.undoTransfer(manifestPath);
  });

  ipcMain.handle('folder:delete-empty', async (_, folderPath: string) => {
    if (!folderPath) throw new Error('Path is required');
    const cleanPath = path.resolve(folderPath.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanPath)) {
      return { success: true, message: 'Folder already removed' };
    }
    try {
      await shell.trashItem(cleanPath);
      return { success: true, trashed: true };
    } catch {
      await fs.promises.rm(cleanPath, { recursive: true, force: true });
      return { success: true, trashed: false };
    }
  });

  ipcMain.handle('media:read-thumbnail', async (_, filePath: string) => {
    if (!filePath || !filePath.trim()) return null;
    try {
      const cleanPath = path.resolve(filePath.replace(/^file:\/\/\/?/, ''));
      if (!fs.existsSync(cleanPath)) return null;
      const data = await fs.promises.readFile(cleanPath);
      const ext = path.extname(cleanPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${data.toString('base64')}`;
    } catch {
      return null;
    }
  });

  // 4. Thumbnail Separator
  ipcMain.handle('thumb:scan', async (_, sourceDir: string, destDir?: string) => {
    return await thumbEngine.scanDirectory(sourceDir, destDir);
  });

  ipcMain.handle('thumb:execute', async (_, items: any[], destDir: string, mode: 'copy' | 'move') => {
    return await thumbEngine.executeSeparation(items, destDir, mode);
  });

  // 5. Remaining Collector
  ipcMain.handle('remaining:scan', async (_, sourceDir: string, destDir?: string) => {
    return await remainingEngine.scanDirectories(sourceDir, destDir);
  });

  ipcMain.handle('remaining:execute-shift', async (_, items: any[], destDir: string) => {
    return await remainingEngine.executeShift(items, destDir, (curr, tot, fold) => {
      mainWindow?.webContents.send('remaining:progress', curr, tot, fold);
    });
  });

  ipcMain.handle('remaining:undo-shift', async (_, manifestPath: string) => {
    return await remainingEngine.undoShift(manifestPath);
  });

  // 6. Excel Merger (openpyxl 1:1)
  ipcMain.handle('excel:scan-folder', async (_, folderPath: string) => {
    return await excelEngine.scanDirectory(folderPath);
  });

  ipcMain.handle('excel:inspect-files', async (_, filePaths: string[]) => {
    return await excelEngine.inspectFiles(filePaths);
  });

  ipcMain.handle('excel:merge-files', async (_, filePaths: string[], outputPath?: string) => {
    return await excelEngine.mergeFiles(filePaths, outputPath);
  });

  // 7. Standalone Tools
  ipcMain.handle('tools:normalize-extensions', async (_, targetDir: string, dryRun?: boolean) => {
    return await toolsEngine.normalizeExtensions(targetDir, dryRun);
  });

  ipcMain.handle('tools:tag-photo-p', async (_, filePaths: string[]) => {
    return await toolsEngine.tagPhotoSuffixP(filePaths);
  });

  ipcMain.handle('tools:tag-video-v', async (_, filePaths: string[]) => {
    return await toolsEngine.tagVideoThumbSuffixV(filePaths);
  });

  ipcMain.handle('tools:scan-do-not-upload', async (_, targetDir: string) => {
    return await toolsEngine.scanDoNotUpload(targetDir);
  });

  ipcMain.handle('tools:execute-do-not-upload', async (_, items: any[], mode?: any, dryRun?: boolean) => {
    return await toolsEngine.executeDoNotUpload(items, mode, dryRun);
  });

  ipcMain.handle('tools:scan-inventory-reports', async (_, sourceDir: string, destDir?: string) => {
    return await toolsEngine.scanInventoryReports(sourceDir, destDir);
  });

  ipcMain.handle('tools:execute-inventory-reports', async (_, items: any[], destDir: string, mode?: any, dryRun?: boolean) => {
    return await toolsEngine.executeInventoryReports(items, destDir, mode, dryRun);
  });

  // 8. Google Drive
  ipcMain.handle('drive:get-config', () => driveManager.getConfig());
  ipcMain.handle('drive:set-url', (_, type: 'main' | 'thumbnails', url: string) => {
    driveManager.setUrl(type, url);
    return driveManager.getConfig();
  });
  ipcMain.handle('drive:clear-session', async (_, type: 'main' | 'ref') => {
    await driveManager.clearSession(type);
    return true;
  });
  ipcMain.handle('drive:open-external', (_, url: string) => {
    driveManager.openExternal(url);
    return true;
  });

  // 9. Activity & Reports
  ipcMain.handle('activity:log', (_, item: any) => activityManager.logActivity(item));
  ipcMain.handle('reports:log', (_, item: any) => activityManager.logReport(item));
  ipcMain.handle('activity:get-all', () => activityManager.getActivities());
  ipcMain.handle('reports:get-all', () => activityManager.getReports());

  // 10. Event Image Distributor
  ipcMain.handle(
    'event-distributor:scan',
    async (_, targetWorkingDir: string, imagesDirPath: string, excelPath: string) => {
      return await eventDistributorEngine.scanDistributor(targetWorkingDir, imagesDirPath, excelPath);
    }
  );
  ipcMain.handle('event-distributor:execute', async (_, foldersMatched: any[]) => {
    return await eventDistributorEngine.executeDistribution(foldersMatched, (curr, total, msg) => {
      mainWindow?.webContents.send('event-distributor:progress', { curr, total, msg });
    });
  });

  // 11. GitHub Release & MSI Update Checker
  ipcMain.handle('updater:check-github', async () => {
    try {
      const https = await import('https');
      return await new Promise((resolve) => {
        const options = {
          hostname: 'api.github.com',
          path: '/repos/BSFrameWorks5253/MediaFlow-Studio/releases/latest',
          method: 'GET',
          headers: {
            'User-Agent': 'MediaFlow-Studio-Desktop-v4.1',
            'Accept': 'application/vnd.github.v3+json',
          },
        };
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(body);
                const tag = data.tag_name || 'v4.0.0';
                const msiAsset = data.assets?.find((a: any) => a.name.toLowerCase().endsWith('.msi'));
                const exeAsset = data.assets?.find((a: any) => a.name.toLowerCase().endsWith('.exe'));
                resolve({
                  success: true,
                  latestVersion: tag,
                  currentVersion: '4.0.0',
                  hasUpdate: tag.replace('v', '') > '4.0.0',
                  msiUrl: msiAsset ? msiAsset.browser_download_url : data.html_url,
                  exeUrl: exeAsset ? exeAsset.browser_download_url : data.html_url,
                  releasePageUrl: data.html_url,
                  notes: data.body || '',
                  publishedAt: data.published_at,
                });
              } catch (e: any) {
                resolve({ success: false, error: e.message, currentVersion: '4.0.0' });
              }
            } else {
              resolve({
                success: false,
                status: res.statusCode,
                currentVersion: '4.0.0',
                message: 'You are on the latest verified build (v4.0.0).',
              });
            }
          });
        });
        req.on('error', (err) => {
          console.error('[GitHub Update Check Error]:', err);
          resolve({ success: false, error: 'Unable to check for updates. Please check your network connection.', currentVersion: '4.0.0' });
        });
        req.end();
      });
    } catch (e: any) {
      console.error('[GitHub Update Check Exception]:', e);
      return { success: false, error: 'Unable to check for updates at this time.', currentVersion: '4.0.0' };
    }
  });

  ipcMain.handle('updater:open-url', async (_, url: string) => {
    if (url) {
      await shell.openExternal(url);
    }
    return true;
  });

  // Universal Auto-Update Handlers (Blueprint 01)
  ipcMain.handle('updater:check-update', async () => {
    return await WorkstationAutoUpdater.checkForUpdates(mainWindow);
  });

  ipcMain.handle('updater:install-update', async (_, updateInfo: UpdateInfo) => {
    try {
      await WorkstationAutoUpdater.downloadAndInstall(updateInfo, (pct, receivedMB, totalMB) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update:progress', { pct, receivedMB, totalMB });
        }
      });
      return { success: true };
    } catch (e: any) {
      console.error('[AUTO_UPDATER] Install failed:', e);
      return { success: false, error: 'Update installation could not be completed. Please try again.' };
    }
  });
}
