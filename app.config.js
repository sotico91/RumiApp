// app.json holds the real config. This file only adds what Expo Go needs when
// publishing a tester update (npm run expo-go:publish), so native builds keep
// over-the-air updates off.
const EXPO_SDK_MAJOR = require('expo/package.json').version.split('.')[0];

module.exports = ({ config }) => {
  if (process.env.RUMI_EXPO_GO !== '1') return config;
  return {
    ...config,
    // Expo Go only loads updates whose runtime is its own SDK.
    runtimeVersion: `exposdk:${EXPO_SDK_MAJOR}.0.0`,
    ios: { ...config.ios, runtimeVersion: undefined },
    android: { ...config.android, runtimeVersion: undefined },
    updates: { ...config.updates, url: `https://u.expo.dev/${config.extra.eas.projectId}` },
  };
};
