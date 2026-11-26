// OFFLINE MODEL ONLY. No chain access, signing, attestation or production authorization.
const MAX=(1n<<64n)-1n;
const fail=m=>{throw new Error('NO_GO: '+m);};
function raw(s){if(typeof s!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(s))fail('invalid raw amount');const n=BigInt(s);if(n>MAX)fail('raw overflow');return n;}
function positive(s){const n=raw(s);if(n===0n)fail('zero amount');return n;}
function id(s){if(typeof s!=='string'||!/^[a-zA-Z0-9:_-]{1,120}$/.test(s))fail('invalid fixture id');return s;}
const MOCK='OFFLINE_FIXTURE_NOT_CHAIN_PROOF';
export const TEST_ONLY_EVIDENCE=MOCK;
function fixture(e){if(e!==MOCK)fail('test fixture required');}
// Proposal only: 10% of collected CLIMB fees to burn, 5% to game.
// Cumulative rounding avoids repeated micro-fee rounding loss. Never use gross volume.
export function feeAllocation(collectedRaw){
  const collected=raw(collectedRaw),burn=collected*1000n/10000n,game=collected*500n/10000n;
  return Object.freeze({collectedRaw:collected.toString(),burnRaw:burn.toString(),gameRaw:game.toString(),otherRaw:(collected-burn-game).toString()});
}
export class FeeModel {
  #total=0n;#burned=0n;#seen=new Set();
  collect(eventId,netCollectedRaw,evidence){
    fixture(evidence);const key=id(eventId),n=positive(netCollectedRaw);
    if(this.#seen.has(key))fail('duplicate collection');
    if(this.#total+n>MAX)fail('collection overflow');
    this.#seen.add(key);this.#total+=n;return this.snapshot();
  }
  burn(eventId,amountRaw,evidence){
    fixture(evidence);const key=id(eventId),n=positive(amountRaw);
    if(this.#seen.has(key))fail('duplicate event');
    const allocated=BigInt(feeAllocation(this.#total.toString()).burnRaw);
    if(n>allocated-this.#burned)fail('exceeds allocated fee burn');
    this.#seen.add(key);this.#burned+=n;return this.snapshot();
  }
  snapshot(){const a=feeAllocation(this.#total.toString());return {...a,executedBurnRaw:this.#burned.toString(),pendingBurnRaw:(BigInt(a.burnRaw)-this.#burned).toString(),status:'OFFLINE_ONLY'};}
}
// Burn-based retirement only. No lock proof or holder eligibility validation.
// The cap and opening supply are hypothetical; proof IDs are synthetic.
export class MigrationModel {
  #opening;#cap;#retired=0n;#issued=0n;#burned=0n;#closed=false;#proofs=new Map();#burnIds=new Set();
  constructor(openingRaw,capRaw){this.#opening=positive(openingRaw);this.#cap=positive(capRaw);if(this.#cap>this.#opening)fail('cap exceeds opening supply');}
  retire(proofId,amountRaw,destination,evidence){
    fixture(evidence);const key=id(proofId),n=positive(amountRaw);
    if(this.#closed||this.#proofs.has(key))fail('closed or duplicate retirement');
    if(typeof destination!=='string'||!/^0x[0-9a-f]{40}$/.test(destination)||/^0x0{40}$/.test(destination))fail('invalid fixture destination');
    if(this.#retired+n>this.#cap)fail('retirement exceeds cap');
    this.#proofs.set(key,{n,destination,claimed:false});this.#retired+=n;return this.snapshot();
  }
  claim(proofId,destination,evidence){
    fixture(evidence);const p=this.#proofs.get(id(proofId));
    if(this.#closed||!p||p.claimed||p.destination!==destination)fail('invalid claim');
    if(this.#issued+p.n>this.#cap||this.#issued+p.n>this.#retired)fail('unbacked issuance');
    p.claimed=true;this.#issued+=p.n;return this.snapshot();
  }
  economicBurn(eventId,amountRaw,evidence){
    fixture(evidence);const key=id(eventId),n=positive(amountRaw);
    if(this.#burnIds.has(key)||n>this.#issued-this.#burned)fail('duplicate or excess economic burn');
    this.#burnIds.add(key);this.#burned+=n;return this.snapshot();
  }
  close(){if(this.#issued!==this.#retired)fail('unsettled retirement');this.#closed=true;return this.snapshot();}
  snapshot(){
    const legacy=this.#opening-this.#retired,base=this.#issued-this.#burned;
    return {openingRaw:this.#opening.toString(),retiredRaw:this.#retired.toString(),cumulativeIssuedRaw:this.#issued.toString(),economicBurnedRaw:this.#burned.toString(),baseSupplyRaw:base.toString(),legacySupplyRaw:legacy.toString(),combinedSupplyRaw:(legacy+base).toString(),pendingClaimsRaw:(this.#retired-this.#issued).toString(),remainingIssuanceCapacityRaw:(this.#closed?0n:this.#cap-this.#issued).toString(),closed:this.#closed,status:'OFFLINE_ONLY_NO_GO'};
  }
}
