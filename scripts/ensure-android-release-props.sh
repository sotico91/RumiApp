#!/usr/bin/env bash
# Re-apply release APK size settings after `expo prebuild` resets android/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROPS="$ROOT/android/gradle.properties"

if [[ ! -f "$PROPS" ]]; then
  echo "Missing $PROPS — run: npx expo prebuild --platform android" >&2
  exit 1
fi

patch_prop() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$PROPS"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$PROPS"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$PROPS"
  fi
}

patch_prop reactNativeArchitectures arm64-v8a
patch_prop expo.useLegacyPackaging true
patch_prop android.enableMinifyInReleaseBuilds true
patch_prop android.enableShrinkResourcesInReleaseBuilds true
patch_prop android.enableBundleCompression true
# expo-updates pushed the release build past the default 512m Metaspace.
patch_prop org.gradle.jvmargs "-Xmx4096m -XX:MaxMetaspaceSize=1024m"

# Gradle keeps every JS asset (fonts, images) it ever bundled in these folders
# and packs them all into the APK. Start clean so only what the bundle uses ships.
rm -rf "$ROOT/android/app/build/generated/res/react" "$ROOT/android/app/build/generated/assets/react"

echo "Android release size settings applied in gradle.properties"
