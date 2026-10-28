# Store readiness checklist — Rumi

## Before first submission

1. **Apple Developer Program** (US$99/year) — Account → membership **Active** (not “Enroll Now”).
2. **Google Play Console** — one-time US$25 registration plus **identity verification** (ID document; Play blocks publishing until it passes).
3. **GitHub Pages (required for store privacy URL)** — ⚠️ not enabled yet (the URL answered 404 on 2026-10-27).
   Repo → **Settings → Pages** → Source: Deploy from branch **`main`** / folder **`/docs`**.
   Wait 1–2 minutes, then open: https://sotico91.github.io/RumiApp/privacy-policy.html
   (In-app privacy does **not** need this — it opens a local screen.)
4. Create apps in **App Store Connect** and **Play Console** with iOS bundle and Android package `com.sotico91.rumi` (com.rumi.app was taken on both stores). Neither can change later.
5. Paste that privacy URL + support email `edavidvelascop@gmail.com` in both store listings.
6. Build production:
   - `npm run eas:ios:production`
   - `npm run eas:android:production`
7. Upload to **TestFlight** and Play **internal testing** before production.

## Google Play: path to production

New **personal** developer accounts can't publish to production straight away:

1. **Internal testing** — upload the first AAB, check it installs (up to 100 testers, no review wait).
2. **Closed testing with at least 12 testers opted in for 14 days in a row.** Testers join the Google Group https://groups.google.com/g/rumiapptester (add `rumiapptester@googlegroups.com` under Closed testing → Testers); docs/probar.html and the `rumi-pruebame-es` video send people there. This is the slowest step.
3. **Apply for production** in the Dashboard (Play asks a few questions about the test), then wait for the review (usually a few days).

Signing: only the **EAS AAB** goes to Play. Turn on **Play App Signing** and let EAS keep the upload key. The local LAN APK (`npm run android:apk`) is signed with the debug keystore and is for testers only. Never commit `*.jks` / `*.keystore`.

## App Store Connect fields

- **Encryption:** the app encrypts its stored data with AES-256 (`expo-crypto`, key in the iOS Keychain) and uses HTTPS only through the system. That's standard encryption and not the app's main purpose, so it's exempt → answer **No** (the app sets `ITSAppUsesNonExemptEncryption = false`).
- **App Privacy (nutrition labels):** “Data Not Collected”; no tracking. Everything stays on the device. Speech is turned into text by Apple's recognizer when the phone can't do it on the device; Rumi gets only the text and keeps nothing (privacy policy §3).
- **Age rating:** fill in the new questionnaire (no user-generated content, no ads, no gambling, no web access).
- **iPad:** `supportsTablet` is on, so iPad 13" screenshots are required too (or turn it off before the first build).
- **Review notes:** personal finance tracker; no login; data stays on the device; not a bank, lender or payment processor.
- **Screenshots:** iPhone 6.9" (1320×2868), in `marketing/store/ios/`.

## Play Console fields

- **Upload an AAB** (production EAS profile).
- **Store listing (es + en):** title ≤30 characters, short description ≤80, full description ≤4000, icon 512×512, **feature graphic 1024×500** (`marketing/store/play-feature-es.png` / `-en.png`), 2–8 phone screenshots (1080×1920, in `marketing/store/play/`).
- **Data safety:**
  - Collected / shared: **No data collected, no data shared** (financial info, name and settings stay on the device and never reach a server).
  - Encrypted: Yes (on the device). Way to delete: “Borrar todos los datos” in Settings, or uninstall.
  - Voice: the app doesn't record or keep audio; when the phone doesn't have the language installed, Google's system recognizer turns speech into text. Declare no audio collected and say so in the notes. Keep this in line with docs/privacy-policy.html §3.
- **Financial features declaration:** “Personal finance management (budgeting, tracking)”; no loans, payments, crypto or banking.
- **Content rating:** IARC questionnaire (utility, no violence, no user interaction, no purchases).
- **Target audience:** 13+ (the policy says it isn't aimed at children under 13). Ads: **No**.
- **App access:** everything works without logging in.
- **Exact alarms:** the app asks for `SCHEDULE_EXACT_ALARM` for reminders. Declare it if Play asks.
- Target API: `targetSdk 36`, which meets the 2026 requirement.

## Already handled in the repo

- Microphone + speech recognition only for dictating an expense (`expo-speech-recognition`, tap to talk, nothing recorded); no background audio (`expo-audio` playback-only). Store privacy forms (App Privacy, Play Data safety) must match docs/privacy-policy.html §3.
- Data encrypted at rest (AES-256, key in the Keychain / Keystore). No network calls, analytics, ads or tracking SDKs.
- Privacy policy HTML + in-app link (profile menu + Plan footer).
- Face ID, microphone and speech usage strings; iOS privacy manifest (`PrivacyInfo.xcprivacy`).
- Risky Android permissions blocked (overlay, foreground services, `USE_EXACT_ALARM`).
- EAS production Android = `app-bundle`; iOS production profile added.
- Version stays `MAJOR.MINOR` in `app.json` (`1.0`); `npm run version:bump` raises it along with the build numbers.
