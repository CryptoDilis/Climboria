// Offline only. Reconcile two independently collected, complete, same-slot
// normalized holder inventories; does not establish source authenticity or eligibility.
import {createHash} from 'node:crypto';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const MAX=(1n<<64n)-1n;
const fail=msg=>{throw new Error('NO_GO: '+msg);};
function key(s){
  if(typeof s!=='string'||s.length<32||s.length>44)fail('invalid public key');
  let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)fail('invalid public key');n=n*58n+BigInt(i);}
  let len=0;while(n){len++;n>>=8n;}
  for(const c of s){if(c!=='1')break;len++;}
  if(len!==32)fail('invalid public key');
  return s;
}
function amount(s){
  if(typeof s!=='string'||! /^(0|[1-9][0-9]{0,19})$/.test(s))fail('invalid raw amount');
  const n=BigInt(s);if(n>MAX)fail('raw amount overflow');return n;
}
function normalize(s){
  if(!s||s.mint!==CLIMB_SOLANA_MINT||s.program!==TOKEN_2022_PROGRAM||s.decimals!==6||s.commitment!=='finalized')fail('wrong mint/program/decimals/commitment');
  if(!Number.isSafeInteger(s.slot)||s.slot<=0||s.complete!==true||!Array.isArray(s.accounts)||s.accounts.length>1000000)fail('incomplete or invalid inventory');
  const genesis=key(s.genesis),blockhash=key(s.blockhash),supply=amount(s.supplyRaw);
  const seen=new Set(),owners=new Map(),rows=[];
  let total=0n,frozen=0n;
  for(const a of s.accounts){
    if(!a||a.mint!==CLIMB_SOLANA_MINT||a.program!==TOKEN_2022_PROGRAM||!['initialized','frozen'].includes(a.state))fail('invalid token account identity/state');
    const address=key(a.address),owner=key(a.owner),raw=amount(a.amountRaw);
    if(seen.has(address))fail('duplicate token account');seen.add(address);
    total+=raw;if(total>MAX)fail('aggregate overflow');
    if(a.state==='frozen')frozen+=raw;
    if(raw>0n){owners.set(owner,(owners.get(owner)||0n)+raw);rows.push([address,owner,raw.toString(),a.state]);}
  }
  if(total!==supply)fail('account sum does not match finalized mint supply');
  rows.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  const digest=createHash('sha256').update(JSON.stringify([genesis,blockhash,s.slot,supply.toString(),rows])).digest('hex');
  return {slot:s.slot,genesis,blockhash,supplyRaw:supply.toString(),digest,positiveTokenAccounts:rows.length,positiveOwnerAddresses:owners.size,frozenRaw:frozen.toString()};
}
export function reconcileInventories(a,b,{expectedGenesis}={}){
  const expected=key(expectedGenesis);
  const x=normalize(a),y=normalize(b);
  if(x.genesis!==expected||y.genesis!==expected)fail('genesis mismatch');
  if(x.slot!==y.slot||x.blockhash!==y.blockhash)fail('snapshots are not the same finalized slot/block');
  if(x.digest!==y.digest)fail('holder inventories disagree');
  return {...x,inventoryArithmetic:'MATCHED_NORMALIZED_INPUTS',sourceAuthenticity:'NOT_VERIFIED',providerIndependence:'NOT_VERIFIED',holderEligibility:'NOT_DETERMINED',bridgeRelease:'NO_GO'};
}
