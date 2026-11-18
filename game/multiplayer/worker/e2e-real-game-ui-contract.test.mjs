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
