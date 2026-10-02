# Android setup — Rumi

Same Expo/React Native app as iOS. **No Kotlin rewrite required.**

Package: `com.rumi.app`  
Version name: `1.0.0` (from `app.json`) · versionCode: `1`

## 1. Machine requirements

On this Mac (already prepared for Edgar):

| Piece | Location |
|-------|----------|
| Android Studio | `~/Applications/Android Studio.app` |
| Android SDK | `~/Library/Android/sdk` |
| JDK 17 (Temurin) | `~/.local/jdk/jdk-17.0.20+8/Contents/Home` |
| Emulator AVD | `Pixel_7_API_35` |

Open Studio anytime:

```bash
open -a "Android Studio" ~/Applications/Android\ Studio.app
# or:
open "$HOME/Applications/Android Studio.app"
```

Environment (also appended to `~/.zshrc`):

```bash
export JAVA_HOME="$HOME/.local/jdk/jdk-17.0.20+8/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Confirm tools:

```bash
source ~/.zshrc
adb devices
sdkmanager --list_installed | head
emulator -list-avds
```

Fresh machine checklist (if reinstalling elsewhere):

1. [Android Studio](https://developer.android.com/studio) (or copy the app under `~/Applications`).
2. SDK packages via Studio SDK Manager **or** `sdkmanager` (platform-tools, platforms;android-35, build-tools;35.0.0, emulator, system image).
3. Create an AVD (Pixel / API 35).
4. Node (already used for iOS).

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/Documents/GitHub/Rumi
npm install
```

## 2. Run on emulator / device (local)

```bash
# Generate native android/ (gitignored; safe to regenerate)
npm run android:prebuild

# Debug install
npm run android

# Release-like local install
npm run android:release
```

`expo run:android` will prebuild if `android/` is missing.

## 3. Cloud builds (EAS) — recommended for Play Store

```bash
npm i -g eas-cli
eas login
eas build:configure   # already have eas.json

# Internal APK to share / test
npm run eas:android:preview

# Play Store AAB
npm run eas:android:production
```

Profiles in [`eas.json`](../eas.json):

| Profile | Artifact | Use |
|---------|----------|-----|
| `development` | debug APK | Dev client |
| `preview` | APK | Testers |
| `production` | AAB | Google Play |

## 4. Play Store checklist

- [ ] Google Play Console account (one-time developer fee).
- [ ] App created with package `com.rumi.app`.
- [ ] Store listing: title, short/full description (ES/EN), screenshots (phone), feature graphic.
- [ ] Privacy policy URL (local-only data; still required by Play).
- [ ] Content rating questionnaire.
- [ ] Target API level required by Play (Expo 57 / RN 0.86 tracks current requirements via EAS).
- [ ] Signing: EAS-managed credentials **or** upload your own keystore (never commit `*.jks`).
- [ ] Upload AAB from `eas build --profile production --platform android`.
- [ ] Internal testing track first, then production.
- [ ] Optional submit: `eas submit --platform android --profile production` (needs Play service account JSON).

## 5. Android-specific behavior already wired

- Adaptive icon + splash (`app.json`).
- Local notifications channel `rumi-alerts` + `POST_NOTIFICATIONS` / exact alarm permissions.
- Keyboard resize mode for forms.
- Reminder scheduling uses the Android notification channel id.

## 6. What you do **not** need

- A separate Kotlin project.
- Firebase / FCM for **local** reminders (current app). FCM is only needed later if you add remote push.

## 7. Smoke test on Android

1. Onboarding + create a concept/sub.
2. Log an expense; confirm privacy eye works.
3. Enable a Plan reminder; grant notification permission; confirm it fires (or appears in scheduled).
4. Wealth: add/edit installment.
5. Home: “Suele llegar este mes” + income glance close without flicker.

---

© 2026 Sotico91. All rights reserved.
