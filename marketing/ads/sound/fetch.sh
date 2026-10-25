#!/usr/bin/env bash
# Downloads the ads' music and sound effects from Mixkit (Mixkit Free License: online
# ads allowed, no attribution required, files may not be redistributed on their own,
# so they stay out of git). Writes public/music/ and public/sfx/.
set -euo pipefail
cd "$(dirname "$0")/../public"
mkdir -p music sfx
get() { [[ -s "$2" ]] || curl -sfL -A "Mozilla/5.0" -o "$2" "$1"; }

# Music: id, file. Titles and authors in ../README.md.
get https://assets.mixkit.co/music/158/158.mp3 music/happy-times.mp3
get https://assets.mixkit.co/music/1002/1002.mp3 music/im-fine.mp3
get https://assets.mixkit.co/music/729/729.mp3 music/pop-track-03.mp3
get https://assets.mixkit.co/music/1164/1164.mp3 music/its-a-cool-thing.mp3

sfx() { get "https://assets.mixkit.co/active_storage/sfx/$1/$1-preview.mp3" "sfx/$2.mp3"; }
sfx 1109 tap       # Select click
sfx 1393 type      # Smartphone typing
sfx 3005 caption   # Explainer video pops whoosh light pop
sfx 1490 whoosh    # Fast whoosh transition
sfx 2867 success   # Confirmation tone
sfx 2357 pop       # Bubble pop up alert notification
sfx 937 end        # Happy bells notification
echo ok
