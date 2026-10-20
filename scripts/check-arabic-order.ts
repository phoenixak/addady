// Fails if any tracked text file contains Arabic that looks stored in visual (reversed) order.
// Runs with Node 24's built-in TypeScript type stripping: `node scripts/check-arabic-order.ts`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { reversedArabicReason } from '../packages/ui-ar/src/arabic-text.ts';

const BINARY = /\.(png|jpg|ttf|otf|webp|svg)$/;
// Tests deliberately contain reversed samples, so only the invisible-character check runs on them.
const REVERSED_OK = [
  /\.test\.tsx?$/,
  /^pnpm-lock\.yaml$/,
  /^packages\/ui-ar\/src\/arabic-text\.ts$/,
];

// Invisible bidi/format characters ("Trojan Source"): never allowed in tracked files. Code that
// needs one builds it with String.fromCodePoint().
const cp = (code: number) => String.fromCodePoint(code);
const INVISIBLE = new RegExp(
  `[${cp(0x061c)}${cp(0x200b)}-${cp(0x200f)}${cp(0x202a)}-${cp(0x202e)}${cp(0x2066)}-${cp(0x2069)}${cp(0xfeff)}]`,
  'u',
);

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f && !BINARY.test(f));

let problems = 0;
for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted but still listed
  }
  const checkReversed = !REVERSED_OK.some((re) => re.test(file));
  content.split('\n').forEach((line, i) => {
    const hidden = line.match(INVISIBLE);
    const reason = hidden
      ? `invisible character U+${hidden[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`
      : checkReversed
        ? reversedArabicReason(line)
        : null;
    if (reason) {
      problems += 1;
      console.error(`${file}:${i + 1}: ${reason}`);
    }
  });
}

if (problems > 0) {
  console.error(`check-arabic-order: ${problems} line(s) look reversed`);
  process.exit(1);
}
console.log(`check-arabic-order: ${files.length} files clean`);
