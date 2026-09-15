-- Sales Tracker rebuild (Phase 1).
-- Drops the old configurable-category (EAV) entry schema — categories /
-- category_options / order_values / orders — and the old predecessor
-- target/shift tables from 0002, replacing both with a fixed-column orders
-- table and the full target/commission/shift data model from the rebuild brief.
-- Confirmed destructive: no production sales data needs to be preserved.

-- ── Drop old EAV entry schema ──────────────────────────────────────────
drop table if exists order_values cascade;
drop table if exists category_options cascade;
drop table if exists categories cascade;
drop table if exists orders cascade;

-- ── Drop old predecessor target/shift schema ───────────────────────────
drop table if exists staff_monthly_target_snapshots cascade;
drop table if exists staff_shifts cascade;
drop table if exists shift_weight_settings cascade;
drop table if exists monthly_targets cascade;
drop table if exists stores cascade;

-- ── Enums ───────────────────────────────────────────────────────────────
create type guardsman_category_enum as enum ('none', 'sofa', 'dining');
create type delivery_type_enum as enum ('metro', 'interstate');

-- ── stores ────────────────────────────────────────────────────────────
-- Single row for v1 (Fyshwick). Every other table keys to store_id so
-- multi-store isn't a rewrite later.
create table stores (
  id bigint generated always as identity primary key,
  name text not null
);

insert into stores (name) values ('Fyshwick');

-- ── orders (the sale record) ─────────────────────────────────────────
create table orders (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  date date not null,
  consultant text not null,
  order_no text not null,
  casegoods boolean not null default false,
  dining boolean not null default false,
  upholstery boolean not null default false,
  guardsman_category guardsman_category_enum not null default 'none',
  decline_sku boolean not null default false,
  mto boolean not null default false,
  del_type delivery_type_enum not null,
  total numeric not null default 0,
  deposit numeric not null default 0,
  payment_type text,
  attention_required boolean not null default false,
  notes text,
  logged_at timestamptz not null default now(),
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index orders_date_idx on orders (date);
create index orders_consultant_idx on orders (consultant);
create index orders_checked_at_idx on orders (checked_at);

-- ── monthly_targets ───────────────────────────────────────────────────
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

-- ── shift_weight_settings ─────────────────────────────────────────────
-- weekday_weight is fixed at 1 per the brief but stored (not hardcoded) so
-- the formula stays uniform; weekend_weight and hurdle_pct are editable.
create table shift_weight_settings (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  weekday_weight numeric not null default 1,
  weekend_weight numeric not null default 2.5,
  hurdle_pct numeric not null default 0.07,
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (store_id, effective_from)
);

-- ── staff_shifts ──────────────────────────────────────────────────────
create table staff_shifts (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  staff text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  weekday_shifts integer not null default 0,
  weekend_shifts integer not null default 0,
  hours_worked numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, staff, year, month)
);

-- ── staff_loading ─────────────────────────────────────────────────────
-- Per-rep loading percentage, editable per effective period.
create table staff_loading (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  staff text not null,
  loading_pct numeric not null default 0,
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (store_id, staff, effective_from)
);

-- ── staff_monthly_target_snapshots ───────────────────────────────────
-- Snapshotted at calculation time so later setting changes don't rewrite
-- history. final_individual_target already has hurdle_pct and loading_pct
-- applied; tier_25/50/75 are final_individual_target * 1.25/1.5/1.75.
create table staff_monthly_target_snapshots (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores (id),
  staff text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  weekday_shifts integer not null,
  weekend_shifts integer not null,
  weekday_weight numeric not null,
  weekend_weight numeric not null,
  hurdle_pct numeric not null,
  loading_pct numeric not null,
  base_individual_target numeric not null,
  final_individual_target numeric not null,
  tier_25 numeric not null,
  tier_50 numeric not null,
  tier_75 numeric not null,
  calculated_at timestamptz not null default now(),
  unique (store_id, staff, year, month)
);

-- ── RLS ───────────────────────────────────────────────────────────────
alter table stores enable row level security;
alter table orders enable row level security;
alter table monthly_targets enable row level security;
alter table shift_weight_settings enable row level security;
alter table staff_shifts enable row level security;
alter table staff_loading enable row level security;
alter table staff_monthly_target_snapshots enable row level security;

create policy "authenticated full access" on stores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on monthly_targets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on shift_weight_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on staff_shifts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on staff_loading
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on staff_monthly_target_snapshots
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
