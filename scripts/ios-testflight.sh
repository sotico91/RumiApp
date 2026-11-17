#!/usr/bin/env bash
# Archive a Release build and upload it to App Store Connect for TestFlight,
# signing with the Apple account already added in Xcode (Settings → Accounts).
#
# Every upload needs a build number TestFlight has not seen for this version,
# so it is <CURRENT_PROJECT_VERSION>.<YYYYMMDD>.<HHMM>, passed to xcodebuild
# without touching the project files.
set -euo pipefail
# Store builds must not pick up .env.local (RevenueCat Test Store key, simulated purchases).
# The real iOS key, once it exists, is passed as EXPO_PUBLIC_REVENUECAT_IOS_KEY in the environment.
export EXPO_NO_DOTENV=1
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# RevenueCat public iOS key (appl_…, also in EAS env production). Without it Pro stays off.
if [[ -z "${EXPO_PUBLIC_REVENUECAT_IOS_KEY:-}" && -f "$ROOT/credentials/revenuecat-ios-public-key.txt" ]]; then
  export EXPO_PUBLIC_REVENUECAT_IOS_KEY="$(cat "$ROOT/credentials/revenuecat-ios-public-key.txt")"
fi
[[ "${EXPO_PUBLIC_REVENUECAT_IOS_KEY:-}" == appl_* ]] || echo "warning: no appl_ RevenueCat key, Pro will be off in this build" >&2
TEAM_ID="3Q53N2B5XD"
# App Store Connect API key (credentials/, gitignored): signs and uploads without
# depending on the Apple account session in Xcode, which expires.
AUTH=()
if [[ -f "$ROOT/credentials/asc-api-key.p8" ]]; then
  AUTH=(-authenticationKeyPath "$ROOT/credentials/asc-api-key.p8"
        -authenticationKeyID A4SMWC32N9
        -authenticationKeyIssuerID 0289bb86-99d4-4ed9-a9e5-139a808fcdd7)
fi
OUT="$HOME/Library/Caches/rumi-testflight"
ARCHIVE="$OUT/Rumi.xcarchive"

BASE="$(grep -m1 -E 'CURRENT_PROJECT_VERSION = ' "$ROOT/ios/Rumi.xcodeproj/project.pbxproj" | sed -E 's/.*= ([^;]+);/\1/')"
# BUILD_NUMBER=<n> overrides it (e.g. a plain integer if App Store Connect does not show a build).
BUILD="${BUILD_NUMBER:-${BASE}.$(date +%Y%m%d).$((10#$(date +%H%M)))}"
VERSION="$(node -p "require('$ROOT/app.json').expo.version")"

rm -rf "$OUT"
mkdir -p "$OUT"

cat > "$OUT/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
EOF

echo "Archiving Rumi ${VERSION} (${BUILD})…"
xcodebuild archive \
  -workspace "$ROOT/ios/Rumi.xcworkspace" \
  -scheme Rumi \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  "${AUTH[@]}" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD" \
  -quiet

echo "Uploading to App Store Connect…"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" \
  -allowProvisioningUpdates \
  "${AUTH[@]}"

echo "Uploaded Rumi ${VERSION} (${BUILD}). It shows in TestFlight once Apple finishes processing."
