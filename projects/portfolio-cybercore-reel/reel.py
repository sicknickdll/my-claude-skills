#!/usr/bin/env python3
"""Compositor for the Nicolo Lombardi cybercore reel (see STORYBOARD.md).

Every output frame is a pure function of its index: nothing is carried from
one frame to the next and every random choice is seeded from the frame or the
shot, so any single frame can be rendered on its own for review and the full
render runs in parallel.

usage:
  reel.py prep                  extract the clip segments the edit uses
  reel.py still <frame> ...     render single frames to $OUT/stills
  reel.py beats                 one still per beat + a contact sheet
  reel.py render                every frame + the music -> $OUT/reel.mp4
"""
import math
import os
import subprocess
import sys
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

cv2.setNumThreads(1)

# ------------------------------------------------------------------ setup
SCRATCH = os.environ.get("REEL_SCRATCH", os.path.join(os.path.dirname(__file__), "work"))
ASSETS = os.path.join(SCRATCH, "assets")
REC = os.path.join(SCRATCH, "rec")
CLIPS = os.path.join(SCRATCH, "clips")
OUT = os.path.join(SCRATCH, "out")
AUDIO = os.path.join(SCRATCH, "audio", "track.wav")

W, H, FPS = 1920, 1080, 30
NF = 750  # 25.000 s
SIX = 60.0 / 111.0 / 4.0  # one 16th note at 111 BPM
AUDIO_IN = 5.29127  # source seconds at v = 0, so the reel ends on the bar the track cuts on

RED = np.array([1.0, 0.165, 0.165], np.float32)  # #FF2A2A
WHITE = np.array([1.0, 1.0, 1.0], np.float32)
BLACK = np.zeros(3, np.float32)

FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"  # the site's Arial
FONT_PIXEL = "/usr/share/fonts/opentype/unifont/unifont.otf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def V(n):
    """16th-note index -> seconds."""
    return n * SIX


def N(v):
    return v / SIX


def ease_io(x):
    x = min(1.0, max(0.0, x))
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x, p=3.0):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** p


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def rng_for(*keys):
    h = 2166136261
    for k in keys:
        for ch in str(k):
            h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return np.random.default_rng(h)


# ------------------------------------------------------------------ media
@lru_cache(maxsize=24)
def read_rgb(path):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None:
        raise FileNotFoundError(path)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


@lru_cache(maxsize=None)
def count_frames(d):
    return len([f for f in os.listdir(d) if f.endswith(".jpg")])


def take_frame(name, t):
    d = os.path.join(REC, name)
    i = int(round(t * FPS))
    i = max(0, min(count_frames(d) - 1, i))
    return read_rgb(os.path.join(d, f"{i:04d}.jpg"))


def clip_dir(key, t_in):
    return os.path.join(CLIPS, f"{key}_{t_in:07.2f}")


def clip_frame(key, t_in, t):
    d = clip_dir(key, t_in)
    i = int(round(t * FPS))
    i = max(0, min(count_frames(d) - 1, i))
    return read_rgb(os.path.join(d, f"{i:04d}.jpg"))


@lru_cache(maxsize=1)
def eye_frames():
    path = os.path.join(SCRATCH, "eye_gray.npy")
    if not os.path.exists(path):
        cap = cv2.VideoCapture(os.path.join(ASSETS, "eye", "anime-eye.mp4"))
        frames = []
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            frames.append(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY))
        np.save(path, np.stack(frames))
    return np.load(path, mmap_mode="r")


def eye_frame(te):
    fr = eye_frames()
    return np.ascontiguousarray(fr[int(te * 24) % len(fr)])


@lru_cache(maxsize=None)
def logo_rgba(name):
    im = Image.open(os.path.join(ASSETS, "clients", name + ".webp")).convert("RGBA")
    return np.asarray(im).astype(np.float32) / 255.0


# ------------------------------------------------------------------ pixels
def f32(img):
    return img.astype(np.float32) * (1.0 / 255.0) if img.dtype == np.uint8 else img


def u8(img):
    return np.clip(img * 255.0 + 0.5, 0, 255).astype(np.uint8)


def luma(img):
    return img[..., 0] * 0.299 + img[..., 1] * 0.587 + img[..., 2] * 0.114


