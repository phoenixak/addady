// Detects Arabic text stored in visual (reversed) order instead of logical order. Reversed copy
// usually comes from pasting text out of a terminal or PDF that rendered RTL left-to-right.
// Pure TS, so the app's ar.json test and scripts/check-arabic-order.ts can both use it.
//
// Characters are built from code points so this file contains none of the letters it looks for.

const cp = (code: number) => String.fromCodePoint(code);
const range = (from: number, to: number) => `${cp(from)}-${cp(to)}`;

/** Arabic Presentation Forms-A and -B: glyph-shaped code points left behind by visual-order copy. */
const PRESENTATION_FORMS = new RegExp(`[${range(0xfb50, 0xfdff)}${range(0xfe70, 0xfeff)}]`, 'u');
/** Arabic letters (hamza through yeh, plus the extended letters used in Egyptian text). */
const ARABIC_WORD = new RegExp(`[${range(0x0621, 0x064a)}${range(0x0671, 0x06d3)}]+`, 'gu');
const TEH_MARBUTA = cp(0x0629); // only ever ends a word
const ALEF_MAKSURA = cp(0x0649); // only ever ends a word
const ALEF = cp(0x0627);
const LAM = cp(0x0644);
const DEFINITE_ARTICLE = ALEF + LAM;
const REVERSED_ARTICLE = LAM + ALEF;
/** Common real words ending in lam-alef (adverbs, greetings). This file is exempt from the scan. */
const REAL_LAM_ALEF_WORDS = new Set([
  'مثلا',
  'فيلا',
  'أولا',
  'أصلا',
  'فعلا',
  'أهلا',
  'قليلا',
  'طويلا',
  'جميلا',
  'كاملا',
  'حالا',
  'عاجلا',
  'مستقبلا',
]);

/**
 * Returns why `text` looks like reversed (visual-order) Arabic, or null if it looks logical.
 * Strings without Arabic letters always return null.
 */
export function reversedArabicReason(text: string): string | null {
  if (PRESENTATION_FORMS.test(text)) {
    return 'contains Arabic presentation forms (U+FB50-U+FEFF), typical of visual-order copy';
  }
  const words = text.match(ARABIC_WORD) ?? [];
  const startsWithFinalOnly = words.find((w) => w[0] === TEH_MARBUTA || w[0] === ALEF_MAKSURA);
  if (startsWithFinalOnly) {
    return `a word starts with U+${startsWithFinalOnly.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}, a letter that only ends words`;
  }
  // Reversed "ال + noun" gives a word of 4+ letters ending in lam-alef. Real words that end in
  // lam-alef are short ("يلا") or common adverbs, which are allow-listed.
  const withArticle = words.filter((w) => w.length > 3 && w.startsWith(DEFINITE_ARTICLE)).length;
  const withReversedArticle = words.filter(
    (w) => w.length > 3 && w.endsWith(REVERSED_ARTICLE) && !REAL_LAM_ALEF_WORDS.has(w),
  ).length;
  if (withReversedArticle > withArticle) {
    return `${withReversedArticle} word(s) end in lam-alef but only ${withArticle} start with alef-lam`;
  }
  return null;
}

/** Collects every string value in a (nested) JSON object, with its dotted key path. */
export function collectStrings(value: unknown, path = ''): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => collectStrings(v, path ? `${path}.${i}` : String(i)));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => collectStrings(v, path ? `${path}.${k}` : k));
  }
  return [];
}
