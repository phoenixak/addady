# 004: Drizzle ORM on expo-sqlite: required Metro/Babel setup

- Status: accepted (wired in Phase 3, when the first schema exists)
- Date: 2026-10-20

## Context
docs/PLAN.md §1 says to add `sql` to Metro `sourceExts` or bundled migrations crash, and asks to verify the setup.

## Decision
Per Drizzle's Expo guide, each app that uses a DB gets:
- `metro.config.js`: `const config = getDefaultConfig(__dirname); config.resolver.sourceExts.push('sql');`. This is the only Metro change; don't add monorepo options (ADR 002).
- `babel.config.js`: `plugins: [['inline-import', { extensions: ['.sql'] }]]` (`babel-plugin-inline-import`).
- `drizzle.config.ts`: `dialect: 'sqlite'`, `driver: 'expo'`.
- Migrations run with `useMigrations` from `drizzle-orm/expo-sqlite/migrator`.

Versions at decision time: drizzle-orm 0.45.4 (peer `expo-sqlite >=14`). SDK 58 removed libSQL from expo-sqlite, which Drizzle's expo driver doesn't need.

## Sources
- https://orm.drizzle.team/docs/get-started/expo-new
- https://expo.dev/changelog/sdk-58
