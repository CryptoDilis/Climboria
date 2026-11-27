import test from 'node:test';
import assert from 'node:assert/strict';
import {accessRedirect,preflight} from './preview-edge-preflight.mjs';
const url='https://delicate-pine-4c5e.cloudflareaccess.com/cdn-cgi/access/login/game-combat-preview.climboria.fun?meta=private';
const redirect={status:302,location:url};
test('accepts only the configured Access login origin and exact app path',()=>{
 assert.equal(accessRedirect(redirect),true);
 for(const result of [
  {status:503,location:url},{status:101,location:url},{status:302,location:'https://evil.example/'},
  {status:302,location:url.replace('https:','http:')},
  {status:302,location:url.replace('cloudflareaccess.com','cloudflareaccess.com.evil.example')},
  {status:302,location:url.replace('game-combat-preview.climboria.fun','other.climboria.fun')},
  {status:302,location:'not a url'},{status:302}
 ])assert.equal(accessRedirect(result),false);
});
test('three exact unauthenticated requests, no secret or location in output',async()=>{
 const seen=[];
 const r=await preflight({probe:async s=>{seen.push(s);return redirect}});
 assert.equal(r.ok,true);
 assert.deepEqual(seen.map(s=>[s.method,s.path]),[['GET','/'],['POST','/ticket'],['GET','/ws']]);
 assert.equal(seen[2].headers.Upgrade,'websocket');
 assert.equal(JSON.stringify(r).includes('meta=private'),false);
 assert.equal(r.rate.attempted,0);
});
test('rate probe only after positive Access checks; bounded single burst',async()=>{
 let count=0;
 const r=await preflight({rateProbe:true,probe:async()=>++count===27?{status:429}:redirect});
 assert.equal(count,27);assert.equal(r.rate.attempted,24);assert.equal(r.rate.blocked,1);assert.equal(r.ok,true);
 count=0;
 const deny=await preflight({rateProbe:true,probe:async()=>{count++;return {status:503}}});
 assert.equal(count,3);assert.equal(deny.ok,false);assert.equal(deny.rate.attempted,0);
});
test('no rate response or unexpected origin result is not enforcement proof',async()=>{
 const noRate=await preflight({rateProbe:true,probe:async()=>redirect});
 assert.equal(noRate.ok,false);
 let count=0;
 const unexpected=await preflight({rateProbe:true,probe:async()=>++count===26?{status:503}:count===27?{status:429}:redirect});
 assert.equal(unexpected.rate.unexpected,1);assert.equal(unexpected.ok,false);
});
