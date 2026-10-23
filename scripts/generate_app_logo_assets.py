"""
Generate MediaFlow Studio flat background Adobe CC-style insignia ("Ms").
Clean, iconic, non-flashy squircle with flat background matching Anything App.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT_DIR, "public", "assets")
BUILD_DIR = os.path.join(ROOT_DIR, "build")
ANYTHING_PUBLIC_DIR = r"C:\Users\Burhanuddin\OneDrive\Desktop\New folder (2)\Anything\public"

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(BUILD_DIR, exist_ok=True)


def create_flat_logo(size=1024):
    """
    Renders the clean, flat squircle with 'Ms' written, exactly like Anything app's logo.
    """
    scale = 2
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Flat solid background: Royal Blue #0066EE (or Adobe-style)
    bg_color = (0, 102, 238, 255)
    radius = int(canvas_size * 0.20)

    # Draw rounded squircle
    draw.rounded_rectangle([0, 0, canvas_size, canvas_size], radius=radius, fill=bg_color)

    # Font setup for "Ms"
    font_candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    font = None
    font_size = int(canvas_size * 0.50)
    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                font = ImageFont.truetype(fc, font_size)
                break
            except Exception:
                pass

    if not font:
        font = ImageFont.load_default()

    text = "Ms"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (canvas_size - tw) // 2 - bbox[0]
    ty = (canvas_size - th) // 2 - bbox[1] - int(canvas_size * 0.02)

    # Crisp pure white text
    draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))

    # Downsample with Lanczos for razor-sharp antialiased edges
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img


def main():
    print("[1/4] Rendering Clean Flat Background 'Ms' Insignia (1024x1024)...")
    logo_1024 = create_flat_logo(1024)

    # Save PNGs
    print("[2/4] Saving PNG Assets...")
    logo_png_path = os.path.join(ASSETS_DIR, "logo.png")
    icon_png_path = os.path.join(ASSETS_DIR, "icon.png")
    build_icon_png = os.path.join(BUILD_DIR, "icon.png")

    logo_512 = logo_1024.resize((512, 512), Image.Resampling.LANCZOS)
    logo_512.save(logo_png_path, "PNG")
    logo_512.save(icon_png_path, "PNG")
    logo_512.save(build_icon_png, "PNG")
    print(f"  [OK] {logo_png_path}")
    print(f"  [OK] {icon_png_path}")

    # Generate Multi-Resolution ICO files (256 first for electron-builder)
    print("[3/4] Generating Multi-Resolution ICO files for Windows...")
    app_ico_path = os.path.join(ASSETS_DIR, "app.ico")
    icon_ico_path = os.path.join(ASSETS_DIR, "icon.ico")
    build_ico_path = os.path.join(BUILD_DIR, "icon.ico")

    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
    icon_images = [logo_1024.resize(s, Image.Resampling.LANCZOS) for s in sizes]

    icon_images[0].save(app_ico_path, format="ICO", sizes=sizes, append_images=icon_images[1:])
    icon_images[0].save(icon_ico_path, format="ICO", sizes=sizes, append_images=icon_images[1:])
    icon_images[0].save(build_ico_path, format="ICO", sizes=sizes, append_images=icon_images[1:])
    print(f"  [OK] {app_ico_path}")
    print(f"  [OK] {icon_ico_path}")
    print(f"  [OK] {build_ico_path}")

    # Sync to Anything app public assets
    print("[4/4] Syncing Flat 'Ms' Brand Logo to Anything App...")
    if os.path.exists(ANYTHING_PUBLIC_DIR):
        dest_anything_logo = os.path.join(ANYTHING_PUBLIC_DIR, "mediaflow-studio-logo.png")
        logo_512.save(dest_anything_logo, "PNG")
        print(f"  [OK] Synced to Anything Public Store Assets: {dest_anything_logo}")

    print("[SUCCESS] All Flat 'Ms' Assets Generated Successfully!\n")


if __name__ == "__main__":
    main()
