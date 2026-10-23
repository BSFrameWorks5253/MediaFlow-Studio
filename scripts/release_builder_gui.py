#!/usr/bin/env python3
"""
=============================================================================
  MediaFlow Studio — Ultra-Fast Automated Packaging & Version Manager
  Integrated with the Anything Child App Ecosystem & GitHub Releases
  Built with CustomTkinter & Apple WWDC26 Modern Studio Aesthetics
=============================================================================
"""

import sys
import os
import json
import re
import subprocess
import threading
from pathlib import Path

try:
    import customtkinter as ctk
    from PIL import Image
except ImportError:
    print("[ERROR] Required modules missing. Install via: pip install customtkinter pillow")
    sys.exit(1)

# Configure Appearance
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

BASE_DIR = Path(__file__).resolve().parent.parent
PACKAGE_JSON_PATH = BASE_DIR / "package.json"
DIST_DIR = BASE_DIR / "dist-release"
RELEASES_DIR = BASE_DIR / "releases"
GITHUB_REPO_URL = "https://github.com/BSFrameWorks5253/MediaFlow-Studio"
GITHUB_RELEASES_URL = "https://github.com/BSFrameWorks5253/MediaFlow-Studio/releases"

CANDIDATE_ANYTHING_DIRS = [
    r"C:\Users\Burhanuddin\OneDrive\Desktop\New folder (2)\Anything",
    r"C:\Users\Burhanuddin\OneDrive\Desktop\Anything",
    os.path.abspath(os.path.join(BASE_DIR, "..", "New folder (2)", "Anything")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "Anything")),
]


def get_active_anything_dir():
    for d in CANDIDATE_ANYTHING_DIRS:
        if os.path.exists(d):
            return d
    return os.path.abspath(os.path.join(BASE_DIR, "..", "Anything"))


class MediaFlowBuilderApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("MediaFlow Studio • Release & Packaging Station")
        self.geometry("960x780")
        self.minsize(860, 680)

        # Set window icon
        icon_path = BASE_DIR / "public" / "assets" / "app.ico"
        if not icon_path.exists():
            icon_path = BASE_DIR / "public" / "assets" / "logo.png"
        if icon_path.exists():
            try:
                self.iconbitmap(str(icon_path))
            except Exception:
                pass

        self.build_process = None
        self.is_building = False
        self.current_version = self.load_package_version()

        self.setup_ui()

    def load_package_version(self) -> str:
        if PACKAGE_JSON_PATH.exists():
            try:
                with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("version", "6.0.0")
            except Exception:
                pass
        return "6.0.0"

    def save_package_version(self, new_ver: str):
        if PACKAGE_JSON_PATH.exists():
            try:
                with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data["version"] = new_ver
                with open(PACKAGE_JSON_PATH, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
            except Exception:
                pass

    def calculate_next_version(self, current_ver: str, bump_type: str) -> str:
        clean = current_ver.strip().replace("v", "")
        parts = clean.split(".")
        major = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 6
        minor = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        patch = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0

        if bump_type == "patch":
            return f"{major}.{minor}.{patch + 1}"
        elif bump_type == "minor":
            return f"{major}.{minor + 1}.0"
        elif bump_type == "major":
            return f"{major + 1}.0.0"
        return current_ver

    def setup_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(3, weight=1)

        # 1. Header Glass Banner
        header = ctk.CTkFrame(self, fg_color="#0D1322", corner_radius=12, border_width=1, border_color="#1E293B")
        header.grid(row=0, column=0, padx=20, pady=(16, 10), sticky="ew")
        header.grid_columnconfigure(1, weight=1)

        # Render Logo Image
        logo_png = BASE_DIR / "public" / "assets" / "logo.png"
        if logo_png.exists():
            try:
                pil_logo = Image.open(str(logo_png)).resize((48, 48), Image.Resampling.LANCZOS)
                self.ctk_logo = ctk.CTkImage(light_image=pil_logo, dark_image=pil_logo, size=(48, 48))
                logo_lbl = ctk.CTkLabel(header, text="", image=self.ctk_logo)
                logo_lbl.grid(row=0, column=0, padx=(16, 12), pady=12)
            except Exception:
                icon_badge = ctk.CTkLabel(
                    header,
                    text="Mf",
                    font=ctk.CTkFont(family="Inter", size=18, weight="bold"),
                    fg_color="#00F2FE",
                    text_color="#07090E",
                    width=48,
                    height=48,
                    corner_radius=12,
                )
                icon_badge.grid(row=0, column=0, padx=16, pady=12)
        else:
            icon_badge = ctk.CTkLabel(
                header,
                text="Mf",
                font=ctk.CTkFont(family="Inter", size=18, weight="bold"),
                fg_color="#00F2FE",
                text_color="#07090E",
                width=48,
                height=48,
                corner_radius=12,
            )
            icon_badge.grid(row=0, column=0, padx=16, pady=12)

        # Header Titles
        title_box = ctk.CTkFrame(header, fg_color="transparent")
        title_box.grid(row=0, column=1, sticky="w", pady=10)

        main_title = ctk.CTkLabel(
            title_box,
            text="MediaFlow Studio • Release & Packaging Station",
            font=ctk.CTkFont(family="Inter", size=17, weight="bold"),
            text_color="#F8FAFC",
        )
        main_title.pack(anchor="w")

        sub_title = ctk.CTkLabel(
            title_box,
            text="Anything Child App Ecosystem • Setup EXE, Portable & GitHub Releases Pipeline",
            font=ctk.CTkFont(family="Inter", size=11.5),
            text_color="#94A3B8",
        )
        sub_title.pack(anchor="w")

        # Status Capsule Pill
        status_pill = ctk.CTkLabel(
            header,
            text="⚡ ANYTHING READY",
            font=ctk.CTkFont(family="JetBrains Mono", size=11, weight="bold"),
            text_color="#00F2FE",
            fg_color="#10254C",
            corner_radius=8,
            padx=12,
            pady=6,
        )
        status_pill.grid(row=0, column=2, padx=16)

        # 2. Configuration Panel
        config_frame = ctk.CTkFrame(self, fg_color="#111827", corner_radius=12, border_width=1, border_color="#1F2937")
        config_frame.grid(row=1, column=0, padx=20, pady=6, sticky="ew")
        config_frame.grid_columnconfigure(0, weight=1)

        # Version Controller Row
        ver_row = ctk.CTkFrame(config_frame, fg_color="transparent")
        ver_row.pack(fill="x", padx=16, pady=(12, 6))

        ctk.CTkLabel(
            ver_row,
            text="Target Version:",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#E2E8F0",
        ).pack(side="left", padx=(0, 10))

        self.ver_entry = ctk.CTkEntry(
            ver_row,
            font=ctk.CTkFont(family="JetBrains Mono", size=13, weight="bold"),
            width=120,
            height=32,
            fg_color="#1E293B",
            border_color="#00F2FE",
            text_color="#38BDF8",
        )
        self.ver_entry.insert(0, self.current_version)
        self.ver_entry.pack(side="left", padx=(0, 8))

        self.lbl_curr_ver = ctk.CTkLabel(
            ver_row,
            text=f"(Current: v{self.current_version})",
            font=ctk.CTkFont(size=11),
            text_color="#94A3B8",
        )
        self.lbl_curr_ver.pack(side="left", padx=8)

        # Quick bump buttons
        btn_bump_patch = ctk.CTkButton(
            ver_row,
            text="+ Patch Bump",
            width=90,
            height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#1E293B",
            hover_color="#334155",
            command=lambda: self.bump_version("patch"),
        )
        btn_bump_patch.pack(side="left", padx=3)

        btn_bump_minor = ctk.CTkButton(
            ver_row,
            text="+ Minor Bump",
            width=90,
            height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#1E293B",
            hover_color="#334155",
            command=lambda: self.bump_version("minor"),
        )
        btn_bump_minor.pack(side="left", padx=3)

        btn_bump_major = ctk.CTkButton(
            ver_row,
            text="+ Major Bump",
            width=90,
            height=28,
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#1E293B",
            hover_color="#334155",
            command=lambda: self.bump_version("major"),
        )
        btn_bump_major.pack(side="left", padx=3)

        # Targets & Ecosystem Checkboxes Row
        targets_row = ctk.CTkFrame(config_frame, fg_color="transparent")
        targets_row.pack(fill="x", padx=16, pady=(8, 12))

        self.cb_portable = ctk.BooleanVar(value=True)
        self.cb_setup = ctk.BooleanVar(value=True)
        self.cb_zip = ctk.BooleanVar(value=True)
        self.cb_sync = ctk.BooleanVar(value=True)
        self.cb_github = ctk.BooleanVar(value=True)

        ctk.CTkCheckBox(targets_row, text="Portable (.exe)", variable=self.cb_portable, font=ctk.CTkFont(size=12), text_color="#F8FAFC").pack(side="left", padx=(0, 14))
        ctk.CTkCheckBox(targets_row, text="Setup Installer (.exe)", variable=self.cb_setup, font=ctk.CTkFont(size=12), text_color="#F8FAFC").pack(side="left", padx=(0, 14))
        ctk.CTkCheckBox(targets_row, text="ZIP Archive (.zip)", variable=self.cb_zip, font=ctk.CTkFont(size=12), text_color="#F8FAFC").pack(side="left", padx=(0, 14))
        ctk.CTkCheckBox(targets_row, text="Auto-Sync to Anything", variable=self.cb_sync, font=ctk.CTkFont(size=12, weight="bold"), text_color="#34D399", fg_color="#10B981").pack(side="left", padx=(0, 14))
        ctk.CTkCheckBox(targets_row, text="Publish to GitHub Releases", variable=self.cb_github, font=ctk.CTkFont(size=12, weight="bold"), text_color="#60A5FA", fg_color="#3B82F6").pack(side="left")

        # 3. Action Execution Bar
        action_bar = ctk.CTkFrame(self, fg_color="transparent")
        action_bar.grid(row=2, column=0, padx=20, pady=(6, 8), sticky="ew")

        self.btn_build = ctk.CTkButton(
            action_bar,
            text="🚀  COMPILE & PACKAGE PRODUCTION RELEASE",
            font=ctk.CTkFont(family="Inter", size=13, weight="bold"),
            fg_color="#0066EE",
            hover_color="#0052CC",
            height=42,
            corner_radius=8,
            command=self.start_build_pipeline,
        )
        self.btn_build.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.btn_push_tag = ctk.CTkButton(
            action_bar,
            text="🏷️ Tag & Push GitHub",
            font=ctk.CTkFont(family="Inter", size=12, weight="bold"),
            fg_color="#1E293B",
            hover_color="#334155",
            text_color="#F59E0B",
            height=42,
            width=150,
            corner_radius=8,
            command=self.start_tag_thread,
        )
        self.btn_push_tag.pack(side="left", padx=(0, 6))

        btn_open_release = ctk.CTkButton(
            action_bar,
            text="📁 Releases",
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#1E293B",
            hover_color="#334155",
            height=42,
            width=100,
            corner_radius=8,
            command=self.open_release_folder,
        )
        btn_open_release.pack(side="left", padx=(0, 6))

        btn_open_anything = ctk.CTkButton(
            action_bar,
            text="🌐 Anything",
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#1E293B",
            hover_color="#334155",
            text_color="#34D399",
            height=42,
            width=100,
            corner_radius=8,
            command=self.open_anything_folder,
        )
        btn_open_anything.pack(side="left", padx=(0, 6))

        btn_run_collector = ctk.CTkButton(
            action_bar,
            text="🔄 Refresh Collector",
            font=ctk.CTkFont(family="Inter", size=12),
            fg_color="#1E293B",
            hover_color="#334155",
            height=42,
            width=135,
            corner_radius=8,
            command=self.run_anything_collector,
        )
        btn_run_collector.pack(side="left")

        # 4. Terminal Stream Frame
        terminal_frame = ctk.CTkFrame(self, fg_color="#080B14", corner_radius=12, border_width=1, border_color="#1E2638")
        terminal_frame.grid(row=3, column=0, padx=20, pady=(6, 16), sticky="nsew")
        terminal_frame.grid_columnconfigure(0, weight=1)
        terminal_frame.grid_rowconfigure(1, weight=1)

        term_header = ctk.CTkFrame(terminal_frame, fg_color="#0E1322", height=32, corner_radius=8)
        term_header.grid(row=0, column=0, sticky="ew", padx=8, pady=(8, 4))

        ctk.CTkLabel(
            term_header,
            text="LIVE COMPILATION TELEMETRY & BUILD LOGS",
            font=ctk.CTkFont(family="JetBrains Mono", size=10, weight="bold"),
            text_color="#00F2FE",
        ).pack(side="left", padx=12)

        self.status_badge = ctk.CTkLabel(
            term_header,
            text="READY",
            font=ctk.CTkFont(family="JetBrains Mono", size=10, weight="bold"),
            text_color="#38BDF8",
            fg_color="#1A2136",
            corner_radius=6,
            padx=8,
            pady=2,
        )
        self.status_badge.pack(side="right", padx=10)

        # Scrollable Text Console
        self.console = ctk.CTkTextbox(
            terminal_frame,
            fg_color="#06080F",
            text_color="#F8FAFC",
            font=ctk.CTkFont(family="Consolas", size=11),
            corner_radius=8,
            wrap="word",
        )
        self.console.grid(row=1, column=0, sticky="nsew", padx=8, pady=(0, 8))
        self.console.insert("end", "[READY] MediaFlow Studio Release Station initialized.\n")
        self.console.insert("end", f"[READY] Target repository: {GITHUB_REPO_URL}\n")
        self.console.insert("end", f"[READY] Anything Ecosystem active directory: {get_active_anything_dir()}\n")
        self.console.insert("end", f"[READY] Current version: v{self.current_version}\n\n")

    def bump_version(self, bump_type: str):
        curr = self.ver_entry.get().strip() or self.current_version
        next_ver = self.calculate_next_version(curr, bump_type)
        self.ver_entry.delete(0, "end")
        self.ver_entry.insert(0, next_ver)

    def log(self, text: str):
        self.after(0, self._append_log, text)

    def _append_log(self, text: str):
        self.console.insert("end", text)
        self.console.see("end")

    def open_release_folder(self):
        target_v = self.ver_entry.get().strip().replace("v", "")
        v_dir = RELEASES_DIR / f"v{target_v}"
        if v_dir.exists():
            os.startfile(str(v_dir))
        elif RELEASES_DIR.exists():
            os.startfile(str(RELEASES_DIR))
        elif DIST_DIR.exists():
            os.startfile(str(DIST_DIR))
        else:
            self.log("[NOTICE] No release folder created yet. Run a build first!\n")

    def open_anything_folder(self):
        anything_dir = get_active_anything_dir()
        target_mf = os.path.join(anything_dir, "releases", "mediaflow-studio")
        if os.path.exists(target_mf):
            os.startfile(target_mf)
        elif os.path.exists(anything_dir):
            os.startfile(anything_dir)
        else:
            self.log(f"[WARN] Anything folder not found at: {anything_dir}\n")

    def run_anything_collector(self):
        anything_dir = get_active_anything_dir()
        collector = os.path.join(anything_dir, "scripts", "collect-releases.cjs")
        if os.path.exists(collector):
            self.log(f"\n[ANYTHING] Running release collector: {collector}...\n")
            threading.Thread(target=self._exec_collector, args=(collector, anything_dir), daemon=True).start()
        else:
            self.log(f"[WARN] Collector script not found at: {collector}\n")

    def _exec_collector(self, script_path, cwd):
        try:
            proc = subprocess.Popen(
                ["node", script_path],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            for line in proc.stdout:
                self.log("  " + line)
            proc.wait()
            self.log("✓ Anything catalog refreshed successfully!\n")
        except Exception as e:
            self.log(f"[ERROR] Collector failed: {e}\n")

    def start_build_pipeline(self):
        if self.is_building:
            return

        target_version = self.ver_entry.get().strip().replace("v", "")
        if not re.match(r"^\d+\.\d+(\.\d+)?$", target_version):
            self.log(f"[ERROR] Version '{target_version}' is invalid. Please use SemVer like 6.0.0\n")
            return

        self.is_building = True
        self.btn_build.configure(state="disabled", text="⏳  BUILDING & PACKAGING IN PROGRESS...")
        self.status_badge.configure(text="BUILDING", text_color="#00F2FE", fg_color="#10254C")

        self.save_package_version(target_version)
        self.current_version = target_version
        self.lbl_curr_ver.configure(text=f"(Current: v{self.current_version})")

        threading.Thread(target=self.run_build_thread, args=(target_version,), daemon=True).start()

    def start_tag_thread(self):
        if self.is_building:
            return

        target_version = self.ver_entry.get().strip().replace("v", "")
        if not target_version:
            self.log("[ERROR] Please specify a valid version first!\n")
            return

        self.is_building = True
        self.btn_push_tag.configure(state="disabled", text="⏳ Tagging...")
        threading.Thread(target=self.run_tag_and_push, args=(target_version,), daemon=True).start()

    def run_tag_and_push(self, version: str):
        tag = f"v{version}"
        self.log("\n" + "=" * 65 + "\n")
        self.log(f"  PUBLISHING RELEASE TAG TO GITHUB: {tag}\n")
        self.log("=" * 65 + "\n\n")

        try:
            self.log("[1/4] Staging working tree changes (git add -A)...\n")
            subprocess.run(["git", "add", "-A"], cwd=str(BASE_DIR), check=True)

            status = subprocess.check_output(["git", "status", "--porcelain"], cwd=str(BASE_DIR), text=True).strip()
            if status:
                self.log(f"[2/4] Committing release changes: chore(release): {tag}...\n")
                subprocess.run(["git", "commit", "-m", f"chore(release): {tag}"], cwd=str(BASE_DIR), check=True)
                self.log("  ✓ Changes committed.\n")

            self.log(f"[3/4] Creating local release tag: {tag}...\n")
            subprocess.run(["git", "tag", "-a", tag, "-m", f"Release {tag}", "-f"], cwd=str(BASE_DIR), check=True)
            self.log(f"  ✓ Tag {tag} created locally.\n")

            self.log("[4/4] Pushing commits & release tag to GitHub origin...\n")
            subprocess.run(["git", "push", "origin", "main"], cwd=str(BASE_DIR), check=True)
            subprocess.run(["git", "push", "origin", tag, "--force"], cwd=str(BASE_DIR), check=True)

            self.log(f"\n🎉 SUCCESS! Pushed {tag} to GitHub!\n")
            self.log(f"GitHub Actions is now compiling binaries and publishing release assets at:\n")
            self.log(f"➜ {GITHUB_RELEASES_URL}\n\n")
        except Exception as e:
            self.log(f"\n[ERROR] Git push failed: {str(e)}\n")
        finally:
            self.is_building = False
            self.after(0, lambda: self.btn_push_tag.configure(state="normal", text="🏷️ Tag & Push GitHub"))

    def run_build_thread(self, version: str):
        try:
            self.log("\n" + "=" * 65 + "\n")
            self.log(f"  STARTING PIPELINE BUILD: MediaFlow Studio v{version}\n")
            self.log("=" * 65 + "\n\n")

            script_path = BASE_DIR / "scripts" / "package-release.mjs"
            cmd = ["node", str(script_path), version]
            if self.cb_github.get():
                cmd.append("--publish-github")

            proc = subprocess.Popen(
                cmd,
                cwd=str(BASE_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            for line in proc.stdout:
                self.log(line)

            proc.wait()
            ret = proc.returncode

            if ret == 0:
                self.log("\n" + "=" * 65 + "\n")
                self.log(f"  ✓ PRODUCTION RELEASE v{version} COMPLETED SUCCESSFULLY!\n")
                self.log(f"  Setup EXE & ZIP created and synced to Anything!\n")
                if self.cb_github.get():
                    self.log(f"  Published to GitHub Releases: {GITHUB_RELEASES_URL}\n")
                self.log("=" * 65 + "\n\n")
                self.after(0, self.finish_build, True)
            else:
                self.log(f"\n[ERROR] Packaging returned error code: {ret}\n")
                self.after(0, self.finish_build, False)

        except Exception as e:
            self.log(f"\n[FATAL ERROR] {str(e)}\n")
            self.after(0, self.finish_build, False)

    def finish_build(self, success: bool):
        self.is_building = False
        if success:
            self.status_badge.configure(text="SUCCESS", text_color="#30D158", fg_color="#123B22")
            self.btn_build.configure(state="normal", text="✓  BUILD SUCCEEDED! CLICK TO REBUILD")
            self.open_release_folder()
        else:
            self.status_badge.configure(text="FAILED", text_color="#FF453A", fg_color="#3E1515")
            self.btn_build.configure(state="normal", text="⚠️  RETRY BUILD & PACKAGE RELEASE")


def main():
    app = MediaFlowBuilderApp()
    app.mainloop()


if __name__ == "__main__":
    main()
