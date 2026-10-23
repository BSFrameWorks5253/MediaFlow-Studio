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
}

export class WorkstationAutoUpdater {
  private static DEFAULT_REPO = 'BSFrameWorks5253/MediaFlow-Studio';
  private static isDownloading = false;

  /**
   * Check for updates against GitHub Releases API or custom version JSON.
   */
  static async checkForUpdates(
    mainWindow?: BrowserWindow | null,
    repo: string = this.DEFAULT_REPO
  ): Promise<UpdateInfo | null> {
    try {
      const endpoint = `https://api.github.com/repos/${repo}/releases/latest`;
      const data = await this.fetchJson(endpoint);

      if (!data || !data.tag_name) {
        return null;
      }

      const remoteTag = data.tag_name;
      const remoteVer = remoteTag.replace(/^v/, '');
      const currentVer = app.getVersion() || '4.1.0';

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
        downloadUrl,
        fileName: chosenAsset?.name,
        releaseNotes: notes,
        publishedAt: data.published_at,
        mandatory: false,
      };

      if (newer && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:available', updateInfo);
      }

      return newer ? updateInfo : null;
    } catch (err: any) {
      console.warn('[AutoUpdater] Update check failed:', err?.message || err);
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
   * Download the update asset with live progress, verify SHA-256, and silently launch installer.
   */
  static async downloadAndInstall(
    updateInfo: UpdateInfo,
    progressCallback: (pct: number, receivedMB: string, totalMB: string) => void
  ): Promise<void> {
    if (this.isDownloading) {
      throw new Error('An update download is already in progress.');
    }
    this.isDownloading = true;

    try {
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
            'User-Agent': `MediaFlow-Studio-Desktop/${app.getVersion() || '4.1.0'}`,
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
              'User-Agent': `MediaFlow-Studio-Desktop/${app.getVersion() || '4.1.0'}`,
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
