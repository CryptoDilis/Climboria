"""Fail-closed CLIMBX live release gate. Never deploys or signs transactions."""
import argparse
import json
from pathlib import Path

REQUIRED = (
    "scoped_onchain_authorization",
    "revocation_and_expiry_onchain",
    "spend_caps_onchain",
    "solana_validator_signed_execution",
    "devnet_end_to_end_execution",
    "jupiter_and_native_sol_route_proof",
    "independent_rpc_finality_reconciliation",
    "fees_rent_slippage_accounting",
    "multi_worker_chaos_tests",
    "independent_security_audit",
    "production_monitoring_and_rollback",
    "owner_release_approval",
    "website_icon_card_and_manual",
)

def evaluate(evidence):
    if not isinstance(evidence, dict):
        return {"decision": "NO_GO", "missing": list(REQUIRED)}
    verified = evidence.get("requirements")
    if not isinstance(verified, dict):
        return {"decision": "NO_GO", "missing": list(REQUIRED)}
    missing = []
    for key in REQUIRED:
        item = verified.get(key)
        if not isinstance(item, dict) or item.get("status") != "verified" or not all(
            isinstance(item.get(field), str) and item[field].strip()
            for field in ("evidence_url", "reviewer")
        ):
            missing.append(key)
    return {
        "decision": "NO_GO" if missing else "READY_FOR_MANUAL_REVIEW",
        "missing": missing,
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", default="climbx/release_evidence.json")
    args = parser.parse_args()
    try:
        evidence = json.loads(Path(args.evidence).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        evidence = {}
    result = evaluate(evidence)
    print(json.dumps(result, indent=2))
    return 0 if result["decision"] == "READY_FOR_MANUAL_REVIEW" else 1

if __name__ == "__main__":
    raise SystemExit(main())
