// Local-only synthetic LP release boundary. No production custody or liquidity.
// A repeated release is permitted by the fixture but transfers zero shares.
import assert from 'node:assert/strict';
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const aw=a=>'0x'+a.slice(2).padStart(64,'0');
export async function verifyLocalLPRelease(x,lock){
 const {rpc,call,number,address,record,cast,calldata,creator,wallet,guard,token,quote,lp,vaults,contracts,sourceSha}=x;
 assert.match(await rpc('web3_clientVersion'),/anvil/i);
 assert.equal(BigInt(await rpc('eth_chainId')),84532n);
 assert.equal(lock.status,'LOCAL_SYNTHETIC_LIQUIDITY_LOCK_ONLY_NO_GO');assert.equal(lock.sourceSha,sourceSha);
 assert.equal(lock.releaseAuthorized,false);assert.equal(lock.publicLiquidity,false);
 const locker=lock.locker,pool=await address(locker,'lp()'),unlock=BigInt(lock.unlockAt),shares=BigInt(lock.sharesRaw);
 assert.equal(await address(locker,'custody()'),lp);assert.equal(await number(locker,'unlockAt()'),unlock);
 const custodyCode=await rpc('eth_getCode',[lp,'latest']);
 assert.equal(cast('keccak',custodyCode),contracts.syntheticLPDestination.runtimeKeccak256);
 const balance=(t,a)=>number(t,'balanceOf(address)',a);
 const before=[await balance(pool,locker),await balance(pool,lp),await balance(pool,creator),await number(pool,'totalSupply()')];
 assert.equal(before[0],shares);assert.equal(before[1],0n);assert.equal(before[2],0n);
 const vaultBefore=await Promise.all(vaults.map(v=>balance(token,v.address)));
 const poolBefore=[await balance(token,pool),await balance(quote,pool)];
 const nonce=await number(wallet,'nonce()'),epoch=await number(guard,'epoch()');
 const data=calldata('release()');
 const reject=()=>assert.rejects(rpc('eth_call',[{from:creator,to:locker,data},'latest']));
 assert.ok(BigInt((await rpc('eth_getBlockByNumber',['latest',false])).timestamp)<unlock-1n);
 await rpc('evm_setNextBlockTimestamp',[Number(unlock-1n)]);await rpc('evm_mine',[]);
 const beforeBoundary=await rpc('eth_getBlockByNumber',['latest',false]);
 assert.equal(BigInt(beforeBoundary.timestamp),unlock-1n);await reject();
 assert.equal(await balance(pool,locker),shares);
 // Mine the release at the exact first permitted second, not after an arbitrary delay.
 await rpc('evm_setNextBlockTimestamp',[Number(unlock)]);
 const r=await record('local_synthetic_lp_release_at_boundary',{from:creator,to:locker,data});
 const block=await rpc('eth_getBlockByHash',[r.blockHash,false]),tx=await rpc('eth_getTransactionByHash',[r.transactionHash]);
 assert.equal(BigInt(block.timestamp),unlock);assert.equal(block.parentHash,beforeBoundary.hash);
 assert.equal(block.hash,r.blockHash);assert.equal(block.number,r.blockNumber);assert.deepEqual(block.transactions,[r.transactionHash]);
 assert.equal(tx.input,data);assert.equal(tx.to,locker);assert.equal(tx.from,creator);assert.equal(tx.blockHash,block.hash);
 const topic=cast('keccak','0x'+Buffer.from('Transfer(address,address,uint256)').toString('hex'));
 function match(receipt,amount){
  assert.equal(receipt.status,'0x1');assert.equal(receipt.to,locker);assert.equal(receipt.logs.length,1);
  const l=receipt.logs[0];
  assert.equal(l.address,pool);assert.deepEqual(l.topics,[topic,aw(locker),aw(lp)]);assert.equal(l.data,word(amount));
  assert.equal(l.removed,false);assert.equal(l.blockHash,receipt.blockHash);assert.equal(l.blockNumber,receipt.blockNumber);assert.equal(l.transactionHash,receipt.transactionHash);
 }
 match(r,shares);
 const changes=[z=>z.logs[0].topics[2]=aw(creator),z=>z.logs[0].data=word(shares+1n),z=>z.logs[0].removed=true,z=>z.logs.pop()];
 for(const change of changes){const altered=structuredClone(r);change(altered);assert.throws(()=>match(altered,shares));}
 assert.deepEqual(await Promise.all([balance(pool,locker),balance(pool,lp),balance(pool,creator),number(pool,'totalSupply()')]),[0n,shares,0n,before[3]]);
 const repeat=await record('local_synthetic_lp_repeat_zero_transfer',{from:creator,to:locker,data});match(repeat,0n);
 assert.deepEqual(await Promise.all([balance(pool,locker),balance(pool,lp),balance(pool,creator),number(pool,'totalSupply()')]),[0n,shares,0n,before[3]]);
 assert.deepEqual(await Promise.all(vaults.map(v=>balance(token,v.address))),vaultBefore);
 assert.deepEqual([await balance(token,pool),await balance(quote,pool)],poolBefore);
 assert.equal(await number(token,'totalSupply()'),888888888000000n);
 assert.equal(await number(wallet,'nonce()'),nonce);assert.equal(await number(guard,'epoch()'),epoch);
 return {status:'LOCAL_SYNTHETIC_LP_RELEASE_BOUNDARY_ONLY_NO_GO',sourceSha,chainId:84532,locker,pool,custody:lp,unlockAt:String(unlock),rejectedAt:String(unlock-1n),releasedAt:String(BigInt(block.timestamp)),releaseTransactionHash:r.transactionHash,repeatTransactionHash:repeat.transactionHash,sharesRaw:String(shares),earlyBoundaryRejected:true,exactBoundaryReleased:true,fixedDestinationMatched:true,repeatZeroTransfer:true,alteredReceiptRejections:changes.length,unchangedPoolBacking:true,unchangedSupply:true,publicLiquidity:false,releaseAuthorized:false};
}
