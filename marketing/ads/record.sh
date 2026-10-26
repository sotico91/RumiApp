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

# privacidad wipes the app's data, so it goes last.
for scene in ${SCENES:-quick ask onetap todo billeteras privacidad}; do
  xcrun simctl io "$SIM" recordVideo --codec h264 --force "$HERE/public/clips/$scene.mp4" &
  rec=$!
  pause 1.5
  # A scene that needs more than Maestro (Face ID) has its own script.
  if [[ -x "$FLOWS/rec-$scene.sh" ]]; then
    SIM="$SIM" MAESTRO="$MAESTRO" "$FLOWS/rec-$scene.sh"
  else
    "$MAESTRO" --device "$SIM" test "$FLOWS/rec-$scene.yaml"
  fi
  pause 2.5
  kill -INT "$rec"
  wait "$rec" || true
done
