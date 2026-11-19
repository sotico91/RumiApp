#!/bin/bash
# Records each scene of the App Store preview on a booted simulator (after
# ../seed-en.yaml): ./record.sh <simulator id> <output dir>
set -e
SIM=$1; OUT=$2; MAESTRO=${MAESTRO:-$HOME/.maestro-cli/maestro/bin/maestro}
cd "$(dirname "$0")"
for scene in 1-home 2-add 3-mosaic 4-ask; do
  xcrun simctl io "$SIM" recordVideo --codec h264 --force "$OUT/$scene.mov" >/dev/null 2>&1 &
  rec=$!
  sleep 1.5
  "$MAESTRO" --device "$SIM" test "$scene.yaml" >/dev/null
  sleep 2
  kill -INT $rec; wait $rec || true
done
