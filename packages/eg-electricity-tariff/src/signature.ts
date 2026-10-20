import { ed25519 } from '@noble/curves/ed25519.js';

/**
 * Ed25519 public key (hex) for data/tariffs.json.sig. The matching secret key is kept offline,
 * outside the repository (scripts/tariff-key.mjs). Apps refuse downloaded tariffs whose
 * signature doesn't verify against this key, so a compromised repo or CDN can't push fake prices.
 */
export const TARIFF_PUBLIC_KEY_HEX =
  '6b5814ee2ad1b97665c5f8d11f252040a9e03dff67e2b475272daf5036a01237';

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** True when `signatureHex` is a valid Ed25519 signature of exactly these bytes. Never throws. */
export function verifyTariffSignature(
  data: Uint8Array,
  signatureHex: string,
  publicKeyHex: string = TARIFF_PUBLIC_KEY_HEX,
): boolean {
  const signature = hexToBytes(signatureHex.trim());
  const publicKey = hexToBytes(publicKeyHex);
  if (!signature || signature.length !== 64 || !publicKey || publicKey.length !== 32) return false;
  try {
    return ed25519.verify(signature, data, publicKey);
    /* v8 ignore start -- @noble/curves 2.x returns false for every malformed input that passes the
       length checks above; this guards the "never throws" contract against future versions. */
  } catch {
    return false;
  }
  /* v8 ignore stop */
}
