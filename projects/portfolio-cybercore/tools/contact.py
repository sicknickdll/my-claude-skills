"""Tile stills into a labelled contact sheet: python3 -I tools/contact.py <dir> <out.png> [cols] [thumbW]"""
import sys, os, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 640
files = sorted(glob.glob(os.path.join(d, "*.png")), key=lambda f: float(os.path.basename(f)[1:-4]) if os.path.basename(f)[0] == 't' else f)
th = tw * 9 // 16
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * (th + 22)), (40, 40, 40))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((tw, th))
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    sheet.paste(im, (x, y + 22))
    dr.text((x + 6, y + 5), os.path.basename(f), fill=(255, 255, 0))
sheet.save(out)
print(out, sheet.size)
