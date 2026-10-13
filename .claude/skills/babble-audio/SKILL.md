---
name: babble-audio
description: Generates the soundtrack for an explainer video - an unintelligible Animal Crossing-style "babble" voice that speaks in the rhythm of the subtitles, plus procedural background music - and the matching subtitles.srt. Use when a video needs voice, music, subtitle timing, or "animalese"-style text-to-speech.
---

# Babble audio

`scripts/babble.py` (numpy + stdlib only; ffmpeg optional for MP3/AAC) turns a cue list into:

| File | What |
|---|---|
| `voice.wav` | babble voice: each letter = a pitched vowel blip, spaces/punctuation = pauses, questions rise in pitch |
| `music.wav` | I–V–vi–IV loop: bass, pad, plucky arpeggio, soft thump; fades out |
| `mix.wav` | voice + music, music ducked under speech — **use this in the video** |
| `subtitles.srt`, `cues.json` | exact timing of every cue; the video's captions **must** use these |

## Steps
1. Turn the script into `content/<slug>/audio/script.txt`: **one subtitle cue per line, 2–6 words**, split on natural breath points. Keep punctuation (it creates pauses).
2. Run:
   ```
   python3 .claude/skills/babble-audio/scripts/babble.py content/<slug>/audio/script.txt \
     --out content/<slug>/audio --duration 30 --pitch 330 --bpm 100 --key 0
   ```
3. Check `cues.json`: every cue should be on screen ≥0.8s and ≤3.5s. If cues are too slow, the script is too short for the duration; if too fast, cut words (ask the researcher) — don't speed past readability.
4. Report the files and settings used.

## Knobs (keep them in `content/BRAND.md` so the channel sounds consistent)
- `--pitch` voice character: 220 deep/calm, 330 default, 420 squeaky. Different characters = different pitches.
- `--bpm`, `--key` music tempo/key; `--music-level` (default 0.35); `--gap` pause between cues; `--seed` variation.
- Mood: bright = major key, 100–115 bpm; mysterious/history = lower pitch and bpm 80–90.

If the user supplies their own music track, use only `voice.wav` and mix with ffmpeg (`amix`, music at ~-18 dB, `sidechaincompress` for ducking).
