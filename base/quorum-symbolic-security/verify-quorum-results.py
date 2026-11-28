#!/usr/bin/env python3
"""Check exact successor policy coverage; no actual issuance or authorization."""
import importlib.util
import json
import sys
from pathlib import Path
spec = importlib.util.spec_from_file_location("gate",Path(__file__).resolve().parents[1]/"symbolic-security"/"verify-halmos-results.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
gate.EXPECTED = {"ClimbSymbolicQuorumPolicyTest": {
    "check_unboundPolicyExact(bytes4,uint256)", "check_boundPolicyExact(bytes4,uint256)",
    "check_issuingPolicyRejectsAll(bytes4,uint256,bool)",
}}
if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: verify-quorum-results.py POSITIVE.json NEGATIVE.json")
    result = gate.verify(gate.load(sys.argv[1]),gate.load(sys.argv[2]))
    result["limitations"] = "Actual inherited successor policy with modeled bound/issuing flags. Does not prove actual issuance, signatures, guard configuration, full hook policy, or target execution."
    print(json.dumps(result,indent=2))
