# Nicoló Lombardi — Cybercore Portfolio Reel

25.000 s · 1920×1080 (16:9) · 30 fps · music: 2hollis, "poster boy" (user-supplied)

## Brief

- **Reference/medium:** hyperpop / rage music-video edit meets cybercore screen-capture. Monochrome like the site (black, white, the halftone anime eye) with one accent, signal red `#FF2A2A`, plus the red/cyan fringes from RGB-split glitches. CRT scanlines, 1-bit dither, the site's own black-and-white "pixel curtain" squares used as the glitch vocabulary.
- **Engine:** Playwright (frame-exact captures of the live site, using virtual time) + Python/NumPy/OpenCV compositor + ffmpeg. Every frame is a pure function of time.
- **Motif:** THE EYE. It opens at the start, the camera dives into the pupil, eyes come back through the cut (KTB owl eye, anime eyes, balaclava eyes), and the eye slams shut on the last hit.
- **Banned:** cross-dissolves and slow fades in the drop, matrix rain, lens flares, particle bursts, light leaks, spinning sci-fi HUD circles, bouncy or elastic easing, centred text on a gradient, identical glitch presets on every cut (parameters are seeded per cut), any hold longer than 1 beat after the drop, invented claims (all text comes from the site).
- **Hard rule:** no Soap & Glory imagery. Its logo appears once, in the client-logo sequence only. The `/visuals/` page (which opens on Soap & Glory) is never recorded, and the WPP page is never scrolled down to its "Next project: Soap & Glory" link.

## Music edit and beat grid

- Track analysis (numpy/scipy spectral flux + comb filter): **111.0 BPM**, grid origin 0.021 s. Silence gaps before bars 2/4/6/10/12/13 land exactly on the grid, which confirms it.
- Structure of the 30.25 s clip: intro arpeggio (bars 0–6) → gated stutter **break** (bar 7, 15.14 s) → 808 **drop** (bar 8, 17.32 s) → to the end.
- **Edit:** source 5.291 s → 30.246 s, plus 45 ms of silence, so the reel ends exactly on the downbeat where the track cuts out. Quick fade-in at the head.
- Timeline unit: one 16th note, `n`. `v = n × 0.135135 s`, frame = `n × 4.054`. The reel is n = 0…185.
- Drop pattern per bar (16th offsets): **0, 3, 4, 6, 8, 10, 12** (808 + clap). Cuts and punches land on these.

| bar | n | time (s) | music |
|---|---|---|---|
| 2 (tail) | 0 | 0.000 | intro arp, fading in |
| 3 | 9 | 1.216 | downbeat |
| 4 | 25 | 3.378 | phrase start (silence 3.31–3.38) |
| 5 | 41 | 5.541 | |
| 6 | 57 | 7.703 | phrase start (silence 7.60–7.72) |
| 7 | 73 | 9.865 | **break**: gated 16th stutter |
| 8 | 89 | 12.027 | **DROP** |
| 9 | 105 | 14.189 | |
| 10 | 121 | 16.351 | (silence 16.29–16.37) |
| 11 | 137 | 18.514 | stutter at the end of the bar |
| 12 | 153 | 20.676 | |
| 13 | 169 | 22.838 | last bar (silence 22.78–22.85) |
| end | 185 | 25.000 | track cuts out |

## Scenes

### S1 · The eye opens (n 0–25 · 0.00–3.38 s)
- **n 0–9:** black. CRT power-on flicker. Source: the site's hero `anime-eye` video. The eyelid is drawn almost shut by a per-column lid warp (the real lash line slides down over the eye). Two small lid flutters on the beats (n 1, n 5). Tiny HUD types in: `NICOLO-LOMBARDI.COM`, a red REC dot, a running timecode.
- **n 9 (bar 3 downbeat):** **SNAP.** The lids fly open past their rest position, so the eye goes *wide* (stretched aperture, slight bloat). 1-frame flash, 30 px RGB split, slice glitch.
- **n 9–24.5:** the camera dives into the black pupil. Zoom 1× to 22× on an exponential ease, the centre drifting from the eye to the pupil, radial zoom blur growing with speed, and the halftone dots blowing up into a pixel grid. A thin reticle (PUPIL LOCK) locks onto the pupil. Inside the pupil, the site's black/white/red pixel squares stream out at us like a hyperspace tunnel.
- **n 24.5–25 (silence):** pure black. We are inside the eye.

