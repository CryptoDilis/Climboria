// CLIMBX-only public-preview acceptance checks. No network, wallet, or trade execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dex = fs.readFileSync(path.join(root, 'dex/index.html'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'dex/climbx/index.html'), 'utf8');

// Match the actual premium DEX hero link: CSS may add a second class token
// and the preview URL can deep-link directly to its disabled bot-settings
// section. Require a real <a> inside the visible hero, not a hidden token
// elsewhere in the document or an unrelated navigation link.
const heroStart = dex.indexOf('<section class="hero">');
const heroEnd = dex.indexOf('</section>', heroStart);
assert.ok(heroStart >= 0 && heroEnd > heroStart, 'DEX must contain a visible hero section');
const hero = dex.slice(heroStart, heroEnd);
assert.match(hero,
  /<a\b(?=[^>]*\bclass="[^"]*\bclimbx-beta-banner\b[^"]*")(?=[^>]*\bhref="\/dex\/climbx\/(?:#bot-settings)?")[^>]*>/,
  'DEX hero must link to CLIMBX preview through its visible banner');
assert.match(hero, /aria-label="CLIMBX[^"]*trading disabled"/,
  'Visible CLIMBX preview link must clearly state trading is disabled');
assert.match(preview, /COMING SOON · PREVIEW ONLY/);
assert.match(preview, /Trading<\/span><strong class="warn">Disabled<\/strong>/);
assert.match(preview, /Connect wallet · Unavailable/);
assert.match(preview, /id="about-climbx"/);
assert.match(preview, /id="security"/);
assert.match(preview, /id="risks"/);
assert.match(preview, /Paper trade first/);
assert.match(preview, /href="\/whitepaper\/"/);
assert.match(preview, /Start bot · Unavailable/);
assert.match(preview, /Approve strategy · Unavailable/);
assert.equal((preview.match(/<button[^>]*disabled[^>]*>/g) || []).length, 3, 'All preview actions must remain disabled');
assert.doesNotMatch(preview, /<script\b/i, 'Preview must remain static without executable JS');
console.log('CLIMBX public preview visibility and fail-closed actions: PASS');
