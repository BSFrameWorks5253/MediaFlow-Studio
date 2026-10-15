#!/usr/bin/env python3
"""
===============================================================================
 DataFlow Studio — Inventory Report Collector
===============================================================================
 Scans all folders recursively to find '_Inventory_Report.xlsx' (and variants)
 located inside 'Document' / 'Documents' folders, and copies them into an
 'All Inventory Reports' folder inside the user-specified destination path.

 Features:
   - Recursively traverses any directory tree.
   - Identifies '_Inventory_Report.xlsx', '*_Inventory_Report.xlsx', and
     reports inside 'Document', 'Documents', 'Docs', 'Doc' subfolders.
   - Automatically creates the folder 'All Inventory Reports' inside the
     user's chosen destination path.
   - Zero-Data-Loss Smart Collision Guard: If multiple folders contain
     identically-named files (e.g. '_Inventory_Report.xlsx'), automatically
     prefixes with the parent shoot/card folder name so no file is overwritten.
   - Generates a CSV audit manifest upon completion.
   - Dual interface: Sleek Tkinter Dark-Mode GUI + Interactive CLI.
===============================================================================
"""

import os
import sys
import shutil
import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# Supported Excel report extensions
EXCEL_EXTS = {'.xlsx', '.xlsm', '.xls'}

# Target folder name as specified by user
TARGET_FOLDER_NAME = "All Inventory Reports"

DOCUMENT_FOLDER_NAMES = {'document', 'documents', 'doc', 'docs'}


def clean_path(path_str: str) -> str:
    if not path_str:
        return ""
    s = str(path_str).replace("file:///", "").replace("file://", "").strip()
    if sys.platform == "win32" and s.startswith("/") and len(s) > 2 and s[2] == ":":
        s = s[1:]
    return os.path.normpath(s)


def format_bytes(bytes_count: int) -> str:
    if bytes_count >= 1024 * 1024 * 1024:
        return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"
    if bytes_count >= 1024 * 1024:
        return f"{bytes_count / (1024 * 1024):.1f} MB"
    if bytes_count >= 1024:
        return f"{bytes_count / 1024:.0f} KB"
    return f"{bytes_count} B"


