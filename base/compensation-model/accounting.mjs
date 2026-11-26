// Synthetic/offline accounting model only. No RPC, wallets, signatures, claims or production eligibility.
const MAX=(1n<<256n)-1n, MAX_LEGACY=(1n<<64n)-1n;
const fail=code=>{throw new Error(code);};
function raw(v,max=MAX){if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,77})$/.test(v))fail('INVALID_RAW');const n=BigInt(v);if(n>max)fail('INVALID_RAW');return n;}
function slot(v){if(!Number.isSafeInteger(v)||v<=0)fail('INVALID_SLOT');return v;}
function id(v){if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(v))fail('INVALID_ID');return v;}
function shape(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail('INVALID_SHAPE');}
const sum=xs=>xs.reduce((a,b)=>a+b,0n);
const roles=new Set(['external','founder','curve']);

// Illustrative policy: external-holder pool only; founder and curve excluded.
// Inputs are hypothetical balances AT a cutoff, not latest balances or authenticated snapshots.
// Accounts are unique and grouped by pre-reconciled entitlement ID before rounding.
export function simulateCompensation({cutoff,allocations,rows}){
 slot(cutoff);
 shape(allocations,['supply','compensation','liquidity','game','treasury','other']);
 const S=raw(allocations.supply),C=raw(allocations.compensation);
 if(sum(['compensation','liquidity','game','treasury','other'].map(k=>raw(allocations[k])))!==S)fail('SUPPLY_MISMATCH');
 if(!Array.isArray(rows)||rows.length>100000)fail('INVALID_ROWS');
 const seen=new Set(),groups=new Map();
 let legacyTotal=0n;
 for(const row of rows){
  shape(row,['accountId','entitlementId','role','snapshotSlot','amountRaw']);
  const a=id(row.accountId),e=id(row.entitlementId),amount=raw(row.amountRaw,MAX_LEGACY);
  if(slot(row.snapshotSlot)!==cutoff)fail('SNAPSHOT_SLOT_MISMATCH');
  if(!roles.has(row.role))fail('UNRESOLVED_ROLE');
  if(seen.has(a))fail('DUPLICATE_ACCOUNT');seen.add(a);
  legacyTotal+=amount;if(legacyTotal>MAX_LEGACY)fail('LEGACY_TOTAL_OVERFLOW');
  const g=groups.get(e);
  if(g&&g.role!==row.role)fail('ROLE_CONFLICT');
  groups.set(e,{role:row.role,weight:(g?.weight??0n)+amount});
 }
 const eligible=[...groups].filter(([,g])=>g.role==='external'&&g.weight>0n).sort(([a],[b])=>a<b?-1:a>b?1:0);
 const E=sum(eligible.map(([,g])=>g.weight));
 const entitlements=eligible.map(([entitlementId,g])=>Object.freeze({entitlementId,weightRaw:g.weight.toString(),awardRaw:(C*g.weight/E).toString()}));
 const allocated=sum(entitlements.map(e=>raw(e.awardRaw)));
 if(allocated>C)fail('CAP_EXCEEDED');
 const plan=Object.freeze({status:'SYNTHETIC_ONLY_NO_GO',cutoff,supplyRaw:S.toString(),compensationRaw:C.toString(),eligibleWeightRaw:E.toString(),allocatedRaw:allocated.toString(),unallocatedRaw:(C-allocated).toString(),entitlements:Object.freeze(entitlements)});
 // Private state bound to this plan. Not a proof of identity, persistent ledger or onchain implementation.
 const awards=new Map(entitlements.map(e=>[e.entitlementId,raw(e.awardRaw)])),consumed=new Set();
 let paid=0n,burned=0n,closed=false;
 const state=()=>Object.freeze({paidRaw:paid.toString(),burnedRaw:burned.toString(),reserveRaw:(C-paid-burned).toString(),totalSupplyRaw:(S-burned).toString(),closed});
 function claim(entitlementId){
  if(closed)fail('CLOSED');id(entitlementId);
  if(!awards.has(entitlementId))fail('NOT_ELIGIBLE');
  if(consumed.has(entitlementId))fail('REPLAY');
  const amount=awards.get(entitlementId);
  if(amount===0n)fail('ZERO_AWARD');
  if(paid+amount>C)fail('CAP_EXCEEDED');
  consumed.add(entitlementId);paid+=amount;
  return Object.freeze({awardRaw:amount.toString(),...state()});
 }
 // Illustrative closure option only: burn the remaining compensation reserve once.
 // Production needs separate approved deadline, appeals, authority, and audited contract.
 function closeAndBurnReserve(){
  if(closed)fail('CLOSED');
  burned=C-paid;closed=true;return state();
 }
 return Object.freeze({plan,state,claim,closeAndBurnReserve});
}
