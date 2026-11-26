import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const qa=readFileSync(new URL('./e2e-real-game-ui.mjs',import.meta.url),'utf8');

// Offline source-contract tests ONLY. They do not sign in, open real sockets,
// deploy any Cloudflare code, or assert that owner acceptance has happened.
test('real browser QA must verify published first-party Game config and updated Worker',()=>{
 assert.match(qa,/await verifyDeployedGameConfig\(/);
 assert.match(qa,/requireNearbyChat:true/);
 assert.match(qa,/verifyGameRoomPreflight\(ROOM,'ready'/);
 assert.doesNotMatch(qa,/context\.route\(/,
  'A test-only client config override cannot count as real public Game acceptance');
 assert.doesNotMatch(qa,/route\.fulfill\(/);
});
test('real Game UI acceptance uses compact top ONLINE and auto-visible World Chat',()=>{
 assert.match(qa,/getElementById\('climboria-room-status'\)/);
 assert.match(qa,/badge\.textContent\.trim\(\)==='ONLINE: '/);
 assert.match(qa,/chat\?\.style\.display==='block'/);
 assert.doesNotMatch(qa,/count\.includes\(\(n\+1\)\+' ONLINE'/,
  'retired World Chat count would fail valid new HUD');
});
test('real Game QA checks Nearby server speech and identity-bound last-location reconnect',()=>{
 assert.match(qa,/Nearby Chat is not enabled by an upgraded authenticated Game Worker/);
 assert.match(qa,/QA nearby speech acceptance/);
 assert.match(qa,/nearbyBubbles===1/);
 assert.match(qa,/Math\.hypot\(lastVerifiedB\.x,lastVerifiedB\.z\+30\)>7/);
 assert.match(qa,/Rejoined registered hero returned to an incorrect world location/);
 assert.match(qa,/action:'sign-out'/);
 assert.match(qa,/action:'sign-in'/);
});

test('real two-account chat sends through SEND only, never the adjacent channel-switch button',()=>{
 assert.match(qa,/getByRole\('button',\{name:'SEND',exact:true\}\)\.click\(\)/);
 assert.doesNotMatch(qa,/panel\.locator\('button'\)\.click\(\)/,
  'an unscoped panel button selector is ambiguous with the Nearby/World switch');
});

test('real acceptance uses published hero creator without seeding storage or hiding session handoff failure',()=>{
 assert.doesNotMatch(qa,/addInitScript\(|localStorage\.setItem\(/);
 assert.match(qa,/surface:'menu'/);
 assert.match(qa,/locator\('#saveHeroButton'\)\.isDisabled\(\)/);
 assert.match(qa,/locator\('#heroModelSelect'\)\.selectOption\(account\.model\)/);
 assert.match(qa,/locator\('#saveHeroButton'\)\.click/);
 assert.match(qa,/stored\?\.ownerId===heroAuthUser\.id/);
 assert.match(qa,/locator\('#heroEnterButton'\)\.click/);
 assert.match(qa,/same real registered session must survive normal menu navigation/);
});

test('real Nearby range acceptance requires actual separation, sender echo and positive World delivery control',()=>{
 assert.match(qa,/d>30/);
 assert.match(qa,/await a\.keyboard\.down\(key\)/);
 assert.match(qa,/await expectChat\(a,'QA Explorer A \[nearby\]',privateText\)/);
 assert.match(qa,/expectChat\(b,'QA Explorer A',controlText\)/);
 assert.match(qa,/check\(!leaked,'Out-of-range Nearby message leaked/);
 assert.match(qa,/check\(await separated\(\),'Peer separation changed during World delivery control'\)/);
 assert.doesNotMatch(qa,/\.position\s*=|\.player\.(?:x|y|z)\s*=/);
});

test('landscape authenticated QA checks actual chat geometry and collapse without altering HUD',()=>{
 assert.match(qa,/Published mobile chat bottom-left layout failed/);
 assert.match(qa,/innerHeight-toggle\.bottom<=32/);
 assert.match(qa,/!overlaps\(panel,vitals\)/);
 assert.match(qa,/!actions\.some\(r=>overlaps\(panel,r\)\|\|overlaps\(toggle,r\)\)/);
 assert.match(qa,/Mobile chat did not collapse/);
 assert.match(qa,/Mobile chat did not reopen/);
});

test('real remote GLB acceptance requires attached visible residents and no fallback',()=>{
 const wait=qa.slice(qa.indexOf('async function waitForGlb('),qa.indexOf('async function openChat('));
 assert.match(wait,/a\?\.peers===1&&a\.resident===1&&a\.resident<=a\.budget/);
 assert.match(wait,/a\.sceneVisibleResidents===1&&a\.visibleFallbacks===0/);
 assert.match(qa,/Promise\.all\(\[waitForGlb\(a\),waitForGlb\(b\)\]\)/);
});
