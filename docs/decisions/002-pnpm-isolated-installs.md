# 002: pnpm workspaces with isolated installs; Metro auto-configured

- Status: accepted
- Date: 2026-10-20

## Context
docs/PLAN.md §1 suggested `node-linker=hoisted` in `.npmrc` if Metro or autolinking broke, and marked it **verify**.

## Decision
- Keep pnpm's default **isolated** installs. Per Expo's monorepo guide, pnpm and Bun isolated installs have first-class support from SDK 54.
- `metro.config.js` is not customised. `expo/metro-config` configures monorepos automatically (SDK 52+), and the guide says to *remove* manual `watchFolders`, `resolver.nodeModulesPaths`, `extraNodeModules` and `disableHierarchicalLookup`.
- The fallback, if needed, is `nodeLinker: hoisted` in **`pnpm-workspace.yaml`**, not `.npmrc`. It's left there commented out.

Verified locally: `expo export -p android` bundles both apps with workspace packages (`@addady/ui-ar`, including its font assets) under isolated installs.

## Consequences
- Workspace packages are consumed as TypeScript source (`main: ./src/index.ts`). Metro transpiles them, and there's no build step until `eg-electricity-tariff` is published (Phase 1 adds a build).
- A native build (prebuild + Gradle) is the final autolinking check (ADR 007).

## Sources
- https://docs.expo.dev/guides/monorepos/
