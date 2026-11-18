/**
 * CLIMBORIA GAME ONLY — private, redacted owner QA progress reporting.
 *
 * Fixed, source-controlled stages. Never accept provider errors, account IDs,
 * session data, ticket bytes, response bodies or arbitrary user strings into
 * console diagnostics. A failed test is NOT a verified live multiplayer pass.
 */
const STAGES=Object.freeze({
 'worker-readiness':'Game Worker HTTPS and room storage readiness',
 'public-game-config':'Unmodified public Game room configuration is approved',
 'player-a-session':'Player A real registered sign-in and room admission',
 'player-a-alone':'Player A alone in the accepted staging room',
 'player-b-session':'Player B real registered sign-in and room admission',
 'distinct-accounts':'Two separate registered account identities',
 'peer-avatars':'Two reciprocal 3D GLB remote avatars and map peers',
 'movement-sync':'Physical keyboard movement replicated to the other player',
 'world-chat':'Bidirectional room-echoed World Chat and safe unsent draft',
 'nearby-chat':'Real two-player Nearby Chat with in-range overhead speech',
 'desktop-render':'Rendered Chrome frames (not physical Android FPS)',
 'disconnect-rejoin':'No ghost peer after leaving; authenticated room rejoin'
});

export function createGameQaProgress(emit){
 if(typeof emit!=='function')throw Error('QA progress writer required');
 const passed=[];
 let active=null;
 function label(id){
  if(!Object.hasOwn(STAGES,id))throw Error('Unknown Game QA stage');
  return STAGES[id];
 }
 return Object.freeze({
  start(id){
   const name=label(id);
   if(active!==null)throw Error('Previous Game QA stage still active');
   if(passed.includes(id))throw Error('Game QA stage was already passed');
   active=id;
   emit('CHECK: '+name);
  },
  pass(){
   if(active===null)throw Error('No active Game QA stage to pass');
   emit('PASS: '+label(active));
   passed.push(active);
   active=null;
  },
  fail(){
   // Only fixed internal stage label, never an arbitrary upstream error.
   emit('QA RESULT: NOT VERIFIED — '+(active?label(active):'Game QA setup')+
    ' did not complete. Live two-account acceptance is NOT VERIFIED.');
   return Object.freeze({stage:active||'setup',passed:Object.freeze([...passed])});
  },
  summary(){return Object.freeze({stage:active||null,passed:Object.freeze([...passed])})}
 });
}

/**
 * Owner QA-only identity continuity. Passes only when the same authenticated
 * non-empty user ID returns after the temporary browser disconnect.
 * Callers must never log either ID or include IDs in errors/artifacts.
 */
export function sameRegisteredQaAccount(originalId,rejoinedId){
 return typeof originalId==='string'&&originalId.length>0&&
  typeof rejoinedId==='string'&&rejoinedId===originalId;
}

/**
 * Validate only a real, published first-party registered-pilot config.
 * No injected QA config may silently activate or substitute a room endpoint.
 */
export function isApprovedPublishedGameConfig(config){
 return !!config&&typeof config==='object'&&!Array.isArray(config)&&
  config.schema===1&&config.enabled===true&&
  config.endpoint==='https://rooms.climboria.fun/';
}
