const test=require('node:test');
const assert=require('node:assert/strict');
const {authorizeBotExecution}=require('./execution_authorization_boundary.cjs');
const good={walletBinding:{status:'BOUND_CONFIRMED'},policySimulation:{allowed:true,simulationOnly:true,mayExecute:false},grantSimulation:{ok:true,simulationOnly:true,mayExecute:false},routePreflight:{status:'BLOCKED',mayExecute:false}};
test('all passing off-chain simulations still deny execution',()=>assert.deepEqual(authorizeBotExecution(good),{authorized:false,mayExecute:false,reason:'ON_CHAIN_AUTHORIZATION_NOT_IMPLEMENTED'}));
test('unverified wallet denied',()=>assert.equal(authorizeBotExecution({...good,walletBinding:{status:'UNAUTHORIZED'}}).reason,'WALLET_NOT_VERIFIED'));
test('policy denial blocks',()=>assert.equal(authorizeBotExecution({...good,policySimulation:{allowed:false}}).reason,'POLICY_NOT_SATISFIED'));
test('missing grant boundary blocks',()=>assert.equal(authorizeBotExecution({...good,grantSimulation:{ok:true}}).reason,'INVALID_SIMULATION_BOUNDARY'));
test('spoofed executable grant blocks',()=>assert.equal(authorizeBotExecution({...good,grantSimulation:{simulationOnly:true,mayExecute:true}}).reason,'INVALID_SIMULATION_BOUNDARY'));
test('spoofed executable route blocks',()=>assert.equal(authorizeBotExecution({...good,routePreflight:{mayExecute:true}}).reason,'INVALID_ROUTE_BOUNDARY'));
test('spoofed on-chain proof cannot enable execution',()=>assert.equal(authorizeBotExecution({...good,onChainProof:{verified:true,cluster:'mainnet',authorized:true}}).mayExecute,false));
test('missing arguments fail closed',()=>assert.equal(authorizeBotExecution().mayExecute,false));

test('legacy passing policy without boundary markers is denied',()=>assert.equal(authorizeBotExecution({...good,policySimulation:{allowed:true}}).reason,'INVALID_POLICY_BOUNDARY'));
test('spoofed executable policy is denied',()=>assert.equal(authorizeBotExecution({...good,policySimulation:{allowed:true,simulationOnly:true,mayExecute:true}}).reason,'INVALID_POLICY_BOUNDARY'));
