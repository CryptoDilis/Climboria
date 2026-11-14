#!/usr/bin/env python3
"""GAME ONLY: import owner-packaged optimized GLBs with bounded archive checks.
Import does NOT enable runtime use. Visual/WebGL/device QA remains mandatory.
"""
from pathlib import Path, PurePosixPath
import hashlib, json, math, struct, zipfile, sys

ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'assets/game/new_optimized'
PACKS=sorted(FOLDER.glob('Climboria_Meshy_Assets_Pack_*.zip'))
ALLOWED_PREFIX='assets/game/new_optimized/'
def fail(msg):raise SystemExit('MEShY GAME IMPORT REFUSED: '+msg)
if not PACKS:fail('No owner pack uploaded')
if len(PACKS)>5:fail('Too many ZIP packs')
seen=set()
imported=0
for archive_path in PACKS:
 if archive_path.stat().st_size>24_000_000:fail('ZIP upload exceeds 24MB')
 with zipfile.ZipFile(archive_path) as z:
  infos=z.infolist()
  if not infos or len(infos)>45:fail('Invalid archive entry count')
  if z.testzip() is not None:fail('Corrupt archive')
  if sum(i.file_size for i in infos)>22_000_000:fail('Uncompressed archive exceeds asset budget')
  for i in infos:
   if i.is_dir() or i.file_size<400 or i.file_size>6_000_000:fail('Unacceptable member size')
   path=PurePosixPath(i.filename)
   if '..' in path.parts or path.is_absolute() or not i.filename.startswith(ALLOWED_PREFIX):
    fail('Unsafe archive path')
   if len(path.parts)!=4 or not path.name.startswith('Meshy_AI_') or not path.name.endswith('.glb'):
    fail('Unexpected GLB path')
   if ((i.external_attr>>16)&0o170000)==0o120000:fail('Symlink archive member')
   if path.name in seen:fail('Duplicate optimized filename across packs')
   seen.add(path.name)
   raw=z.read(i)
   if raw[:4]!=b'glTF' or len(raw)<32 or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw):
    fail('Invalid glTF 2.0 GLB header '+path.name)
   json_size=struct.unpack_from('<I',raw,12)[0]
   if json_size<20 or json_size>300_000 or raw[16:20]!=b'JSON':fail('Unexpected GLB JSON chunk')
   try: obj=json.loads(raw[20:20+json_size])
   except (UnicodeDecodeError,json.JSONDecodeError):fail('Invalid GLB JSON')
   if obj.get('skins') or obj.get('animations'):fail('Only static decorative assets allowed')
   if any(b.get('uri') for b in obj.get('buffers',[])):fail('External binary URI forbidden')
   if any(img.get('uri') or img.get('mimeType') not in ('image/jpeg','image/png','image/webp')
          for img in obj.get('images',[])):fail('External/unsupported images forbidden')
   if any(m.get('primitives') is None for m in obj.get('meshes',[])):fail('Malformed mesh')
   try:
    a=obj['accessors']
    count=sum((a[prim['indices']]['count'] if 'indices' in prim
      else a[prim['attributes']['POSITION']]['count'])//3
      for mesh in obj['meshes'] for prim in mesh['primitives'] if prim.get('mode',4)==4)
   except (KeyError,TypeError,IndexError,ZeroDivisionError):fail('Malformed geometry accessors')
   if count<1 or count>100_000:fail('Triangle budget violation '+path.name+' '+str(count))
   dest=FOLDER/path.name
   if dest.exists():
    if hashlib.sha256(dest.read_bytes()).digest()!=hashlib.sha256(raw).digest():fail('Refusing overwrite of differing binary')
    print('PRESENT',dest.name)
   else:
    dest.write_bytes(raw)
    print('IMPORTED',dest.name,'bytes',len(raw),'triangles',count,'SHA256',hashlib.sha256(raw).hexdigest())
    imported+=1
 print('PACK VERIFIED',archive_path.name)
print('PASS',len(seen),'unique GLBs examined,',imported,'new asset files')
print('Runtime manifest.enabled stays FALSE pending real visual/performance/browser acceptance.')
