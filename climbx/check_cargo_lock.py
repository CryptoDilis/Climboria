#!/usr/bin/env python3
"""Non-deploying CLIMBX Cargo.lock integrity gate. Not a vulnerability audit."""
import argparse
import json
import pathlib
import re
import sys
import tomllib

def inspect(path: pathlib.Path):
    if not path.is_file():
        return {"ok": False, "errors": ["MISSING_COMMITTED_LOCKFILE"], "packages": 0}
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return {"ok": False, "errors": [f"INVALID_LOCKFILE: {exc}"], "packages": 0}
    errors = []
    packages = data.get("package", [])
    if data.get("version") != 4:
        errors.append("UNEXPECTED_LOCKFILE_VERSION")
    if not isinstance(packages, list) or not packages:
        errors.append("EMPTY_OR_INVALID_PACKAGES")
        packages = []
    names = set()
    for item in packages:
        if not isinstance(item, dict):
            errors.append("INVALID_PACKAGE")
            continue
        name, version, source = item.get("name"), item.get("version"), item.get("source", "")
        if not name or not version:
            errors.append("MISSING_PACKAGE_IDENTITY")
        key = (name, version, source)
        if key in names:
            errors.append("DUPLICATE_PACKAGE")
        names.add(key)
        if source.startswith("git+"):
            errors.append(f"GIT_DEPENDENCY:{name}")
        if source.startswith("registry+") and not re.fullmatch(r"[0-9a-f]{64}", item.get("checksum", "")):
            errors.append(f"MISSING_REGISTRY_CHECKSUM:{name}")
        if source and not (source.startswith("registry+") or source.startswith("git+")):
            errors.append(f"UNEXPECTED_SOURCE:{name}")
    return {"ok": not errors, "errors": errors, "packages": len(packages)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("lockfile", type=pathlib.Path)
    args = parser.parse_args()
    result = inspect(args.lockfile)
    print(json.dumps(result, sort_keys=True))
    sys.exit(0 if result["ok"] else 1)
