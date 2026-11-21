#!/usr/bin/env bash
# Takes the 7 store captures with the current app on the iPhone 17 Pro Max simulator (1320x2868)
# and puts them in marketing/store/ios*/ (the App Store set; ../ads/src/StoreShotV2.tsx frames them).
#   ./record-store-shots.sh es     Spanish, pesos   → store/ios/
#   ./record-store-shots.sh esus   Spanish, dollars → store/ios-es-usd/
#   ./record-store-shots.sh en     English, dollars → store/ios-en/
# WIPES the app's data on that simulator. Needs the Release simulator build (docs/E2E.md).
set -euo pipefail
cd "$(dirname "$0")"
SIM=${SIM:-88463179-51D5-4519-8793-E9BEF14E9EAA}
MAESTRO=${MAESTRO:-$HOME/.maestro-cli/maestro/bin/maestro}
APP=${APP:-$HOME/Library/Caches/rumi-ios-sim-build/Build/Products/Release-iphonesimulator/Rumi.app}
case "${1:-}" in
  es)   locale=es_CO; lang=es-CO; out=ios;        flows=(seed.yaml seed-es-extra.yaml);        shots=shots-es.yaml; amount=24000 ;;
  esus) locale=es_US; lang=es-US; out=ios-es-usd; flows=(seed-es-usd.yaml seed-es-usd-extra.yaml); shots=shots-es.yaml; amount=12.50 ;;
  en)   locale=en_US; lang=en-US; out=ios-en;     flows=(seed-en.yaml seed-en-extra.yaml);     shots=shots-en.yaml; amount=12.50 ;;
  *) echo "usage: $0 es|esus|en" >&2; exit 1 ;;
esac

xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl spawn "$SIM" defaults write "Apple Global Domain" AppleLanguages -array "$lang"
xcrun simctl spawn "$SIM" defaults write "Apple Global Domain" AppleLocale -string "$locale"
xcrun simctl shutdown "$SIM"
xcrun simctl boot "$SIM"
xcrun simctl bootstatus "$SIM" -b >/dev/null
xcrun simctl install "$SIM" "$APP"
xcrun simctl status_bar "$SIM" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3

for f in "${flows[@]}"; do "$MAESTRO" --device "$SIM" test "$f"; done
work=$(mktemp -d)
"$MAESTRO" --device "$SIM" test -e AMOUNT="$amount" --test-output-dir "$work" "$PWD/$shots"
dest=../store/$out
rm -f "$dest"/*.png
find "$work" -name '*.png' -path '*takeScreenshot*' -exec cp {} "$dest"/ \; 2>/dev/null || true
# Older Maestro writes the shots in the current directory instead.
ls "$dest"/*.png >/dev/null 2>&1 || find "$work" "$PWD" -maxdepth 4 -name '[1-7]-*.png' -newer "$shots" -exec mv {} "$dest"/ \;
ls -l "$dest"
