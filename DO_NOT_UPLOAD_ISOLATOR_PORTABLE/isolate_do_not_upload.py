#!/usr/bin/env python3
"""
===============================================================================
 DO NOT UPLOAD Isolator Tool — Standalone Portable Script & GUI
===============================================================================
 Recursively scans a selected root directory for folders named:
   - 'Contributer' / 'Contributor' / 'Contributors'
   - 'Documents' / 'Document' / 'Docs'
 (and common naming variants).

 When found, moves (or copies) them into a 'DO NOT UPLOAD' folder,
 organized date-wise / by main folder name:
   <Root>/DO NOT UPLOAD/<Date_Or_Main_Folder>/Contributer
   <Root>/DO NOT UPLOAD/<Date_Or_Main_Folder>/Documents

 Includes:
   - GUI with folder browse, scan preview table, dry-run simulation, and execution
   - CLI mode for automated workflows
   - CSV audit manifest generation
===============================================================================
"""

import os
import sys
import re
import csv
import shutil
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Folder name matching patterns (case-insensitive)
TARGET_FOLDER_PATTERNS = [
    re.compile(r'^contribut[eo]rs?.*$', re.IGNORECASE),
    re.compile(r'^documents?.*$', re.IGNORECASE),
    re.compile(r'^docs?$', re.IGNORECASE),
]

DO_NOT_UPLOAD_FOLDER_NAME = "DO NOT UPLOAD"


def is_target_folder(name: str) -> bool:
    """Checks if a folder name matches 'Contributer' or 'Documents'."""
    clean = name.strip()
    if clean.upper() == DO_NOT_UPLOAD_FOLDER_NAME:
        return False
    for pat in TARGET_FOLDER_PATTERNS:
        if pat.match(clean):
            return True
    return False


def get_main_date_folder(root_path: Path, item_path: Path) -> str:
    """
    Determines the date-wise / main folder name relative to the root directory.
    If item is at Root/2026-10-01/Contributer -> returns '2026-10-01'
    If item is at Root/Contributer -> returns 'Root'
    If item is at Root/Event/Sub/Contributer -> returns 'Event'
    """
    try:
        rel = item_path.relative_to(root_path)
        parts = rel.parts
        if len(parts) > 1:
            return parts[0]
        return "Root"
    except Exception:
        return "Root"


def get_folder_stats(folder_path: Path) -> Tuple[int, int, str]:
    """Returns (file_count, total_bytes, human_size_str)."""
    file_count = 0
    total_bytes = 0
    try:
        for root, _, files in os.walk(folder_path):
            file_count += len(files)
            for f in files:
                try:
                    fp = os.path.join(root, f)
                    total_bytes += os.path.getsize(fp)
                except Exception:
                    pass
    except Exception:
        pass

    if total_bytes >= 1024 * 1024 * 1024:
        size_str = f"{total_bytes / (1024 * 1024 * 1024):.2f} GB"
    elif total_bytes >= 1024 * 1024:
        size_str = f"{total_bytes / (1024 * 1024):.1f} MB"
    elif total_bytes >= 1024:
        size_str = f"{total_bytes / 1024:.0f} KB"
    else:
        size_str = f"{total_bytes} B"

    return file_count, total_bytes, size_str


def scan_for_do_not_upload(root_dir: str) -> List[Dict]:
    """
    Scans root_dir for target folders ('Contributer', 'Documents')
    and prepares the relocation plan.
    """
    root_p = Path(root_dir).resolve()
    if not root_p.is_dir():
        raise NotADirectoryError(f"Directory not found: {root_dir}")

    results = []
    do_not_upload_root = root_p / DO_NOT_UPLOAD_FOLDER_NAME

    # Walk directories
    for current_root, dirs, _ in os.walk(root_p):
        curr_p = Path(current_root)

        # Do not scan inside the DO NOT UPLOAD folder itself
        if do_not_upload_root in curr_p.parents or curr_p == do_not_upload_root:
            continue

        for d in list(dirs):
            if is_target_folder(d):
                src_path = curr_p / d
                date_folder = get_main_date_folder(root_p, src_path)
                dest_dir = do_not_upload_root / date_folder / d
                file_count, total_bytes, size_str = get_folder_stats(src_path)

                results.append({
                    "source": str(src_path),
                    "name": d,
                    "date_folder": date_folder,
                    "destination": str(dest_dir),
                    "file_count": file_count,
                    "total_bytes": total_bytes,
                    "size_str": size_str,
                })
                # Don't recurse into matched folder since it will be moved as a whole
                dirs.remove(d)

    return results


