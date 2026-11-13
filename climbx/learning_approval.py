"""CLIMBX learning approval domain rules. No HTTP server or DB connectivity yet.

Never accept completed-trade counts or wallet ownership from browser input.
"""
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class LearningSnapshot:
    wallet_binding_id: str
    slot: int
    version: int
    completed_trades: int
    status: str = "PENDING"
    proposal: Optional[dict] = None

@dataclass(frozen=True)
class VerifiedContext:
    authenticated_user_id: str
    wallet_binding_id: str
    verified_owner_user_id: str

def decide(snapshot, context, decision, *, current_version, stored_completed_trades):
    """Pure decision: caller must supply trusted DB values in a transaction.

    Returns (code, next_status). Actual mutation must use a conditional SQL
    update with owner/version/status predicates to avoid races.
    """
    if not isinstance(snapshot, LearningSnapshot) or not isinstance(context, VerifiedContext):
        return ("INVALID", None)
    if not all(type(x) is int for x in (snapshot.slot, snapshot.version, snapshot.completed_trades, current_version, stored_completed_trades)):
        return ("INVALID", None)
    if not 0 <= snapshot.slot < 5 or min(snapshot.version, current_version) < 1 or min(snapshot.completed_trades, stored_completed_trades) < 0:
        return ("INVALID", None)
    if not all((context.authenticated_user_id, context.wallet_binding_id, context.verified_owner_user_id, snapshot.wallet_binding_id)):
        return ("UNAUTHENTICATED", None)
    if context.authenticated_user_id != context.verified_owner_user_id or context.wallet_binding_id != snapshot.wallet_binding_id:
        return ("FORBIDDEN", None)
    if decision not in ("YES", "NO"):
        return ("INVALID_DECISION", None)
    if snapshot.status != "PENDING":
        return ("ALREADY_DECIDED", None)
    if snapshot.version != current_version:
        return ("STALE_VERSION", None)
    if snapshot.completed_trades != stored_completed_trades:
        return ("STALE_TRADE_COUNT", None)
    if decision == "YES" and stored_completed_trades < 20:
        return ("NOT_ENOUGH_TRADES", None)
    if decision == "YES" and (not isinstance(snapshot.proposal, dict) or not snapshot.proposal):
        return ("NO_PROPOSAL", None)
    return ("OK", "APPROVED" if decision == "YES" else "REJECTED")
