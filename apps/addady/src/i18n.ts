// Arabic copy lives in i18n/ar.json (hand-written, reviewed; docs/PLAN.md §4).
import ar from '../i18n/ar.json';

type Values = Record<string, string | number>;

function lookup(key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      ar,
    );
}

/** Translates a dotted key, replacing {{name}} placeholders. Missing keys return the key itself. */
export function t(key: string, values: Values = {}): string {
  const text = lookup(key);
  if (typeof text !== 'string') return key;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? `{{${name}}}`));
}

export const GOVERNORATES = Object.keys(ar.governorates) as (keyof typeof ar.governorates)[];
export type Governorate = (typeof GOVERNORATES)[number];
