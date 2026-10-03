#!/usr/bin/env bash
# Copy the latest release APK to the LAN folder under a name unique to this
# build, keep only that one, and make sure the HTTP server is up.
#
# The name changes on every build (date + commit) so the phone's browser never
# finds an older "Rumi-v1.0.apk" in Downloads and saves "Rumi-v1.0 (1).apk".
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$HOME/Library/Caches/rumi-android-build/outputs/apk/release/app-release.apk"
SERVE_DIR="$HOME/Library/Caches/rumi-apk-server"
PORT=8080

if [[ ! -f "$APK" ]]; then
  echo "No APK at $APK — run: npm run android:apk" >&2
  exit 1
fi

VERSION="$(node -p "require('$ROOT/app.json').expo.version")"
STAMP="$(date -r "$APK" +%Y%m%d-%H%M)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
NAME="Rumi-v${VERSION}-${STAMP}-${SHA}.apk"

mkdir -p "$SERVE_DIR"
find "$SERVE_DIR" -maxdepth 1 -name 'Rumi-*.apk' ! -name "$NAME" -delete
cp "$APK" "$SERVE_DIR/$NAME"

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  (cd "$SERVE_DIR" && nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  sleep 1
fi

IP="$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo localhost)"
echo "http://$IP:$PORT/$NAME"
