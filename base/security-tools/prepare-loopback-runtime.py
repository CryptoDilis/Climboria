#!/usr/bin/env python3
"""Adapt pinned captured solc output for the existing LOCAL Anvil rehearsal.
No compiler output synthesized, no public network or production signing.
"""
import hashlib
import json
import os
from pathlib import Path

def sha(data): return hashlib.sha256(data).hexdigest()
def require(ok,msg):
    if not ok: raise ValueError(msg)
capture=Path(os.environ["FROZEN_CAPTURE"])
candidate=Path(os.environ["CANDIDATE_CHECKOUT"])
workspace=Path(os.environ["GITHUB_WORKSPACE"])
project=candidate/"base/safe-custody"
invocations=list((capture/"standard-json").glob("invocation.*"))
require(len(invocations)==1,"unexpected compiler invocation count")
inp=(invocations[0]/"input.json").read_bytes()
out=(invocations[0]/"output.json").read_bytes()
require(sha(inp)=="eab13c607c78872ecf1e07b2b70f0df5750eba8f131767b00398eedb244f76a7","input pin mismatch")
require(sha(out)=="85de75841374eaa75742cf0e503d7a7266a33ab097ec944c12e021d990089c7a","output pin mismatch")
require((capture/"source.txt").read_text().strip()=="6deaf2dc0139882215eb71d1ed8fe2785984a0ab","source pin mismatch")
compiled_input=json.loads(inp)
compiled=json.loads(out)
require(not any(e.get("severity")=="error" for e in compiled.get("errors",[])),"compiler errors")
# Recheck all captured project source units, including aliases, against exact
# candidate checkout. Dependencies are covered by the pinned compiler input,
# not independently reacquired or rebuilt in this runtime-only experiment.
checked=set()
for name,source in compiled_input["sources"].items():
    if name.startswith("lib/"): continue
    if name.startswith(("src/","test/")):
        file=project/name
    elif name.startswith("../v3-testnet/src/"):
        file=project/name
    elif "/base/v3-testnet/src/" in name:
        file=candidate/"base/v3-testnet/src"/name.rsplit("/",1)[-1]
    else: raise ValueError("unexpected project source "+name)
    original=file.read_text()
    changed=original.replace("pragma solidity 0.8.19;","pragma solidity 0.8.39;")
    require(changed==source["content"],"project source mismatch "+name)
    checked.add(file.resolve())
require(len(checked)>=17,"incomplete project source comparison")
specs={
    "src/SafeQuorumIssuanceFixture.sol":["SafeQuorumReserveFactoryFixture","SafeQuorumGuardDeployerFixture","V3QuorumSuccessorFixture","SafeQuorumReserveGuardFixture"],
    "src/SafeEpochGuardFixture.sol":["SafeGuardBootstrapFixture"],
    "../v3-testnet/src/V3AtomicSuccessorFixture.sol":["V3SuccessorConditionalDeployer","V3SuccessorLegacyDeployer"],
    "lib/safe-contracts/contracts/Safe.sol":["Safe"],
    "lib/safe-contracts/contracts/proxies/SafeProxy.sol":["SafeProxy"],
    "test/SafeReserveGuard.t.sol":["ReserveQuote","ReservePoolBuilder","ReserveLPDestination"],
}
for source,names in specs.items():
    for name in names:
        c=compiled["contracts"][source][name]
        artifact={"abi":c["abi"]}
        for field in ("bytecode","deployedBytecode"):
            raw=c["evm"][field]
            require(raw.get("linkReferences")=={} and raw["object"],"unresolved or empty code "+name)
            artifact[field]={**raw,"object":"0x"+raw["object"]}
        dest=project/"out"/Path(source).name/(name+".json")
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(json.dumps(artifact))
# Exact anchor and Git blob pin protect the local-only hook insertion.
rehearsal=project/"local-deployment-rehearsal.mjs"
raw=rehearsal.read_bytes()
git_blob=hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
require(git_blob=="8cb4ef9c783363297d303090302da8f44e642b79","rehearsal source changed")
text=raw.decode()
anchor=" const negative=[];"
require(text.count(anchor)==1,"capture anchor changed")
hook=(workspace/"base/security-tools/capture-loopback-runtime.mjs").read_text()
# Inject statements into the existing try block, where the exact deployed
# addresses, pre-issuance block and original unsigned calldata are in scope.
rehearsal.write_text(text.replace(anchor,hook+"\n"+anchor))
print("Pinned compiler output adapted; project files verified:",len(checked))
