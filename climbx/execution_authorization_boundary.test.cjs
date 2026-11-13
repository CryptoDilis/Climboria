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


test('throwing wallet status getter fails closed',()=>{
 const walletBinding=Object.defineProperty({},'status',{get(){throw Error('hostile wallet input')}});
 assert.deepEqual(authorizeBotExecution({...good,walletBinding}),{authorized:false,mayExecute:false,reason:'INVALID_AUTHORIZATION_INPUT'});
});
test('throwing policy flag getter fails closed',()=>{
 const policySimulation=Object.defineProperty({allowed:true},'simulationOnly',{get(){throw Error('hostile policy input')}});
 assert.deepEqual(authorizeBotExecution({...good,policySimulation}),{authorized:false,mayExecute:false,reason:'INVALID_AUTHORIZATION_INPUT'});
});
test('throwing route flag getter fails closed',()=>{
 const routePreflight=Object.defineProperty({},'mayExecute',{get(){throw Error('hostile route input')}});
 assert.deepEqual(authorizeBotExecution({...good,routePreflight}),{authorized:false,mayExecute:false,reason:'INVALID_AUTHORIZATION_INPUT'});
});
test('hostile proxy fails closed without propagating exception',()=>{
 const walletBinding=new Proxy({}, {get(){throw Error('proxy access denied')}});
 assert.equal(authorizeBotExecution({...good,walletBinding}).mayExecute,false);
});
