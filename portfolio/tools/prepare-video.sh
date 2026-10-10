#!/usr/bin/env bash
# Turns any video (.mov, .mp4…) into the files the portfolio needs:
#   assets/<name>.webm         main video (small, Chrome / Firefox / modern Safari)
#   assets/<name>.mp4          fallback for older iPhones and in-app browsers
#   assets/<name>-poster.webp  still frame shown before playing
#   assets/<name>-thumb.webp   small thumbnail under the video carousel
# and prints the lines to paste into js/data.js.
#
# Needs ffmpeg (macOS: `brew install ffmpeg`).
# Usage: tools/prepare-video.sh <input-video> <name> [poster-second]
#   e.g. tools/prepare-video.sh ~/Desktop/heineken.mov heineken-01 2
set -euo pipefail
[ $# -ge 2 ] || { sed -n 2,13p "$0"; exit 1; }
in="$1"; name="$2"; at="${3:-1}"
out="$(cd "$(dirname "$0")/.." && pwd)/assets"
# Max 1280px on the long side, even dimensions, square pixels.
fit="scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))',scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1"

echo "→ webm"; ffmpeg -hide_banner -loglevel error -y -i "$in" -vf "$fit" \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -c:a libopus -b:a 96k "$out/$name.webm"
echo "→ mp4";  ffmpeg -hide_banner -loglevel error -y -i "$in" -vf "$fit" \
  -c:v libx264 -preset slow -crf 23 -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart "$out/$name.mp4"
echo "→ poster + thumbnail"
ffmpeg -hide_banner -loglevel error -y -ss "$at" -i "$out/$name.mp4" -frames:v 1 -q:v 80 "$out/$name-poster.webp"
ffmpeg -hide_banner -loglevel error -y -ss "$at" -i "$out/$name.mp4" -frames:v 1 \
  -vf "scale=-2:180" -q:v 75 "$out/$name-thumb.webp"

size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$out/$name.mp4")
ratio=$(awk -F x '{printf "%.4f", $1/$2}' <<<"$size")
for f in "$out/$name.webm" "$out/$name.mp4"; do
  [ "$(wc -c <"$f")" -lt 25000000 ] || echo "⚠ $(basename "$f") is over 24 MB — consider trimming it."
done
cat <<EOF

Done ($size). Add to the project in js/data.js:
  videos:          "assets/$name.webm"
  videoPosters:    "assets/$name-poster.webp"
  videoThumbnails: "assets/$name-thumb.webp"
  videoRatios:     $ratio
EOF
