# GoMenu — spot vertical ES (14 s, 9:16)

**Engine:** HTML + JS → Playwright → ffmpeg. 1080×1920, 60 fps, 10 subframes per frame over a 180° shutter, blended with `tmix` for motion blur.
**Reference:** Linear / Arc-style kinetic-type launch spot: large tight display type, a real product UI, a camera that moves on purpose, and hard cuts on the beat.
**Grid:** 120 BPM (0.5 s per beat). Every change lands on a beat or half-beat. No dead time.
**Motif:** one accent rounded square. The phone screen floods with it, it morphs into the QR tile, and then it grows to fill the end card.
**Banned:** bouncy easing, particle bursts, glows, gradients on UI chrome, emoji, stock-looking centred text on a gradient, everything fading in the same way, more than one accent colour.

## Brand tokens (unverified: gomenu.click wasn't reachable from the build sandbox)
| Token | Value | Use |
|---|---|---|
| `--ink` | `#14110F` | hook background, type, phone bezel |
| `--cream` | `#F5F0E8` | light background, menu surface |
| `--accent` | `#FF5A1F` | the only accent: motif, prices, CTA |
| type | Inter Display (Black / Bold), Inter (Medium) | |

All tokens live in `:root` at the top of `index.html`. Swapping in the real palette or logo takes one line each.

## Timeline

| # | Time | Visual | On-screen text | Audio |
|---|---|---|---|---|
| 1 HOOK | 0.0–2.0 (bar 1) | Ink background. Each line slams up through a mask on a beat: 0.0 / 0.5 / 1.0. "digital?" is in the accent colour. | **¿Necesitas un menú digital?** | a Dm stab, kick and bass on each line; a riser and 16th-note clap build from 1.0 |
| → | 2.0–2.5 | A cream panel rises over the hook (downbeat of bar 2). The phone springs up. | | whoosh, groove starts |
| 2 CREA | 2.5–5.75 (bars 2–3) | The phone fills: header, then chips on 16ths (3.0–3.4), then five cards on 8ths (3.5–4.5). Slow camera push. | **Crea.** / *tu carta en minutos, sin código* | Dm → Bb, chip blips |
| 3 EDITA | 5.75–8.3 (bars 3–4) | The camera zooms to the pasta card. A tap on beat 6.5; the price rolls from 12,50 € to 11,90 € on 16ths. Allergen chips (Gluten · Lácteos · Huevo) on 16ths from 7.25. The camera pulls back at 7.75. | **Edita.** / *precios, fotos y alérgenos al instante* | F → C; tap, digit ticks and allergen blips |
| 4 COMPARTE | 8.4–10.6 (bars 5–6) | Accent floods the phone screen (8.42), which morphs into the QR tile (8.72). A real, scannable QR to gomenu.click resolves on beat 9.0. The URL `laterraza.gomenu.click` types 9.5–10.2. Scan brackets snap on beat 10.0. | **Comparte.** / *con un QR en cada mesa* | Bb → C, a typing tick per character, drums drop at 10.5 into a riser |
| 5 END | 10.6–14.0 (bars 6–7) | The tile grows to fill the frame, landing on beat 11.0. Wordmark 11.0, tagline 11.5, price chip on the downbeat of bar 7 (12.0), CTA 12.5. Held for 1.5 s. | **GoMenu** / *Tu carta digital, en minutos.* / **Desde 7,90 €/mes** / Pruébalo **GRATIS** hoy en **gomenu.click →** | impact plus Fadd9 on 11.0; the last hit on 12.0 rings out |

## Music (`music.py`)
An original cue synthesised in numpy/scipy, with no samples and nothing licensed. It runs at 120 BPM in D minor (Dm–Bb–F–C) and resolves to F major on the end card. Kick, clap, hats, off-beat house bass, a sidechained pad and supersaw chord stabs, plus UI sounds placed at the same cue times as the visuals. Mastered by two-pass `loudnorm` to -14 LUFS / -1 dBTP (the social-platform target).

## Self-check
- One still per scene before the full render (2 s, 4 s, 7 s, 9.8 s, 13 s), plus every 45th frame afterwards.
- Check type against the 9:16 safe zones: nothing important in the top 220 px or the bottom 380 px, where TikTok, Reels and Shorts overlay their UI.
