# Rumi

Personal finance app (Expo ~57, React Native, TypeScript, Expo Router). On-device data (AsyncStorage), i18n es/en. Product overview: README.md. Android/Play: docs/ANDROID.md, docs/STORE_CHECKLIST.md. History: docs/CHANGELOG.md. Next steps: docs/ROADMAP.md.

## Map
- `app/(tabs)/`: index (Home), historial, plan, wealth, insights ("Pregúntale a Rumi"). `app/agregar.tsx` is the add screen.
- `src/hooks/useFinance.tsx`: ledger state; `transactionsForPeriod(period, scope='mine')`.
- `src/utils/ask/`: Q&A engine. `parse.ts` reads the question, `handlers.ts` answers (order of `HANDLERS` = priority), `lexicon/{es,en}.ts` keywords, `period.ts` dates. Entry: `askRumi` / `answerFinanceQuery`.
- `src/utils/smartInsights.ts`: Insights cards; re-exports the engine. `src/utils/projection.ts`: month-end forecast.
- `src/utils/financeMath.ts`: period ranges and sums. `src/i18n/translations.ts`: all copy (es + en).
- `src/theme/tokens.ts`: single color source. UI primitives in `src/components/ui/`.

## Commands
- `npm test` (jest, roots `src/`), `npm run typecheck`.
- `npm run e2e`: Maestro flows in `e2e/` on a booted iOS simulator with a fresh build (wipes its data). See docs/E2E.md.
- Deliver Android: through the Play internal test (`npm run eas:android:production`, then upload the AAB and `mapping.txt`). See docs/ANDROID.md "Delivering a change". The LAN APK (`android:apk` + `android:apk:lan`) can't install over the Play version (different signing key).
- iPhone: see the xcodebuild + devicectl steps in the user's memory (`expo run:ios` fails signing).

## Rules
- Nothing may be named "billing".
- Commit on `main`, no co-author trailers.
- Every release to Play (or the App Store) bumps `version` in `app.json` and `package.json` first: patch for fixes, minor for features. Never ship two builds with the same version name. See docs/ANDROID.md.
- Keep: floating totals panel, the "Plan" tab name, intent cards before quick add, the + floating on Home (not in the tab bar).
- Copy goes through `translations.ts` in both languages; min text 12px, AA contrast.