### S2 · Inside: the site boots (n 25–57 · 3.38–7.70 s)
- **n 25–33:** live **home page** capture: the eye hero video with the NICOLÓ LOMBARDI letter-reveal animation and "AI Production Specialist". It starts at 1.6× and pulls back to 1.0×: we come out of the eye *into* the eye.
- **n 33–41:** **snap-scroll** down the home page: UNCOMMONSENSE, Malik Cross (BIONIC AWARDS), Toyota, Lexus, one snap per 8th note. The site's next-project logo cursor rides on the right. Motion smear on each snap.
- **n 41–57:** **project pages with their videos playing** (live captures): UNCOMMONSENSE carousel sliding, then El Águila carousel, then Kill the Boy carousel, then Meliá. A hard cut per beat, with glitch on the 8ths. Black flash in the silence before bar 6.

### S3 · Monitor wall (n 57–73 · 7.70–9.87 s)
- **n 57:** 2×2 "CCTV wall" of four live site pages playing at once (Malik Cross page, UNCOMMONSENSE carousel, Kill the Boy carousel, the home page), each tile labelled (CAM_01…04). Tiles power on one by one; a tile glitches or inverts on the 8ths.
- **n 64–66.5:** push into the home-page tile until it fills the frame.
- **n 69:** the cursor clicks **about**. The site's real **pixel-curtain** transition covers the screen.

### S4 · Break: client logos (n 73–89 · 9.87–12.03 s)
- **n 73–75:** the about panel's "Selected clients" strip (live capture), a fast push-in.
- **n 75–88:** **all 14 client logos, one per 16th note**, slammed full-frame in white on black with jitter, RGB split and slice shifts. They strobe with the gated stutter (the screen darkens or inverts during each audio gap). Order as on the site: Coca-Cola, Heineken, Lexus, Toyota, Boots, Soap & Glory, Meliá, El Águila, Osborne, Anaya, WPP Production, Wichita, Graphomedia, UNCOMMONSENSE.
- **n 88.6–89:** white-out into the drop.

### S5 · Drop: the work (n 89–153 · 12.03–20.68 s)
Hard cuts on the 808 pattern (0, 3, 4, 6, 8, 10, 12). Every hit gets a zoom punch, a flash and an RGB split, decaying over about 5 frames. Small HUD label per project (brand + type, from the site).
- **Bar 8 (Malik Cross, B&W boxing):** sweat-spray head snap, the punch, the X-ray arm, the scream, the Malik Cross *site page* playing, red gloves, the thermal hood.
- **Bar 9 (Kill the Boy VFX + WPP Virtual Production):** owl eye (eye rhyme), burning building, the KTB *site carousel*, LED-volume set, neon rain, confetti ring. Black in the silence before bar 10.
- **Bar 10 (UNCOMMONSENSE):** the *site carousel* with videos playing, then a vertical triptych: claw machine, crematorium fire, photo-booth man, anime girl wide-eyed (eye rhyme), balaclava eyes, frozen fridge.
- **Bar 11 (Lexus / El Águila / Meliá):** Lexus *site page*, orange SUV on the road, El Águila *site carousel*, the Meliá glitch face, the Seville skyline, the highway, then a stutter strobe into bar 12.

### S6 · Overdrive and close (n 153–185 · 20.68–25.00 s)
- **Bar 12:** a 16th-note flash montage of the best frames, interleaved with huge site-style type: AI FILMMAKER, CREATIVE TECHNOLOGIST, ART DIRECTOR (from the site bio). Pixel-curtain squares invade the frame. Black in the silence before bar 13.
- **Bar 13:** we exit through the pupil (reverse zoom out of the eye). NICOLÓ LOMBARDI locks up over the eye in the site's typography, with AI PRODUCTION SPECIALIST and NICOLO-LOMBARDI.COM. Glitch punches land on the 808s. **n 181 (last hit): the eye slams shut.** Black, with the URL flickering on the last hats. Ends at 25.000 s on the track's cut.

## Self-check plan
1. Render one still per scene and check eye geometry, lid warp, type legibility and safe margins.
2. Before the full render, render one frame per beat (46 stills) and check against this board.
3. Full render. Sample one frame every 45 and review. Verify A/V sync on the drop (frame 361) and the eye-close (n 181, frame 734).
4. Scan every frame for Soap & Glory imagery, which should appear only in the logo slot (n 80).
