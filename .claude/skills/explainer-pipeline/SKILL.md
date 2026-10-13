---
name: explainer-pipeline
description: Orchestrates the full TikTok/Instagram educational explainer workflow - research a topic, package it for social, then render the motion graphic. Use when the user says "make a video about X", "next episode", or wants to run the whole channel pipeline.
---

# Explainer pipeline

Four subagents, one folder per video: `content/<slug>/`.

| Step | Agent | Reads | Writes |
|---|---|---|---|
| 1. Research + script | `topic-researcher` | topic | `RESEARCH.md` |
| 2. Social package | `social-media-manager` | `RESEARCH.md` | `POST.md` |
| 3. Audio | `audio-designer` | `RESEARCH.md`, `content/BRAND.md` | `audio/mix.wav`, `audio/subtitles.srt`, `audio/cues.json` |
| 4. Video | `motion-explainer` | `RESEARCH.md`, `POST.md`, `audio/`, `content/BRAND.md` | `render/<slug>.mp4` |

## Run
1. Make a kebab-case slug for the topic and create `content/<slug>/`.
2. Run `topic-researcher`. Show the user the hook options + 30-second script; **wait for approval** (accuracy check is theirs to sign off).
3. Run `social-media-manager` on the approved research.
4. Run `audio-designer` (babble voice + music + subtitle timing). Let the user listen to `mix.wav`.
5. Run `motion-explainer`; it will ask for storyboard approval per its skill.
6. Finish with: video path, captions for both platforms, hashtags, posting time.

First time only: ask `social-media-manager` for account setup + `content/CALENDAR.md`, and settle `content/BRAND.md` (palette, fonts, intro/outro) with `motion-explainer` and `audio-designer` (voice preset `cute`, bpm, key).
