"""Original 120 BPM cue for the GoMenu spot, synthesised from scratch (no samples).

D minor groove (Dm - Bb - F - C) that resolves to F major on the end card.
Cue times mirror the T / spring start times in index.html.

    python3 music.py            -> audio/music.wav (48 kHz stereo, 14 s)
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 14.0
BPM = 120
B = 60 / BPM  # 0.5 s per beat
N = int(SR * DUR)
rng = np.random.default_rng(7)

dry = np.zeros((N, 2))
rev_send = np.zeros((N, 2))
duck_src = []  # kick times for sidechain


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, kind, f, order=2):
    if kind == 'bp':
        sos = butter(order, [f[0], f[1]], 'bandpass', fs=SR, output='sos')
    else:
        sos = butter(order, f, kind, fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def place(sig, t0, gain=1.0, pan=0.0, send=0.0, bus=None):
    """Add mono/stereo sig at time t0 with equal-power pan."""
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], axis=1) * np.sqrt(2)
    n = min(len(sig), N - i0)
    target = dry if bus is None else bus
    target[i0:i0 + n] += sig[:n] * gain
    if send:
        rev_send[i0:i0 + n] += sig[:n] * gain * send


def tt(d):
    return np.arange(int(d * SR)) / SR


def saw(f, d, maxh=11000):
    t = tt(d)
    k = max(1, int(maxh // f))
    out = np.zeros_like(t)
    ph = 2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)
    for h in range(1, k + 1):
        out += np.sin(h * ph) / h
    return out * 0.6


# ── instruments ─────────────────────────────────────────────
def kick(t0, g=1.0):
    t = tt(0.5)
    f = 46 + 120 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17)
    click = filt(rng.standard_normal(len(t)), 'highpass', 3000) * np.exp(-t / 0.004) * 0.35
    place(np.tanh(1.6 * (body + click)) * 0.95, t0, g)
    duck_src.append(t0)


def clap(t0, g=1.0):
    t = tt(0.35)
    env = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.012 if o < 0.02 else 0.11))
    n = filt(rng.standard_normal(len(t)), 'bp', (900, 3200)) * env
    place(n * 0.55, t0, g, pan=0.0, send=0.35)


def hat(t0, g=1.0, open_=False, pan=0.25):
    t = tt(0.25 if open_ else 0.06)
    n = filt(rng.standard_normal(len(t)), 'highpass', 7500) * np.exp(-t / (0.09 if open_ else 0.018))
    place(n * 0.32, t0, g, pan=pan, send=0.05)


def bass(t0, m, d=0.22, g=1.0):
    f = midi(m)
    t = tt(d)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.16)
    s = filt(saw(f, d, 2500), 'lowpass', 520) * 0.8 + np.sin(2 * np.pi * f * t) * 0.7
    place(np.tanh(1.3 * s) * env * 0.55, t0, g)


def stab(t0, notes, d=0.32, g=1.0, bright=1.0, send=0.25):
    t = tt(d)
    out = np.zeros((len(t), 2))
    for m in notes:
        f = midi(m)
        for ch, det in ((0, -0.12), (1, 0.12)):
            s = saw(f * 2 ** (det / 12), d) + 0.7 * saw(f * 2 ** (-det * 0.4 / 12), d)
            out[:, ch] += s
    dark = filt(out, 'lowpass', 700)
    fenv = np.exp(-t / (0.07 * bright))[:, None]
    s = dark + (out - dark) * fenv * 0.8
    amp = (np.minimum(1, t / 0.003) * np.exp(-t / (d * 0.45)))[:, None]
    place(s * amp * 0.11 / max(1, len(notes) / 3), t0, g, send=send)


def pad(t0, notes, d, g=1.0, att=0.6, rel=0.8):
    t = tt(d)
    out = np.zeros((len(t), 2))
    for m in notes:
        f = midi(m)
        for ch, det in ((0, -0.08), (1, 0.08)):
            out[:, ch] += saw(f * 2 ** (det / 12), d, 4000)
    out = filt(out, 'lowpass', 1100)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel)
    place(out * env[:, None] * 0.05, t0, g, send=0.3, bus=pad_bus)


def blip(t0, m, g=1.0, d=0.12, pan=0.0):
    t = tt(d)
    f = midi(m)
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / (d * 0.3))
    s *= np.minimum(1, t / 0.002)
    place(s * 0.16, t0, g, pan=pan, send=0.25)


def tick(t0, g=1.0, f=2600, pan=0.0):
    t = tt(0.03)
    s = filt(rng.standard_normal(len(t)), 'bp', (f * 0.7, f * 1.4)) * np.exp(-t / 0.004)
    place(s * 0.35, t0, g, pan=pan)


def whoosh(t0, d, g=1.0, up=True):
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.02 * SR)
    for i in range(0, n, seg):
        p = i / n
        fc = (400 + 5000 * p ** 2) if up else (5400 - 5000 * p ** 0.5)
        out[i:i + seg] = filt(x[i:i + seg], 'bp', (fc * 0.6, min(fc * 1.6, 20000)), order=1)
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    place(out * env * 0.22, t0, g, send=0.3)


def riser(t0, d, g=1.0):
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.02 * SR)
    for i in range(0, n, seg):
        p = i / n
        fc = 300 + 7000 * p ** 2.2
        out[i:i + seg] = filt(x[i:i + seg], 'bp', (fc * 0.7, min(fc * 1.5, 20000)), order=1)
    env = np.linspace(0, 1, n) ** 2.5
    place(out * env * 0.3, t0, g, send=0.2)


def impact(t0, g=1.0):
    t = tt(1.6)
    boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-t / 0.06)) * t) * np.exp(-t / 0.5)
    crash = filt(rng.standard_normal(len(t)), 'highpass', 4000) * np.exp(-t / 0.45) * 0.25
    place(np.tanh(boom * 1.4) * 0.6, t0, g)
    place(crash, t0, g, send=0.5, pan=0.1)


pad_bus = np.zeros((N, 2))

# ── arrangement (bars of 2 s) ───────────────────────────────
DM = [62, 65, 69, 72]
BB = [58, 62, 65, 69]
FM = [57, 60, 64, 65]
CM = [55, 60, 64, 67]
FADD9 = [57, 60, 65, 67, 72]
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36}

# Bar 1 (0-2): hook. One hit per hook line, swelling pad, riser into the panel.
for i, t0 in enumerate((0.0, 0.5, 1.0)):
    kick(t0, 0.9)
    stab(t0, DM if i < 2 else [65, 69, 72, 77], d=0.45, g=1.1, bright=1.4, send=0.4)
    bass(t0, 38, d=0.4)
blip(1.5, 81, 0.7)                  # sub line
pad(0.0, [50, 57, 62, 65], 2.1, 0.8, att=0.3, rel=0.3)
riser(1.0, 1.0, 0.9)
for k in range(8):                   # 16th snare build in the last two beats
    clap(1.0 + k * 0.125, 0.18 + 0.07 * k)

# Bars 2-5 (2-10): groove. Dm, Bb, F, C
prog = [('Dm', DM), ('Bb', BB), ('F', FM), ('C', CM)]
STAB_RHYTHM = [0, 0.75, 1.5, 2.5, 3.25]  # in beats
for bar, (name, ch) in enumerate(prog):
    t_bar = 2.0 + bar * 2.0
    pad(t_bar, [n - 12 for n in ch[:3]], 2.05, 0.9)
    for b in range(4):
        tb = t_bar + b * B
        kick(tb)
        if b in (1, 3):
            clap(tb)
        hat(tb + B / 2, 1.0, open_=(b == 3), pan=0.2)
        hat(tb + B / 4, 0.35, pan=-0.3)
        hat(tb + 3 * B / 4, 0.35, pan=-0.3)
        bass(tb + B / 2, ROOT[name])
        if b == 0:
            bass(tb, ROOT[name] + 12, d=0.12, g=0.6)
    for s in STAB_RHYTHM:
        stab(t_bar + s * B, ch, g=0.95)

# Bar 6 (10-11): QR scene, Bb -> C, drums drop at 10.5 into the reveal
for b in range(2):
    tb = 10.0 + b * B
    kick(tb)
    if b == 1:
        clap(tb)
    hat(tb + B / 2, 0.9)
    bass(tb + B / 2, ROOT['Bb'])
stab(10.0, BB, g=0.95)
stab(10.5, CM, d=0.5, g=1.0, bright=1.6)
riser(10.0, 1.0, 1.1)
for k in range(4):
    clap(10.5 + k * 0.125, 0.3 + 0.12 * k)

# Bar 6.5-7 (11-12): end card lands on F major
impact(11.0)
kick(11.0, 1.1)
stab(11.0, FADD9, d=0.9, g=1.3, bright=2.5, send=0.5)
pad(11.0, [53, 57, 60, 64], 3.0, 1.2, att=0.05, rel=1.6)
for b in range(1, 4):
    tb = 11.0 + b * B
    if tb >= 12.0:
        break
    kick(tb, 0.85)
    if b == 1:
        clap(tb, 0.8)
    hat(tb + B / 2, 0.8)
    bass(tb + B / 2, 41)
bass(11.0, 29, d=0.9, g=1.0)
# Bar 7 (12-14): final hit and ring-out
kick(12.0, 1.0)
bass(12.0, 29, d=1.6, g=0.9)
stab(12.0, [57, 60, 64, 65, 72], d=1.6, g=1.1, bright=3.0, send=0.7)
blip(12.5, 84, 0.6)                  # CTA

# ── UI sounds on the visual cues ────────────────────────────
whoosh(1.95, 0.55, 0.9)              # cream panel rises
for i in range(4):                   # chips
    blip(2.97 + i * 0.125, [74, 77, 81, 84][i], 0.45, d=0.08, pan=-0.2 + 0.15 * i)
whoosh(5.7, 0.6, 0.6)                # zoom in
tick(6.5, 1.0, 1800)                 # tap
blip(6.5, 86, 0.5, d=0.06)
for k in range(2):                   # digit roll
    tick(6.6 + k * 0.125, 0.8, 3200, pan=0.2)
for k in range(3):                   # allergen chips
    blip(7.22 + k * 0.125, [81, 84, 88][k], 0.55, d=0.1, pan=-0.3 + 0.3 * k)
whoosh(7.7, 0.6, 0.5, up=False)      # zoom out
whoosh(8.4, 0.4, 0.7)                # accent wipe
for k, m in enumerate([74, 77, 81, 86, 89]):  # QR resolves
    blip(9.0 + k * 0.0625, m, 0.4, d=0.1, pan=0.2 * (k - 2))
URL = 'laterraza.gomenu.click'
for i in range(1, len(URL) + 1):  # typing ticks at the instants the JS reveals each char
    t = 9.52 + (i - 0.5) / len(URL) * 0.7
    tick(t, 0.45, 4200 + 300 * (i % 3), pan=0.1 * ((i % 5) - 2))
tick(9.97, 1.0, 1500)                # brackets snap
whoosh(10.55, 0.45, 0.8)             # tile grows to fill

# ── mix ─────────────────────────────────────────────────────
t = np.arange(N) / SR
duck = np.ones(N)
for k in duck_src:
    m = t >= k
    duck[m] = np.minimum(duck[m], 1 - 0.55 * np.exp(-(t[m] - k) / 0.11))
dry += pad_bus * duck[:, None]

ir_t = np.arange(int(1.4 * SR)) / SR
ir = np.stack([rng.standard_normal(len(ir_t)), rng.standard_normal(len(ir_t))], 1) * np.exp(-ir_t / 0.32)[:, None]
ir = filt(ir, 'lowpass', 5000) * 0.03
wet = np.stack([fftconvolve(rev_send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = dry + wet
mix = filt(mix, 'highpass', 28)
mix = mix - 0.3 * filt(mix, 'lowpass', 90)  # tame the sub so phone speakers keep the mids
fade = np.minimum(1, (DUR - t) / 0.6)[:, None]
mix *= fade
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix /= np.max(np.abs(mix)) / 0.89

os.makedirs(os.path.join(os.path.dirname(__file__) or '.', 'audio'), exist_ok=True)
out = os.path.join(os.path.dirname(__file__) or '.', 'audio', 'music.wav')
pcm = (mix * 32767).astype('<i2')
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out)
