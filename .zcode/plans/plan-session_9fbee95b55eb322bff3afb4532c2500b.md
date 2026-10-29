# Trace — GitHub repo + CI that builds a universal Android APK

Smallest complete change (ponytail): one config fix, one workflow file, one commit, one repo, verified green.

## 1. Blocking fix (`app.json`)
`expo prebuild -p android` refuses to run without an application ID. Merge in:
- `"android": { "package": "com.farzad.trace" }` (into the existing android section)
- `"ios": { "bundleIdentifier": "com.farzad.trace" }`

## 2. GitHub Actions workflow — `.github/workflows/build-apk.yml`
Triggers on every push to `main` + manual `workflow_dispatch`. Steps:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (node 22, npm cache)
3. `actions/setup-java@v4` (temurin 17)
4. `npm ci`
5. `npx expo prebuild -p android --no-install` (generates the native project fresh each run — `/android` is gitignored, so nothing stale)
6. `cd android && ./gradlew assembleRelease --no-daemon` — Expo's prebuild template disables per-ABI splits, so this emits a single **universal APK** (all ABIs) signed with the debug keystore → directly installable
7. `actions/upload-artifact@v4` → artifact `trace-universal-apk` with `android/app/build/outputs/apk/release/*.apk`, `if-no-files-found: error`

## 3. Review pass (code-reviewer)
- Re-run `npx tsc --noEmit` + `npx expo lint`; fix anything found. (The deep review from earlier this session is already fully applied.)

## 4. Sanity check
- Run `npx expo prebuild -p android --no-install` locally to prove the native project generates (folder stays local, gitignored).

## 5. README
- Add the Actions badge + 3-line "Download the APK" instruction (Actions tab → latest run → artifact).

## 6. Commit, create repo, push
- `git add -A` → single commit (message written from the actual diff)
- `gh repo create farzadtaherzade/trace --public --source=. --push` (name confirmed available)

## 7. Verify the build actually goes green
- Watch the first Actions run (`gh run watch`); fix forward if gradle complains (typical knobs: gradle JVM args, NDK licenses) and report the artifact URL.

## Skipped on purpose (ponytail)
Gradle dependency caching, EAS/Play Store signing (debug-signed test APK), removing the three unused deps, the Android Google Maps API key (map tiles stay blank on Android until you add one — build succeeds regardless), Persian tab-label ellipsis nit.
