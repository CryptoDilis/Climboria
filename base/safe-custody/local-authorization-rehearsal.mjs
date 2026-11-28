// Local mined authorization evidence, invoked only by the loopback Anvil rehearsal.
// No actual spending, LP funding, public RPC, real signers, or release authorization.
import assert from 'node:assert/strict';
import {deriveDirectSafeDigest} from './canonical-safe-envelope.mjs';
import {deriveTypedIntent,reconcileTypedIntent} from './typed-intent-reconciliation.mjs';
const ZERO='0x'+'0'.repeat(40);
const hex=n=>'0x'+BigInt(n).toString(16);
const h=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const signature='execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)';
const hashSig='getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)';
export async function verifyLocalAuthorizations(x){
 const {rpc,call,number,address,record,cast,calldata,creator,wallet,guard,token,quote,vaults,payee,signers}=x;
 assert.equal(BigInt(await rpc('eth_chainId')),84532n);
 const expenseVaults=vaults.slice(3,6).map(v=>v.address),liquidityVault=vaults[2].address;
 const pool=await address(liquidityVault,'pool()');
 const receipts=[];
 const before=await Promise.all(vaults.map(v=>number(token,'balanceOf(address)',v.address)));
 const startingNonce=await number(wallet,'nonce()');
 for(const [kind,index] of [['expense',3],['expense',4],['expense',5],['liquidity',2]]){
  const block=await rpc('eth_getBlockByNumber',['latest',false]),now=BigInt(block.timestamp);
  const nonce=await number(wallet,'nonce()'),epoch=await number(guard,'epoch()');
  assert.equal(epoch,1n);
  const salt=h(100+index),evidence=h(200+index),deadline=now+604800n;
  const sig=kind==='expense'?'proposeExpense(uint256,uint256,address,uint256,bytes32,uint256,bytes32,uint256,uint256)':'scheduleLiquidity(uint256,uint256,uint256,uint256,uint256,bytes32,uint256,uint256)';
  const args=kind==='expense'?[epoch,index,payee,10,evidence,0,salt,now,now+3600n]:[epoch,1000,500,50,deadline,salt,now,now+3600n];
  const data=calldata(sig,...args);
  const safeTxHash=await call(wallet,hashSig,guard,0,data,0,0,0,0,ZERO,ZERO,nonce);
  const sigs=signers.map(({key})=>cast('wallet','sign','--no-hash','--private-key',key,safeTxHash));
  for(const s of sigs)assert.match(s,/^0x[0-9a-f]{128}(1b|1c)$/i);
  const outer=calldata(signature,guard,0,data,0,0,0,0,ZERO,ZERO,'0x'+sigs.map(s=>s.slice(2)).join(''));
  const receipt=await record('authorization_'+kind+'_'+index,{from:creator,to:wallet,data:outer});
  const mined=await rpc('eth_getTransactionByHash',[receipt.transactionHash]);
  const anchor=await rpc('eth_getBlockByHash',[receipt.blockHash,false]);
  assert.equal(mined.input.toLowerCase(),outer.toLowerCase());assert.equal(mined.to.toLowerCase(),wallet);
  assert.equal(mined.hash,receipt.transactionHash);assert.equal(mined.blockHash,receipt.blockHash);
  assert.equal(anchor.hash,receipt.blockHash);assert.equal(anchor.number,receipt.blockNumber);
  const c={chainId:84532,blockNumber:anchor.number,blockHash:anchor.hash,timestamp:anchor.timestamp,transactionHash:receipt.transactionHash,safe:wallet,guard,safeTxHash,token,epoch:hex(epoch),expenseVaults,liquidityVault,quote,pool};
  assert.equal(mined.value,'0x0');
  const decoded=deriveDirectSafeDigest(mined.input.toLowerCase(),84532,wallet,hex(nonce));
  assert.equal(decoded.safeTxHash,safeTxHash);
  assert.equal(decoded.intent.data,data);
  const t=decoded.intent;
  const expected=deriveTypedIntent(c,t),matched=reconcileTypedIntent(c,t,receipt);
  assert.equal(matched.status,'RECEIPT_MATCH_ONLY_NO_GO');
  const read=kind==='expense'?'proposals(bytes32)':'actions(bytes32)';
  const state=await rpc('eth_call',[{to:expected.vault,data:calldata(read,expected.id)},anchor.number]);
  const ready=BigInt(expected.readyAt);
  const stateExpected=kind==='expense'?cast('abi-encode','f(address,uint256,bytes32,uint256,uint256,uint256,bool,bool)',payee,'10',evidence,'0',String(epoch),String(ready),'false','false'):cast('abi-encode','f(uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,address)','1000','500','50',String(epoch),String(ready),String(deadline),'false','false',ZERO);
  assert.equal(state.toLowerCase(),stateExpected.toLowerCase());
  // Keep the actual mined receipt, change only the independently expected intent.
  const altered={...t,data:calldata(sig,...args.map((v,i)=>i===(kind==='expense'?6:5)?h(999):v))};
  assert.throws(()=>reconcileTypedIntent(c,altered,receipt));
  assert.equal(await number(wallet,'nonce()'),nonce+1n);
  assert.equal(await number(guard,'transactionActive()'),0n);
  receipts.push({kind,index,...matched,blockNumber:anchor.number,readyAt:expected.readyAt,stateMatched:true,alteredIntentRejected:true,canonicalEnvelopeMatched:true,safeDigestMatched:true});
 }
 assert.equal(await number(wallet,'nonce()'),startingNonce+4n);
 assert.deepEqual(await Promise.all(vaults.map(v=>number(token,'balanceOf(address)',v.address))),before);
 assert.equal(await number(token,'balanceOf(address)',payee),0n);
 assert.equal(await number(token,'totalSupply()'),888888888000000n);
 assert.equal(await number(liquidityVault,'spent()'),0n);
 for(const v of expenseVaults)assert.equal(await number(v,'totalSpent()'),0n);
 return {status:'LOCAL_MINED_AUTHORIZATION_EVIDENCE_ONLY_NO_GO',chainId:84532,sourceSha:x.sourceSha,receipts,unchangedVaultBalances:true,unchangedSupply:true,noPayments:true,limitations:'Local Anvil, synthetic contracts, known disposable signer keys, independent canonical outer decoding and EIP-712 digest compared with local Safe, no external signature recovery, historical public-chain authentication or finality, no production authorization.'};
}
