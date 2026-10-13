"""Per-frame loudness of voice.wav (0..1) -> JSON list, drives the mascot's mouth."""
import json, sys, wave
import numpy as np
wav, fps, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
with wave.open(wav) as w:
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), "<i2") / 32768
hop = int(sr / fps)
env = [float(np.sqrt(np.mean(x[i:i + hop] ** 2))) for i in range(0, len(x), hop)]
m = max(env) or 1
json.dump([round(min(1, e / m * 1.6), 3) for e in env], open(out, "w"))
