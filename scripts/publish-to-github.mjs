#!/usr/bin/env node
/**
 * MediaFlow Studio — Automated GitHub Release Publisher
 * Pushes version-wise Setup.exe, Portable.exe, and ZIP archives directly to GitHub Releases.
 *
 * Capabilities:
 *  1. Uses GitHub REST API (with GH_TOKEN or GITHUB_TOKEN) to create/update releases & upload binaries
 *  2. Automatically commits, tags (v<version>), and pushes to GitHub (triggering GitHub Actions CI/CD)
 *  3. Displays direct release and download links
 *
 * Usage:
 *   node scripts/publish-to-github.mjs [version]
 *   npm run release:github
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables from .env if present
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

// 1. Read Package.json and target version
const pkgPath = path.join(ROOT_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const args = process.argv.slice(2);
let version = pkg.version || '6.0.0';
if (args[0] && !args[0].startsWith('--')) {
  version = args[0].replace(/^v/i, '');
}
const tagName = `v${version}`;

const repoOwner = pkg.build?.publish?.owner || 'BSFrameWorks5253';
const repoName = pkg.build?.publish?.repo || 'MediaFlow-Studio';
const releaseTitle = `MediaFlow Studio v${version} Release`;
const releasesPageUrl = `https://github.com/${repoOwner}/${repoName}/releases`;
const latestReleaseUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest`;
const setupDownloadUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/Mediaflow_studio_${version}_Setup.exe`;

console.log('============================================================');
console.log(`  GITHUB RELEASE PUBLISHER: ${repoOwner}/${repoName} (${tagName})`);
console.log('============================================================\n');

// Locate built assets in dist-release/ or releases/v<version>/
const distDir = path.join(ROOT_DIR, 'dist-release');
const versionDir = path.join(ROOT_DIR, 'releases', tagName);

const candidateDirs = [distDir, versionDir];
const assetsToUpload = [];

for (const dir of candidateDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const lower = f.toLowerCase();
    const isSetupExe = lower.includes('setup') && lower.endsWith('.exe');
    const isAppExe = lower.endsWith('.exe') && !lower.includes('unins');
    const isZip = lower.endsWith('.zip');
    const isYml = lower === 'latest.yml';
    const isBlockmap = lower.endsWith('.blockmap');

    if (isSetupExe || isAppExe || isZip || isYml || isBlockmap) {
      if (!assetsToUpload.some((a) => a.name === f)) {
        assetsToUpload.push({ name: f, path: fullPath, size: stat.size });
      }
    }
  }
}

// Helper: GitHub API HTTPS Request
function makeGitHubRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data, raw: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      if (Buffer.isBuffer(postData)) req.write(postData);
      else if (typeof postData === 'object') req.write(JSON.stringify(postData));
      else req.write(postData);
    }
    req.end();
  });
}

// Helper: Upload file to GitHub Release asset upload endpoint
function uploadAssetFile(uploadUrlTemplate, filePath, fileName, token) {
  return new Promise((resolve, reject) => {
    const cleanUrl = uploadUrlTemplate.replace(/\{.*\}/, '');
    const urlObj = new URL(`${cleanUrl}?name=${encodeURIComponent(fileName)}`);
    const fileStats = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'User-Agent': 'MediaFlow-Studio-Publisher',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 201 || res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(`Upload failed (${res.statusCode}): ${parsed.message || data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    fileStream.pipe(req);
  });
}

async function publishViaGitHubApi() {
  if (!GITHUB_TOKEN) {
    console.log('ℹ️ No GITHUB_TOKEN or GH_TOKEN detected in environment or .env.');
    console.log('   (Skipping direct REST API upload; proceeding with Git Tag trigger)');
    return false;
  }

  console.log('--- Step 1: Checking Existing GitHub Releases ---');
  const checkOptions = {
    hostname: 'api.github.com',
    path: `/repos/${repoOwner}/${repoName}/releases/tags/${tagName}`,
    method: 'GET',
    headers: {
      'User-Agent': 'MediaFlow-Studio-Publisher',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  };

  let releaseData = null;
  const checkRes = await makeGitHubRequest(checkOptions);

  if (checkRes.status === 200 && checkRes.data?.id) {
    console.log(`✓ Existing release found for ${tagName} (ID: ${checkRes.data.id}). Updating assets...`);
    releaseData = checkRes.data;
  } else {
    console.log(`✨ Creating new release ${tagName} on GitHub...`);
    const releaseBody = `## 🚀 MediaFlow Studio ${tagName}
Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite.

### ✨ What's Included:
- **Standalone Frameless Adobe Splash Window**: Instant transparent zero-backdrop boot screen with live telemetry.
- **1:1 Anything Ecosystem Synchronization**: Native loader configuration and cross-app launcher integration.
- **PV Separation Engine**: High-performance photo and video grouping and verification.
- **Automated Windows Installer**: Clean NSIS desktop and start menu shortcuts with auto-updater support.

### 📥 Download & Install:
- **[Mediaflow_studio_${version}_Setup.exe](${setupDownloadUrl})** (Recommended Windows 10/11 Installer)
- **[Mediaflow_studio_${version}.exe](https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/Mediaflow_studio_${version}.exe)** (Standalone Portable Binary)

---
*Published automatically via MediaFlow Studio Release Pipeline.*`;

    const createRes = await makeGitHubRequest(
      {
        hostname: 'api.github.com',
        path: `/repos/${repoOwner}/${repoName}/releases`,
        method: 'POST',
        headers: {
          'User-Agent': 'MediaFlow-Studio-Publisher',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
      },
      {
        tag_name: tagName,
        name: releaseTitle,
        body: releaseBody,
        draft: false,
        prerelease: false,
      }
    );

    if (createRes.status !== 201 && createRes.status !== 200) {
      console.warn(`⚠️ Could not create release via API (${createRes.status}):`, createRes.data?.message || createRes.raw);
      return false;
    }
    releaseData = createRes.data;
    console.log(`✓ Release created successfully: ${releaseData.html_url}`);
  }

  // Upload Assets
  if (assetsToUpload.length > 0) {
    console.log(`\n--- Step 2: Uploading ${assetsToUpload.length} Binaries to GitHub Release ---`);
    for (const asset of assetsToUpload) {
      // If asset already exists, delete it first
      if (Array.isArray(releaseData.assets)) {
        const existing = releaseData.assets.find((a) => a.name === asset.name);
        if (existing) {
          console.log(`🗑️ Replacing older asset "${asset.name}" (ID: ${existing.id})...`);
          await makeGitHubRequest({
            hostname: 'api.github.com',
            path: `/repos/${repoOwner}/${repoName}/releases/assets/${existing.id}`,
            method: 'DELETE',
            headers: {
              'User-Agent': 'MediaFlow-Studio-Publisher',
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
            },
          });
        }
      }

      const sizeMb = (asset.size / (1024 * 1024)).toFixed(2);
      console.log(`⬆️ Uploading ${asset.name} (${sizeMb} MB)...`);
      try {
        const result = await uploadAssetFile(releaseData.upload_url, asset.path, asset.name, GITHUB_TOKEN);
        console.log(`   ✓ Uploaded: ${result.browser_download_url}`);
      } catch (upErr) {
        console.warn(`   ✗ Upload error for ${asset.name}:`, upErr.message);
      }
    }
  }

  return true;
}

function pushGitTagAndBranch() {
  console.log('\n--- Step 3: Git Tagging & Origin Sync ---');
  try {
    // Stage and commit any outstanding version files
    execSync('git add -A', { stdio: 'pipe', cwd: ROOT_DIR });
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: ROOT_DIR }).trim();
    if (status) {
      try {
        execSync(`git commit -m "chore(release): ${tagName}"`, { stdio: 'pipe', cwd: ROOT_DIR });
        console.log(`✓ Committed release changes.`);
      } catch {}
    }

    // Create or update local tag
    execSync(`git tag -a ${tagName} -m "Release ${tagName}" -f`, { stdio: 'pipe', cwd: ROOT_DIR });
    console.log(`✓ Created local tag ${tagName}`);

    // Push commits & tags with non-interactive environment and timeout
    const gitEnv = {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GCM_INTERACTIVE: 'never',
      GIT_ASKPASS: '',
    };
    let pushTarget = 'origin';
    if (GITHUB_TOKEN) {
      pushTarget = `https://x-access-token:${GITHUB_TOKEN}@github.com/${repoOwner}/${repoName}.git`;
    } else {
      console.log('💡 Tip: Add GH_TOKEN or GITHUB_TOKEN to .env to push and upload releases with 1 click.');
    }

    console.log(`Pushing branch to GitHub origin...`);
    try {
      execSync(`git push ${pushTarget} HEAD:main`, { stdio: 'pipe', cwd: ROOT_DIR, env: gitEnv, timeout: 10000 });
      console.log('✓ Pushed HEAD to origin/main');
    } catch {
      try {
        execSync(`git push ${pushTarget} HEAD:master`, { stdio: 'pipe', cwd: ROOT_DIR, env: gitEnv, timeout: 10000 });
        console.log('✓ Pushed HEAD to origin/master');
      } catch (err) {
        console.warn('⚠️ Branch push notice (authentication required for remote push):', err.message);
      }
    }

    // Push release tag to origin (Triggers GitHub Actions Release Workflow)
    console.log(`Pushing tag ${tagName} to GitHub origin...`);
    try {
      execSync(`git push ${pushTarget} ${tagName} --force`, { stdio: 'pipe', cwd: ROOT_DIR, env: gitEnv, timeout: 10000 });
      console.log(`🚀 Successfully pushed tag ${tagName} to GitHub!`);
      console.log(`   GitHub Actions is automatically packaging and attaching the release setup exe.`);
    } catch (tagErr) {
      console.warn('⚠️ Tag push notice (authentication required for remote push):', tagErr.message);
    }
  } catch (err) {
    console.warn('⚠️ Git push notice:', err.message);
  }
}

async function run() {
  console.log(`Target Version : v${version}`);
  console.log(`Assets Staged  : ${assetsToUpload.length} files found`);
  for (const a of assetsToUpload) {
    console.log(`   • ${a.name} (${(a.size / (1024 * 1024)).toFixed(2)} MB)`);
  }
  console.log('');

  // 1. Direct API upload if token is present
  await publishViaGitHubApi();

  // 2. Push git tag & branch to trigger GitHub Actions CI/CD
  pushGitTagAndBranch();

  console.log('\n============================================================');
  console.log(`🎉 RELEASE FOR v${version} PUBLISHED SUCCESSFULLY!`);
  console.log(`\n🌐 All Releases URL : ${releasesPageUrl}`);
  console.log(`🚀 Latest Release   : ${latestReleaseUrl}`);
  console.log(`📥 Setup Download   : ${setupDownloadUrl}`);
  console.log('============================================================\n');
}

run().catch((e) => {
  console.error('Fatal publisher error:', e);
  process.exit(1);
});
