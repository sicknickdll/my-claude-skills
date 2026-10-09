# Portfolio — Cybercore Glitch Cut (20 s, 16:9)

**Engine:** HTML + WebGL2 (one glitch/CRT post-process shader over a 2D canvas scene), rendered frame-by-frame with Playwright, stitched with ffmpeg. Every frame is a pure function of `t`; all "randomness" is seeded by beat index so renders are exact and repeatable.

**Format:** 1920×1080, 30 fps, 600 frames, H.264 + AAC.

**Reference / medium:** Cybercore / Y2K terminal glitch. Think CRT monitor, broken VHS, datamosh, HUD reticles, katakana tags, and hard cuts on the beat.

**Palette:** near-black `#050505`, off-white `#EDEDED`, one accent taken from the portfolio. Fallback accent: acid red `#FF1E3C`. RGB-split fringes add the only extra colour.

**Type:** Anton for the slams, JetBrains Mono for the HUD/terminal, Noto Sans JP Black for the katakana tags.

**Banned:** crossfades, slow fades between scenes, bouncy or elastic easing, lens flares, particle bursts, matrix rain, neon gradients, centred text that just fades in, dead air longer than one beat, any motion that isn't tied to the beat grid.

## Audio

Track: *ice (slowed)* — ZERTAL. 107.7 BPM, beat = 0.5573 s, bar = 2.229 s.

Cut used: **1:42.62 → 2:02.62**.
- 0.00–4.46 s: the breakdown. The bass drops out and only the hats and the riser are left.
- **4.46 s = THE DROP** (track 1:47.08). This is the grid anchor.
- Beat *k* lands at `4.46 + k × 0.5573` s, and eighth-note hats fall halfway between beats.
- Audio: 30 ms fade-in, 0.6 s fade-out.

## Timeline

| Video time | Music | Scene | Visuals |
|---|---|---|---|
| 0.00–2.23 | breakdown, beats −8…−5 | **S0a BOOT** | Black, then a CRT line powers on. Terminal HUD types in: `> SIGNAL_LOST`, `> REBOOTING VISUAL CORTEX`, katakana tag `視覚 // 起動`. The portfolio's **anime eye** surfaces through static as a slit, with the lids nearly shut. Each beat: an 80 ms glitch tick (slice offset + RGB split) and the lids twitch a bit more open. A reticle locks onto the pupil. |
| 2.23–3.90 | beats −4…−2, riser | **S0b WAKE** | The eye widens in steps on each beat. Slow push-in (scale 1 → 1.6, ease-in), with static and chroma rising. |
| 3.90–4.46 | last beat before drop | **S0c DIVE** | The eye snaps **wide open** (small overshoot) and the pupil dilates. The camera accelerates *into the pupil* on an exponential zoom (×1.6 → ×60), with radial blur and the chroma split maxed. The last two frames invert to a white flash. |
| 4.46–6.69 | DROP, bar 1 | **S1 NAME SLAM** | Hard cut from white into black: we are *inside the eye*, in a tunnel of iris rings and grid rushing outward. The **name** slams in at full width, sliced into horizontal bands that shear on every beat and strobe-invert on the hats. |
| 6.69–8.92 | bar 2 | **S2 HERO** | The portfolio **hero section** sits in a CRT frame with scanlines and the role/title line in Anton. Each beat triggers a datamosh block displacement and a reticle re-lock. |
| 8.92–15.61 | bars 3–5 (12 beats) | **S3 PROJECTS** | Rapid fire at 2–3 beats per project (fit to the project count). Each one is a full-bleed project image with a glitch entry on the beat, the title in Anton, `[01/0N]` and the year in mono. Micro-glitches land on every hat, and there's a hard cut on every downbeat. |
| 15.61–17.84 | bar 6 | **S4 STACK** | Services/skills from the site strobe in one word per eighth note (8 words), over a frozen, datamoshed frame. |
| 17.84–20.00 | bar 7 | **S5 OUTRO** | Callback motif: the eye is back and **closes** on the first two beats. The name and `nicololombardi.framer.website` appear, then a CRT collapse to a line and a dot, ending on black at 20.00. |

## Content needed from the site

- [ ] Anime eye artwork (the original PNG/SVG, or a high-res screenshot)
- [ ] Name exactly as styled, and the role/title line
- [ ] Hero section screenshot
- [ ] Project names, years, and images (or screenshots of each)
- [ ] Services/skills list
- [ ] Accent colour

## Build

```bash
python3 -I tools/audio_features.py <track.mp3> audio   # cut.wav + src/audio.json
node tools/scrape.js                                     # site/ (screenshots, text, images)
node tools/render.js --stills 1.2,3.6,4.3,5.2            # review stills -> out/stills
node tools/render.js                                     # out/portfolio-cybercore.mp4
```

`src/dev/` holds throwaway placeholder assets, used only to exercise the pipeline (`--content dev/content.json`).
