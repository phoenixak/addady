// Ed25519 key management for data/tariffs.json.
//
//   node scripts/tariff-key.mjs keygen   create the secret key (once) and print the PUBLIC key
//   node scripts/tariff-key.mjs sign     sign data/tariffs.json -> data/tariffs.json.sig
//
// The secret key lives OUTSIDE the repo: $TARIFF_SIGNING_KEY, or by default
// ~/.keys/addady/tariff-ed25519.key. It is never printed. Back it up offline.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ed25519 } from '@noble/curves/ed25519.js';

const pkg = fileURLToPath(new URL('..', import.meta.url));
const keyFile =
  process.env.TARIFF_SIGNING_KEY ?? join(homedir(), '.keys', 'addady', 'tariff-ed25519.key');
const toHex = (b) => Buffer.from(b).toString('hex');

function readSecret() {
  if (!existsSync(keyFile)) throw new Error(`no secret key at ${keyFile}; run keygen first`);
  const secret = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'hex');
  if (secret.length !== 32) throw new Error(`${keyFile} is not a 32-byte hex key`);
  return secret;
}

const command = process.argv[2];
if (command === 'keygen') {
  if (existsSync(keyFile)) throw new Error(`${keyFile} already exists; refusing to overwrite`);
  mkdirSync(dirname(keyFile), { recursive: true });
  const secret = ed25519.utils.randomSecretKey();
  writeFileSync(keyFile, `${toHex(secret)}\n`, { mode: 0o600 });
  console.log(`secret key written to ${keyFile} (back it up offline)`);
  console.log(`public key: ${toHex(ed25519.getPublicKey(secret))}`);
} else if (command === 'sign') {
  const dataFile = join(pkg, 'data', 'tariffs.json');
  const data = readFileSync(dataFile);
  if (data.includes(0x0d))
    throw new Error('tariffs.json contains CR characters; sign the LF version');
  const secret = readSecret();
  writeFileSync(`${dataFile}.sig`, `${toHex(ed25519.sign(data, secret))}\n`);
  console.log(`signed ${dataFile} with public key ${toHex(ed25519.getPublicKey(secret))}`);
} else {
  console.error('usage: node scripts/tariff-key.mjs keygen|sign');
  process.exit(2);
}