def cam(src, zoom=1.0, cx=0.5, cy=0.5, fit="cover", crop=None, out=(W, H)):
    """Frame `src` into `out`. (cx, cy) is the point of the crop box, as fractions,
    that lands on the frame centre; cover framing is clamped so no edge shows."""
    ow, oh = out
    sh, sw = src.shape[:2]
    x0, y0, x1, y1 = crop if crop else (0, 0, sw, sh)
    bw, bh = x1 - x0, y1 - y0
    base = max(ow / bw, oh / bh) if fit == "cover" else min(ow / bw, oh / bh)
    s = base * zoom
    px, py = x0 + cx * bw, y0 + cy * bh
    if fit == "cover":
        hw, hh = ow / (2 * s), oh / (2 * s)
        px = min(max(px, x0 + hw), x1 - hw) if bw > 2 * hw else (x0 + x1) / 2
        py = min(max(py, y0 + hh), y1 - hh) if bh > 2 * hh else (y0 + y1) / 2
    if s < 1.0:  # area-resample first so downscales stay clean
        src = cv2.resize(src, (max(1, int(round(sw * s))), max(1, int(round(sh * s)))), interpolation=cv2.INTER_AREA)
        px, py = px * src.shape[1] / sw, py * src.shape[0] / sh
        s = 1.0
    M = np.float32([[s, 0, ow / 2 - s * px], [0, s, oh / 2 - s * py]])
    return f32(cv2.warpAffine(src, M, (ow, oh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0))


def scale_about(img, z, cx=W / 2, cy=H / 2):
    if abs(z - 1) < 1e-3:
        return img
    M = np.float32([[z, 0, cx - z * cx], [0, z, cy - z * cy]])
    return cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def shift(ch, dx, dy=0.0):
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(ch, M, (ch.shape[1], ch.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def rgb_split(img, dx, dy=0.0):
    if abs(dx) < 0.4 and abs(dy) < 0.4:
        return img
    out = img.copy()
    out[..., 0] = shift(img[..., 0], dx, dy)
    out[..., 2] = shift(img[..., 2], -dx, -dy)
    return out


def slices(img, rng, n=6, max_shift=140, hmin=4, hmax=70, other=None):
    """Horizontal tears: bands shifted sideways, some showing `other` (the previous shot)."""
    out = img.copy()
    h, w = img.shape[:2]
    for _ in range(n):
        bh = int(rng.integers(hmin, hmax))
        y = int(rng.integers(0, h - bh))
        dx = int(rng.integers(-max_shift, max_shift + 1))
        src = other if (other is not None and rng.random() < 0.45) else img
        band = np.roll(src[y : y + bh], dx, axis=1)
        if rng.random() < 0.4:
            band = band.copy()
            band[..., 0] = np.roll(band[..., 0], int(dx * 0.3) + 6, axis=1)
        out[y : y + bh] = band
    return out


def blocks(img, rng, n=8, smin=24, smax=180):
    """Macroblock corruption."""
    out = img.copy()
    h, w = img.shape[:2]
    for _ in range(n):
        bw = int(rng.integers(smin, smax))
        bh = int(rng.integers(smin // 2, smax // 2 + 1))
        x = int(rng.integers(0, w - bw))
        y = int(rng.integers(0, h - bh))
        mode = int(rng.integers(0, 5))
        if mode == 0:
            sx = int(np.clip(x + rng.integers(-260, 260), 0, w - bw))
            sy = int(np.clip(y + rng.integers(-40, 40), 0, h - bh))
            out[y : y + bh, x : x + bw] = img[sy : sy + bh, sx : sx + bw]
        elif mode == 1:
            out[y : y + bh, x : x + bw] = 1.0 - img[y : y + bh, x : x + bw]
        elif mode == 2:
            blk = img[y : y + bh, x : x + bw]
            sm = cv2.resize(blk, (max(1, bw // 14), max(1, bh // 14)), interpolation=cv2.INTER_AREA)
            out[y : y + bh, x : x + bw] = cv2.resize(sm, (bw, bh), interpolation=cv2.INTER_NEAREST)
        elif mode == 3:
            out[y : y + bh, x : x + bw] = (WHITE, BLACK, RED)[int(rng.integers(0, 3))]
        else:
            out[y : y + bh, x : x + bw, 1:] *= 0.2  # red channel only
    return out


BAYER = np.array(
    [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
     [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
     [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]], np.float32) / 64.0 + 1 / 128.0


def dither(img, cell=3, fg=WHITE, bg=BLACK, gain=1.15, bias=-0.04):
    l = luma(img)
    sw, sh = W // cell, H // cell
    sm = cv2.resize(l, (sw, sh), interpolation=cv2.INTER_AREA) * gain + bias
    thr = np.tile(BAYER, (sh // 8 + 1, sw // 8 + 1))[:sh, :sw]
    bit = (sm > thr).astype(np.uint8)
    big = cv2.resize(bit, (W, H), interpolation=cv2.INTER_NEAREST)[..., None].astype(np.float32)
    return big * fg + (1 - big) * bg


def grade(img, mode="natural"):
    if mode == "natural":
        l = luma(img)[..., None]
        img = l + (img - l) * 0.9
        return np.clip((img - 0.5) * 1.12 + 0.5, 0, 1)
    if mode == "bw":
        l = luma(img)
        l = np.clip((l - 0.5) * 1.3 + 0.48, 0, 1)
        return np.stack([l * 0.98, l, l * 1.03], -1)
    if mode == "redkey":  # B&W, only the reds survive
        l = luma(img)
        lb = np.clip((l - 0.5) * 1.35 + 0.47, 0, 1)
        r, g, b = img[..., 0], img[..., 1], img[..., 2]
        m = np.clip((r - np.maximum(g, b) - 0.10) * 4.0, 0, 1)
        bw = np.stack([lb, lb, lb], -1)
        red = np.stack([np.clip(r * 1.25, 0, 1), g * 0.55, b * 0.55], -1)
        return bw * (1 - m[..., None]) + red * m[..., None]
    if mode == "invert":
        return 1.0 - img
    if mode == "thermal":
        l = u8(np.clip((luma(img) - 0.08) * 1.3, 0, 1))
        return f32(cv2.cvtColor(cv2.applyColorMap(l, cv2.COLORMAP_INFERNO), cv2.COLOR_BGR2RGB))
    if mode == "dither_red":
        return dither(img, 3, RED, BLACK)
    if mode == "dither":
        return dither(img, 3, WHITE, BLACK)
    if mode == "redwash":  # duotone black -> red -> white
        l = np.clip((luma(img) - 0.5) * 1.4 + 0.5, 0, 1)[..., None]
        lo = np.clip(l * 2, 0, 1)
        hi = np.clip(l * 2 - 1, 0, 1)
        return RED * lo * (1 - hi) + WHITE * hi
    raise ValueError(mode)


def pixel_curtain(t_ms, seed, cover=380.0, hold=70.0, reveal=420.0):
    """The site's black/white square transition (js/pixels.js). Returns (alpha, rgb) or None."""
    size = max(22, math.ceil(max(W, H) / 30))
    cols, rows = math.ceil(W / size), math.ceil(H / size)
    r = np.random.default_rng(seed)
    white = r.random((rows, cols)) < 0.45
    t_in = r.random((rows, cols)) * cover
    t_out = r.random((rows, cols)) * reveal
    if t_ms < 0 or t_ms >= cover + hold + reveal:
        return None
    if t_ms < cover:
        vis = t_ms >= t_in
    elif t_ms < cover + hold:
        vis = np.ones_like(white)
    else:
        vis = (t_ms - cover - hold) < t_out
    a = cv2.resize(vis.astype(np.uint8), (cols * size, rows * size), interpolation=cv2.INTER_NEAREST)[:H, :W]
    c = cv2.resize(white.astype(np.uint8), (cols * size, rows * size), interpolation=cv2.INTER_NEAREST)[:H, :W]
    return a.astype(np.float32), np.repeat(c[..., None].astype(np.float32), 3, axis=2)


def apply_curtain(img, cur):
    if cur is None:
        return img
    a, c = cur
    return img * (1 - a[..., None]) + c * a[..., None]


def radial_blur(img, cx, cy, amount, samples=8):
    """Zoom blur towards (cx, cy); amount = relative scale spread."""
    if amount < 0.004:
        return img
    acc = img.copy()
    for k in range(1, samples):
        acc += scale_about(img, 1.0 + amount * k / (samples - 1), cx, cy)
    return acc / samples


@lru_cache(maxsize=1)
def grain_bank():
    r = np.random.default_rng(11)
    return [cv2.resize(r.normal(0, 1, (H // 2, W // 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_NEAREST) for _ in range(8)]


@lru_cache(maxsize=1)
def vignette():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    return (1.0 - 0.28 * np.clip(d - 0.55, 0, 1) ** 1.6)[..., None]


@lru_cache(maxsize=1)
def scan_rows():
    y = np.arange(H, dtype=np.float32)
    return (1.0 - 0.11 * (0.5 + 0.5 * np.cos(y * 2 * np.pi / 4.0)))[:, None, None]


def post(img, f, grain=0.045, scan=True, ca=1.2):
    img = rgb_split(img, ca)
    if scan:
        img = img * scan_rows()
    g = grain_bank()[f % 8]
    gx = (f * 37) % 64
    img = img + np.roll(g, gx, axis=1)[..., None] * grain
    img = img * vignette()
    return np.clip(img, 0, 1)


# ------------------------------------------------------------------ type
@lru_cache(maxsize=512)
def text_mask(text, font=FONT_BOLD, size=40, tracking=0.0, scale_x=1.0):
    """Alpha mask (float32) for a line of text, char-by-char so tracking is exact."""
    f = ImageFont.truetype(font, size)
    asc, desc = f.getmetrics()
    widths = [f.getlength(ch) for ch in text]
    total = int(sum(widths) + tracking * size * max(0, len(text) - 1) + size)
    im = Image.new("L", (total + 4, asc + desc + 8), 0)
    d = ImageDraw.Draw(im)
    x = 2.0
    for ch, w in zip(text, widths):
        d.text((x, 4), ch, font=f, fill=255)
        x += w + tracking * size
    bb = im.getbbox()
    if bb is None:
        return np.zeros((1, 1), np.float32)
    im = im.crop(bb)
    if scale_x != 1.0:
        im = im.resize((max(1, int(im.width * scale_x)), im.height), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


def paste(img, mask, x, y, color=WHITE, opacity=1.0):
    """Composite an alpha mask at integer (x, y) (top-left), clipped to the frame."""
    h, w = mask.shape
    x, y = int(round(x)), int(round(y))
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(img.shape[1], x + w), min(img.shape[0], y + h)
    if x1 <= x0 or y1 <= y0:
        return img
    a = mask[y0 - y : y1 - y, x0 - x : x1 - x, None] * opacity
    img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - a) + np.asarray(color, np.float32) * a
    return img


def label(img, text, x, y, size=16, color=WHITE, opacity=0.85, font=FONT_PIXEL, anchor="tl"):
    m = text_mask(text, font, size)
    if anchor[0] == "b":
        y -= m.shape[0]
    if anchor[1] == "r":
        x -= m.shape[1]
    if anchor[1] == "c":
        x -= m.shape[1] / 2
    return paste(img, m, x, y, color, opacity)


def big_word(img, text, cy, size, color=WHITE, opacity=1.0, jitter=(0, 0)):
    """Site-style display type: Arial bold, -0.04em tracking, 1.08 horizontal stretch."""
    m = text_mask(text, FONT_BOLD, size, -0.04, 1.08)
    x = (W - m.shape[1]) / 2 + jitter[0]
    return paste(img, m, x, cy - m.shape[0] / 2 + jitter[1], color, opacity), m.shape


# ------------------------------------------------------------------ HUD
def timecode(v):
    fr = int(round(v * FPS))
    return f"00:00:{fr // FPS:02d}:{fr % FPS:02d}"


def brackets(img, m=34, l=46, t=2, opacity=0.7):
    c = WHITE * opacity
    for (x, y, sx, sy) in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        xa, xb = sorted([x, x + sx * l])
        ya, yb = sorted([y, y + sy * l])
        img[min(y, y + sy * t) : max(y, y + sy * t), xa:xb] = img[min(y, y + sy * t) : max(y, y + sy * t), xa:xb] * (1 - opacity) + c
        img[ya:yb, min(x, x + sx * t) : max(x, x + sx * t)] = img[ya:yb, min(x, x + sx * t) : max(x, x + sx * t)] * (1 - opacity) + c
    return img


def hud(img, v, tag=None, sub=None, site=False, url=True):
    n = N(v)
    img = brackets(img)
    on = (int(n) // 4) % 2 == 0 or n < 9
    if on:
        cv2.circle(img, (58, 64), 7, tuple(float(c) for c in RED), -1, lineType=cv2.LINE_AA)
    label(img, "REC", 74, 56, 16, WHITE, 0.85)
    label(img, timecode(v), W - 58, 56, 16, WHITE, 0.8, anchor="tr")
    if url and not site:
        label(img, "NICOLO-LOMBARDI.COM", W - 58, H - 56, 16, WHITE, 0.75, anchor="br")
    if tag:
        label(img, tag, 58, H - 80, 32, RED, 0.95, anchor="bl")
    if sub:
        label(img, sub, 58, H - 56, 16, WHITE, 0.8, anchor="bl")
    return img


# ------------------------------------------------------------------ the eye
# Eye geometry in source pixels of anime-eye.mp4 (1280x720)
EYE_C = (640.0, 360.0)
PUPIL = (569.0, 322.0)
LID_X0, LID_X1 = 398.0, 888.0


def lid_curves(xs):
    u = (xs - (LID_X0 + LID_X1) / 2) / ((LID_X1 - LID_X0) / 2)
    inside = np.abs(u) < 1.0
    s = np.sqrt(np.clip(1.0 - u * u, 0.0, 1.0))
    yc = 357.6 - 0.0515 * (xs - 640.0)
    return inside, s, yc - 98.0 * s, yc + 146.0 * s


def lid_remap(xs, ys, c):
    """Per-column vertical remap that moves the real lash line.
    c = 1 shut, 0 as drawn, < 0 wider than drawn."""
    inside, s, U0, L0 = lid_curves(xs)
    Hh = L0 - U0
    if c >= 0:
        U = U0 + c * Hh * 0.97
        L = L0 - c * Hh * 0.03
    else:
        U = U0 + c * Hh * 0.7
        L = L0 - c * Hh * 0.22
    yA = U0 - (120.0 * s + 1.0)
    yB = L0 + (70.0 * s + 1.0)
    y = ys.copy()
    m = inside & (ys >= yA) & (ys < U)
    y = np.where(m, yA + (ys - yA) * (U0 - yA) / np.maximum(U - yA, 1e-3), y)
    if c < 0:
        m = inside & (ys >= U) & (ys <= L)
        y = np.where(m, U0 + (ys - U) * (L0 - U0) / np.maximum(L - U, 1e-3), y)
    m = inside & (ys > L) & (ys <= yB)
    y = np.where(m, yB - (yB - ys) * (yB - L0) / np.maximum(yB - L, 1e-3), y)
    return y


@lru_cache(maxsize=1)
def out_grid():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return xx, yy


def eye_view(te, c, Z, center, pixel=0.0):
    """Render the eye with lid closure c, zoom Z (1 = full frame), source point `center` at frame centre."""
    xx, yy = out_grid()
    s = 1.5 * Z
    xs = (center[0] + (xx - W / 2) / s).astype(np.float32)
    ys = (center[1] + (yy - H / 2) / s).astype(np.float32)
    ys = lid_remap(xs, ys, c).astype(np.float32)
    src = eye_frame(te)
    out = cv2.remap(src, xs, ys, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    if pixel > 0.01:
        nn = cv2.remap(src, xs, ys, cv2.INTER_NEAREST, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        out = out * (1 - pixel) + nn * pixel
    out = out / 255.0
    return np.repeat(out[..., None], 3, axis=2)


def zoom_center(Z, c0=EYE_C, p=PUPIL, k=1.12):
    """Source point at frame centre so the pupil drifts to centre as we push in."""
    f = Z ** (-k)
    return (p[0] + (c0[0] - p[0]) * f, p[1] + (c0[1] - p[1]) * f)


def pupil_screen(Z, center):
    s = 1.5 * Z
    return (W / 2 + (PUPIL[0] - center[0]) * s, H / 2 + (PUPIL[1] - center[1]) * s)


def spring_step(t, zeta=0.5, freq=5.0):
    """Unit step response of a damped spring (closed form)."""
    if t <= 0:
        return 0.0
    w = 2 * math.pi * freq
    wd = w * math.sqrt(1 - zeta * zeta)
    return 1 - math.exp(-zeta * w * t) * (math.cos(wd * t) + zeta / math.sqrt(1 - zeta * zeta) * math.sin(wd * t))


def lid_intro(n):
    if n < 9:
        c = 0.9
        for nk, depth in ((1.0, 0.18), (5.0, 0.32)):
            x = (n - nk) / 1.6
            if 0 <= x <= 1:
                c -= depth * math.sin(math.pi * x)
        return c
    t = V(n) - V(9)
    wide = -0.12 - 0.08 * smooth(14, 24.5, n)
    return 0.9 + (wide - 0.9) * spring_step(t, 0.45, 4.2)


ZMAX = 22.0


def zoom_intro(n):
    if n < 9:
        return 1.0 + 0.025 * n / 9
    u = min(1.0, (n - 9) / 15.5)
    z = math.exp(math.log(ZMAX) * u ** 3.4) * 1.025
    z *= 1 + 0.07 * math.exp(-(V(n) - V(9)) / 0.12)  # snap punch
    return z


def pixel_tunnel(t, amount, cx, cy, seed=5, count=700, direction=1.0):
    """Site-style pixel squares rushing out of (cx, cy): the inside of the eye.
    Particles live in a cylinder and fly towards the camera; direction=-1 flies away."""
    img = np.zeros((H, W, 3), np.float32)
    if amount <= 0.01:
        return img
    r = np.random.default_rng(seed)
    ang = r.random(count) * 2 * np.pi
    rad = 0.25 + r.random(count) * 1.6
    z0 = r.random(count) * 4.0
    red = r.random(count) < 0.18
    travel = 1.6 * t + 2.2 * t * t  # accelerating
    z = (z0 - direction * travel) % 4.0 + 0.06
    sx = cx + np.cos(ang) * rad / z * 430
    sy = cy + np.sin(ang) * rad / z * 430
    size = np.clip(11.0 / z, 2, 140)
    vis = (sx > -150) & (sx < W + 150) & (sy > -150) & (sy < H + 150)
    for i in np.nonzero(vis)[0]:
        s = size[i]
        q = 64.0 if s > 40 else 1.0  # big ones snap to the site's 64px grid feel
        x0, y0 = sx[i] - s / 2, sy[i] - s / 2
        col = (float(RED[0]), float(RED[1]), float(RED[2])) if red[i] else (1.0, 1.0, 1.0)
        cv2.rectangle(img, (int(x0), int(y0)), (int(x0 + s), int(y0 + s)), col, -1)
    img = radial_blur(img, cx, cy, 0.18 * amount, 7)
    return img * amount


def scene_eye_intro(f, v):
    n = N(v)
    if n >= 24.5:
        return np.zeros((H, W, 3), np.float32), {}
    Z = zoom_intro(n)
    c = lid_intro(n)
    centre = zoom_center(Z)
    pix = smooth(3.0, 7.0, Z)
    img = eye_view(0.25 + v, c, Z, centre, pix)
    kc = smooth(1.4, 6.0, Z)
    if kc > 0:
        lo, hi = 0.16 * kc, 1.0 - 0.3 * kc
        img = np.clip((img - lo) / (hi - lo), 0, 1)
    # exposure: CRT power-on, then a slightly dim "sleepy" prelude
    if n < 9:
        ft = f
        if ft < 2:
            return np.zeros((H, W, 3), np.float32), {"hud": False}
        if ft < 7:  # CRT line opening vertically
            k = (ft - 2) / 5.0
            band = int(2 + k * k * H / 2)
            m = np.zeros((H, 1, 1), np.float32)
            m[H // 2 - band : H // 2 + band] = 1
            img = img * m * (1.6 - 0.8 * k) + (m * 0.35 * (1 - k))
            return np.clip(img, 0, 1), {"hud": ft >= 5}
        img = img * (0.78 + 0.06 * math.sin(f * 2.1))
    # radial blur grows with zoom speed
    if n >= 9:
        dz = math.log(zoom_intro(n + 0.25) / Z) / (0.25 * SIX)  # d ln Z / dt
        px, py = pupil_screen(Z, centre)
        img = radial_blur(img, px, py, min(0.35, 0.02 * dz), 9 if dz > 2 else 6)
        amt = smooth(4.5, 15.0, Z)
        if amt > 0.01:  # inside the pupil: the pixel tunnel
            tun = pixel_tunnel(V(n) - V(18), amt, px, py)
            img = 1 - (1 - img) * (1 - tun)
        ts = V(n) - V(9)
        if ts < 1.0 / FPS:  # snap: one negative frame
            img = np.clip((1.0 - img) * 1.15, 0, 1)
        elif ts < 0.45:
            r = rng_for("snap", f)
            img = np.clip(img * (1 + 0.9 * math.exp(-ts / 0.06)), 0, 1)
            img = rgb_split(img, 34 * math.exp(-ts / 0.09))
            if ts < 3.5 / FPS:
                img = slices(img, r, 8, 170, 6, 80)
    meta = {"reticle": (pupil_screen(Z, centre), Z) if 10 <= n < 23 and Z < 6 else None}
    return img, meta


def draw_reticle(img, pos, Z, n):
    px, py = pos
    r = max(26.0, 40 * 1.5 * Z * 1.35)
    if r > 700:
        return img
    a = 0.9
    col = tuple(float(x) for x in WHITE * a)
    L = int(r * 0.35)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0, y0 = int(px + sx * r), int(py + sy * r)
            cv2.line(img, (x0, y0), (x0 - sx * L, y0), col, 2, cv2.LINE_AA)
            cv2.line(img, (x0, y0), (x0, y0 - sy * L), col, 2, cv2.LINE_AA)
    label(img, f"PUPIL LOCK  x{int(PUPIL[0])} y{int(PUPIL[1])}", px + r + 12, py - r, 16, RED, 0.95)
    label(img, f"ZOOM {Z:5.2f}x", px + r + 12, py - r + 20, 16, WHITE, 0.8)
    return img


# ------------------------------------------------------------------ edit decision list
# Shot kinds: take (live site capture), clip (project video), eye, logos, wall, trip, words, black.
# n0/n1 are 16th-note indices. Everything in a shot is a function of its local time.
SHOTS = []


def shot(n0, n1, kind, **kw):
    SHOTS.append(dict(n0=n0, n1=n1, kind=kind, **kw))


LBL = {
    "malik": ("MALIK CROSS", "SHORT FILM / BIONIC AWARDS ENTRY"),
    "ktb": ("WICHITA PRODUCTION / KILL THE BOY", "VFX"),
    "wpp": ("WPP PRODUCTION", "VIRTUAL PRODUCTION"),
    "unc": ("UNCOMMONSENSE", "SOCIAL MEDIA CONTENT & FASHION"),
    "lexus": ("LEXUS / ELECTRIFIED", "TVC"),
    "aguila": ("EL ÁGUILA / LA HORA DORADA", "VIRTUAL PRODUCTION"),
    "melia": ("MELIÁ / HOTEL MELIÁ", "SOCIAL MEDIA CONTENT"),
}

FILES = {
    "malik": "malik-cross-film.mp4",
    "ktb": "ktb-film.mp4",
    "ktb04": "ktb-vfx-04.mp4",
    "ktb06": "ktb-vfx-06.mp4",
    "ktb07": "ktb-vfx-07.mp4",
    "ktb02": "ktb-vfx-02.mp4",
    "wpp": "Ldb4lUOdpBMLqQgyUIvXayYlE.mp4",
    "lexus": "q65cZYQLVwWuvK4CaJ99qUKYaI0.mp4",
    "pgvx": "pgvXtdMshKqmetkpEhgM2k1TI.mp4",
    "ste4": "Ste489lG9zmVBFJeCYP9xDo.mp4",
    "vfrn": "Vfrnp4LUs7aaOAevNvmhbI8FJrw.mp4",
    "z3z5": "3z5frFOL28vZ40IlJCXbcUgW0pc.mp4",
    "fd1k": "FD1kZsJlQdpOLlGLrAbnlQFTPA.mp4",
    "gwh2": "GWH2DGkArjGgTWVAw8hsv6C5rxM.mp4",
    "i7mw": "i7MWkcoSeItRmxvFvuUf3tTLM.mp4",
    "agu1": "dtWaKoY1sNjmQihjqZxhqg2lUw.mp4",
    "agu3": "2whYpxgd3GAUPGqDR5SeGZ1CBAM.mp4",
    "agu4": "0LWzJpUVqcUeFipZK5FL9GiADM.mp4",
    "mel1": "9o6UGKJle9O9wkuKGqdLwOqjB2w.mp4",
    "mel2": "zSZrThHWODZG0ReCYFLVQcZv8fk.mp4",
}
KTB_CROP = (212, 36, 1074, 640)  # inside the rounded film gate
WPP_CROP = (0, 88, 1280, 632)  # inside the letterbox

# S1 the eye opens
shot(0, 25, "eye_intro")
# S2 inside: the site boots
shot(25, 33, "take", take="home_boot", t0=0.10, zoom=(1.65, 1.0), zdur=6, cy=0.5, site=True)
shot(33, 41, "take", take="home_scroll", t0=0.0, zoom=(1.06, 1.06), smear=True, site=True)
shot(41, 45, "take", take="gallery_unc", t0=V(2), zoom=(1.18, 1.1), site=True)
shot(45, 49, "take", take="gallery_aguila", t0=V(2), zoom=(1.12, 1.2), site=True)
shot(49, 53, "take", take="gallery_ktb", t0=V(2), zoom=(1.2, 1.12), site=True)
shot(53, 56.25, "take", take="page_lexus", t0=0.2, zoom=(1.0, 1.12), site=True)
shot(56.25, 57, "black")
# S3 monitor wall -> push into the home tile -> click "about"
shot(57, 66.5, "wall")
shot(66.5, 75, "take", take="about_click", t0=None, zoom=(1.0, 1.0), site=True, about=True)
# S4 break: 14 client logos, one per 16th
shot(75, 89, "logos")
# S5 drop
DROP = []


def d(n0, n1, key, t_in, grade="natural", fit="cover", crop=None, cx=0.5, cy=0.5, zoom=(1.0, 1.06), speed=1.0, tag=None):
    DROP.append((n0, n1))
    shot(n0, n1, "clip", key=key, t_in=t_in, grade=grade, fit=fit, crop=crop, cx=cx, cy=cy, zoom=zoom, speed=speed, tag=tag)


# bar 8 : Malik Cross (B&W boxing)
d(89, 92, "malik", 17.95, "bw", cx=0.55, zoom=(1.18, 1.05), tag="malik")
d(92, 93, "malik", 5.80, "bw", tag="malik")
d(93, 95, "malik", 15.10, "invert", tag="malik")
d(95, 97, "malik", 0.80, "bw", zoom=(1.1, 1.2), tag="malik")
shot(97, 99, "take", take="page_malik", t0=0.35, zoom=(1.0, 1.04), site=True, tag="malik")
d(99, 101, "malik", 60.60, "redkey", zoom=(1.0, 1.12), tag="malik")
d(101, 103, "malik", 36.20, "thermal", tag="malik")
d(103, 105, "malik", 58.10, "natural", tag="malik")
# bar 9 : Kill the Boy VFX + WPP virtual production
d(105, 108, "ktb04", 0.40, "natural", crop=KTB_CROP, cx=0.62, cy=0.52, zoom=(1.25, 1.6), tag="ktb")
d(108, 109, "ktb06", 4.00, "natural", crop=KTB_CROP, tag="ktb")
d(109, 111, "ktb", 81.20, "bw", crop=KTB_CROP, tag="ktb")
shot(111, 113, "take", take="gallery_ktb", t0=V(14), zoom=(1.0, 1.06), site=True, tag="ktb")
d(113, 115, "wpp", 28.40, "natural", crop=WPP_CROP, tag="wpp")
d(115, 117, "wpp", 66.60, "natural", crop=WPP_CROP, cx=0.45, tag="wpp")
d(117, 120.55, "wpp", 57.60, "natural", crop=WPP_CROP, zoom=(1.0, 1.15), tag="wpp")
shot(120.55, 121, "black")
# bar 10 : UNCOMMONSENSE -> site carousel, then a vertical triptych
shot(121, 124, "take", take="gallery_unc", t0=V(14), zoom=(1.12, 1.0), site=True, tag="unc")
shot(124, 133, "trip", tag="unc", panels=[
    # (panel, n_on, key, t_in, grade)
    (0, 124, "vfrn", 7.20, "natural"),
    (1, 125, "z3z5", 17.20, "natural"),
    (2, 127, "pgvx", 9.40, "natural"),
    (0, 129, "fd1k", 27.30, "natural"),
    (1, 129, "gwh2", 15.20, "natural"),
    (2, 129, "fd1k", 12.40, "natural"),
    (0, 131, "ste4", 8.60, "natural"),
    (1, 131, "i7mw", 5.20, "natural"),
    (2, 131, "gwh2", 3.00, "natural"),
])
d(133, 137, "i7mw", 23.00, "natural", fit="cover", cy=0.5, zoom=(1.0, 1.18), tag="unc")
# bar 11 : Lexus / El Aguila / Melia
shot(137, 140, "take", take="page_lexus", t0=1.2, zoom=(1.0, 1.08), site=True, tag="lexus")
d(140, 141, "lexus", 26.20, "natural", cy=0.52, tag="lexus")
shot(141, 143, "take", take="gallery_aguila", t0=V(10), zoom=(1.06, 1.0), site=True, tag="aguila")
shot(143, 147, "trip", tag="melia", panels=[
    (0, 143, "mel1", 7.30, "natural"),
    (1, 144, "agu1", 5.60, "natural"),
    (2, 145, "mel1", 10.20, "natural"),
])
d(147, 149, "lexus", 29.40, "natural", cy=0.5, tag="lexus")
shot(149, 151.7, "take", take="gallery_melia", t0=V(4), zoom=(1.1, 1.0), site=True, tag="melia")
shot(151.7, 153, "strobe")
# S6 overdrive words + close
shot(153, 168.5, "words")
shot(168.5, 169, "black")
shot(169, 185, "eye_outro")

# Flash frames for the bar-12 montage (one per 16th)
FLASH = [
    ("malik", 5.90, "bw"), ("ktb07", 2.10, "natural"), ("z3z5", 18.40, "natural"), ("wpp", 67.50, "natural"),
    ("lexus", 26.60, "natural"), ("agu3", 2.10, "natural"), ("malik", 61.20, "redkey"), ("fd1k", 28.30, "natural"),
    ("ktb06", 6.00, "natural"), ("wpp", 58.60, "natural"), ("mel1", 7.80, "natural"), ("gwh2", 18.40, "natural"),
    ("malik", 18.30, "bw"), ("ktb04", 1.60, "natural"), ("vfrn", 8.40, "natural"), ("i7mw", 24.00, "natural"),
]
WORDS = [(153, ["AI FILMMAKER"]), (157, ["CREATIVE", "TECHNOLOGIST"]), (161, ["ART DIRECTOR"]), (165, None)]

LOGOS = ["cocacola", "heineken", "lexus", "toyota", "boots", "soapglory", "melia", "aguila", "osborne", "anaya",
         "wpp", "wichita", "graphomedia", "uncommonsense"]
LOGO_NAMES = ["COCA-COLA", "HEINEKEN", "LEXUS", "TOYOTA", "BOOTS", "SOAP & GLORY", "MELIÁ HOTELS & RESORTS",
              "EL ÁGUILA", "OSBORNE", "ANAYA", "WPP PRODUCTION", "WICHITA PRODUCTION", "GRAPHOMEDIA", "UNCOMMONSENSE"]
LOGO_RATIO = [3.184, 1.986, 2.228, 7.639, 1.885, 4.624, 2.077, 1.062, 7.289, 4.306, 9.475, 0.712, 1.792, 13.03]

# audio gaps inside the break (v seconds): the stutter gate is closed
GATES = [(9.949, 9.999), (10.084, 10.134), (10.219, 10.274), (10.319, 10.339), (10.389, 10.409), (10.524, 10.544),
         (10.624, 10.679), (10.759, 10.814), (11.299, 11.354), (11.399, 11.419), (11.459, 11.489), (11.569, 11.624),
         (11.704, 11.759)]

# 808 pattern of the drop, bars 8..13: offsets in 16ths and strength
HITS = []
for bar in range(8, 14):
    nb = 89 + 16 * (bar - 8)
    for off, s in ((0, 1.0), (3, 0.7), (4, 0.55), (6, 0.7), (8, 0.85), (10, 0.7), (12, 0.8)):
        HITS.append((nb + off, s))
HITS += [(9, 1.0), (25, 0.9), (29, 0.3), (33, 0.5), (37, 0.35), (41, 0.6), (43, 0.3), (45, 0.5), (47, 0.3), (49, 0.5),
         (51, 0.3), (53, 0.5), (55, 0.3), (57, 0.8), (59, 0.3), (61, 0.45), (63, 0.45), (65, 0.4), (67, 0.3), (69, 0.6)]
HITS.sort()


def last_hit(n):
    best = None
    for hn, s in HITS:
        if hn <= n + 1e-6:
            best = (hn, s)
        else:
            break
    return best


def find_shot(n):
    for i, s in enumerate(SHOTS):
        if s["n0"] <= n < s["n1"]:
            return i, s
    return len(SHOTS) - 1, SHOTS[-1]


# ------------------------------------------------------------------ scene renderers
def render_take(s, v, f):
    lt = v - V(s["n0"])
    if s.get("about"):  # click lands on n 69
        t = lt + (V(s["n0"]) - (V(69) - 0.5))
    else:
        t = s["t0"] + lt
    z0, z1 = s["zoom"]
    zd = s.get("zdur")
    k = ease_out(lt / V(zd)) if zd else lt / max(1e-6, V(s["n1"] - s["n0"]))
    z = z0 + (z1 - z0) * k
    src = take_frame(s["take"], t)
    img = cam(src, z, 0.5, s.get("cy", 0.5))
    if s.get("smear"):  # vertical motion smear while the page snaps
        loc = t / SIX
        k16 = loc % 2.0
        if k16 < 1.2:
            sp = math.sin(math.pi * k16 / 1.2)
            ln = int(2 + 46 * sp)
            if ln > 3:
                img = cv2.blur(img, (1, ln))
    if s.get("about"):
        n = N(v)
        if n >= 73:  # push into the "Selected clients" strip
            k2 = ease_io((n - 73) / 2.0)
            img = cam(src, 1.0 + 1.0 * k2, 0.5 - 0.2 * k2, 0.5 + 0.32 * k2)
    return img


def render_clip(s, v, f):
    lt = v - V(s["n0"])
    src = clip_frame(s["key"], s["t_in"], lt * s["speed"])
    z0, z1 = s["zoom"]
    z = z0 + (z1 - z0) * (lt / max(1e-6, V(s["n1"] - s["n0"])))
    img = cam(src, z, s["cx"], s["cy"], s["fit"], s["crop"])
    return grade(img, s["grade"])


def render_trip(s, v, f):
    n = N(v)
    img = np.zeros((H, W, 3), np.float32)
    pw = W // 3
    for p in range(3):
        cur = None
        for (pi, n_on, key, t_in, gr) in s["panels"]:
            if pi == p and n_on <= n:
                cur = (n_on, key, t_in, gr)
        x0 = p * pw
        if cur is None:  # panel not lit yet: static
            r = rng_for("static", f, p)
            st = r.random((H // 6, pw // 6)).astype(np.float32) * 0.18
            img[:, x0 : x0 + pw] = cv2.resize(st, (pw, H), interpolation=cv2.INTER_NEAREST)[..., None]
            continue
        n_on, key, t_in, gr = cur
        lt = v - V(n_on)
        src = clip_frame(key, t_in, lt)
        z = 1.0 + 0.1 * math.exp(-lt / 0.12)
        panel = grade(cam(src, z, 0.5, 0.45, "cover", None, out=(pw, H)), gr)
        if lt < 2 / FPS:
            panel = np.clip(panel + 0.5 * (1 - lt * FPS / 2), 0, 1)
        img[:, x0 : x0 + pw] = panel
    for p in (1, 2):  # thin white dividers
        img[:, p * pw - 1 : p * pw + 1] = 0.9
    return img


def render_wall(s, v, f):
    n = N(v)
    tiles = [
        ("page_malik", 0.3 + (v - V(57)), "CAM_01 // MALIK CROSS"),
        ("gallery_unc", V(10) + (v - V(57)), "CAM_02 // UNCOMMONSENSE"),
        ("gallery_ktb", V(10) + (v - V(57)), "CAM_03 // KILL THE BOY"),
        ("about_click", (v - (V(69) - 0.5)), "CAM_04 // NICOLO-LOMBARDI.COM"),
    ]
    # push into the home tile (bottom right) over n 64 -> 66.5
    k = ease_io((n - 64.0) / 2.5)
    z = 1.0 + k + 0.035 * min(1.0, (n - 57) / 7.0) * (1 - k)  # slow drift, then 1 -> 2
    canvas = np.zeros((H * 2, W * 2, 3), np.float32)
    for i, (tk, t, name) in enumerate(tiles):
        on_at = 57 + i * 0.75
        tx, ty = (i % 2) * W, (i // 2) * H
        if n < on_at:
            continue
        tile = cam(take_frame(tk, max(0.0, t)), 1.0)
        lt = v - V(on_at)
        if lt < 2 / FPS:
            tile = np.clip(tile + 0.6, 0, 1)
        r = rng_for("wall", i, int(n * 2))
        if 61 <= n < 64 and r.random() < 0.3:
            tile = slices(tile, r, 4, 90) if r.random() < 0.6 else 1.0 - tile
        canvas[ty : ty + H, tx : tx + W] = tile
        label(canvas, name, tx + 40, ty + H - 40, 32, WHITE, 0.9, anchor="bl")
        cv2.rectangle(canvas, (tx + 2, ty + 2), (tx + W - 3, ty + H - 3), (0.85, 0.85, 0.85), 4)
    canvas[H - 4 : H + 4] = 0
    canvas[:, W - 4 : W + 4] = 0
    # camera on the 2x canvas: zoom 1 shows all of it, zoom 2 shows the BR tile 1:1
    cx = W + (W / 2) * k
    cy = H + (H / 2) * k
    s_ = 0.5 * z
    M = np.float32([[s_, 0, W / 2 - s_ * cx], [0, s_, H / 2 - s_ * cy]])
    if s_ < 1:
        small = cv2.resize(canvas, None, fx=s_, fy=s_, interpolation=cv2.INTER_AREA)
        M = np.float32([[1, 0, W / 2 - s_ * cx], [0, 1, H / 2 - s_ * cy]])
        return cv2.warpAffine(small, M, (W, H), flags=cv2.INTER_LINEAR)
    return cv2.warpAffine(canvas, M, (W, H), flags=cv2.INTER_LINEAR)


def in_gate(v):
    c = v + 0.5 / FPS
    return any(a <= c <= b for a, b in GATES)


def render_logos(s, v, f):
    n = N(v)
    k = int(min(13, max(0, math.floor(n - 75))))
    lt = v - V(75 + k)
    r = rng_for("logo", k, f)
    img = np.zeros((H, W, 3), np.float32)
    # faint moving grid
    gx = int((f * 9) % 48)
    img[:, gx::48] += 0.05
    img[(f * 5) % 48 :: 48, :] += 0.05
    rgba = logo_rgba(LOGOS[k])
    ratio = LOGO_RATIO[k]
    area = 470.0 * 470.0
    hgt = min(470.0, math.sqrt(area / ratio))
    wid = min(1400.0, hgt * ratio)
    hgt = wid / ratio
    z = 1.0 + 0.16 * math.exp(-lt / 0.05)
    wid, hgt = wid * z, hgt * z
    lg = cv2.resize(rgba, (int(wid), int(hgt)), interpolation=cv2.INTER_CUBIC if wid > rgba.shape[1] else cv2.INTER_AREA)
    a = lg[..., 3]
    jx, jy = (r.integers(-10, 11), r.integers(-6, 7)) if lt > 1.5 / FPS else (r.integers(-40, 41), 0)
    x, y = (W - wid) / 2 + jx, (H - hgt) / 2 - 20 + jy
    paste(img, a, x + 14, y, RED, 0.55)  # red echo
    paste(img, a, x, y, WHITE, 1.0)
    img = rgb_split(img, 10 * math.exp(-lt / 0.06) + 2.5)
    if lt < 1.0 / FPS:
        img = slices(img, r, 7, 180, 6, 60)
    if lt < 1 / FPS and k % 2 == 0:
        img = 1.0 - img  # strobe: first frame inverted on every other logo
    label(img, "SELECTED CLIENTS", 58, 92, 16, WHITE, 0.85)
    label(img, f"{k + 1:02d}/14", W / 2, H - 150, 32, RED, 0.95, anchor="tc")
    label(img, LOGO_NAMES[k], W / 2, H - 112, 16, WHITE, 0.85, anchor="tc")
    if in_gate(v):
        img = img * 0.38
    if n >= 88.55:  # white-out into the drop
        img = np.clip(img + 0.35 + 0.65 * smooth(88.55, 88.85, n), 0, 1)
    return img


def render_strobe(s, v, f):
    n = N(v)
    r = rng_for("strobe", f)
    i = f % 3
    src = [("malik", 18.30, "bw"), ("ktb04", 1.20, "natural"), ("fd1k", 27.60, "natural")][i]
    img = grade(cam(clip_frame(src[0], src[1], 0.0), 1.15, crop=KTB_CROP if src[0].startswith("ktb") else None), src[2])
    if f % 2:
        img = 1.0 - img
    img = slices(img, r, 8, 220)
    return img


def render_words(s, v, f):
    n = N(v)
    k = int(min(15, max(0, math.floor(n - 153))))
    key, t_in, gr = FLASH[k]
    lt = v - V(153 + k)
    crop = KTB_CROP if key.startswith("ktb") else (WPP_CROP if key == "wpp" else None)
    bg = cam(clip_frame(key, t_in, lt), 1.08 + 0.1 * math.exp(-lt / 0.08), 0.5, 0.5, "cover", crop)
    mode = ("dither_red", "bw", "redwash", "dither")[k % 4]
    bg = grade(bg, mode) * (0.55 if mode != "dither_red" else 0.8)
    img = bg
    wi = 0
    for i, (nw, lines) in enumerate(WORDS):
        if n >= nw:
            wi = i
    nw, lines = WORDS[wi]
    r = rng_for("words", f)
    if lines:
        wl = v - V(nw)
        size = 250 if len(lines) == 1 else 200
        if len(lines) == 1 and len(lines[0]) > 10:
            size = 230
        jit = (int(r.integers(-8, 9)), int(r.integers(-5, 6))) if wl > 1.5 / FPS else (int(r.integers(-60, 61)), 0)
        total = len(lines)
        for li, line in enumerate(lines):
            cy = H / 2 + (li - (total - 1) / 2) * size * 0.95
            img, _ = big_word(img, line, cy, size, RED, 0.9, (jit[0] + 12, jit[1]))
            img, _ = big_word(img, line, cy, size, WHITE, 1.0, jit)
        if wl < 2 / FPS:
            img = slices(img, r, 9, 200)
        label(img, "NICOLÓ LOMBARDI //", 58, 92, 16, WHITE, 0.85)
    else:
        # n 165 -> 168.5: the site's pixel curtain swallows the frame
        cur = pixel_curtain((v - V(165)) * 1000 * 0.86, 909)
        if cur is not None and (v - V(165)) * 1000 * 0.86 < 380 + 70:
            img = apply_curtain(img, cur)
        elif (v - V(165)) * 1000 * 0.86 >= 380 + 70:
            img = apply_curtain(np.zeros_like(img), cur)
    return img


def lid_outro(n):
    if n < 181:
        return -0.12
    t = V(n) - V(181)
    return -0.12 + 1.12 * min(1.0, spring_step(t, 0.8, 7.0))


def scene_eye_outro(s, v, f):
    n = N(v)
    lt = v - V(169)
    if n >= 182.2:
        img = np.zeros((H, W, 3), np.float32)
        return img
    # exit through the pupil: 22x -> 1x
    k = ease_out(lt / V(3.0), 4.0)
    Z = math.exp(math.log(ZMAX) * (1 - k))
    Z *= 1 + 0.06 * math.exp(-(v - V(last_hit(n)[0])) / 0.1)
    centre = zoom_center(Z)
    c = lid_outro(n)
    img = eye_view(6.0 + lt, c, Z, centre, smooth(3.0, 7.0, Z))
    kc = smooth(1.4, 6.0, Z)
    if kc > 0:
        lo, hi = 0.16 * kc, 1.0 - 0.3 * kc
        img = np.clip((img - lo) / (hi - lo), 0, 1)
    if k < 1:
        px, py = pupil_screen(Z, centre)
        sp = 4.0 * (1 - k) ** 3
        img = radial_blur(img, px, py, min(0.3, 0.05 * sp), 8)
        amt = smooth(4.5, 15.0, Z)
        if amt > 0.01:  # leaving the pupil: the tunnel flies away from us
            tun = pixel_tunnel(lt + 0.4, amt, px, py, seed=17, direction=-1.0)
            img = 1 - (1 - img) * (1 - tun)
    img = img * 0.8
    # lockup
    if n >= 172:
        wl = v - V(172)
        nm = "NICOLÓ LOMBARDI"
        m = text_mask(nm, FONT_BOLD, 150, -0.04, 1.08)
        x0 = (W - m.shape[1]) / 2
        y0 = H / 2 - m.shape[0] / 2 - 30
        # site-style letter rise, compressed into a few frames
        lm = text_mask(nm, FONT_BOLD, 150, -0.04, 1.08)
        rise = int(40 * (1 - ease_out(wl / 0.18)))
        op = min(1.0, wl / 0.1)
        paste(img, lm, x0 + 10, y0 + rise, RED, 0.6 * op)
        paste(img, lm, x0, y0 + rise, WHITE, op)
    if n >= 173:
        tg = text_mask("AI PRODUCTION SPECIALIST", FONT_BOLD, 38, 0.02, 1.0)
        paste(img, tg, (W - tg.shape[1]) / 2, H / 2 + 70, WHITE, 0.95)
    if n >= 175:
        um = text_mask("NICOLO-LOMBARDI.COM", FONT_PIXEL, 32)
        paste(img, um, (W - um.shape[1]) / 2, H / 2 + 140, RED, 1.0)
    if n >= 181:  # the eye slams shut: negative frame, then tears
        ts = v - V(181)
        if ts < 1.0 / FPS:
            img = np.clip((1.0 - img) * 1.1, 0, 1)
        else:
            img = slices(img, rng_for("shut", f), 9, 220, 6, 90)
    return img


def render_end_card(v, f):
    n = N(v)
    img = np.zeros((H, W, 3), np.float32)
    if n < 182.2:
        return img
    on = not (183.0 <= n < 183.35 or 184.0 <= n < 184.35)
    if on:
        um = text_mask("NICOLO-LOMBARDI.COM", FONT_PIXEL, 32)
        paste(img, um, (W - um.shape[1]) / 2, H / 2 - um.shape[0] / 2, WHITE, 0.95)
    # CRT power-off in the last frames
    if f >= NF - 3:
        k = (f - (NF - 3)) / 3.0
        band = max(1, int((1 - k) * 6))
        img = np.zeros_like(img)
        img[H // 2 - band : H // 2 + band, int(W * k * 0.45) : int(W * (1 - k * 0.45))] = 0.9
    return img


# ------------------------------------------------------------------ frame assembly
def base_frame(f, v):
    n = N(v)
    idx, s = find_shot(n)
    kind = s["kind"]
    meta = {}
    if kind == "eye_intro":
        img, meta = scene_eye_intro(f, v)
    elif kind == "take":
        img = render_take(s, v, f)
    elif kind == "clip":
        img = render_clip(s, v, f)
    elif kind == "trip":
        img = render_trip(s, v, f)
    elif kind == "wall":
        img = render_wall(s, v, f)
    elif kind == "logos":
        img = render_logos(s, v, f)
    elif kind == "strobe":
        img = render_strobe(s, v, f)
    elif kind == "words":
        img = render_words(s, v, f)
    elif kind == "eye_outro":
        img = scene_eye_outro(s, v, f) if n < 182.2 else render_end_card(v, f)
    else:
        img = np.zeros((H, W, 3), np.float32)
    return idx, s, img, meta


def render_frame(f):
    v = f / FPS
    n = N(v)
    idx, s, img, meta = base_frame(f, v)
    kind = s["kind"]
    r = rng_for("frame", f)

    # cut accents on the beat grid
    hit = last_hit(n)
    accents = kind in ("clip", "take", "trip", "wall", "eye_outro", "strobe") and n < 182
    if hit and accents:
        dt = v - V(hit[0])
        st = hit[1]
        if dt < 0.5:
            img = scale_about(img, 1.0 + 0.09 * st * math.exp(-dt / 0.09))
            e = math.exp(-dt / 0.045)
            img = np.clip(img * (1 + 0.85 * st * e) + 0.05 * st * e, 0, 1)
            img = rgb_split(img, 26 * st * math.exp(-dt / 0.07))
    # tear between shots on their first frame(s)
    span = 2.0 if (s["n0"] - 89) % 16 == 0 or s["n0"] in (25, 121, 137) else 1.0
    first = 0 <= (n - s["n0"]) * SIX < span / FPS
    if first and kind in ("clip", "take", "trip") and idx > 0:
        prev = SHOTS[idx - 1]
        pv = V(prev["n1"]) - 1.0 / FPS
        if prev["kind"] in ("clip", "take", "trip"):
            _, _, pimg, _ = base_frame(int(round(pv * FPS)), pv)
        else:
            pimg = None
        img = slices(img, r, 7, 160, 6, 90, other=pimg)
        if r.random() < 0.5:
            img = blocks(img, r, 6)

    # HUD
    tag = s.get("tag")
    if kind == "eye_intro":
        if meta.get("hud", True):
            img = hud(img, v)
        if meta.get("reticle"):
            pos, Z = meta["reticle"]
            img = draw_reticle(img, pos, Z, n)
    elif kind in ("clip", "trip"):
        t1, t2 = LBL[tag]
        img = hud(img, v, t1, t2)
    elif kind == "take":
        if tag:
            t1, t2 = LBL[tag]
            img = hud(img, v, t1, t2, site=True)
        else:
            img = hud(img, v, site=True)
    elif kind == "wall":
        img = hud(img, v, "LIVE // NICOLO-LOMBARDI.COM", None, site=True)
    elif kind == "eye_outro" and n < 182.2:
        img = hud(img, v, url=False)

    grain = 0.038 if kind not in ("black",) else 0.025
    img = post(img, f, grain=grain, scan=kind != "black")
    return u8(img)


# ------------------------------------------------------------------ commands
def clip_needs():
    need = {}
    for s in SHOTS:
        dur = V(s["n1"] - s["n0"]) + 0.3
        if s["kind"] == "clip":
            need[(s["key"], s["t_in"])] = max(need.get((s["key"], s["t_in"]), 0), dur * s["speed"])
        if s["kind"] == "trip":
            for (_, n_on, key, t_in, _) in s["panels"]:
                need[(key, t_in)] = max(need.get((key, t_in), 0), V(s["n1"] - n_on) + 0.3)
    for key, t_in, _ in FLASH:
        need[(key, t_in)] = max(need.get((key, t_in), 0), SIX + 0.3)
    for key, t_in in (("malik", 18.30), ("ktb04", 1.20), ("fd1k", 27.60)):
        need[(key, t_in)] = max(need.get((key, t_in), 0), 0.3)
    return need


def cmd_prep():
    for (key, t_in), dur in sorted(clip_needs().items()):
        d = clip_dir(key, t_in)
        if os.path.isdir(d) and count_frames(d) >= int(dur * FPS):
            continue
        os.makedirs(d, exist_ok=True)
        src = os.path.join(ASSETS, "videos", FILES[key])
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t_in:.3f}", "-i", src, "-t", f"{dur:.3f}",
                        "-vf", f"fps={FPS}", "-q:v", "2", os.path.join(d, "%04d.jpg")], check=True)
        # ffmpeg numbers from 1; shift to 0-based
        files = sorted(os.listdir(d))
        for i, fn in enumerate(files):
            os.rename(os.path.join(d, fn), os.path.join(d, f"tmp{i:04d}.jpg"))
        for i in range(len(files)):
            os.rename(os.path.join(d, f"tmp{i:04d}.jpg"), os.path.join(d, f"{i:04d}.jpg"))
        print("extracted", key, t_in, len(files))
    eye_frames()


def save_still(f, d):
    cv2.imwrite(os.path.join(d, f"f{f:04d}.png"), cv2.cvtColor(render_frame(f), cv2.COLOR_RGB2BGR))


def cmd_still(frames):
    d = os.path.join(OUT, "stills")
    os.makedirs(d, exist_ok=True)
    for f in frames:
        save_still(f, d)
        print("still", f)


def _render_one(f):
    path = os.path.join(OUT, "frames", f"{f:04d}.png")
    cv2.imwrite(path, cv2.cvtColor(render_frame(f), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return f


def cmd_render(workers=4, first=0, last=NF):
    from multiprocessing import Pool

    os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
    todo = [f for f in range(first, last) if not os.path.exists(os.path.join(OUT, "frames", f"{f:04d}.png"))]
    with Pool(workers) as pool:
        for i, f in enumerate(pool.imap(_render_one, todo, chunksize=6)):
            if i % 50 == 0:
                print(f"frame {f} ({i + 1}/{len(todo)})", flush=True)


def cmd_encode():
    audio = os.path.join(OUT, "music.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{AUDIO_IN:.5f}", "-i", AUDIO, "-af",
                    f"afade=t=in:st=0:d=0.35,apad=whole_dur={NF / FPS:.3f},afade=t=out:st={NF / FPS - 0.06:.3f}:d=0.06",
                    "-t", f"{NF / FPS:.3f}", "-ar", "48000", audio], check=True)
    out = os.path.join(OUT, "reel.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "frames", "%04d.png"),
                    "-i", audio, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "24M", "-bufsize", "48M",
                    "-pix_fmt", "yuv420p", "-profile:v", "high", "-tune", "film", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart",
                    "-shortest", out], check=True)
    print(out)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "render"
    if cmd == "prep":
        cmd_prep()
    elif cmd == "still":
        cmd_still([int(x) for x in sys.argv[2:]])
    elif cmd == "beats":
        cmd_still(sorted({int(round(V(n) * FPS)) for n in range(0, 185, 4)}))
    elif cmd == "render":
        cmd_render(int(os.environ.get("WORKERS", "4")))
        cmd_encode()
    elif cmd == "encode":
        cmd_encode()
    else:
        print(__doc__)
