# Portfolio cybercore reel

A 25-second, 16:9 glitch/cybercore promo for [nicolo-lombardi.com](https://nicolo-lombardi.com/), cut to 2hollis' "poster boy". Made with the `code-motion-studio` skill: every frame is a pure function of time, rendered from code.

- `STORYBOARD.md`: the brief, the beat grid and the scene-by-scene plan.
- `record.js`: frame-exact captures of the live site. Playwright runs with a virtualised clock (`performance.now`, `requestAnimationFrame`, CSS animations and `<video>` all follow a virtual time we step by hand).
- `reel.py`: the compositor (NumPy + OpenCV + Pillow). It handles the eyelid warp and pupil dive, the glitch library (RGB split, tears, macroblocks, 1-bit dither, thermal, the site's pixel curtain), the HUD, the logo strobe, the monitor wall, triptychs and the edit decision list on the 111 BPM grid. Its output is encoded with ffmpeg.

## Rebuild

The project needs Node + Playwright (Chromium), Python 3 with `numpy opencv-python-headless scipy pillow`, ffmpeg, and the fonts Liberation Sans, Unifont and DejaVu Sans Mono.

```bash
export REEL_SCRATCH=/path/to/work        # big intermediates live here, not in git
mkdir -p $REEL_SCRATCH/{assets/eye,assets/videos,assets/clients,audio,rec}
# 1. assets from the site: assets/eye/anime-eye.mp4, the project .mp4s (see FILES in reel.py)
#    and assets/clients/*.webp. Copy the music to audio/track.wav (not in the repo).
# 2. live-site captures (about 8 min)
NODE_PATH=$(npm root -g) node record.js $REEL_SCRATCH/rec
# 3. clip segments, then stills for review, then the full render (about 5 min on 4 cores)
python3 reel.py prep
python3 reel.py beats            # one still per beat -> $REEL_SCRATCH/out/stills
python3 reel.py render           # -> $REEL_SCRATCH/out/reel.mp4
```

## Notes

- **Soap & Glory** appears only as a logo, in the client sequence (and on the About panel's client strip it zooms past). None of its imagery is used, the `/visuals/` page is never recorded, and no page is scrolled down to a "Next project: Soap & Glory" link.
- The music is the user's file. It is not committed here; the reel trims it to source 5.291 s → 30.246 s, so the video ends on the bar where the clip cuts out.
- Web captures run at device scale 1.5 (2880×1620), so the compositor can push in without blur.
