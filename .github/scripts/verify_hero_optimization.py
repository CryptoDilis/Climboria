#!/usr/bin/env python3
"""Verify a texture-only optimized GLB preserves non-image payloads.
Usage: python verify_hero_optimization.py original.glb optimized.glb
"""
import json
import struct
import sys
from pathlib import Path

def read_glb(path):
    data = Path(path).read_bytes()
    if len(data) < 28:
        raise ValueError(f"{path}: truncated GLB")
    magic, version, declared = struct.unpack_from("<4sII", data)
    if magic != b"glTF" or version != 2 or declared != len(data):
        raise ValueError(f"{path}: invalid GLB 2.0 header or size")
    offset, chunks = 12, {}
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError(f"{path}: truncated chunk header")
        length, kind = struct.unpack_from("<I4s", data, offset)
        offset += 8
        if length % 4 or offset + length > len(data) or kind in chunks:
            raise ValueError(f"{path}: invalid chunk")
        chunks[kind] = data[offset:offset + length]
        offset += length
    if b"JSON" not in chunks or b"BIN\0" not in chunks:
        raise ValueError(f"{path}: missing JSON or BIN chunk")
    doc = json.loads(chunks[b"JSON"])
    if len(doc.get("buffers", [])) != 1 or doc["buffers"][0]["byteLength"] > len(chunks[b"BIN\0"]):
        raise ValueError(f"{path}: unsupported or invalid buffers")
    return doc, chunks[b"BIN\0"]

def main(original, optimized):
    a, ab = read_glb(original)
    b, bb = read_glb(optimized)
    if len(a.get("images", [])) != len(b.get("images", [])):
        raise ValueError("image count differs")
    if len(a.get("bufferViews", [])) != len(b.get("bufferViews", [])):
        raise ValueError("buffer view count differs")
    image_ids = {im["bufferView"] for im in a["images"]}
    if image_ids != {im["bufferView"] for im in b["images"]} or not image_ids:
        raise ValueError("image buffer view mapping differs")
    for key in set(a) | set(b):
        if key in ("bufferViews", "buffers", "images"):
            continue
        if a.get(key) != b.get(key):
            raise ValueError(f"GLTF metadata changed: {key}")
    for i, (av, bv) in enumerate(zip(a["bufferViews"], b["bufferViews"])):
        am = {k: v for k, v in av.items() if k not in ("byteOffset", "byteLength")}
        bm = {k: v for k, v in bv.items() if k not in ("byteOffset", "byteLength")}
        if am != bm:
            raise ValueError(f"buffer view {i} metadata differs")
        if i not in image_ids:
            if av["byteLength"] != bv["byteLength"]:
                raise ValueError(f"non-image view {i} length differs")
            aa = ab[av.get("byteOffset", 0):av.get("byteOffset", 0) + av["byteLength"]]
            ba = bb[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]]
            if aa != ba:
                raise ValueError(f"non-image view {i} bytes changed")
    if len(bb) >= len(ab):
        raise ValueError("optimized BIN chunk is not smaller")
    if Path(optimized).stat().st_size >= Path(original).stat().st_size:
        raise ValueError("optimized GLB is not smaller than original")
    for ai, bi in zip(a["images"], b["images"]):
        if {k: v for k, v in ai.items() if k != "bufferView"} != {k: v for k, v in bi.items() if k != "bufferView"}:
            raise ValueError("image metadata differs")
    print("PASS: GLB 2.0, scene metadata, geometry/rig/animation buffer bytes preserved")
    print(f"Animations: {len(b.get('animations', []))}; non-image views: {len(a['bufferViews']) - len(image_ids)}")
    print(f"Size: {Path(original).stat().st_size:,} -> {Path(optimized).stat().st_size:,} bytes")
    print("NOTE: Visual rendering, mobile FPS, and game integration are NOT tested here.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Usage: python verify_hero_optimization.py ORIGINAL.glb OPTIMIZED.glb")
    try:
        main(sys.argv[1], sys.argv[2])
    except (ValueError, KeyError, IndexError, json.JSONDecodeError) as exc:
        sys.exit(f"FAIL: {exc}")
