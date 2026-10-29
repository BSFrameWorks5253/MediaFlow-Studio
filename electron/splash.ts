import fs from 'fs';
import path from 'path';
import os from 'os';
import { app, BrowserWindow, screen } from 'electron';

export interface ChildAppLoaderConfig {
  appId: string;
  enabled?: boolean;
  artworkUrl?: string;
  productName?: string;
  versionText?: string;
  tagline?: string;
  artistName?: string;
  artworkTitle?: string;
  durationMs?: number;
  logoText?: string;
  badgeGradient?: string;
  artworkFit?: 'cover' | 'contain';
  artworkPosition?: string;
  author?: string;
  contactPhone?: string;
}

let splashWindow: BrowserWindow | null = null;
let splashTimer: NodeJS.Timeout | null = null;

/**
 * Resolves the dynamic loader configuration for this child app.
 * Target: 'mediaflow-studio'
 */
export function resolveChildAppLoaderConfig(appId = 'mediaflow-studio', fallbackAppName = 'MediaFlow Studio'): ChildAppLoaderConfig {
  const defaultFallback: ChildAppLoaderConfig = {
    appId,
    enabled: true,
    productName: fallbackAppName,
    versionText: `v${(app && typeof app.getVersion === 'function' ? app.getVersion() : '26.10.30')} (x64)`,
    tagline: 'Professional Media Ingestion, Synchronization and Report Fusion Suite',
    artistName: 'Anything Creation',
    artworkTitle: '-Designed by Burhanuddin',
    durationMs: 2600,
    logoText: 'Ms',
    badgeGradient: 'linear-gradient(135deg, #00F2FE 0%, #4F46E5 100%)',
    artworkUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85',
    artworkFit: 'cover',
    artworkPosition: 'center',
    author: 'Burhanuddin Sounasath',
    contactPhone: '8369811201',
  };

  const readJson = (p: string): Partial<ChildAppLoaderConfig> | null => {
    try {
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log('[UniversalLoader] Loaded configuration from:', p);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[UniversalLoader] Failed reading JSON at:', p, e);
    }
    return null;
  };

  // 1. Check CLI argument --loader-config="<path>"
  for (const arg of process.argv) {
    if (arg.startsWith('--loader-config=')) {
      const cfgPath = arg.replace('--loader-config=', '').replace(/^["']|["']$/g, '');
      const parsed = readJson(cfgPath);
      if (parsed) return { ...defaultFallback, ...parsed };
    }
  }

  // 2. Check environment variable ANYTHING_LOADER_CONFIG
  if (process.env.ANYTHING_LOADER_CONFIG) {
    const parsed = readJson(process.env.ANYTHING_LOADER_CONFIG);
    if (parsed) return { ...defaultFallback, ...parsed };
  }

  // 3. Check Global Anything Ecosystem Loaders Directory
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

  const candidateGlobalPaths = [
    path.join(appData, 'Anything', 'loaders', `${appId}.json`),
    path.join(appData, 'anything', 'loaders', `${appId}.json`),
    path.join(localAppData, 'anything', 'loaders', `${appId}.json`),
  ];

  for (const p of candidateGlobalPaths) {
    const parsed = readJson(p);
    if (parsed) return { ...defaultFallback, ...parsed };
  }

  // 4. Check bundled or local release loader-config.json
  const candidateLocalPaths = [
    (app && typeof app.getAppPath === 'function' ? path.join(app.getAppPath(), 'loader-config.json') : path.join(process.cwd(), 'loader-config.json')),
    path.join(process.resourcesPath || '', 'loader-config.json'),
    path.join(__dirname, '..', 'loader-config.json'),
    path.join(__dirname, 'loader-config.json'),
    path.join(process.cwd(), 'loader-config.json'),
    'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\releases\\mediaflow-studio\\loader-config.json',
    'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\New folder (2)\\Anything\\releases\\mediaflow-studio\\loader-config.json',
  ];

  for (const p of candidateLocalPaths) {
    const parsed = readJson(p);
    if (parsed) return { ...defaultFallback, ...parsed };
  }

  return defaultFallback;
}

/**
 * Normalizes CSS gradient or Tailwind-like gradient strings to valid CSS background
 */
function normalizeBadgeGradient(grad?: string): string {
  if (!grad) return 'linear-gradient(135deg, #00F2FE 0%, #4F46E5 100%)';
  if (grad.startsWith('linear-gradient') || grad.startsWith('radial-gradient') || grad.startsWith('#') || grad.startsWith('rgb')) {
    return grad;
  }
  if (grad.includes('from-red') || grad.includes('via-rose')) {
    return 'linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #f59e0b 100%)';
  }
  if (grad.includes('from-blue') || grad.includes('to-indigo')) {
    return 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)';
  }
  if (grad.includes('from-emerald') || grad.includes('to-teal')) {
    return 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)';
  }
  return 'linear-gradient(135deg, #00F2FE 0%, #4F46E5 100%)';
}

