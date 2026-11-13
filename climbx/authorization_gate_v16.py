"""Fail-closed policy evaluation for PAPER tests; NOT a Solana delegation mechanism."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Authorization:
    wallet: str
    issued_at: int
    expires_at: int
    revoked: bool
    spend_cap: int
    fee_cap: int
    spent: int = 0
    fees_spent: int = 0
    allowed_mints: frozenset = frozenset()
    allowed_actions: frozenset = frozenset(('BUY', 'SELL'))


def evaluate(auth, *, wallet, action, mint, amount, fee, now, pending_spend=0, pending_fees=0):
    """Local advisory gate only. Real enforcement must be on-chain or cryptographically scoped."""
    if not isinstance(auth, Authorization): return 'NO_AUTH'
    if auth.revoked: return 'REVOKED'
    if not all(type(x) is int for x in (auth.issued_at,auth.expires_at,auth.spend_cap,auth.fee_cap,auth.spent,auth.fees_spent,amount,fee,now,pending_spend,pending_fees)):
        return 'INVALID_NUMERIC'
    if auth.issued_at >= auth.expires_at or auth.spend_cap < 0 or auth.fee_cap < 0 or min(auth.spent,auth.fees_spent,amount,fee,pending_spend,pending_fees)<0:
        return 'INVALID_LIMIT'
    if wallet != auth.wallet or not wallet: return 'WRONG_WALLET'
    if action not in ('BUY','SELL') or action not in auth.allowed_actions: return 'ACTION_DENIED'
    if not mint or mint not in auth.allowed_mints: return 'MINT_DENIED'
    if now < auth.issued_at or now >= auth.expires_at: return 'OUTSIDE_WINDOW'
    if action == 'BUY' and now >= auth.expires_at-1800: return 'ENTRY_CUTOFF'
    if auth.spent + pending_spend + amount > auth.spend_cap: return 'SPEND_CAP'
    if auth.fees_spent + pending_fees + fee > auth.fee_cap: return 'FEE_CAP'
    return 'ALLOW_PAPER_ONLY'
