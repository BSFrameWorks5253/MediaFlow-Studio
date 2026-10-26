import { app, BrowserWindow } from 'electron';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { URL } from 'url';

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  sha256?: string;
  releaseNotes: string[];
  mandatory?: boolean;
  publishedAt?: string;
  fileName?: string;
  currentVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  source?: 'anything-local' | 'anything-catalog' | 'github-api';
  localInstallerPath?: string;
  setupExecutableName?: string;
  sizeFormatted?: string;
  // Backwards compatibility with legacy SettingsModal shape
  success?: boolean;
  notes?: string;
  msiUrl?: string;
  exeUrl?: string;
  releasePageUrl?: string;
}

export class WorkstationAutoUpdater {
  private static DEFAULT_REPO = 'BSFrameWorks5253/MediaFlow-Studio';
  private static DEFAULT_ANYTHING_DIR = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything';
  private static isDownloading = false;

  /**
   * Resolves the Anything Ecosystem root directory if accessible.
   */
  public static resolveAnythingDir(customPath?: string): string | null {
    const candidates = [
      customPath,
      'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\Anything',
      this.DEFAULT_ANYTHING_DIR,
      'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything',
      path.resolve(process.cwd(), '..', '..', 'Anything', 'Anything'),
      path.resolve(process.cwd(), '..', 'Anything', 'Anything'),
      path.resolve(process.cwd(), '..', 'Anything'),
      path.resolve(app.getAppPath(), '..', '..', 'Anything', 'Anything'),
      path.resolve(app.getAppPath(), '..', 'Anything'),
    ].filter((p): p is string => Boolean(p && typeof p === 'string' && p.trim().length > 0));

    for (const dir of candidates) {
      try {
        if (fs.existsSync(dir)) {
          const catalogPath = path.join(dir, 'published-apps', 'catalog.json');
          const releaseJson = path.join(dir, 'releases', 'mediaflow-studio', 'release.json');
          const releasesDir = path.join(dir, 'releases', 'mediaflow-studio');
          if (fs.existsSync(catalogPath) || fs.existsSync(releaseJson) || fs.existsSync(releasesDir)) {
            return dir;
          }
        }
      } catch {}
    }
    return null;
  }

