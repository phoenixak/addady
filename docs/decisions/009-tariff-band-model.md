# 009: Tariff model: bands priced from zero; the regulator wins conflicts; signed data

- Status: accepted
- Date: 2026-10-20

## Context
Public explanations of Egyptian residential bills disagree on two things:
- **The rules:** whether billing is progressive from tier 1 all the way up, and where the cliffs are.
- **The August 2026 prices:** three different tables circulated.

The full research is in `docs/research/tariff.md`.

## Decision
1. **Model:** the month's total kWh selects one **band**. A band is either `progressive` (tiers counted from zero) or `flat` (every kWh at one rate). This is literally how EgyptERA publishes the tariff ("المستهلك أكثر من 650 — من صفر إلى 1000", "consumption over 650: from zero to 1000"), so any future structure can be expressed as data with no code change.
2. **Precedence when sources conflict:**
   1. EgyptERA's published table
   2. official worked examples (EEHC / the ministry)
   3. agreement of two or more independent outlets, checked arithmetically

   Single-source claims stay low-confidence. Conflicts live in `test/golden.json` with `status: "disputed"`, and a test fails the moment a disputed case starts matching, so a resolved dispute can't go unnoticed.
3. **2026-07 prices** (98/115/173/214/241/274) are the only table that reproduces every citizen/state figure in the ministry's subsidy release. They're **medium** confidence until EgyptERA publishes them.
4. **Money:** integer piasters. kWh is an integer. Rates have at most 2 decimals. Rounding is half-up, once per line.
5. **Data integrity:**
   - `data/tariffs.json` is the canonical file. `src/tariffs.data.ts` is generated from it, and a test fails on drift.
   - The file is signed with Ed25519 (`data/tariffs.json.sig`), and a test fails if the JSON changes without re-signing. Prettier ignores the folder.
   - The secret key is at `%USERPROFILE%\.keys\addady\tariff-ed25519.key`, outside the repo. **Back it up offline.**
   - The public key `6b5814ee2ad1b97665c5f8d11f252040a9e03dff67e2b475272daf5036a01237` is bundled in the package and the app.
6. **Distribution:** an npm package `eg-electricity-tariff` (MIT), built with tsup (ESM + CJS + d.ts). Inside the monorepo, the TypeScript source is consumed directly.

## Consequences
- The engine's property tests found that a **zero read (9 EGP) costs more than 1 kWh (1.68 EGP)**. That's in the official schedule, so monotonicity is only claimed from 1 kWh.
- The 651–1000 band follows the regulator (flat), even though one EEHC example implies progressive billing. Bill-mismatch reports after launch will confirm which is right.
