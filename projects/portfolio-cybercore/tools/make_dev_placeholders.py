"""Throwaway placeholder assets for exercising the pipeline before the real site content is available."""
from PIL import Image, ImageDraw, ImageFilter
import json, math
D = "src/dev"
W, H = 1600, 1000
img = Image.new("RGB", (W, H), (34, 30, 40))
d = ImageDraw.Draw(img)
cx, cy = 800, 520
for r in range(260, 0, -2):                     # iris gradient
    k = r / 260
    d.ellipse([cx - r, cy - r * 1.08, cx + r, cy + r * 1.08], fill=(int(40 + 200 * (1 - k) ** 0.5 * 0.4), int(20 + 60 * k), int(90 + 140 * k)))
d.ellipse([cx - 95, cy - 105, cx + 95, cy + 105], fill=(5, 5, 8))
d.ellipse([cx - 150, cy - 190, cx - 60, cy - 100], fill=(255, 255, 255))
d.ellipse([cx + 90, cy + 80, cx + 130, cy + 120], fill=(230, 230, 255))
img = img.filter(ImageFilter.GaussianBlur(1.2))
img.save(f"{D}/eye.png")
for i in range(4):
    p = Image.new("RGB", (1600, 1000), (40 + i * 20, 40 + i * 10, 50))
    dd = ImageDraw.Draw(p)
    for x in range(0, 1600, 80): dd.line([(x, 0), (x, 1000)], fill=(70, 70, 80), width=1)
    dd.text((80, 80), f"PLACEHOLDER PROJECT {i+1}", fill=(200, 200, 200))
    p.save(f"{D}/p{i}.png")
h = Image.new("RGB", (1600, 900), (230, 230, 230)); ImageDraw.Draw(h).text((80, 80), "PLACEHOLDER HERO", fill=(0, 0, 0)); h.save(f"{D}/hero.png")
json.dump({
    "accent": "#FF1E3C",
    "nameLines": ["PLACEHOLDER", "NAME"], "nameKana": "プレースホルダー", "role": "PLACEHOLDER ROLE",
    "url": "nicololombardi.framer.website",
    "eye": {"src": "dev/eye.png", "pupil": [0.5, 0.52], "pupilR": 0.06, "halfWidth": 0.27, "lidUp": 0.2, "lidDown": 0.17, "tilt": 0.04, "fit": 1.0},
    "hero": {"src": "dev/hero.png"},
    "projects": [{"title": f"Project {i+1}", "year": "2026", "tag": "placeholder", "img": f"dev/p{i}.png"} for i in range(4)],
    "stack": ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"],
}, open(f"{D}/content.json", "w"), indent=1)
