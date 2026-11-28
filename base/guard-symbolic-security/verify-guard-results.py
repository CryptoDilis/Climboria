#!/usr/bin/env python3
"""Validate actual guard-hook symbolic results, never quorum or deployment approval."""
import importlib.util
import json
import sys
from pathlib import Path
spec = importlib.util.spec_from_file_location("gate",Path(__file__).resolve().parents[1]/"symbolic-security"/"verify-halmos-results.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
gate.EXPECTED = {"ClimbSymbolicGuardTest": {
    "check_wrongCaller(address)", "check_nonzeroNumericField(uint8,uint256)",
    "check_delegatecallRejected()", "check_refundFieldRejected(bool,address)",
    "check_badSignatureMode(uint8,uint8)", "check_unknownGuardSelector(bytes4)",
    "check_wrongTarget(address)", "check_hookLifecycle()",
}}
if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: verify-guard-results.py POSITIVE.json NEGATIVE.json")
    result = gate.verify(gate.load(sys.argv[1]),gate.load(sys.argv[2]))
    result["limitations"] = "Actual Safe/proxy/guard setup; modeled wallet caller and signature-mode bytes at hook boundary, not signature recovery, actual quorum, target execution, or complete protocol proof."
    print(json.dumps(result,indent=2))
