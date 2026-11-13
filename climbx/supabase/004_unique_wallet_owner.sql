-- CLIMBX Phase46: enforce exactly one account binding per Solana wallet.
-- DRAFT, NOT APPLIED. Must be run after auditing duplicate existing bindings.
-- Preflight: query duplicates and STOP migration if any are present:
-- SELECT wallet_address, count(*) FROM climbx.wallet_bindings
-- GROUP BY wallet_address HAVING count(*) > 1;
-- Do NOT silently delete or reassign another user's wallet binding.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM climbx.wallet_bindings
    GROUP BY wallet_address HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'CLIMBX wallet ownership conflicts: resolve with reviewed proof before migration';
  END IF;
END $$;
-- PostgreSQL unique index enforces cross-user ownership atomically, even
-- under concurrent requests. Existing (user_id,wallet_address) unique stays.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_bindings_one_owner_per_wallet
  ON climbx.wallet_bindings(wallet_address);
-- This index is NOT a substitute for signed challenge verification.
-- Wallet addresses must be canonical Solana base58 pubkeys (32 decoded bytes)
-- validated by a trusted backend before any INSERT/UPDATE.
