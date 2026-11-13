-- CLIMBX Phase45: durable wallet challenge storage. DRAFT, NOT APPLIED.
-- Execute only through reviewed migrations with privileged backend role.
-- Never expose this private table or a security-definer RPC to browser clients.
create table if not exists climbx.wallet_challenges (
  nonce text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text not null,
  domain text not null,
  chain text not null,
  canonical_message text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint nonce_length check(length(nonce) between 32 and 128),
  constraint wallet_challenge_address_length check(length(wallet_address) between 32 and 64),
  constraint challenge_domain_length check(length(domain) between 1 and 255),
  constraint challenge_chain_length check(length(chain) between 1 and 64),
  constraint challenge_message_length check(length(canonical_message) between 1 and 2048),
  constraint challenge_ttl check(expires_at > issued_at and expires_at <= issued_at + interval '5 minutes'),
  constraint consumed_not_before_issued check(consumed_at is null or consumed_at >= issued_at)
);
create index if not exists wallet_challenges_expiry_idx on climbx.wallet_challenges(expires_at);
create index if not exists wallet_challenges_user_wallet_idx on climbx.wallet_challenges(user_id,wallet_address);
alter table climbx.wallet_challenges enable row level security;
-- Defense in depth: even a misconfigured table grant cannot bypass RLS for
-- non-owner roles; application backend must use reviewed narrow privileges.
revoke all on climbx.wallet_challenges from public, anon, authenticated;
-- Revoke schema usage too, in case this migration runs independently.
revoke all on schema climbx from public, anon, authenticated;

-- After server verifies Supabase auth and Ed25519 over canonical_message:
-- Atomic consume SQL (backend parameters only, never client SQL).
-- UPDATE climbx.wallet_challenges
-- SET consumed_at = :now
-- WHERE nonce = :nonce AND user_id = :verified_user_id
--   AND wallet_address = :verified_wallet AND domain = :expected_domain
--   AND chain = :expected_chain AND consumed_at IS NULL
--   AND issued_at <= :now AND expires_at > :now
--   AND canonical_message = :exact_message_that_was_signed
-- RETURNING nonce;
-- Exactly ONE row must be returned before wallet binding; zero => deny.
-- Wallet binding insertion and nonce consumption MUST be in same transaction,
-- with wallet ownership uniqueness enforced by a separately reviewed migration.
