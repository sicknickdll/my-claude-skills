---
name: babble-audio
description: Generates the soundtrack for an explainer video - an unintelligible Animal Crossing-style "babble" voice that speaks in the rhythm of the subtitles, plus procedural background music - and the matching subtitles.srt. Use when a video needs voice, music, subtitle timing, or "animalese"-style text-to-speech.
---

# Babble audio

`scripts/babble.py` (numpy + stdlib only; ffmpeg optional for MP3/AAC) turns a cue list into:

| File | What |
|---|---|
| `voice.wav` | cute babble voice: each letter = a chirpy vowel blip at a fixed fast pace from the start of each cue, punctuation = pauses, questions rise, `!` lifts pitch |
| `music.wav` | I–V–vi–IV loop: bass, pad, plucky arpeggio, soft thump; fades out |
| `mix.wav` | voice + music, music ducked under speech — **use this in the video** |
| `subtitles.srt`, `cues.json` | exact timing of every cue and of every word (`words`); the video's captions **must** use these |

## Steps
1. Turn the script into `content/<slug>/audio/script.txt`: **one subtitle cue per line, 2–6 words**, split on natural breath points, first line "Did you know?". Keep punctuation (it creates pauses). `*word*` highlights a word in the captions and isn't spoken.
2. Run:
   ```
   python3 .claude/skills/babble-audio/scripts/babble.py content/<slug>/audio/script.txt \
     --out content/<slug>/audio --duration 30 --voice cute --bpm 100 --key 0
   ```
3. Check `cues.json`: every cue should be on screen ≥0.8s and ≤3.5s. If cues are too slow, the script is too short for the duration; if too fast, cut words (ask the researcher) — don't speed past readability.
4. Report the files and settings used.

## Knobs (keep them in `content/BRAND.md` so the channel sounds consistent)
- `--voice` **the channel mascot — always `cute` unless the user changes it.** Presets are fixed in `VOICES` at the top of `babble.py` (pitch ~560 Hz, small-mouth formants, chirpy syllable attack, fast Animal Crossing pace). Each letter has a fixed melody, so output is fully deterministic: the same line sounds identical in every video. `cute-low` and `tiny` exist for an occasional second character. Never tweak the preset per video.
- `--bpm`, `--key` music tempo/key; `--music-level` (default 0.35); `--gap` pause between cues; `--seed` variation.
- Mood: bright = major key, 100–115 bpm; mysterious/history = minor-feel key and bpm 80–90 (voice stays `cute`).

If the user supplies their own music track, use only `voice.wav` and mix with ffmpeg (`amix`, music at ~-18 dB, `sidechaincompress` for ducking).