class InventoryReportCollector:
    def __init__(self, source_dir: str, dest_dir: str, smart_prefix: bool = True):
        self.source_dir = clean_path(source_dir)
        self.dest_dir = clean_path(dest_dir)
        self.smart_prefix = smart_prefix
        self.target_folder = os.path.join(self.dest_dir, TARGET_FOLDER_NAME) if self.dest_dir else ""

    def is_target_file(self, filename: str) -> bool:
        """Checks if a file is an Inventory Report."""
        fn = filename.strip()
        if fn.startswith("~$"):
            return False  # Temporary Excel lock file
        ext = os.path.splitext(fn)[1].lower()
        if ext not in EXCEL_EXTS:
            return False
        
        stem = os.path.splitext(fn)[0].lower()
        # Direct match for _Inventory_Report.xlsx or ending with _inventory_report or containing inventory_report
        if stem == "_inventory_report" or stem.endswith("_inventory_report") or "inventory_report" in stem or stem == "inventory report":
            return True
        return False

    def is_in_document_folder(self, dir_path: str) -> Tuple[bool, str]:
        """
        Checks if the directory path is or is inside a 'Document' folder.
        Returns (is_doc, doc_folder_name).
        """
        parts = Path(dir_path).parts
        for i, part in enumerate(parts):
            if part.lower() in DOCUMENT_FOLDER_NAMES:
                return True, part
        return False, ""

    def get_parent_shoot_folder(self, file_path: str) -> str:
        """
        Finds the contextual shoot/card folder name.
        E.g. for 'D:/Shoots/2026-10-14_01M/Document/_Inventory_Report.xlsx',
        returns '2026-10-14_01M'.
        """
        p = Path(file_path).resolve()
        parent = p.parent
        # If parent is 'Document', go one level up to get the shoot folder
        if parent.name.lower() in DOCUMENT_FOLDER_NAMES:
            return parent.parent.name or "Root"
        return parent.name or "Root"

    def scan(self) -> List[Dict]:
        """
        Scans source directory recursively and returns list of report candidates.
        """
        if not os.path.isdir(self.source_dir):
            raise ValueError(f"Source directory does not exist: {self.source_dir}")

        candidates = []
        used_target_names = set()

        for root, dirs, files in os.walk(self.source_dir):
            # Skip hidden folders
            dirs[:] = [d for d in dirs if not d.startswith('.')]

            is_doc, doc_folder_name = self.is_in_document_folder(root)

            for f in sorted(files):
                if not self.is_target_file(f):
                    continue

                full_path = os.path.join(root, f)
                try:
                    size = os.path.getsize(full_path)
                except Exception:
                    size = 0

                shoot_folder = self.get_parent_shoot_folder(full_path)
                stem, ext = os.path.splitext(f)

                # Determine proposed name in 'All Inventory Reports'
                # If the file is simply '_Inventory_Report.xlsx' or generic, prepend shoot_folder
                if stem.lower() in ('_inventory_report', 'inventory_report', 'inventory report') or (self.smart_prefix and not stem.lower().startswith(shoot_folder.lower())):
                    clean_shoot = shoot_folder.replace(" ", "_")
                    proposed_name = f"{clean_shoot}_Inventory_Report{ext}"
                else:
                    proposed_name = f

                # Collision safety: if multiple reports produce the exact same target filename, add an index
                final_name = proposed_name
                counter = 1
                base_stem, base_ext = os.path.splitext(proposed_name)
                while final_name.lower() in used_target_names:
                    final_name = f"{base_stem}_{counter}{base_ext}"
                    counter += 1

                used_target_names.add(final_name.lower())

                candidates.append({
                    "source_path": full_path,
                    "filename": f,
                    "folder": root,
                    "shoot_folder": shoot_folder,
                    "is_in_doc_folder": is_doc,
                    "doc_folder_name": doc_folder_name or "Direct",
                    "size_bytes": size,
                    "size_str": format_bytes(size),
                    "proposed_name": final_name,
                    "target_path": os.path.join(self.target_folder, final_name) if self.target_folder else "",
                    "status": "Ready",
                })

        return candidates

    def execute(self, items: List[Dict], mode: str = "copy", dry_run: bool = False) -> Dict:
        """
        Executes copying or moving files into 'All Inventory Reports'.
        """
        if not self.dest_dir:
            raise ValueError("Destination directory must be specified.")

        target_dir = os.path.join(self.dest_dir, TARGET_FOLDER_NAME)
        if not dry_run:
            os.makedirs(target_dir, exist_ok=True)

        copied = 0
        failed = 0
        errors = []
        manifest_rows = []

        for item in items:
            src = item["source_path"]
            dst_name = item["proposed_name"]
            dst = os.path.join(target_dir, dst_name)

            if dry_run:
                copied += 1
                manifest_rows.append({
                    "Source": src,
                    "Destination": dst,
                    "Shoot Folder": item.get("shoot_folder", ""),
                    "Size": item.get("size_str", ""),
                    "Action": f"Simulated {mode.upper()}",
                    "Status": "Dry Run"
                })
                continue

            try:
                # Ensure unique destination if file already exists on disk
                final_dst = dst
                c = 1
                b_stem, b_ext = os.path.splitext(dst)
                while os.path.exists(final_dst):
                    final_dst = f"{b_stem}_{c}{b_ext}"
                    c += 1

                if mode == "move":
                    shutil.move(src, final_dst)
                else:
                    shutil.copy2(src, final_dst)

                copied += 1
                manifest_rows.append({
                    "Source": src,
                    "Destination": final_dst,
                    "Shoot Folder": item.get("shoot_folder", ""),
                    "Size": item.get("size_str", ""),
                    "Action": mode.upper(),
                    "Status": "Success"
                })
            except Exception as e:
                failed += 1
                err_msg = f"{item['filename']}: {str(e)}"
                errors.append(err_msg)
                manifest_rows.append({
                    "Source": src,
                    "Destination": dst,
                    "Shoot Folder": item.get("shoot_folder", ""),
                    "Size": item.get("size_str", ""),
                    "Action": mode.upper(),
                    "Status": f"Failed: {str(e)}"
                })

        # Save CSV Audit Manifest
        manifest_path = ""
        if not dry_run and copied > 0:
            try:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                manifest_path = os.path.join(target_dir, f"collection_manifest_{ts}.csv")
                with open(manifest_path, "w", newline="", encoding="utf-8-sig") as f:
                    writer = csv.DictWriter(f, fieldnames=["Source", "Destination", "Shoot Folder", "Size", "Action", "Status"])
                    writer.writeheader()
                    writer.writerows(manifest_rows)
            except Exception:
                pass

        return {
            "success": True,
            "total": len(items),
            "copied": copied,
            "failed": failed,
            "errors": errors,
            "target_folder": target_dir,
            "manifest_path": manifest_path,
            "dry_run": dry_run
        }


