-- ─────────────────────────────────────────────────────────────────
-- Orangs Wholesale Fruit Dealers — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor once.
-- ─────────────────────────────────────────────────────────────────

-- 1. INVENTORY TABLE
create table if not exists inventory (
  id          bigserial primary key,
  fruit       text        not null,
  qty         numeric     not null default 0,
  unit        text        not null default 'kg',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists inventory_updated_at on inventory;
create trigger inventory_updated_at
  before update on inventory
  for each row execute procedure update_updated_at();


-- 2. TRANSACTIONS TABLE
create table if not exists transactions (
  id           bigserial primary key,
  type         text        not null check (type in ('IN','OUT')),
  fruit        text        not null,
  qty          numeric     not null,
  unit         text        not null default 'kg',
  date         date        not null,
  supplier     text        default '',
  collector    text        default '',
  delivered_by text        default '',
  vehicle      text        default '',
  consumer     text        default '',
  note         text        default '',
  created_at   timestamptz not null default now()
);


-- 3. SETTINGS TABLE (for custom units etc.)
create table if not exists settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);


-- 4. ENABLE REALTIME on both tables
-- (Go to Supabase Dashboard → Database → Replication and enable for these tables,
--  OR run the commands below)
alter publication supabase_realtime add table inventory;
alter publication supabase_realtime add table transactions;


-- 5. ROW LEVEL SECURITY
-- For a single-team private app, the simplest approach is to allow
-- all operations (the PIN gate on the frontend is your auth layer).
-- If you want stricter security later, add Supabase Auth here.

alter table inventory    enable row level security;
alter table transactions enable row level security;
alter table settings     enable row level security;

-- Allow all operations from the anon key (PIN-protected frontend)
create policy "Allow all for anon" on inventory    for all using (true) with check (true);
create policy "Allow all for anon" on transactions for all using (true) with check (true);
create policy "Allow all for anon" on settings     for all using (true) with check (true);