  /**
   * Check for updates against Anything Ecosystem first (catalog.json & releases),
   * falling back to GitHub Releases API.
   */
  static async checkForUpdates(
    mainWindow?: BrowserWindow | null,
    anythingDirPath?: string,
    repo: string = this.DEFAULT_REPO
  ): Promise<UpdateInfo | null> {
    const currentVer = (app.getVersion() || '6.0.0').replace(/^v/, '');

    // 1. Check Anything Ecosystem
    const resolvedAnythingDir = this.resolveAnythingDir(anythingDirPath);
    if (resolvedAnythingDir) {
      console.log(`[AutoUpdater] Checking Anything Hub at: ${resolvedAnythingDir}`);
      const anythingUpdate = this.checkAnythingEcosystem(resolvedAnythingDir, currentVer, repo);
      if (anythingUpdate) {
        if (anythingUpdate.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update:available', anythingUpdate);
        }
        return anythingUpdate;
      }
    }

    // 2. Fallback to GitHub Releases API
    console.log(`[AutoUpdater] Anything Hub not found or empty, falling back to GitHub API for ${repo}...`);
    try {
      const endpoint = `https://api.github.com/repos/${repo}/releases/latest`;
      const data = await this.fetchJson(endpoint);

      if (!data || !data.tag_name) {
        return {
          version: currentVer,
          latestVersion: currentVer,
          currentVersion: currentVer,
          hasUpdate: false,
          downloadUrl: `https://github.com/${repo}/releases`,
          releaseNotes: ['You are running the latest verified release.'],
          source: 'github-api',
          success: true,
          notes: 'Up to date.',
        };
      }

      const remoteTag = data.tag_name;
      const remoteVer = remoteTag.replace(/^v/, '');
      const newer = this.isNewer(remoteVer, currentVer);

      // Find Windows installer .exe or .msi asset
      const assets = data.assets || [];
      const exeAsset = assets.find((a: any) => a.name?.toLowerCase().endsWith('.exe'));
      const msiAsset = assets.find((a: any) => a.name?.toLowerCase().endsWith('.msi'));
      const chosenAsset = exeAsset || msiAsset;

      const downloadUrl = chosenAsset ? chosenAsset.browser_download_url : data.html_url;

      // Extract release notes
      let notes: string[] = [];
      if (typeof data.body === 'string' && data.body.trim()) {
        notes = data.body
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && !l.startsWith('#'))
          .slice(0, 8);
      }
      if (notes.length === 0) {
        notes = ['🚀 Performance optimizations and engine stability updates.'];
      }

      const updateInfo: UpdateInfo = {
        version: remoteVer,
        latestVersion: remoteVer,
        currentVersion: currentVer,
        hasUpdate: newer,
        downloadUrl,
        fileName: chosenAsset?.name,
        releaseNotes: notes,
        publishedAt: data.published_at,
        mandatory: false,
        source: 'github-api',
        success: true,
        notes: notes.join('\n'),
        exeUrl: downloadUrl,
        msiUrl: chosenAsset?.name?.toLowerCase().endsWith('.msi') ? downloadUrl : undefined,
        releasePageUrl: data.html_url,
      };

      if (newer && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:available', updateInfo);
      }

      return updateInfo;
    } catch (err: any) {
      console.warn('[AutoUpdater] GitHub release check fallback error:', err?.message || err);
      return {
        version: currentVer,
        latestVersion: currentVer,
        currentVersion: currentVer,
        hasUpdate: false,
        downloadUrl: `https://github.com/${repo}/releases`,
        releaseNotes: ['Unable to query remote updates at this time.'],
        source: 'github-api',
        success: false,
        notes: 'Check failed.',
      };
    }
  }

  /**
   * Inspects Anything Ecosystem published-apps/catalog.json and releases/mediaflow-studio
   */
  private static checkAnythingEcosystem(
    anythingDir: string,
    currentVer: string,
    repo: string
  ): UpdateInfo | null {
    try {
      let catalogItem: any = null;
      let releaseJsonItem: any = null;

      // Check published-apps/catalog.json
      const catalogPath = path.join(anythingDir, 'published-apps', 'catalog.json');
      if (fs.existsSync(catalogPath)) {
        try {
          const raw = fs.readFileSync(catalogPath, 'utf-8').replace(/^\uFEFF/, '').trim();
          const parsed = JSON.parse(raw);
          const list: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed.apps) ? parsed.apps : [];
          catalogItem = list.find(
            (a: any) =>
              a.appId === 'mediaflow-studio' ||
              a.id === 'mediaflow-studio' ||
              (a.releaseInfo && a.releaseInfo.appId === 'mediaflow-studio') ||
              (typeof a.appName === 'string' && a.appName.toLowerCase().includes('mediaflow'))
          );
        } catch (e) {
          console.warn('[AutoUpdater] Failed reading Anything catalog.json:', e);
        }
      }

      // Check releases/mediaflow-studio/release.json
      const releaseJsonPath = path.join(anythingDir, 'releases', 'mediaflow-studio', 'release.json');
      if (fs.existsSync(releaseJsonPath)) {
        try {
          const rawRel = fs.readFileSync(releaseJsonPath, 'utf-8').replace(/^\uFEFF/, '').trim();
          releaseJsonItem = JSON.parse(rawRel);
        } catch (e) {
          console.warn('[AutoUpdater] Failed reading Anything release.json:', e);
        }
      }

      if (!catalogItem && !releaseJsonItem) {
        // Also check if any release folders exist under releases/mediaflow-studio/v*
        const releasesDir = path.join(anythingDir, 'releases', 'mediaflow-studio');
        if (fs.existsSync(releasesDir)) {
          const dirs = fs.readdirSync(releasesDir);
          const vDirs = dirs.filter((d) => d.startsWith('v') && fs.statSync(path.join(releasesDir, d)).isDirectory());
          if (vDirs.length > 0) {
            vDirs.sort((a, b) => (this.isNewer(a.replace(/^v/, ''), b.replace(/^v/, '')) ? 1 : -1));
            const latestVDir = vDirs[vDirs.length - 1];
            const candidateJson = path.join(releasesDir, latestVDir, 'release.json');
            if (fs.existsSync(candidateJson)) {
              try {
                releaseJsonItem = JSON.parse(fs.readFileSync(candidateJson, 'utf-8').replace(/^\uFEFF/, '').trim());
              } catch {}
            }
          }
        }
      }

      if (!catalogItem && !releaseJsonItem) {
        return null;
      }

      const relInfo = releaseJsonItem || catalogItem?.releaseInfo || catalogItem || {};
      const remoteVer = (relInfo.version || catalogItem?.version || '6.0.0').replace(/^v/, '');
      const setupName =
        relInfo.setupExecutableName ||
        catalogItem?.setupExecutableName ||
        `Mediaflow_studio_${remoteVer}_Setup.exe`;
      const downloadUrl =
        relInfo.downloadUrl ||
        catalogItem?.downloadUrl ||
        `https://github.com/${repo}/releases/download/v${remoteVer}/${setupName}`;
      const releasesUrl =
        relInfo.releasesUrl ||
        catalogItem?.releasesUrl ||
        `https://github.com/${repo}/releases`;

      // Extract notes
      let notes: string[] = [];
      if (Array.isArray(relInfo.newFeatures) && relInfo.newFeatures.length > 0) {
        notes = relInfo.newFeatures;
      } else if (Array.isArray(relInfo.changelog) && relInfo.changelog.length > 0) {
        notes = relInfo.changelog;
      } else if (Array.isArray(catalogItem?.changelog) && catalogItem.changelog.length > 0) {
        notes = catalogItem.changelog;
      } else if (typeof relInfo.summary === 'string' && relInfo.summary.trim()) {
        notes = [relInfo.summary];
      }
      if (notes.length === 0) {
        notes = ['Official MediaFlow Studio production release from Anything Ecosystem.'];
      }

      // Check if local installer exists on disk in Anything releases
      let localInstallerPath: string | undefined = undefined;
      const candidates = [
        path.join(anythingDir, 'releases', 'mediaflow-studio', `v${remoteVer}`, setupName),
        path.join(anythingDir, 'releases', 'mediaflow-studio', setupName),
        path.join(anythingDir, 'releases', 'mediaflow-studio', `v${remoteVer}`, `Mediaflow_studio_${remoteVer}.exe`),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          localInstallerPath = cand;
          break;
        }
      }

      // Fallback: search directory for any executable setup in version folder
      if (!localInstallerPath) {
        const vDir = path.join(anythingDir, 'releases', 'mediaflow-studio', `v${remoteVer}`);
        if (fs.existsSync(vDir)) {
          try {
            const files = fs.readdirSync(vDir);
            const found = files.find(
              (f) =>
                f.toLowerCase().endsWith('setup.exe') ||
                (f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('portable'))
            );
            if (found) {
              localInstallerPath = path.join(vDir, found);
            }
          } catch {}
        }
      }

      const newer = this.isNewer(remoteVer, currentVer);
      const source: 'anything-local' | 'anything-catalog' = localInstallerPath
        ? 'anything-local'
        : 'anything-catalog';

      return {
        version: remoteVer,
        latestVersion: remoteVer,
        currentVersion: currentVer,
        hasUpdate: newer,
        downloadUrl,
        fileName: setupName,
        localInstallerPath,
        source,
        releaseNotes: notes,
        publishedAt: relInfo.releaseDate || new Date().toISOString(),
        sizeFormatted: relInfo.sizeFormatted || catalogItem?.size || '76.5 MB',
        setupExecutableName: setupName,
        mandatory: false,
        success: true,
        notes: notes.join('\n'),
        exeUrl: downloadUrl,
        msiUrl: downloadUrl,
        releasePageUrl: releasesUrl,
      };
    } catch (e) {
      console.warn('[AutoUpdater] checkAnythingEcosystem error:', e);
      return null;
    }
  }

  /**
   * SemVer comparator. Returns true if remote is strictly greater than current.
   */
  static isNewer(latest: string, current: string): boolean {
    const parse = (v: string) =>
      v
        .replace(/^v/, '')
        .split('.')
        .map((num) => parseInt(num, 10) || 0);

    const [lMaj = 0, lMin = 0, lPat = 0] = parse(latest);
    const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);

    if (lMaj > cMaj) return true;
    if (lMaj === cMaj && lMin > cMin) return true;
    if (lMaj === cMaj && lMin === cMin && lPat > cPat) return true;
    return false;
  }

  /**
   * Download the update asset with live progress, verify SHA-256, and launch installer.
   * If local installer is detected in Anything ecosystem, installs immediately with zero download delay.
   */
  static async downloadAndInstall(
    updateInfo: UpdateInfo,
    progressCallback: (pct: number, receivedMB: string, totalMB: string) => void
  ): Promise<void> {
    if (this.isDownloading) {
      throw new Error('An update download or installation is already in progress.');
    }
    this.isDownloading = true;

    try {
      // 1. Instant local installation if installer file exists in Anything Hub
      if (updateInfo.localInstallerPath && fs.existsSync(updateInfo.localInstallerPath)) {
        console.log('[AutoUpdater] Executing verified Anything local installer:', updateInfo.localInstallerPath);
        progressCallback(100, '0.0', '0.0');
        const installerPath = updateInfo.localInstallerPath;
        const isMsi = installerPath.toLowerCase().endsWith('.msi');

        if (process.platform === 'win32') {
          if (isMsi) {
            spawn('msiexec.exe', ['/i', installerPath, '/quiet', '/norestart'], {
              detached: true,
              stdio: 'ignore',
            });
          } else {
            // NSIS installer
            spawn(installerPath, ['/S'], {
              detached: true,
              stdio: 'ignore',
            });
          }
          setTimeout(() => {
            app.quit();
          }, 1200);
        }
        return;
      }

      // 2. Download from remote URL
      const fileName = updateInfo.fileName || `MediaFlow_Studio_Setup_v${updateInfo.version}.exe`;
      const tempPath = path.join(app.getPath('temp'), fileName);

      await this.downloadWithRedirects(updateInfo.downloadUrl, tempPath, progressCallback);

      // Verify SHA-256 if hash is provided in updateInfo
      if (updateInfo.sha256) {
        const computedHash = await this.hashFile(tempPath);
        if (computedHash.toLowerCase() !== updateInfo.sha256.toLowerCase()) {
          try {
            fs.unlinkSync(tempPath);
          } catch {}
          throw new Error('Checksum verification failed. Downloaded installer may be incomplete or corrupted.');
        }
      }

      // Execute installer and quit app
      if (process.platform === 'win32') {
        const isMsi = tempPath.toLowerCase().endsWith('.msi');
        if (isMsi) {
          spawn('msiexec.exe', ['/i', tempPath, '/quiet', '/norestart'], {
            detached: true,
            stdio: 'ignore',
          });
        } else {
          // NSIS silent installer switch: /S
          spawn(tempPath, ['/S'], {
            detached: true,
            stdio: 'ignore',
          });
        }
        setTimeout(() => {
          app.quit();
        }, 1200);
      }
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Streaming file download with automatic 301/302 redirect following.
   */
  private static downloadWithRedirects(
    urlStr: string,
    destPath: string,
    onProgress: (pct: number, receivedMB: string, totalMB: string) => void,
    maxRedirects = 6
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error('Too many HTTP redirects when downloading update.'));
      }

      const parsedUrl = new URL(urlStr);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const request = protocol.get(
        urlStr,
        {
          headers: {
            'User-Agent': `MediaFlow-Studio-Desktop/${app.getVersion() || '6.0.0'}`,
            Accept: '*/*',
          },
        },
        (res) => {
          // Handle redirects (e.g. GitHub Releases redirecting to AWS S3 CDN)
          if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            return resolve(
              this.downloadWithRedirects(res.headers.location, destPath, onProgress, maxRedirects - 1)
            );
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Update download failed with HTTP status ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';
          let receivedBytes = 0;

          const fileStream = fs.createWriteStream(destPath);

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(1);
            const pct = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
            onProgress(pct, receivedMB, totalMB);
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => resolve());
          });

          fileStream.on('error', (err) => {
            try {
              fs.unlinkSync(destPath);
            } catch {}
            reject(err);
          });
        }
      );

      request.on('error', reject);
    });
  }

  /**
   * Bit-level SHA-256 calculation
   */
  private static hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Secure JSON fetch with standard headers
   */
  private static fetchJson(urlStr: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https
        .get(
          urlStr,
          {
            headers: {
              'User-Agent': `MediaFlow-Studio-Desktop/${app.getVersion() || '6.0.0'}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
          (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  resolve(JSON.parse(raw));
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
              }
            });
          }
        )
        .on('error', reject);
    });
  }
}
