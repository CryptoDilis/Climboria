#!/usr/bin/env python3
"""Check an independently pinned, unsigned CLIMB release-evidence bundle.
Never grants deployment authorization; does not verify on-chain state or signatures.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ARTIFACTS = ("compiler", "source_archive", "safe_dependency", "oz_dependency",
             "compiler_input", "compiler_output", "build_reproduction",
             "external_review", "deployment_plan", "issuance_payload")
ALLOWED_STATUS = "REVIEW_ONLY_NO_GO"
INTEGRATED_ARTIFACTS = ARTIFACTS + ("unsigned_envelope", "state_observation")

def require(condition, message):
    if not condition:
        raise ValueError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def strict_json(raw):
    def pairs(items):
        obj = {}
        for k, v in items:
            require(k not in obj, "duplicate JSON key: " + k)
            obj[k] = v
        return obj
    def invalid_constant(value):
        raise ValueError("invalid JSON constant: " + value)
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=invalid_constant)

def hex_value(value, n, label):
    require(isinstance(value, str) and re.fullmatch("[0-9a-f]{" + str(n) + "}", value)
            and any(c != "0" for c in value), "invalid " + label)

def verified_snapshot(bundle, expected_sha, schema=1):
    require(type(schema) is int and schema in (1, 2), "unsupported requested schema")
    roles = ARTIFACTS if schema == 1 else INTEGRATED_ARTIFACTS
    hex_value(expected_sha, 64, "independent manifest digest")
    bundle = Path(bundle)
    require(bundle.is_dir() and not bundle.is_symlink(), "invalid bundle directory")
    root = bundle.resolve()
    def read(name):
        require(re.fullmatch("[A-Za-z0-9][A-Za-z0-9._-]{0,127}", name)
                and name not in (".", ".."), "invalid evidence filename")
        p = root / name
        require(not p.is_symlink() and p.is_file() and p.resolve().parent == root,
                "missing or unsafe evidence file: " + name)
        require(p.stat().st_size <= 128 * 1024 * 1024, "evidence too large")
        return p.read_bytes()
    raw = read("manifest.json")
    require(digest(raw) == expected_sha, "manifest differs from independently pinned bytes")
    obj = strict_json(raw)
    require(type(obj) is dict and set(obj) == {"schema", "status", "chain_id", "source_commit", "artifacts"},
            "manifest schema mismatch")
    require(type(obj["schema"]) is int and obj["schema"] == schema, "unsupported schema")
    require(obj["status"] == ALLOWED_STATUS, "release approval is not supported")
    require(type(obj["chain_id"]) is int and obj["chain_id"] == 84532,
            "only Base Sepolia review evidence supported")
    hex_value(obj["source_commit"], 40, "source commit")
    artifacts = obj["artifacts"]
    require(type(artifacts) is dict and set(artifacts) == set(roles), "incomplete artifact roles")
    names = {"manifest.json"}
    snapshot = {}
    for role in roles:
        entry = artifacts[role]
        require(type(entry) is dict and set(entry) == {"file", "sha256"}, "invalid entry: " + role)
        name = entry["file"]
        require(isinstance(name, str) and name not in names, "duplicate or invalid artifact filename")
        names.add(name)
        hex_value(entry["sha256"], 64, role + " digest")
        content = read(name)
        require(content and digest(content) == entry["sha256"], "empty or changed evidence: " + role)
        snapshot[role] = content
    require({p.name for p in root.iterdir()} == names, "unexpected bundle entries")
    report = {"status": "PINNED_BUNDLE_BYTES_MATCH_NO_GO", "manifest_sha256": expected_sha,
            "source_commit": obj["source_commit"], "artifact_count": len(roles),
            "chain_id": 84532, "testnet": "NO_GO", "mainnet": "NO_GO",
            "limitations": "Byte integrity only. Independent digest provenance, artifact semantics, deployed code, addresses, calldata, reviewer identity and authorization must be verified separately."}

    return report, snapshot

def verify(bundle, expected_sha):
    report, _ = verified_snapshot(bundle, expected_sha)
    return report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle")
    parser.add_argument("--expected-sha256", required=True, help="digest obtained from independent trusted review, never from the bundle itself")
    args = parser.parse_args()
    print(json.dumps(verify(args.bundle, args.expected_sha256), indent=2))
