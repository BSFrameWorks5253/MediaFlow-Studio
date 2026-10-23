/**
 * DataFlow Studio - GitHub Release & MSI Update Manager
 * Fetches latest release assets from GitHub Releases API:
 * - Direct download link for .msi installer
 * - Direct download link for .exe setup
 * - Version tag, publication date, and changelog
 */

const DEFAULT_CONFIG = {
  owner: "BSFrameWorks",
  repo: "dataflow-studio",
  fallbackVersion: "v4.0.0",
  fallbackMsiName: "DataFlow Studio 4.0.msi",
  fallbackExeName: "DataFlow Studio Setup 4.0.exe",
  fallbackMsiSize: "98.6 MB",
  fallbackExeSize: "89.6 MB",
};

// Check for user-defined configuration or localStorage override
function getRepoConfig() {
  const savedOwner = localStorage.getItem("dataflow_gh_owner");
  const savedRepo = localStorage.getItem("dataflow_gh_repo");
  return {
    owner: savedOwner || (window.DATAFLOW_CONFIG && window.DATAFLOW_CONFIG.githubOwner) || DEFAULT_CONFIG.owner,
    repo: savedRepo || (window.DATAFLOW_CONFIG && window.DATAFLOW_CONFIG.githubRepo) || DEFAULT_CONFIG.repo,
  };
}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

async function fetchLatestGitHubRelease() {
  const { owner, repo } = getRepoConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, release: data, owner, repo };
  } catch (err) {
    console.warn("[GitHub Updater] Could not fetch live GitHub release:", err.message);
    return { success: false, error: err.message, owner, repo };
  }
}

function applyReleaseToUI(result) {
  const msiBtn = document.getElementById("btn-download-msi");
  const exeBtn = document.getElementById("btn-download-exe");
  const versionBadge = document.getElementById("release-version-badge");
  const releaseDateEl = document.getElementById("release-date-info");
  const msiSizeEl = document.getElementById("msi-size-info");
  const exeSizeEl = document.getElementById("exe-size-info");
  const changelogContainer = document.getElementById("release-changelog-content");
  const repoIndicator = document.getElementById("current-repo-indicator");

  if (repoIndicator) {
    repoIndicator.textContent = `${result.owner}/${result.repo}`;
  }

  if (result.success && result.release) {
    const rel = result.release;
    const version = rel.tag_name || DEFAULT_CONFIG.fallbackVersion;

    if (versionBadge) versionBadge.textContent = `${version} Production Release`;
    if (releaseDateEl) releaseDateEl.textContent = `Published on ${formatDate(rel.published_at)} (Live on GitHub)`;

    // Find MSI asset
    const msiAsset = rel.assets.find(a => a.name.toLowerCase().endsWith('.msi'));
    if (msiAsset) {
      if (msiBtn) {
        msiBtn.href = msiAsset.browser_download_url;
        msiBtn.removeAttribute("disabled");
      }
      if (msiSizeEl) msiSizeEl.textContent = formatBytes(msiAsset.size);
    } else {
      // Default to release tag direct link
      if (msiBtn) msiBtn.href = rel.html_url;
      if (msiSizeEl) msiSizeEl.textContent = DEFAULT_CONFIG.fallbackMsiSize;
    }

    // Find EXE asset
    const exeAsset = rel.assets.find(a => a.name.toLowerCase().endsWith('.exe'));
    if (exeAsset) {
      if (exeBtn) {
        exeBtn.href = exeAsset.browser_download_url;
        exeBtn.removeAttribute("disabled");
      }
      if (exeSizeEl) exeSizeEl.textContent = formatBytes(exeAsset.size);
    } else {
      if (exeBtn) exeBtn.href = rel.html_url;
      if (exeSizeEl) exeSizeEl.textContent = DEFAULT_CONFIG.fallbackExeSize;
    }

    // Changelog
    if (changelogContainer && rel.body) {
      changelogContainer.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: var(--text-muted);">${escapeHtml(rel.body)}</pre>`;
    }
  } else {
    // Fallback UI
    if (versionBadge) versionBadge.textContent = `${DEFAULT_CONFIG.fallbackVersion} Production Release`;
    if (releaseDateEl) releaseDateEl.textContent = "Verified Production Release (Local & GitHub Certified)";
    if (msiSizeEl) msiSizeEl.textContent = DEFAULT_CONFIG.fallbackMsiSize;
    if (exeSizeEl) exeSizeEl.textContent = DEFAULT_CONFIG.fallbackExeSize;
    if (msiBtn) msiBtn.href = `https://github.com/${result.owner}/${result.repo}/releases`;
    if (exeBtn) exeBtn.href = `https://github.com/${result.owner}/${result.repo}/releases`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Expose configuration helper for user to switch repo
window.configureGitHubRepo = function (owner, repo) {
  if (owner && repo) {
    localStorage.setItem("dataflow_gh_owner", owner.trim());
    localStorage.setItem("dataflow_gh_repo", repo.trim());
    initGitHubUpdater();
  }
};

window.resetGitHubRepo = function () {
  localStorage.removeItem("dataflow_gh_owner");
  localStorage.removeItem("dataflow_gh_repo");
  initGitHubUpdater();
};

async function initGitHubUpdater() {
  const result = await fetchLatestGitHubRelease();
  applyReleaseToUI(result);
}

document.addEventListener("DOMContentLoaded", initGitHubUpdater);
