import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';
import os from 'os';
import { PVSeparatorEngine } from './engines/pvSeparator';
import { PhotoMatcherEngine } from './engines/photoMatcher';
import { VideoTransferEngine } from './engines/videoTransfer';
import { ThumbnailSeparatorEngine } from './engines/thumbnailSeparator';
import { RemainingCollectorEngine } from './engines/remainingCollector';
import { ExcelMergerEngine } from './engines/excelMerger';
import { ProductionToolsEngine } from './engines/productionTools';
import { FolderVerifierEngine } from './engines/folderVerifier';
import { MultiZipExtractorEngine } from './engines/multiZipExtractor';
import { GoogleDriveManager } from './engines/../managers/googleDriveManager';
import { ActivityReportsManager } from './engines/../managers/activityReportsManager';
import { EventImageDistributorEngine } from './engines/eventImageDistributor';
import { StatsManager } from './managers/statsManager';
import { EcosystemManager } from './managers/ecosystemManager';
import { resolveChildAppLoaderConfig, showChildAppSplash, closeChildAppSplash, ChildAppLoaderConfig } from './splash';
import { WorkstationAutoUpdater, UpdateInfo } from './managers/autoUpdater';
import { openInEcosystemExplorer, showItemInEcosystemExplorer, openInAfmDualSync, getInstalledAfmPath } from './utils/ecosystemExplorer';
import { inspectDualSync } from './engines/dualSyncInspector';
import { sanitizeBackendError } from './utils/errorSanitizer';

// Windows Taskbar & Action Center Model ID for dedicated window grouping
if (process.platform === 'win32') {
  app.setAppUserModelId('com.burhanuddin.mediaflowstudio');
}

// Windows High-DPI Support for crisp text rendering
app.commandLine.appendSwitch('high-dpi-support', '1');

// Single-Instance Enforcement
// Enable GPU Hardware Acceleration & Instant Window Compositing
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('[INFO] Another instance of MediaFlow Studio is already running.');
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let splashSafetyTimeout: NodeJS.Timeout | null = null;
const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));

export interface AnythingLoaderConfig {
  appId?: string;
  productName?: string;
  versionText?: string;
  tagline?: string;
  artworkUrl?: string;
  artistName?: string;
  artworkTitle?: string;
  durationMs?: number;
  logoText?: string;
  badgeGradient?: string;
  artworkFit?: 'cover' | 'contain';
  artworkPosition?: 'center' | 'top' | 'bottom';
  steps?: string[];
  author?: string;
  contactPhone?: string;
}

