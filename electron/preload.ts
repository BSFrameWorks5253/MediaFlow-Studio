import { contextBridge, ipcRenderer, webFrame } from 'electron';

export const electronAPI = {
  // Config & Zoom
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('app:save-config', config),
  setZoomFactor: (factor: number) => {
    try {
      webFrame.setZoomFactor(factor);
    } catch {}
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch {
      return 1.0;
    }
  },

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Native Dialogs
  selectDirectory: (title?: string, startDir?: string) =>
    ipcRenderer.invoke('dialog:select-directory', title, startDir),
  selectOpenFile: (title?: string, filter?: any) =>
    ipcRenderer.invoke('dialog:select-open-file', title, filter),
  selectOpenFiles: (title?: string, filter?: any) =>
    ipcRenderer.invoke('dialog:select-open-files', title, filter),
  selectSaveFile: (title?: string, filter?: any) =>
    ipcRenderer.invoke('dialog:select-save-file', title, filter),
  openPath: (targetPath: string) => ipcRenderer.invoke('shell:open-path', targetPath),
  showItemInFolder: (targetPath: string) =>
    ipcRenderer.invoke('shell:show-item-in-folder', targetPath),
  checkPathExists: (targetPath: string) =>
    ipcRenderer.invoke('path:check-exists', targetPath),

  // Upload Structure Generator (Structure A)
  createUploadStructure: (baseDir: string, safarName: string) =>
    ipcRenderer.invoke('workspace:create-upload-structure', baseDir, safarName),
  moveMergedFolder: (sourceDir: string, targetMainDataDir: string) =>
    ipcRenderer.invoke('workspace:move-merged-folder', sourceDir, targetMainDataDir),

  // 1. PV Separator
  checkStorageHeadroom: (targetPath: string) =>
    ipcRenderer.invoke('pv:check-storage-headroom', targetPath),
  scanPV: (sourceDir: string, target?: 'video' | 'photo' | 'both') =>
    ipcRenderer.invoke('pv:scan', sourceDir, target),
  executePV: (
    sourceDir: string,
    destDir: string,
    mode: 'copy' | 'move' | 'delete',
    target?: 'video' | 'photo' | 'both',
    generateExcel?: boolean
  ) =>
    ipcRenderer.invoke('pv:execute', sourceDir, destDir, mode, target, generateExcel),
  cancelPV: () => ipcRenderer.invoke('pv:cancel'),
  onPVProgress: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('pv:progress', handler);
    return () => {
      ipcRenderer.removeListener('pv:progress', handler);
    };
  },

  // 2. Photo Matcher
  getPhotoPreStats: (dirPath: string) => ipcRenderer.invoke('photo:get-pre-stats', dirPath),
  scanPhotoMatcher: (dirPath: string) => ipcRenderer.invoke('photo:scan', dirPath),
  scanPhotoMatcherTwoPaths: (firstPath: string, secondPath: string, options?: any) =>
    ipcRenderer.invoke('photo:scan-two-paths', firstPath, secondPath, options),
  findRemainingDir: (selectedDir: string) =>
    ipcRenderer.invoke('photo:find-remaining-dir', selectedDir),
  executePhotoRename: (items: any[], dryRun?: boolean) =>
    ipcRenderer.invoke('photo:execute-rename', items, dryRun),

  // 3. Video Transfer
  scanVideoTransfer: (videoDir: string, photoDir: string) =>
    ipcRenderer.invoke('video:scan', videoDir, photoDir),
  executeVideoTransfer: (pairs: any[], mode: 'copy' | 'move', collisionPolicy: string) =>
    ipcRenderer.invoke('video:execute-transfer', pairs, mode, collisionPolicy),
  undoVideoTransfer: (manifestPath: string) =>
    ipcRenderer.invoke('video:undo-transfer', manifestPath),
  deleteEmptyFolder: (folderPath: string) =>
    ipcRenderer.invoke('folder:delete-empty', folderPath),
  readThumbnailDataUrl: (filePath: string) =>
    ipcRenderer.invoke('media:read-thumbnail', filePath),
  onVideoTransferProgress: (callback: (curr: number, total: number, file: string, speed: string) => void) => {
    const handler = (_: any, curr: number, total: number, file: string, speed: string) =>
      callback(curr, total, file, speed);
    ipcRenderer.on('video:progress', handler);
    return () => {
      ipcRenderer.removeListener('video:progress', handler);
    };
  },

  // 4. Thumbnail Separator
  scanThumbnailSeparator: (sourceDir: string, destDir?: string) =>
    ipcRenderer.invoke('thumb:scan', sourceDir, destDir),
  executeThumbnailSeparation: (items: any[], destDir: string, mode: 'copy' | 'move') =>
    ipcRenderer.invoke('thumb:execute', items, destDir, mode),

  // 5. Remaining Collector
  scanRemaining: (sourceDir: string, destDir?: string) =>
    ipcRenderer.invoke('remaining:scan', sourceDir, destDir),
  executeRemainingShift: (items: any[], destDir: string) =>
    ipcRenderer.invoke('remaining:execute-shift', items, destDir),
  undoRemainingShift: (manifestPath: string) =>
    ipcRenderer.invoke('remaining:undo-shift', manifestPath),
  onRemainingProgress: (callback: (curr: number, total: number, folder: string) => void) => {
    const handler = (_: any, curr: number, total: number, folder: string) =>
      callback(curr, total, folder);
    ipcRenderer.on('remaining:progress', handler);
    return () => {
      ipcRenderer.removeListener('remaining:progress', handler);
    };
  },

  // 6. Excel Merger (openpyxl 1:1)
  scanExcelFolder: (folderPath: string) => ipcRenderer.invoke('excel:scan-folder', folderPath),
  inspectExcelFiles: (filePaths: string[]) => ipcRenderer.invoke('excel:inspect-files', filePaths),
  mergeExcelFiles: (filePaths: string[], outputPath?: string) =>
    ipcRenderer.invoke('excel:merge-files', filePaths, outputPath),

  // 7. Standalone Tools
  normalizeExtensions: (targetDir: string, dryRun?: boolean) =>
    ipcRenderer.invoke('tools:normalize-extensions', targetDir, dryRun),
  tagPhotoSuffixP: (filePaths: string[]) => ipcRenderer.invoke('tools:tag-photo-p', filePaths),
  tagVideoThumbSuffixV: (filePaths: string[]) => ipcRenderer.invoke('tools:tag-video-v', filePaths),
  scanDoNotUpload: (targetDir: string) => ipcRenderer.invoke('tools:scan-do-not-upload', targetDir),
  executeDoNotUpload: (items: any[], mode?: 'move' | 'copy', dryRun?: boolean) =>
    ipcRenderer.invoke('tools:execute-do-not-upload', items, mode, dryRun),
  scanInventoryReports: (sourceDir: string, destDir?: string) =>
    ipcRenderer.invoke('tools:scan-inventory-reports', sourceDir, destDir),
  executeInventoryReports: (items: any[], destDir: string, mode?: 'copy' | 'move', dryRun?: boolean) =>
    ipcRenderer.invoke('tools:execute-inventory-reports', items, destDir, mode, dryRun),

  // 8. Google Drive
  getDriveConfig: () => ipcRenderer.invoke('drive:get-config'),
  setDriveUrl: (type: 'main' | 'thumbnails', url: string) =>
    ipcRenderer.invoke('drive:set-url', type, url),
  clearDriveSession: (type: 'main' | 'ref') =>
    ipcRenderer.invoke('drive:clear-session', type),
  openDriveExternal: (url: string) => ipcRenderer.invoke('drive:open-external', url),

  // 9. Activity & Reports
  logActivity: (item: any) => ipcRenderer.invoke('activity:log', item),
  logReport: (item: any) => ipcRenderer.invoke('reports:log', item),
  getActivities: () => ipcRenderer.invoke('activity:get-all'),
  getReports: () => ipcRenderer.invoke('reports:get-all'),

  // 10. Event Image Distributor
  scanEventDistributor: (targetWorkingDir: string, imagesDirPath: string, excelPath: string) =>
    ipcRenderer.invoke('event-distributor:scan', targetWorkingDir, imagesDirPath, excelPath),
  executeEventDistribution: (foldersMatched: any[]) =>
    ipcRenderer.invoke('event-distributor:execute', foldersMatched),
  onEventDistributorProgress: (callback: (data: { curr: number; total: number; msg: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('event-distributor:progress', handler);
    return () => {
      ipcRenderer.removeListener('event-distributor:progress', handler);
    };
  },

  // 11. GitHub Release & MSI Update Checker
  checkGitHubUpdates: () => ipcRenderer.invoke('updater:check-github'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('updater:open-url', url),

  // Universal Auto-Update APIs (Blueprint 01)
  checkForUpdates: () => ipcRenderer.invoke('updater:check-update'),
  installUpdate: (updateInfo: any) => ipcRenderer.invoke('updater:install-update', updateInfo),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('update:available', handler);
    return () => {
      ipcRenderer.removeListener('update:available', handler);
    };
  },
  onUpdateProgress: (callback: (data: { pct: number; receivedMB: string; totalMB: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('update:progress', handler);
    return () => {
      ipcRenderer.removeListener('update:progress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
