#!/usr/bin/env node
/**
 * MediaFlow Studio — Automated Executable & Release Packaging Script
 * Integrated with the Anything Child App Ecosystem & GitHub Releases.
 *
 * Usage:
 *   node scripts/package-release.mjs [version] [--publish-github]
 *   node scripts/package-release.mjs 6.0.0 --publish-github
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Read Package.json and target version
const packageJsonPath = path.join(ROOT_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const args = process.argv.slice(2);
let targetVersion = pkg.version || '6.0.0';

// Check if version was passed as first arg
if (args[0] && !args[0].startsWith('--')) {
  targetVersion = args[0].replace(/^v/i, '');
}

console.log('============================================================');
console.log(`  MEDIAFLOW STUDIO RELEASE PACKAGING PIPELINE: v${targetVersion}`);
console.log('============================================================\n');

// 2. Synchronize version in package.json if updated
if (pkg.version !== targetVersion) {
  pkg.version = targetVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`✓ Synchronized package.json version to v${targetVersion}`);
}

// 3. Prepare child app manifests for Anything ecosystem
const appManifest = {
  id: "mediaflow-studio",
  name: "MediaFlow Studio",
  shortName: "MS",
  version: targetVersion,
  category: "Media & Video",
  description: "Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite.",
  executableName: "MediaFlow Studio.exe",
  setupExecutableName: `Mediaflow_studio_${targetVersion}_Setup.exe`,
  iconType: "svg",
  iconValue: "assets/logo.svg",
  gradient: "from-blue-600 to-indigo-700",
  textColor: "#0066ee",
  glowColor: "rgba(0, 102, 238, 0.45)",
  githubRepo: "BSFrameWorks5253/MediaFlow-Studio",
  releasesUrl: "https://github.com/BSFrameWorks5253/MediaFlow-Studio/releases",
  releasesApiUrl: "https://api.github.com/repos/BSFrameWorks5253/MediaFlow-Studio/releases/latest",
  downloadUrl: `https://github.com/BSFrameWorks5253/MediaFlow-Studio/releases/download/v${targetVersion}/Mediaflow_studio_${targetVersion}_Setup.exe`
};

const releaseManifest = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  appId: "mediaflow-studio",
  appName: "MediaFlow Studio",
  version: targetVersion,
  executableName: "MediaFlow Studio.exe",
  setupExecutableName: `Mediaflow_studio_${targetVersion}_Setup.exe`,
  releaseDate: new Date().toISOString().slice(0, 10),
  releaseType: "minor",
  tagline: "Flat Adobe CC-Style Ms Monogram & Anything Child App Ecosystem",
  summary: `MediaFlow Studio v${targetVersion} introduces a clean flat Adobe-style Ms squircle insignia, native Anything ecosystem loader sync, interactive Action Center toast notifications, and automated GitHub release publishing.`,
  newFeatures: [
    "Integrated into Anything Ecosystem with customized startup loader and diagnostic telemetry",
    "Apple WWDC26 Liquid Glass UI with dynamic chromatic ambient lighting and squircle insignia",
    "Automated release packaging generating version-wise Mediaflow_studio_<version> binaries",
    "Seamless auto-sync directly into the Anything releases catalog"
  ],
  improvements: [
    "Crisp vector Mf monogram insignia with specular rim matching Anything & Tap Studio",
    "Enhanced multi-camera PV separation pipeline and thumbnail memory management",
    "Native Action Center interactive toast banners for background ingestions and updates"
  ],
  fixes: [
    "Resolved premature window maximize flicker during startup via splash handoff",
    "Unified storage headroom verification and clean process termination"
  ],
  emailNotification: {
    subject: `🚀 MediaFlow Studio v${targetVersion}: Apple WWDC26 Liquid Glass UI & Anything Ecosystem!`,
    preview: `Discover all the new features, performance boosts, and fixes in v${targetVersion}.`,
    ctaText: "Open in Anything",
    heroGradient: "from-cyan-500 via-blue-600 to-indigo-700"
  }
};

// 4. Run clean build (Installer assets + Vite bundle + Electron TypeScript)
console.log('--- Step 1: Building presentation assets, Vite client & Electron main process ---');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('✓ Build completed successfully.');
} catch (err) {
  console.error('✗ Build failed:', err.message);
  process.exit(1);
}

// 5. Package Windows Binaries using electron-builder (Portable, NSIS setup, and ZIP)
console.log('\n--- Step 2: Packaging Windows Binaries (Portable, NSIS Setup & ZIP) ---');
try {
  execSync('npx electron-builder --win portable nsis zip --x64', {
    stdio: 'inherit',
    cwd: ROOT_DIR,
    env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' }
  });
  console.log('✓ Electron packaging completed.');
} catch (err) {
  console.error('✗ Packaging failed:', err.message);
  process.exit(1);
}

// 6. Create Version-Wise Output Directory inside MediaFlow Studio
const versionOutputDir = path.join(ROOT_DIR, 'releases', `v${targetVersion}`);
if (!fs.existsSync(versionOutputDir)) {
  fs.mkdirSync(versionOutputDir, { recursive: true });
}

// Write app.json and release.json inside releases/v<version>/
fs.writeFileSync(path.join(versionOutputDir, 'app.json'), JSON.stringify(appManifest, null, 2), 'utf8');
fs.writeFileSync(path.join(versionOutputDir, 'release.json'), JSON.stringify(releaseManifest, null, 2), 'utf8');

// Copy logo.svg into release folder
const logoSvgPath = path.join(ROOT_DIR, 'public', 'assets', 'logo.svg');
if (fs.existsSync(logoSvgPath)) {
  fs.copyFileSync(logoSvgPath, path.join(versionOutputDir, 'logo.svg'));
}

// Copy loader-config.json into release folder
const loaderConfigPath = path.join(ROOT_DIR, 'loader-config.json');
if (fs.existsSync(loaderConfigPath)) {
  fs.copyFileSync(loaderConfigPath, path.join(versionOutputDir, 'loader-config.json'));
}

console.log(`✓ Created app.json, release.json & loader-config.json in releases/v${targetVersion}/`);

const distReleaseDir = path.join(ROOT_DIR, 'dist-release');
console.log(`\n--- Step 3: Organizing artifacts into ${versionOutputDir} ---`);

let namedExePath = null;
let namedSetupPath = null;
let namedZipPath = null;

if (fs.existsSync(distReleaseDir)) {
  const files = fs.readdirSync(distReleaseDir);

  for (const file of files) {
    const srcPath = path.join(distReleaseDir, file);
    const stat = fs.statSync(srcPath);

    if (stat.isFile()) {
      if (file.toLowerCase().includes('setup') && file.endsWith('.exe')) {
        const destFileName = `Mediaflow_studio_${targetVersion}_Setup.exe`;
        const destPath = path.join(versionOutputDir, destFileName);
        fs.copyFileSync(srcPath, destPath);
        namedSetupPath = destPath;
        console.log(`✓ Organized Setup Installer: releases/v${targetVersion}/${destFileName}`);
      } else if (file.endsWith('.exe')) {
        const destFileName = `Mediaflow_studio_${targetVersion}.exe`;
        const destPath = path.join(versionOutputDir, destFileName);
        fs.copyFileSync(srcPath, destPath);
        namedExePath = destPath;
        console.log(`✓ Organized Portable Exe: releases/v${targetVersion}/${destFileName}`);
      } else if (file.endsWith('.zip')) {
        const destFileName = `Mediaflow_studio_${targetVersion}.zip`;
        const destPath = path.join(versionOutputDir, destFileName);
        fs.copyFileSync(srcPath, destPath);
        namedZipPath = destPath;
        console.log(`✓ Organized ZIP archive: releases/v${targetVersion}/${destFileName}`);
      }
    }
  }
}

// 7. Automatic Sync to Anything Application Ecosystem
console.log('\n--- Step 4: Synchronizing Release Artifacts to Anything Ecosystem ---');
const desktopDir = path.dirname(ROOT_DIR);
const candidateAnythingDirs = [
  'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\New folder (2)\\Anything',
  'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Anything',
  path.join(desktopDir, 'New folder (2)', 'Anything'),
  path.join(desktopDir, 'Anything')
];

const uniqueAnythingDirs = Array.from(new Set(candidateAnythingDirs.filter(d => fs.existsSync(d))));

if (uniqueAnythingDirs.length > 0) {
  for (const anythingDir of uniqueAnythingDirs) {
    console.log(`✓ Detected Anything app directory at: ${anythingDir}`);

    // Target directory per Master Prompts: Anything/releases/mediaflow-studio/
    const anythingReleaseDir = path.join(anythingDir, 'releases', 'mediaflow-studio');
    const anythingVersionDir = path.join(anythingReleaseDir, `v${targetVersion}`);

    try {
      if (!fs.existsSync(anythingReleaseDir)) {
        fs.mkdirSync(anythingReleaseDir, { recursive: true });
      }
      if (!fs.existsSync(anythingVersionDir)) {
        fs.mkdirSync(anythingVersionDir, { recursive: true });
      }

      // Copy release files to Anything/releases/mediaflow-studio/
      const filesToSync = fs.readdirSync(versionOutputDir);
      for (const f of filesToSync) {
        const src = path.join(versionOutputDir, f);
        fs.copyFileSync(src, path.join(anythingReleaseDir, f));
        fs.copyFileSync(src, path.join(anythingVersionDir, f));
      }
      console.log(`✓ Successfully synced ${filesToSync.length} files to Anything:`);
      console.log(`   ➜ ${anythingReleaseDir}`);
      console.log(`   ➜ ${anythingVersionDir} (Archive / Rollback ready)`);

      // Trigger Anything's release collector
      const collectorScript = path.join(anythingDir, 'scripts', 'collect-releases.cjs');
      if (fs.existsSync(collectorScript)) {
        try {
          console.log('\n--- Running Anything Release Collector ---');
          execSync(`node "${collectorScript}"`, { stdio: 'inherit', cwd: anythingDir });
          console.log('✓ Anything Release Collector refreshed catalog.json!');
        } catch (colErr) {
          console.warn('⚠️ Collector run notice:', colErr.message);
        }
      }
    } catch (err) {
      console.warn(`✗ Failed syncing to ${anythingReleaseDir}:`, err.message);
    }
  }
} else {
  console.log(`ℹ️ Anything directory not found in candidate paths (skipping auto-sync).`);
}

// 8. Automated Git Tagging & Push for GitHub Releases
if (args.includes('--publish-github') || args.includes('--push-tag')) {
  console.log('\n--- Step 5: Publishing Release Tag to GitHub ---');
  const tagName = `v${targetVersion}`;
  try {
    console.log(`Staging release changes...`);
    execSync('git add -A', { stdio: 'inherit', cwd: ROOT_DIR });
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: ROOT_DIR }).trim();
    if (status) {
      execSync(`git commit -m "chore(release): ${tagName}"`, { stdio: 'inherit', cwd: ROOT_DIR });
      console.log(`✓ Committed release changes.`);
    }

    execSync(`git tag -a ${tagName} -m "Release ${tagName}" -f`, { stdio: 'inherit', cwd: ROOT_DIR });
    console.log(`✓ Created git release tag ${tagName}`);

    console.log(`Pushing commit & tag to GitHub origin...`);
    execSync('git push origin main', { stdio: 'inherit', cwd: ROOT_DIR });
    execSync(`git push origin ${tagName} --force`, { stdio: 'inherit', cwd: ROOT_DIR });
    console.log(`🚀 Successfully pushed ${tagName} to GitHub!`);
    console.log(`   GitHub Actions is now building and publishing the release at:`);
    console.log(`   ➜ https://github.com/BSFrameWorks5253/MediaFlow-Studio/releases`);
  } catch (err) {
    console.error('✗ Failed pushing git release tag to GitHub:', err.message);
  }
}

console.log('\n============================================================');
console.log(`🎉 RELEASE PACKAGING FOR v${targetVersion} COMPLETED!`);
if (namedExePath) console.log(`📦 Portable Exe   : ${namedExePath}`);
if (namedSetupPath) console.log(`📦 NSIS Setup Exe : ${namedSetupPath}`);
if (namedZipPath) console.log(`📦 ZIP Archive    : ${namedZipPath}`);
console.log('============================================================\n');
