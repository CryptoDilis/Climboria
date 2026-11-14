// Game-only PRODUCTION CDN acceptance for the five optimized chest GLBs.
// A successful GitHub Pages workflow alone does not prove the custom-domain
// CDN is serving the same bytes. Verify actual public HTTPS responses.
// Run: node game/scripts/verify-live-chest-assets.mjs
// Defaults to official climboria.fun. No wallet, DEX or web auth touched.
import {createHash} from 'node:crypto';

const BASE='https://climboria.fun';
const EXPECTED=Object.freeze({
 Common:[1358448,'ef18bfd30eee4da3f6df06144c04acd0fc277089fbd729706b3c57d9caeefc7b'],
 Uncommon:[559748,'cacc85ac63792556c5907076fbcb1ce99b1be79c558ccc48f4b0d2fc67c08bdb'],
 Rare:[1581236,'96c8a4911312efdf1cbab974a4ec21b9f66b70c8556b645c7a502b83e7424d6f'],
 Epic:[1208104,'d74a80d50402458c5e2202c2d22d3d4fe413423aa1d70814a6312b6009d4ac60'],
 Legendary:[746592,'53a9e94a16db3977347981caad6aa7e8f213ee52cfb7166afd165744466a7fb4']
});
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
async function read(url){
 const response=await fetch(url,{
  method:'GET',
  redirect:'follow',
  signal:AbortSignal.timeout(60000),
  headers:{'cache-control':'no-cache','accept':'*/*'}
 });
 check(response.ok&&response.status===200,'Production HTTP '+response.status+' '+url);
 check(response.url.startsWith(BASE+'/'),'Unexpected cross-origin redirect '+response.url);
 const bytes=Buffer.from(await response.arrayBuffer());
 check(bytes.length<8_000_000,'Production asset unexpectedly large '+url);
 return bytes;
}
try{
 const game=await read(BASE+'/game/play.html?chest-release=2026-11-15');
 const html=game.toString('utf8');
 check(html.includes('CHEST_MODEL_PATHS')&&html.includes('chestVisualAudit')
  &&html.includes('Climboria_Chest_Legendary.glb'),
  'Live Game HTML does not contain released five-chest loader/rarity audit');
 console.log('PASS deployed Game HTML with actual five-chest loader',game.length,'bytes');
 let total=0;
 for(const [tier,[length,sha]] of Object.entries(EXPECTED)){
  const path='/assets/chests/Climboria_Chest_'+tier+'.glb';
  const raw=await read(BASE+path+'?chest-release=2026-11-15');
  total+=raw.length;
  check(raw.length===length,'Production '+tier+' GLB byte length mismatch: '+raw.length+' != '+length);
  check(raw.toString('ascii',0,4)==='glTF'&&raw.readUInt32LE(4)===2
    &&raw.readUInt32LE(8)===raw.length,'Invalid production '+tier+' GLB2 header');
  const actual=createHash('sha256').update(raw).digest('hex');
  check(actual===sha,'Production '+tier+' SHA-256 mismatch: '+actual);
  console.log('PASS production '+tier+' chest GLB',raw.length,'bytes SHA-256',actual);
 }
 check(total===5454128,'Unexpected total optimized production GLB payload '+total);
 console.log('PASS production live five-chest CDN byte verification at',BASE,'total',total);
}catch(err){
 console.error('FAIL production Game chest CDN verification:',err.stack||String(err));
 process.exitCode=1;
}