def execute_isolation(
    items: List[Dict],
    mode: str = "move",
    dry_run: bool = False
) -> Dict:
    """
    Executes the isolation plan by moving or copying matched folders into DO NOT UPLOAD.
    """
    succ = 0
    fail = 0
    errors = []
    manifest_rows = []

    for item in items:
        src = Path(item["source"])
        dst = Path(item["destination"])

        if dry_run:
            succ += 1
            manifest_rows.append({
                "source": str(src),
                "destination": str(dst),
                "date_folder": item["date_folder"],
                "status": "Dry Run (Simulated)",
                "files": item["file_count"],
                "size": item["size_str"],
            })
            continue

        try:
            dst.parent.mkdir(parents=True, exist_ok=True)

            if dst.exists():
                # Merge contents if destination folder already exists
                for root, _, files in os.walk(src):
                    rel = os.path.relpath(root, src)
                    target_sub = dst / rel
                    target_sub.mkdir(parents=True, exist_ok=True)
                    for f in files:
                        s_file = os.path.join(root, f)
                        d_file = target_sub / f
                        if d_file.exists():
                            # Collision avoidance
                            stem = d_file.stem
                            ext = d_file.suffix
                            counter = 1
                            while d_file.exists():
                                d_file = target_sub / f"{stem}_{counter}{ext}"
                                counter += 1
                        if mode == "move":
                            shutil.move(s_file, str(d_file))
                        else:
                            shutil.copy2(s_file, str(d_file))
                if mode == "move":
                    shutil.rmtree(src, ignore_errors=True)
            else:
                if mode == "move":
                    shutil.move(str(src), str(dst))
                else:
                    shutil.copytree(str(src), str(dst))

            succ += 1
            manifest_rows.append({
                "source": str(src),
                "destination": str(dst),
                "date_folder": item["date_folder"],
                "status": f"Success ({mode.upper()})",
                "files": item["file_count"],
                "size": item["size_str"],
            })
        except Exception as e:
            fail += 1
            err_msg = f"{src.name}: {str(e)}"
            errors.append(err_msg)
            manifest_rows.append({
                "source": str(src),
                "destination": str(dst),
                "date_folder": item["date_folder"],
                "status": f"Error: {str(e)}",
                "files": item["file_count"],
                "size": item["size_str"],
            })

    # Save manifest CSV
    manifest_path = ""
    if items and not dry_run:
        try:
            dest_first = Path(items[0]["destination"])
            # Destination is <Root>/DO NOT UPLOAD/<date>/<name>
            dnu_dir = dest_first.parent.parent
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            manifest_path = str(dnu_dir / f"isolation_manifest_{ts}.csv")
            with open(manifest_path, "w", newline="", encoding="utf-8-sig") as cf:
                writer = csv.DictWriter(cf, fieldnames=["source", "destination", "date_folder", "status", "files", "size"])
                writer.writeheader()
                writer.writerows(manifest_rows)
        except Exception:
            pass

    return {
        "success": succ,
        "failed": fail,
        "errors": errors,
        "manifest_path": manifest_path,
        "dry_run": dry_run,
    }


