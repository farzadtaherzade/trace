# Trace

[![Build Android APK](https://github.com/farzadtaherzade/trace/actions/workflows/build-apk.yml/badge.svg)](https://github.com/farzadtaherzade/trace/actions/workflows/build-apk.yml)

Trace is a private, local-first route journal. Record running, walking, cycling and driving
routes with background GPS, get distance milestone rewards, mark nearby stores as treat
spots, and keep your full history on the device.

## Features

- **Live tracing** — activity picker (run / walk / cycle / drive), 3-2-1 countdown,
  auto-pause when you stop moving, live HUD with distance, duration, pace/speed and calories.
- **Background GPS** — routes keep recording when the app is backgrounded or the screen is
  locked (requires a development build).
- **Pause and resume** — pause a route and continue within 20 minutes. After 20 minutes the
  route is saved as *unfinished*: resume it later or mark it incomplete.
- **Milestones and treats** — 300 m, 1 km, 2 km, 5 km, 10 km unlock rewards with haptics,
  voice announcements and confetti. Mark nearby stores on the map and check in within 100 m
  to earn a treat.
- **History and detail** — speed-coloured route, start/finish markers, route replay,
  per-km splits, elevation chart, weather at trace time, photos, rename and delete.
- **Goals, streaks and challenges** — daily/weekly distance goals with activity rings,
  consecutive-day streaks, a solo weekly 5 km challenge and a reward shelf.
- **Share and export** — share a route card as an image, export a single route as GPX, or
  back up everything as JSON.
- **Themes and languages** — dark / light / system theme, English / فارسی with full RTL layout.
  Persian devices open in Persian automatically.

## Run locally

```bash
npm install
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` to open a specific platform.

### Development build required

Background GPS, the map, notifications, haptics and speech are native modules, so a
development build is required — Expo Go is not enough:

```bash
npx expo run:android      # or: npx expo run:ios
# or a cloud build
eas build --profile development
```

### Google Maps on Android

`react-native-maps` needs a Google Maps API key on Android. Create one in the Google Cloud
console (enable *Maps SDK for Android*, then restrict the key to this app's package name and
SHA-1) and add it to `app.json`:

```json
["react-native-maps", { "androidGoogleMapsApiKey": "YOUR_KEY" }]
```

Without a key, iOS works fully and Android shows a blank map.

## Download a ready-made APK

Every push to `main` builds a universal APK (all CPU architectures, signed with the debug
key so it installs directly). Open the
[Actions tab](https://github.com/farzadtaherzade/trace/actions/workflows/build-apk.yml),
open the latest **Build Android APK** run, and download the `trace-universal-apk` artifact.
You can also trigger a build yourself with the **Run workflow** button.

## Quality checks

```bash
npm run typecheck
npm run lint
npx expo export --platform all
```

## Project structure

- `src/app/` — Expo Router screens and layouts.
- `src/components/` — UI catalog (`ui/`) plus `map-canvas`, which renders
  `react-native-maps` on native and a route preview on web.
- `src/constants/` — design tokens (dark + light), tabs, storage keys, map styles.
- `src/i18n/` — `en.ts` and `fa.ts` translations.
- `src/lib/` — SQLite data layer, geo/format helpers, background location task,
  notifications, weather, GPX, and platform-specific drivers.
- `src/providers/` — theme, language and tracking state.
- `.web.ts` files provide browser fallbacks (no SQLite, no background location task).

Set unique `ios.bundleIdentifier` and `android.package` values in `app.json` before store
distribution.
