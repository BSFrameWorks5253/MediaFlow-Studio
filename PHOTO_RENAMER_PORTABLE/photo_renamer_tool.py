#!/usr/bin/env python3
"""
Photo Status Matcher & Renamer Script
======================================
Matches photos between two paths:
  1. First Path  : Contains SELECTED photos (can contain subfolders)
  2. Second Path : Contains ALL photos (can contain subfolders)

Rules:
  - Ignores JPG files ending with '_P' and '_V' (case-insensitive).
  - Subfolders in First Path are matched to subfolders in Second Path:
      e.g. 1st folder in First Path == 1st folder in Second Path (Order-based),
      or matched by identical folder name.
  - Photos in the Second Path that MATCH photos in the First Path get '_U' appended to their name.
  - Photos in the Second Path that are NOT present in the First Path get '_R' appended to their name.
  - Pre-existing '_U' or '_R' tags are safely stripped before re-tagging to avoid duplicate suffixes.
  - Generates a CSV audit log upon execution.

Run without arguments for the graphical interface (GUI), or pass CLI arguments.
"""

import os
import sys
import csv
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Optional, Set

# Supported photo extensions
SUPPORTED_EXTS = {
    '.jpg', '.jpeg', '.png', '.cr2', '.cr3', '.nef',
    '.arw', '.raf', '.dng', '.orf', '.rw2', '.pef',
    '.srw', '.heic', '.tif', '.tiff'
}


