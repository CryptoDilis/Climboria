#!/usr/bin/env python3
"""Offline review of the fixed Base Sepolia issueSuccessor inner calldata.
No Safe wrapper, signature, chain-state, codehash or release-authorization proof.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re

spec = importlib.util.spec_from_file_location("release_bundle", Path(__file__).with_name("verify-release-bundle.py"))
bundle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundle)
require = bundle.require
# Verified in captured Safe candidate compiler output 15218962412.
SELECTOR = bytes.fromhex("dd01d971")
FIELDS = ("epoch", "valid_after", "deadline", "founder", "distributor", "guard",
          "start", "gaming_wallet_monthly_cap", "quote", "builder", "lp_custody", "tranche_cap")
ADDRESS_FIELDS = {"founder", "distributor", "guard", "quote", "builder", "lp_custody"}

def address(value):
    require(type(value) is str and re.fullmatch(r"0x[0-9a-f]{40}", value)
            and int(value, 16) > 1, "invalid address")
    return value

def uint(value):
    require(type(value) is int and 0 <= value < 2**256, "invalid uint256")
    return value

def decode_payload(raw):
    require(len(raw) == 388 and raw[:4] == SELECTOR, "wrong selector or calldata length")
    values = {}
    for i, field in enumerate(FIELDS):
        word = raw[4+i*32:4+(i+1)*32]
        if field in ADDRESS_FIELDS:
            require(word[:12] == bytes(12), "noncanonical address padding")
            values[field] = address("0x" + word[12:].hex())
        else:
            values[field] = int.from_bytes(word, "big")
    return values

def verify(plan_raw, payload, expected_plan_sha, review_timestamp):
    bundle.hex_value(expected_plan_sha, 64, "independent plan digest")
    require(bundle.digest(plan_raw) == expected_plan_sha, "unapproved plan bytes")
    p = bundle.strict_json(plan_raw)
    require(type(p) is dict and set(p) == {"schema", "status", "chain_id", "source_commit", "safe", "successor",
            "owners", "threshold", "payload_sha256", "expected_epoch", "fields"}, "plan schema mismatch")
    require(type(p["schema"]) is int and p["schema"] == 1 and p["status"] == "REVIEW_ONLY_NO_GO",
            "unsupported or approved plan")
    require(type(p["chain_id"]) is int and p["chain_id"] == 84532, "wrong chain")
    bundle.hex_value(p["source_commit"], 40, "source commit")
    bundle.hex_value(p["payload_sha256"], 64, "payload digest")
    require(bundle.digest(payload) == p["payload_sha256"], "payload digest mismatch")
    safe, successor = address(p["safe"]), address(p["successor"])
    require(type(p["threshold"]) is int and p["threshold"] == 3, "wrong threshold")
    require(type(p["owners"]) is list and len(p["owners"]) == 5, "wrong owner count")
    owners = set(map(address, p["owners"]))
    require(len(owners) == 5, "duplicate owner")
    fields = p["fields"]
    require(type(fields) is dict and set(fields) == set(FIELDS), "field schema mismatch")
    for field, value in fields.items():
        (address if field in ADDRESS_FIELDS else uint)(value)
    require(decode_payload(payload) == fields, "decoded payload differs from reviewed intent")
    require(uint(p["expected_epoch"]) > 0 and fields["epoch"] == p["expected_epoch"], "stale epoch")
    now = uint(review_timestamp)
    require(fields["valid_after"] <= now < fields["deadline"] <= fields["start"], "invalid authorization window")
    require(fields["deadline"] - fields["valid_after"] <= 86400, "window exceeds one day")
    require(now < fields["start"] <= now + 365*86400, "invalid vesting start")
    require(0 < fields["gaming_wallet_monthly_cap"] <= 5185185180000, "gaming cap exceeds test ceiling")
    require(0 < fields["tranche_cap"] <= 222222222000000, "liquidity tranche exceeds reserve")
    exclusive = [safe, successor, fields["guard"], fields["founder"], fields["distributor"], fields["lp_custody"]]
    require(len(set(exclusive)) == len(exclusive) and owners.isdisjoint(exclusive), "reserved role overlap")
    require(fields["quote"] != fields["lp_custody"], "quote and LP custody overlap")
    return {"status": "INNER_CALL_MATCHES_REVIEWED_PLAN_NO_GO", "plan_sha256": expected_plan_sha,
            "payload_sha256": p["payload_sha256"], "source_commit": p["source_commit"],
            "chain_id": 84532, "testnet": "NO_GO", "mainnet": "NO_GO",
            "limitations": "Only decoded inner call and pinned review intent. Independently verify current chain state, Safe wrapper and nonce, contract identities, reviewer and plan digest provenance before any authorization."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan")
    parser.add_argument("payload", help="raw 388-byte inner calldata, not a transaction or signature")
    parser.add_argument("--expected-plan-sha256", required=True)
    parser.add_argument("--review-timestamp", required=True, type=int, help="independently observed chain timestamp, not a self-asserted plan timestamp")
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.plan).read_bytes(), Path(args.payload).read_bytes(),
                            args.expected_plan_sha256, args.review_timestamp), indent=2))
