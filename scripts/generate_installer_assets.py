"""
Asset generator for DataFlow Studio Professional Windows Installer (NSIS).
Generates pixel-perfect 24-bit BMP assets:
- installerSidebar.bmp (164 x 314 px)
- installerHeader.bmp (150 x 57 px)
- uninstallerSidebar.bmp (164 x 314 px)
"""

import os
import shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD_DIR = os.path.join(ROOT_DIR, "build")
ASSETS_DIR = os.path.join(ROOT_DIR, "public", "assets")
ICON_PATH = os.path.join(ASSETS_DIR, "icon.png")

def generate_sidebar(out_path):
    w, h = 164, 314
    # Deep obsidian-navy gradient
    base = Image.new("RGB", (w, h), (11, 16, 27))
    draw = ImageDraw.Draw(base)
    for y in range(h):
        t = y / float(h)
        r = int(14 * (1 - t) + 7 * t)
        g = int(22 * (1 - t) + 10 * t)
        b = int(38 * (1 - t) + 16 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Ambient radial cyan glow around logo center
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = w // 2, 95
    for radius in range(70, 0, -2):
        alpha = int(45 * (1 - radius / 70.0))
        glow_draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(0, 210, 255, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(base)

    # Place Logo (size 72x72 with rounded corners and border)
    logo_src = Image.open(ICON_PATH).convert("RGBA")
    logo_size = 72
    logo_src = logo_src.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, logo_size, logo_size], radius=16, fill=255)

    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    lx = (w - logo_size) // 2
    ly = cy - logo_size // 2
    s_draw.rounded_rectangle([lx - 1, ly - 1, lx + logo_size + 1, ly + logo_size + 1], radius=17, outline=(0, 210, 255, 140), width=1)
    base = Image.alpha_composite(base.convert("RGBA"), shadow)
    base.paste(logo_src, (lx, ly), mask)
    draw = ImageDraw.Draw(base)

    # Fonts
    font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 13)
    font_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 9)
    font_ver = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 10)
    font_comp = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 8)

    # Title
    t_text = "DATAFLOW STUDIO"
    tb = draw.textbbox((0, 0), t_text, font=font_bold)
    tw = tb[2] - tb[0]
    draw.text(((w - tw) // 2, 155), t_text, font=font_bold, fill=(255, 255, 255))

    # Version pill / badge
    v_text = "VERSION 4.0 PRO"
    vb = draw.textbbox((0, 0), v_text, font=font_ver)
    vw = vb[2] - vb[0]
    badge_w = vw + 14
    badge_h = 18
    bx = (w - badge_w) // 2
    by = 176
    draw.rounded_rectangle([bx, by, bx + badge_w, by + badge_h], radius=9, fill=(16, 36, 60), outline=(0, 210, 255), width=1)
    draw.text((bx + 7, by + 2), v_text, font=font_ver, fill=(0, 240, 255))

    # Subtitle
    s_text = "Media Synchronization Suite"
    sb = draw.textbbox((0, 0), s_text, font=font_sub)
    sw = sb[2] - sb[0]
    draw.text(((w - sw) // 2, 204), s_text, font=font_sub, fill=(160, 175, 200))

    # Accent decorative line
    draw.line([(32, 226), (w - 32, 226)], fill=(30, 48, 75), width=1)

    # Features / Highlights in sidebar
    feats = ["Dual-Channel Sync", "Instant Atomic Engine", "Studio-Grade Reports"]
    fy = 236
    for f in feats:
        draw.text((24, fy), "•", font=font_sub, fill=(0, 210, 255))
        draw.text((34, fy), f, font=font_sub, fill=(185, 195, 215))
        fy += 14

    # Company at bottom
    c_text = "BSFrameWorks"
    cb = draw.textbbox((0, 0), c_text, font=font_comp)
    cw = cb[2] - cb[0]
    draw.text(((w - cw) // 2, 296), c_text, font=font_comp, fill=(100, 115, 140))

    base = base.convert("RGB")
    base.save(out_path, "BMP")

def generate_header(out_path):
    w, h = 150, 57
    base = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(base)

    logo_src = Image.open(ICON_PATH).convert("RGBA")
    logo_size = 42
    logo_src = logo_src.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, logo_size, logo_size], radius=10, fill=255)

    lx = w - logo_size - 12
    ly = (h - logo_size) // 2

    shadow = Image.new("RGBA", (logo_size + 4, logo_size + 4), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([2, 2, logo_size + 2, logo_size + 2], radius=10, fill=(0, 0, 0, 40))
    base_rgba = base.convert("RGBA")
    base_rgba.paste(shadow, (lx - 2, ly - 1), shadow)
    base_rgba.paste(logo_src, (lx, ly), mask)

    font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 10)
    font_ver = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 8)
    draw_rgba = ImageDraw.Draw(base_rgba)
    draw_rgba.text((lx - 72, 16), "DATAFLOW", font=font_bold, fill=(30, 41, 59))
    draw_rgba.text((lx - 72, 30), "STUDIO 4.0", font=font_ver, fill=(100, 116, 139))

    base = base_rgba.convert("RGB")
    base.save(out_path, "BMP")

def main():
    os.makedirs(BUILD_DIR, exist_ok=True)
    sidebar_path = os.path.join(BUILD_DIR, "installerSidebar.bmp")
    uninstaller_path = os.path.join(BUILD_DIR, "uninstallerSidebar.bmp")
    header_path = os.path.join(BUILD_DIR, "installerHeader.bmp")

    generate_sidebar(sidebar_path)
    generate_header(header_path)
    shutil.copyfile(sidebar_path, uninstaller_path)
    print(f"[OK] Generated installer graphics in {BUILD_DIR}")

if __name__ == "__main__":
    main()
