#!/usr/bin/env python3
"""Animal Crossing-style "babble" voice + procedural music, timed to subtitles.

Input: a text file, one subtitle cue per line (keep cues short, <= ~6 words).
Outputs into --out: voice.wav, music.wav, mix.wav, subtitles.srt, cues.json

Every letter becomes a short pitched vowel blip; spaces and punctuation are
pauses. The speech is intentionally unintelligible - the rhythm follows the
subtitles exactly, so captions on screen carry the meaning.
Only needs numpy + the standard library.
"""
import argparse, json, wave
from pathlib import Path
import numpy as np

SR = 44100
# rough vowel formants (F1, F2) in Hz
VOWELS = {"a": (800, 1200), "e": (500, 1900), "i": (320, 2300), "o": (500, 900), "u": (350, 800)}
LETTER_VOWEL = {c: v for v, cs in {"a": "ahjkqr", "e": "bcdeglptvz", "i": "fimnsxy", "o": "ow", "u": "u"}.items() for c in cs}
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)


# The channel mascot voice. Fixed values = the same character in every video.
# Change these only on purpose (and note it in content/BRAND.md).
VOICES = {
    # name: base pitch Hz, formant shift (>1 = smaller/cuter), seconds per letter, chirp (start pitch boost)
    "cute": dict(pitch=560, formant=1.35, rate=0.058, chirp=0.35),
    "cute-low": dict(pitch=440, formant=1.25, rate=0.062, chirp=0.25),
    "tiny": dict(pitch=680, formant=1.45, rate=0.052, chirp=0.4),
}
# fixed melody per letter (semitones) - the same word always "sounds" the same
LETTER_SEMI = {c: [0, 3, 5, 2, 7, 4, 0, 5, 3, 7, 2, 4, 0][i % 13] - 3 for i, c in enumerate("aeioubcdfghjklmnpqrstvwxyz")}


def blip(f0, vowel, dur, v):
    """One cute syllable: a quick downward pitch chirp into a bright, small-mouthed vowel."""
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + v["chirp"] * np.exp(-t / 0.012)) * (1 + 0.02 * np.sin(2 * np.pi * 9 * t))
    phase = 2 * np.pi * np.cumsum(f) / SR
    f1, f2 = (x * v["formant"] for x in VOWELS[vowel])
    out = np.zeros_like(t)
    for h in range(1, 16):
        fh = f0 * h
        if fh > SR / 2.2:
            break
        amp = (np.exp(-((fh - f1) / 260) ** 2) + 0.7 * np.exp(-((fh - f2) / 380) ** 2) + 0.08) / h ** 0.9
        out += amp * np.sin(h * phase)
    env = np.minimum(1, t / 0.004) * np.exp(-2.2 * t / dur) * np.minimum(1, (dur - t) / 0.008)
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


def voice(cues, total, v):
    """Letters are spoken at the character's fixed speed from the start of each cue,
    like Animal Crossing: quick burst, then the caption stays up in silence."""
    buf = np.zeros(int(total * SR) + SR)
    for cue in cues:
        text = cue["text"].lower()
        units = sum(1 if ch.isalpha() else 2.5 if ch in ",;:.!?" else 0.5 for ch in text) or 1
        step = min(v["rate"], (cue["end"] - cue["start"]) * 0.95 / units)  # squeeze only if needed
        t, n = cue["start"], 0
        question, excited = text.rstrip().endswith("?"), text.rstrip().endswith("!")
        for ch in text:
            if ch.isalpha():
                f0 = v["pitch"] * 2 ** (LETTER_SEMI.get(ch, 0) / 12)
                if question:
                    f0 *= 1 + 0.03 * n  # rising, curious
                elif excited:
                    f0 *= 1.12
                b = blip(f0, LETTER_VOWEL.get(ch, "a"), step * 0.9, v)
                s = int(t * SR)
                buf[s:s + len(b)] += b
                t += step
                n += 1
            else:
                t += step * (2.5 if ch in ",;:.!?" else 0.5)
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
    p.add_argument("--voice", default="cute", choices=sorted(VOICES), help="channel character voice (keep the same for every video)")
    p.add_argument("--bpm", type=float, default=100.0)
    p.add_argument("--key", type=int, default=0, help="semitones above C")
    p.add_argument("--gap", type=float, default=0.25, help="silence between cues (s)")
    p.add_argument("--music-level", type=float, default=0.35)
    p.add_argument("--seed", type=int, default=7)
    a = p.parse_args()

    lines = [l.strip() for l in Path(a.script).read_text().splitlines() if l.strip()]
    cues = timeline(lines, a.duration, a.gap)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

    v = norm(voice(cues, a.duration, VOICES[a.voice]), 0.9)
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
