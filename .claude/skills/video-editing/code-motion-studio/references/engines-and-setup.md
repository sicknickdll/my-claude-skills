# Engines and setup

All commands, repos and star counts below come from the source X thread and were **not verified** (the authoring session could not reach GitHub or X). Check availability and current docs before running.

| Engine | Use for | Setup (per thread) |
|---|---|---|
| HyperFrames (`heygen-com/hyperframes`) | UI motion, launch videos; "Write HTML. Render video. Built for agents." | `npx skills add heygen-com/hyperframes` |
| Remotion (`remotion-dev/remotion`) | Explainer films; "Make videos programmatically with React." | `npx skills add remotion-dev/skills` |
| Motion Canvas (`motion-canvas/motion-canvas`) | Programmatic animation, MIT | see repo |
| p5.js + p5.brush | Hand-painted cartoons | `git clone https://github.com/JohnHeibel/ClaudeAnimationBase` |
| Blender (Python) | Claymation, 3D worlds | `git clone https://github.com/angrypenguinpng/blender-claymation-skill ~/.claude/skills/blender-claymation` |
| Three.js | Playable 3D scenes, WebGL | npm `three` |
| Playwright + ffmpeg | Rendering any HTML-based piece | `npm i playwright`; ffmpeg from the system package manager |

Licensing: the thread notes Remotion is free for teams of up to 3 people and needs a paid license above that.

Playwright note for Claude Code cloud sessions: Chromium is usually pre-installed; use the existing browser (set `executablePath` if the Playwright version differs) rather than running `playwright install`.

Useful ffmpeg snippets:

```bash
# sample one frame every 45 for review
ffmpeg -i out.mp4 -vf "select='not(mod(n\,45))'" -vsync vfr frames/scene_%03d.png
# motion blur: render subframes (e.g. 4 per output frame), then blend
ffmpeg -framerate 240 -i sub/%05d.png -vf "tmix=frames=4,select='not(mod(n\,4))'" -r 60 out.mp4
```

Interactive 3D (Three.js) briefs work best as an opening line (subject, setting, season) followed by one-by-one requirements (terrain, vehicle, water, characters, weather, controls, performance) and a closing **test list**: screenshots at morning, storm, golden hour and night, plus a console check. Expect heavy steering.
