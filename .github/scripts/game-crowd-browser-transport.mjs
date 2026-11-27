import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { WebSocket, WebSocketServer } from 'ws';
import { PresenceRoom } from '../../game/multiplayer/presence-room.mjs';

const origin = 'http://127.0.0.1:4173';
const protocol = 'climboria-crowd-fixture';
const mobile = process.env.NPC_QA_DEVICE === 'mobile';
const tickets = new Map();
const transports = new Map();
const pageErrors = [];
let clock = 1000;
let error;

const room = new PresenceRoom({
 roomId: 'private-browser-recovery',
 limit: 2,
 movementInterest: true,
 movementBatch: true,
 now: () => clock,
});

function issueFixtureTicket(id) {
 const token = randomUUID();
 tickets.set(token, id);
 return [protocol, token];
}

const server = new WebSocketServer({
 host: '127.0.0.1',
 port: 0,
 maxPayload: 1024,
 verifyClient({ origin: requestOrigin, req }) {
  const [version, token, ...rest] = (req.headers['sec-websocket-protocol'] ?? '').split(',').map(part => part.trim());
  if (requestOrigin !== origin || req.url !== '/crowd' || version !== protocol || rest.length || !tickets.has(token)) return false;
  req.fixtureSession = tickets.get(token);
  tickets.delete(token);
  return true;
 },
});

server.on('connection', (socket, request) => {
 const id = request.fixtureSession;
 socket.on('error', reason => { error ??= reason; });
 socket.on('close', () => {
  if (transports.get(id) !== socket) return;
  transports.delete(id);
  room.disconnect(id);
 });
 socket.on('message', raw => {
  try {
   const packet = JSON.parse(raw);
   const result = room.receive(id, packet);
   assert.ok(result.ok, result.reason);
   socket.send(JSON.stringify({ type: 'fixture-ack' }));
  } catch (reason) {
   error ??= reason;
  }
 });
 const joined = room.connect({
  trustedSessionId: id,
  send(packet) {
   assert.equal(socket.readyState, WebSocket.OPEN);
   socket.send(JSON.stringify(packet));
  },
 });
 if (!joined.ok) {
  error ??= new Error(joined.reason);
  socket.terminate();
  return;
 }
 transports.set(id, socket);
});

async function waitFor(predicate, label) {
 const deadline = performance.now() + 5000;
 while (!predicate()) {
  if (error) throw error;
  assert.ok(performance.now() < deadline, label);
  await delay(5);
 }
 if (error) throw error;
}

await once(server, 'listening');
const endpoint = 'ws://127.0.0.1:' + server.address().port + '/crowd';
let browser;
let actor;

