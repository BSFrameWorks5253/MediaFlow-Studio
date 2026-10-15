import fs from 'fs';
import path from 'path';

export class ProductionToolsEngine {
  // 1. Extension Normalizer
  async normalizeExtensions(
    targetDir: string,
    dryRun = false
  ): Promise<{ processed: number; renamed: number; items: { old: string; new: string; path: string }[] }> {
    const cleanDir = path.resolve(targetDir.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanDir)) throw new Error(`Directory does not exist: ${cleanDir}`);

    const items: { old: string; new: string; path: string }[] = [];
    let processed = 0;
    let renamed = 0;

    const walk = async (curr: string) => {
      const ents = await fs.promises.readdir(curr, { withFileTypes: true });
      for (const ent of ents) {
        const full = path.join(curr, ent.name);
        if (ent.isDirectory()) {
          if (!ent.name.startsWith('.')) await walk(full);
        } else if (ent.isFile()) {
          processed++;
          let newName = ent.name;

          // Pattern: FILE.CR3.jpg -> FILE.jpg
          // PHOTO.CR3_V.jpg -> PHOTO_V.jpg
          // PHOTO.CR3_U.jpg -> PHOTO_U.jpg
          newName = newName.replace(/\.(?:cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw|heic|raw)\.(jpg|jpeg|png)/i, '.$1');
          newName = newName.replace(/\.(?:cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw|heic|raw)(_[vuVU]\.[a-zA-Z0-9]+)$/i, '$1');

          if (newName !== ent.name) {
            const targetFull = path.join(curr, newName);
            items.push({ old: ent.name, new: newName, path: curr });
            if (!dryRun) {
              if (!fs.existsSync(targetFull)) {
                await fs.promises.rename(full, targetFull);
                renamed++;
              }
            } else {
              renamed++;
            }
          }
        }
      }
    };

