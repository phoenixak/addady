-- Addady v2: opt-in anonymous monthly contributions (docs/PLAN.md §5, docs/research/pdpl.md).
-- Deny by default: RLS on every table, no policies except public read of app_config.
-- Writes happen only in Edge Functions with the service role, and only while
-- app_config.data_collection_enabled is true (it ships FALSE pending the PDPL gate).

-- ---------------------------------------------------------------- config
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy "app_config is public to read" on public.app_config for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.app_config from anon, authenticated;
insert into public.app_config (key, value) values ('data_collection_enabled', 'false'::jsonb);

-- ---------------------------------------------------------------- contributions
create table public.contributions (
  id bigint generated always as identity primary key,
  -- Date only (no time of day) to avoid correlating submissions with app usage.
  received_on date not null default current_date,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  governorate text not null check (governorate in (
    'cairo','giza','alexandria','qalyubia','sharqia','dakahlia','beheira','kafrElSheikh','gharbia',
    'monufia','damietta','portSaid','ismailia','suez','northSinai','southSinai','redSea','faiyum',
    'beniSuef','minya','asyut','sohag','qena','luxor','aswan','newValley','matrouh')),
  meter_type text not null check (meter_type in ('postpaid','prepaid','coded')),
  tariff_version text not null check (tariff_version ~ '^\d{4}-\d{2}$'),
  kwh integer not null check (kwh between 0 and 10000),
  bill_piasters integer check (bill_piasters between 0 and 5000000),
  household_size text not null check (household_size in ('1','2','3-4','5-6','7+')),
  ac_count smallint not null check (ac_count between 0 and 10),
  electric_water_heater boolean not null,
  dwelling text not null check (dwelling in ('apartment','house','rural'))
);
alter table public.contributions enable row level security;
revoke all on public.contributions from anon, authenticated;

-- ---------------------------------------------------------------- rate limits
-- key = HMAC-SHA256(ip, secret || date): unlinkable across days, never the IP itself.
create table public.rate_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  day date not null default current_date,
  count integer not null default 1 check (count > 0),
  primary key (key_hash, day)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Atomically counts one submission; returns the new count for the day.
create function public.bump_rate_limit(p_key_hash text)
returns integer
language sql
security invoker
set search_path = ''
as $$
  insert into public.rate_limits as r (key_hash) values (p_key_hash)
  on conflict (key_hash, day) do update set count = r.count + 1
  returning r.count;
$$;
revoke execute on function public.bump_rate_limit(text) from public, anon, authenticated;

-- Old rate-limit rows are useless after their day: purge anything older than yesterday.
create function public.purge_rate_limits()
returns void
language sql
security invoker
set search_path = ''
as $$ delete from public.rate_limits where day < current_date - 1; $$;
revoke execute on function public.purge_rate_limits() from public, anon, authenticated;

-- ---------------------------------------------------------------- aggregates (k-anonymity)
-- Median/quartiles per (month, governorate, meter type, household size); cells with fewer than
-- min_k contributions are suppressed. Outliers beyond 1.5 IQR are removed per cell first.
create function public.contribution_aggregates(min_k integer default 20)
returns table (
  month text, governorate text, meter_type text, household_size text,
  n bigint, kwh_p25 numeric, kwh_median numeric, kwh_p75 numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select c.month, c.governorate, c.meter_type, c.household_size,
           percentile_cont(0.25) within group (order by c.kwh) as q1,
           percentile_cont(0.75) within group (order by c.kwh) as q3
    from public.contributions c
    group by 1, 2, 3, 4
  ), kept as (
    select c.* from public.contributions c
    join q using (month, governorate, meter_type, household_size)
    where c.kwh between q.q1 - 1.5 * (q.q3 - q.q1) and q.q3 + 1.5 * (q.q3 - q.q1)
  )
  select k.month, k.governorate, k.meter_type, k.household_size,
         count(*) as n,
         round(percentile_cont(0.25) within group (order by k.kwh)::numeric, 1),
         round(percentile_cont(0.5) within group (order by k.kwh)::numeric, 1),
         round(percentile_cont(0.75) within group (order by k.kwh)::numeric, 1)
  from kept k
  group by 1, 2, 3, 4
  having count(*) >= greatest(min_k, 20)
  order by 1, 2, 3, 4;
$$;
revoke execute on function public.contribution_aggregates(integer) from public, anon, authenticated;
