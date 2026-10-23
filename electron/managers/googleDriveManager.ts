import fs from 'fs';
import path from 'path';
import { app, shell, session } from 'electron';

export interface DriveConfig {
  mainDataUrl: string;
  thumbnailsUrl: string;
}

export class GoogleDriveManager {
  private configFile: string;
  private config: DriveConfig = {
    mainDataUrl: 'https://drive.google.com/drive/my-drive',
    thumbnailsUrl: 'https://drive.google.com/drive/my-drive',
  };

  constructor() {
    const userData = app.getPath('userData');
    this.configFile = path.join(userData, 'drive_config.json');
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        this.config = { ...this.config, ...JSON.parse(fs.readFileSync(this.configFile, 'utf-8')) };
      }
    } catch {}
  }

  private saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch {}
  }

  getConfig(): DriveConfig {
    return this.config;
  }

  setUrl(type: 'main' | 'thumbnails', url: string) {
    let clean = url.trim();
    if (!clean.startsWith('http')) clean = 'https://' + clean;
    if (type === 'main') this.config.mainDataUrl = clean;
    else this.config.thumbnailsUrl = clean;
    this.saveConfig();
  }

  async clearSession(type: 'main' | 'ref') {
    const partition = type === 'main' ? 'persist:main_drive' : 'persist:ref_drive';
    const ses = session.fromPartition(partition);
    await ses.clearStorageData();
    await ses.clearCache();
  }

  openExternal(url: string) {
    let target = url.trim();
    if (!target.startsWith('http')) target = 'https://' + target;
    shell.openExternal(target);
  }
}
