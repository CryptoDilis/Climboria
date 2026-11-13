-- Phase58 DRAFT ONLY. Backend-only persistent request throttle.
-- Apply through reviewed privileged migrations, not browser Supabase clients.
create table if not exists climbx.wallet_api_rate_limits (
  key_hash text primary key,
  window_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 100000),
  updated_at timestamptz not null default now(),
  constraint rate_limit_hash check (key_hash ~ '^[0-9a-f]{64}$')
);
create index if not exists wallet_api_rate_limits_cleanup_idx on climbx.wallet_api_rate_limits(window_start);
alter table climbx.wallet_api_rate_limits enable row level security;
revoke all on climbx.wallet_api_rate_limits from public, anon, authenticated;
revoke all on schema climbx from public, anon, authenticated;
-- Privileged backend job should periodically purge old windows.
