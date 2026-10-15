"""
Microsoft Store Asset Generator for DataFlow Studio v4.0
Generates:
1. High-Resolution Screenshots (1920x1080) for all key application views using Edge headless.
2. Official Store Tile & Logo Assets (300x300, 150x150, 71x71, 50x50, 44x44).
3. Professional Promotional Banners:
   - Poster Art (2400x1200)
   - Super Hero Art (1920x1080)
   - Square Promotional (1080x1080)
   - Wide Promotional (1200x600)
   - Splash Screen (1240x600)
"""

import os
import shutil
import http.server
import socketserver
import threading
import subprocess
import time
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_BASE = os.path.join(ROOT_DIR, "microsoft_store_assets", "images")
LOGOS_DIR = os.path.join(OUTPUT_BASE, "logos")
PROMO_DIR = os.path.join(OUTPUT_BASE, "promotional")
SHOTS_DIR = os.path.join(OUTPUT_BASE, "screenshots")
DIST_DIR = os.path.join(ROOT_DIR, "dist")
ICON_PATH = os.path.join(ROOT_DIR, "public", "assets", "icon.png")

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_REGULAR = r"C:\Windows\Fonts\segoeui.ttf"
FONT_SEMI = r"C:\Windows\Fonts\segoeuisl.ttf"

def ensure_dirs():
    for d in [LOGOS_DIR, PROMO_DIR, SHOTS_DIR]:
        os.makedirs(d, exist_ok=True)

def generate_store_logos():
    print("[1/3] Generating Microsoft Store Logos and App Tiles...")
    sizes = {
        "StoreLogo_300x300.png": (300, 300),
        "Square150x150Logo.png": (150, 150),
        "Square71x71Logo.png": (71, 71),
        "Square50x50Logo.png": (50, 50),
        "Square44x44Logo.png": (44, 44),
    }
    
    icon_src = Image.open(ICON_PATH).convert("RGBA")
    
    for filename, (w, h) in sizes.items():
        out_path = os.path.join(LOGOS_DIR, filename)
        # Create tile with transparent or crisp background
        # Microsoft store square tiles: subtle corner rounding or full bleed
        tile = icon_src.resize((w, h), Image.Resampling.LANCZOS)
        tile.save(out_path, "PNG")
        print(f"  -> Generated {filename} ({w}x{h})")

