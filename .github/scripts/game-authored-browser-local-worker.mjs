// CI-only entry. Never deploy; no production authentication or route.
// Only the fixed test page, three client modules and WebSocket upgrade are exposed to loopback.
// Ticket issuance and deterministic ticks remain private DO test calls.
export {AuthoredLocalRoom} from './game-authored-local-worker.mjs';
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(env.AUTHORED_BROWSER_CI!=='true'||u.hostname!=='127.0.0.1'||u.port!=='4174'||req.method!=='GET')return new Response(null,{status:404});
 const assets={'/__authored_runtime_ci__':['text/html; charset=utf-8',env.CI_PAGE],
  '/game/multiplayer/preview-combat-client-transport.mjs':['text/javascript',env.CI_TRANSPORT],
  '/game/multiplayer/preview-combat-client-state.mjs':['text/javascript',env.CI_STATE],
  '/game/multiplayer/authored-local-combat-controls.mjs':['text/javascript',env.CI_CONTROLS]};
 if(Object.hasOwn(assets,u.pathname)){
  const [type,body]=assets[u.pathname];
  if(typeof body!=='string')return new Response(null,{status:404});
  return new Response(body,{headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline'; connect-src ws://127.0.0.1:4174; base-uri 'none'; frame-ancestors 'none'"}});
 }
 if(u.pathname!=='/ws'||req.headers.get('Origin')!=='http://127.0.0.1:4174'||
    req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response(null,{status:404});
 const protocols=(req.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim());
 if(protocols.length!==2||protocols[0]!=='climboria-preview-v1'||!/^t-[a-f0-9]{64}$/.test(protocols[1]))
  return new Response(null,{status:401});
 const headers=new Headers(req.headers);
 headers.set('Sec-WebSocket-Protocol',protocols.join(','));
 const stub=env.ROOM.get(env.ROOM.idFromName('preview-jarrell-camp-v1'));
 // Preserve the original native upgrade request rather than constructing a
 // synthetic HTTPS request. Only its protocol header is normalized.
 return stub.fetch(new Request(req,{headers}));
}};
