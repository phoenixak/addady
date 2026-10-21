-- pgTAP: security properties of the v2 schema. Run with `supabase test db`.
begin;
select plan(17);

-- RLS is enabled on every table.
select ok((select relrowsecurity from pg_class where oid = 'public.app_config'::regclass), 'RLS on app_config');
select ok((select relrowsecurity from pg_class where oid = 'public.contributions'::regclass), 'RLS on contributions');
select ok((select relrowsecurity from pg_class where oid = 'public.rate_limits'::regclass), 'RLS on rate_limits');

-- The kill switch ships off.
select is((select value from public.app_config where key = 'data_collection_enabled'), 'false'::jsonb, 'data collection is disabled by default');

-- The public (anon) role.
set local role anon;
select is((select value from public.app_config where key = 'data_collection_enabled'), 'false'::jsonb, 'anon can read the kill switch');
select throws_ok($$update public.app_config set value = 'true' where key = 'data_collection_enabled'$$, '42501', null, 'anon cannot flip the kill switch');
select throws_ok($$select * from public.contributions$$, '42501', null, 'anon cannot read contributions');
select throws_ok(
  $$insert into public.contributions (month, governorate, meter_type, tariff_version, kwh, household_size, ac_count, electric_water_heater, dwelling)
    values ('2026-09', 'cairo', 'prepaid', '2026-07', 300, '3-4', 1, true, 'apartment')$$,
  '42501', null, 'anon cannot write contributions directly');
select throws_ok($$select * from public.rate_limits$$, '42501', null, 'anon cannot read rate limits');
select throws_ok($$select public.bump_rate_limit(repeat('a', 64))$$, '42501', null, 'anon cannot call bump_rate_limit');
select throws_ok($$select * from public.contribution_aggregates()$$, '42501', null, 'anon cannot read raw aggregates');
reset role;

-- The authenticated role is just as locked out.
set local role authenticated;
select throws_ok($$select * from public.contributions$$, '42501', null, 'authenticated cannot read contributions');
reset role;

-- k-anonymity: a cell needs >= 20 contributions before it is published.
insert into public.contributions (month, governorate, meter_type, tariff_version, kwh, household_size, ac_count, electric_water_heater, dwelling)
select '2026-09', 'giza', 'postpaid', '2026-07', 280 + g, '3-4', 1, false, 'apartment' from generate_series(1, 19) g;
select is((select count(*) from public.contribution_aggregates()), 0::bigint, '19 contributions: cell suppressed');
select is((select count(*) from public.contribution_aggregates(5)), 0::bigint, 'asking for k=5 still enforces k>=20');

insert into public.contributions (month, governorate, meter_type, tariff_version, kwh, household_size, ac_count, electric_water_heater, dwelling)
values ('2026-09', 'giza', 'postpaid', '2026-07', 300, '3-4', 1, false, 'apartment');
select is((select n from public.contribution_aggregates()), 20::bigint, '20 contributions: cell published');

-- Constraints reject nonsense even from privileged code.
select throws_ok(
  $$insert into public.contributions (month, governorate, meter_type, tariff_version, kwh, household_size, ac_count, electric_water_heater, dwelling)
    values ('2026-09', 'paris', 'prepaid', '2026-07', 300, '3-4', 1, true, 'apartment')$$,
  '23514', null, 'unknown governorate rejected');

-- Rate-limit counter increments atomically per key and day.
select is(public.bump_rate_limit(repeat('b', 64)) + public.bump_rate_limit(repeat('b', 64)), 3, 'counter goes 1 then 2');

select * from finish();
rollback;
