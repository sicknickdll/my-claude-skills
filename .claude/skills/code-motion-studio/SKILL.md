---
name: code-motion-studio
description: Direct Claude to make motion design, animated videos, launch videos, explainer films, 3D scenes or generative animation entirely in code (HTML/JS, HyperFrames, Remotion, Three.js, Blender Python, p5.js) and render them to MP4 with a self-review loop. Use when the user asks for a motion graphic, UI animation, kinetic-type launch video, animated short, "video made in code", looping animation, or wants a reusable brief or studio workflow for code-rendered video. Not for editing existing video files or using video-generation models.
---

# Code Motion Studio

Claude cannot output an MP4. It writes a **program**; a renderer turns the program into frames; ffmpeg stitches them. A change is a one-line edit plus a re-render, which is why this works as a studio and not a slot machine.

```
USER (brief, references, taste) → CLAUDE (writes program) → RENDERER (frames) → FFMPEG (video)
```

Your job in this skill: turn the user's request into a **structured brief**, get a plan approved, build, then **look at your own frames** and fix them before the final render.

## Workflow

1. **Pick the engine** (table below). Name it explicitly in the brief; the engine decides the look.
2. **Gather inputs.** Ask only for what is missing: medium/reference style, duration, aspect ratio and fps, colour palette (or "black and white + one accent"), audio track and BPM if any, the content (UI states, scenes, narration).
3. **Write the brief** using the right template in `templates/` (see "Templates"). Always include a *banned list* and a *structure with timing numbers*.
4. **Plan before code.** Produce `STORYBOARD.md` (scenes, timings, visuals, on-screen text, transitions) or, for beat-based pieces, the state list laid out on the beat grid. **Get the user's approval before writing code.**
5. **Build** scene by scene, with every frame a pure function of time (rule 3).
6. **Self-check loop** (below). Never skip it; it separates client work from AI slop.
7. **Final render**, then report the output path, duration, resolution and anything left imperfect.

## Pick the engine

| Making | Engine |
|---|---|
| UI motion, launch videos | HTML + JS (Playwright + ffmpeg), or HyperFrames |
| Explainer films, multi-scene stories | Remotion (React) |
| 3D scenes, playable worlds | Three.js |
| Claymation, 3D worlds, photoreal-ish scenes | Blender (Python) |
| Hand-painted / cartoon / generative art | p5.js (+ p5.brush), or WebGL2 with no libraries |
| Large timeline-style animation | Motion Canvas |

Setup commands, repos and licensing notes are in `references/engines-and-setup.md`. Check what is already installed in the environment first; do not assume network access to npm or GitHub works. For any HTML-rendered engine you need Playwright + ffmpeg.

## Rules that separate studio work from slop

1. **Name a reference or medium.** "Linear-style launch video", "watercolor", "Blender claymation". Never leave style open: with no reference the default look is centred text on a gradient with everything fading in.
2. **Ban the defaults out loud.** e.g. `Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, dead time, anything that looks like a template.`
3. **Every frame is a pure function of time.** Compute all styles inside `seek(t)`: no CSS transitions, no timers, no state carried between frames. This makes renders exact and repeatable.
4. **Plan before code.** `STORYBOARD.md`, or "show me the state list before you write any code".
5. **Force a self-check.** After each scene render 3-4 stills and critique them.
6. **Constraints create style.** e.g. 128×96 px with a 24-colour palette; "WebGL2 and plain JavaScript, no libraries"; "all Blender Python, no downloaded meshes".
7. **Give timing numbers.** e.g. camera moves 1.5-3 s on gentle ease-in-out, "aim for half the speed you'd default to"; 120 BPM, something happens on every beat.
8. **Or hand over control on purpose** ("use whatever you think will produce the best") when the user prefers a surprise over a spec.

Also: restraint wins. Extra animation is what makes a design feel AI-generated. One recurring motif (a character, a shape, a token) turns a list of scenes into a story.

## Technique notes (HTML/JS renderers)

- **Springs:** use closed-form step responses. A value retargeted many times = sum of one spring per change, so it stays a pure function of time. Tiny overshoot at most.
- **Stretch/lead-lag:** give a moving element's two edges different springs so the leading edge stretches ahead of the trailing edge (tab indicators, toggle knobs).
- **Drags:** direct manipulation. While the cursor is held, value = f(cursor position); on release it springs back from wherever it was.
- **Motion blur:** render N subframes per frame with Playwright and blend with ffmpeg `tmix` (e.g. 4 subframes at 60 fps).
- **Audio sync:** analyse the track with numpy for the beat grid, start on a downbeat, place each UI sound at its measured peak.
- **Perfect loops:** last frame must equal the first, cursor position and speed included, or the loop stutters.
- **Gotchas:** never put `will-change` on anything the camera scales (text renders blurry). Text swapping inside a morphing container needs its own enter and exit timing or it overlaps.

## Self-check loop

```
render → pull frames → look at them → compare to storyboard → fix → re-render only what changed
```

- Per scene: `npx remotion still` (Remotion) or screenshot via Playwright. Check layout, overlaps, legibility, pacing, cramped or off-grid elements.
- Whole video: sample one frame every 45 and review each against the storyboard:

```bash
mkdir -p frames
ffmpeg -i out.mp4 -vf "select='not(mod(n\,45))'" -vsync vfr frames/scene_%03d.png
```

- Beat-based pieces: render **one frame per beat** before the full render and fix anything off the grid.
- 3D/interactive: also screenshot distinct states (e.g. morning, storm, golden hour, night) and check the browser console for errors.
- Open the PNGs with the Read tool so you actually see them. Do not claim a frame is fine without looking.

## Templates

Load only the one you need:

- `templates/ui-morph-loop.md` - one shape morphing through 8-12 UI states on a beat grid, perfect 14 s loop (HTML + Playwright + ffmpeg). Ask for inputs, then show the state list on the beat grid before coding.
- `templates/remotion-short-film.md` - multi-scene animated essay in Remotion with `STORYBOARD.md` and per-scene stills.
- `templates/blender-world.md` - data-first Blender world: source file → reusable generators → assembly.
- `templates/quick-launch-video.md` - one-line brief for a short kinetic-type launch video (use only for short, unbranded pieces; otherwise use a structured template).

`references/gallery.md` lists example work by category, and prompt libraries, for inspiration when the user asks for "more like this".

## Honest expectations

"One prompt" results usually had a lot behind them (long briefs, skills, examples, many steering rounds). Set that expectation: quality is learnable but it is directed, not one-shot. Also tell the user when a piece is taking many iterations rather than silently burning time.

## Provenance

Distilled from an X thread by @0xCarnagee, "How to build Disney-level motion design studio with Opus 5.5", which curates prompts from several creators (credited in the templates). Repo links, star counts and install commands came from that thread and were not independently verified; confirm them before relying on them.
