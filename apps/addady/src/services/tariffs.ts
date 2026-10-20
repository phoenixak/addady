// Tariff data: the copy bundled with the app, replaced by a newer SIGNED copy from GitHub when one
// verifies. A download that fails the Ed25519 check or the schema is ignored (docs/PLAN.md §11).
import {
  bundledTariffs,
  parseTariffFile,
  verifyTariffSignature,
  type TariffFile,
} from 'eg-electricity-tariff';

import { loadTariffCache, saveTariffCache } from '../db/repo';

const BASE =
  'https://raw.githubusercontent.com/phoenixak/addady/main/packages/eg-electricity-tariff/data/';

/** The newest of the bundled and the verified cached tariffs (by `updated` date). */
export async function currentTariffs(): Promise<TariffFile> {
  const cached = await loadTariffCache();
  if (!cached) return bundledTariffs;
  try {
    const bytes = new TextEncoder().encode(cached.json);
    if (!verifyTariffSignature(bytes, cached.signature)) return bundledTariffs;
    const file = parseTariffFile(JSON.parse(cached.json));
    return file.updated > bundledTariffs.updated ? file : bundledTariffs;
  } catch {
    return bundledTariffs;
  }
}

export type RefreshResult = 'updated' | 'up-to-date' | 'failed';

/** Downloads tariffs.json + signature; stores them only if the signature and schema check out. */
export async function refreshTariffs(fetchImpl: typeof fetch = fetch): Promise<RefreshResult> {
  try {
    const [jsonRes, sigRes] = await Promise.all([
      fetchImpl(`${BASE}tariffs.json`, { cache: 'no-store' }),
      fetchImpl(`${BASE}tariffs.json.sig`, { cache: 'no-store' }),
    ]);
    if (!jsonRes.ok || !sigRes.ok) return 'failed';
    const json = await jsonRes.text();
    const signature = (await sigRes.text()).trim();
    if (!verifyTariffSignature(new TextEncoder().encode(json), signature)) return 'failed';
    const file = parseTariffFile(JSON.parse(json));
    const current = await currentTariffs();
    if (file.updated <= current.updated) return 'up-to-date';
    await saveTariffCache(json, signature);
    return 'updated';
  } catch {
    return 'failed';
  }
}
