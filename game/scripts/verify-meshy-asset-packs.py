#!/usr/bin/env python3
"""GAME ONLY: verify exact owner-optimized GLB bytes before import.

Usage:
  python3 game/scripts/verify-meshy-asset-packs.py --archives
  python3 game/scripts/verify-meshy-asset-packs.py --files

Archives are five owner-uploaded ZIPs on the Game PR branch. The SHA allowlist
is committed separately and may not be supplied by untrusted archive contents.
No model is activated in production by this script.
"""
import argparse
import hashlib
import json
import pathlib
import re
import struct
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
DIR = ROOT / 'assets/game/new_optimized'
MANIFEST = DIR / 'source_manifest.json'
MEMBER_PREFIX = 'assets/game/new_optimized/'
PACK = 'Climboria_Meshy_Assets_Pack_{:02d}.zip'
MAX_ARCHIVE_BYTES = 22_000_000
MAX_TOTAL_UNPACKED = 100_000_000
MAX_FILE_BYTES = 5_000_000


def fail(message):
    raise ValueError(message)


def approved():
    source = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if source.get('version') != 1 or len(source.get('models', [])) != 44:
        fail('Expected 44 models in committed allowlist')
    data = {}
    for item in source['models']:
        name = item['file']
        if not isinstance(name, str) or not name.endswith('.glb') or '/' in name or chr(92) in name or name in data or '..' in name:
            fail('Unsafe or duplicated allowlist name')
        if not isinstance(item.get('bytes'), int) or not 0 < item['bytes'] < MAX_FILE_BYTES:
            fail('Invalid byte budget for ' + name)
        if not isinstance(item.get('triangles'), int) or not 0 < item['triangles'] < 100_000:
            fail('Invalid triangle limit for ' + name)
        if not isinstance(item.get('sha256'), str) or not re.fullmatch('[0-9a-f]{64}', item['sha256']):
            fail('Invalid sha256 for ' + name)
        if item.get('pack') not in [PACK.format(i) for i in range(1, 6)]:
            fail('Invalid pack assigned to ' + name)
        data[name] = item
    if sum(v['bytes'] for v in data.values()) >= MAX_TOTAL_UNPACKED:
        fail('Total model budget exceeded')
    return data


def verify_glb(data, info):
    name = info['file']
    if len(data) != info['bytes']:
        fail(name + ': mismatched size')
    sha = hashlib.sha256(data).hexdigest()
    if sha != info['sha256']:
        fail(name + ': SHA-256 mismatch')
    if len(data) < 32 or data[:4] != b'glTF' or struct.unpack_from('<II', data, 4) != (2, len(data)):
        fail(name + ': invalid GLB 2 header')
    jlen, jtype = struct.unpack_from('<I4s', data, 12)
    if jtype != b'JSON' or jlen < 4 or jlen > len(data) - 20:
        fail(name + ': invalid JSON chunk')
    obj = json.loads(data[20:20 + jlen])
    if obj.get('asset', {}).get('version') != '2.0' or obj.get('extensionsRequired'):
        fail(name + ': unsupported glTF features')
    if obj.get('skins') or obj.get('animations'):
        fail(name + ': animated/skinned model is outside static scenery budget')
    buffers = obj.get('buffers', [])
    if any('uri' in buf for buf in buffers):
        fail(name + ': external buffers forbidden')
    images = obj.get('images', [])
    if len(images) != info['images'] or any('uri' in im or 'bufferView' not in im for im in images):
        fail(name + ': unexpected/missing embedded image')
    accessors = obj.get('accessors', [])
    triangles = 0
    for mesh in obj.get('meshes', []):
        for prim in mesh.get('primitives', []):
            if prim.get('mode', 4) != 4:
                fail(name + ': non-triangle primitive')
            ix = prim.get('indices')
            pos = prim.get('attributes', {}).get('POSITION')
            if not isinstance(pos, int) or pos >= len(accessors):
                fail(name + ': invalid position accessor')
            if ix is not None:
                if not isinstance(ix, int) or ix >= len(accessors):
                    fail(name + ': invalid index accessor')
                count = accessors[ix]['count']
            else:
                count = accessors[pos]['count']
            if count % 3:
                fail(name + ': nontriangular index count')
            triangles += count // 3
    if triangles != info['triangles']:
        fail(f'{name}: expected {info["triangles"]} triangles, got {triangles}')
    return len(data)


def validate_archives(expected):
    by_pack = {PACK.format(n): {} for n in range(1, 6)}
    for name, info in expected.items():
        by_pack[info['pack']][MEMBER_PREFIX + name] = info
    blobs = {}
    for packname, entries in by_pack.items():
        path = DIR / packname
        if not path.is_file():
            fail('Waiting for all five packs: missing ' + packname)
        if path.stat().st_size > MAX_ARCHIVE_BYTES:
            fail(packname + ': ZIP exceeds upload budget')
        with zipfile.ZipFile(path) as z:
            zinfos = z.infolist()
            actual = [info.filename for info in zinfos]
            if len(actual) != len(set(actual)) or set(actual) != set(entries):
                fail(packname + ': archive names do not exactly match committed allowlist')
            for member in zinfos:
                mode = (member.external_attr >> 16) & 0o170000
                if mode == 0o120000 or member.is_dir():
                    fail(packname + ': symlinks/directories not permitted')
                item = entries[member.filename]
                if member.file_size != item['bytes']:
                    fail(packname + ': ZIP declared size mismatch')
                data = z.read(member)
                verify_glb(data, item)
                blobs[item['file']] = data
        print('PASS ZIP', packname, len(entries), 'GLBs')
    if len(blobs) != 44:
        fail('Missing one or more optimized models')
    # Transactional validation: do not write any binary until ALL five archives pass.
    for name, content in blobs.items():
        (DIR / name).write_bytes(content)
    print('PASS imported', len(blobs), 'owner GLBs', sum(map(len, blobs.values())), 'bytes')


def validate_installed(expected):
    for name, item in expected.items():
        path = DIR / name
        if not path.is_file():
            fail('Missing installed model: ' + name)
        verify_glb(path.read_bytes(), item)
    print('PASS installed', len(expected), 'exact verified GLBs')


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--archives', action='store_true')
    mode.add_argument('--files', action='store_true')
    args = parser.parse_args()
    expected = approved()
    if args.archives:
        validate_archives(expected)
    if args.files:
        validate_installed(expected)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile, KeyError, json.JSONDecodeError) as e:
        print('FAIL owner Meshy asset import:', e, file=sys.stderr)
        sys.exit(1)
