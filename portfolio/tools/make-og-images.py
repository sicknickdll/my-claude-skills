"""Creates 1200x630 link-preview images (assets/og/<id>.jpg) from each project cover.

Usage: python3 tools/make-og-images.py   (needs Pillow: pip install pillow)
Only creates missing images; delete one to regenerate it.
"""
import json, pathlib, re, subprocess
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
# Read project ids/covers from js/data.js via Node so there's one source of truth.
data = json.loads(subprocess.check_output(
    ["node", "--input-type=module", "-e",
     "import('" + (root / "js/data.js").as_uri() + "').then(m=>console.log(JSON.stringify(m.projects.map(p=>({id:p.id,cover:p.cover})))))"]))
W, H = 1200, 630
for p in data:
    out = root / "assets/og" / f"{p['id']}.jpg"
    if out.exists():
        continue
    im = Image.open(root / p["cover"].lstrip("/")).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - W) // 2, (im.height - H) // 2
    im.crop((left, top, left + W, top + H)).save(out, quality=84, optimize=True, progressive=True)
    print("created", out.relative_to(root))
