const test=require('node:test');
const assert=require('node:assert/strict');
const {preflightDevnetRoute}=require('./devnet_route_preflight.cjs');
const base={owner:'ownerA',executor:'botA',grantId:'grantA',routerProgramId:'programA',routeSchemaHash:'hashA',cluster:'solana:devnet'};
function blocked(request,reviewedRoute,reason){
 const result=preflightDevnetRoute({request,reviewedRoute});
 assert.deepEqual(result,{status:'BLOCKED',reason,mayExecute:false});
}
test('no reviewed route blocks execution',()=>blocked(base,undefined,'MISSING_REVIEWED_ROUTE'));
test('matching devnet route still blocked without audited on-chain enforcement',()=>blocked(base,{...base},'ON_CHAIN_ENFORCEMENT_NOT_VERIFIED'));
test('missing router ID blocks',()=>blocked({...base,routerProgramId:''},{...base},'INCOMPLETE_ROUTE'));
test('missing schema hash blocks',()=>blocked({...base,routeSchemaHash:''},{...base},'INCOMPLETE_ROUTE'));
test('mainnet request blocks',()=>blocked({...base,cluster:'solana:mainnet-beta'},{...base},'NON_DEVNET'));
test('mainnet reviewed route blocks',()=>blocked(base,{...base,cluster:'solana:mainnet-beta'},'NON_DEVNET'));
test('router substitution blocks',()=>blocked({...base,routerProgramId:'attacker'},{...base},'ROUTE_MISMATCH'));
test('executor substitution blocks',()=>blocked({...base,executor:'attacker'},{...base},'ROUTE_MISMATCH'));
test('grant substitution blocks',()=>blocked({...base,grantId:'other'},{...base},'ROUTE_MISMATCH'));
test('owner substitution blocks',()=>blocked({...base,owner:'other'},{...base},'ROUTE_MISMATCH'));
test('schema substitution blocks',()=>blocked({...base,routeSchemaHash:'other'},{...base},'ROUTE_MISMATCH'));
test('array payload blocks',()=>blocked([],{...base},'MISSING_REVIEWED_ROUTE'));
