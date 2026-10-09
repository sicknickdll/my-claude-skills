"""Cut the track and export per-frame audio features for the renderer.

Usage: python3 -I tools/audio_features.py <track.mp3> <out_dir>
Writes <out_dir>/cut.wav (20 s) and src/audio.json (per-frame bands + onsets).
"""
import json, subprocess, sys
import numpy as np
import librosa

SRC, OUT = sys.argv[1], sys.argv[2]
START, DUR, FPS = 102.62, 20.0, 30
DROP_TRACK = 107.08          # first kick of the drop (measured)
BPM = 107.666

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(START), "-t", str(DUR), "-i", SRC,
                "-af", "afade=t=in:d=0.03,afade=t=out:st=19.4:d=0.6", "-ar", "48000", f"{OUT}/cut.wav"], check=True)

y, sr = librosa.load(SRC, sr=44100, mono=True, offset=START, duration=DUR)
hop = sr // FPS // 4                                   # 4 analysis hops per video frame
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
bands = {"low": f < 120, "mid": (f >= 150) & (f < 2000), "high": f >= 4000}
nfr = int(DUR * FPS)
out = {}
for name, m in bands.items():
    e = S[m].sum(0)
    e = e / np.percentile(e, 99)
    # max-pool to video frames so a 1-frame transient is never lost
    pooled = [float(np.clip(e[i * 4:(i + 1) * 4].max(), 0, 1.5)) for i in range(nfr)]
    out[name] = [round(v, 3) for v in pooled]

def onsets(mask, delta_q, wait):
    e = S[mask].sum(0)
    d = np.maximum(np.diff(e, prepend=e[0]), 0)
    pk = librosa.util.peak_pick(d, pre_max=6, post_max=6, pre_avg=24, post_avg=24,
                                delta=np.percentile(d, delta_q) * 0.5, wait=wait)
    return [round(float(t), 3) for t in librosa.frames_to_time(pk, sr=sr, hop_length=hop)]

out.update({
    "fps": FPS, "duration": DUR, "start": START,
    "drop": round(DROP_TRACK - START, 3), "beat": round(60 / BPM, 5),
    "kicks": onsets(bands["low"], 92, 10),
    "snares": onsets((f > 1500) & (f < 6000), 96, 14),
})
json.dump(out, open("src/audio.json", "w"))
print("drop", out["drop"], "kicks", len(out["kicks"]), "snares", len(out["snares"]))
print("kicks", out["kicks"][:30])
print("snares", out["snares"][:30])
