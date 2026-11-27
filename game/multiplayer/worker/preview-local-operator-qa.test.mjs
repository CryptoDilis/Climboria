import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTester,distinctTesters} from './preview-local-operator-qa.mjs';
const now=1700000000000,host='game-combat-preview.climboria.fun';
const token=payload=>'e30.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.fake';
function fixture(n=1){
 const id=n===1?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222';
 const email='tester'+n+'@example.test',exp=now/1000+600;
 const user={id,email,is_anonymous:false,app_metadata:{provider:'email'}};
 return {now,user,session:{user,access_token:token({sub:id,exp})},
  cookie:{name:'CF_Authorization',value:token({email,exp}),secure:true,domain:host,path:'/'}};
}
test('local sanity check requires matching fresh registered Game and Access identity',()=>{
 const f=fixture(),a=inspectTester(f),b=inspectTester(fixture(2));
 assert.ok(a);assert.ok(b);assert.equal(distinctTesters(a,b,now),true);
 assert.equal(distinctTesters(a,a,now),false);
 assert.equal(distinctTesters(a,b,now+500000),false);
 assert.equal(inspectTester({...f,user:{...f.user,is_anonymous:true}}),null);
 assert.equal(inspectTester({...f,cookie:{...f.cookie,value:fixture(2).cookie.value}}),null);
 assert.equal(inspectTester({...f,cookie:{...f.cookie,domain:'climboria.fun'}}),null);
 assert.equal(inspectTester({...f,cookie:{...f.cookie,secure:false}}),null);
 assert.equal(inspectTester({...f,cookie:{...f.cookie,path:'/other'}}),null);
 assert.equal(inspectTester({...f,now:now+500000}),null);
});
test('malformed or mismatched credentials fail closed, decoding is not auth',()=>{
 const f=fixture();
 assert.equal(inspectTester({...f,session:{...f.session,access_token:'bad'}}),null);
 assert.equal(inspectTester({...f,session:{...f.session,access_token:fixture(2).session.access_token}}),null);
 assert.equal(inspectTester({...f,cookie:{...f.cookie,value:'bad'}}),null);
 assert.equal(inspectTester(),null);
});
