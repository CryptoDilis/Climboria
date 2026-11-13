-- CLIMBX backend-only atomic approval transaction (template; NOT APPLIED).
-- Bind parameters through a trusted DB driver, never string interpolation.
-- :user_id MUST come from verified Supabase auth, not request JSON.
-- :wallet_binding_id, :snapshot_id, :decision come from validated request.
-- :decision is YES or NO. Must run as ONE transaction on the same connection.
BEGIN;
SELECT id
FROM climbx.wallet_bindings
WHERE id = :wallet_binding_id AND user_id = :user_id
FOR SHARE;
-- Abort with FORBIDDEN if no wallet binding row was returned.
SELECT id, wallet_binding_id, slot, strategy_version, completed_trades, approval, proposal
FROM climbx.learning_snapshots
WHERE id = :snapshot_id AND wallet_binding_id = :wallet_binding_id
FOR UPDATE;
-- Abort unless a row was returned, approval=PENDING, and strategy_version
-- equals the backend-read latest version for this wallet/slot.
-- The update itself enforces the critical checks, even if prechecks race.
UPDATE climbx.learning_snapshots
SET approval = CASE WHEN :decision = 'YES' THEN 'APPROVED' ELSE 'REJECTED' END,
    approved_at = CASE WHEN :decision = 'YES' THEN now() ELSE NULL END
WHERE id = :snapshot_id
  AND wallet_binding_id = :wallet_binding_id
  AND approval = 'PENDING'
  AND (:decision = 'NO' OR (completed_trades >= 20 AND proposal IS NOT NULL AND proposal <> '{}'::jsonb))
  AND :decision IN ('YES','NO')
  AND strategy_version = (
    SELECT max(strategy_version)
    FROM climbx.learning_snapshots
    WHERE wallet_binding_id = :wallet_binding_id
      AND slot = (SELECT slot FROM climbx.learning_snapshots WHERE id = :snapshot_id)
  )
RETURNING id, approval, strategy_version;
-- If UPDATE returned zero rows, ROLLBACK and report conflict/forbidden.
-- Only COMMIT after validating exactly one updated row.
COMMIT;
