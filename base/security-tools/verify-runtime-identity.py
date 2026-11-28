#!/usr/bin/env python3
"""Match exact immutable roles and full runtime bytes against pinned compiler output.
Offline evidence only, not authenticated chain state or release authorization.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import re

spec = importlib.util.spec_from_file_location("bundle", Path(__file__).with_name("verify-release-bundle.py"))
bundle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundle)
require = bundle.require

def hex_bytes(value, label):
    require(type(value) is str and re.fullmatch(r"(?:[0-9a-f]{2})+", value), "invalid " + label)
    return bytes.fromhex(value)

def declarations(sources):
    result = {}
    def walk(node, owner=None):
        if type(node) is dict:
            if node.get("nodeType") == "ContractDefinition":
                owner = node["name"]
            if node.get("nodeType") == "VariableDeclaration" and node.get("mutability") == "immutable":
                ident = str(node["id"])
                role = (owner, node["name"], node["typeDescriptions"]["typeString"])
                require(ident not in result or result[ident] == role, "conflicting immutable AST declaration")
                result[ident] = role
            for value in node.values():
                walk(value, owner)
        elif type(node) is list:
            for value in node:
                walk(value, owner)
    for source in sources.values():
        walk(source.get("ast", {}))
    return result

def verify(plan_raw, compiler_raw, runtime_raw, plan_pin):
    bundle.hex_value(plan_pin, 64, "independent role plan digest")
    require(bundle.digest(plan_raw) == plan_pin, "reviewed role plan differs")
    plan = bundle.strict_json(plan_raw)
    require(type(plan) is dict and set(plan) == {"schema","status","chain_id","source_commit",
            "compiler_output_sha256","source_unit","contract","runtime_template_sha256","immutables"},
            "role plan schema mismatch")
    require(type(plan["schema"]) is int and plan["schema"] == 1 and plan["status"] == "REVIEW_ONLY_NO_GO",
            "unsupported or approved plan")
    require(type(plan["chain_id"]) is int and plan["chain_id"] == 84532, "wrong chain")
    bundle.hex_value(plan["source_commit"], 40, "source commit")
    bundle.hex_value(plan["compiler_output_sha256"], 64, "compiler output digest")
    require(bundle.digest(compiler_raw) == plan["compiler_output_sha256"], "compiler output differs")
    output = bundle.strict_json(compiler_raw)
    require(not any(e.get("severity") == "error" for e in output.get("errors", [])), "compiler errors")
    source, name = plan["source_unit"], plan["contract"]
    require(type(source) is str and type(name) is str and source in output["contracts"]
            and name in output["contracts"][source], "unknown exact contract identity")
    deployed = output["contracts"][source][name]["evm"]["deployedBytecode"]
    require(deployed.get("linkReferences") == {}, "unresolved or missing link evidence")
    template = hex_bytes(deployed["object"], "runtime template")
    bundle.hex_value(plan["runtime_template_sha256"], 64, "template digest")
    require(bundle.digest(template) == plan["runtime_template_sha256"], "wrong runtime template")
    require(len(template) <= 24576, "runtime size exceeded")
    # Runtime file is raw binary, not a user-defined mask or hex string.
    require(type(runtime_raw) is bytes and len(runtime_raw) == len(template), "runtime length mismatch")
    groups = deployed.get("immutableReferences", {})
    words = plan["immutables"]
    require(type(groups) is dict and type(words) is dict and set(groups) == set(words), "immutable group set mismatch")
    roles = declarations(output["sources"])
    expected = bytearray(template)
    occupied = set()
    for ident, refs in groups.items():
        require(re.fullmatch(r"[0-9]+", ident) and ident in roles, "unresolved immutable declaration")
        entry = words[ident]
        require(type(entry) is dict and set(entry) == {"owner","name","type","word"}, "invalid immutable plan entry")
        require((entry["owner"], entry["name"], entry["type"]) == roles[ident], "immutable role mismatch")
        word = hex_bytes(entry["word"], "immutable word")
        require(len(word) == 32, "invalid immutable word length")
        typ = entry["type"]
        if typ == "address" or typ.startswith("contract "):
            require(word[:12] == bytes(12) and any(word[12:]), "invalid immutable address")
        elif typ == "bytes32":
            require(any(word), "zero immutable hash")
        elif typ == "uint256":
            pass
        else:
            raise ValueError("unsupported immutable type: " + typ)
        require(type(refs) is list and refs, "empty immutable group")
        for ref in refs:
            require(type(ref) is dict and set(ref) == {"start","length"}, "invalid immutable reference")
            start, length = ref["start"], ref["length"]
            require(type(start) is int and type(length) is int and length == 32
                    and 0 <= start <= len(template)-32, "invalid immutable range")
            indexes = set(range(start, start+32))
            require(not occupied.intersection(indexes), "overlapping immutable ranges")
            occupied.update(indexes)
            require(template[start:start+32] == bytes(32), "nonzero template range")
            expected[start:start+32] = word
    require(bytes(expected) == runtime_raw, "runtime differs from exact role-bound template")
    return {"status":"ROLE_BOUND_RUNTIME_MATCH_NO_GO","chain_id":84532,"source_commit":plan["source_commit"],
            "contract":source+":"+name,"compiler_output_sha256":plan["compiler_output_sha256"],
            "runtime_sha256":bundle.digest(runtime_raw),"runtime_template_sha256":plan["runtime_template_sha256"],
            "immutable_groups":len(groups),"review_plan_sha256":plan_pin,"testnet":"NO_GO","mainnet":"NO_GO",
            "limitations":"Matches bytes to independently pinned plan/output. Does not authenticate deployed address, chain, block, constructor or source provenance, expected role values, or approval."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan")
    parser.add_argument("compiler_output")
    parser.add_argument("runtime_binary")
    parser.add_argument("--plan-sha256", required=True)
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.plan).read_bytes(),Path(args.compiler_output).read_bytes(),
                            Path(args.runtime_binary).read_bytes(),args.plan_sha256),indent=2))
