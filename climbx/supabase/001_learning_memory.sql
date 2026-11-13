-- CLIMBX learning-memory schema (draft, non-deploying).
-- Requires Supabase auth.uid() identity. Wallet ownership must be verified server-side
-- before inserting wallet bindings. Never authorize by arbitrary wallet text alone.
create schema if not exists climbx;
create table if not exists climbx.wallet_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text not null,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id,wallet_address),
  constraint wallet_address_length check (length(wallet_address) between 32 and 64)
);
create table if not exists climbx.trade_events (
  id uuid primary key default gen_random_uuid(),
  wallet_binding_id uuid not null references climbx.wallet_bindings(id) on delete cascade,
  slot smallint not null check(slot between 0 and 4),
  order_id text not null,
  event_kind text not null check(event_kind in ('OPEN','CLOSE','CANCEL','RECONCILE')),
  mint text not null,
  realized_pnl_lamports bigint,
  event_time timestamptz not null default now(),
  unique(wallet_binding_id,order_id,event_kind)
);
create index if not exists trade_events_wallet_slot_time on climbx.trade_events(wallet_binding_id,slot,event_time desc);
create table if not exists climbx.learning_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet_binding_id uuid not null references climbx.wallet_bindings(id) on delete cascade,
  slot smallint not null check(slot between 0 and 4),
  strategy_version integer not null check(strategy_version > 0),
  completed_trades integer not null check(completed_trades >= 0),
  metrics jsonb not null default '{}'::jsonb,
  proposal jsonb,
  approval text not null default 'PENDING' check(approval in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique(wallet_binding_id,slot,strategy_version),
  constraint approval_after_20 check (approval <> 'APPROVED' or completed_trades >= 20),
  constraint approval_timestamp check ((approval = 'APPROVED') = (approved_at is not null))
);
create index if not exists learning_snapshots_wallet_slot on climbx.learning_snapshots(wallet_binding_id,slot,created_at desc);

alter table climbx.wallet_bindings enable row level security;
alter table climbx.trade_events enable row level security;
alter table climbx.learning_snapshots enable row level security;

-- SELECT only: authenticated user can read records associated with their
-- verified account. No direct browser writes or approval mutations.
drop policy if exists wallet_owner_read on climbx.wallet_bindings;
create policy wallet_owner_read on climbx.wallet_bindings for select to authenticated
  using(user_id = (select auth.uid()));
drop policy if exists trade_owner_read on climbx.trade_events;
create policy trade_owner_read on climbx.trade_events for select to authenticated
  using(exists(select 1 from climbx.wallet_bindings b where b.id=wallet_binding_id and b.user_id=(select auth.uid())));
drop policy if exists learning_owner_read on climbx.learning_snapshots;
create policy learning_owner_read on climbx.learning_snapshots for select to authenticated
  using(exists(select 1 from climbx.wallet_bindings b where b.id=wallet_binding_id and b.user_id=(select auth.uid())));

-- Default private schema: do not expose via Supabase API until reviewed.
-- Server writes should use a narrowly scoped backend identity and verified
-- wallet binding. Service-role keys must NEVER be shipped to the browser.
revoke all on schema climbx from public, anon, authenticated;
revoke all on all tables in schema climbx from public, anon, authenticated;
