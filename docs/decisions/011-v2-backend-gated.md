# 011: v2 backend built but switched off; user-posted reports instead

- Status: accepted
- Date: 2026-10-21

## Context
Opt-in anonymous contributions and household sync would send data to Supabase (EU). Egypt's PDPL requires a PDPC licence to process personal data abroad, and IP addresses and pseudonymous IDs count as personal data. See `docs/research/pdpl.md`.

## Decision
1. **The schema is live on Supabase project `addady`** (`supabase/migrations/`):
   - `app_config` holds the kill switch `data_collection_enabled = false`, publicly readable.
   - `contributions` and `rate_limits` have RLS on, **no policies**, and REVOKEs, so they're unreachable from the public API.
   - The aggregation function is callable only by the service role and enforces **k ≥ 20** even if asked for less.
2. **Edge Function `contribute`:**
   - Allow-list validation.
   - Fails closed: 401 without a key, 503 without its secret, 403 while switched off.
   - No internal errors are returned.
   - Rate limit: HMAC(ip, secret ‖ date). IPs are never stored, and keys can't be linked across days.
3. **Tests:**
   - pgTAP (17 assertions) in `supabase/tests/database`, run in CI on a throwaway local stack (`supabase db start` + `supabase test db`).
   - The suite was also run once against the live project inside a deliberately aborted transaction: all 17 pass, and it leaves no rows and no extension behind.
4. **Learning channel today:** the bill checker offers a **pre-filled GitHub issue**. The user sees the exact text, then opens it and decides to post. The app sends nothing.

## Consequences
- **Found by the suite:** new Supabase projects don't grant tables to `anon`/`authenticated` by default, so the public-read RLS policy on `app_config` was useless without an explicit `GRANT SELECT`. That's fixed in migration `…000100`.
- Turning collection on later needs three things: the PDPL gate cleared, the `RATE_LIMIT_SECRET` Edge Function secret set, and one row updated. No code change.
