#!/usr/bin/env python3
"""Bind reviewed evidence, issuance and unsigned Safe intent to one byte snapshot.
Offline consistency only, never authorization or authenticated chain state.
"""
import argparse
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("envelope", Path(__file__).with_name("verify-safe-envelope.py"))
envelope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(envelope)
bundle = envelope.bundle
issuance = envelope.issuance
require = bundle.require

def verify(root, manifest_pin, observation_pin, review_timestamp, max_age_seconds=300):
    report, data = bundle.verified_snapshot(root, manifest_pin, schema=2)
    bundle.hex_value(observation_pin, 64, "independent observation digest")
    require(bundle.digest(data["state_observation"]) == observation_pin, "observation pin mismatch")
    obs = bundle.strict_json(data["state_observation"])
    require(type(obs) is dict and set(obs) == {"schema", "status", "chain_id", "safe", "guard",
            "block_number", "block_hash", "timestamp", "nonce", "epoch", "owners", "threshold"},
            "observation schema mismatch")
    require(type(obs["schema"]) is int and obs["schema"] == 1 and obs["status"] == "REVIEW_ONLY_NO_GO",
            "unsupported observation")
    require(type(obs["chain_id"]) is int and obs["chain_id"] == 84532, "wrong observation chain")
    require(issuance.uint(obs["block_number"]) > 0, "invalid block")
    require(type(obs["block_hash"]) is str and obs["block_hash"].startswith("0x"), "invalid block hash")
    bundle.hex_value(obs["block_hash"][2:], 64, "block hash")
    ts = issuance.uint(obs["timestamp"])
    now = issuance.uint(review_timestamp)
    require(type(max_age_seconds) is int and 0 < max_age_seconds <= 300, "invalid freshness limit")
    require(ts <= now and now-ts <= max_age_seconds, "stale or future observation")
    plan_raw = data["deployment_plan"]
    payload = data["issuance_payload"]
    tx_raw = data["unsigned_envelope"]
    plan_pin = bundle.digest(plan_raw)
    tx_pin = bundle.digest(tx_raw)
    result = envelope.verify(tx_raw, plan_raw, payload, tx_pin, plan_pin, issuance.uint(obs["nonce"]), now)
    plan = bundle.strict_json(plan_raw)
    require(report["source_commit"] == result["source_commit"], "manifest and plan source mismatch")
    require(issuance.address(obs["safe"]) == plan["safe"], "observation Safe mismatch")
    require(issuance.address(obs["guard"]) == plan["fields"]["guard"], "observation guard mismatch")
    require(issuance.uint(obs["epoch"]) == plan["expected_epoch"], "observation epoch mismatch")
    require(type(obs["threshold"]) is int and obs["threshold"] == plan["threshold"], "observation threshold mismatch")
    require(type(obs["owners"]) is list and len(obs["owners"]) == 5, "observation owner count")
    owners = set(map(issuance.address, obs["owners"]))
    require(len(owners) == 5 and owners == set(plan["owners"]), "observation owner mismatch")
    require(plan["fields"]["valid_after"] <= ts < plan["fields"]["deadline"], "observation outside authorization window")
    return {"status": "INTEGRATED_REVIEW_EVIDENCE_MATCHES_NO_GO", "chain_id":84532,
            "source_commit":result["source_commit"], "artifact_count":report["artifact_count"],
            "manifest_sha256":manifest_pin, "observation_sha256":observation_pin,
            "plan_sha256":plan_pin, "envelope_sha256":tx_pin, "payload_sha256":result["payload_sha256"],
            "block_number":obs["block_number"], "block_hash":obs["block_hash"], "observation_age_seconds":now-ts,
            "testnet":"NO_GO", "mainnet":"NO_GO",
            "limitations":"Byte and field consistency only. Pins and review time must come from independent trusted sources; block hash, nonce, epoch, owners, deployed code, actual artifact semantics, Safe EIP-712 hash, signatures and reviewer identity are not independently authenticated by this tool."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle")
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--observation-sha256", required=True)
    parser.add_argument("--review-timestamp", required=True, type=int)
    args = parser.parse_args()
    print(json.dumps(verify(args.bundle, args.manifest_sha256, args.observation_sha256, args.review_timestamp), indent=2))
