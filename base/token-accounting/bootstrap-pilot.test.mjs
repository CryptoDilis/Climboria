import test from 'node:test';
import assert from 'node:assert/strict';
// Arithmetic and policy model ONLY. Not Solidity, chain evidence or deployment authority.
const SUPPLY=888888888000000n, COMMUNITY=SUPPLY/10n;
const caps=Object.freeze({airdrop:SUPPLY*5n/10000n,giveaway:SUPPLY/10000n,marketing:SUPPLY*4n/10000n});
const CAP=SUPPLY/1000n, REMAIN=COMMUNITY-CAP, DAY=86400;
const initial=()=>({used:0n,by:{airdrop:0n,giveaway:0n,marketing:0n},ids:new Set(),closed:false});
function consume(s,{purpose,amount,id,queuedAt,now,start=0,authorized=false}){
 if(!authorized||s.closed||!Object.hasOwn(caps,purpose)||typeof amount!=='bigint'||amount<=0n||typeof id!=='string'||!id||s.ids.has(id)||![queuedAt,now,start].every(Number.isSafeInteger)||start<0||queuedAt<start||now<queuedAt+2*DAY||now>=start+90*DAY)throw Error('denied');
 if(s.used+amount>CAP||s.by[purpose]+amount>caps[purpose])throw Error('cap');
 return {...s,used:s.used+amount,by:{...s.by,[purpose]:s.by[purpose]+amount},ids:new Set([...s.ids,id])};
}
const request=(overrides={})=>({purpose:'airdrop',amount:1n,id:'a',queuedAt:0,now:2*DAY,authorized:true,...overrides});
test('exact six-decimal master and sub-cap arithmetic',()=>{
 assert.equal(COMMUNITY,88888888800000n);assert.equal(CAP,888888888000n);assert.equal(caps.airdrop,444444444000n);assert.equal(caps.giveaway,88888888800n);assert.equal(caps.marketing,355555555200n);assert.equal(Object.values(caps).reduce((a,b)=>a+b,0n),CAP);assert.equal(REMAIN,87999999912000n);
});
test('full permitted usage conserves original community reserve',()=>{
 let s=initial();for(const [purpose,amount] of Object.entries(caps))s=consume(s,request({purpose,amount,id:purpose}));assert.equal(s.used,CAP);assert.equal(s.used+REMAIN,COMMUNITY);assert.throws(()=>consume(s,request({id:'extra'})));
});
test('one purpose cannot consume another purpose budget',()=>{assert.throws(()=>consume(initial(),request({amount:caps.airdrop+1n})));assert.throws(()=>consume(initial(),request({purpose:'treasury'})));});
test('no release before 48 hours or at/after 90 day deadline',()=>{for(const now of [0,2*DAY-1,90*DAY,91*DAY])assert.throws(()=>consume(initial(),request({now})));assert.equal(consume(initial(),request()).used,1n);});
test('duplicate campaign identifier rejected across purposes',()=>{const s=consume(initial(),request());assert.throws(()=>consume(s,request({purpose:'marketing'})));});
test('no negative zero or fractional raw amounts',()=>{for(const amount of [0n,-1n,1.5,'1',1])assert.throws(()=>consume(initial(),request({amount})));});
test('closure and missing authorization reject release',()=>{assert.throws(()=>consume({...initial(),closed:true},request()));assert.throws(()=>consume(initial(),request({authorized:false})));});
test('rejected action does not mutate original counters',()=>{const s=consume(initial(),request());assert.throws(()=>consume(s,request({id:'b',amount:CAP})));assert.equal(s.used,1n);assert.equal(s.by.airdrop,1n);assert.deepEqual([...s.ids],['a']);});
