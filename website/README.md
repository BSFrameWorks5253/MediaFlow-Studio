# 🌐 DataFlow Studio — Firebase Website & GitHub MSI Updates Guide

This directory contains the production-ready landing website for **DataFlow Studio v4.0**, pre-configured for **Firebase Hosting** with real-time **GitHub Releases & MSI Auto-Updates**.

---

## 📁 Directory Structure
```text
website/
├── firebase.json              # Firebase Hosting routing & cache configuration
├── .firebaserc                # Firebase default project alias
├── DEPLOY_FIREBASE.bat        # One-click deployment script
├── README.md                  # This guide
└── public/                    # Production static site root
    ├── index.html             # High-converting landing page with live release sync
    ├── privacy.html           # Full Privacy Policy (ready for Microsoft Store / OAuth)
    ├── terms.html             # Terms of Service & EULA
    ├── css/
    │   └── styles.css         # Dark obsidian liquid glass styling
    ├── js/
    │   ├── app.js             # Interactive lightbox & stage tab switcher
    │   └── github-updater.js  # Live GitHub API client for MSI & EXE releases
    └── assets/                # App icons, banners, and 1920x1080 screenshots
```

---

## ⚡ How MSI Updates Work From GitHub

The website is wired directly to the **GitHub Releases API**:

1. **Live Asset Detection**:
   When visitors arrive at the website, `github-updater.js` automatically calls:
   ```http
   GET https://api.github.com/repos/{owner}/{repo}/releases/latest
   ```
2. **Dynamic MSI Asset Matching**:
   It automatically searches the assets attached to the latest release for `.msi` (e.g. `DataFlow Studio 4.0.msi`) and `.exe` (e.g. `DataFlow Studio Setup 4.0.exe`).
3. **Instant Direct Download**:
   The **"Download Windows MSI Installer"** button is dynamically populated with the direct asset download URL (`browser_download_url`) and the exact file size (e.g. `98.6 MB`).
4. **Live Changelog Injection**:
   The release notes written in GitHub Releases are pulled and rendered directly on the website.
5. **Configuring Your GitHub Repo**:
   By default, the site is configured for `BSFrameWorks/dataflow-studio`.
   * **In code**: Change `window.DATAFLOW_CONFIG` in `public/index.html` line 14:
     ```javascript
     window.DATAFLOW_CONFIG = {
       githubOwner: "YOUR_GITHUB_USERNAME",
       githubRepo: "YOUR_REPO_NAME"
     };
     ```
   * **On the live page**: Click **"Change Repo"** in the updates section to switch or test any repository instantly without editing code.

---

## 🚀 How to Deploy to Firebase Hosting

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed on your system.

### One-Click Deploy
Simply double-click:
```cmd
DEPLOY_FIREBASE.bat
```

### Manual Command Line Steps
1. Navigate to the `website` directory:
   ```cmd
   cd website
   ```
2. Log in to your Firebase account (first time only):
   ```cmd
   npx firebase-tools login
   ```
3. Set your Firebase project ID:
   ```cmd
   npx firebase-tools use --add
   ```
   *(Select or enter your Firebase project from the interactive list)*
4. Deploy the site to Firebase Hosting:
   ```cmd
   npx firebase-tools deploy --only hosting
   ```
5. Your website will be instantly live at:
   `https://<your-project-id>.web.app` or `https://<your-project-id>.firebaseapp.com`
