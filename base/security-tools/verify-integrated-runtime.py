#!/usr/bin/env python3
"""Schema-3 offline review: unsigned intent plus exact guard/successor/Safe/singleton runtime bytes.

Separate independent pins for manifest, state observation, role plans and code
observations. All checks use the same verified snapshot. Never authorizes release.
"""
import argparse
import importlib.util
import json
import subprocess
from pathlib import Path

def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

integrated = load_module("integrated", "verify-integrated-review.py")
runtime = load_module("runtime", "verify-runtime-identity.py")
bundle, issuance, require = integrated.bundle, integrated.issuance, integrated.require

SOURCE = "src/SafeQuorumIssuanceFixture.sol"
CONTRACTS = {
    "guard": (SOURCE, "SafeQuorumReserveGuardFixture"),
    "successor": (SOURCE, "V3QuorumSuccessorFixture"),
    "safe": ("lib/safe-contracts/contracts/proxies/SafeProxy.sol", "SafeProxy"),
    "singleton": ("lib/safe-contracts/contracts/Safe.sol", "Safe"),
}

def evm_keccak(code):
    # Use the separately pinned Foundry toolchain, no network or signing.
    # Fail closed on missing tool, timeout, nonzero exit, or invalid result.
    require(type(code) is bytes and len(code) <= 24576, "invalid codehash input")
    result = subprocess.run(["cast", "keccak", "0x"+code.hex()], check=True,
                            capture_output=True, text=True, timeout=15)
    value = result.stdout.strip()
    require(value.startswith("0x"), "invalid cast hash")
    bundle.hex_value(value[2:], 64, "EVM codehash")
    return value[2:]

def role_hash(plan, owner, name):
    matches = [v for v in plan["immutables"].values() if v["owner"] == owner and v["name"] == name]
    require(len(matches) == 1 and matches[0]["type"] == "bytes32", "missing or invalid hash role "+name)
    value = matches[0]["word"]
    bundle.hex_value(value, 64, name)
    return value

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode("ascii")

def pinned_json(raw, pin, label):
    bundle.hex_value(pin, 64, "independent " + label + " digest")
    require(bundle.digest(raw) == pin, label + " pin mismatch")
    return bundle.strict_json(raw)

def role_address(plan, owner, name):
    matches = [v for v in plan["immutables"].values() if v["owner"] == owner and v["name"] == name]
    require(len(matches) == 1, "missing or ambiguous role " + name)
    entry = matches[0]
    require(entry["type"] == "address" or entry["type"].startswith("contract "), "non-address role " + name)
    word = runtime.hex_bytes(entry["word"], name)
    require(len(word) == 32 and word[:12] == bytes(12), "invalid role word")
    return issuance.address("0x" + word[12:].hex())

def verify(root, manifest_pin, state_pin, plans_pin, code_pin, review_timestamp, max_age_seconds=300):
    report, data = bundle.verified_snapshot(root, manifest_pin, schema=3)
    result = integrated.verify_snapshot(report, data, manifest_pin, state_pin, review_timestamp, max_age_seconds)
    intent = bundle.strict_json(data["deployment_plan"])
    state = bundle.strict_json(data["state_observation"])
    plans = pinned_json(data["runtime_plans"], plans_pin, "runtime plans")
    observed = pinned_json(data["runtime_observations"], code_pin, "runtime observations")
    for obj, keys in (
        (plans, {"schema","status","chain_id","source_commit","contracts"}),
        (observed, {"schema","status","chain_id","source_commit","block_number","block_hash","safe_slot0","contracts"}),
    ):
        require(type(obj) is dict and set(obj) == keys, "runtime evidence schema mismatch")
        require(type(obj["schema"]) is int and obj["schema"] == 1 and obj["status"] == "REVIEW_ONLY_NO_GO", "runtime evidence status")
        require(type(obj["chain_id"]) is int and obj["chain_id"] == 84532, "runtime evidence chain")
        require(obj["source_commit"] == result["source_commit"], "runtime evidence source mismatch")
        require(type(obj["contracts"]) is dict and set(obj["contracts"]) == set(CONTRACTS), "runtime contract role set mismatch")
    require(issuance.uint(observed["block_number"]) == state["block_number"]
            and observed["block_hash"] == state["block_hash"], "runtime observation block mismatch")
    guard_plan = plans["contracts"]["guard"]["plan"]
    singleton = role_address(guard_plan, "SafeEpochGuardFixture", "singleton")
    addresses = {"guard":intent["fields"]["guard"],"successor":intent["successor"],
                 "safe":intent["safe"],"singleton":singleton}
    require(len(set(addresses.values())) == 4, "overlapping runtime role addresses")
    slot0 = runtime.hex_bytes(observed["safe_slot0"], "observed Safe slot zero")
    require(len(slot0) == 32 and slot0 == bytes(12)+bytes.fromhex(singleton[2:]), "Safe mastercopy slot mismatch")
    verified, code_hashes = {}, {}
    for role, (source, contract) in CONTRACTS.items():
        plan_entry, code_entry = plans["contracts"][role], observed["contracts"][role]
        require(type(plan_entry) is dict and set(plan_entry) == {"address","plan"}, "role plan entry schema")
        require(type(code_entry) is dict and set(code_entry) == {"address","runtime_hex"}, "code entry schema")
        require(issuance.address(plan_entry["address"]) == addresses[role]
                and issuance.address(code_entry["address"]) == addresses[role], "runtime address differs from intent")
        plan = plan_entry["plan"]
        require(type(plan) is dict and plan.get("source_unit") == source
                and plan.get("contract") == contract, "unexpected runtime contract identity")
        require(plan.get("source_commit") == result["source_commit"], "role plan source mismatch")
        raw = canonical(plan)
        code = runtime.hex_bytes(code_entry["runtime_hex"], "observed runtime")
        verified[role] = runtime.verify(raw, data["compiler_output"], code, bundle.digest(raw))
        code_hashes[role] = evm_keccak(code)
        verified[role]["runtime_keccak256"] = "0x"+code_hashes[role]
    require(role_address(guard_plan, "SafeEpochGuardFixture", "wallet") == intent["safe"], "guard wallet role differs from intent")
    require(role_address(guard_plan, "SafeReserveGuardFixture", "successor") == intent["successor"], "guard successor role differs from intent")
    for role, owner, name in (
        ("safe","SafeEpochGuardFixture","proxyHash"),
        ("singleton","SafeEpochGuardFixture","singletonHash"),
        ("successor","SafeReserveGuardFixture","successorHash"),
    ):
        require(role_hash(guard_plan, owner, name) == code_hashes[role], "guard codehash mismatch: "+role)
    result.update(status="INTEGRATED_RUNTIME_REVIEW_MATCHES_NO_GO", runtime_plans_sha256=plans_pin,
                  runtime_observations_sha256=code_pin, runtime_contracts=verified,
                  limitations="Offline snapshot consistency only. Observations and pins are externally supplied; no chain/address authentication, authentication of observed Safe slot zero or other storage, remaining helper/vault runtime relationships, actual signatures, source provenance or release authorization. Four runtime roles and three cross-contract codehashes checked.")
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle")
    for flag in ("manifest-sha256","observation-sha256","runtime-plans-sha256","runtime-observations-sha256"):
        parser.add_argument("--"+flag, required=True)
    parser.add_argument("--review-timestamp", required=True, type=int)
    a = parser.parse_args()
    print(json.dumps(verify(a.bundle,a.manifest_sha256,a.observation_sha256,a.runtime_plans_sha256,a.runtime_observations_sha256,a.review_timestamp),indent=2))
