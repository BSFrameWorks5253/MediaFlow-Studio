"""
=============================================================================
  CineFlow / DataFlow Studio — Ultra-Fast Automated Packaging & Version Manager
  Built with CustomTkinter (Apple Pro / Obsidian Modern Glass Studio UI)
=============================================================================
"""

import sys
import os
import json
import re
import subprocess
import threading
import time
from pathlib import Path

try:
    import customtkinter as ctk
    from PIL import Image
except ImportError:
    print("[ERROR] Required modules missing. Install via: pip install customtkinter pillow")
    sys.exit(1)

# Configure CustomTkinter Appearance
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

BASE_DIR = Path(__file__).resolve().parent.parent
PACKAGE_JSON_PATH = BASE_DIR / "package.json"
DIST_DIR = BASE_DIR / "release"


class BuildManagerApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("DataFlow Studio • Ultra Release & Packaging Manager")
        self.geometry("980x740")
        self.minsize(860, 640)

        # Process handle
        self.build_process = None
        self.is_building = False

        # Load Current Version from package.json
        self.current_version = self.load_package_version()

        self.setup_ui()

    def load_package_version(self) -> str:
        if PACKAGE_JSON_PATH.exists():
            try:
                with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("version", "4.0.0")
            except Exception:
                pass
        return "4.0.0"

    def save_package_version(self, new_ver: str):
        if PACKAGE_JSON_PATH.exists():
            with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["version"] = new_ver
            with open(PACKAGE_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

    def calculate_next_version(self, current_ver: str, bump_type: str) -> str:
        parts = current_ver.split(".")
        major = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 4
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
        self.grid_rowconfigure(2, weight=1)

        # Header Glass Banner
        header = ctk.CTkFrame(self, fg_color="#101422", corner_radius=12, border_width=1, border_color="#202A44")
        header.grid(row=0, column=0, padx=20, pady=(18, 12), sticky="ew")
        header.grid_columnconfigure(1, weight=1)

        # App Badge / Indicator
        icon_badge = ctk.CTkLabel(
            header,
            text="DF",
            font=ctk.CTkFont(family="Inter", size=18, weight="bold"),
            fg_color="#007AFF",
            text_color="#FFFFFF",
            width=48,
            height=48,
            corner_radius=12,
        )
        icon_badge.grid(row=0, column=0, padx=16, pady=14)

        # Header Titles
        title_box = ctk.CTkFrame(header, fg_color="transparent")
        title_box.grid(row=0, column=1, sticky="w", pady=10)

        main_title = ctk.CTkLabel(
            title_box,
            text="DataFlow Studio • Production Release Station",
            font=ctk.CTkFont(family="Inter", size=18, weight="bold"),
            text_color="#FFFFFF",
        )
        main_title.pack(anchor="w")

        sub_title = ctk.CTkLabel(
            title_box,
            text="Automated Clean Pipeline: Vite + Electron TypeScript + NSIS Professional EXE & Enterprise MSI Bundler",
            font=ctk.CTkFont(family="Inter", size=12),
            text_color="#8E8E93",
        )
        sub_title.pack(anchor="w")

        # Configuration Cards Container
        config_frame = ctk.CTkFrame(self, fg_color="#131828", corner_radius=12, border_width=1, border_color="#202A44")
        config_frame.grid(row=1, column=0, padx=20, pady=6, sticky="ew")
        config_frame.grid_columnconfigure(0, weight=1)
        config_frame.grid_columnconfigure(1, weight=1)

        # --- LEFT: Version Controller ---
        ver_box = ctk.CTkFrame(config_frame, fg_color="#181F34", corner_radius=10, border_width=1, border_color="#273352")
        ver_box.grid(row=0, column=0, padx=12, pady=12, sticky="nsew")

        ctk.CTkLabel(
            ver_box,
            text="RELEASE VERSION CONTROL",
            font=ctk.CTkFont(family="JetBrains Mono", size=11, weight="bold"),
            text_color="#00F2FE",
        ).pack(anchor="w", padx=14, pady=(12, 6))

        # Current vs Target Version Row
        ver_input_row = ctk.CTkFrame(ver_box, fg_color="transparent")
        ver_input_row.pack(fill="x", padx=14, pady=4)

        ctk.CTkLabel(
            ver_input_row,
            text="Target Version:",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#D1D5DB",
        ).pack(side="left", padx=(0, 10))

        self.ver_entry = ctk.CTkEntry(
            ver_input_row,
            font=ctk.CTkFont(family="JetBrains Mono", size=14, weight="bold"),
            width=130,
            height=34,
            fg_color="#0C101D",
            border_color="#007AFF",
            text_color="#30D158",
        )
        self.ver_entry.insert(0, self.current_version)
        self.ver_entry.pack(side="left")

        self.lbl_curr_ver = ctk.CTkLabel(
            ver_input_row,
            text=f"(Current: v{self.current_version})",
            font=ctk.CTkFont(size=11),
            text_color="#8E8E93",
        )
        self.lbl_curr_ver.pack(side="left", padx=10)

        # 1-Click Version Increment Buttons
        btn_row = ctk.CTkFrame(ver_box, fg_color="transparent")
        btn_row.pack(fill="x", padx=14, pady=(10, 14))

        ctk.CTkButton(
            btn_row,
            text="+ 4.0.1 (Patch)",
            width=95,
            height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#1F293D",
            hover_color="#2D3B57",
            command=lambda: self.bump_version("patch"),
        ).pack(side="left", padx=3)

        ctk.CTkButton(
            btn_row,
            text="+ 4.1.0 (Minor)",
            width=95,
            height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#1F293D",
            hover_color="#2D3B57",
            command=lambda: self.bump_version("minor"),
        ).pack(side="left", padx=3)

        ctk.CTkButton(
            btn_row,
            text="+ 5.0.0 (Major)",
            width=95,
            height=28,
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#283554",
            hover_color="#3B4E7C",
            command=lambda: self.bump_version("major"),
        ).pack(side="left", padx=3)

        # --- RIGHT: Package Target Selectors ---
        target_box = ctk.CTkFrame(config_frame, fg_color="#181F34", corner_radius=10, border_width=1, border_color="#273352")
        target_box.grid(row=0, column=1, padx=12, pady=12, sticky="nsew")

        ctk.CTkLabel(
            target_box,
            text="INSTALLER PACKAGING TARGETS",
            font=ctk.CTkFont(family="JetBrains Mono", size=11, weight="bold"),
            text_color="#FF9F0A",
        ).pack(anchor="w", padx=14, pady=(12, 6))

        self.target_var = ctk.StringVar(value="all")

        radio_frame = ctk.CTkFrame(target_box, fg_color="transparent")
        radio_frame.pack(fill="x", padx=14, pady=4)

        r1 = ctk.CTkRadioButton(
            radio_frame,
            text="Both Setup EXE & Enterprise MSI  (Recommended)",
            value="all",
            variable=self.target_var,
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#FFFFFF",
            fg_color="#007AFF",
        )
        r1.pack(anchor="w", pady=4)

        r2 = ctk.CTkRadioButton(
            radio_frame,
            text="Setup EXE Only (NSIS High-Compression Installer)",
            value="exe",
            variable=self.target_var,
            font=ctk.CTkFont(size=12),
            text_color="#D1D5DB",
            fg_color="#007AFF",
        )
        r2.pack(anchor="w", pady=4)

        r3 = ctk.CTkRadioButton(
            radio_frame,
            text="MSI Only (Windows Installer Package for Enterprise)",
            value="msi",
            variable=self.target_var,
            font=ctk.CTkFont(size=12),
            text_color="#D1D5DB",
            fg_color="#007AFF",
        )
        r3.pack(anchor="w", pady=4)

        # Action Execution Bar
        action_bar = ctk.CTkFrame(self, fg_color="transparent")
        action_bar.grid(row=2, column=0, padx=20, pady=(6, 4), sticky="ew")
        action_bar.grid_columnconfigure(0, weight=1)

        self.btn_build = ctk.CTkButton(
            action_bar,
            text="🚀  COMPILE & PACKAGE PRODUCTION RELEASE",
            font=ctk.CTkFont(family="Inter", size=14, weight="bold"),
            fg_color="#007AFF",
            hover_color="#0062CC",
            height=46,
            corner_radius=10,
            command=self.start_build_pipeline,
        )
        self.btn_build.pack(side="left", fill="x", expand=True, padx=(0, 10))

        self.btn_open_release = ctk.CTkButton(
            action_bar,
            text="📁  Open Release Folder",
            font=ctk.CTkFont(family="Inter", size=12, weight="bold"),
            fg_color="#202A44",
            hover_color="#2D3B57",
            height=46,
            width=180,
            corner_radius=10,
            command=self.open_release_folder,
        )
        self.btn_open_release.pack(side="right")

        # Terminal Stream Frame
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
            text="IDLE",
            font=ctk.CTkFont(family="JetBrains Mono", size=10, weight="bold"),
            text_color="#8E8E93",
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
        self.console.insert("end", "[READY] DataFlow Studio Release Builder initialized.\n")
        self.console.insert("end", f"[READY] Current version detected: v{self.current_version}\n")
        self.console.insert("end", "[READY] Choose version and click 'COMPILE & PACKAGE PRODUCTION RELEASE'.\n\n")

    def bump_version(self, bump_type: str):
        curr = self.ver_entry.get().strip() or self.current_version
        next_ver = self.calculate_next_version(curr, bump_type)
        self.ver_entry.delete(0, "end")
        self.ver_entry.insert(0, next_ver)

    def log(self, text: str):
        # Thread-safe UI update using root.after
        self.after(0, self._append_log, text)

    def _append_log(self, text: str):
        self.console.insert("end", text)
        self.console.see("end")

    def open_release_folder(self):
        if not DIST_DIR.exists():
            DIST_DIR.mkdir(parents=True, exist_ok=True)
        os.startfile(str(DIST_DIR))

    def start_build_pipeline(self):
        if self.is_building:
            return

        target_version = self.ver_entry.get().strip()
        if not re.match(r"^\d+\.\d+(\.\d+)?$", target_version):
            self.log(f"[ERROR] Version format '{target_version}' is invalid! E.g. 4.0, 4.1, 5.0, 4.0.0\n")
            return

        self.is_building = True
        self.btn_build.configure(state="disabled", text="⏳  BUILDING & PACKAGING IN PROGRESS...")
        self.status_badge.configure(text="BUILDING", text_color="#007AFF", fg_color="#10254C")

        # Save Version to package.json
        self.save_package_version(target_version)
        self.current_version = target_version
        self.lbl_curr_ver.configure(text=f"(Current: v{self.current_version})")

        target = self.target_var.get()
        threading.Thread(target=self.run_build_thread, args=(target_version, target), daemon=True).start()

    def run_build_thread(self, version: str, target: str):
        try:
            self.log("\n" + "=" * 65 + "\n")
            self.log(f"  STARTING DATAFLOW STUDIO RELEASE BUILD v{version}\n")
            self.log("=" * 65 + "\n\n")

            # 1. Compile Assets & Vite Frontend
            self.log("[1/3] Compiling Frontend (Vite Build)...\n")
            p_vite = subprocess.Popen(
                "npm run build:vite",
                shell=True,
                cwd=str(BASE_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            for line in iter(p_vite.stdout.readline, ""):
                self.log("  " + line)
            p_vite.stdout.close()
            if p_vite.wait() != 0:
                self.log("[ERROR] Vite compilation failed!\n")
                self.after(0, self.finish_build, False)
                return
            self.log("  ✓ Frontend compiled successfully!\n\n")

            # 2. Compile Electron Backend
            self.log("[2/3] Compiling Electron Backend (TypeScript)...\n")
            p_elec = subprocess.Popen(
                "npm run build:electron",
                shell=True,
                cwd=str(BASE_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            for line in iter(p_elec.stdout.readline, ""):
                self.log("  " + line)
            p_elec.stdout.close()
            if p_elec.wait() != 0:
                self.log("[ERROR] Electron compilation failed!\n")
                self.after(0, self.finish_build, False)
                return
            self.log("  ✓ Backend compiled successfully!\n\n")

            # 3. Packaging target
            if target == "all":
                target_args = "--win nsis msi"
            elif target == "exe":
                target_args = "--win nsis"
            else:
                target_args = "--win msi"

            self.log(f"[3/3] Packaging Targets via electron-builder ({target_args})...\n")
            self.log("  (Please wait ~30-60s while NSIS / MSI compresses runtime binary)\n\n")

            # Set FORCE_COLOR=1 and unbuffered execution
            env = os.environ.copy()
            env["FORCE_COLOR"] = "0"
            env["DEBUG"] = "electron-builder"

            self.build_process = subprocess.Popen(
                f"npx electron-builder {target_args}",
                shell=True,
                cwd=str(BASE_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env=env,
            )

            for line in iter(self.build_process.stdout.readline, ""):
                self.log(line)

            self.build_process.stdout.close()
            ret = self.build_process.wait()

            if ret == 0:
                self.log("\n" + "=" * 65 + "\n")
                self.log(f"  ✓ PRODUCTION RELEASE v{version} COMPLETED SUCCESSFULLY!\n")
                self.log(f"  Output Folder: {DIST_DIR}\n")
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
    app = BuildManagerApp()
    app.mainloop()


if __name__ == "__main__":
    main()
