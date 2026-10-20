# 001: Expo SDK 58 (React Native 0.88)

- Status: accepted
- Date: 2026-10-20

## Context
docs/PLAN.md §1 picks SDK 58, with SDK 57 as a fallback if a key library isn't ready. SDK 56 is skipped (Hermes memory regression).

## Decision
Use **Expo SDK 58**: `expo@~58.0.16`, `react-native@0.88.0`, `react@19.3.0`, TypeScript `~6.0.3`, scaffolded from `create-expo-app --template default@sdk-58`.

Verified against the vendor:
- SDK 58 was released on 15 Oct 2026 and moves React Native from 0.86 to 0.88.
- It needs Node 22.13+ (22.x), 24.3+ (24.x) or 26+. Odd-numbered majors are unsupported. The repo pins `engines.node >=24.3.0`; this PC has 24.19.
- Key libraries resolve against SDK 58: victory-native 42.0.1 needs `@shopify/react-native-skia >=2.6 <3`, and `expo install` picked Skia 2.14.0. drizzle-orm 0.45.4 needs `expo-sqlite >=14`.
- Other SDK 58 changes that affect us: libSQL support was removed from expo-sqlite (we don't use it), and expo-router's web output now defaults to `server` (we set `web.output: "static"`).

## Consequences
- TypeScript 6 defaults `types` to `[]`, so app tsconfigs list `"types": ["jest"]` explicitly.
- SDK 57 stays the documented fallback if the spikes (ADR 006, 007) hit a blocking SDK 58 bug.

## Sources
- https://expo.dev/changelog/sdk-58
- npm registry (`npm view expo version`, `victory-native peerDependencies`), 2026-10-20