class PhotoMatcherEngine:
    def __init__(
        self,
        first_path: str,
        second_path: str,
        match_by_order: bool = True,
        ignored_suffixes: Optional[List[str]] = None,
        rename_target: str = "second"  # "second" or "first"
    ):
        self.first_path = Path(first_path).resolve()
        self.second_path = Path(second_path).resolve()
        self.match_by_order = match_by_order
        self.ignored_suffixes = [s.strip().upper() for s in (ignored_suffixes or ['_P', '_V']) if s.strip()]
        self.rename_target = rename_target

    def is_ignored(self, filename: str) -> bool:
        """Check if file should be ignored (e.g. ends with _P or _V before extension)."""
        p = Path(filename)
        ext = p.suffix.lower()
        if ext not in SUPPORTED_EXTS:
            return True  # Ignore non-photo files
        stem = p.stem.upper()
        for suffix in self.ignored_suffixes:
            clean_suffix = suffix.lstrip('_')
            if stem.endswith(f"_{clean_suffix}") or stem.endswith(clean_suffix):
                return True
        return False

    @staticmethod
    def clean_stem(filename: str) -> str:
        """Remove existing _U or _R suffix to get the base photo name."""
        stem = Path(filename).stem
        upper = stem.upper()
        if upper.endswith('_U') or upper.endswith('_R'):
            return stem[:-2]
        return stem

    def get_subfolders(self, folder: Path) -> List[Path]:
        """Return sorted list of immediate subdirectories, ignoring Document/report folders."""
        if not folder.is_dir():
            return []
        skip_names = {'document', 'documents', 'document_reports', '__pycache__'}
        subdirs = [
            d for d in folder.iterdir()
            if d.is_dir() and not d.name.startswith('.') and d.name.lower() not in skip_names
        ]
        return sorted(subdirs, key=lambda d: d.name.lower())

    def pair_folders(self) -> List[Tuple[Optional[Path], Optional[Path], str]]:
        """
        Pairs folders between first_path and second_path.
        Returns list of tuples: (first_subfolder, second_subfolder, label)
        """
        first_subs = self.get_subfolders(self.first_path)
        second_subs = self.get_subfolders(self.second_path)

        pairs = []

        # If neither path has subdirectories, match root to root directly
        if not first_subs and not second_subs:
            return [(self.first_path, self.second_path, "Root Directory (Direct)")]

        if self.match_by_order:
            # Match 1st folder to 1st folder, 2nd to 2nd, etc.
            max_len = max(len(first_subs), len(second_subs))
            for i in range(max_len):
                f_sub = first_subs[i] if i < len(first_subs) else None
                s_sub = second_subs[i] if i < len(second_subs) else None
                label = f"Folder #{i + 1}: {f_sub.name if f_sub else '[None]'} <---> {s_sub.name if s_sub else '[None]'}"
                pairs.append((f_sub, s_sub, label))
        else:
            # Match by folder name
            second_map = {d.name.lower(): d for d in second_subs}
            matched_second = set()

            for f_sub in first_subs:
                key = f_sub.name.lower()
                s_sub = second_map.get(key)
                if s_sub:
                    matched_second.add(key)
                    pairs.append((f_sub, s_sub, f"Name: {f_sub.name} <---> {s_sub.name}"))
                else:
                    pairs.append((f_sub, None, f"Name: {f_sub.name} <---> [No Match]"))

            for s_sub in second_subs:
                if s_sub.name.lower() not in matched_second:
                    pairs.append((None, s_sub, f"Name: [No Match] <---> {s_sub.name}"))

        return pairs

    def scan(self) -> Dict:
        """
        Scans all paired folders, determines match status for each photo,
        and builds the preview rename plan.
        Recursively scans reference folders to find selected photos inside nested subfolders.
        """
        if not self.first_path.exists():
            raise FileNotFoundError(f"First Path does not exist: {self.first_path}")
        if not self.second_path.exists():
            raise FileNotFoundError(f"Second Path does not exist: {self.second_path}")

        folder_pairs = self.pair_folders()
        plan_items = []
        stats = {
            "total_files": 0,
            "matched_u": 0,
            "missing_r": 0,
            "ignored": 0,
            "already_tagged": 0,
        }

        # Build global reference key set as a fallback
        global_ref_keys: Set[str] = set()
        ref_root = self.first_path if self.rename_target == "second" else self.second_path
        if ref_root.is_dir():
            for rf in ref_root.rglob('*'):
                if rf.is_file() and rf.suffix.lower() in SUPPORTED_EXTS:
                    if any(p.lower() in ('document', 'documents', 'document_reports') for p in rf.parts):
                        continue
                    if not self.is_ignored(rf.name):
                        global_ref_keys.add(self.clean_stem(rf.name).upper())

        for f_dir, s_dir, label in folder_pairs:
            # Target folder is second_path (All Photos)
            target_dir = s_dir if self.rename_target == "second" else f_dir
            reference_dir = f_dir if self.rename_target == "second" else s_dir

            if not target_dir or not target_dir.is_dir():
                continue

            # Collect reference keys from reference_dir (RECURSIVELY!)
            reference_keys: Set[str] = set()
            if reference_dir and reference_dir.is_dir():
                for ref_file in reference_dir.rglob('*'):
                    if ref_file.is_file() and ref_file.suffix.lower() in SUPPORTED_EXTS:
                        # Skip Document or report subfolders
                        if any(p.lower() in ('document', 'documents', 'document_reports') for p in ref_file.parts):
                            continue
                        if self.is_ignored(ref_file.name):
                            continue
                        clean_base = self.clean_stem(ref_file.name).upper()
                        reference_keys.add(clean_base)

            # Inspect all files in target_dir (recursively to support nested subfolders)
            target_files = [
                p for p in target_dir.rglob('*')
                if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
                and not any(part.lower() in ('document', 'documents', 'document_reports') for part in p.parts)
            ]

            for file_path in sorted(target_files, key=lambda p: p.name.lower()):
                stats["total_files"] += 1

                # Check if ignored (ends with _P or _V)
                if self.is_ignored(file_path.name):
                    stats["ignored"] += 1
                    plan_items.append({
                        "folder_label": label,
                        "source_path": file_path,
                        "target_path": file_path,
                        "source_name": file_path.name,
                        "target_name": file_path.name,
                        "status": "IGNORED",
                        "reason": "Ends with _P or _V",
                        "is_matched": None,
                        "will_rename": False
                    })
                    continue

                base_clean = self.clean_stem(file_path.name)
                lookup_key = base_clean.upper()

                # Check in folder-specific reference keys first, fallback to global
                is_matched = (lookup_key in reference_keys) or (lookup_key in global_ref_keys)

                tag = "_U" if is_matched else "_R"
                new_name = f"{base_clean}{tag}{file_path.suffix}"
                target_path = file_path.parent / new_name

                already_tagged = (file_path.name == new_name)
                if is_matched:
                    stats["matched_u"] += 1
                else:
                    stats["missing_r"] += 1

                if already_tagged:
                    stats["already_tagged"] += 1

                plan_items.append({
                    "folder_label": label,
                    "source_path": file_path,
                    "target_path": target_path,
                    "source_name": file_path.name,
                    "target_name": new_name,
                    "status": "MATCHED (_U)" if is_matched else "NOT PRESENT (_R)",
                    "reason": "Found in Selected Photos" if is_matched else "Not in Selected Photos",
                    "is_matched": is_matched,
                    "will_rename": not already_tagged
                })

        return {
            "stats": stats,
            "folder_pairs": folder_pairs,
            "items": plan_items
        }

    def execute_rename(self, plan_items: List[Dict], dry_run: bool = False) -> Dict:
        """
        Executes the file renames and writes a CSV report.
        """
        renamed_count = 0
        error_count = 0
        skipped_count = 0
        report_records = []

        for item in plan_items:
            if not item.get("will_rename", False):
                skipped_count += 1
                report_records.append({
                    "Original Name": item["source_name"],
                    "Target Name": item["target_name"],
                    "Status": item["status"],
                    "Result": "Skipped (Already Tagged / Ignored)",
                    "Folder": str(item["source_path"].parent)
                })
                continue

            src: Path = item["source_path"]
            dst: Path = item["target_path"]

            if dry_run:
                renamed_count += 1
                report_records.append({
                    "Original Name": src.name,
                    "Target Name": dst.name,
                    "Status": item["status"],
                    "Result": "[Dry Run] Would Rename",
                    "Folder": str(src.parent)
                })
                continue

            try:
                # If destination already exists and differs from source, remove or replace safely
                if dst.exists() and dst != src:
                    dst.unlink()
                src.rename(dst)
                renamed_count += 1
                report_records.append({
                    "Original Name": src.name,
                    "Target Name": dst.name,
                    "Status": item["status"],
                    "Result": "Successfully Renamed",
                    "Folder": str(dst.parent)
                })
            except Exception as ex:
                error_count += 1
                report_records.append({
                    "Original Name": src.name,
                    "Target Name": dst.name,
                    "Status": item["status"],
                    "Result": f"Error: {ex}",
                    "Folder": str(src.parent)
                })

        # Generate CSV Audit Report
        report_path = None
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_dir = self.second_path if self.rename_target == "second" else self.first_path
            doc_dir = report_dir / "DOCUMENT_REPORTS"
            doc_dir.mkdir(parents=True, exist_ok=True)
            report_path = doc_dir / f"Photo_Rename_Audit_{timestamp}.csv"

            with open(report_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["Original Name", "Target Name", "Status", "Result", "Folder"])
                writer.writeheader()
                writer.writerows(report_records)
        except Exception as e:
            print(f"Warning: Could not write CSV report: {e}")

        return {
            "renamed_count": renamed_count,
            "error_count": error_count,
            "skipped_count": skipped_count,
            "report_path": str(report_path) if report_path else None
        }


