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
test('valid order is only simulation, no execution',()=>assert.deepEqual(evaluateOrder(grant(),order()),{ok:true,reason:'SIMULATION_ONLY_NO_EXECUTION'}));
