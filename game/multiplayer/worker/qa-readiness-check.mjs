#!/usr/bin/env node
/**
 * GAME ONLY — read-only, credential-free staging readiness gate.
 *
 * It proves ONLY: the checked-out production Game config is still disabled,
 * and the isolated owned Game Worker responds to exact /health + /ready
 * assertions over HTTPS with bounded requests. It does NOT claim any real
 * user sign-in, WebSocket peer, World Chat, GLB rendering or mobile FPS.
 *
 * Deliberately no args, secrets, auth headers or account identifiers.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {verifyGameRoomPreflight} from './staging-preflight.mjs';

const HOST='https://rooms.climboria.fun/';
const CONFIG=new URL('../client-config.json',import.meta.url);

export async function verifyReadOnlyGameQaStaging({
 loadConfig=()=>readFile(CONFIG,'utf8'),
 check=verifyGameRoomPreflight
}={}){
 let config;
 try{
  const loaded=await loadConfig();
  config=typeof loaded==='string'?JSON.parse(loaded):loaded;
 }catch{throw Error('Public Game release config could not be validated')}
 if(!config||config.schema!==1||config.enabled!==false||config.endpoint!==null)
  throw Error('Public Game release config is NOT fail-closed');
 for(const kind of ['health','ready']){
  // verifyGameRoomPreflight checks HTTP status AND all expected fields.
  await check(HOST,kind,{deadlineMs:15000});
 }
 return Object.freeze({publicMultiplayer:'disabled',gameRoomReadiness:'pass'});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=await verifyReadOnlyGameQaStaging();
  console.log('PASS: public Game multiplayer remains OFF.');
  console.log('PASS: isolated Game Worker /health and /ready returned validated HTTP 200.');
  console.log('NOT VERIFIED: real two-user login, WSS, movement, World Chat, GLB, physical Android FPS.');
 }catch{
  // Do not print response bodies, tokens, provider output or local secrets.
  console.error('FAIL: read-only Game staging release gate not verified. Check Game-only Worker route and the local public client config.');
  process.exitCode=1;
 }
}