# =============================================================================
# Modern Tkinter Dark-Mode Graphical User Interface
# =============================================================================
def launch_gui(default_source: str = "", default_dest: str = ""):
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox

    root = tk.Tk()
    root.title("DataFlow Studio — All Inventory Reports Collector")
    root.geometry("960x650")
    root.minsize(820, 520)

    # Color Tokens matching DataFlow Studio
    BG_MAIN = "#07080d"
    BG_CARD = "#121624"
    BG_INPUT = "#181e30"
    BORDER_COLOR = "#232b42"
    TEXT_WHITE = "#f8fafc"
    TEXT_MUTED = "#94a3b8"
    ACCENT_CYAN = "#00F2FE"
    ACCENT_GREEN = "#10E79D"
    ACCENT_BLUE = "#3B82F6"

    root.configure(bg=BG_MAIN)

    source_var = tk.StringVar(value=default_source)
    dest_var = tk.StringVar(value=default_dest)
    dry_run_var = tk.BooleanVar(value=False)
    smart_prefix_var = tk.BooleanVar(value=True)
    mode_var = tk.StringVar(value="copy")

    scanned_items: List[Dict] = []
    collector_ref: List[Optional[InventoryReportCollector]] = [None]

    # Header Card
    hdr = tk.Frame(root, bg=BG_MAIN)
    hdr.pack(fill="x", padx=18, pady=(14, 8))

    lbl_title = tk.Label(
        hdr,
        text="All Inventory Reports Collector",
        font=("Segoe UI", 16, "bold"),
        fg=ACCENT_CYAN,
        bg=BG_MAIN
    )
    lbl_title.pack(anchor="w")

    lbl_sub = tk.Label(
        hdr,
        text="Scans folders for '_Inventory_Report.xlsx' in Document directories and consolidates them into an 'All Inventory Reports' folder.",
        font=("Segoe UI", 9),
        fg=TEXT_MUTED,
        bg=BG_MAIN
    )
    lbl_sub.pack(anchor="w", pady=(2, 0))

    # Path Selection Card
    path_card = tk.Frame(root, bg=BG_CARD, bd=1, relief="solid", highlightbackground=BORDER_COLOR, highlightthickness=1)
    path_card.pack(fill="x", padx=18, pady=6)

    # Source Row
    f_src = tk.Frame(path_card, bg=BG_CARD)
    f_src.pack(fill="x", padx=14, pady=(12, 6))

    tk.Label(f_src, text="1. Source Folder to Scan:", font=("Segoe UI", 9, "bold"), fg=TEXT_WHITE, bg=BG_CARD, width=22, anchor="w").pack(side="left")
    e_src = tk.Entry(f_src, textvariable=source_var, font=("Segoe UI", 9), bg=BG_INPUT, fg=TEXT_WHITE, insertbackground=ACCENT_CYAN, relief="flat", highlightbackground=BORDER_COLOR, highlightthickness=1)
    e_src.pack(side="left", fill="x", expand=True, padx=(4, 8), ipady=3)

    def browse_source():
        d = filedialog.askdirectory(title="Select Source Folder to Scan for Inventory Reports", initialdir=source_var.get() or os.getcwd())
        if d:
            source_var.set(d)
    tk.Button(f_src, text="Browse...", font=("Segoe UI", 9), bg="#1e2538", fg=TEXT_WHITE, activebackground=BORDER_COLOR, activeforeground=TEXT_WHITE, relief="flat", padx=12, pady=2, command=browse_source).pack(side="right")

    # Destination Row
    f_dst = tk.Frame(path_card, bg=BG_CARD)
    f_dst.pack(fill="x", padx=14, pady=(6, 12))

    tk.Label(f_dst, text="2. Destination Folder:", font=("Segoe UI", 9, "bold"), fg=TEXT_WHITE, bg=BG_CARD, width=22, anchor="w").pack(side="left")
    e_dst = tk.Entry(f_dst, textvariable=dest_var, font=("Segoe UI", 9), bg=BG_INPUT, fg=TEXT_WHITE, insertbackground=ACCENT_CYAN, relief="flat", highlightbackground=BORDER_COLOR, highlightthickness=1)
    e_dst.pack(side="left", fill="x", expand=True, padx=(4, 8), ipady=3)

    def browse_dest():
        d = filedialog.askdirectory(title="Select Destination Directory", initialdir=dest_var.get() or os.getcwd())
        if d:
            dest_var.set(d)
    tk.Button(f_dst, text="Browse...", font=("Segoe UI", 9), bg="#1e2538", fg=TEXT_WHITE, activebackground=BORDER_COLOR, activeforeground=TEXT_WHITE, relief="flat", padx=12, pady=2, command=browse_dest).pack(side="right")

    # Target info badge
    f_badge = tk.Frame(path_card, bg="#0d111d")
    f_badge.pack(fill="x", padx=14, pady=(0, 10))
    lbl_target_info = tk.Label(
        f_badge,
        text="📁 Target output directory will be: [Destination] \\ All Inventory Reports",
        font=("Segoe UI", 8, "italic"),
        fg=ACCENT_CYAN,
        bg="#0d111d",
        padx=10,
        pady=6
    )
    lbl_target_info.pack(anchor="w")

    def update_target_label(*args):
        dst = dest_var.get().strip()
        if dst:
            lbl_target_info.config(text=f"📁 Target output directory:  {os.path.join(dst, TARGET_FOLDER_NAME)}")
        else:
            lbl_target_info.config(text="📁 Target output directory will be: [Destination] \\ All Inventory Reports")
    dest_var.trace_add("write", update_target_label)
    update_target_label()

    # Options & Action Bar
    f_act = tk.Frame(root, bg=BG_MAIN)
    f_act.pack(fill="x", padx=18, pady=6)

    # Options Left
    f_opts = tk.Frame(f_act, bg=BG_MAIN)
    f_opts.pack(side="left")

    tk.Checkbutton(
        f_opts,
        text="Smart Prefix with Shoot Folder (Prevents Collisions)",
        variable=smart_prefix_var,
        font=("Segoe UI", 9),
        bg=BG_MAIN,
        fg=TEXT_WHITE,
        selectcolor="#181e30",
        activebackground=BG_MAIN,
        activeforeground=TEXT_WHITE
    ).pack(side="left", padx=(0, 14))

    tk.Checkbutton(
        f_opts,
        text="Dry Run (Preview Only)",
        variable=dry_run_var,
        font=("Segoe UI", 9),
        bg=BG_MAIN,
        fg=TEXT_WHITE,
        selectcolor="#181e30",
        activebackground=BG_MAIN,
        activeforeground=TEXT_WHITE
    ).pack(side="left")

    # Buttons Right
    btn_copy = tk.Button(
        f_act,
        text="⚡ Collect into 'All Inventory Reports'",
        font=("Segoe UI", 10, "bold"),
        bg=ACCENT_GREEN,
        fg="#000000",
        activebackground="#0dc282",
        activeforeground="#000000",
        relief="flat",
        padx=16,
        pady=6,
        state="disabled"
    )
    btn_copy.pack(side="right", padx=(8, 0))

    btn_scan = tk.Button(
        f_act,
        text="🔍 Scan Folders",
        font=("Segoe UI", 10, "bold"),
        bg=ACCENT_CYAN,
        fg="#000000",
        activebackground="#00c8d4",
        activeforeground="#000000",
        relief="flat",
        padx=16,
        pady=6
    )
    btn_scan.pack(side="right")

    # Table Card
    table_card = tk.Frame(root, bg=BG_CARD, bd=1, relief="solid", highlightbackground=BORDER_COLOR, highlightthickness=1)
    table_card.pack(fill="both", expand=True, padx=18, pady=(4, 10))

    # Status Bar above table
    status_bar = tk.Label(
        table_card,
        text="Ready. Select source and destination folders, then click 'Scan Folders'.",
        font=("Segoe UI", 8.5),
        fg=TEXT_MUTED,
        bg=BG_CARD,
        anchor="w",
        padx=10,
        pady=6
    )
    status_bar.pack(fill="x")

    columns = ("shoot", "doc_folder", "original_file", "size", "target_name", "status")
    tree = ttk.Treeview(table_card, columns=columns, show="headings", selectmode="browse")

    tree.heading("shoot", text="Shoot / Parent Folder")
    tree.heading("doc_folder", text="Document Directory")
    tree.heading("original_file", text="Report File Name")
    tree.heading("size", text="File Size")
    tree.heading("target_name", text="Destination in 'All Inventory Reports'")
    tree.heading("status", text="Status")

    tree.column("shoot", width=170, anchor="w")
    tree.column("doc_folder", width=120, anchor="center")
    tree.column("original_file", width=200, anchor="w")
    tree.column("size", width=80, anchor="center")
    tree.column("target_name", width=240, anchor="w")
    tree.column("status", width=90, anchor="center")

    scrollbar = ttk.Scrollbar(table_card, orient="vertical", command=tree.yview)
    tree.configure(yscrollcommand=scrollbar.set)
    tree.pack(side="left", fill="both", expand=True, padx=(4, 0), pady=(0, 4))
    scrollbar.pack(side="right", fill="y", pady=(0, 4))

    # Scan Action
    def handle_scan():
        src = source_var.get().strip()
        dst = dest_var.get().strip()

        if not src:
            messagebox.showwarning("Missing Source", "Please select a source folder to scan.")
            return
        if not os.path.exists(src):
            messagebox.showerror("Invalid Source", f"The source folder does not exist:\n{src}")
            return

        collector = InventoryReportCollector(src, dst, smart_prefix=smart_prefix_var.get())
        collector_ref[0] = collector

        status_bar.config(text=f"Scanning folders recursively in {src}...", fg=ACCENT_CYAN)
        root.update()

        try:
            items = collector.scan()
            scanned_items.clear()
            scanned_items.extend(items)

            for r in tree.get_children():
                tree.delete(r)

            for item in items:
                tree.insert(
                    "",
                    "end",
                    values=(
                        item["shoot_folder"],
                        item["doc_folder_name"],
                        item["filename"],
                        item["size_str"],
                        item["proposed_name"],
                        "Pending"
                    )
                )

            if items:
                status_bar.config(
                    text=f"Found {len(items)} Inventory Report file(s) across Document folders. Ready to collect.",
                    fg=ACCENT_GREEN
                )
                btn_copy.config(state="normal")
            else:
                status_bar.config(
                    text="Scan complete: No '_Inventory_Report.xlsx' files found in Document folders under this path.",
                    fg="#F59E0B"
                )
                btn_copy.config(state="disabled")

        except Exception as ex:
            status_bar.config(text=f"Scan error: {str(ex)}", fg="#EF4444")
            messagebox.showerror("Scan Error", str(ex))

    btn_scan.config(command=handle_scan)

    # Collect Action
    def handle_collect():
        if not scanned_items:
            messagebox.showwarning("No Items", "No inventory reports available to copy. Run 'Scan Folders' first.")
            return

        dst = dest_var.get().strip()
        if not dst:
            messagebox.showwarning("Missing Destination", "Please specify a destination folder.")
            return

        collector = InventoryReportCollector(source_var.get().strip(), dst, smart_prefix=smart_prefix_var.get())
        is_dry = dry_run_var.get()

        status_bar.config(text="Processing and copying files to 'All Inventory Reports'...", fg=ACCENT_CYAN)
        root.update()

        try:
            res = collector.execute(scanned_items, mode=mode_var.get(), dry_run=is_dry)
            target_f = res["target_folder"]

            # Update Tree statuses
            for r in tree.get_children():
                tree.set(r, "status", "Copied" if not is_dry else "Simulated")

            msg = (
                f"Successfully collected {res['copied']} inventory reports into:\n"
                f"{target_f}\n\n"
                f"Folder 'All Inventory Reports' was created with all reports organized."
            )
            if is_dry:
                msg = f"[Dry Run Simulation]\n{res['copied']} files would be copied to:\n{target_f}"

            status_bar.config(
                text=f"Complete: {res['copied']} files copied into '{target_f}'.",
                fg=ACCENT_GREEN
            )

            # Prompt to open folder in Explorer
            if not is_dry and os.path.exists(target_f):
                if messagebox.askyesno("Collection Complete", f"{msg}\n\nWould you like to open 'All Inventory Reports' folder now?"):
                    if sys.platform == "win32":
                        os.startfile(target_f)
            else:
                messagebox.showinfo("Operation Complete", msg)

        except Exception as ex:
            status_bar.config(text=f"Execution error: {str(ex)}", fg="#EF4444")
            messagebox.showerror("Execution Error", str(ex))

    btn_copy.config(command=handle_collect)

    root.mainloop()


