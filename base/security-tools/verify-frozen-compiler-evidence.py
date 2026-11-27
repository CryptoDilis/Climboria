#!/usr/bin/env python3
"""Frozen experimental evidence verifier. Offline only; never authorizes a release."""
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import tarfile
import tempfile
import zipfile

SOURCE = "38530c55630d7e16e52a1f5039daaf6d76daa340"
COMPILER = "b8b0642d46838575d3177628b685564b52f51f2aee546cb4dce781951d23c666"
PORTABLE = "1199b9657bd75530d7d440d9ea34c06d5ceb2e25d3fc635ef31c9c7c46f4ab7e"
PROJECTS = {
    "safe-custody": ("a463bb3a405252110bcdb5bf22f3a293676e3da2fbeae408b3bddf16c9974f5b", 60, 114, "paris", "4be709e6f9e8c6a49a8c1bc0446b259e0d26c39923f91591a54bb4ca99003103"),
    "v3-testnet": ("33dbf8fb32e25cf4b5d7a493d5a66c6142ee23b7b1ad882759f8b614ec4b1eca", 47, 97, "london", "cc8fadd7e558a0ca8435a2bebece7ab2d9510d8c20add98710152166579a91bc"),
}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()

def verified_zip(path, expected):
    raw = pathlib.Path(path).read_bytes()
    require(digest(raw) == expected, "unapproved ZIP digest: " + str(path))
    return zipfile.ZipFile(io.BytesIO(raw))

def tar_members(raw):
    result = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
        for member in archive:
            if member.isdir():
                continue
            p = pathlib.PurePosixPath(member.name)
            require(member.isfile() and not p.is_absolute() and ".." not in p.parts, "unsafe TAR member")
            require(member.name not in result, "duplicate TAR member")
            result[member.name] = archive.extractfile(member).read()
    return result

def run(portable, references):
    with verified_zip(portable, PORTABLE) as z:
        names = {"project.tar", "oz.tar", "safe.tar", "solc-candidate", "source.txt", "solc.txt"}
        require(len(z.namelist()) == 7 and set(z.namelist()) == names | {"SHA256SUMS"}, "portable membership mismatch")
        data = {n: z.read(n) for n in names}
        manifest = {}
        for line in z.read("SHA256SUMS").decode().splitlines():
            h, n = line.split()
            require(n in names and n not in manifest, "unexpected or duplicate checksum")
            manifest[n] = h
        require(set(manifest) == names, "incomplete checksum manifest")
        require(all(digest(data[n]) == manifest[n] for n in names), "portable member checksum mismatch")
    require(data["source.txt"].decode().strip() == SOURCE, "wrong checkout")
    require(digest(data["solc-candidate"]) == COMPILER, "wrong compiler")
    src, oz, safe = (tar_members(data[n]) for n in ("project.tar", "oz.tar", "safe.tar"))
    changed = {p for p, b in src.items() if p.endswith(".sol") and b"pragma solidity 0.8.19;" in b}
    require(len(changed) == 39, "pragma substitution coverage mismatch")
    require(set(references) == set(PROJECTS), "missing reference project")
    # Authenticate both references before executing the downloaded compiler.
    refs = {}
    for project, (pin, source_count, contract_count, target, output_hash) in PROJECTS.items():
        with verified_zip(references[project], pin) as z:
            require(z.read("source.txt").decode().strip() == SOURCE, "reference checkout mismatch")
            require(z.read("solc-sha256.txt").decode().split()[0] == COMPILER, "reference compiler mismatch")
            records = [n for n in z.namelist() if n.startswith("standard-json/") and n.endswith("/input.json")]
            require(len(records) == 1, "unexpected invocation count")
            expected = json.loads(z.read(records[0]))
            previous = json.loads(z.read(records[0].replace("input.json", "output.json")))
            workspace = z.read("workspace.txt").decode().strip()
        settings = expected["settings"]
        require(expected["language"] == "Solidity" and len(expected["sources"]) == source_count, "reference source coverage mismatch")
        require(settings["optimizer"] == {"enabled": True, "runs": 200} and settings["evmVersion"] == target and not settings.get("viaIR"), "compiler settings mismatch")
        require(digest(canonical(previous["contracts"])) == output_hash, "reference output hash mismatch")
        refs[project] = (expected, previous, workspace, contract_count)
    report = []
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        exe = root / "solc"
        exe.write_bytes(data["solc-candidate"])
        exe.chmod(0o700)
        require("0.8.39+commit.ce47f2c8" in subprocess.check_output([str(exe), "--version"], text=True), "compiler version mismatch")
        for project, (expected, previous, workspace, count) in refs.items():
            def source(name):
                if project == "safe-custody" and name.startswith(workspace + "/base/v3-testnet/src/"):
                    b = src[name[len(workspace)+1:]]
                elif project == "safe-custody" and name.startswith("../v3-testnet/src/"):
                    b = src["base/" + name[3:]]
                elif name.startswith(("src/", "test/")):
                    b = src[f"base/{project}/{name}"]
                elif name.startswith("lib/openzeppelin-contracts/contracts/"):
                    return oz[name[len("lib/openzeppelin-contracts/"):]].decode()
                elif project == "safe-custody" and name.startswith("lib/safe-contracts/contracts/"):
                    return safe[name[len("lib/safe-contracts/"):]].decode()
                else:
                    raise ValueError("unexpected source unit " + name)
                return b.replace(b"pragma solidity 0.8.19;", b"pragma solidity 0.8.39;").decode()
            reconstructed = {**expected, "sources": {n: {"content": source(n)} for n in expected["sources"]}}
            require(reconstructed == expected, "source reconstruction mismatch")
            base = root / project
            base.mkdir(exist_ok=True)
            args = [str(exe)]
            missing = set(previous["sources"]) - set(expected["sources"])
            allowed = {"../v3-testnet/src/V3BoundedLegacyFixture.sol", "../v3-testnet/src/V3DeferredLegacyFixture.sol"} if project == "safe-custody" else set()
            require(missing == allowed, "source alias mismatch")
            if missing:
                sibling = root / "v3-testnet" / "src"
                sibling.mkdir(parents=True, exist_ok=True)
                for name in missing:
                    (sibling / pathlib.PurePosixPath(name).name).write_bytes(source(name).encode())
                args += ["--base-path", str(base), "--allow-paths", str(sibling)]
            proc = subprocess.run(args + ["--standard-json"], input=canonical(reconstructed), cwd=base, capture_output=True, timeout=180)
            require(proc.returncode == 0, "compiler process failed")
            out = json.loads(proc.stdout)
            require(not any(e.get("severity") == "error" for e in out.get("errors", [])), "compiler error")
            require(out["contracts"] == previous["contracts"] and out["sources"] == previous["sources"], "output or AST mismatch")
            require(sum(len(v) for v in out["contracts"].values()) == count, "contract coverage mismatch")
            report.append({"project": project, "contractEntries": count, "inputSha256": digest(canonical(reconstructed)), "contractSha256": digest(canonical(out["contracts"])), "astSha256": digest(canonical(out["sources"])), "differences": []})
    return {"status": "FROZEN_EXPERIMENT_REPRODUCED_NO_GO", "source": SOURCE, "compilerSha256": COMPILER, "projects": report, "testnet": "NO_GO", "mainnet": "NO_GO"}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python3 verify-frozen-compiler-evidence.py PORTABLE.zip SAFE.zip V3.zip")
    print(json.dumps(run(sys.argv[1], dict(zip(PROJECTS, sys.argv[2:]))), indent=2))
