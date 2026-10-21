// POST /functions/v1/contribute: store one anonymous monthly contribution.
//
// Fails closed (docs/research/pdpl.md):
// - 403 while app_config.data_collection_enabled is not true (it ships false);
// - 503 if the rate-limit secret is missing;
// - no internal error text is ever returned to clients.
// Rate limit: 3 per day per HMAC(ip, secret || date). The IP itself is never stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { validateContribution } from './validate.ts';

const MAX_PER_DAY = 3;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secret = Deno.env.get('RATE_LIMIT_SECRET');
  if (!url || !serviceKey || !secret) return json({ error: 'unavailable' }, 503);

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: flag, error: flagError } = await db
    .from('app_config')
    .select('value')
    .eq('key', 'data_collection_enabled')
    .maybeSingle();
  if (flagError) return json({ error: 'unavailable' }, 503);
  if (flag?.value !== true) return json({ error: 'disabled' }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid' }, 400);
  }
  const row = validateContribution(body);
  if (!row) return json({ error: 'invalid' }, 400);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const today = new Date().toISOString().slice(0, 10);
  const keyHash = await hmacHex(`${secret}|${today}`, ip);
  const { data: count, error: rateError } = await db.rpc('bump_rate_limit', {
    p_key_hash: keyHash,
  });
  if (rateError) return json({ error: 'unavailable' }, 503);
  if (typeof count !== 'number' || count > MAX_PER_DAY) return json({ error: 'rate_limited' }, 429);

  const { error: insertError } = await db.from('contributions').insert(row);
  if (insertError) return json({ error: 'invalid' }, 400);
  return json({ ok: true }, 201);
});