# =====================================================================
# Modern Graphical User Interface (Tkinter)
# =====================================================================

def run_gui():
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox

    # Enable native High-DPI awareness on Windows to prevent blurry DWM scaling
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            try:
                import ctypes
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass

    root = tk.Tk()
    root.title("Photo Matcher & Renamer — (_U / _R Tagging Tool)")
    root.geometry("1050x720")
    root.minsize(850, 600)

    # Set styling
    style = ttk.Style()
    style.theme_use('clam')

    # Color palette
    BG_MAIN = "#1e1e24"
    BG_CARD = "#282832"
    TEXT_WHITE = "#f3f4f6"
    TEXT_MUTED = "#9ca3af"
    ACCENT_PURPLE = "#8b5cf6"
    ACCENT_BLUE = "#3b82f6"
    ACCENT_GREEN = "#10b981"
    ACCENT_ORANGE = "#f59e0b"

    root.configure(bg=BG_MAIN)

    # State variables
    first_path_var = tk.StringVar()
    second_path_var = tk.StringVar()
    match_mode_var = tk.StringVar(value="order")  # "order" or "name"
    target_var = tk.StringVar(value="second")      # "second" or "first"
    ignored_suffixes_var = tk.StringVar(value="_P, _V")
    dry_run_var = tk.BooleanVar(value=False)

    scan_result_data = {"items": [], "stats": {}}

    # Top Header
    header_frame = tk.Frame(root, bg=BG_CARD, padx=20, pady=14)
    header_frame.pack(fill="x", padx=14, pady=(14, 8))

    lbl_title = tk.Label(
        header_frame,
        text="PHOTO STATUS MATCHER & SEQUENCE RENAMER",
        font=("Segoe UI", 13, "bold"),
        fg="#e0e7ff",
        bg=BG_CARD
    )
    lbl_title.pack(anchor="w")

    lbl_subtitle = tk.Label(
        header_frame,
        text="Matches Selected Photos (Path 1) with All Photos (Path 2). Appends _U for Matched, _R for Unmatched. Ignores _P and _V.",
        font=("Segoe UI", 9),
        fg=TEXT_MUTED,
        bg=BG_CARD
    )
    lbl_subtitle.pack(anchor="w", pady=(2, 0))

    # Path Selection Card
    path_card = tk.Frame(root, bg=BG_CARD, padx=18, pady=14)
    path_card.pack(fill="x", padx=14, pady=6)

    def auto_detect_second_path(first_path_str: str):
        if not first_path_str.strip():
            return
        try:
            p = Path(first_path_str.strip())
            parent = p.parent
            candidates = [
                f"{p.name}_Remaings",
                f"{p.name}_Remaining",
                f"{p.name}_Remainings",
                f"{p.name}_Remaing",
                f"{p.name}_Rem",
                "Remaining",
                "Remaings",
                "Remainings"
            ]
            for cand in candidates:
                cand_path = parent / cand
                if cand_path.is_dir():
                    second_path_var.set(str(cand_path))
                    return True
        except Exception:
            pass
        return False

    def browse_first():
        d = filedialog.askdirectory(title="Select First Path (SELECTED PHOTOS)")
        if d:
            first_path_var.set(d)
            if not second_path_var.get().strip():
                auto_detect_second_path(d)

    def browse_second():
        d = filedialog.askdirectory(title="Select Second Path (ALL PHOTOS)")
        if d:
            second_path_var.set(d)

    def trigger_autodetect():
        found = auto_detect_second_path(first_path_var.get())
        if not found and first_path_var.get().strip():
            messagebox.showinfo(
                "Auto-Detect",
                "No matching '_Remaings' or '_Remaining' folder was found in the parent directory.\nPlease browse manually."
            )

    def open_folder_in_explorer(path_str: str, label: str = "Folder"):
        if not path_str or not path_str.strip():
            messagebox.showwarning("No Path", f"Please select {label} first.")
            return
        p = Path(path_str.strip()).resolve()
        try:
            if p.exists():
                if os.name == 'nt':
                    os.startfile(str(p))
                else:
                    import subprocess
                    subprocess.Popen(['xdg-open' if sys.platform.startswith('linux') else 'open', str(p)])
            else:
                parent = p.parent
                if parent.exists():
                    if os.name == 'nt':
                        os.startfile(str(parent))
                    else:
                        import subprocess
                        subprocess.Popen(['xdg-open' if sys.platform.startswith('linux') else 'open', str(parent)])
                    messagebox.showinfo("Folder Missing", f"{label} does not exist:\n{p}\n\nOpened parent directory to inspect:\n{parent}")
                else:
                    messagebox.showerror("Error", f"{label} and its parent directory do not exist:\n{p}")
        except Exception as ex:
            messagebox.showerror("Open Error", f"Failed to open {label}:\n{str(ex)}")

    # First Path Row
    row1 = tk.Frame(path_card, bg=BG_CARD)
    row1.pack(fill="x", pady=4)
    tk.Label(row1, text="1. First Path (Selected Photos):", font=("Segoe UI", 9, "bold"), fg=ACCENT_BLUE, bg=BG_CARD, width=28, anchor="w").pack(side="left")
    entry_first = tk.Entry(row1, textvariable=first_path_var, font=("Segoe UI", 9), bg="#18181f", fg=TEXT_WHITE, insertbackground="white", relief="flat", highlightthickness=1, highlightbackground="#4b5563")
    entry_first.pack(side="left", fill="x", expand=True, padx=8, ipady=4)
    btn_open1 = tk.Button(row1, text="Open", font=("Segoe UI", 9), bg="#1f2937", fg="#93c5fd", activebackground="#374151", activeforeground="white", relief="flat", padx=10, command=lambda: open_folder_in_explorer(first_path_var.get(), "First Path"))
    btn_open1.pack(side="right", padx=(4, 0))
    btn_browse1 = tk.Button(row1, text="Browse...", font=("Segoe UI", 9), bg="#374151", fg=TEXT_WHITE, activebackground="#4b5563", activeforeground="white", relief="flat", padx=12, command=browse_first)
    btn_browse1.pack(side="right")

    # Second Path Row
    row2 = tk.Frame(path_card, bg=BG_CARD)
    row2.pack(fill="x", pady=4)
    tk.Label(row2, text="2. Second Path (All Photos):", font=("Segoe UI", 9, "bold"), fg=ACCENT_PURPLE, bg=BG_CARD, width=28, anchor="w").pack(side="left")
    entry_second = tk.Entry(row2, textvariable=second_path_var, font=("Segoe UI", 9), bg="#18181f", fg=TEXT_WHITE, insertbackground="white", relief="flat", highlightthickness=1, highlightbackground="#4b5563")
    entry_second.pack(side="left", fill="x", expand=True, padx=8, ipady=4)
    btn_open2 = tk.Button(row2, text="Open", font=("Segoe UI", 9), bg="#1f2937", fg="#c4b5fd", activebackground="#374151", activeforeground="white", relief="flat", padx=10, command=lambda: open_folder_in_explorer(second_path_var.get(), "Second Path"))
    btn_open2.pack(side="right", padx=(4, 0))
    btn_auto2 = tk.Button(row2, text="⚡ Auto-Detect", font=("Segoe UI", 9), bg="#4c1d95", fg="#e0e7ff", activebackground="#5b21b6", activeforeground="white", relief="flat", padx=8, command=trigger_autodetect)
    btn_auto2.pack(side="right", padx=(4, 0))
    btn_browse2 = tk.Button(row2, text="Browse...", font=("Segoe UI", 9), bg="#374151", fg=TEXT_WHITE, activebackground="#4b5563", activeforeground="white", relief="flat", padx=12, command=browse_second)
    btn_browse2.pack(side="right")

    # Options Row
    opts_frame = tk.Frame(path_card, bg=BG_CARD)
    opts_frame.pack(fill="x", pady=(8, 2))

    tk.Label(opts_frame, text="Folder Matching:", font=("Segoe UI", 9, "bold"), fg=TEXT_WHITE, bg=BG_CARD).pack(side="left")
    rb_order = tk.Radiobutton(opts_frame, text="By Folder Order (1st = 1st, 2nd = 2nd)", variable=match_mode_var, value="order", font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_WHITE, selectcolor="#18181f", activebackground=BG_CARD, activeforeground=TEXT_WHITE)
    rb_order.pack(side="left", padx=10)
    rb_name = tk.Radiobutton(opts_frame, text="By Folder Name Match", variable=match_mode_var, value="name", font=("Segoe UI", 9), bg=BG_CARD, fg=TEXT_WHITE, selectcolor="#18181f", activebackground=BG_CARD, activeforeground=TEXT_WHITE)
    rb_name.pack(side="left", padx=10)

    tk.Label(opts_frame, text="|  Ignored Suffixes:", font=("Segoe UI", 9, "bold"), fg=TEXT_WHITE, bg=BG_CARD).pack(side="left", padx=(15, 6))
    entry_ign = tk.Entry(opts_frame, textvariable=ignored_suffixes_var, width=12, font=("Segoe UI", 9), bg="#18181f", fg=TEXT_WHITE, relief="flat", highlightthickness=1, highlightbackground="#4b5563")
    entry_ign.pack(side="left", ipady=2)

    # Action Toolbar
    act_card = tk.Frame(root, bg=BG_MAIN)
    act_card.pack(fill="x", padx=14, pady=6)

    stats_label = tk.Label(act_card, text="Ready. Select paths and click 'Scan & Preview'.", font=("Segoe UI", 9), fg=TEXT_MUTED, bg=BG_MAIN)
    stats_label.pack(side="left", pady=4)

    btn_rename = tk.Button(act_card, text="▶ Execute Rename", font=("Segoe UI", 10, "bold"), bg=ACCENT_GREEN, fg="#ffffff", activebackground="#059669", activeforeground="white", relief="flat", padx=16, pady=6, state="disabled")
    btn_rename.pack(side="right", padx=4)

    cb_dry = tk.Checkbutton(act_card, text="Dry Run (Simulate Only)", variable=dry_run_var, font=("Segoe UI", 9), bg=BG_MAIN, fg=TEXT_WHITE, selectcolor="#18181f", activebackground=BG_MAIN, activeforeground=TEXT_WHITE)
    cb_dry.pack(side="right", padx=12)

    btn_scan = tk.Button(act_card, text="🔍 Scan & Preview", font=("Segoe UI", 10, "bold"), bg=ACCENT_PURPLE, fg="#ffffff", activebackground="#7c3aed", activeforeground="white", relief="flat", padx=16, pady=6)
    btn_scan.pack(side="right", padx=4)

    # Treeview Preview Table
    table_card = tk.Frame(root, bg=BG_CARD)
    table_card.pack(fill="both", expand=True, padx=14, pady=(2, 14))

    columns = ("folder", "original", "status", "target", "action")
    tree = ttk.Treeview(table_card, columns=columns, show="headings", selectmode="browse")

    tree.heading("folder", text="Folder Pair / Mapping")
    tree.heading("original", text="Original File")
    tree.heading("status", text="Match Status")
    tree.heading("target", text="New Target Name")
    tree.heading("action", text="Action")

    tree.column("folder", width=220, anchor="w")
    tree.column("original", width=200, anchor="w")
    tree.column("status", width=140, anchor="center")
    tree.column("target", width=200, anchor="w")
    tree.column("action", width=140, anchor="center")

    # Scrollbar
    scrollbar = ttk.Scrollbar(table_card, orient="vertical", command=tree.yview)
    tree.configure(yscrollcommand=scrollbar.set)
    tree.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Treeview color tags
    tree.tag_configure("matched", foreground="#34d399")
    tree.tag_configure("missing", foreground="#fbbf24")
    tree.tag_configure("ignored", foreground="#9ca3af")
    tree.tag_configure("already", foreground="#60a5fa")

    def perform_scan():
        p1 = first_path_var.get().strip()
        p2 = second_path_var.get().strip()

        if not p1 or not p2:
            messagebox.showwarning("Missing Paths", "Please select both First Path and Second Path.")
            return

        p1_exists = os.path.exists(p1)
        p2_exists = os.path.exists(p2)

        if not p1_exists and not p2_exists:
            messagebox.showerror("Error", f"Both folders do not exist:\n• First Path (Selected): {p1}\n• Second Path (All Photos): {p2}")
            return
        if not p1_exists:
            messagebox.showerror("Error", f"First Path (Selected Photos) does not exist:\n{p1}")
            return
        if not p2_exists:
            messagebox.showerror("Error", f"Second Path (All Photos) does not exist:\n{p2}")
            return

        ign_list = [s.strip() for s in ignored_suffixes_var.get().split(",") if s.strip()]

        engine = PhotoMatcherEngine(
            first_path=p1,
            second_path=p2,
            match_by_order=(match_mode_var.get() == "order"),
            ignored_suffixes=ign_list,
            rename_target=target_var.get()
        )

        try:
            res = engine.scan()
            scan_result_data["items"] = res["items"]
            scan_result_data["stats"] = res["stats"]
            scan_result_data["engine"] = engine

            # Clear table
            for row in tree.get_children():
                tree.delete(row)

            # Populate table
            for item in res["items"]:
                status = item["status"]
                tag = "ignored"
                action_text = "Skip (Ignored)"

                if status.startswith("MATCHED"):
                    tag = "matched"
                    action_text = "Rename -> _U" if item["will_rename"] else "Already _U"
                elif status.startswith("NOT PRESENT"):
                    tag = "missing"
                    action_text = "Rename -> _R" if item["will_rename"] else "Already _R"

                if not item["will_rename"] and status != "IGNORED":
                    tag = "already"

                tree.insert("", "end", values=(
                    item["folder_label"],
                    item["source_name"],
                    item["status"],
                    item["target_name"],
                    action_text
                ), tags=(tag,))

            st = res["stats"]
            stats_label.config(
                text=f"Total: {st['total_files']}  |  Matched (_U): {st['matched_u']}  |  Not Present (_R): {st['missing_r']}  |  Ignored (_P/_V): {st['ignored']}",
                fg="#a7f3d0"
            )

            btn_rename.config(state="normal")
            messagebox.showinfo(
                "Scan Complete",
                f"Scan finished successfully!\n\n"
                f"• Total Photos in Second Path: {st['total_files']}\n"
                f"• Matched (will tag _U): {st['matched_u']}\n"
                f"• Not Present (will tag _R): {st['missing_r']}\n"
                f"• Ignored (_P / _V): {st['ignored']}\n"
                f"• Already Tagged: {st['already_tagged']}\n\n"
                f"Review the preview list and click 'Execute Rename' to apply."
            )

        except Exception as ex:
            messagebox.showerror("Scan Error", f"Failed during scan:\n{str(ex)}")

    def perform_rename():
        items = scan_result_data.get("items", [])
        engine = scan_result_data.get("engine")
        if not items or not engine:
            messagebox.showwarning("No Items", "Please scan first before renaming.")
            return

        is_dry = dry_run_var.get()
        mode_str = "DRY RUN (Simulation)" if is_dry else "ACTUAL RENAME"

        to_rename_count = sum(1 for i in items if i.get("will_rename", False))
        if to_rename_count == 0:
            messagebox.showinfo("Nothing to Rename", "All files are already correctly tagged or ignored.")
            return

        confirm = messagebox.askyesno(
            f"Confirm {mode_str}",
            f"Are you sure you want to proceed with {mode_str}?\n\n"
            f"• Files to rename: {to_rename_count}\n"
            f"• Target Folder: {engine.second_path}\n\n"
            f"This will add _U to matched photos and _R to unmatched photos."
        )
        if not confirm:
            return

        try:
            summary = engine.execute_rename(items, dry_run=is_dry)
            msg = (
                f"Rename Process Finished!\n\n"
                f"• Renamed: {summary['renamed_count']}\n"
                f"• Errors: {summary['error_count']}\n"
                f"• Skipped: {summary['skipped_count']}\n"
            )
            if summary.get("report_path"):
                msg += f"\nAudit Report CSV created at:\n{summary['report_path']}"

            messagebox.showinfo("Process Complete", msg)

            if not is_dry:
                # Refresh scan
                perform_scan()

        except Exception as ex:
            messagebox.showerror("Execution Error", f"Error during rename:\n{str(ex)}")

    btn_scan.config(command=perform_scan)
    btn_rename.config(command=perform_rename)

    root.mainloop()


