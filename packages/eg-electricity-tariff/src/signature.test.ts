import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';

import { TARIFF_PUBLIC_KEY_HEX, verifyTariffSignature } from './signature';

const data = new Uint8Array(readFileSync(new URL('../data/tariffs.json', import.meta.url)));
const sig = readFileSync(new URL('../data/tariffs.json.sig', import.meta.url), 'utf8');

describe('tariffs.json signature', () => {
  it('the committed signature verifies against the bundled public key (re-sign after editing the JSON)', () => {
    expect(verifyTariffSignature(data, sig)).toBe(true);
  });

  it('fails when a single byte of the data changes', () => {
    const tampered = data.slice();
    const i = tampered.length - 3;
    tampered[i] = (tampered[i] ?? 0) ^ 1;
    expect(verifyTariffSignature(tampered, sig)).toBe(false);
  });

  it('fails for another key', () => {
    const other = Buffer.from(ed25519.getPublicKey(ed25519.utils.randomSecretKey())).toString(
      'hex',
    );
    expect(verifyTariffSignature(data, sig, other)).toBe(false);
  });

  it('fails (without throwing) on malformed hex, wrong lengths or an invalid point', () => {
    expect(verifyTariffSignature(data, 'zz')).toBe(false);
    expect(verifyTariffSignature(data, 'abc')).toBe(false);
    expect(verifyTariffSignature(data, sig.slice(0, 64))).toBe(false);
    expect(verifyTariffSignature(data, sig, TARIFF_PUBLIC_KEY_HEX.slice(0, 32))).toBe(false);
    expect(verifyTariffSignature(data, sig, 'ff'.repeat(32))).toBe(false);
  });
});
