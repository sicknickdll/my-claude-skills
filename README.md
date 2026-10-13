# my-claude-skills

## Educational explainer channel (TikTok + Instagram)

- `.claude/agents/topic-researcher.md` – research, fact-check, 30-second script
- `.claude/agents/social-media-manager.md` – account setup, calendar, captions, hashtags, analytics
- `.claude/agents/audio-designer.md` – Animal Crossing-style babble voice + music timed to subtitles (`babble-audio` skill)
- `.claude/agents/motion-explainer.md` – renders the video with `code-motion-studio`
- `.claude/skills/explainer-pipeline` – runs all four in order (`/explainer-pipeline <topic>`)

## Channel kit
- `content/BRAND.md` – format, look, palette, type, mascot, audio rules
- `brand/kit.js` – frog mascot, block-print ink filter, captions, Vox-style labels
- `brand/build.sh content/<slug> [--stills 0,90,...]` – audio → stills or the final MP4 (+ cover.png)
- Example episode: `content/penguins-salt-sneeze/`
