#!/usr/bin/env python3
"""Animal Crossing-style "babble" voice + procedural music, timed to subtitles.

Input: a text file, one subtitle cue per line (keep cues short, <= ~6 words).
Outputs into --out: voice.wav, music.wav, mix.wav, subtitles.srt, cues.json

Every letter becomes a short pitched vowel blip; spaces and punctuation are
pauses. The speech is intentionally unintelligible - the rhythm follows the
subtitles exactly, so captions on screen carry the meaning.
Only needs numpy + the standard library.
"""
import argparse, json, random, wave
from pathlib import Path
import numpy as np

SR = 44100
# rough vowel formants (F1, F2) in Hz
VOWELS = {"a": (800, 1200), "e": (500, 1900), "i": (320, 2300), "o": (500, 900), "u": (350, 800)}
LETTER_VOWEL = {c: v for v, cs in {"a": "ahjkqr", "e": "bcdeglptvz", "i": "fimnsxy", "o": "ow", "u": "u"}.items() for c in cs}
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)


def blip(f0, vowel, dur, rng):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + 0.04 * np.sin(2 * np.pi * 6 * t)) * (1 + rng.uniform(-0.03, 0.03))
    phase = 2 * np.pi * np.cumsum(f) / SR
    f1, f2 = VOWELS[vowel]
    out = np.zeros_like(t)
    for h in range(1, 24):  # additive harmonics shaped by two formant peaks
        fh = f0 * h
        if fh > SR / 2.2:
            break
        amp = (np.exp(-((fh - f1) / 180) ** 2) + 0.6 * np.exp(-((fh - f2) / 260) ** 2) + 0.05) / h ** 0.6
        out += amp * np.sin(h * phase)
    a = int(0.006 * SR)
    env = np.ones_like(t)
    env[:a] = np.linspace(0, 1, a)
    env *= np.exp(-3.5 * t / dur)
    return out * env


def timeline(cues, total, gap):
    """Spread cues over `total` seconds proportional to character count."""
    weights = [max(len(c), 4) for c in cues]
    speak = total - gap * (len(cues) + 1)
    if speak <= 0:
        raise SystemExit("too many cues for the duration; shorten text or raise --duration")
    t, out = gap, []
    for c, w in zip(cues, weights):
        d = speak * w / sum(weights)
        out.append({"text": c, "start": round(t, 3), "end": round(t + d, 3)})
        t += d + gap
    return out


def voice(cues, total, pitch, rng):
    buf = np.zeros(int(total * SR) + SR)
    for cue in cues:
        text = cue["text"]
        units = sum(1 if ch.isalpha() else 2 if ch in ",;:" else 3 if ch in ".!?" else 0.6 for ch in text) or 1
        step = (cue["end"] - cue["start"]) / units
        t = cue["start"]
        question = text.rstrip().endswith("?")
        for ch in text.lower():
            if ch.isalpha():
                semis = (ord(ch) - 97) % 5 - 2 + rng.choice([0, 0, 1, -1])
                f0 = pitch * 2 ** (semis / 12)
                if question:  # rise toward the end of a question
                    f0 *= 1 + 0.25 * (t - cue["start"]) / max(cue["end"] - cue["start"], 1e-3)
                b = blip(f0, LETTER_VOWEL.get(ch, "a"), min(step * 0.85, 0.09), rng)
                s = int(t * SR)
                buf[s:s + len(b)] += b
                t += step
            else:
                t += step * (2 if ch in ",;:" else 3 if ch in ".!?" else 0.6)
    return buf[: int(total * SR)]


def music(total, bpm, key, rng):
    n = int(total * SR)
    buf = np.zeros(n + SR * 2)
    beat = 60 / bpm
    prog = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]  # I V vi IV
    root = 48 + key

    def tone(freq, dur, kind="tri", decay=3.0, vol=1.0):
        t = np.arange(int(dur * SR)) / SR
        ph = (freq * t) % 1
        w = 2 * np.abs(2 * ph - 1) - 1 if kind == "tri" else np.sin(2 * np.pi * freq * t)
        return vol * w * np.exp(-decay * t) * np.minimum(1, t / 0.01)

    def add(x, at):
        s = int(at * SR)
        buf[s:s + len(x)] += x[: max(0, len(buf) - s)]

    bar, t = 0, 0.0
    while t < total:
        chord = prog[bar % 4]
        add(tone(NOTE(root - 12 + chord[0]), beat * 4, "sine", 0.8, 0.5), t)  # bass
        for c in chord:  # soft pad
            add(tone(NOTE(root + 12 + c), beat * 4, "sine", 0.6, 0.08), t)
        for k in range(8):  # plucky arpeggio in 8ths
            c = chord[[0, 1, 2, 1][k % 4]] + (12 if k >= 4 else 0)
            add(tone(NOTE(root + 24 + c), beat * 0.6, "tri", 7, 0.12 * rng.uniform(0.8, 1)), t + k * beat / 2)
        for k in range(4):  # soft kick-ish thump on each beat
            add(tone(55 * (1.6 if k % 2 else 1), 0.15, "sine", 25, 0.35), t + k * beat)
        bar += 1
        t += beat * 4
    out = buf[:n]
    f = int(1.5 * SR)
    out[-f:] *= np.linspace(1, 0, f)
    return out


def norm(x, peak):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def write(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def srt_time(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("script", help="text file, one subtitle cue per line")
    p.add_argument("--out", default=".")
    p.add_argument("--duration", type=float, default=30.0)
    p.add_argument("--pitch", type=float, default=330.0, help="voice base pitch Hz (220 deep, 400 squeaky)")
    p.add_argument("--bpm", type=float, default=100.0)
    p.add_argument("--key", type=int, default=0, help="semitones above C")
    p.add_argument("--gap", type=float, default=0.25, help="silence between cues (s)")
    p.add_argument("--music-level", type=float, default=0.35)
    p.add_argument("--seed", type=int, default=7)
    a = p.parse_args()

    rng = random.Random(a.seed)
    lines = [l.strip() for l in Path(a.script).read_text().splitlines() if l.strip()]
    cues = timeline(lines, a.duration, a.gap)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

    v = norm(voice(cues, a.duration, a.pitch, rng), 0.9)
    m = norm(music(a.duration, a.bpm, a.key, np.random.default_rng(a.seed)), 0.9)
    # duck music while the voice talks
    env = np.convolve(np.abs(v), np.ones(4410) / 4410, mode="same")
    duck = 1 - 0.5 * np.clip(env / (env.max() or 1) * 4, 0, 1)
    write(out / "voice.wav", v)
    write(out / "music.wav", m)
    write(out / "mix.wav", norm(v * 0.8 + m * a.music_level * duck, 0.95))

    (out / "cues.json").write_text(json.dumps(cues, indent=2))
    (out / "subtitles.srt").write_text("".join(
        f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n\n" for i, c in enumerate(cues, 1)))
    print(f"wrote {len(cues)} cues, {a.duration}s -> {out}")


if __name__ == "__main__":
    main()
