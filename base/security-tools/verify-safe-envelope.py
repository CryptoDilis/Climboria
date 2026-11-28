#!/usr/bin/env python3
"""Check pinned unsigned Safe issuance intent. No signing, RPC, or authorization."""
import argparse
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("issuance", Path(__file__).with_name("verify-issuance-plan.py"))
issuance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(issuance)
bundle = issuance.bundle
require = bundle.require
ZERO = "0x" + "0"*40

def verify(raw, plan_raw, payload, expected_sha, expected_plan_sha, observed_nonce, observed_timestamp):
    bundle.hex_value(expected_sha, 64, "independent unsigned envelope digest")
    require(bundle.digest(raw) == expected_sha, "unsigned envelope differs from reviewed bytes")
    obj = bundle.strict_json(raw)
    require(type(obj) is dict and set(obj) == {"schema", "status", "chain_id", "source_commit", "plan_sha256",
            "safe", "to", "nonce", "value", "operation", "safe_tx_gas", "base_gas", "gas_price",
            "gas_token", "refund_receiver", "data"}, "envelope schema mismatch")
    require(type(obj["schema"]) is int and obj["schema"] == 1 and obj["status"] == "REVIEW_ONLY_NO_GO",
            "unsupported or approved envelope")
    require(type(obj["chain_id"]) is int and obj["chain_id"] == 84532, "wrong chain")
    require(obj["plan_sha256"] == expected_plan_sha, "wrong reviewed plan binding")
    result = issuance.verify(plan_raw, payload, expected_plan_sha, observed_timestamp)
    plan = bundle.strict_json(plan_raw)
    require(obj["source_commit"] == result["source_commit"], "source mismatch")
    require(issuance.address(obj["safe"]) == plan["safe"], "wrong Safe")
    require(issuance.address(obj["to"]) == plan["fields"]["guard"], "wrong target")
    require(issuance.uint(obj["nonce"]) == issuance.uint(observed_nonce), "nonce mismatch")
    for key in ("value", "operation", "safe_tx_gas", "base_gas", "gas_price"):
        require(issuance.uint(obj[key]) == 0, "forbidden nonzero " + key)
    for key in ("gas_token", "refund_receiver"):
        require(obj[key] == ZERO, "forbidden " + key)
    require(type(obj["data"]) is str and obj["data"] == "0x"+payload.hex(), "inner calldata mismatch")
    return {"status":"UNSIGNED_ENVELOPE_MATCHES_REVIEWED_INTENT_NO_GO", "chain_id":84532,
            "source_commit":result["source_commit"], "envelope_sha256":expected_sha,
            "plan_sha256":expected_plan_sha, "payload_sha256":result["payload_sha256"],
            "observed_nonce":observed_nonce, "testnet":"NO_GO", "mainnet":"NO_GO",
            "limitations":"SHA256 evidence binding, not EIP-712 Safe transaction hash or signature verification. Nonce and timestamp must be independently obtained from the intended chain and Safe; this tool does not authenticate them, contract state, or reviewer identity."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("envelope")
    parser.add_argument("plan")
    parser.add_argument("payload")
    parser.add_argument("--expected-envelope-sha256", required=True)
    parser.add_argument("--expected-plan-sha256", required=True)
    parser.add_argument("--observed-nonce", type=int, required=True)
    parser.add_argument("--observed-timestamp", type=int, required=True)
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.envelope).read_bytes(), Path(args.plan).read_bytes(),
                           Path(args.payload).read_bytes(), args.expected_envelope_sha256,
                           args.expected_plan_sha256, args.observed_nonce, args.observed_timestamp), indent=2))
