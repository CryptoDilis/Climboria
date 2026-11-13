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


test('failed grant simulation cannot pass grant boundary',()=>assert.equal(authorizeBotExecution({...good,grantSimulation:{ok:false,simulationOnly:true,mayExecute:false}}).reason,'INVALID_SIMULATION_BOUNDARY'));
test('missing grant success marker cannot pass grant boundary',()=>assert.equal(authorizeBotExecution({...good,grantSimulation:{simulationOnly:true,mayExecute:false}}).reason,'INVALID_SIMULATION_BOUNDARY'));
test('malformed primitive authorization inputs deny execution',()=>{
 for(const value of [null,false,0,'BOUND_CONFIRMED',[],42]){
  assert.equal(authorizeBotExecution({...good,walletBinding:value}).mayExecute,false);
  assert.equal(authorizeBotExecution({...good,policySimulation:value}).mayExecute,false);
  assert.equal(authorizeBotExecution({...good,grantSimulation:value}).mayExecute,false);
  assert.equal(authorizeBotExecution({...good,routePreflight:value}).mayExecute,false);
 }
});
test('spoofed on-chain proof with throwing getter remains untrusted',()=>{
 const onChainProof=Object.defineProperty({},'verified',{get(){throw Error('must never inspect caller proof')}});
 assert.deepEqual(authorizeBotExecution({...good,onChainProof}),{authorized:false,mayExecute:false,reason:'ON_CHAIN_AUTHORIZATION_NOT_IMPLEMENTED'});
});


test('authorization boundary does not mutate frozen input objects',()=>{
 const walletBinding=Object.freeze({status:'BOUND_CONFIRMED'});
 const policySimulation=Object.freeze({allowed:true,simulationOnly:true,mayExecute:false});
 const grantSimulation=Object.freeze({ok:true,simulationOnly:true,mayExecute:false});
 const routePreflight=Object.freeze({status:'BLOCKED',mayExecute:false});
 const onChainProof=Object.freeze({verified:true,authorized:true});
 const input=Object.freeze({walletBinding,policySimulation,grantSimulation,routePreflight,onChainProof});
 assert.deepEqual(authorizeBotExecution(input),{authorized:false,mayExecute:false,reason:'ON_CHAIN_AUTHORIZATION_NOT_IMPLEMENTED'});
 assert.deepEqual(input,{walletBinding,policySimulation,grantSimulation,routePreflight,onChainProof});
});
test('authorization boundary does not invoke input setters',()=>{
 let writes=0;
 const guarded=new Proxy({status:'BOUND_CONFIRMED'}, {set(){writes++;throw Error('unexpected mutation')}});
 const result=authorizeBotExecution({...good,walletBinding:guarded});
 assert.equal(result.mayExecute,false);
 assert.equal(writes,0);
});
test('caller-supplied proof getter is never read',()=>{
 let reads=0;
 const proof=Object.defineProperty({},'authorized',{get(){reads++;throw Error('should not be read')}});
 assert.equal(authorizeBotExecution({...good,onChainProof:proof}).reason,'ON_CHAIN_AUTHORIZATION_NOT_IMPLEMENTED');
 assert.equal(reads,0);
});
test('repeated authorization requests never advance a grant sequence',()=>{
 const grantSimulation={ok:true,simulationOnly:true,mayExecute:false,sequence:7,spent:0};
 const input={...good,grantSimulation};
 for(let i=0;i<5;i++)assert.equal(authorizeBotExecution(input).mayExecute,false);
 assert.equal(grantSimulation.sequence,7);
 assert.equal(grantSimulation.spent,0);
});


test('policy and grant simulation objects remain unchanged across repeated denials',()=>{
 const policySimulation=Object.freeze({allowed:true,simulationOnly:true,mayExecute:false,reason:'POLICY_SIMULATION_ONLY'});
 const grantSimulation=Object.freeze({ok:true,simulationOnly:true,mayExecute:false,reason:'SIMULATION_ONLY_NO_EXECUTION',lastSequence:9,spent:50});
 const input={...good,policySimulation,grantSimulation};
 for(let i=0;i<10;i++)assert.deepEqual(authorizeBotExecution(input),{authorized:false,mayExecute:false,reason:'ON_CHAIN_AUTHORIZATION_NOT_IMPLEMENTED'});
 assert.equal(grantSimulation.lastSequence,9);
 assert.equal(grantSimulation.spent,50);
 assert.equal(policySimulation.allowed,true);
});
test('grant simulation failure is denied without reading later route input',()=>{
 let routeReads=0;
 const routePreflight=Object.defineProperty({},'mayExecute',{get(){routeReads++;throw Error('must not read route')}});
 const result=authorizeBotExecution({...good,grantSimulation:{ok:false,simulationOnly:true,mayExecute:false},routePreflight});
 assert.equal(result.reason,'INVALID_SIMULATION_BOUNDARY');
 assert.equal(routeReads,0);
});
test('policy simulation failure is denied without reading later grant input',()=>{
 let grantReads=0;
 const grantSimulation=Object.defineProperty({},'ok',{get(){grantReads++;throw Error('must not read grant')}});
 const result=authorizeBotExecution({...good,policySimulation:{allowed:false},grantSimulation});
 assert.equal(result.reason,'POLICY_NOT_SATISFIED');
 assert.equal(grantReads,0);
});
test('grant simulation result with executable true is rejected even when ok true',()=>{
 const grantSimulation={ok:true,simulationOnly:true,mayExecute:true};
 assert.deepEqual(authorizeBotExecution({...good,grantSimulation}),{authorized:false,mayExecute:false,reason:'INVALID_SIMULATION_BOUNDARY'});
});
