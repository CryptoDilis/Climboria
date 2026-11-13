// CLIMBX-only public-preview acceptance checks. No network, wallet, or trade execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dex = fs.readFileSync(path.join(root, 'dex/index.html'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'dex/climbx/index.html'), 'utf8');

assert.match(dex, /href="\/dex\/climbx\/"/, 'DEX must link to CLIMBX preview');
assert.match(dex, /class="climbx-beta-banner"/, 'CLIMBX must be visible outside mobile-hidden navigation');
const heroStart = dex.indexOf('<section class="hero">');
const heroEnd = dex.indexOf('</section>', heroStart);
const bannerIndex = dex.indexOf('class="climbx-beta-banner"');
assert.ok(heroStart >= 0 && bannerIndex > heroStart && bannerIndex < heroEnd, 'CLIMBX banner must be inside DEX hero');
assert.match(preview, /COMING SOON · PREVIEW ONLY/);
assert.match(preview, /Trading:\s*<strong>Disabled<\/strong>/);
assert.match(preview, /Connect wallet · Unavailable/);
assert.match(preview, /Start bot · Unavailable/);
assert.match(preview, /Approve strategy · Unavailable/);
assert.equal((preview.match(/<button[^>]*disabled[^>]*>/g) || []).length, 3, 'All preview actions must remain disabled');
assert.doesNotMatch(preview, /<script\b/i, 'Preview must remain static without executable JS');
console.log('CLIMBX public preview visibility and fail-closed actions: PASS');
