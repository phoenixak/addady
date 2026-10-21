-- New Supabase projects no longer grant table privileges to anon/authenticated by default, so the
-- "public to read" RLS policy on app_config had nothing to apply to: the app could not read the
-- kill switch. Found by the pgTAP suite (anon can read the kill switch). Read-only, this table only.
grant select on public.app_config to anon, authenticated;