try {
 const actorId = 'private-fixture-actor';
 let acks = 0;
 actor = new WebSocket(endpoint, issueFixtureTicket(actorId), { origin });
 actor.on('error', reason => { error ??= reason; });
 actor.on('message', raw => {
  if (JSON.parse(raw).type === 'fixture-ack') acks++;
 });
 await waitFor(() => transports.has(actorId), 'actor admission');
 async function move(x) {
  const nextAck = acks + 1;
  clock += 250;
  actor.send(JSON.stringify({ type: 'move', position: { x, y: 2, z: -30 } }));
  await waitFor(() => acks === nextAck, 'movement acknowledgement');
  room.flushMovementInterest();
 }

 browser = await chromium.launch({
  executablePath: process.env.NPC_QA_CHROMIUM,
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
 });
 const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
 await context.addInitScript(() => localStorage.setItem('climboria-created-hero-v1', JSON.stringify({
  name: 'Crowd QA Explorer', model: 'Jarrell', createdAt: '2026-11-14T00:00:00Z',
 })));
 await context.route('**/game/multiplayer/client-config.json*', route => route.fulfill({ json: { schema: 1, enabled: false, endpoint: null } }));
 await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', route => route.fulfill({ path: resolve('node_modules/three/build/three.min.js'), contentType: 'text/javascript' }));
 await context.route('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', route => route.fulfill({ path: resolve('node_modules/three/examples/js/loaders/GLTFLoader.js'), contentType: 'text/javascript' }));
 const page = await context.newPage();
 page.on('pageerror', reason => pageErrors.push(reason.message));
 await page.goto(origin + '/game/play.html?smoke=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
 await page.waitForFunction(() => window.__climboriaGameReady === true, undefined, { timeout: 120000 });
 assert.equal(await page.evaluate(() => window.__climboriaJarrellsPeak.crowdSmokeEnable()), true);

 async function observe(id) {
  await page.evaluate(({ endpoint, protocols }) => {
   const world = window.__climboriaJarrellsPeak;
   const peers = window.__CLIMBORIA_GAME_PEERS;
   const state = { id: null, batches: 0, applied: 0, closed: false };
   const socket = new WebSocket(endpoint, protocols);
   window.crowdTransportFixture = state;
   socket.addEventListener('message', ({ data }) => {
    const packet = JSON.parse(data);
    switch (packet.type) {
     case 'welcome':
      state.id = packet.selfId;
      for (const peer of packet.peers) peers.add(peer);
      break;
     case 'players-moved': {
      const result = world.crowdSmokeBatch(packet);
      if (!result.ok) throw new Error('Rejected authoritative fixture movement');
      state.batches++;
      state.applied += result.applied;
      break;
     }
     case 'player-left':
      peers.remove(packet.id);
      break;
     default:
      throw new Error('Unexpected browser packet: ' + packet.type);
    }
   });
   socket.addEventListener('close', () => {
    peers.clear();
    state.closed = true;
   });
  }, { endpoint, protocols: issueFixtureTicket(id) });
  await page.waitForFunction(expected => window.crowdTransportFixture.id === expected && window.__CLIMBORIA_GAME_PEERS.count() === 1, id, { timeout: 30000 });
 }

 const snapshot = () => page.evaluate(() => window.__CLIMBORIA_GAME_PEERS.audit());
 const originalId = 'private-fixture-observer-first';
 await observe(originalId);
 assert.deepEqual((await snapshot()).positions.map(peer => [peer.id, peer.x]), [[actorId, 0]]);
 await move(0.5);
 await page.waitForFunction(() => window.crowdTransportFixture.batches === 1 && window.crowdTransportFixture.applied === 1, undefined, { timeout: 30000 });
 const converged = await page.evaluate(() => {
  const peers = window.__CLIMBORIA_GAME_PEERS;
  for (let i = 0; i < 30; i++) peers.update(0.05);
  return peers.audit().renderedPositions[0];
 });
 assert.equal(converged.id, actorId);
 assert.equal(converged.targetX, 0.5);
 assert.ok(converged.attached && Math.abs(converged.x - 0.5) < 0.01);

 transports.get(originalId).terminate();
 await page.waitForFunction(() => window.crowdTransportFixture.closed && window.__CLIMBORIA_GAME_PEERS.count() === 0, undefined, { timeout: 30000 });
 await waitFor(() => !room.members.has(originalId), 'old observer cleanup');
 await move(1);
 const replacementId = 'private-fixture-observer-second';
 await observe(replacementId);
 assert.deepEqual((await snapshot()).positions.map(peer => [peer.id, peer.x]), [[actorId, 1]]);
 assert.equal(await page.evaluate(() => window.crowdTransportFixture.batches), 0);
 await move(1.5);
 await page.waitForFunction(() => window.crowdTransportFixture.batches === 1 && window.crowdTransportFixture.applied === 1, undefined, { timeout: 30000 });
 assert.equal((await snapshot()).renderedPositions[0].targetX, 1.5);

 actor.close();
 await page.waitForFunction(() => window.__CLIMBORIA_GAME_PEERS.count() === 0, undefined, { timeout: 30000 });
 const clean = await snapshot();
 assert.equal(clean.loading + clean.resident, 0);
 await context.close();
 await waitFor(() => room.members.size === 0 && transports.size === 0, 'final room cleanup');
 assert.equal(room.movementInterest.size(), 0);
 assert.deepEqual(pageErrors, []);
 console.log(JSON.stringify({ mobile, nativeBrowserSocket: true, batchesApplied: 2, rejoinedWithCurrentSnapshot: true, cleanup: true }));
} finally {
 actor?.terminate();
 for (const socket of server.clients) socket.terminate();
 await browser?.close();
 await new Promise(resolveClose => server.close(resolveClose));
}
