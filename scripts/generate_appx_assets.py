#!/usr/bin/env python3
"""
Generate Microsoft Store Windows 10/11 AppX / MSIX Visual Tile Assets (Blueprint 06).
Derived from public/assets/icon.png and saved into build/appx/
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw

ROOT_DIR = Path(__file__).resolve().parent.parent
SOURCE_ICON = ROOT_DIR / "public" / "assets" / "icon.png"
OUTPUT_DIR = ROOT_DIR / "build" / "appx"

ASSET_SPECS = [
    ("Square44x44Logo.png", 44, 44, 0.70),      # Taskbar & app list
    ("Square71x71Logo.png", 71, 71, 0.65),      # Small Start menu tile
    ("Square150x150Logo.png", 150, 150, 0.60),  # Medium Start menu tile (Mandatory)
    ("Square310x310Logo.png", 310, 310, 0.55),  # Large Start menu tile
    ("Wide310x150Logo.png", 310, 150, 0.55),    # Wide Start menu tile (Mandatory)
    ("StoreLogo.png", 50, 50, 0.75),            # Store listing icon (Mandatory)
    ("SplashScreen.png", 620, 300, 0.45),       # Launch splash screen
    ("BadgeLogo.png", 24, 24, 0.80),            # Lock screen badge
]

BG_COLOR = (7, 8, 13, 255) # Sleek Dark Cyber Backdrop (#07080D)

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not SOURCE_ICON.exists():
        print(f"[ERROR] Source icon not found at {SOURCE_ICON}")
        return

    src_img = Image.open(SOURCE_ICON).convert("RGBA")
    print(f"[APPX_ASSETS] Loaded source icon: {SOURCE_ICON} ({src_img.size})")

    for filename, width, height, scale in ASSET_SPECS:
        target_path = OUTPUT_DIR / filename
        
        # Transparent or dark base
        if "BadgeLogo" in filename:
            # Badge logos should be transparent white/alpha
            canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        elif "SplashScreen" in filename:
            canvas = Image.new("RGBA", (width, height), BG_COLOR)
        else:
            canvas = Image.new("RGBA", (width, height), BG_COLOR)

        # Scale source icon maintaining aspect ratio
        icon_max_dim = int(min(width, height) * scale)
        icon_resized = src_img.resize((icon_max_dim, icon_max_dim), Image.Resampling.LANCZOS)

        # Center inside canvas
        offset_x = (width - icon_max_dim) // 2
        offset_y = (height - icon_max_dim) // 2

        canvas.paste(icon_resized, (offset_x, offset_y), icon_resized)
        canvas.save(target_path, "PNG")
        print(f"  [OK] Generated: {filename} ({width}x{height}px)")

    print(f"[SUCCESS] All 8 Microsoft Store MSIX assets created in {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
