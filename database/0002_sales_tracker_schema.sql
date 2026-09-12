-- Sales Tracker schema additions (target/commission/shift layer on top of the Logger's
-- categories/orders/order_values tables). Additive only — no changes to existing tables.
-- Run in the Supabase SQL editor against the same project as the Logger.

create table stores (
  id bigint generated always as identity primary key,
  name text not null,
  active boolean not null default true
);

insert into stores (name) values ('Fyshwick');

create table monthly_targets (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  year integer not null,
  month integer not null check (month between 1 and 12),
  agreed_target numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, year, month)
);

create table shift_weight_settings (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  weekday_weight numeric not null default 1,
  weekend_weight numeric not null default 1,
  effective_from date not null,
  created_at timestamptz not null default now()
);

create table staff_shifts (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  rep_option_id bigint not null references category_options (id),
  year integer not null,
  month integer not null check (month between 1 and 12),
  weekday_shifts integer not null default 0,
  weekend_shifts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, rep_option_id, year, month)
);

create table staff_monthly_target_snapshots (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  rep_option_id bigint not null references category_options (id),
  year integer not null,
  month integer not null check (month between 1 and 12),
  weekday_shifts integer not null,
  weekend_shifts integer not null,
  weekday_weight numeric not null,
  weekend_weight numeric not null,
  individual_target numeric not null,
  tier_25 numeric not null,
  tier_50 numeric not null,
  tier_75 numeric not null,
  calculated_at timestamptz not null default now(),
  unique (store_id, rep_option_id, year, month)
);

alter table stores enable row level security;
alter table monthly_targets enable row level security;
alter table shift_weight_settings enable row level security;
alter table staff_shifts enable row level security;
alter table staff_monthly_target_snapshots enable row level security;

create policy "authenticated full access" on stores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on monthly_targets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on shift_weight_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on staff_shifts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on staff_monthly_target_snapshots
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
