import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';

export interface BadgeSample {
  name: string;
  path: string;
  token?: string;
  sizeBytes?: number;
}

export interface LinkedEventFolderStatus {
  path: string;
  source: 'anything' | 'local' | 'cli' | 'default' | 'none';
  exists: boolean;
  totalImages: number;
  sampleBadges: BadgeSample[];
  lastSynced: string;
  anythingSharedPath: string;
  error?: string;
}

export class EcosystemManager {
  private static instance: EcosystemManager;
  private cliImagesDir: string | null = null;
  private cliPage: string | null = null;

  public static getInstance(): EcosystemManager {
    if (!EcosystemManager.instance) {
      EcosystemManager.instance = new EcosystemManager();
    }
    return EcosystemManager.instance;
  }

  constructor() {
    this.parseInitialArgv(process.argv);
  }

  public parseInitialArgv(argv: string[]) {
    for (const arg of argv) {
      if (arg.startsWith('--event-images-dir=')) {
        this.cliImagesDir = arg.replace('--event-images-dir=', '').replace(/^["']|["']$/g, '').trim();
      } else if (arg.startsWith('--page=')) {
        this.cliPage = arg.replace('--page=', '').replace(/^["']|["']$/g, '').trim();
      } else if (arg.startsWith('mediaflow://')) {
        this.parseDeepLink(arg);
      }
    }
  }

  public parseDeepLink(urlStr: string): { page?: string; imagesDir?: string } {
    try {
      const parsed = new URL(urlStr);
      let page = parsed.hostname || parsed.pathname.replace(/^\/\//, '').replace(/^\//, '');
      if (page.includes('event-distributor') || page === 'eventDistributor') {
        page = 'eventDistributor';
      }
      const imagesDir = parsed.searchParams.get('eventImagesDir') || parsed.searchParams.get('imagesDir');
      if (imagesDir) {
        this.cliImagesDir = decodeURIComponent(imagesDir);
      }
      if (page) {
        this.cliPage = page;
      }
      return { page, imagesDir: this.cliImagesDir || undefined };
    } catch {
      return {};
    }
  }

  public getCliLaunchIntent(): { page: string | null; imagesDir: string | null } {
    return { page: this.cliPage, imagesDir: this.cliImagesDir };
  }

  public getAnythingSharedConfigPath(): string {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'anything', 'ecosystem_shared_config.json');
  }

  public getSharedCandidates(): string[] {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    return [
      path.join(appData, 'anything', 'ecosystem_shared_config.json'),
      path.join(appData, 'Anything', 'ecosystem_shared_config.json'),
      path.join(localAppData, 'anything', 'ecosystem_shared_config.json'),
      path.join(appData, 'anything', 'loaders', 'mediaflow-studio.json'),
      'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything\\releases\\mediaflow-studio\\loader-config.json',
    ];
  }

  /**
   * Scans a target folder for image badges
   */
  public inspectFolder(folderPath: string): {
    exists: boolean;
    totalImages: number;
    sampleBadges: BadgeSample[];
    error?: string;
  } {
    if (!folderPath || typeof folderPath !== 'string') {
      return { exists: false, totalImages: 0, sampleBadges: [], error: 'Path is empty' };
    }

    const cleanPath = path.resolve(folderPath.trim());
    if (!fs.existsSync(cleanPath)) {
      return { exists: false, totalImages: 0, sampleBadges: [], error: 'Folder does not exist on disk' };
    }

    try {
      const stat = fs.statSync(cleanPath);
      if (!stat.isDirectory()) {
        return { exists: false, totalImages: 0, sampleBadges: [], error: 'Path is a file, not a directory' };
      }

      const files = fs.readdirSync(cleanPath);
      const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.svg']);
      const sampleBadges: BadgeSample[] = [];
      let totalImages = 0;

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (imageExts.has(ext)) {
          totalImages++;
          if (sampleBadges.length < 50) {
            const baseName = path.basename(file, ext);
            // Guess token: single letter or uppercase acronym or first token
            let token = baseName.trim();
            if (token.length > 4 && token.includes('_')) {
              const parts = token.split('_');
              token = parts[parts.length - 1] || parts[0];
            }

            const filePath = path.join(cleanPath, file);
            let sizeBytes = 0;
            try {
              sizeBytes = fs.statSync(filePath).size;
            } catch {}

            sampleBadges.push({
              name: file,
              path: filePath,
              token: token.toUpperCase(),
              sizeBytes,
            });
          }
        }
      }

      return {
        exists: true,
        totalImages,
        sampleBadges,
      };
    } catch (err: any) {
      return {
        exists: false,
        totalImages: 0,
        sampleBadges: [],
        error: err?.message || 'Error inspecting directory',
      };
    }
  }

  /**
   * Fetches the linked event reference images folder from all sources:
   * 1. CLI launch flag / Deep link
   * 2. Shared Anything ecosystem config
   * 3. Local MediaFlow Studio config
   * 4. Standard default folder fallback
   */
  public getLinkedEventFolder(localSavedPath?: string): LinkedEventFolderStatus {
    const anythingSharedPath = this.getAnythingSharedConfigPath();

    // 1. Check CLI launch flag
    if (this.cliImagesDir && fs.existsSync(this.cliImagesDir)) {
      const inspect = this.inspectFolder(this.cliImagesDir);
      return {
        path: this.cliImagesDir,
        source: 'cli',
        exists: inspect.exists,
        totalImages: inspect.totalImages,
        sampleBadges: inspect.sampleBadges,
        lastSynced: new Date().toISOString(),
        anythingSharedPath,
      };
    }

    // 2. Check Anything Shared Ecosystem Config
    for (const candidate of this.getSharedCandidates()) {
      if (fs.existsSync(candidate)) {
        try {
          const content = fs.readFileSync(candidate, 'utf-8').trim();
          if (content) {
            const parsed = JSON.parse(content);
            const sharedDir =
              parsed.mediaflow?.eventImagesDirPath ||
              parsed.eventImagesDirPath ||
              parsed.sharedAssets?.eventBadgesDir;

            if (sharedDir && typeof sharedDir === 'string' && fs.existsSync(sharedDir)) {
              const inspect = this.inspectFolder(sharedDir);
              return {
                path: sharedDir,
                source: 'anything',
                exists: inspect.exists,
                totalImages: inspect.totalImages,
                sampleBadges: inspect.sampleBadges,
                lastSynced: new Date().toISOString(),
                anythingSharedPath: candidate,
              };
            }
          }
        } catch {}
      }
    }

    // 3. Check Local Studio config
    if (localSavedPath && fs.existsSync(localSavedPath)) {
      const inspect = this.inspectFolder(localSavedPath);
      return {
        path: localSavedPath,
        source: 'local',
        exists: inspect.exists,
        totalImages: inspect.totalImages,
        sampleBadges: inspect.sampleBadges,
        lastSynced: new Date().toISOString(),
        anythingSharedPath,
      };
    }

    // 4. Check Environment Variable
    if (process.env.MEDIAFLOW_EVENT_IMAGES_DIR && fs.existsSync(process.env.MEDIAFLOW_EVENT_IMAGES_DIR)) {
      const inspect = this.inspectFolder(process.env.MEDIAFLOW_EVENT_IMAGES_DIR);
      return {
        path: process.env.MEDIAFLOW_EVENT_IMAGES_DIR,
        source: 'anything',
        exists: inspect.exists,
        totalImages: inspect.totalImages,
        sampleBadges: inspect.sampleBadges,
        lastSynced: new Date().toISOString(),
        anythingSharedPath,
      };
    }

    // 5. Check well-known default locations
    const defaultCandidates = [
      'D:\\APP_DATA\\EVENT_BADGES',
      'C:\\APP_DATA\\EVENT_BADGES',
      'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\EVENT_BADGES',
      'D:\\EVENT_BADGES',
    ];

    for (const defPath of defaultCandidates) {
      if (fs.existsSync(defPath)) {
        const inspect = this.inspectFolder(defPath);
        return {
          path: defPath,
          source: 'default',
          exists: inspect.exists,
          totalImages: inspect.totalImages,
          sampleBadges: inspect.sampleBadges,
          lastSynced: new Date().toISOString(),
          anythingSharedPath,
        };
      }
    }

    return {
      path: localSavedPath || '',
      source: 'none',
      exists: false,
      totalImages: 0,
      sampleBadges: [],
      lastSynced: new Date().toISOString(),
      anythingSharedPath,
      error: 'No active Event Reference Images folder linked.',
    };
  }

  /**
   * Saves the linked Event Images folder both locally and to Anything shared config
   */
  public saveLinkedEventFolder(folderPath: string): LinkedEventFolderStatus {
    const cleanPath = folderPath.trim();
    const anythingSharedPath = this.getAnythingSharedConfigPath();

    // 1. Broadcast / write to Anything Shared Ecosystem Config
    try {
      const dir = path.dirname(anythingSharedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let existingData: any = {};
      if (fs.existsSync(anythingSharedPath)) {
        try {
          existingData = JSON.parse(fs.readFileSync(anythingSharedPath, 'utf-8'));
        } catch {}
      }

      const updated = {
        ...existingData,
        mediaflow: {
          ...(existingData.mediaflow || {}),
          eventImagesDirPath: cleanPath,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'MediaFlow Studio',
        },
        sharedAssets: {
          ...(existingData.sharedAssets || {}),
          eventBadgesDir: cleanPath,
        },
      };

      fs.writeFileSync(anythingSharedPath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[EcosystemManager] Could not write to Anything shared config:', err);
    }

    // Also update loader config if present
    try {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      const loaderFile = path.join(appData, 'anything', 'loaders', 'mediaflow-studio.json');
      if (fs.existsSync(loaderFile)) {
        const ldata = JSON.parse(fs.readFileSync(loaderFile, 'utf-8'));
        ldata.eventImagesDirPath = cleanPath;
        ldata.lastLinked = new Date().toISOString();
        fs.writeFileSync(loaderFile, JSON.stringify(ldata, null, 2), 'utf-8');
      }
    } catch {}

    const inspect = this.inspectFolder(cleanPath);
    return {
      path: cleanPath,
      source: 'anything',
      exists: inspect.exists,
      totalImages: inspect.totalImages,
      sampleBadges: inspect.sampleBadges,
      lastSynced: new Date().toISOString(),
      anythingSharedPath,
    };
  }
}