# =====================================================================
# Command Line Interface (CLI)
# =====================================================================

def run_cli(args):
    p1 = args.first_path
    p2 = args.second_path

    if not p1 or not p2:
        print("Error: Both --first-path and --second-path are required in CLI mode.")
        sys.exit(1)

    ign_list = [s.strip() for s in args.ignore.split(",") if s.strip()]

    print("=" * 70)
    print("PHOTO STATUS MATCHER & RENAMER (CLI MODE)")
    print("=" * 70)
    print(f"First Path (Selected) : {p1}")
    print(f"Second Path (All)     : {p2}")
    print(f"Match Method          : {'Order-based' if args.order else 'Name-based'}")
    print(f"Ignored Suffixes      : {ign_list}")
    print(f"Dry Run               : {args.dry_run}")
    print("-" * 70)

    engine = PhotoMatcherEngine(
        first_path=p1,
        second_path=p2,
        match_by_order=args.order,
        ignored_suffixes=ign_list,
        rename_target=args.target
    )

    scan_res = engine.scan()
    st = scan_res["stats"]

    print(f"Scan Finished:")
    print(f"  • Total Photos Examined : {st['total_files']}")
    print(f"  • Matched (_U)          : {st['matched_u']}")
    print(f"  • Not Present (_R)      : {st['missing_r']}")
    print(f"  • Ignored (_P/_V)       : {st['ignored']}")
    print(f"  • Already Tagged        : {st['already_tagged']}")
    print("-" * 70)

    if args.scan_only:
        print("Scan-only mode requested. Exiting.")
        return

    res = engine.execute_rename(scan_res["items"], dry_run=args.dry_run)
    print(f"Renamed : {res['renamed_count']}")
    print(f"Errors  : {res['error_count']}")
    print(f"Skipped : {res['skipped_count']}")
    if res.get("report_path"):
        print(f"Report  : {res['report_path']}")
    print("=" * 70)


