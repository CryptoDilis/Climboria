import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('assets/characters/Climboria_Hero.glb');
const bytes = fs.readFileSync(file);
const fail = message => { console.error('[character-glb-audit] ERROR:', message); process.exitCode = 1; };

if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF') {
  fail('Character asset is missing or is not a valid GLB v2 container.');
} else {
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  if (version !== 2 || declaredLength !== bytes.length || jsonType !== 0x4e4f534a || 20 + jsonLength > bytes.length) {
    fail(JSON.stringify({ version, declaredLength, actualLength: bytes.length, jsonLength, jsonType }));
  } else {
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).replace(/\\0+$/g, '').trim());
    const binHeader = 20 + jsonLength;
    const binLength = binHeader + 8 <= bytes.length ? bytes.readUInt32LE(binHeader) : 0;
    const binStart = binHeader + 8;
    const views = json.bufferViews || [];
    const imageRows = (json.images || []).map((image, index) => {
      const view = Number.isInteger(image.bufferView) ? views[image.bufferView] : null;
      const start = view ? binStart + (view.byteOffset || 0) : -1;
      const length = view?.byteLength || 0;
      const mimeType = image.mimeType || 'unknown';
      let width = null, height = null, format = mimeType;
      if (start >= binStart && start + length <= bytes.length && length >= 24) {
        const data = bytes.subarray(start, start + length);
        if (data.toString('hex', 0, 8) === '89504e470d0a1a0a' && data.toString('ascii', 12, 16) === 'IHDR') {
          width = data.readUInt32BE(16); height = data.readUInt32BE(20); format = 'PNG';
        } else if (data[0] === 0xff && data[1] === 0xd8) {
          let offset = 2;
          while (offset + 9 < data.length) {
            if (data[offset] !== 0xff) { offset++; continue; }
            const marker = data[offset + 1];
            const segmentLength = data.readUInt16BE(offset + 2);
            if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
              height = data.readUInt16BE(offset + 5); width = data.readUInt16BE(offset + 7); format = 'JPEG'; break;
            }
            if (segmentLength < 2) break;
            offset += 2 + segmentLength;
          }
        } else if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
          format = 'WebP';
          const chunk = data.toString('ascii', 12, 16);
          if (chunk === 'VP8X' && data.length >= 30) {
            width = 1 + data.readUIntLE(24, 3); height = 1 + data.readUIntLE(27, 3);
          }
        }
      }
      return { index, name: image.name || null, mimeType, detectedFormat: format, width, height, bufferViewBytes: length, bufferViewIndex: image.bufferView ?? null };
    });
    const report = {
      file: path.relative(process.cwd(), file),
      fileBytes: bytes.length,
      fileMiB: Number((bytes.length / 1048576).toFixed(2)),
      glbVersion: version,
      jsonBytes: jsonLength,
      binaryChunkBytes: binLength,
      nodes: json.nodes?.length || 0,
      meshes: json.meshes?.length || 0,
      primitives: (json.meshes || []).reduce((n, mesh) => n + (mesh.primitives?.length || 0), 0),
      materials: json.materials?.length || 0,
      animations: json.animations?.length || 0,
      extensionsUsed: json.extensionsUsed || [],
      extensionsRequired: json.extensionsRequired || [],
      images: imageRows,
      embeddedImageBytes: imageRows.reduce((n, image) => n + image.bufferViewBytes, 0),
      embeddedImageMiB: Number((imageRows.reduce((n, image) => n + image.bufferViewBytes, 0) / 1048576).toFixed(2))
    };
    console.log('[character-glb-audit] ' + JSON.stringify(report, null, 2));
    if (!imageRows.length) fail('No embedded character images found; verify the asset references and URI handling.');
    if (imageRows.some(image => !image.width || !image.height)) fail('At least one embedded image dimension could not be decoded by the audit.');
  }
}
