const test=require('node:test');
const assert=require('node:assert/strict');
const {createGrant,revokeGrant,evaluateOrder}=require('./devnet_grant_state_simulation.cjs');
const t=1700000000;
const config=()=>({owner:'walletA',executor:'botA',nonce:'unique1',issuedAt:t,expiresAt:t+86400,allowedMints:['SOL','USDC'],maxPerTrade:100,maxCumulative:250});
function grant(){const result=createGrant(config());assert.equal(result.ok,true);return result.grant;}
function order(){return {executor:'botA',mint:'SOL',amount:50,sequence:1,now:t+10,positionOpen:false};}
test('grant creation is simulation only',()=>{const g=grant();assert.equal(g.revoked,false);assert.equal(g.spent,0);});
test('rejects >24h grant',()=>assert.equal(createGrant({...config(),expiresAt:t+86401}).reason,'INVALID_EXPIRY'));
test('rejects duplicate mints',()=>assert.equal(createGrant({...config(),allowedMints:['SOL','SOL']}).reason,'INVALID_MINTS'));
test('rejects sixth mint',()=>assert.equal(createGrant({...config(),allowedMints:['A','B','C','D','E','F']}).reason,'INVALID_MINTS'));
test('rejects missing owner',()=>assert.equal(createGrant({...config(),owner:''}).reason,'INVALID_IDENTITY'));
test('rejects zero cap',()=>assert.equal(createGrant({...config(),maxPerTrade:0}).reason,'INVALID_CAPS'));
test('owner can revoke in simulation',()=>assert.equal(revokeGrant(grant(),{owner:'walletA'}).grant.revoked,true));
test('other wallet cannot revoke',()=>assert.equal(revokeGrant(grant(),{owner:'attacker'}).reason,'UNAUTHORIZED_REVOKE'));
test('revoked grant blocks order',()=>assert.equal(evaluateOrder(revokeGrant(grant(),{owner:'walletA'}).grant,order()).reason,'REVOKED_OR_UNKNOWN'));
test('executor mismatch blocks',()=>assert.equal(evaluateOrder(grant(),{...order(),executor:'attacker'}).reason,'EXECUTOR_MISMATCH'));
test('expiry blocks',()=>assert.equal(evaluateOrder(grant(),{...order(),now:t+86400}).reason,'OUTSIDE_GRANT'));
test('last 30 minutes blocks new entry',()=>assert.equal(evaluateOrder(grant(),{...order(),now:t+86400-1800}).reason,'ENTRY_CUTOFF'));
test('wrong mint blocks',()=>assert.equal(evaluateOrder(grant(),{...order(),mint:'BTC'}).reason,'MINT_NOT_ALLOWED'));
test('unknown position blocks',()=>assert.equal(evaluateOrder(grant(),{...order(),positionOpen:undefined}).reason,'SLOT_OCCUPIED_OR_UNKNOWN'));
test('replay sequence blocks',()=>assert.equal(evaluateOrder(grant(),{...order(),sequence:0}).reason,'REPLAY_OR_SEQUENCE'));
test('per-trade cap blocks',()=>assert.equal(evaluateOrder(grant(),{...order(),amount:101}).reason,'CAP_EXCEEDED'));
test('cumulative cap blocks',()=>{const g=grant();g.spent=220;assert.equal(evaluateOrder(g,order()).reason,'CAP_EXCEEDED')});
test('valid order is only simulation, no execution',()=>assert.deepEqual(evaluateOrder(grant(),order()),{ok:true,simulationOnly:true,mayExecute:false,reason:'SIMULATION_ONLY_NO_EXECUTION'}));


test('array grant cannot revoke',()=>assert.equal(revokeGrant([],{owner:'walletA'}).reason,'UNAUTHORIZED_REVOKE'));
test('array grant cannot authorize',()=>assert.equal(evaluateOrder([],order()).reason,'REVOKED_OR_UNKNOWN'));
test('missing nonce blocks order',()=>{const g=grant();delete g.nonce;assert.equal(evaluateOrder(g,order()).reason,'INVALID_GRANT')});
test('missing owner blocks order',()=>{const g=grant();delete g.owner;assert.equal(evaluateOrder(g,order()).reason,'INVALID_GRANT')});
test('duplicate allowed mints in persisted state block order',()=>{const g=grant();g.allowedMints=['SOL','SOL'];assert.equal(evaluateOrder(g,order()).reason,'INVALID_GRANT')});
test('sixth persisted mint blocks order',()=>{const g=grant();g.allowedMints=['A','B','C','D','E','SOL'];assert.equal(evaluateOrder(g,order()).reason,'INVALID_GRANT')});
test('invalid persisted expiry blocks order',()=>{const g=grant();g.expiresAt=g.issuedAt+86401;assert.equal(evaluateOrder(g,order()).reason,'INVALID_GRANT')});
test('negative persisted sequence blocks order',()=>{const g=grant();g.lastSequence=-1;assert.equal(evaluateOrder(g,order()).reason,'INVALID_GRANT')});
test('repeated order sequence is not consumed by pure simulation',()=>{const g=grant();assert.equal(evaluateOrder(g,order()).ok,true);assert.equal(evaluateOrder(g,order()).ok,true);assert.equal(g.lastSequence,0);assert.equal(g.spent,0);});
test('same nonce can be created twice: uniqueness requires on-chain account constraint',()=>{const a=createGrant(config());const b=createGrant(config());assert.equal(a.ok,true);assert.equal(b.ok,true);});

test('grant creation success cannot authorize execution',()=>{const result=createGrant(config());assert.equal(result.ok,true);assert.equal(result.simulationOnly,true);assert.equal(result.mayExecute,false)});
test('revoke simulation success cannot authorize execution',()=>{const result=revokeGrant(grant(),{owner:'walletA'});assert.equal(result.ok,true);assert.equal(result.simulationOnly,true);assert.equal(result.mayExecute,false)});
test('order simulation success cannot authorize execution',()=>{const result=evaluateOrder(grant(),order());assert.equal(result.ok,true);assert.equal(result.simulationOnly,true);assert.equal(result.mayExecute,false)});
