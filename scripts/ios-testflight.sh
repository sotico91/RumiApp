#!/usr/bin/env bash
# Archive a Release build and upload it to App Store Connect for TestFlight,
# signing with the Apple account already added in Xcode (Settings → Accounts).
#
# Every upload needs a build number TestFlight has not seen for this version,
# so it is <CURRENT_PROJECT_VERSION>.<YYYYMMDD>.<HHMM>, passed to xcodebuild
# without touching the project files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEAM_ID="3Q53N2B5XD"
OUT="$HOME/Library/Caches/rumi-testflight"
ARCHIVE="$OUT/Rumi.xcarchive"

BASE="$(grep -m1 -E 'CURRENT_PROJECT_VERSION = ' "$ROOT/ios/Rumi.xcodeproj/project.pbxproj" | sed -E 's/.*= ([^;]+);/\1/')"
BUILD="${BASE}.$(date +%Y%m%d).$((10#$(date +%H%M)))"
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
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD" \
  -quiet

echo "Uploading to App Store Connect…"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" \
  -allowProvisioningUpdates

echo "Uploaded Rumi ${VERSION} (${BUILD}). It shows in TestFlight once Apple finishes processing."