    await walk(cleanDir);
    return { processed, renamed, items };
  }

  // 2. Photo Suffix Tagger (_P)
  async tagPhotoSuffixP(
    filePaths: string[]
  ): Promise<{ success: number; skipped: number; results: { oldName: string; newName: string; path: string }[] }> {
    const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.cr2', '.cr3', '.nef', '.arw', '.heic', '.dng']);
    let success = 0;
    let skipped = 0;
    const results: { oldName: string; newName: string; path: string }[] = [];

    for (const fp of filePaths) {
      const cleanPath = path.resolve(fp.replace(/^file:\/\/\/?/, ''));
      if (!fs.existsSync(cleanPath)) continue;

      const stat = await fs.promises.stat(cleanPath);
      if (stat.isDirectory()) {
        const ents = await fs.promises.readdir(cleanPath);
        for (const e of ents) {
          const subFile = path.join(cleanPath, e);
          const subStat = await fs.promises.stat(subFile);
          if (subStat.isFile()) {
            const ext = path.extname(e);
            if (SUPPORTED.has(ext.toLowerCase())) {
              const stem = path.basename(e, ext);
              if (!/[-_][pP]$/.test(stem)) {
                const newName = `${stem}_P${ext}`;
                const newPath = path.join(cleanPath, newName);
                if (!fs.existsSync(newPath)) {
                  await fs.promises.rename(subFile, newPath);
                  results.push({ oldName: e, newName, path: cleanPath });
                  success++;
                }
              } else {
                skipped++;
              }
            }
          }
        }
      } else if (stat.isFile()) {
        const ext = path.extname(cleanPath);
        const name = path.basename(cleanPath);
        const dir = path.dirname(cleanPath);
        if (SUPPORTED.has(ext.toLowerCase())) {
          const stem = path.basename(name, ext);
          if (!/[-_][pP]$/.test(stem)) {
            const newName = `${stem}_P${ext}`;
            const newPath = path.join(dir, newName);
            if (!fs.existsSync(newPath)) {
              await fs.promises.rename(cleanPath, newPath);
              results.push({ oldName: name, newName, path: dir });
              success++;
            }
          } else {
            skipped++;
          }
        }
      }
    }

    return { success, skipped, results };
  }

  // 3. Video Thumbnail Suffix Tagger (_V)
  async tagVideoThumbSuffixV(
    filePaths: string[]
  ): Promise<{ success: number; skipped: number; results: { oldName: string; newName: string; path: string }[] }> {
    const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.thm']);
    let success = 0;
    let skipped = 0;
    const results: { oldName: string; newName: string; path: string }[] = [];

    for (const fp of filePaths) {
      const cleanPath = path.resolve(fp.replace(/^file:\/\/\/?/, ''));
      if (!fs.existsSync(cleanPath)) continue;

      const stat = await fs.promises.stat(cleanPath);
      if (stat.isDirectory()) {
        const ents = await fs.promises.readdir(cleanPath);
        for (const e of ents) {
          const subFile = path.join(cleanPath, e);
          const subStat = await fs.promises.stat(subFile);
          if (subStat.isFile()) {
            const ext = path.extname(e);
            if (SUPPORTED.has(ext.toLowerCase())) {
              const stem = path.basename(e, ext);
              if (!/[-_][vV]$/.test(stem)) {
                const newName = `${stem}_V${ext}`;
                const newPath = path.join(cleanPath, newName);
                if (!fs.existsSync(newPath)) {
                  await fs.promises.rename(subFile, newPath);
                  results.push({ oldName: e, newName, path: cleanPath });
                  success++;
                }
              } else {
                skipped++;
              }
            }
          }
        }
      } else if (stat.isFile()) {
        const ext = path.extname(cleanPath);
        const name = path.basename(cleanPath);
        const dir = path.dirname(cleanPath);
        if (SUPPORTED.has(ext.toLowerCase())) {
          const stem = path.basename(name, ext);
          if (!/[-_][vV]$/.test(stem)) {
            const newName = `${stem}_V${ext}`;
            const newPath = path.join(dir, newName);
            if (!fs.existsSync(newPath)) {
              await fs.promises.rename(cleanPath, newPath);
              results.push({ oldName: name, newName, path: dir });
              success++;
            }
          } else {
            skipped++;
          }
        }
      }
    }

    return { success, skipped, results };
  }

  // 4. DO NOT UPLOAD Isolator (Contributer & Documents)
  async scanDoNotUpload(targetDir: string): Promise<DoNotUploadItem[]> {
    const cleanDir = path.resolve(targetDir.replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanDir)) throw new Error(`Directory does not exist: ${cleanDir}`);

    const results: DoNotUploadItem[] = [];
    const doNotUploadFolder = path.join(cleanDir, 'DO NOT UPLOAD');
    const targetPatterns = [
      /^contribut[eo]rs?.*$/i,
      /^documents?.*$/i,
      /^docs?$/i,
    ];

    const isMatch = (name: string) => {
      const trimmed = name.trim();
      if (trimmed.toUpperCase() === 'DO NOT UPLOAD') return false;
      return targetPatterns.some((p) => p.test(trimmed));
    };

    const getStats = async (dirPath: string): Promise<{ count: number; bytes: number; sizeStr: string }> => {
      let count = 0;
      let bytes = 0;
      const walkCount = async (curr: string) => {
        try {
          const ents = await fs.promises.readdir(curr, { withFileTypes: true });
          for (const e of ents) {
            const fp = path.join(curr, e.name);
            if (e.isDirectory()) {
              await walkCount(fp);
            } else if (e.isFile()) {
              count++;
              try {
                const s = await fs.promises.stat(fp);
                bytes += s.size;
              } catch {}
            }
          }
        } catch {}
      };
      await walkCount(dirPath);

      let sizeStr = `${bytes} B`;
      if (bytes >= 1024 * 1024 * 1024) sizeStr = `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      else if (bytes >= 1024 * 1024) sizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      else if (bytes >= 1024) sizeStr = `${(bytes / 1024).toFixed(0)} KB`;

      return { count, bytes, sizeStr };
    };

    const walk = async (curr: string) => {
      if (curr.startsWith(doNotUploadFolder)) return;

      try {
        const ents = await fs.promises.readdir(curr, { withFileTypes: true });
        for (const e of ents) {
          if (!e.isDirectory() || e.name.startsWith('.')) continue;

          const fullPath = path.join(curr, e.name);
          if (fullPath === doNotUploadFolder) continue;

          if (isMatch(e.name)) {
            // Find main date folder name relative to cleanDir
            const rel = path.relative(cleanDir, fullPath);
            const parts = rel.split(path.sep).filter(Boolean);
            const dateFolder = parts.length > 1 ? parts[0] : 'Root';
            const destination = path.join(doNotUploadFolder, dateFolder, e.name);
            const stats = await getStats(fullPath);

            results.push({
              source: fullPath,
              name: e.name,
              dateFolder,
              destination,
              fileCount: stats.count,
              totalBytes: stats.bytes,
              sizeStr: stats.sizeStr,
            });
          } else {
            await walk(fullPath);
          }
        }
      } catch {}
    };

    await walk(cleanDir);
    return results;
  }

  async executeDoNotUpload(
    items: DoNotUploadItem[],
    mode: 'move' | 'copy' = 'move',
    dryRun = false
  ): Promise<{ success: number; failed: number; manifestPath: string; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const manifestRows: { source: string; destination: string; dateFolder: string; status: string }[] = [];

    for (const item of items) {
      if (dryRun) {
        success++;
        manifestRows.push({
          source: item.source,
          destination: item.destination,
          dateFolder: item.dateFolder,
          status: 'Dry Run (Simulated)',
        });
        continue;
      }

      try {
        await fs.promises.mkdir(path.dirname(item.destination), { recursive: true });

        if (fs.existsSync(item.destination)) {
          // Merge contents
          await fs.promises.cp(item.source, item.destination, { recursive: true });
          if (mode === 'move') {
            await fs.promises.rm(item.source, { recursive: true, force: true });
          }
        } else {
          if (mode === 'move') {
            try {
              await fs.promises.rename(item.source, item.destination);
            } catch {
              await fs.promises.cp(item.source, item.destination, { recursive: true });
              await fs.promises.rm(item.source, { recursive: true, force: true });
            }
          } else {
            await fs.promises.cp(item.source, item.destination, { recursive: true });
          }
        }

        success++;
        manifestRows.push({
          source: item.source,
          destination: item.destination,
          dateFolder: item.dateFolder,
          status: `Success (${mode.toUpperCase()})`,
        });
      } catch (err: any) {
        failed++;
        errors.push(`${item.name}: ${err.message}`);
        manifestRows.push({
          source: item.source,
          destination: item.destination,
          dateFolder: item.dateFolder,
          status: `Error: ${err.message}`,
        });
      }
    }

    let manifestPath = '';
    if (items.length > 0 && !dryRun) {
      try {
        const dnuDir = path.dirname(path.dirname(items[0].destination));
        await fs.promises.mkdir(dnuDir, { recursive: true });
        const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        manifestPath = path.join(dnuDir, `isolation_manifest_${ts}.csv`);
        const csvContent =
          'Source,Destination,Date Folder,Status\n' +
          manifestRows.map((r) => `"${r.source}","${r.destination}","${r.dateFolder}","${r.status}"`).join('\n');
        await fs.promises.writeFile(manifestPath, csvContent, 'utf-8');
      } catch {}
    }

    return { success, failed, manifestPath, errors };
  }

  // 5. All Inventory Reports Collector
  async scanInventoryReports(sourceDir: string, destDir?: string): Promise<InventoryReportItem[]> {
    const cleanSource = path.resolve((sourceDir || '').replace(/^file:\/\/\/?/, ''));
    if (!fs.existsSync(cleanSource)) throw new Error(`Source directory does not exist: ${cleanSource}`);

    const cleanDest = destDir ? path.resolve(destDir.replace(/^file:\/\/\/?/, '')) : '';
    const allReportsDir = cleanDest ? path.join(cleanDest, 'All Inventory Reports') : '';

    const results: InventoryReportItem[] = [];
    const usedTargetNames = new Set<string>();
    const docFolderNames = new Set(['document', 'documents', 'doc', 'docs']);
    const excelExts = new Set(['.xlsx', '.xlsm', '.xls']);

    const walk = async (curr: string) => {
      let ents: fs.Dirent[] = [];
      try {
        ents = await fs.promises.readdir(curr, { withFileTypes: true });
      } catch {
        return;
      }

      // Check if current directory or ancestors contain a Document folder
      const relParts = path.relative(cleanSource, curr).split(path.sep);
      let isInDocFolder = false;
      let docFolderName = 'Direct';
      for (const p of relParts) {
        if (docFolderNames.has(p.toLowerCase())) {
          isInDocFolder = true;
          docFolderName = p;
          break;
        }
      }

      for (const ent of ents) {
        if (ent.name.startsWith('.')) continue;

        const fullPath = path.join(curr, ent.name);
        if (ent.isDirectory()) {
          // If we encounter an existing "All Inventory Reports" folder, avoid re-scanning it
          if (ent.name.toLowerCase() === 'all inventory reports') continue;
          await walk(fullPath);
        } else if (ent.isFile()) {
          const fn = ent.name.trim();
          if (fn.startsWith('~$')) continue; // skip Excel temp locks

          const ext = path.extname(fn).toLowerCase();
          if (!excelExts.has(ext)) continue;

          const stem = path.basename(fn, ext).toLowerCase();
          const isInventory =
            stem === '_inventory_report' ||
            stem.endsWith('_inventory_report') ||
            stem.includes('inventory_report') ||
            stem === 'inventory report';

          if (!isInventory) continue;

          // Determine parent shoot folder name
          const parentDir = path.dirname(fullPath);
          const parentName = path.basename(parentDir);
          let shootFolder = parentName;
          if (docFolderNames.has(parentName.toLowerCase())) {
            shootFolder = path.basename(path.dirname(parentDir)) || 'Root';
          }

          let sizeBytes = 0;
          try {
            const stat = await fs.promises.stat(fullPath);
            sizeBytes = stat.size;
          } catch {}

          let sizeStr = `${sizeBytes} B`;
          if (sizeBytes >= 1024 * 1024 * 1024) sizeStr = `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
          else if (sizeBytes >= 1024 * 1024) sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
          else if (sizeBytes >= 1024) sizeStr = `${(sizeBytes / 1024).toFixed(0)} KB`;

          // Generate proposed name in 'All Inventory Reports'
          let proposedName = fn;
          if (stem === '_inventory_report' || stem === 'inventory_report' || stem === 'inventory report' || !stem.startsWith(shootFolder.toLowerCase())) {
            const cleanShoot = shootFolder.replace(/[\s\/\\]+/g, '_');
            proposedName = `${cleanShoot}_Inventory_Report${ext}`;
          }

          // Ensure uniqueness
          let finalName = proposedName;
          let counter = 1;
          const baseStem = path.basename(proposedName, ext);
          while (usedTargetNames.has(finalName.toLowerCase())) {
            finalName = `${baseStem}_${counter}${ext}`;
            counter++;
          }
          usedTargetNames.add(finalName.toLowerCase());

          results.push({
            sourcePath: fullPath,
            filename: fn,
            folder: curr,
            shootFolder,
            isInDocFolder,
            docFolderName,
            sizeBytes,
            sizeStr,
            proposedName: finalName,
            targetPath: allReportsDir ? path.join(allReportsDir, finalName) : '',
            status: 'Ready',
          });
        }
      }
    };

    await walk(cleanSource);
    return results;
  }

  async executeInventoryReports(
    items: InventoryReportItem[],
    destDir: string,
    mode: 'copy' | 'move' = 'copy',
    dryRun = false
  ): Promise<{ success: number; failed: number; allReportsFolder: string; manifestPath: string; errors: string[] }> {
    const cleanDest = path.resolve((destDir || '').replace(/^file:\/\/\/?/, ''));
    if (!cleanDest) throw new Error('Valid destination folder must be specified.');

    const allReportsFolder = path.join(cleanDest, 'All Inventory Reports');
    if (!dryRun) {
      await fs.promises.mkdir(allReportsFolder, { recursive: true });
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const manifestRows: { source: string; destination: string; shoot: string; status: string }[] = [];

    for (const item of items) {
      const targetFilePath = path.join(allReportsFolder, item.proposedName);

      if (dryRun) {
        success++;
        manifestRows.push({
          source: item.sourcePath,
          destination: targetFilePath,
          shoot: item.shootFolder,
          status: `Dry Run (${mode.toUpperCase()})`,
        });
        continue;
      }

      try {
        let finalPath = targetFilePath;
        let c = 1;
        const ext = path.extname(targetFilePath);
        const base = path.basename(targetFilePath, ext);
        while (fs.existsSync(finalPath)) {
          finalPath = path.join(allReportsFolder, `${base}_${c}${ext}`);
          c++;
        }

        if (mode === 'move') {
          try {
            await fs.promises.rename(item.sourcePath, finalPath);
          } catch {
            await fs.promises.cp(item.sourcePath, finalPath);
            await fs.promises.rm(item.sourcePath, { force: true });
          }
        } else {
          await fs.promises.cp(item.sourcePath, finalPath);
        }

        success++;
        manifestRows.push({
          source: item.sourcePath,
          destination: finalPath,
          shoot: item.shootFolder,
          status: `Success (${mode.toUpperCase()})`,
        });
      } catch (err: any) {
        failed++;
        errors.push(`${item.filename}: ${err.message}`);
        manifestRows.push({
          source: item.sourcePath,
          destination: targetFilePath,
          shoot: item.shootFolder,
          status: `Error: ${err.message}`,
        });
      }
    }

    let manifestPath = '';
    if (!dryRun && success > 0) {
      try {
        const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        manifestPath = path.join(allReportsFolder, `collection_manifest_${ts}.csv`);
        const csvContent =
          'Source,Destination,Shoot Folder,Status\n' +
          manifestRows.map((r) => `"${r.source}","${r.destination}","${r.shoot}","${r.status}"`).join('\n');
        await fs.promises.writeFile(manifestPath, csvContent, 'utf-8');
      } catch {}
    }

    return { success, failed, allReportsFolder, manifestPath, errors };
  }
}

export interface DoNotUploadItem {
  source: string;
  name: string;
  dateFolder: string;
  destination: string;
  fileCount: number;
  totalBytes: number;
  sizeStr: string;
}

export interface InventoryReportItem {
  sourcePath: string;
  filename: string;
  folder: string;
  shootFolder: string;
  isInDocFolder: boolean;
  docFolderName: string;
  sizeBytes: number;
  sizeStr: string;
  proposedName: string;
  targetPath: string;
  status: string;
}
