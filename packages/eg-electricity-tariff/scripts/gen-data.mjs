// Regenerates src/tariffs.data.ts from data/tariffs.json (the canonical, signed file).
// Run after editing the JSON: pnpm --filter eg-electricity-tariff gen
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const json = JSON.parse(readFileSync(new URL('data/tariffs.json', root), 'utf8'));
const out = `// GENERATED from data/tariffs.json by scripts/gen-data.mjs. Do not edit by hand.
export const tariffsData: unknown = ${JSON.stringify(json, null, 2)};
`;
writeFileSync(fileURLToPath(new URL('src/tariffs.data.ts', root)), out);
console.log('wrote src/tariffs.data.ts');
