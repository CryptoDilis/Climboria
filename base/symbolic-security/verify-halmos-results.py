#!/usr/bin/env python3
"""Strictly validate a completed symbolic campaign, not an authorization."""
import json
import sys
from pathlib import Path

EXPECTED = {
    "ClimbSymbolicTokenTest": {
        "check_unauthorizedIssue(address)", "check_exactAllocation()",
        "check_burnCannotReopenIssuance(uint256)", "check_duplicateReserveRejected(uint8)",
    },
    "ClimbSymbolicRewardTest": {
        "check_unauthorizedRevoke(address)", "check_retiredSignerCannotSchedule(uint32)",
        "check_monthlyCapBound(uint256)",
    },
}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def load(path):
    return json.loads(Path(path).read_text())

def verify(positive, negative):
    require(type(positive["exitcode"]) is int and positive["exitcode"] == 0, "positive campaign failed")
    seen = set()
    count = 0
    for key, tests in positive["test_results"].items():
        name = key.rsplit(":", 1)[-1]
        require(name in EXPECTED and name not in seen, "unexpected or duplicate contract")
        seen.add(name)
        require(len(tests) == len(EXPECTED[name]) and {t["name"] for t in tests} == EXPECTED[name],
                "incomplete property coverage")
        for t in tests:
            require(t["exitcode"] == 0 and t["num_models"] == 0, "failed property")
            require(t["num_bounded_loops"] == 0, "incomplete loop exploration")
            paths = t["num_paths"]
            require(isinstance(paths, list) and len(paths) == 3 and all(type(v) is int and v >= 0 for v in paths)
                    and paths[0] > 0 and paths[1] > 0 and paths[2] == 0, "no successful path or blocked path")
            count += 1
    require(seen == set(EXPECTED), "missing contract")
    require(negative["exitcode"] == 1, "negative campaign did not fail")
    rows = negative["test_results"]
    require(len(rows) == 1, "negative control contract count")
    key, tests = next(iter(rows.items()))
    require(key.rsplit(":",1)[-1] == "ClimbSymbolicNegativeControl" and len(tests) == 1, "wrong negative control")
    t = tests[0]
    require(t["name"] == "check_detectCounterexample(uint256)" and t["exitcode"] == 1
            and type(t["num_models"]) is int and t["num_models"] > 0 and t["num_bounded_loops"] == 0,
            "negative control did not find counterexample")
    return {"status":"BOUNDED_SYMBOLIC_PROPERTIES_PASS_NO_GO","properties":count,"negative_control":"COUNTEREXAMPLE_FOUND",
            "testnet":"NO_GO","mainnet":"NO_GO","limitations":"Selected symbolic properties on test-only contracts and modeled custody adapter; not complete protocol proof or deployment authorization."}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: verify-halmos-results.py POSITIVE.json NEGATIVE.json")
    print(json.dumps(verify(load(sys.argv[1]),load(sys.argv[2])),indent=2))
