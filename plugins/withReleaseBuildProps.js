const { withGradleProperties } = require('expo/config-plugins');

// Release settings that `expo prebuild` would otherwise reset, so EAS builds
// (the Play AAB) shrink the same way the local APK does. R8 leaves
// android/app/build/outputs/mapping/release/mapping.txt for Play's deobfuscation.
const PROPS = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  'android.enableBundleCompression': 'true',
  'expo.useLegacyPackaging': 'true',
  // R8 plus expo-updates go past the default 512m Metaspace.
  'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
};

module.exports = function withReleaseBuildProps(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPS)) {
      const item = cfg.modResults.find((i) => i.type === 'property' && i.key === key);
      if (item) item.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
