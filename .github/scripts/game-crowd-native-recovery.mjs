import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket, WebSocketServer } from 'ws';
import { PresenceRoom } from '../../game/multiplayer/presence-room.mjs';

const session = index => 'fixture-session-' + index;
const at = x => ({ x, y: 2, z: -30 });

async function recoveryScenario(count) {
 const start = performance.now();
 let clock = 1000;
 const room = new PresenceRoom({
  roomId: 'private-crowd-recovery',
  limit: count,
  movementInterest: true,
  movementBatch: true,
  now: () => clock,
 });
 let nextSession = 0;
 let failure;
 const server = new WebSocketServer({ host: '127.0.0.1', port: 0, maxPayload: 1024 });
 const clients = new Map();
 const transports = new Map();

 async function waitFor(predicate, label) {
  const deadline = performance.now() + 5000;
  while (!predicate()) {
   if (failure) throw failure;
   assert.ok(performance.now() < deadline, label);
   await delay(5);
  }
  if (failure) throw failure;
 }

 server.on('connection', socket => {
  const id = session(nextSession++);
  const send = packet => {
   assert.equal(socket.readyState, WebSocket.OPEN);
   socket.send(JSON.stringify(packet));
  };
  transports.set(id, send);
  socket.on('error', error => { failure ??= error; });
  socket.on('close', () => {
   transports.delete(id);
   room.disconnect(id);
  });
  socket.on('message', raw => {
   try {
    const packet = JSON.parse(raw);
    const result = room.receive(id, packet);
    assert.ok(result.ok, result.reason);
    send({ type: 'fixture-ack', step: packet.step });
   } catch (error) {
    failure ??= error;
   }
  });
  try {
   const admission = room.connect({ trustedSessionId: id, send });
   assert.ok(admission.ok, admission.reason);
  } catch (error) {
   failure ??= error;
   socket.terminate();
  }
 });

 async function admit() {
  const socket = new WebSocket('ws://127.0.0.1:' + server.address().port);
  const client = { socket, peers: new Map(), position: at(0), ack: 0, barrier: 0 };
  socket.on('error', error => { failure ??= error; });
  socket.on('message', raw => {
   try {
    const packet = JSON.parse(raw);
    switch (packet.type) {
     case 'welcome':
      assert.equal(client.id, undefined);
      assert.equal(packet.roomId, 'private-crowd-recovery');
      client.id = packet.selfId;
      for (const peer of packet.peers) {
       assert.notEqual(peer.id, client.id);
       assert.ok(!client.peers.has(peer.id));
       client.peers.set(peer.id, peer.position);
      }
      break;
     case 'player-joined':
      assert.notEqual(packet.player.id, client.id);
      assert.ok(!client.peers.has(packet.player.id), 'duplicate peer join');
      client.peers.set(packet.player.id, packet.player.position);
      break;
     case 'player-left':
      assert.ok(client.peers.delete(packet.id), 'leave for unknown peer');
      break;
     case 'players-moved':
      assert.ok(packet.moves.length > 0 && packet.moves.length <= 32);
      for (const move of packet.moves) {
       assert.ok(client.peers.has(move.id), 'movement referenced a retired or unknown peer');
       client.peers.set(move.id, move.position);
      }
      break;
     case 'fixture-ack':
      client.ack = packet.step;
      break;
     case 'fixture-barrier':
      client.barrier = packet.step;
      break;
     default:
      assert.fail('Unexpected room packet: ' + packet.type);
    }
   } catch (error) {
    failure ??= error;
   }
  });
  try {
   await waitFor(() => client.id, 'welcome timeout');
   assert.equal(client.peers.size, clients.size);
   clients.set(client.id, client);
   return client;
  } catch (error) {
   socket.terminate();
   throw error;
  }
 }

 let barrier = 0;
 async function verifyRoster() {
  barrier++;
  for (const send of transports.values()) send({ type: 'fixture-barrier', step: barrier });
  await waitFor(() => [...clients.values()].every(client => client.barrier === barrier), 'delivery barrier timeout');
  const authoritative = new Map(room.snapshot().map(peer => [peer.id, peer.position]));
  assert.deepEqual(authoritative, new Map([...clients].map(([id, client]) => [id, client.position])));
  for (const client of clients.values()) {
   const expected = new Map(authoritative);
   expected.delete(client.id);
   assert.deepEqual(client.peers, expected);
  }
 }

 async function move(step, participants) {
  clock += 250;
  // Vary send arrival times across clients. The room still owns the clock and identity.
  await Promise.all(participants.map(async (client, index) => {
   await delay((index * 7 + step * 11) % 23);
   client.position = at(client.position.x + 0.25);
   client.socket.send(JSON.stringify({ type: 'move', step, id: 'untrusted-payload-id', position: client.position }));
  }));
  await waitFor(() => participants.every(client => client.ack === step), 'movement ACK timeout');
 }

 await once(server, 'listening');
 try {
  for (let index = 0; index < count; index++) await admit();
  await verifyRoster();
  const overflow = room.connect({
   trustedSessionId: 'fixture-session-overflow',
   send: () => assert.fail('Full room issued a welcome'),
  });
  assert.deepEqual(overflow, { ok: false, reason: 'room-full' });
  const replaced = new Set();
  for (let step = 1; step <= 20; step++) {
   await move(step, [...clients.values()]);
   if (step % 5 === 0) {
    // Cut connections after accepting movement but before flushing the batch.
    const dropped = [...clients.values()].filter((_, index) => index % 5 === 0);
    for (const client of dropped) {
     replaced.add(client.id);
     clients.delete(client.id);
     client.socket.terminate();
    }
    await waitFor(() => transports.size === clients.size && room.members.size === clients.size, 'abrupt disconnect cleanup timeout');
    room.flushMovementInterest();
    await verifyRoster();
    for (let index = 0; index < dropped.length; index++) {
     const replacement = await admit();
     assert.ok(!replaced.has(replacement.id));
     for (const retired of replaced) assert.ok(!replacement.peers.has(retired));
    }
   }
   room.flushMovementInterest();
   await verifyRoster();
  }
  for (const client of clients.values()) client.socket.close();
  await waitFor(() => room.members.size === 0 && transports.size === 0, 'final cleanup timeout');
  assert.equal(room.movementInterest.size(), 0);
  console.log(JSON.stringify({
   clients: count, movementTicks: 20, reconnects: replaced.size,
   sendDelayRangeMs: [0, 22], elapsedMs: Math.round(performance.now() - start),
   rosterAndPositionsVerified: true, cleanupVerified: true,
  }));
 } finally {
  for (const client of clients.values()) client.socket.terminate();
  for (const socket of server.clients) socket.terminate();
  await new Promise(resolve => server.close(resolve));
 }
}

for (const count of [10, 25, 50, 100, 128]) await recoveryScenario(count);
