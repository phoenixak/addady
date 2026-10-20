# 007: Local release builds on Windows; signing key kept outside the repo

- Status: accepted (spike passed 2026-10-20)
- Date: 2026-10-20

## Context
`eas build --local` doesn't run on native Windows, and EAS cloud builds aren't needed at $0. docs/PLAN.md §2 picks option A: `expo prebuild` plus Gradle on this PC.

## Decision
- **Build:** `pnpm --filter @addady/<app> prebuild` (`expo prebuild -p android --clean`), then `apps/<app>/android/gradlew.bat assembleRelease`. `android/` is generated (Continuous Native Generation) and gitignored.
- **Toolchain** (versions from React Native 0.88's `gradle/libs.versions.toml`):
  - Microsoft OpenJDK 17 (winget)
  - Android SDK command-line tools: SHA-256-checked zip from dl.google.com
  - SDK packages: `platforms;android-37.0` (compileSdk 37), `build-tools;37.0.0`, `ndk;27.1.12297006`, `cmake;3.31.6`, `platform-tools`
  - targetSdk 36, minSdk 24; AGP 9.2.1; Gradle 9.4.1
  - Android Studio is installed but not required
- **Windows fixes found by the spike:**
  - Long paths on: `LongPathsEnabled=1` and `git config --system core.longpaths true`. No path-length error showed up after that.
  - **The default CMake 3.22.1 fails** on `react-native-worklets` with `ninja: error: manifest 'build.ninja' still dirty after 100 tries`. Using SDK CMake 3.31.6 fixes it. The config plugin `@addady/config/expo/with-windows-cmake` writes `cmake.dir` into `android/local.properties` on every prebuild, and does nothing outside Windows. After switching CMake, delete stale `node_modules/.pnpm/**/android/.cxx` folders once.
- **Signing:**
  - A single upload/release key: PKCS12, RSA 4096, alias `fynxforge`, valid until 2054.
  - It's stored at `%USERPROFILE%\.keys\egypt-apps\fynxforge-release.jks`.
  - Its random 32-character password lives only in `%USERPROFILE%\.gradle\gradle.properties` as `MYAPP_UPLOAD_*`, per Expo's local production build guide.
  - The plugin `@addady/config/expo/with-release-signing` adds a `release` signingConfig that reads those properties, and falls back to the debug key when they're absent (CI).
  - The certificate's SHA-256 is `5f:87:46:51:51:7f:cf:6d:91:9a:a7:56:25:cb:d5:3c:c4:09:7a:5a:ba:da:6f:4d:de:50:36:31:84:33:ba:18`. Publish it so users and IzzyOnDroid can pin it.
- **Spike result:**
  - A hello-world app (since removed) built with `assembleRelease`: the first build took 10 min including downloads, the rebuild 5.5 min.
  - `apksigner verify` passes: one signer, the release certificate above, v2 scheme.
  - The APK installs and runs on an API 36 emulator.

## Consequences
- **The universal APK is 88.6 MB** (arm64-v8a, armeabi-v7a, x86, x86_64). That's above the 30 MB target, so `release.yml` and local releases must build **per-ABI splits** (arm64-v8a main, armeabi-v7a for old phones). Shrinking (R8/resources) is checked then too.
- Back up the `.jks` and the password offline in two places. Losing them means users can't update.
- `apksigner` and `keytool` need `JAVA_HOME`. It's set at user level, so open a new terminal after setup.

## Sources
- https://docs.expo.dev/guides/local-app-production/
- https://developer.android.com/studio#command-line-tools-only (cmdline-tools 15859902, SHA-256 90ae805d…b04a)
- `node_modules/react-native/gradle/libs.versions.toml` (RN 0.88.0)
