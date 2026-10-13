"""Generates brand/paper.jpg - warm cream paper with fibre grain and a soft vignette."""
import numpy as np
from PIL import Image, ImageFilter
W, H = 1080, 1920
rng = np.random.default_rng(3)
base = np.array([0xEF, 0xE6, 0xD3], float)
fine = rng.normal(0, 1, (H, W))
coarse = np.array(Image.fromarray((rng.normal(0, 1, (H // 8, W // 8)) * 40 + 128).clip(0, 255).astype("uint8")).resize((W, H), Image.BICUBIC), float) - 128
fibres = np.array(Image.fromarray((rng.normal(0, 1, (H, W)) * 60 + 128).clip(0, 255).astype("uint8")).filter(ImageFilter.BoxBlur(1)).resize((W, H)), float) - 128
y, x = np.mgrid[0:H, 0:W]
vig = 1 - 0.06 * (((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
shade = (fine * 3 + coarse * 0.10 + fibres * 0.04)
img = (base[None, None, :] * vig[..., None] + shade[..., None]).clip(0, 255).astype("uint8")
Image.fromarray(img).save("paper.jpg", quality=88)
