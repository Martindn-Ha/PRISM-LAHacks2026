# LAHacks2026

Connected wellness demo app with:
- Expo iOS client (`InsightsScreenExpo`)
- Firebase Cloud Functions backend (`functions`)
- Cloudinary media uploads
- Firestore-backed community progress posts
- Ticketmaster + Eventbrite event aggregation for Events + Map views
- Optional geocoding fallback when providers return address text without coordinates

## Project Structure

- `InsightsScreenExpo/`: Expo React Native app
- `functions/`: Firebase HTTPS functions
- `firebase.json`, `.firebaserc`: Firebase project config

## Current Feature Set

- **Progress Board pipeline**
  - User can publish image-based progress posts.
  - Image uploads to Cloudinary.
  - Firestore stores post metadata.
  - Cloudinary URL variants are derived for feed + thumbnail use.
- **Community Events**
  - `communityEvents` function merges Ticketmaster + Eventbrite.
  - App Events tab renders live Upcoming/Past events.
  - Event source links open in browser.
- **Map integration**
  - Map chips include `All`, `Ticketmaster`, and `Eventbrite`.
  - Provider events are shown as map markers at event coordinates.
  - If an event has address text but no coordinates, backend can geocode and fill lat/lon.
- **Health/Insights**
  - iOS Apple Health integration for Insights workflows.

## Environment Variables

Do not commit real `.env` files. Use the provided examples:

- `InsightsScreenExpo/.env.example`
- `functions/.env.example`

### App (`InsightsScreenExpo/.env`)

```bash
# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
EXPO_PUBLIC_COMMUNITY_SPOTLIGHT_IMAGE_URL=

# Firebase Web App Config
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Backend endpoints
EXPO_PUBLIC_ARISTA_CONTEXT_URL=
EXPO_PUBLIC_ARISTA_COMMUNITY_EVENTS_URL=
```

### Functions (`functions/.env`)

```bash
TICKETMASTER_API_KEY=
EVENTBRITE_PRIVATE_TOKEN=
# Optional; if omitted, fallback geocoder is used with stricter rate limits
GOOGLE_MAPS_API_KEY=
```

## Local App Run (iOS dev client)

From `InsightsScreenExpo/`:

```bash
npx expo prebuild
cd ios && pod install && cd ..
npx expo start --dev-client --lan --clear
```

In a second terminal:

```bash
cd "/Users/adminpersonberg/Desktop/LAHacks2026/InsightsScreenExpo"
npx expo run:ios --device --no-bundler
```

## Deploy Backend Functions

From repo root:

```bash
npx firebase-tools deploy --only functions:communityEvents
```

Deploy all functions:

```bash
npx firebase-tools deploy --only functions
```

## Firebase Config: Commit vs Ignore

Commit:
- `firebase.json`
- `.firebaserc`
- `functions/package.json`
- `functions/package-lock.json`

Ignore:
- `InsightsScreenExpo/.env`
- `functions/.env`
- local credentials/service account files

## Apple HealthKit Notes (iOS)

Ensure:
- Testing on a real iPhone (not Expo Go only)
- Xcode target has HealthKit capability enabled
- `Info.plist` contains health usage descriptions

Common issues:
- **No script URL**: keep Metro running with `expo start --dev-client`.
- **Missing HealthKit entitlement**: capability/signing mismatch.
- **Untrusted developer app**: trust profile in iPhone settings.