function loadAnythingLoaderConfig(forceReload = true): AnythingLoaderConfig {
  const readJson = (p: string): AnythingLoaderConfig | null => {
    try {
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log('[LoaderConfig] Loaded successfully from:', p);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[LoaderConfig] Failed parsing JSON at:', p, e);
    }
    return null;
  };

  // 1. Check CLI argument (--loader-config="<path>")
  const arg = process.argv.find((a) => a.startsWith('--loader-config='));
  if (arg) {
    const rawVal = arg.slice('--loader-config='.length).replace(/^["']|["']$/g, '');
    const cfg = readJson(rawVal);
    if (cfg) return cfg;
  }

  // 2. Check environment variable ANYTHING_LOADER_CONFIG
  if (process.env.ANYTHING_LOADER_CONFIG) {
    const cfg = readJson(process.env.ANYTHING_LOADER_CONFIG);
    if (cfg) return cfg;
  }

  // 3. Search local directories and Anything ecosystem roots
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

  const candidates = [
    path.join(process.cwd(), 'loader-config.json'),
    path.join(__dirname, 'loader-config.json'),
    path.join(__dirname, '../loader-config.json'),
    path.join(app.getAppPath(), 'loader-config.json'),
    path.join(process.resourcesPath || '', 'loader-config.json'),
    'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything\\releases\\mediaflow-studio\\loader-config.json',
    'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\releases\\mediaflow-studio\\loader-config.json',
    'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\releases\\mediaflow-studio\\loader-config.json',
    path.join(appData, 'Anything', 'loaders', 'mediaflow-studio.json'),
    path.join(appData, 'anything', 'loaders', 'mediaflow-studio.json'),
    path.join(localAppData, 'anything', 'loaders', 'mediaflow-studio.json'),
    path.resolve(app.getAppPath(), '..', 'Anything', 'Anything', 'releases', 'mediaflow-studio', 'loader-config.json'),
    path.resolve(app.getAppPath(), '..', 'Anything', 'releases', 'mediaflow-studio', 'loader-config.json')
  ];

  for (const candidate of candidates) {
    const cfg = readJson(candidate);
    if (cfg) return cfg;
  }

  // Default fallback matching Anything ecosystem standards
  return {
    appId: 'mediaflow-studio',
    productName: 'MediaFlow Studio',
    versionText: 'v26.10.30 (x64)',
    tagline: 'Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite',
    artworkUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85',
    artistName: 'Anything Creation',
    artworkTitle: '-Designed by Burhanuddin',
    durationMs: 850,
    logoText: 'Ms',
    badgeGradient: 'from-blue-600 to-indigo-700',
    artworkFit: 'cover',
    artworkPosition: 'center',
    steps: [
      'Initializing Direct3D 12 media ingestion pipeline...',
      'Verifying storage volume headroom and I/O threads...',
      'Loading multi-camera sync & PV separation engine...',
      'Syncing with Anything Ecosystem...',
      'Starting MediaFlow Studio...'
    ],
    author: 'Burhanuddin Sounasath',
    contactPhone: '8369811201'
  };
}

// Initialize Backend Engines
const pvEngine = new PVSeparatorEngine();
const photoEngine = new PhotoMatcherEngine();
const videoEngine = new VideoTransferEngine();
const thumbEngine = new ThumbnailSeparatorEngine();
const remainingEngine = new RemainingCollectorEngine();
const excelEngine = new ExcelMergerEngine();
const toolsEngine = new ProductionToolsEngine();
const folderVerifierEngine = new FolderVerifierEngine();
const multiZipEngine = new MultiZipExtractorEngine();
const driveManager = new GoogleDriveManager();
const activityManager = new ActivityReportsManager();
const eventDistributorEngine = new EventImageDistributorEngine();
const statsManager = new StatsManager();
const ecosystemManager = EcosystemManager.getInstance();
try {
  if (!app.isDefaultProtocolClient('mediaflow')) {
    app.setAsDefaultProtocolClient('mediaflow');
  }
} catch {}

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
  updateMode: 'auto' as 'auto' | 'manual',
  anythingDirPath: 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything',
};

try {
  if (fs.existsSync(configPath)) {
    appConfig = { ...appConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
  }
} catch {}

if (!appConfig.updateMode) appConfig.updateMode = 'auto';
if (!appConfig.anythingDirPath) {
  appConfig.anythingDirPath = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything';
}

function saveAppConfig(newConfig: any) {
  try {
    appConfig = { ...appConfig, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2), 'utf-8');
  } catch {}
}

function createSplashWindow() {
  const iconCandidate1 = path.join(__dirname, '../public/assets/app.ico');
  const iconCandidate2 = path.join(__dirname, '../dist/assets/app.ico');
  const iconCandidate3 = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything\\published-apps\\mediaflow-studio\\app.ico';
  const iconPath = fs.existsSync(iconCandidate1)
    ? iconCandidate1
    : fs.existsSync(iconCandidate2)
    ? iconCandidate2
    : fs.existsSync(iconCandidate3)
    ? iconCandidate3
    : undefined;

  // Standalone Adobe Splash Window: Centered, frameless, 100% transparent desktop background
  splashWindow = new BrowserWindow({
    title: 'MediaFlow Studio',
    width: 740,
    height: 480,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    center: true,
    resizable: false,
    alwaysOnTop: false,
    hasShadow: true,
    show: true, // Only the loader rectangle appears on screen first
    skipTaskbar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      additionalArguments: ['--window-type=splash']
    }
  });

  if (process.platform === 'win32' && iconPath) {
    try {
      splashWindow.setIcon(iconPath);
    } catch {}
  }

  // Navigation Security: Disallow remote top-level navigations
  splashWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  splashWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  splashWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    if (code !== -3) {
      console.warn('[SPLASH] Failed to load splash screen:', code, desc);
      completeSplashHandoff();
    }
  });

  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));
  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    splashWindow.loadURL('http://127.0.0.1:5175?view=splash&window=splash#splash').catch(() => {
      if (fs.existsSync(distHtmlPath)) {
        splashWindow?.loadFile(distHtmlPath, { query: { view: 'splash', window: 'splash' }, hash: 'splash' });
      } else {
        completeSplashHandoff();
      }
    });
  } else {
    if (fs.existsSync(distHtmlPath)) {
      splashWindow.loadFile(distHtmlPath, { query: { view: 'splash', window: 'splash' }, hash: 'splash' });
    } else {
      completeSplashHandoff();
    }
  }

  splashWindow.on('closed', () => {
    splashWindow = null;
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function completeSplashHandoff() {
  if (splashSafetyTimeout) {
    clearTimeout(splashSafetyTimeout);
    splashSafetyTimeout = null;
  }
  closeChildAppSplash();
  if (splashWindow && !splashWindow.isDestroyed()) {
    try {
      splashWindow.destroy();
    } catch (e) {
      console.warn('[SPLASH] Error destroying splashWindow:', e);
    }
    splashWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
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
    title: 'MediaFlow Studio — Creative Production Suite',
    icon: iconPath,
    backgroundColor: '#131722',
    autoHideMenuBar: true,
    show: false, // Absolutely hidden in background until splash handoff finishes
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
      webSecurity: true,
    },
  });

  // Navigation & Link Security: Disallow arbitrary navigation & validate external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const isDevMode = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));
    const isLocalDev = isDevMode && (navigationUrl.includes('localhost') || navigationUrl.includes('127.0.0.1'));
    const expectedFileUrl = pathToFileURL(path.join(__dirname, '../dist/index.html')).toString().toLowerCase();
    const isAppEntry = navigationUrl.toLowerCase() === expectedFileUrl || navigationUrl.toLowerCase().startsWith(expectedFileUrl + '#') || navigationUrl.toLowerCase().startsWith(expectedFileUrl + '?');
    if (!isLocalDev && !isAppEntry) {
      event.preventDefault();
      try {
        const parsed = new URL(navigationUrl);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
          shell.openExternal(navigationUrl);
        }
      } catch {}
    }
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
    if (code !== -3 && validatedURL && (validatedURL.includes('5175') || validatedURL.includes('5173') || validatedURL.includes('localhost'))) {
      console.log('[FALLBACK] Dev server unreachable, falling back to local dist bundle');
      loadFallbackBundle();
    }
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[RENDERER_CONSOLE] [L${line}] ${message} (${sourceId})`);
  });

  mainWindow.once('ready-to-show', () => {
    if (isDev) {
      completeSplashHandoff();
    } else {
      setTimeout(() => {
        completeSplashHandoff();
      }, 700);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[LOAD_SUCCESS] Window webContents finished loading');
    mainWindow?.webContents.executeJavaScript(`
      console.log("[INSPECT] Root HTML length:", document.getElementById('root')?.innerHTML.length);
      console.log("[INSPECT] electronAPI available:", typeof window.electronAPI);
      console.log("[INSPECT] document title:", document.title);
    `).catch(err => console.error('[INSPECT_ERR]', err));

    // Non-blocking auto-update check 6 seconds after boot (controlled by updateMode)
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (appConfig.updateMode === 'manual') {
          console.log('[AUTO_UPDATER] Update mode is configured as MANUAL. Skipping background startup check.');
          return;
        }
        console.log('[AUTO_UPDATER] Auto update mode active. Querying Anything Hub and release endpoints...');
        WorkstationAutoUpdater.checkForUpdates(mainWindow, appConfig.anythingDirPath).catch((e) =>
          console.warn('[AUTO_UPDATER] Background check error:', e)
        );
      }
    }, 6000);
  });

  if (isDev) {
    console.log('[DEV_LOAD] Attempting connection to dev server: http://127.0.0.1:5175');
    mainWindow.loadURL('http://127.0.0.1:5175').catch((err) => {
      console.warn('[DEV_LOAD_WARN] Failed to load 127.0.0.1:5175, loading local bundle:', err);
      loadFallbackBundle();
    });
  } else {
    loadFallbackBundle();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  });
}

app.on('second-instance', (_event, argv) => {
  if (Array.isArray(argv)) {
    ecosystemManager.parseInitialArgv(argv);
    const intent = ecosystemManager.getCliLaunchIntent();
    if (intent.imagesDir) {
      saveAppConfig({ eventImagesDirPath: intent.imagesDir });
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ecosystem:remote-link', {
        page: intent.page || 'eventDistributor',
        imagesDir: intent.imagesDir,
      });
    }
  }
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
  createSplashWindow();
  createWindow();

  const loaderCfg = loadAnythingLoaderConfig();
  const splashDuration = loaderCfg.durationMs || 2800;
  // Safety fallback: ensure main window reveals even if splash hangs, with buffer
  splashSafetyTimeout = setTimeout(() => {
    completeSplashHandoff();
  }, isDev ? 1800 : 2500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Splash Screen Lifecycle & Anything Ecosystem Customization
    ipcMain.handle('userProfile:load', async () => {
    try {
      const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : '');
      const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
      const candidates = [
        path.join(appData, 'Anything', 'ecosystem_session.json'),
        path.join(appData, 'anything', 'ecosystem_session.json'),
        path.join(localAppData, 'anything', 'ecosystem_session.json'),
        path.join(app.getPath('userData'), 'ecosystem_session.json'),
        'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\ecosystem_session.json',
        'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything\\ecosystem_session.json',
        'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything Apps\\ecosystem_session.json',
        path.resolve(app.getAppPath(), '..', '..', 'ecosystem_session.json'),
        path.resolve(app.getAppPath(), '..', 'ecosystem_session.json'),
        path.join(process.cwd(), 'ecosystem_session.json'),
      ];

      let sessUser: any = null;
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            const sess = JSON.parse(fs.readFileSync(p, 'utf-8'));
            if (sess?.user) {
              sessUser = sess.user;
              break;
            }
          } catch {}
        }
      }

      for (const arg of process.argv) {
        if (arg.startsWith('--ecosystem-user-name=') || arg.startsWith('--user-name=')) {
          const name = decodeURIComponent(arg.split('=')[1] || '');
          if (name) sessUser = { ...sessUser, name };
        } else if (arg.startsWith('--ecosystem-user-email=') || arg.startsWith('--user-email=')) {
          const email = arg.split('=')[1] || '';
          if (email) sessUser = { ...sessUser, email };
        } else if (arg.startsWith('--ecosystem-user-id=') || arg.startsWith('--user-id=')) {
          const id = arg.split('=')[1] || '';
          if (id) sessUser = { ...sessUser, id };
        } else if (arg.startsWith('--ecosystem-user-handle=') || arg.startsWith('--user-handle=')) {
          const username = arg.split('=')[1] || '';
          if (username) sessUser = { ...sessUser, username };
        } else if (arg.startsWith('--ecosystem-user-avatar=') || arg.startsWith('--user-avatar=')) {
          const avatar = decodeURIComponent(arg.split('=')[1] || '');
          if (avatar) sessUser = { ...sessUser, avatar };
        }
      }

      if (sessUser) {
        const resolvedAvatar = sessUser.avatar || null;
        return {
          name: sessUser.name || 'Creative Member',
          email: sessUser.email || '',
          username: sessUser.username || (sessUser.email ? sessUser.email.split('@')[0] : 'creator'),
          userId: sessUser.username || sessUser.id || 'creator',
          avatar: resolvedAvatar,
          avatarBase64: resolvedAvatar,
          role: sessUser.role || 'member'
        };
      }

      if (process.env.ANYTHING_USER_ID || process.env.ANYTHING_USER_NAME) {
        const resolvedAvatar = process.env.ANYTHING_USER_AVATAR || null;
        return {
          name: process.env.ANYTHING_USER_NAME || 'Creative Member',
          email: process.env.ANYTHING_USER_EMAIL || '',
          username: process.env.ANYTHING_USER_HANDLE || process.env.ANYTHING_USER_ID || 'creator',
          userId: process.env.ANYTHING_USER_HANDLE || process.env.ANYTHING_USER_ID || 'creator',
          avatar: resolvedAvatar,
          avatarBase64: resolvedAvatar,
          role: process.env.ANYTHING_USER_ROLE || 'member'
        };
      }

      return {
        name: 'Master Architect',
        email: 'admin@anything.local',
        username: 'admin',
        userId: 'admin',
        avatar: null,
        avatarBase64: null,
        role: 'admin'
      };
    } catch (e) {
      return {
        name: 'Master Architect',
        email: 'admin@anything.local',
        username: 'admin',
        userId: 'admin',
        avatar: null,
        avatarBase64: null,
        role: 'admin'
      };
    }
  });

  ipcMain.handle('splash:getLoaderConfig', async () => resolveChildAppLoaderConfig('mediaflow-studio', 'MediaFlow Studio'));
  ipcMain.handle('splash:saveLoaderConfig', async (_, cfg) => {
    try {
      const targets = [
        path.join(process.cwd(), 'loader-config.json'),
        path.join(app.getAppPath(), 'loader-config.json'),
        path.join(app.getPath('userData'), 'loader-config.json'),
        path.join(process.env.APPDATA || '', 'anything', 'loaders', 'mediaflow-studio.json'),
        path.join(process.env.APPDATA || '', 'Anything', 'loaders', 'mediaflow-studio.json'),
        'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything\\releases\\mediaflow-studio\\loader-config.json',
        'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\releases\\mediaflow-studio\\loader-config.json',
      ];
      for (const t of targets) {
        try {
          const parent = path.dirname(t);
          if (fs.existsSync(parent)) {
            fs.writeFileSync(t, JSON.stringify(cfg, null, 2), 'utf-8');
          }
        } catch {}
      }
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash:loaderConfigUpdated', cfg);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('splash:loaderConfigUpdated', cfg);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('splash:done', async () => {
    completeSplashHandoff();
    return true;
  });
  ipcMain.handle('splash:pickCustomArtwork', async () => {
    const parentWin = mainWindow || splashWindow;
    if (!parentWin) return null;
    const res = await dialog.showOpenDialog(parentWin, {
      title: 'Select Custom Splash Artwork',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'] }],
      properties: ['openFile']
    });
    return res.canceled ? null : res.filePaths[0];
  });

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

  // Native Dialog Helper: reliably acquire active focused window
  const getDialogParentWin = (event?: Electron.IpcMainInvokeEvent): BrowserWindow | undefined => {
    if (event?.sender) {
      const fromSender = BrowserWindow.fromWebContents(event.sender);
      if (fromSender && !fromSender.isDestroyed()) return fromSender;
    }
    if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
    const focused = BrowserWindow.getFocusedWindow();
    return (focused && !focused.isDestroyed()) ? focused : undefined;
  };

  // Native Dialogs
  ipcMain.handle('dialog:select-directory', async (event, title?: string, startDir?: string) => {
    const parentWin = getDialogParentWin(event);
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.focus();
    }
    const res = await dialog.showOpenDialog(parentWin as any, {
      title: title || 'Select Directory',
      defaultPath: startDir || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
    return res.canceled ? '' : res.filePaths[0];
  });

  ipcMain.handle('dialog:select-directories', async (event, title?: string, startDir?: string) => {
    const parentWin = getDialogParentWin(event);
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.focus();
    }
    const res = await dialog.showOpenDialog(parentWin as any, {
      title: title || 'Select Folders',
      defaultPath: startDir || undefined,
      properties: ['openDirectory', 'multiSelections'],
    });
    return res.canceled ? [] : res.filePaths;
  });

  ipcMain.handle('dialog:select-open-file', async (event, title?: string, filter?: any) => {
    const parentWin = getDialogParentWin(event);
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.focus();
    }
    const res = await dialog.showOpenDialog(parentWin as any, {
      title: title || 'Select File',
      filters: filter || [],
      properties: ['openFile'],
    });
    return res.canceled ? '' : res.filePaths[0];
  });


  ipcMain.handle('dialog:select-open-files', async (event, title?: string, filter?: any) => {
    const parentWin = getDialogParentWin(event);
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.focus();
    }
    const res = await dialog.showOpenDialog(parentWin as any, {
      title: title || 'Select Files',
      filters: filter || [],
      properties: ['openFile', 'multiSelections'],
    });
    return res.canceled ? [] : res.filePaths;
  });

  ipcMain.handle('dialog:select-save-file', async (event, title?: string, filter?: any) => {
    const parentWin = getDialogParentWin(event);
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.focus();
    }
    const res = await dialog.showSaveDialog(parentWin as any, {
      title: title || 'Save File',
      filters: filter || [],
    });
    return res.canceled ? '' : res.filePath;
  });

  ipcMain.handle('shell:open-path', async (_, targetPath: string) => {
    if (!targetPath || !targetPath.trim()) return 'No path provided';
    const ok = await openInEcosystemExplorer(targetPath);
    return ok ? '' : `Unable to open path: ${targetPath}`;
  });

  ipcMain.handle('shell:show-item-in-folder', async (_, targetPath: string) => {
    if (!targetPath || !targetPath.trim()) return;
    await showItemInEcosystemExplorer(targetPath);
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

  // Upload Structure Generator (Standardized 3-Branch Architecture per Studio Spec)
  ipcMain.handle('workspace:create-upload-structure', async (_, baseDir: string, safarName: string, dateFolderName?: string, projectName?: string) => {
    if (!baseDir || !baseDir.trim()) {
      throw new Error('Base destination directory must be selected.');
    }
    const cleanSafar = (safarName || '').trim().replace(/[<>:"/\\|?*]/g, '_');
    if (!cleanSafar) {
      throw new Error('Valid Safar name must be provided.');
    }

    const cleanProject = (projectName || '').trim().replace(/[<>:"/\\|?*]/g, '_');
    const cleanBase = path.resolve(baseDir.replace(/^file:\/\/\/?/, ''));
    const safarRoot = path.join(cleanBase, cleanProject || cleanSafar);
    const mainDataPath = path.join(safarRoot, 'Main Data', cleanSafar);
    const thumbnailPath = path.join(safarRoot, 'Thumbnail', cleanSafar);
    const remainingPath = path.join(safarRoot, 'Remaining');

    fs.mkdirSync(mainDataPath, { recursive: true });
    fs.mkdirSync(thumbnailPath, { recursive: true });
    fs.mkdirSync(remainingPath, { recursive: true });

    let mainDataDatePath = '';
    let thumbnailDatePath = '';
    let remainingDatePath = '';

    if (dateFolderName && dateFolderName.trim()) {
      const cleanDate = dateFolderName.trim().replace(/[<>:"/\\|?*]/g, '_');
      mainDataDatePath = path.join(mainDataPath, cleanDate);
      thumbnailDatePath = path.join(thumbnailPath, cleanDate);
      remainingDatePath = path.join(remainingPath, cleanDate);

      fs.mkdirSync(mainDataDatePath, { recursive: true });
      fs.mkdirSync(thumbnailDatePath, { recursive: true });
      fs.mkdirSync(remainingDatePath, { recursive: true });
    }

    return {
      safarRoot,
      projectName: cleanProject || cleanSafar,
      mainDataPath,
      thumbnailPath,
      thumbnailsPath: thumbnailPath, // backward compatibility
      remainingPath,
      mainDataDatePath,
      thumbnailDatePath,
      remainingDatePath,
      safarName: cleanSafar,
      dateFolderName: dateFolderName || '',
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

  ipcMain.handle('media:list-folder-images', async (_, folderPath: string) => {
    if (!folderPath || !folderPath.trim()) return [];
    try {
      const cleanPath = path.resolve(folderPath.replace(/^file:\/\/\/?/, ''));
      if (!fs.existsSync(cleanPath)) return [];
      const validExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.arw', '.cr2', '.cr3', '.nef']);
      const entries = await fs.promises.readdir(cleanPath, { withFileTypes: true });
      const images: { fileName: string; filePath: string; sizeBytes: number; mtime: number }[] = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (validExts.has(ext)) {
            const fullPath = path.join(cleanPath, entry.name);
            const stat = await fs.promises.stat(fullPath);
            images.push({
              fileName: entry.name,
              filePath: fullPath,
              sizeBytes: stat.size,
              mtime: stat.mtimeMs,
            });
          }
        }
      }
      return images;
    } catch {
      return [];
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

  // 7b. Folder Verification & Clipboard
  ipcMain.handle('folder-verifier:verify-folders', async (_, folderPaths: string[], customNote?: string) => {
    try {
      return await folderVerifierEngine.verifyFolders(folderPaths || [], customNote || '');
    } catch (err: any) {
      console.error('[FolderVerifier] Verification failed:', err);
      throw new Error(sanitizeBackendError(err, 'Failed to complete folder verification.'));
    }
  });

  ipcMain.handle('clipboard:write-text', async (_, text: string) => {
    if (typeof text === 'string') {
      clipboard.writeText(text);
      return true;
    }
    return false;
  });

  // 7c. Multi-Part Zip & Google Drive Archive Extractor
  ipcMain.handle('zip:scan-multipart-dir', async (_, dirPath: string) => {
    try {
      return await multiZipEngine.scanDirectoryForZipSets(dirPath || '');
    } catch (err: any) {
      console.error('[MultiZip] Directory scan failed:', err);
      throw new Error(sanitizeBackendError(err, 'Failed to scan directory for multi-part archives.'));
    }
  });

  ipcMain.handle('zip:scan-multipart-files', async (_, zipFiles: string[]) => {
    try {
      return await multiZipEngine.scanZipFiles(zipFiles || []);
    } catch (err: any) {
      console.error('[MultiZip] Zip files scan failed:', err);
      throw new Error(sanitizeBackendError(err, 'Failed to inspect multi-part archives.'));
    }
  });

  ipcMain.handle('zip:extract-multipart', async (event, options: { zipPaths: string[]; outputDir: string; flattenOuter?: boolean }) => {
    try {
      return await multiZipEngine.extractMultiPart(
        options.zipPaths || [],
        options.outputDir || '',
        options.flattenOuter !== false,
        (progress) => {
          try {
            event.sender.send('zip:progress', progress);
          } catch {}
        }
      );
    } catch (err: any) {
      console.error('[MultiZip] Extraction failed:', err);
      throw new Error(sanitizeBackendError(err, 'Failed to extract multi-part zip archives.'));
    }
  });

  // 7d. Anything Ecosystem Dual Sync Launch & Inspection
  ipcMain.handle('ecosystem:check-afm', () => {
    const afmPath = getInstalledAfmPath();
    return { installed: !!afmPath, path: afmPath };
  });

  ipcMain.handle('ecosystem:inspect-dual-sync', async (_, options) => {
    return await inspectDualSync(options || {});
  });

  ipcMain.handle('ecosystem:open-dual-sync', async (_, options) => {
    return await openInAfmDualSync(options || {});
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

  // 11. Ecosystem Update Checker (Anything Hub & GitHub)
  ipcMain.handle('updater:check-github', async () => {
    try {
      const res = await WorkstationAutoUpdater.checkForUpdates(mainWindow, appConfig.anythingDirPath);
      return res || {
        success: true,
        currentVersion: app.getVersion() || '6.0.0',
        latestVersion: app.getVersion() || '6.0.0',
        hasUpdate: false,
        source: 'anything-catalog',
        notes: 'Up to date.',
      };
    } catch (e: any) {
      console.error('[Update Check Exception]:', e);
      return { success: false, error: 'Unable to check for updates at this time.', currentVersion: app.getVersion() || '6.0.0' };
    }
  });

  ipcMain.handle('updater:open-url', async (_, url: string) => {
    if (url && typeof url === 'string') {
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          await shell.openExternal(url.trim());
        }
      } catch {}
    }
    return true;
  });

  // Universal Auto-Update Handlers (Anything Ecosystem & GitHub)
  ipcMain.handle('updater:check-update', async () => {
    return await WorkstationAutoUpdater.checkForUpdates(mainWindow, appConfig.anythingDirPath);
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

  // 13. Production Safar & Date Stats Manager
  ipcMain.handle('stats:get-all', () => statsManager.getStats());
  ipcMain.handle('stats:get-recents', (_, limit?: number) => statsManager.getRecentSafars(limit));
  ipcMain.handle('stats:find-safars', (_, query: string) => statsManager.findSafars(query));
  ipcMain.handle(
    'stats:scan-date',
    async (
      _,
      dateFolderPath: string,
      customSafarName?: string,
      customRemainingPath?: string,
      customThumbnailsPath?: string
    ) => {
      return await statsManager.scanDateFolder(
        dateFolderPath,
        customSafarName,
        customRemainingPath,
        customThumbnailsPath
      );
    }
  );
  ipcMain.handle('stats:scan-safar', async (_, safarFolderPath: string) => {
    return await statsManager.scanSafarFolder(safarFolderPath);
  });
  ipcMain.handle('stats:save-date', async (_, safarName: string, safarRoot: string, dateStat: any) => {
    return await statsManager.addOrUpdateDateToSafar(safarName, safarRoot, dateStat);
  });
  ipcMain.handle('stats:save-safar', async (_, record: any) => {
    return await statsManager.saveSafarRecord(record);
  });
  ipcMain.handle('stats:delete-date', (_, safarId: string, dateId: string) => {
    return statsManager.deleteDate(safarId, dateId);
  });
  ipcMain.handle('stats:delete-safar', (_, safarId: string) => {
    return statsManager.deleteSafar(safarId);
  });
  ipcMain.handle('stats:export', (_, format: 'json' | 'csv') => {
    return statsManager.exportStats(format);
  });

  // 13. Anything Ecosystem Integration & Cross-App Linking
  ipcMain.handle('ecosystem:get-linked-event-folder', async () => {
    return ecosystemManager.getLinkedEventFolder(appConfig.eventImagesDirPath);
  });
  ipcMain.handle('ecosystem:set-linked-event-folder', async (_, folderPath: string) => {
    const status = ecosystemManager.saveLinkedEventFolder(folderPath);
    if (status.path) {
      saveAppConfig({ eventImagesDirPath: status.path });
    }
    return status;
  });
  ipcMain.handle('ecosystem:inspect-folder', async (_, folderPath: string) => {
    return ecosystemManager.inspectFolder(folderPath);
  });
  ipcMain.handle('ecosystem:sync-with-anything', async () => {
    const status = ecosystemManager.getLinkedEventFolder();
    if (status.path && status.exists) {
      saveAppConfig({ eventImagesDirPath: status.path });
    }
    return status;
  });
}
