# Channel brand

The single source of truth for how every video looks and sounds. Agents read this; don't change it per video.

## Format (every video)
- **Vertical 1080×1920, 30 fps, 30 seconds maximum.**
- **First caption is always "Did you know?"** on the title card.
- Mascot (the frog) appears **only in the intro ("Did you know?") and the end card**. The middle is pure illustrated explainer.
- Last line: a follow CTA ("Follow for more …").

## Look — block print × Vox
- **Illustration:** flat linocut / woodblock / screen-print shapes, one ink colour per shape, grainy speckled ink with slightly rough edges (the `ink` SVG filter in `brand/kit.js`), on warm cream paper (`brand/paper.jpg`). References: Matsumoto Hoji frog, navy octopus and sun-face stamps, star-headed figures.
- **Explainer grammar (Vox):** the video is a sequence of camera *shots* over illustrated worlds, never static slides.
  - **Camera:** every shot moves: slow push-ins, pans across a big canvas (maps, notebook pages, diagrams), push-in on the detail being named, zoom-through into an object to enter the next shot. Light motion blur on fast moves, shake on impacts. (`cam()`, `shot()` in `brand/kit.js`.)
  - **Transitions:** ink-brush wipe, paper-tear wipe, whip/push pan, iris (circle) reveal, zoom-through + colour flash. Vary them; no plain crossfades. (`wipe()`, `compose()`.)
  - **Text:** typewriter headers, outline text that draws on then fills, highlighter tags (red box, cream type), underline swipes, Vox labels with leader lines/arrows, circle callouts that draw themselves. (`typeOn()`, `drawText()`, `highlight()`.)
  - **Set pieces:** map with a dropped pin, photo/polaroid cards with tape sliding onto the map, field-notes/newspaper page with a big headline, grid-paper schematic diagrams, big disc behind the subject.
  - One idea per shot; shots cut on caption cue boundaries.
- **Banned:** gradients, glossy 3D, drop shadows, stock photos, emoji, more than 4 ink colours in a frame, text in the bottom 20 % / right 15 %.

## Palette
| Token | Hex | Use |
|---|---|---|
| paper | `#EFE6D3` | background |
| cream | `#F6EFDF` | knock-out details (eyes, bellies, belly of frog) |
| navy | `#1E3473` | main ink, text |
| green | `#3E5A2C` | the frog only |
| red | `#B8452E` | accents: seal stamps, callouts, highlights, blood |

## Typography
- **Helvetica** (Bold for captions/titles, Regular for labels). CSS stack: `Helvetica, "Nimbus Sans", Arial, sans-serif` (not "Helvetica Neue": on Linux it resolves to Inter).
- Helvetica is a licensed font, so the cloud renderer uses **Nimbus Sans** (free metric clone, `apt-get install fonts-urw-base35`). If you own Helvetica, put the files in `brand/fonts/` and they take priority.
- Captions: 66 px bold navy, word-by-word as the voice speaks them, highlighted words get a red swipe with cream text. Labels: 34 px bold uppercase, letter-spacing 0.06em.

## Mascot — the frog
- Squat green block-print frog (silhouette in the spirit of the Hoji frog, but cute): ring eyes with tiny navy pupils, cream belly circle, freckle dots under the eyes, small smile.
- **Hat:** navy explorer (pith) helmet with a red band — the curious field researcher.
- Drawn by `frog()` in `brand/kit.js`; never redraw it by hand. In the intro and end card it hops in, its mouth moves with the voice, it blinks and breathes; at the end it tips its hat.

## Audio
- Voice: `babble-audio` preset **`cute`** (the frog's voice). Never change per video.
- Music: `--bpm 100 --key 0 --music-level 0.35` default; animal/fun facts may go to 108 bpm.

## Safe zones (1080×1920)
- Top 180 px: platform UI. Visuals: y 200–990 (framed panels end at 990). Shots are full-bleed; captions sit on paper-coloured boxes at y 1320–1500 so they read over any illustration. Nothing important below y 1536 or right of x 918.
