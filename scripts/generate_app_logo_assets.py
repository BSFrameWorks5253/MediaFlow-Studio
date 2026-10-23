"""
Generate MediaFlow Studio pixel-perfect high-resolution logos, icons, and multi-size ICO files.
Matches the Apple WWDC26 Liquid Glass / Adobe CC Mnemonic Squircle branding used by Tap Studio and Anything.
"""

import os
import sys
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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


def create_high_res_logo(size=1024):
    """
    Renders the Liquid Glass Squircle MediaFlow Studio insignia with supersampled anti-aliasing.
    """
    scale = 2
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = int(canvas_size * 0.03)
    radius = int(canvas_size * 0.24)
    rect_box = [margin, margin, canvas_size - margin, canvas_size - margin]

    # 1. Base Gradient: Deep Sapphire to Neon Electric Cyan
    grad_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(grad_img)

    stops = [
        (0.0, (9, 13, 26)),
        (0.35, (13, 33, 73)),
        (0.70, (0, 102, 238)),
        (1.0, (0, 242, 254)),
    ]

    for y in range(canvas_size):
        for x in range(canvas_size):
            t = (x + y) / (2.0 * canvas_size)
            # Find interpolated color
            for i in range(len(stops) - 1):
                t0, c0 = stops[i]
                t1, c1 = stops[i + 1]
                if t0 <= t <= t1:
                    factor = (t - t0) / (t1 - t0)
                    r = int(c0[0] + factor * (c1[0] - c0[0]))
                    g = int(c0[1] + factor * (c1[1] - c0[1]))
                    b = int(c0[2] + factor * (c1[2] - c0[2]))
                    grad_draw.point((x, y), fill=(r, g, b, 255))
                    break

    # Squircle Mask
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(rect_box, radius=radius, fill=255)

    base = Image.composite(grad_img, Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0)), mask)

    # 2. Specular Top Glass Visor Curve
    glass_visor = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    gv_draw = ImageDraw.Draw(glass_visor)
    # Upper sheen
    h_visor = int(canvas_size * 0.35)
    for y in range(margin, margin + h_visor):
        alpha = int(90 * (1.0 - (y - margin) / float(h_visor)))
        gv_draw.line([(margin, y), (canvas_size - margin, y)], fill=(255, 255, 255, alpha))
    glass_visor = Image.composite(glass_visor, Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0)), mask)
    base = Image.alpha_composite(base, glass_visor)

    # 3. Outer Telemetry Dotted Circle & Inner Refractive Glass Ring
    cx, cy = canvas_size // 2, canvas_size // 2
    r_outer = int(canvas_size * 0.31)
    r_iris = int(canvas_size * 0.24)

    # Inner glass pool
    pool = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    pool_draw = ImageDraw.Draw(pool)
    pool_draw.ellipse([cx - r_iris, cy - r_iris, cx + r_iris, cy + r_iris], fill=(8, 14, 28, 90))
    base = Image.alpha_composite(base, pool)

    overlay = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(overlay)

    # Dotted Outer Tech Ring
    num_dots = 48
    for i in range(num_dots):
        if i % 2 == 0:
            ang1 = (i / num_dots) * 2 * math.pi
            ang2 = ((i + 0.8) / num_dots) * 2 * math.pi
            steps = 8
            for s in range(steps):
                a = ang1 + (ang2 - ang1) * (s / steps)
                px = cx + int(r_outer * math.cos(a))
                py = cy + int(r_outer * math.sin(a))
                o_draw.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(255, 255, 255, 55))

    # Inner Iris Ring Stroke
    ring_width = int(canvas_size * 0.032)
    o_draw.ellipse([cx - r_iris, cy - r_iris, cx + r_iris, cy + r_iris], outline=(0, 242, 254, 230), width=ring_width)
    o_draw.ellipse([cx - r_iris + 2, cy - r_iris + 2, cx + r_iris - 2, cy + r_iris - 2], outline=(255, 255, 255, 140), width=2)

    # Inner Specular High-Precision Rim
    o_draw.rounded_rectangle([margin + 4, margin + 4, canvas_size - margin - 4, canvas_size - margin - 4], radius=radius - 2, outline=(255, 255, 255, 120), width=int(canvas_size * 0.016))

    base = Image.alpha_composite(base, overlay)

    # 4. Adobe Mnemonic Typography "Mf" (MediaFlow Studio)
    text_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(text_layer)

    # Try system fonts
    font_candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    font = None
    font_size = int(canvas_size * 0.35)
    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                font = ImageFont.truetype(fc, font_size)
                break
            except Exception:
                pass

    if not font:
        font = ImageFont.load_default()

    text = "Mf"
    bbox = t_draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw // 2 - bbox[0]
    ty = cy - th // 2 - bbox[1] - int(canvas_size * 0.015)

    # Ambient text shadow
    glow_text = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    gt_draw = ImageDraw.Draw(glow_text)
    gt_draw.text((tx, ty), text, font=font, fill=(0, 242, 254, 180))
    glow_text = glow_text.filter(ImageFilter.GaussianBlur(16))
    base = Image.alpha_composite(base, glow_text)

    # Crisp white text with specular rim
    t_draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    base = Image.alpha_composite(base, text_layer)

    # 5. Glowing Satellites:
    # Top-right cyan satellite
    sat_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    sat_draw = ImageDraw.Draw(sat_layer)

    sx1, sy1 = int(canvas_size * 0.72), int(canvas_size * 0.28)
    r1 = int(canvas_size * 0.045)
    sat_draw.ellipse([sx1 - r1, sy1 - r1, sx1 + r1, sy1 + r1], fill=(0, 242, 254, 255))
    sat_draw.ellipse([sx1 - r1 // 2, sy1 - r1 // 2, sx1 + r1 // 2, sy1 + r1 // 2], fill=(255, 255, 255, 255))

    # Bottom-left violet satellite
    sx2, sy2 = int(canvas_size * 0.28), int(canvas_size * 0.72)
    r2 = int(canvas_size * 0.035)
    sat_draw.ellipse([sx2 - r2, sy2 - r2, sx2 + r2, sy2 + r2], fill=(129, 140, 248, 255))
    sat_draw.ellipse([sx2 - r2 // 2, sy2 - r2 // 2, sx2 + r2 // 2, sy2 + r2 // 2], fill=(255, 255, 255, 255))

    glow_sat = sat_layer.filter(ImageFilter.GaussianBlur(12))
    base = Image.alpha_composite(base, glow_sat)
    base = Image.alpha_composite(base, sat_layer)

    # Downsample using high quality Lanczos filter for razor-sharp antialiasing
    final_img = base.resize((size, size), Image.Resampling.LANCZOS)
    return final_img


def main():
    print("[1/5] Rendering High-Definition 1024x1024 MediaFlow Studio Brand Insignia...")
    logo_1024 = create_high_res_logo(1024)

    # Save PNGs
    print("[2/5] Saving PNG Assets...")
    logo_png_path = os.path.join(ASSETS_DIR, "logo.png")
    icon_png_path = os.path.join(ASSETS_DIR, "icon.png")
    build_icon_png = os.path.join(BUILD_DIR, "icon.png")

    logo_512 = logo_1024.resize((512, 512), Image.Resampling.LANCZOS)
    logo_512.save(logo_png_path, "PNG")
    logo_512.save(icon_png_path, "PNG")
    logo_512.save(build_icon_png, "PNG")
    print(f"  [OK] {logo_png_path}")
    print(f"  [OK] {icon_png_path}")

    # Generate Multi-Resolution ICO files (16, 24, 32, 48, 64, 128, 256)
    print("[3/5] Generating Multi-Resolution ICO files for Windows Executable & Taskbar...")
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

    # Copy to Anything app public folder if it exists
    print("[4/5] Syncing Brand Logo to Anything App Ecosystem...")
    if os.path.exists(ANYTHING_PUBLIC_DIR):
        dest_anything_logo = os.path.join(ANYTHING_PUBLIC_DIR, "mediaflow-studio-logo.png")
        logo_512.save(dest_anything_logo, "PNG")
        print(f"  [OK] Synced to Anything Public Store Assets: {dest_anything_logo}")
    else:
        print("  [INFO] Anything public folder not found at default location.")

    print("[5/5] All MediaFlow Studio Brand Logo Assets Generated Successfully!\n")


if __name__ == "__main__":
    main()
