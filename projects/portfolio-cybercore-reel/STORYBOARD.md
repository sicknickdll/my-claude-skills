# Nicoló Lombardi — Cybercore Portfolio Reel

30.87 s (the full 30.27 s track + 0.6 s end card in silence) · 1920×1080 (16:9) · 30 fps · music: 2hollis, "poster boy" (user-supplied)

**v2 changes:** the reel uses the whole track. The title NICOLÓ LOMBARDI comes first; the eye then opens and the dive goes straight through the tunnel into the portfolio, with no cut back to the home page. The "about" click happens on a project page, so the eye never repeats mid-reel. The Lexus shots are full-frame, with no black side borders. The reel ends on NEW PORTFOLIO ● LIVE.

## Brief

- **Reference/medium:** hyperpop / rage music-video edit meets cybercore screen-capture. Monochrome like the site (black, white, the halftone anime eye) with one accent, signal red `#FF2A2A`, plus the red/cyan fringes from RGB-split glitches. CRT scanlines, 1-bit dither, the site's own black-and-white "pixel curtain" squares used as the glitch vocabulary.
- **Engine:** Playwright (frame-exact captures of the live site, using virtual time) + Python/NumPy/OpenCV compositor + ffmpeg. Every frame is a pure function of time.
- **Motif:** THE EYE. It opens after the title, the camera dives into the pupil, eyes come back through the cut (KTB owl eye, anime eyes, balaclava eyes), and the eye slams shut on the last-bar hit before the end card.
- **Banned:** cross-dissolves and slow fades in the drop, matrix rain, lens flares, light leaks, spinning sci-fi HUD circles, bouncy or elastic easing, centred text on a gradient, identical glitch presets on every cut (parameters are seeded per cut), any hold longer than 1 beat after the drop, invented claims (all text comes from the site), black side borders around vertical video (it either fills the frame or sits in a triptych / the site's own carousel).
- **Hard rule:** no Soap & Glory imagery. Its logo appears in the client-logo sequence (and on the About panel's client strip the camera pushes past). The `/visuals/` page (which opens on Soap & Glory) is never recorded, and no page is scrolled down to a "Next project: Soap & Glory" link.

## Music edit and beat grid

- Track analysis (numpy/scipy spectral flux + comb filter): **111.0 BPM**, grid origin 0.021 s. Silence gaps before bars 2/4/6/10/12/13 land exactly on the grid, which confirms it.
- Structure of the 30.25 s track: intro arpeggio (bars 0–6) → gated stutter **break** (bar 7) → 808 **drop** (bar 8) → to the end, where the clip cuts out on the bar-14 downbeat.
- **Edit:** the whole track from its first downbeat (source 0.021 s), then 0.6 s of silence under the end card.
- Timeline unit: one 16th note, `n`. `v = n × 0.135135 s`, frame = `n × 4.054`. The music spans n = 0…224.
- Drop pattern per bar (16th offsets): **0, 3, 4, 6, 8, 10, 12** (808 + clap). Cuts and punches land on these.

| bar | n | time (s) | music | picture |
|---|---|---|---|---|
| 0 | 0 | 0.00 | intro arp | CRT on, title types in |
| 1 | 16 | 2.16 | | title holds |
| 2 | 32 | 4.32 | phrase (silence 4.26–4.32) | blink → **eye snaps open**, title blasts away |
| 3 | 48 | 6.49 | | dive, pupil, tunnel |
| 4 | 64 | 8.65 | phrase (silence 8.56–8.65) | the portfolio: covers, carousels |
| 5 | 80 | 10.81 | | carousels, Lexus full-frame, Meliá |
| 6 | 96 | 12.97 | phrase (silence 12.85–12.97) | monitor wall → "about" click |
| 7 | 112 | 15.14 | **break**: gated stutter | about panel → 14 logos |
| 8 | 128 | 17.30 | **DROP** | Malik Cross |
| 9 | 144 | 19.46 | | Kill the Boy, WPP |
| 10 | 160 | 21.62 | (silence 21.54–21.62) | UNCOMMONSENSE |
| 11 | 176 | 23.78 | stutter at the end | Lexus, El Águila, Meliá |
| 12 | 192 | 25.95 | | AI FILMMAKER / CREATIVE TECHNOLOGIST / ART DIRECTOR |
| 13 | 208 | 28.11 | last bar (silence 28.03–28.11) | exit the pupil, name, eye shuts, end card |
| end | 224 | 30.27 | track cuts out | NEW PORTFOLIO ● LIVE holds 0.6 s, CRT off |

## Scenes

### S1 · Title, then into the eye (n 0–64 · 0.00–8.65 s)
- **n 0–2:** CRT power-on: a line opens into the site's hero `anime-eye`, drawn with heavy lids by a per-column lid warp (the real lash line slides down over the eye).
- **n 2–32:** **NICOLÓ LOMBARDI** rises in letter by letter exactly like the home page (0.9em rise, the site's `cubic-bezier(0.16,1,0.3,1)`, 55 ms stagger), then *AI Production Specialist*. The site's typography is Arial bold, -0.04em, ×1.08 wide, set larger for video. It holds readable for about 3 s, with a red echo, chromatic pulses on the beats and lid flutters.
- **n 31.5–32 (silence):** the eye blinks shut.
- **n 32 (bar 2):** **SNAP.** A negative frame, and the lids fly open past rest, so the eye goes *wide*. The title blasts toward the camera and dissolves.
- **n 32–63.5:** the dive. Zoom 1× to 22× toward the pupil, with a reticle (PUPIL LOCK) and beat pulses. The halftone dots blow up into a pixel grid. Inside the pupil, the site's pixel squares rush out like a hyperspace tunnel, carrying small framed screens of the work (Malik Cross, Kill the Boy, WPP, UNCOMMONSENSE, Lexus, El Águila, Meliá).
- **n 63.5–64 (silence):** black.

### S2 · Inside: the portfolio (n 64–96 · 8.65–12.97 s)
- **n 64–72:** `/film/` snap-scroll from the first cover (no eye): UNCOMMONSENSE → Malik Cross (BIONIC AWARDS) → Toyota → Lexus on the 8ths, with the site's next-project logo cursor.
- **n 72–84:** project pages with videos playing: UNCOMMONSENSE, El Águila and Kill the Boy carousels (each slides on an 8th).
- **n 84–88:** Lexus **full-frame**: ES grille, then the RZ.
- **n 88–95:** Meliá carousel, then the UNCOMMONSENSE carousel further along. Black in the silence before bar 6.

### S3 · Monitor wall (n 96–112 · 12.97–15.14 s)
- **n 96:** 2×2 "CCTV wall": Malik Cross page, UNCOMMONSENSE carousel, Kill the Boy carousel, El Águila carousel (CAM_01…04). The tiles power on one by one and glitch on the 8ths.
- **n 103–105.5:** push into the El Águila tile until it fills the frame.
- **n 108:** the cursor clicks **about**, and the site's real **pixel-curtain** transition covers the screen.

### S4 · Break: client logos (n 112–128 · 15.14–17.30 s)
- **n 112–114:** the about panel's "Selected clients" strip (live capture), a fast push-in.
- **n 114–127:** **all 14 client logos, one per 16th note**, white on black with jitter, RGB split and slice shifts, strobing with the gated stutter. Order as on the site: Coca-Cola, Heineken, Lexus, Toyota, Boots, Soap & Glory, Meliá, El Águila, Osborne, Anaya, WPP Production, Wichita, Graphomedia, UNCOMMONSENSE.
- **n 127.5–128:** white-out into the drop.

### S5 · Drop: the work (n 128–192 · 17.30–25.95 s)
Hard cuts on the 808 pattern. Every hit gets a zoom punch, a bloom and an RGB split decaying over about 5 frames. Small HUD label per project (brand + type, from the site).
- **Bar 8 (Malik Cross, B&W boxing):** sweat-spray head snap, the punch, the X-ray, the scream, the Malik Cross *site page*, red gloves (red-key), the thermal hood, the walk-out.
- **Bar 9 (Kill the Boy VFX + WPP Virtual Production):** owl eye (eye rhyme), burning building, the KTB *site carousel*, LED-volume set, neon rain, confetti ring.
- **Bar 10 (UNCOMMONSENSE):** the *site carousel*, then a vertical triptych: claw machine, crematorium fire, photo-booth man, anime girl wide-eyed, balaclava eyes, frozen fridge, then the logo in ice.
- **Bar 11 (Lexus / El Águila / Meliá):** Lexus RX grille and the SUV on the road, **full-frame**. Then the El Águila *site carousel*, a Meliá / El Águila triptych, the highway, the Meliá carousel, and a stutter strobe into bar 12.

### S6 · Overdrive and close (n 192–end · 25.95–30.87 s)
- **Bar 12:** 16th-note flash montage under huge site-style type: AI FILMMAKER, CREATIVE TECHNOLOGIST, ART DIRECTOR. The pixel curtain swallows the frame.
- **Bar 13:** exit through the pupil. NICOLÓ LOMBARDI and AI PRODUCTION SPECIALIST lock up over the eye. **n 216: the eye slams shut** (negative frame, tears).
- **n 216.5–end:** **NEW PORTFOLIO ● LIVE** with NICOLO-LOMBARDI.COM. It glitches on the last 808s and hats; when the track cuts out it holds clean for 0.6 s with the red dot still blinking, then a CRT power-off.

## Self-check plan
1. One still per beat (59 stills) against this board.
2. Full render. Sample one frame every 45, plus filmstrips across the title → snap and tunnel → portfolio transitions.
3. Verify A/V sync on the drop (frame 519) and the music's end (frame 908).
4. Soap & Glory appears only as a logo (logo slot n 119; About strip n 112–114).