# =============================================================================
# CLI / Terminal Mode
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="DataFlow Studio — All Inventory Reports Collector",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Launch the graphical user interface:
  python collect_inventory_reports.py

  # Run from command line:
  python collect_inventory_reports.py --source "D:\\Shoots" --dest "D:\\Reports"

  # Dry run preview:
  python collect_inventory_reports.py --source "D:\\Shoots" --dest "D:\\Reports" --dry-run
"""
    )
    parser.add_argument("--source", "-s", help="Source folder to scan recursively", default="")
    parser.add_argument("--dest", "-d", help="Destination folder (creates 'All Inventory Reports' inside)", default="")
    parser.add_argument("--move", action="store_true", help="Move files instead of copying")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without copying files")
    parser.add_argument("--no-smart-prefix", action="store_true", help="Do not prefix with shoot folder name")
    parser.add_argument("--cli", action="store_true", help="Force interactive terminal mode instead of GUI")

    args = parser.parse_args()

    # If neither source nor dest is given and --cli is NOT specified, launch GUI
    if not args.source and not args.dest and not args.cli:
        try:
            launch_gui()
            return
        except Exception as e:
            print(f"[NOTE] GUI could not be initialized ({e}), switching to interactive CLI mode.")

    source = args.source
    dest = args.dest

    # If run in terminal interactively without paths
    if not source:
        try:
            source = input("Enter Source folder path to scan: ").strip()
        except (EOFError, KeyboardInterrupt):
            sys.exit(0)

    if not dest:
        try:
            dest = input("Enter Destination folder path: ").strip()
        except (EOFError, KeyboardInterrupt):
            sys.exit(0)

    if not source or not os.path.exists(source):
        print(f"[ERROR] Source path does not exist: {source}")
        sys.exit(1)

    if not dest:
        print("[ERROR] Destination path is required.")
        sys.exit(1)

    print("\n" + "=" * 70)
    print(" DATAFLOW STUDIO — INVENTORY REPORT COLLECTOR")
    print("=" * 70)
    print(f" Source:      {source}")
    print(f" Destination: {dest}")
    print(f" Target:      {os.path.join(dest, TARGET_FOLDER_NAME)}")
    print(f" Mode:        {'MOVE' if args.move else 'COPY'}")
    print(f" Dry Run:     {args.dry_run}")
    print("=" * 70)
    print("[*] Scanning directory tree for Inventory Reports in Document folders...")

    collector = InventoryReportCollector(source, dest, smart_prefix=not args.no_smart_prefix)
    items = collector.scan()

    if not items:
        print("[!] No '_Inventory_Report.xlsx' files found in Document directories under this path.")
        sys.exit(0)

    print(f"[+] Found {len(items)} matching Inventory Report(s):\n")
    print(f"{'Shoot Folder':<25} {'Doc Dir':<12} {'Size':<10} {'Target Name in All Inventory Reports'}")
    print("-" * 80)
    for it in items:
        print(f"{it['shoot_folder']:<25} {it['doc_folder_name']:<12} {it['size_str']:<10} {it['proposed_name']}")
    print("-" * 80)

    res = collector.execute(items, mode="move" if args.move else "copy", dry_run=args.dry_run)
    print(f"\n[+] Success! Processed {res['copied']} files into:")
    print(f"    --> {res['target_folder']}")
    if res['manifest_path']:
        print(f"    Audit Manifest saved to: {res['manifest_path']}")
    print("=" * 70)


if __name__ == "__main__":
    main()
