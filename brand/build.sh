#!/usr/bin/env bash
# Build an episode: audio -> data.js -> stills (review) or full MP4.
#   brand/build.sh content/<slug>                 full render to content/<slug>/render/<slug>.mp4
#   brand/build.sh content/<slug> --stills 0,90   PNG stills into content/<slug>/build/stills for review
set -euo pipefail
EP=${1%/}; shift || true
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SLUG=$(basename "$EP")
DUR=${DUR:-30}; FPS=${FPS:-30}
mkdir -p "$EP/build" "$EP/render"
[ -f "$EP/audio/mix.wav" ] || python3 "$ROOT/.claude/skills/babble-audio/scripts/babble.py" "$EP/audio/script.txt" --out "$EP/audio" --duration "$DUR" --voice cute
python3 "$ROOT/brand/voice_env.py" "$EP/audio/voice.wav" "$FPS" "$EP/build/mouth.json"
{ printf 'window.CUES='; cat "$EP/audio/cues.json"; printf ';\nwindow.MOUTH='; cat "$EP/build/mouth.json"; printf ';\n'; } > "$EP/build/data.js"
if [ "${1:-}" = "--stills" ]; then
  node "$ROOT/brand/render.mjs" "$EP/scene.html" - - "$DUR" "$FPS" --frames "$2" --png-dir "$EP/build/stills"
else
  node "$ROOT/brand/render.mjs" "$EP/scene.html" "$EP/render/$SLUG.mp4" "$EP/audio/mix.wav" "$DUR" "$FPS"
  ffmpeg -y -loglevel error -ss 4 -i "$EP/render/$SLUG.mp4" -frames:v 1 "$EP/render/cover.png"
fi