# =============================================================================
# GUI Implementation (Tkinter dark-modern workstation)
# =============================================================================
def launch_gui():
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox

    root = tk.Tk()
    root.title("DO NOT UPLOAD Isolator — Contributer & Documents Folder Organizer")
    root.geometry("960, 640")
    root.minsize(780, 500)

    # Style
    style = ttk.Style()
    style.theme_use("clam")

    BG_COLOR = "#0F172A"
    CARD_BG = "#1E293B"
    TEXT_COLOR = "#F8FAFC"
    MUTED_TEXT = "#94A3B8"
    ACCENT_CYAN = "#06B6D4"
    ACCENT_GREEN = "#10B981"
    ACCENT_RED = "#EF4444"

    root.configure(bg=BG_COLOR)

    # Variables
    selected_dir_var = tk.StringVar(value="")
    mode_var = tk.StringVar(value="move")  # move or copy
    dry_run_var = tk.BooleanVar(value=True)
    status_text_var = tk.StringVar(value="Select a production folder to scan for Contributer & Documents folders.")

    items_scanned: List[Dict] = []

    # Header
    header_frame = tk.Frame(root, bg=CARD_BG, padx=20, pady=16)
    header_frame.pack(fill="x", padx=16, pady=(16, 8))

    lbl_title = tk.Label(
        header_frame,
        text="📁 DO NOT UPLOAD Folder Isolator",
        font=("Segoe UI", 15, "bold"),
        fg=TEXT_COLOR,
        bg=CARD_BG,
    )
    lbl_title.pack(anchor="w")

    lbl_sub = tk.Label(
        header_frame,
        text="Finds folders named 'Contributer' & 'Documents' and organizes them date-wise into 'DO NOT UPLOAD'.",
        font=("Segoe UI", 9),
        fg=MUTED_TEXT,
        bg=CARD_BG,
    )
    lbl_sub.pack(anchor="w", pady=(2, 0))

    # Folder Picker Bar
    picker_frame = tk.Frame(root, bg=CARD_BG, padx=16, pady=12)
    picker_frame.pack(fill="x", padx=16, pady=8)

    tk.Label(picker_frame, text="PRODUCTION ROOT FOLDER:", font=("Consolas", 9, "bold"), fg=ACCENT_CYAN, bg=CARD_BG).pack(anchor="w", pady=(0, 4))

    input_row = tk.Frame(picker_frame, bg=CARD_BG)
    input_row.pack(fill="x")

    entry_path = tk.Entry(
        input_row,
        textvariable=selected_dir_var,
        font=("Consolas", 10),
        bg="#0F172A",
        fg=TEXT_COLOR,
        insertbackground=TEXT_COLOR,
        relief="flat",
        highlightthickness=1,
        highlightcolor=ACCENT_CYAN,
        highlightbackground="#334155",
    )
    entry_path.pack(side="left", fill="x", expand=True, ipady=6, padx=(0, 8))

    def on_browse():
        folder = filedialog.askdirectory(title="Select Production Root Directory")
        if folder:
            selected_dir_var.set(folder)
            on_scan()

    btn_browse = tk.Button(
        input_row,
        text="📂 Browse...",
        command=on_browse,
        font=("Segoe UI", 9, "bold"),
        bg="#334155",
        fg="#FFFFFF",
        activebackground="#475569",
        activeforeground="#FFFFFF",
        relief="flat",
        padx=14,
        pady=4,
        cursor="hand2",
    )
    btn_browse.pack(side="right")

    # Table View
    table_frame = tk.Frame(root, bg=CARD_BG, padx=12, pady=12)
    table_frame.pack(fill="both", expand=True, padx=16, pady=8)

    columns = ("name", "date_folder", "files", "size", "destination")
    tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

    tree.heading("name", text="MATCHED FOLDER")
    tree.heading("date_folder", text="MAIN / DATE FOLDER")
    tree.heading("files", text="FILE COUNT")
    tree.heading("size", text="FOLDER SIZE")
    tree.heading("destination", text="TARGET IN 'DO NOT UPLOAD'")

    tree.column("name", width=160, anchor="w")
    tree.column("date_folder", width=160, anchor="center")
    tree.column("files", width=90, anchor="center")
    tree.column("size", width=100, anchor="center")
    tree.column("destination", width=380, anchor="w")

    # Scrollbar
    scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=tree.yview)
    tree.configure(yscrollcommand=scrollbar.set)
    tree.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Actions Bar
    action_frame = tk.Frame(root, bg=CARD_BG, padx=16, pady=12)
    action_frame.pack(fill="x", padx=16, pady=(8, 16))

    # Controls Row
    ctrl_row = tk.Frame(action_frame, bg=CARD_BG)
    ctrl_row.pack(fill="x")

    def on_scan():
        target = selected_dir_var.get().strip()
        if not target or not os.path.isdir(target):
            messagebox.showwarning("Warning", "Please select a valid directory.")
            return

        tree.delete(*tree.get_children())
        nonlocal items_scanned
        try:
            items_scanned = scan_for_do_not_upload(target)
            if not items_scanned:
                status_text_var.set("No 'Contributer' or 'Documents' folders found in this directory.")
                messagebox.showinfo("Scan Complete", "No folders matching 'Contributer' or 'Documents' found.")
            else:
                for itm in items_scanned:
                    tree.insert("", "end", values=(
                        itm["name"],
                        itm["date_folder"],
                        f"{itm['file_count']} files",
                        itm["size_str"],
                        itm["destination"],
                    ))
                status_text_var.set(f"Found {len(items_scanned)} folder(s) ready to be isolated.")
        except Exception as e:
            messagebox.showerror("Scan Error", str(e))

    btn_scan = tk.Button(
        ctrl_row,
        text="🔄 Scan Folder",
        command=on_scan,
        font=("Segoe UI", 9, "bold"),
        bg="#0284C7",
        fg="#FFFFFF",
        relief="flat",
        padx=14,
        pady=6,
        cursor="hand2",
    )
    btn_scan.pack(side="left", padx=(0, 12))

    # Mode radio buttons
    tk.Radiobutton(ctrl_row, text="Move to 'DO NOT UPLOAD'", variable=mode_var, value="move", bg=CARD_BG, fg=TEXT_COLOR, selectcolor="#0F172A", activebackground=CARD_BG).pack(side="left", padx=6)
    tk.Radiobutton(ctrl_row, text="Copy (Keep original)", variable=mode_var, value="copy", bg=CARD_BG, fg=TEXT_COLOR, selectcolor="#0F172A", activebackground=CARD_BG).pack(side="left", padx=6)

    # Dry run checkbox
    chk_dry = tk.Checkbutton(
        ctrl_row,
        text="Dry Run Simulation",
        variable=dry_run_var,
        bg=CARD_BG,
        fg=TEXT_COLOR,
        selectcolor="#0F172A",
        activebackground=CARD_BG,
    )
    chk_dry.pack(side="left", padx=12)

    def on_execute():
        if not items_scanned:
            messagebox.showwarning("Warning", "Please scan a folder first.")
            return

        is_dry = dry_run_var.get()
        mode = mode_var.get()

        if not is_dry:
            msg = f"Are you sure you want to {mode.upper()} {len(items_scanned)} folder(s) into 'DO NOT UPLOAD'?"
            if not messagebox.askyesno("Confirm Action", msg):
                return

        res = execute_isolation(items_scanned, mode=mode, dry_run=is_dry)
        if is_dry:
            status_text_var.set(f"Dry Run Complete: {res['success']} folder(s) validated for isolation.")
            messagebox.showinfo("Dry Run Simulation", f"Simulation successful!\n{res['success']} folder(s) ready to be isolated into 'DO NOT UPLOAD'.")
        else:
            status_text_var.set(f"Completed: {res['success']} folder(s) moved to 'DO NOT UPLOAD'.")
            messagebox.showinfo(
                "Execution Complete",
                f"Successfully isolated {res['success']} folder(s) into 'DO NOT UPLOAD' date-wise!\n\nManifest saved: {res.get('manifest_path', 'None')}"
            )
            # Rescan
            on_scan()

    btn_exec = tk.Button(
        ctrl_row,
        text="⚡ Execute Isolation",
        command=on_execute,
        font=("Segoe UI", 9, "bold"),
        bg=ACCENT_GREEN,
        fg="#FFFFFF",
        relief="flat",
        padx=18,
        pady=6,
        cursor="hand2",
    )
    btn_exec.pack(side="right")

    # Status Bar
    lbl_status = tk.Label(action_frame, textvariable=status_text_var, font=("Segoe UI", 9), fg=MUTED_TEXT, bg=CARD_BG, anchor="w")
    lbl_status.pack(fill="x", pady=(8, 0))

    root.mainloop()