def ensure_requirements():
    """Silently ensure required libraries are installed if run directly."""
    req_file = Path(__file__).parent / "requirements.txt"
    if req_file.exists():
        try:
            import subprocess
            try:
                import PIL
            except ImportError:
                print("Installing required libraries from requirements.txt...")
                subprocess.call([sys.executable, "-m", "pip", "install", "-r", str(req_file), "--quiet"])
        except Exception:
            pass


if __name__ == "__main__":
    ensure_requirements()
    parser = argparse.ArgumentParser(description="Match & rename photos between two paths with _U and _R tags.")
    parser.add_argument("--first-path", "-f", help="Path to folder with selected photos")
    parser.add_argument("--second-path", "-s", help="Path to folder with all photos")
    parser.add_argument("--order", action="store_true", default=True, help="Match subfolders by order (1st=1st, 2nd=2nd)")
    parser.add_argument("--name", dest="order", action="store_false", help="Match subfolders by name")
    parser.add_argument("--ignore", default="_P,_V", help="Comma-separated list of suffixes to ignore (default: _P,_V)")
    parser.add_argument("--target", choices=["second", "first"], default="second", help="Which path to rename (default: second)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate renaming without touching files")
    parser.add_argument("--scan-only", action="store_true", help="Only scan and display stats without renaming")
    parser.add_argument("--cli", action="store_true", help="Force CLI mode even if no paths passed")

    parsed_args = parser.parse_args()

    # If first or second path is provided, run CLI; otherwise launch GUI
    if parsed_args.first_path or parsed_args.second_path or parsed_args.cli:
        run_cli(parsed_args)
    else:
        run_gui()
