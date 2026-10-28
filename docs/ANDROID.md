# Android setup — Rumi

Same Expo/React Native app as iOS. **No Kotlin rewrite required.**

Package: `com.sotico91.rumiapp`  
Version name: `1.0` (from `app.json`) · versionCode: kept by EAS (`appVersionSource: remote`, `autoIncrement`); 3 is the last one on Play

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
cd ~/Documents/GitHub/RumiApp
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

### Delivering a change (Play internal test)

Since the app is on Play (2026-10-28), phones get new versions from the **internal test** track, not the LAN APK. The local APK has the same package but a different signing key, so Android refuses it over the Play install (and uninstalling to make room deletes the data).

1. `npm run eas:android:production` (about 25 min). EAS bumps the versionCode.
2. From the build page, download the `.aab` and the build artifacts: `mapping.txt` itself (EAS hands a single artifact over uncompressed, as a .txt URL), kept by `buildArtifactPaths` in `eas.json`.
3. Play Console → Probar y lanzar → Prueba interna → Crear versión nueva: drop the `.aab`, name it `1.0 (<versionCode>)`, paste the es-419/en-US notes, Siguiente → Guardar y publicar.
4. App bundle explorer → that version → Descargas → Archivo de desofuscación: upload `mapping.txt`.
5. On the phone, Play shows the update (or open the internal test link from the Verificadores tab).

The release build shrinks with R8 both locally and on EAS: `plugins/withReleaseBuildProps.js` writes the gradle properties during prebuild. `npm run android:apk` + `android:apk:lan` stay for phones that never installed the Play version.

Automating step 3 with `eas submit` needs a Play service account JSON (Play Console → Configuración → Acceso a la API) uploaded to EAS credentials; the `production` submit profile targets the internal track.

## 4. Play Store checklist

- [x] Google Play Console account (one-time developer fee) + identity verification.
- [ ] Closed test with ≥12 testers for 14 days before production (new personal accounts). See STORE_CHECKLIST.md.
- [x] App created with package `com.sotico91.rumiapp`.
- [x] Store listing (es-419): title, short/full description, 6 phone screenshots, feature graphic. English listing still to add.
- [x] Privacy policy URL (local-only data; still required by Play).
- [x] Content rating questionnaire (Everyone / PEGI 3 / IARC 3+).
- [ ] Target API level required by Play (Expo 57 / RN 0.86 tracks current requirements via EAS).
- [x] Signing: EAS-managed credentials **or** upload your own keystore (never commit `*.jks`).
- [x] Upload AAB from `eas build --profile production --platform android` (1.0 (2) on closed test Alpha, sent to review 2026-10-28).
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