/**
 * Creates and displays the Apple / Adobe Creative Cloud quality Liquid Glass Splash Window
 */
export function showChildAppSplash(
  config: ChildAppLoaderConfig,
  onFinished: () => void
): BrowserWindow | null {
  if (config.enabled === false) {
    onFinished();
    return null;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const splashWidth = 720;
  const splashHeight = 440;

  const iconCandidate1 = path.join(__dirname, '../public/assets/app.ico');
  const iconCandidate2 = path.join(__dirname, '../dist/assets/app.ico');
  const iconCandidate3 = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\published-apps\\mediaflow-studio\\app.ico';
  const iconPath = fs.existsSync(iconCandidate1)
    ? iconCandidate1
    : fs.existsSync(iconCandidate2)
    ? iconCandidate2
    : fs.existsSync(iconCandidate3)
    ? iconCandidate3
    : undefined;

  splashWindow = new BrowserWindow({
    width: splashWidth,
    height: splashHeight,
    x: Math.round((screenWidth - splashWidth) / 2),
    y: Math.round((screenHeight - splashHeight) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    icon: iconPath,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const duration = config.durationMs || 2600;
  const badgeGrad = normalizeBadgeGradient(config.badgeGradient);
  const artworkFit = config.artworkFit || 'cover';
  const artworkPos = config.artworkPosition || 'center';

  const splashHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${config.productName || 'MediaFlow Studio'} Loader</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      overflow: hidden;
    }
    .splash-card {
      width: ${splashWidth}px;
      height: ${splashHeight}px;
      border-radius: 20px;
      position: relative;
      overflow: hidden;
      background: #0b0d14;
      box-shadow: 0 30px 70px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .artwork-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: ${artworkFit};
      object-position: ${artworkPos};
      opacity: 0.65;
      filter: saturate(1.15) contrast(1.05);
      transform: scale(1.02);
      transition: transform 6s cubic-bezier(0.1, 0, 0.2, 1);
    }
    .vignette {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(11, 13, 20, 0.25) 0%, rgba(11, 13, 20, 0.8) 70%, rgba(11, 13, 20, 0.98) 100%);
      pointer-events: none;
    }
    .content-top {
      position: relative;
      z-index: 10;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-cluster {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .monogram-box {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: ${badgeGrad};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 19px;
      letter-spacing: -0.03em;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .title-group h1 {
      color: #ffffff;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .version-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e2e8f0;
      backdrop-filter: blur(8px);
    }
    .title-group p {
      color: rgba(255, 255, 255, 0.72);
      font-size: 12px;
      font-weight: 500;
      margin-top: 3px;
      max-width: 520px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .content-bottom {
      position: relative;
      z-index: 10;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .meta-credits {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.65);
      font-weight: 500;
    }
    .meta-credits .artist {
      color: #38bdf8;
      font-weight: 600;
    }
    .progress-bar-bg {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #00f2fe, #38bdf8, #818cf8, #c084fc);
      border-radius: 9999px;
      animation: loadFill ${Math.max(1600, duration - 350)}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.6);
    }
    @keyframes loadFill {
      0% { width: 0%; }
      35% { width: 50%; }
      75% { width: 85%; }
      100% { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="splash-card">
    <img class="artwork-bg" src="${config.artworkUrl || ''}" alt="Artwork" />
    <div class="vignette"></div>

    <div class="content-top">
      <div class="brand-cluster">
        <div class="monogram-box">${config.logoText || 'MF'}</div>
        <div class="title-group">
          <h1>
            <span>${config.productName || 'MediaFlow Studio'}</span>
            <span class="version-pill">${config.versionText || 'v26.10.30'}</span>
          </h1>
          <p>${config.tagline || 'Professional Media Ingestion, Synchronization and Report Fusion Suite'}</p>
        </div>
      </div>
    </div>

    <div class="content-bottom">
      <div class="meta-credits">
        <span>${config.artworkTitle || 'Master Edition'}</span>
        <span class="artist">${config.artistName || 'Anything Ecosystem'}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill"></div>
      </div>
    </div>
  </div>
</body>
</html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });

  splashTimer = setTimeout(() => {
    closeChildAppSplash();
    onFinished();
  }, duration);

  return splashWindow;
}

export function closeChildAppSplash(): void {
  if (splashTimer) {
    clearTimeout(splashTimer);
    splashTimer = null;
  }
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
}

export function getChildAppSplash(): BrowserWindow | null {
  return splashWindow;
}

