# LAHacks2026

## InsightsScreenExpo iPhone + Apple HealthKit Setup

This project includes Apple HealthKit-backed Insights in `InsightsScreenExpo`.

### Requirements

- iPhone device testing (not Expo Go-only).
- Xcode with the app target configured under your signing team.
- `HealthKit` capability enabled in Xcode target:
  - `ios/InsightsScreenExpo.xcworkspace`
  - Target `InsightsScreenExpo` -> `Signing & Capabilities` -> `+ Capability` -> `HealthKit`
- Health usage keys in `Info.plist`:
  - `NSHealthShareUsageDescription`
  - `NSHealthUpdateUsageDescription`

### Run Commands (in order)

```bash
cd "/Users/adminpersonberg/Desktop/LAHacks2026/InsightsScreenExpo"
npx expo prebuild
```

```bash
cd "/Users/adminpersonberg/Desktop/LAHacks2026/InsightsScreenExpo/ios"
pod install
```

```bash
cd "/Users/adminpersonberg/Desktop/LAHacks2026/InsightsScreenExpo"
npx expo start --dev-client --lan --clear
```

Open a second terminal:

```bash
cd "/Users/adminpersonberg/Desktop/LAHacks2026/InsightsScreenExpo"
npx expo run:ios --device --no-bundler
```

### Common Failures

- **No script URL**: Metro is not running/reachable. Keep `expo start --dev-client --lan --clear` running.
- **Missing `com.apple.developer.healthkit` entitlement**: HealthKit capability is not enabled in the signed target/profile.
- **Unable to trust developer app**: trust the developer profile on iPhone under `Settings -> General -> VPN & Device Management`.

### Verification

After install, open `Insights` and tap `Connect Apple Health`.
If needed, verify access under iPhone settings:

- `Settings -> Privacy & Security -> Health -> InsightsScreenExpo`