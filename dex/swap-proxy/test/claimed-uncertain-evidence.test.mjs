import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pendingClaimedSwapEvidence} from "../src/claimed-uncertain-evidence.mjs";
import {makeFixture} from "./solana-v0-fixture.mjs";
import {encodeBase58} from "../src/transaction-validation.mjs";

const fixture=makeFixture(1);
const claimedSignature=encodeBase58(fixture.takerSignature);
const reasons=[
  "INVALID_STORED_HEIGHT",
  "PROVIDER_TRANSPORT_UNKNOWN",
  "PROVIDER_HTTP_UNKNOWN",
  "PROVIDER_RESULT_UNKNOWN",
  "DURABLE_OUTCOME_UNKNOWN"
];

test("every ambiguous post-claim Jupiter outcome exposes ONLY verified signed first-signature and never says safe to retry",()=>{
  for(const reason of reasons){
    for(const settlementRecorded of [true,false]){
      const result=pendingClaimedSwapEvidence({claimedSignature,reason,settlementRecorded});
      assert.deepEqual(Object.keys(result).sort(),[
        "confirmation","message","reason","replayAllowed","settledOnChain",
        "settlementRecorded","signature","status"
      ].sort());
      assert.equal(result.status,"PendingConfirmation");
      assert.equal(result.confirmation,"unverified");
      assert.equal(result.settledOnChain,false);
      assert.equal(result.signature,claimedSignature);
      assert.equal(result.replayAllowed,false);
      assert.equal(result.settlementRecorded,settlementRecorded);
      assert.ok(result.message.includes("Verify")||result.message.includes("Check"));
      assert.equal(result.completed,undefined);
      assert.equal(result.failed,undefined);
      assert.equal(Object.isFrozen(result),true);
      assert.doesNotMatch(JSON.stringify(result),/PRIVATE_API_KEY|JUPITER_API_KEY|signedTransaction|lastValidBlockHeight/i);
    }
  }
});

test("missing, invalid or fabricated claimed signatures cannot produce a trusted uncertainty receipt",()=>{
  for(const invalid of [undefined,null,"",123,{},[],claimedSignature.slice(0,40),"0".repeat(88),"bad-123"]){
    assert.throws(()=>pendingClaimedSwapEvidence({
      claimedSignature:invalid,reason:"PROVIDER_TRANSPORT_UNKNOWN"
    }),/Invalid authenticated claimed-order uncertainty evidence/);
  }
});

test("caller-controlled reason, status and settlement-recording flags are not accepted",()=>{
  for(const reason of [null,undefined,"","completed","retry","FAILED","__proto__","toString","PROVIDER_HTTP_UNKNOWN\nsecret"]){
    assert.throws(()=>pendingClaimedSwapEvidence({claimedSignature,reason}),/Invalid authenticated/);
  }
  for(const settlementRecorded of [null,undefined,"true",1,[],{}]){
    if(settlementRecorded===undefined)continue;
    assert.throws(()=>pendingClaimedSwapEvidence({
      claimedSignature,reason:"PROVIDER_HTTP_UNKNOWN",settlementRecorded
    }),/Invalid authenticated/);
  }
});

test("public Worker can produce pending evidence ONLY after a successful DO claim; keeps signing/trading gated",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  const wrangler=readFileSync(new URL("../wrangler.toml",import.meta.url),"utf8");
  const front=readFileSync(new URL("../../../swap-config.js",import.meta.url),"utf8");
  const claimIndex=worker.indexOf("if (!claimResponse.ok || claim?.ok !== true");
  const firstPending=worker.indexOf("return json(pendingClaimedSwapEvidence({");
  assert.ok(claimIndex>0&&firstPending>claimIndex);
  for(const reason of reasons){
    assert.match(worker,new RegExp('reason:"'+reason+'"'));
  }
  // Exact helper's signature comes exclusively from the post-verification
  // Durable Object claim, NEVER the Jupiter provider or browser payload.
  const uses=worker.match(/claimedSignature:claim\.record\.claimedSignature/g)||[];
  assert.equal(uses.length,reasons.length);
  assert.doesNotMatch(worker,/claimedSignature:data\.signature|claimedSignature:body\.signature/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(wrangler,/EXECUTION_ENABLED = "false"/);
  assert.match(front,/enabled:\s*false/);
  assert.doesNotMatch(worker,/settledOnChain:\s*true/);
});

test("unknown outcome no longer generates an HTTP error class that can invite automatic trade retry",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  const postClaim=worker.slice(worker.indexOf("const payload = { signedTransaction"));
  for(const reason of reasons){
    const branch=postClaim.indexOf('reason:"'+reason+'"');
    assert.ok(branch>0,"reason="+reason);
    const ending=postClaim.slice(branch,branch+220);
    assert.match(ending,/\}\),202\);/);
  }
  assert.match(postClaim,/const settlementRecorded = await settle\("uncertain"\)/);
  assert.match(postClaim,/return json\(\{\s*status: outcome\.userStatus/);
});
