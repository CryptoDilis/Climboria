#!/usr/bin/env python3
"""Repack the exact owner-supplied Sanctuary visitor GLB with lighter textures.

No network, procedural content or rigging changes. Called by Game-only CI;
never overwrites the owner's original source asset.
"""
import hashlib
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT / "assets/characters/Climboria. hero.glb"
DST=ROOT / "assets/characters/Climboria_Starting_Tambay_NPC_optimized.glb"
SOURCE_SIZE=23178884
SOURCE_SHA="b44e65a0c3781cb52dbafa3d610f35f875959d2730c21590fd4e2a13b28b95fe"
source=SRC.read_bytes()
if len(source)!=SOURCE_SIZE or hashlib.sha256(source).hexdigest()!=SOURCE_SHA:
    raise ValueError("Owner-supplied Sanctuary NPC source has changed. Stop instead of optimizing the wrong model.")
if source[:4]!=b"glTF" or struct.unpack_from("<II",source,4)[0]!=2:
    raise ValueError("Invalid GLB 2.0 original")
jlen=struct.unpack_from("<I",source,12)[0]
doc=json.loads(source[20:20+jlen])
pos=20+jlen
if source[pos:pos+4]!=struct.pack("<I",len(source)-pos-8) or source[pos+4:pos+8]!=b"BIN\x00":
    raise ValueError("Original binary chunk is invalid")
binchunk=source[pos+8:]
views=doc["bufferViews"]
blocks=[binchunk[v.get("byteOffset",0):v.get("byteOffset",0)+v["byteLength"]] for v in views]
for image in doc["images"]:
    i=image["bufferView"]
    picture=Image.open(io.BytesIO(blocks[i])).convert("RGB")
    if image.get("name")=="texture_0":
        resolution=2048
        kwargs={"format":"JPEG","quality":85,"optimize":True,"progressive":True}
        image["mimeType"]="image/jpeg"
    else:
        resolution=1024
        kwargs={"format":"PNG","optimize":True,"compress_level":9}
        image["mimeType"]="image/png"
    picture.thumbnail((resolution,resolution),Image.Resampling.LANCZOS)
    output=io.BytesIO()
    picture.save(output,**kwargs)
    blocks[i]=output.getvalue()
outbin=bytearray()
for i,view in enumerate(views):
    while len(outbin)%4:outbin.append(0)
    view["byteOffset"]=len(outbin)
    view["byteLength"]=len(blocks[i])
    outbin.extend(blocks[i])
doc["buffers"][0]["byteLength"]=len(outbin)
while len(outbin)%4:outbin.append(0)
header=json.dumps(doc,separators=(",",":")).encode()
header+=b" "*((-len(header))%4)
result=(struct.pack("<4sII",b"glTF",2,12+8+len(header)+8+len(outbin))
       +struct.pack("<II",len(header),0x4E4F534A)+header
       +struct.pack("<II",len(outbin),0x004E4942)+outbin)
if struct.unpack_from("<I",result,8)[0]!=len(result):
    raise ValueError("Invalid final GLB length")
outdoc=json.loads(result[20:20+struct.unpack_from("<I",result,12)[0]])
triangles=sum((outdoc["accessors"][p["indices"]]["count"] if "indices" in p
            else outdoc["accessors"][p["attributes"]["POSITION"]]["count"])//3
            for mesh in outdoc["meshes"] for p in mesh["primitives"])
if triangles!=30628 or outdoc.get("skins") or outdoc.get("animations"):
    raise ValueError("Source visitor mesh/rig unexpectedly changed")
if len(result)>7500000:
    raise ValueError("Optimization did not meet the 7.5 MB release budget")
DST.write_bytes(result)
print("PASS optimized Sanctuary NPC",len(source),"->",len(result),"bytes",
      "triangles",triangles,"SHA256",hashlib.sha256(result).hexdigest())
