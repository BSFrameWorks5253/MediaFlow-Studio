================================================================================
PHOTO STATUS MATCHER & RENAMER TOOL (PORTABLE EDITION)
================================================================================

HOW TO USE ON THIS PC OR ANY OTHER PC:
-------------------------------------
1. Copy or Zip this entire folder ("PHOTO_RENAMER_PORTABLE") and send it to any PC.
2. Double-click "DOUBLE_CLICK_TO_RUN.bat" to start the app.
   - The bat file will automatically detect Python.
   - It will automatically check and install any required libraries listed in
     "requirements.txt" before launching the tool.
   - No manual setup or pip commands required!

IF PYTHON IS NOT INSTALLED ON THE CLIENT PC:
--------------------------------------------
The launcher will notify you with a clear 1-line command:
- Open PowerShell and run: winget install Python.Python.3.12
  OR download from: https://www.python.org/downloads/
  (Check the box "Add python.exe to PATH" during installation)

FEATURES & LOGIC:
-----------------
1. Two-Path Selection:
   - First Path: Folder containing SELECTED PHOTOS (can have subfolders).
   - Second Path: Folder containing ALL PHOTOS (can have subfolders).

2. Folder Pairing:
   - "By Folder Order": 1st folder in First Path matches 1st folder in Second Path,
     2nd matches 2nd, etc.
   - "By Folder Name": Matches subfolders with the same name.
   - If there are no subfolders, it compares root folders directly.

3. Ignored Files:
   - Automatically ignores/skips all photos ending with "_P" and "_V"
     (e.g., DSC0001_P.jpg, IMG_002_V.jpeg).

4. Tagging & Renaming:
   - Photos in Second Path that MATCH a selected photo get renamed with "_U".
   - Photos in Second Path NOT present in Selected Photos get renamed with "_R".
   - Pre-existing "_U" or "_R" suffixes are safely cleaned to prevent "_U_U".

5. Safety:
   - "Dry Run" mode allows previewing all changes before touching files.
   - Generates a full CSV audit report in a "DOCUMENT_REPORTS" folder.
================================================================================