# =============================================================================
# CLI Entry Point
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description="Isolate 'Contributer' and 'Documents' folders into 'DO NOT UPLOAD' date-wise.")
    parser.add_argument("folder", nargs="?", default="", help="Target root folder to scan")
    parser.add_argument("--mode", choices=["move", "copy"], default="move", help="Operation mode (default: move)")
    parser.add_argument("--execute", action="store_true", help="Perform real file operation (omit for dry-run simulation)")

    args = parser.parse_args()

    if not args.folder:
        # Launch GUI
        launch_gui()
    else:
        root_dir = os.path.abspath(args.folder)
        print(f"[*] Scanning: {root_dir}")
        items = scan_for_do_not_upload(root_dir)
        print(f"[+] Found {len(items)} folder(s) matching Contributer/Documents:")
        for itm in items:
            print(f"    - [{itm['date_folder']}] {itm['name']} ({itm['file_count']} files, {itm['size_str']}) -> {itm['destination']}")

        dry_run = not args.execute
        print(f"[*] Executing in {'DRY-RUN' if dry_run else 'REAL'} mode ({args.mode.upper()})...")
        res = execute_isolation(items, mode=args.mode, dry_run=dry_run)
        print(f"[+] Result: {res['success']} succeeded, {res['failed']} failed.")
        if res.get("manifest_path"):
            print(f"[+] Manifest: {res['manifest_path']}")


if __name__ == "__main__":
    main()
