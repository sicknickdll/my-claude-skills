#!/bin/bash
# How the files in site/media were made from the original Google Drive exports.
# Needs ffmpeg, ImageMagick (convert) and python3.
#
# usage: tools/optimize-media.sh <folder-with-all-drive-files> site
#   (put every file from the Drive folder, including sub-folders' files, flat in one folder)
#
# Re-running it overwrites site/media. To add a single new video or image later you can
# also just copy the snippet for that project below.
set -euo pipefail
R="$1"; SITE="$2"; M="$SITE/media"
mkdir -p "$M"

# img <src> <dest-without-ext> <w1> <w2> [extra convert args...]
# Writes <dest>-<w>.webp for each width (never upscales).
img() {
  local src="$1" dest="$2" w1="$3" w2="$4"; shift 4
  mkdir -p "$(dirname "$dest")"
  convert "$src" "$@" -resize "${w1}x>" -strip -quality 80 -define webp:method=6 "$dest-$w1.webp"
  convert "$src" "$@" -resize "${w2}x>" -strip -quality 86 -define webp:method=6 "$dest-$w2.webp"
}

# posters: frame at time t, written as webp
poster() { # <video> <dest.webp> <t> <width>
  ffmpeg -v error -y -ss "$3" -i "$1" -frames:v 1 -vf "scale=$4:-2" -f image2pipe -vcodec png - \
    | convert png:- -strip -quality 78 "$2"
}

# remux to faststart without re-encoding (already web-sized exports)
remux() { ffmpeg -v error -y -i "$1" -c copy -map_metadata -1 -movflags +faststart "$2"; }

# ---------- home ----------
mkdir -p "$M/home"
img "$R/head.png" "$M/home/head" 1280 2560
convert "$R/head.png" -resize 1200x630^ -gravity center -extent 1200x630 -strip -quality 82 "$M/home/og.jpg"
# eye mark: inverted (white halftone) for dark backgrounds
convert "$R/logo_b.png" -channel RGB -negate +channel -trim +repage -resize 256x256 -strip -define webp:lossless=false -quality 85 "$M/home/eye.webp"

# favicons: crop the iris, inverted on near-black
convert "$R/logo_b.png" -channel RGB -negate +channel -background '#0a0a0a' -flatten \
  -gravity center -crop 1150x1150-40+0 +repage "$M/home/_iris.png"
convert "$M/home/_iris.png" -resize 512x512 -strip "$SITE/icon-512.png"
convert "$M/home/_iris.png" -resize 180x180 -strip "$SITE/apple-touch-icon.png"
convert "$M/home/_iris.png" -define icon:auto-resize=48,32,16 "$SITE/favicon.ico"
rm -f "$M/home/_iris.png"

# ---------- Kill the Boy (Wichita) — keep the rounded 4:3 film gate, drop the black side bars ----------
K="$M/kill-the-boy"; mkdir -p "$K"
GATE="2876x2160+620+0"
img "$R/KTB_head2.jpg" "$K/cover" 960 1920 -crop "$GATE" +repage
img "$R/KTB_head.jpg"  "$K/still-fire" 960 1920 -crop "$GATE" +repage
img "$R/KTB_03.jpg"    "$K/still-field" 960 1920 -crop "$GATE" +repage
for n in 01 02 03 04 06 07; do
  ffmpeg -v error -y -i "$R/KTB_$n.mp4" -vf "crop=2876:2160:620:0,scale=-2:1080" \
    -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart -map_metadata -1 "$K/vfx-$n.mp4"
  poster "$K/vfx-$n.mp4" "$K/vfx-$n.webp" 0.4 960
done

# ---------- El Águila ----------
A="$M/el-aguila"; mkdir -p "$A"
img "$R/Aguila_banner_2.jpg" "$A/cover" 960 1920
for n in 01 02 03; do img "$R/Aguila-$n.jpg" "$A/still-$n" 540 1080; done
img "$R/Aguila_banner.jpg" "$A/still-04" 540 1080
for n in 01 02 03 04; do
  remux "$R/ElAguila-Vp-$n.mp4" "$A/spot-$n.mp4"
  poster "$A/spot-$n.mp4" "$A/spot-$n.webp" 1.5 720
done

# ---------- Uncommonsense ----------
U="$M/uncommonsense"; mkdir -p "$U"
img "$R/Banner_UNCOMMONSENSE.png" "$U/cover" 960 1536
for pair in "FRIDGE:260123_UNCOMMON_FRIDGE_EXPORT_V1_low" "CEM:260224_UNCOMMON_CEM_V2_low" \
            "CATWALK:260424_UNCOMMON_CATWALK_V2_EXPORT_low" "NIGHTMARE:260505_UNCOMMON_NIGHTMARE_EXPORT_V2_low" \
            "HEIST:260603_UNCOMMON_HEIST_V1_EXPORT_low"; do
  name=$(echo "${pair%%:*}" | tr 'A-Z' 'a-z'); file="${pair#*:}"
  remux "$R/$file.mp4" "$U/$name.mp4"
  mid=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$U/$name.mp4" | awk '{printf "%.2f", $1/2}')
  poster "$U/$name.mp4" "$U/$name.webp" "$mid" 720
done

# ---------- Lexus ----------
L="$M/lexus"; mkdir -p "$L"
img "$R/Lexus-header.png" "$L/cover" 960 1280
remux "$R/Lexus_video.mp4" "$L/film.mp4"
poster "$L/film.mp4" "$L/film.webp" 1 720

# ---------- single-image projects ----------
img "$R/Banner_anaya_small.jpg" "$M/anaya/cover" 960 1920
img "$R/Toyota_banner.jpg" "$M/toyota/cover" 960 1920
img "$R/Bionic-Banner.png" "$M/bionic-awards/cover" 960 1789

# ---------- WPP Production — virtual production ----------
W="$M/wpp-virtual-production"; mkdir -p "$W"
img "$R/WPP_Header.png" "$W/cover" 960 1920
i=1
for f in "$R"/Screenshot*.png; do
  img "$f" "$W/frame-0$i" 960 1920
  i=$((i+1))
done

# ---------- client logos (white on transparent) ----------
C="$M/clients"; mkdir -p "$C"
logo() { # <src> <name> [extra args]
  local src="$1" name="$2"; shift 2
  convert "$src" "$@" -trim +repage -resize 'x120>' -resize '480x>' -strip -quality 90 "$C/$name.webp"
}
logo "$R/Heineken-logo.png" heineken
logo "$R/lexus-logo.png" lexus -channel RGB -negate +channel
logo "$R/Toyota-Logo.png" toyota
logo "$R/aguila-logo.png" el-aguila
logo "$R/Wpp-logo.png" wpp-production
logo "$R/Melia-Logo.png" melia
logo "$R/Boots-logo.png" boots
logo "$R/S&G-logo.png" soap-and-glory
logo "$R/Uncommonsense-logo.png" uncommonsense
logo "$R/Graphomedia-logo.png" graphomedia
logo "$R/Wichita-Logo.png" wichita
logo "$R/Anaya-logo.png" anaya
logo "$R/Obsorne-Logo.png" osborne
python3 -I -c "
import sys,re,base64
s=open(sys.argv[1]).read(); m=re.search(r'base64,([A-Za-z0-9+/=]+)', s)
open(sys.argv[2],'wb').write(base64.b64decode(m.group(1)))" "$R/Coca-Cola.svg" "$C/_coca.png"
logo "$C/_coca.png" coca-cola; rm -f "$C/_coca.png"

echo "done"
