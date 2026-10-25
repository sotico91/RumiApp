#!/usr/bin/env bash
# Records each ad scene on the booted simulator into public/clips/: seeds the demo
# data first (wipes the app's data on that simulator), then one flow per clip.
#   SIM      simulator id (default: the first booted one)
#   MAESTRO  maestro binary (default: on PATH, else ~/.maestro-cli/maestro/bin/maestro)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FLOWS="$HERE/../flows"
MAESTRO="${MAESTRO:-$(command -v maestro || echo "$HOME/.maestro-cli/maestro/bin/maestro")}"
SIM="${SIM:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"
pause() { python3 -c "import time; time.sleep($1)"; }

xcrun simctl status_bar "$SIM" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
[[ "${SKIP_SEED:-}" == 1 ]] || "$MAESTRO" --device "$SIM" test "$FLOWS/seed.yaml"

for scene in ${SCENES:-quick ask onetap}; do
  xcrun simctl io "$SIM" recordVideo --codec h264 --force "$HERE/public/clips/$scene.mp4" &
  rec=$!
  pause 1.5
  "$MAESTRO" --device "$SIM" test "$FLOWS/rec-$scene.yaml"
  pause 2.5
  kill -INT "$rec"
  wait "$rec" || true
done
