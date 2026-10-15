# 📋 Microsoft Store Submission Step-by-Step Guide — DataFlow Studio v4.0

This guide provides the complete walkthrough for publishing **DataFlow Studio v4.0** to the Microsoft Store through the **Microsoft Partner Center** portal.

---

## 🗂️ Overview of Created Assets

All assets are located in the [`microsoft_store_assets/`](file:///d:/ON_GOING%20PROJECT/DATAFLOW/microsoft_store_assets/) folder:

```text
microsoft_store_assets/
├── documents/
│   ├── STORE_LISTING_METADATA.md          <-- Full listing metadata & copy
│   ├── STORE_LISTING_METADATA.txt          <-- Quick copy-paste format
│   ├── PRIVACY_POLICY.md                  <-- Markdown privacy policy
│   ├── PRIVACY_POLICY.html                <-- Ready-to-host HTML privacy policy
│   ├── TERMS_OF_SERVICE_AND_EULA.md       <-- End-user license agreement
│   └── STORE_SUBMISSION_CHECKLIST.md      <-- This guide
└── images/
    ├── logos/
    │   ├── StoreLogo_300x300.png          <-- Primary 1:1 Store Logo
    │   ├── Square150x150Logo.png          <-- Medium app tile
    │   ├── Square71x71Logo.png            <-- Small app tile
    │   ├── Square50x50Logo.png            <-- Legacy Store logo
    │   └── Square44x44Logo.png            <-- App list icon
    ├── promotional/
    │   ├── PosterArt_2400x1200.png        <-- 2:1 Hero & Spotlight Banner (Required for featuring)
    │   ├── SuperHeroArt_1920x1080.png     <-- 16:9 Super Hero Banner
    │   ├── SquarePromotional_1080x1080.png<-- 1:1 Featured Square Tile
    │   ├── WideBanner_1200x600.png        <-- 2:1 Wide Promotional Banner
    │   └── SplashScreen_1240x600.png      <-- Official Store Splash Screen
    └── screenshots/
        ├── Screenshot_1_Workspace_Overview.png
        ├── Screenshot_2_PVSeparator_Engine.png
        ├── Screenshot_3_Upload_Folder_Generator.png
        ├── Screenshot_4_Photo_Status_Tagger.png
        ├── Screenshot_5_MultiCamera_Video_Transfer.png
        ├── Screenshot_6_Event_Image_Distributor.png
        ├── Screenshot_7_Excel_Report_Merger.png
        ├── Screenshot_8_Standalone_Production_Tools.png
        └── Screenshot_9_Hardware_Concurrency_Preferences.png
```

---

## 🚀 Step-by-Step Submission Walkthrough

### Step 1: Log in to Microsoft Partner Center
1. Navigate to: [https://partner.microsoft.com/dashboard](https://partner.microsoft.com/dashboard)
2. Sign in with your registered Microsoft Developer Account.
3. In the sidebar, select **Apps and games** &rarr; **Overview**.
4. Click **New product** &rarr; **MSIX or PWA app** (or **EXE or MSI app**).
   * *Note: Microsoft Store supports direct Win32 `.exe` installers!*

---

### Step 2: Reserve the App Name
1. Enter the App Name: `DataFlow Studio`
2. Click **Check availability**.
3. Click **Reserve product name**.

---

### Step 3: Complete Pricing and Availability
1. **Pricing**: Choose **Free** (or your designated retail price tier).
2. **Markets**: Select **All markets** (241 countries and regions).
3. **Visibility**: Select **Public** (searchable and downloadable in Store).
4. **Schedule**: Select **Publish as soon as certified**.

---

### Step 4: Properties & Categorization
1. **Category**: `Developer tools` OR `Productivity`.
2. **Subcategory**: `Utilities & tools` OR `Photo & video`.
3. **Hardware Requirements**: Check `Keyboard`, `Mouse`, `High-DPI display`.
4. **Display Mode**: Windowed / Full screen.

---

### Step 5: Age Ratings (IARC Questionnaire)
1. Complete the standard IARC questionnaire:
   * Is it a game? &rarr; **No**
   * Does it contain violence, blood, or gore? &rarr; **No**
   * Does it contain profanity? &rarr; **No**
   * Does it share user location or private data? &rarr; **No**
   * Can users communicate online? &rarr; **No**
2. The rating generated will automatically be:
   * **PEGI 3 / ESRB Everyone / USK 0 (All Ages)**.

---

### Step 6: Packages (Upload Executable)

#### Option A: Direct Windows EXE Submission (Easiest)
1. Under **Package type**, select **EXE / MSI**.
2. Upload or provide the download URL for [`release/DataFlow Studio Setup 4.0.exe`](file:///d:/ON_GOING%20PROJECT/DATAFLOW/release/DataFlow%20Studio%20Setup%204.0.exe).
3. **Silent Install Parameters**: Enter `/S`
   *(NSIS installers automatically support `/S` for silent unattended installation).*
4. **Silent Uninstall Parameters**: Enter `/S`

#### Option B: MSIX / APPX Package (Alternative)
If you prefer submitting an `.msix` / `.appx` bundle:
1. Run `npx electron-builder --win appx` in your project folder.
2. Upload the generated `.appx` file located in `release/`.

---

### Step 7: Store Listing Assets (Copy-Paste)

Open [`STORE_LISTING_METADATA.txt`](file:///d:/ON_GOING%20PROJECT/DATAFLOW/microsoft_store_assets/documents/STORE_LISTING_METADATA.txt) and copy the content into each field:

1. **Short description (Subtitle)**:
   ```text
   Professional Media Ingestion, Synchronization & Report Fusion Desktop Suite.
   ```
2. **Description**:
   Paste the full description block from `STORE_LISTING_METADATA.txt`.
3. **Product Features**:
   Add the 12 to 14 bullet points from the metadata file.
4. **Search Keywords**:
   Enter the 7 tags (`media ingestion`, `photo organizer`, `video sync`, `excel merger`, `file batch rename`, `production workflow`, `camera transfer`).
5. **Privacy Policy URL**:
   Provide the URL where you host [`PRIVACY_POLICY.html`](file:///d:/ON_GOING%20PROJECT/DATAFLOW/microsoft_store_assets/documents/PRIVACY_POLICY.html) (e.g. `https://yourdomain.com/privacy` or GitHub Pages).
6. **Support Contact**:
   `support@bsframeworks.com` (or your support email).

---

### Step 8: Upload Images and Promotional Artwork

Navigate to the **Store logos** and **Screenshots** tabs:

| Section | Upload File from `microsoft_store_assets/images/` |
|---|---|
| **App Tile / Store Logo (1:1)** | `logos/StoreLogo_300x300.png` |
| **Small Tile (71x71)** | `logos/Square71x71Logo.png` |
| **Medium Tile (150x150)** | `logos/Square150x150Logo.png` |
| **App List Icon (44x44)** | `logos/Square44x44Logo.png` |
| **Poster Art (2400x1200)** | `promotional/PosterArt_2400x1200.png` |
| **Super Hero Art (1920x1080)** | `promotional/SuperHeroArt_1920x1080.png` |
| **Square Promotional (1080x1080)** | `promotional/SquarePromotional_1080x1080.png` |
| **Screenshots (1920x1080)** | Upload all 9 screenshots from `screenshots/` |

---

### Step 9: Notes for Certification
In the submission review notes box, paste:

```text
DataFlow Studio is a desktop utility application for professional media file management, photo/video organization, and local Excel report generation.

Testing Instructions:
1. The application does NOT require any user login, account creation, or online subscription to test.
2. Launch the application. The main Workspace Overview dashboard will load immediately.
3. Test Stage 00 (PV Separator) or Stage 01 (Upload Structure) by selecting any local test directory containing sample JPG or MP4 files.
4. All file operations and processing occur locally on the machine.
```

---

### Step 10: Submit for Review
1. Review all checkmarks in the Partner Center checklist.
2. Click **Submit to the Store**.
3. Typical certification review time takes between **2 to 24 hours**.
