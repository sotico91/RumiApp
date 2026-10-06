# Rumi

A personal finance app to understand and control everyday money — especially **ant spends** — with a simple loop: register → classify → understand → decide.

**Developed by [Sotico91](https://github.com/sotico91)**  
© 2026 Sotico91. All rights reserved.

## Overview

Rumi helps you log income and expenses quickly, see the month clearly, and get local reminders for the concepts you choose. Every movement is attributed to the person who logged it, so if a household ledger is shared later, each expense still belongs to whoever registered it.

Built for daily use on **iPhone and Android** (same Expo codebase): guided onboarding, friendly logging (coffee, delivery, salary…), budgets only for concepts you already use, and an assistant for questions like “How much did I spend on delivery this month?”

## Features

- **Guided logging** for expenses, income, transfers, and debt payments
- **Quick templates** (coffee, delivery, transport, salary, savings)
- **Home** month summary: income, expenses, savings signal, debts, and net worth
- **Activity** by today / week / month, with edit and delete
- **Plan**: budgets for registered concepts and local reminders: every active debt the day before it is due, recurring payments suggested from history, daily / weekly / monthly / last-day rules that skip what is already paid
- **Other** reminders: custom concept names (receipts, parking, utilities, etc.)
- **Understand**: category ranking and “Ask Rumi” (periods, comparisons, notes, month-end forecast; shows what it understood and the movements behind each answer)
- **Wealth**: accounts, debts, and credit installments
- **i18n** English / Spanish (device language)
- **On-device** data (AsyncStorage); no remote push server required
- **Amount privacy** (eye toggle) so balances are not visible at a glance

## Stack

- TypeScript
- React Native + Expo (~57) + Expo Router
- AsyncStorage, Reanimated, Expo Notifications (local alerts)

## Getting started

```bash
npm install
npx expo start
# iOS device / simulator
npx expo run:ios
# Android emulator / device (needs Android Studio SDK)
npx expo run:android
```

Release build on a physical iPhone (example):

```bash
npx expo run:ios --device <UDID> --configuration Release
```

Android release / Play Store path:

```bash
npm run android:prebuild
npm run android:release
# or cloud AAB:
npm run eas:android:production
```

Full Android + Play checklist: [`docs/ANDROID.md`](./docs/ANDROID.md).

## Structure

```
app/           # Screens (Expo Router)
src/           # Components, hooks, i18n, data, and utilities
assets/        # Icon, splash, and fonts
docs/          # Platform guides (Android, …)
ios/           # Native iOS project
```

## Privacy

Movements are stored on the phone. Reminder notifications are **local** (scheduled on the device). No account or backend is required for basic use.

## Copyright & License

Copyright © 2026 Sotico91. All rights reserved.

Rumi is **proprietary** software developed by **Sotico91**.  
It is **not** open source. No permission is granted to copy, modify, redistribute, or use this codebase without prior written consent from Sotico91.

See [`LICENSE`](./LICENSE) for the full terms.