def generate_promotional_art():
    print("[2/3] Generating Microsoft Store Promotional Art & Hero Banners...")
    icon_src = Image.open(ICON_PATH).convert("RGBA")

    # 1. Poster Art (2400 x 1200) - Primary Featured Banner
    poster_w, poster_h = 2400, 1200
    poster = Image.new("RGBA", (poster_w, poster_h), (8, 10, 16, 255))
    draw = ImageDraw.Draw(poster)

    # Gradient background
    for y in range(poster_h):
        t = y / float(poster_h)
        r = int(10 * (1 - t) + 16 * t)
        g = int(14 * (1 - t) + 24 * t)
        b = int(24 * (1 - t) + 40 * t)
        draw.line([(0, y), (poster_w, y)], fill=(r, g, b, 255))

    # Ambient Glows
    glow_cyan = Image.new("RGBA", (poster_w, poster_h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_cyan)
    g_draw.ellipse([300, 150, 1100, 950], fill=(0, 229, 255, 35))
    g_draw.ellipse([1400, 200, 2200, 1000], fill=(124, 58, 237, 30))
    glow_cyan = glow_cyan.filter(ImageFilter.GaussianBlur(80))
    poster = Image.alpha_composite(poster, glow_cyan)
    draw = ImageDraw.Draw(poster)

    # Logo Emblem
    logo_sz = 340
    logo_resized = icon_src.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
    mask = Image.new("L", (logo_sz, logo_sz), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, logo_sz, logo_sz], radius=68, fill=255)
    
    # Logo border glow
    border_img = Image.new("RGBA", (logo_sz + 12, logo_sz + 12), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_img)
    b_draw.rounded_rectangle([0, 0, logo_sz + 12, logo_sz + 12], radius=72, outline=(0, 229, 255, 180), width=3)
    poster.paste(border_img, (394, 344), border_img)
    poster.paste(logo_resized, (400, 350), mask)

    # Title & Text
    font_hero = ImageFont.truetype(FONT_BOLD, 76)
    font_sub = ImageFont.truetype(FONT_REGULAR, 34)
    font_badge = ImageFont.truetype(FONT_BOLD, 26)
    font_features = ImageFont.truetype(FONT_REGULAR, 26)
    font_brand = ImageFont.truetype(FONT_SEMI, 22)

    tx = 820
    draw.text((tx, 350), "MEDIAFLOW STUDIO", font=font_hero, fill=(255, 255, 255))
    
    # Version Badge
    badge_text = "VERSION 4.0 PRO"
    bb = draw.textbbox((0, 0), badge_text, font=font_badge)
    bw = bb[2] - bb[0] + 32
    draw.rounded_rectangle([tx, 450, tx + bw, 496], radius=23, fill=(16, 44, 76), outline=(0, 229, 255), width=2)
    draw.text((tx + 16, 458), badge_text, font=font_badge, fill=(0, 235, 255))

    draw.text((tx + bw + 24, 458), "Professional Creative Liquid Suite", font=font_sub, fill=(200, 215, 235))

    draw.text((tx, 520), "High-Speed Media Ingestion, Synchronization & Excel Fusion Suite", font=font_sub, fill=(160, 180, 210))

    # Feature checklist pills
    pills = [
        "⚡ 32-Thread Instant Atomic Renaming",
        "🎬 Multi-Camera Sync & Video Ingestion",
        "📊 Python openpyxl Deep Style Cloning",
        "🛡️ Zero Cloud Lock-In & Total Privacy"
    ]
    py = 600
    for p in pills:
        draw.text((tx, py), p, font=font_features, fill=(215, 230, 245))
        py += 46

    draw.text((tx, 830), "Engineered for High-Performance Production Workflows • BSFrameWorks", font=font_brand, fill=(130, 150, 180))

    poster.convert("RGB").save(os.path.join(PROMO_DIR, "PosterArt_2400x1200.png"), "PNG")
    print("  -> Generated PosterArt_2400x1200.png")

    # 2. Super Hero Art (1920 x 1080) - 16:9 Hero Banner
    hero_w, hero_h = 1920, 1080
    hero = Image.new("RGBA", (hero_w, hero_h), (9, 12, 19, 255))
    h_draw = ImageDraw.Draw(hero)
    for y in range(hero_h):
        t = y / float(hero_h)
        r = int(10 * (1 - t) + 18 * t)
        g = int(14 * (1 - t) + 26 * t)
        b = int(24 * (1 - t) + 42 * t)
        h_draw.line([(0, y), (hero_w, y)], fill=(r, g, b, 255))

    # Glows
    glow_h = Image.new("RGBA", (hero_w, hero_h), (0, 0, 0, 0))
    gh_draw = ImageDraw.Draw(glow_h)
    gh_draw.ellipse([200, 150, 900, 850], fill=(0, 229, 255, 40))
    gh_draw.ellipse([1000, 200, 1800, 900], fill=(139, 92, 246, 30))
    glow_h = glow_h.filter(ImageFilter.GaussianBlur(70))
    hero = Image.alpha_composite(hero, glow_h)
    h_draw = ImageDraw.Draw(hero)

    # Logo
    l_sz = 260
    l_res = icon_src.resize((l_sz, l_sz), Image.Resampling.LANCZOS)
    l_mask = Image.new("L", (l_sz, l_sz), 0)
    ImageDraw.Draw(l_mask).rounded_rectangle([0, 0, l_sz, l_sz], radius=52, fill=255)
    hero.paste(l_res, (220, 380), l_mask)

    # Texts
    font_h_hero = ImageFont.truetype(FONT_BOLD, 64)
    font_h_sub = ImageFont.truetype(FONT_REGULAR, 26)
    font_h_badge = ImageFont.truetype(FONT_BOLD, 22)
    font_h_feat = ImageFont.truetype(FONT_REGULAR, 22)

    htx = 540
    h_draw.text((htx, 375), "MEDIAFLOW STUDIO v4.0", font=font_h_hero, fill=(255, 255, 255))
    
    h_badge = "CREATIVE LIQUID SUITE"
    hbb = h_draw.textbbox((0, 0), h_badge, font=font_h_badge)
    hbw = hbb[2] - hbb[0] + 28
    h_draw.rounded_rectangle([htx, 460, htx + hbw, 498], radius=19, fill=(14, 40, 70), outline=(0, 229, 255), width=2)
    h_draw.text((htx + 14, 467), h_badge, font=font_h_badge, fill=(0, 235, 255))
    h_draw.text((htx + hbw + 20, 467), "Media Ingestion, Sync & Report Fusion", font=font_h_sub, fill=(200, 215, 235))

    feats_h = [
        "✓ Stage-by-Stage Media Processing Pipeline",
        "✓ High-Throughput 8MB Cross-Drive Transfer Engine",
        "✓ Automated Multi-Sheet Excel Manifest Fusion",
        "✓ Built for Windows 10 & 11 with High-DPI Support"
    ]
    fhy = 525
    for fh in feats_h:
        h_draw.text((htx, fhy), fh, font=font_h_feat, fill=(210, 225, 240))
        fhy += 38

    hero.convert("RGB").save(os.path.join(PROMO_DIR, "SuperHeroArt_1920x1080.png"), "PNG")
    print("  -> Generated SuperHeroArt_1920x1080.png")

    # 3. Square Promotional Art (1080 x 1080)
    sq_w, sq_h = 1080, 1080
    sq = Image.new("RGBA", (sq_w, sq_h), (9, 12, 19, 255))
    sq_draw = ImageDraw.Draw(sq)
    for y in range(sq_h):
        t = y / float(sq_h)
        r = int(10 * (1 - t) + 18 * t)
        g = int(14 * (1 - t) + 26 * t)
        b = int(24 * (1 - t) + 42 * t)
        sq_draw.line([(0, y), (sq_w, y)], fill=(r, g, b, 255))

    sq_glow = Image.new("RGBA", (sq_w, sq_h), (0, 0, 0, 0))
    sq_gdraw = ImageDraw.Draw(sq_glow)
    sq_gdraw.ellipse([240, 180, 840, 780], fill=(0, 229, 255, 45))
    sq_glow = sq_glow.filter(ImageFilter.GaussianBlur(60))
    sq = Image.alpha_composite(sq, sq_glow)
    sq_draw = ImageDraw.Draw(sq)

    sq_logo_sz = 340
    sq_logo = icon_src.resize((sq_logo_sz, sq_logo_sz), Image.Resampling.LANCZOS)
    sq_mask = Image.new("L", (sq_logo_sz, sq_logo_sz), 0)
    ImageDraw.Draw(sq_mask).rounded_rectangle([0, 0, sq_logo_sz, sq_logo_sz], radius=68, fill=255)
    sq.paste(sq_logo, ((sq_w - sq_logo_sz) // 2, 230), sq_mask)

    font_sq_title = ImageFont.truetype(FONT_BOLD, 52)
    font_sq_sub = ImageFont.truetype(FONT_REGULAR, 26)
    font_sq_badge = ImageFont.truetype(FONT_BOLD, 22)

    st_text = "MEDIAFLOW STUDIO"
    stb = sq_draw.textbbox((0, 0), st_text, font=font_sq_title)
    sq_draw.text(((sq_w - (stb[2] - stb[0])) // 2, 620), st_text, font=font_sq_title, fill=(255, 255, 255))

    sbg_text = "VERSION 4.0 PRO"
    sbb = sq_draw.textbbox((0, 0), sbg_text, font=font_sq_badge)
    sbw = sbb[2] - sbb[0] + 28
    sbx = (sq_w - sbw) // 2
    sq_draw.rounded_rectangle([sbx, 690, sbx + sbw, 730], radius=20, fill=(14, 40, 70), outline=(0, 229, 255), width=2)
    sq_draw.text((sbx + 14, 698), sbg_text, font=font_sq_badge, fill=(0, 235, 255))

    ssub_text = "Media Ingestion & Sync Suite"
    ssb = sq_draw.textbbox((0, 0), ssub_text, font=font_sq_sub)
    sq_draw.text(((sq_w - (ssb[2] - ssb[0])) // 2, 755), ssub_text, font=font_sq_sub, fill=(185, 205, 230))

    sc_text = "BSFrameWorks"
    scb = sq_draw.textbbox((0, 0), sc_text, font=font_sq_sub)
    sq_draw.text(((sq_w - (scb[2] - scb[0])) // 2, 810), sc_text, font=font_sq_sub, fill=(120, 140, 170))

    sq.convert("RGB").save(os.path.join(PROMO_DIR, "SquarePromotional_1080x1080.png"), "PNG")
    print("  -> Generated SquarePromotional_1080x1080.png")

    # 4. Wide Promotional Banner (1200 x 600)
    wb_w, wb_h = 1200, 600
    wb = Image.new("RGBA", (wb_w, wb_h), (9, 12, 19, 255))
    wb_draw = ImageDraw.Draw(wb)
    for y in range(wb_h):
        t = y / float(wb_h)
        r = int(10 * (1 - t) + 18 * t)
        g = int(14 * (1 - t) + 26 * t)
        b = int(24 * (1 - t) + 42 * t)
        wb_draw.line([(0, y), (wb_w, y)], fill=(r, g, b, 255))

    wb_glow = Image.new("RGBA", (wb_w, wb_h), (0, 0, 0, 0))
    wb_gdraw = ImageDraw.Draw(wb_glow)
    wb_gdraw.ellipse([100, 80, 500, 480], fill=(0, 229, 255, 40))
    wb_glow = wb_glow.filter(ImageFilter.GaussianBlur(50))
    wb = Image.alpha_composite(wb, wb_glow)
    wb_draw = ImageDraw.Draw(wb)

    wb_logo_sz = 190
    wb_logo = icon_src.resize((wb_logo_sz, wb_logo_sz), Image.Resampling.LANCZOS)
    wb_mask = Image.new("L", (wb_logo_sz, wb_logo_sz), 0)
    ImageDraw.Draw(wb_mask).rounded_rectangle([0, 0, wb_logo_sz, wb_logo_sz], radius=38, fill=255)
    wb.paste(wb_logo, (120, (wb_h - wb_logo_sz) // 2), wb_mask)

    font_wb_title = ImageFont.truetype(FONT_BOLD, 46)
    font_wb_sub = ImageFont.truetype(FONT_REGULAR, 22)
    font_wb_badge = ImageFont.truetype(FONT_BOLD, 18)

    wtx = 360
    wb_draw.text((wtx, 190), "MEDIAFLOW STUDIO v4.0", font=font_wb_title, fill=(255, 255, 255))
    
    wb_badge = "PRODUCTION DESKTOP SUITE"
    wbb = wb_draw.textbbox((0, 0), wb_badge, font=font_wb_badge)
    wbw = wbb[2] - wbb[0] + 20
    wb_draw.rounded_rectangle([wtx, 260, wtx + wbw, 292], radius=16, fill=(14, 40, 70), outline=(0, 229, 255), width=2)
    wb_draw.text((wtx + 10, 266), wb_badge, font=font_wb_badge, fill=(0, 235, 255))

    wb_draw.text((wtx, 315), "Professional Ingestion, Synchronization & Fusion", font=font_wb_sub, fill=(190, 210, 235))
    wb_draw.text((wtx, 355), "BSFrameWorks • Windows 10 & 11 Certified", font=font_wb_sub, fill=(120, 140, 170))

    wb.convert("RGB").save(os.path.join(PROMO_DIR, "WideBanner_1200x600.png"), "PNG")
    print("  -> Generated WideBanner_1200x600.png")

    # 5. Splash Screen (1240 x 600)
    sp_w, sp_h = 1240, 600
    sp = Image.new("RGBA", (sp_w, sp_h), (8, 9, 14, 255))
    sp_draw = ImageDraw.Draw(sp)
    
    # Ambient centered glow
    sp_glow = Image.new("RGBA", (sp_w, sp_h), (0, 0, 0, 0))
    sp_gdraw = ImageDraw.Draw(sp_glow)
    sp_gdraw.ellipse([sp_w // 2 - 200, sp_h // 2 - 200, sp_w // 2 + 200, sp_h // 2 + 200], fill=(0, 229, 255, 30))
    sp_glow = sp_glow.filter(ImageFilter.GaussianBlur(60))
    sp = Image.alpha_composite(sp, sp_glow)
    sp_draw = ImageDraw.Draw(sp)

    sp_logo_sz = 160
    sp_logo = icon_src.resize((sp_logo_sz, sp_logo_sz), Image.Resampling.LANCZOS)
    sp_mask = Image.new("L", (sp_logo_sz, sp_logo_sz), 0)
    ImageDraw.Draw(sp_mask).rounded_rectangle([0, 0, sp_logo_sz, sp_logo_sz], radius=32, fill=255)
    sp.paste(sp_logo, ((sp_w - sp_logo_sz) // 2, 170), sp_mask)

    font_sp_title = ImageFont.truetype(FONT_BOLD, 36)
    font_sp_sub = ImageFont.truetype(FONT_REGULAR, 18)

    sp_t = "MEDIAFLOW STUDIO v4.0"
    sptb = sp_draw.textbbox((0, 0), sp_t, font=font_sp_title)
    sp_draw.text(((sp_w - (sptb[2] - sptb[0])) // 2, 360), sp_t, font=font_sp_title, fill=(255, 255, 255))

    sp_s = "Creative Liquid Production Suite"
    spsb = sp_draw.textbbox((0, 0), sp_s, font=font_sp_sub)
    sp_draw.text(((sp_w - (spsb[2] - spsb[0])) // 2, 415), sp_s, font=font_sp_sub, fill=(140, 160, 190))

    sp.convert("RGB").save(os.path.join(PROMO_DIR, "SplashScreen_1240x600.png"), "PNG")
    print("  -> Generated SplashScreen_1240x600.png")

def capture_screenshots():
    print("[3/3] Capturing 1920x1080 Microsoft Store Screenshots via Edge headless...")
    
    port = 5994
    handler = lambda *args: http.server.SimpleHTTPRequestHandler(*args, directory=DIST_DIR)
    server = socketserver.TCPServer(("127.0.0.1", port), handler)
    srv_thread = threading.Thread(target=server.serve_forever)
    srv_thread.daemon = True
    srv_thread.start()

    pages = [
        ("Screenshot_1_Workspace_Overview.png", "/?theme=light&demo=true&page=overview"),
        ("Screenshot_2_PVSeparator_Engine.png", "/?theme=light&demo=true&page=pvSeparator"),
        ("Screenshot_3_Upload_Folder_Generator.png", "/?theme=light&demo=true&page=uploadStructure"),
        ("Screenshot_4_Photo_Status_Tagger.png", "/?theme=light&demo=true&page=photoMatcher"),
        ("Screenshot_5_MultiCamera_Video_Transfer.png", "/?theme=light&demo=true&page=videoTransfer"),
        ("Screenshot_6_Event_Image_Distributor.png", "/?theme=light&demo=true&page=eventDistributor"),
        ("Screenshot_7_DoNotUpload_Isolator.png", "/?theme=light&demo=true&page=doNotUpload"),
        ("Screenshot_8_Excel_Report_Merger.png", "/?theme=light&demo=true&page=excelMerger"),
        ("Screenshot_9_Standalone_Production_Tools.png", "/?theme=light&demo=true&page=tools"),
        ("Screenshot_10_Hardware_Concurrency_Preferences.png", "/?theme=light&demo=true&page=overview&settings=true"),
    ]

    for filename, query_path in pages:
        out_file = os.path.join(SHOTS_DIR, filename)
        url = f"http://127.0.0.1:{port}{query_path}"
        cmd = [
            EDGE_PATH,
            "--headless=new",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=1920,1080",
            "--virtual-time-budget=2500",
            f"--screenshot={out_file}",
            url
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True)
            if os.path.exists(out_file):
                print(f"  -> Captured {filename} ({os.path.getsize(out_file):,} bytes)")
            else:
                print(f"  -> [WARN] File not found for {filename}")
        except Exception as e:
            print(f"  -> [ERROR] Failed to capture {filename}: {e}")

    server.shutdown()
    print("[OK] All screenshots captured successfully!")

def main():
    ensure_dirs()
    generate_store_logos()
    generate_promotional_art()
    capture_screenshots()
    print("\n[COMPLETE] All Microsoft Store graphics successfully generated!")

if __name__ == "__main__":
    main()
