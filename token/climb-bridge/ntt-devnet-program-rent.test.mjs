import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateSampleProgramRent,UPSTREAM,SAMPLE_ID} from './ntt-devnet-program-rent.mjs';
import {TESTNET} from './ntt-testnet-core.mjs';
import {decodeKey} from './programdata-pda.mjs';
const image=Buffer.concat([Buffer.from([0x7f,0x45,0x4c,0x46]),Buffer.alloc(60),decodeKey(TESTNET.solana.core),decodeKey(SAMPLE_ID)]);
function mock(genesis=TESTNET.solana.genesis){const calls=[];return {calls,fetchFn:async(url,o)=>{
 assert.equal(url,TESTNET.solana.rpc);assert.equal(o.redirect,'error');const {method,params}=JSON.parse(o.body);calls.push({method,params});
 assert.ok(['getGenesisHash','getMinimumBalanceForRentExemption'].includes(method));
 return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:method==='getGenesisHash'?genesis:params[0]*100})};
}};}
test('sample ELF rent floor includes ProgramData and program, not buffer twice',async()=>{
 const m=mock(),r=await estimateSampleProgramRent(image,UPSTREAM,m.fetchFn);
 assert.equal(r.programDataBytes,image.length+45);assert.equal(r.bufferBytes,image.length+37);
 assert.equal(r.illustrativeFinalProgramStorageLamports,(image.length+45+36)*100);
 assert.equal(r.cliInitialBufferFundingLamports,r.programDataRentLamports);
 assert.equal(r.bridgeRelease,'NO_GO');assert.equal(m.calls.length,4);
});
test('reject wrong build identity, missing embedded addresses and wrong network',async()=>{
 const m=mock();await assert.rejects(estimateSampleProgramRent(image,'bad',m.fetchFn),/NO_GO/);
 await assert.rejects(estimateSampleProgramRent(image.subarray(0,96),UPSTREAM,m.fetchFn),/NO_GO/);assert.equal(m.calls.length,0);
 await assert.rejects(estimateSampleProgramRent(image,UPSTREAM,mock('wrong').fetchFn),/NO_GO/);
});
