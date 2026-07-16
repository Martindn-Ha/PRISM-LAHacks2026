# PRISM

Personal health insights app for iOS (Expo dev client) with optional Firebase Cloud Functions.

- **Mobile app:** `InsightsScreenExpo/` — React Native / Expo, branded **PRISM** on device
- **Backend:** `functions/` — HTTPS endpoints for nearby event context and community events
- **Config:** `firebase.json`, `.firebaserc`

## Features

- **Dashboard** — configurable quick metrics (glucose, heart rate, sleep, steps, and more)
- **Insights** — charts and detail views for Apple Health metrics (Blood Glucose includes a newest-first readings list)
- **Glucose** — Apple HealthKit and optional Dexcom Share; background sampling and spike alerts
- **Location** — background location log (export separately; match to glucose by timestamp later)
- **Goals** — passive progress from Health data
- **Medications** — daily checklist, calendar, recurrence, and local reminders
- **Personality** — on-device IPIP-120 questionnaire and scoring
- **UI interactions** — always-on named tap/swipe logging for research export
- **Data export** — CSV/ZIP of Health metrics plus Prism data (`uiInteractions.csv`, location, health events, goals, medications, IPIP)
- **Optional Firebase** — Firestore progress posts and remote context when `EXPO_PUBLIC_FIREBASE_*` is set

## Project structure

```
InsightsScreenExpo/   Expo app (source lives here)
functions/            Firebase Cloud Functions
firebase.json         Firebase deploy config
.firebaserc           Firebase project alias
```

Local docs and scratch notes live in `docs/` (gitignored).

## Environment variables

Do not commit real `.env` files. Copy from:

- `InsightsScreenExpo/.env.example`
- `functions/.env.example`

### App (`InsightsScreenExpo/.env`)

```bash
EXPO_PUBLIC_COMMUNITY_SPOTLIGHT_IMAGE_URL=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_ARISTA_CONTEXT_URL=
EXPO_PUBLIC_ARISTA_COMMUNITY_EVENTS_URL=
```

Firebase and backend URLs are optional; core Health workflows run on-device without them.

### Functions (`functions/.env`)

Optional — only needed if you extend Cloud Functions beyond the defaults.

## Local development

`npx expo prebuild` generates native `ios/` and `android/` projects. Re-run after adding or changing native modules.

From `InsightsScreenExpo/`, install the **development client** once on a physical iPhone (TestFlight builds cannot scan the dev QR):

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios --device
```

Daily dev (simulator or device — one Metro server):

```bash
npm start
```

Then in **that same terminal**:

- **Simulator:** press **`i`**
- **Physical iPhone:** scan the QR in Camera, or in a second terminal run `npm run ios:device`

Simulator-only native rebuild:

```bash
npm run ios
```

Physical device rebuild (Metro should already be running from `npm start`):

```bash
npm run ios:device
```

Android device: `npx expo run:android --device` after prebuild.

## Tests

From `InsightsScreenExpo/`:

```bash
npm run test:ipip
npm run test:heart-rate-chart
npm run test:glucose
npm run test:export
npm run test:health-events
npm run test:location
npm run test:ui-interactions
npm run test:goals
npm run test:medications
```

## TestFlight (EAS)

From `InsightsScreenExpo/` (requires Expo/EAS account and App Store Connect setup):

```bash
eas build --platform ios --profile production --auto-submit
```

Build only, then submit the latest artifact:

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## Deploy backend functions

From repo root:

```bash
npx firebase-tools deploy --only functions
```

Or a single function:

```bash
npx firebase-tools deploy --only functions:communityEvents
```

## Firebase: commit vs ignore

Commit:

- `firebase.json`, `.firebaserc`
- `functions/package.json`, `functions/package-lock.json`

Ignore:

- `InsightsScreenExpo/.env`, `functions/.env`
- service account and other credential files

## Apple HealthKit (iOS)

- Use a real iPhone with the dev client (not Expo Go alone)
- HealthKit capability enabled in the Xcode target
- Usage descriptions in `Info.plist` (configured via `app.config.js`)

Common issues:

- **No script URL** — keep Metro running (`npm start` uses the dev client with `--scheme exp+prism`)
- **Missing HealthKit entitlement** — capability or signing mismatch after prebuild
- **Untrusted developer app** — trust the profile in iPhone Settings
