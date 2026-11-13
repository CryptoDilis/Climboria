#!/usr/bin/env python3
"""Resize embedded GLB images while retaining all non-image buffer views."""
import io, json, struct, sys
from pathlib import Path
from PIL import Image

source, destination = map(Path, sys.argv[1:3])
raw = source.read_bytes()
magic, version, total = struct.unpack_from("<4sII", raw)
assert magic == b"glTF" and version == 2 and total == len(raw)
offset = 12
chunks = {}
while offset < len(raw):
    length, kind = struct.unpack_from("<I4s", raw, offset)
    offset += 8
    chunks[kind] = raw[offset:offset + length]
    offset += length
doc = json.loads(chunks[b"JSON"])
binary = chunks[b"BIN\0"]
assert len(doc["buffers"]) == 1
views = doc["bufferViews"]
images = {image["bufferView"]: image for image in doc["images"]}
assert len(images) > 0
out = bytearray()
for index, view in enumerate(views):
    start = view.get("byteOffset", 0)
    payload = binary[start:start + view["byteLength"]]
    assert len(payload) == view["byteLength"]
    if index in images:
        im = Image.open(io.BytesIO(payload))
        im.load()
        if max(im.size) > 2048:
            im.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
        fmt = "PNG" if images[index]["mimeType"] == "image/png" else "JPEG"
        assert images[index]["mimeType"] in ("image/png", "image/jpeg")
        target = io.BytesIO()
        if fmt == "JPEG":
            im.convert("RGB").save(target, format=fmt, quality=85, optimize=True)
        else:
            im.save(target, format=fmt, optimize=True, compress_level=9)
        payload = target.getvalue()
        print(f"Image {index}: {len(binary[start:start + view['byteLength']]):,} -> {len(payload):,} bytes; {im.size}")
    while len(out) % 4:
        out.append(0)
    view["byteOffset"] = len(out)
    view["byteLength"] = len(payload)
    out.extend(payload)
while len(out) % 4:
    out.append(0)
doc["buffers"][0]["byteLength"] = len(out)
js = json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode()
js += b" " * (-len(js) % 4)
header = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(js) + 8 + len(out))
destination.write_bytes(header + struct.pack("<I4s", len(js), b"JSON") + js + struct.pack("<I4s", len(out), b"BIN\0") + out)
print(f"GLB: {len(raw):,} -> {destination.stat().st_size:,} bytes")
