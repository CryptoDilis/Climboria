// Local-only mined deployment rehearsal. No external RPC, private keys, or network broadcast.
import assert from 'node:assert/strict';
import {verifyRuntime} from './verify-runtime-template.mjs';
import {verifyLocalAuthorizations} from './local-authorization-rehearsal.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
const URL='http://127.0.0.1:18545';
const CHAIN=84532n, LIMIT=30_000_000n, SUPPLY=888_888_888_000_000n;
const ZERO='0x'+'0'.repeat(40);
const amounts=[17_777_777_760_000n,311_111_110_800_000n,222_222_222_000_000n,133_333_333_200_000n,88_888_888_800_000n,106_666_666_560_000n,8_888_888_880_000n];
assert.equal(amounts.reduce((a,b)=>a+b,0n),SUPPLY);
const cast=(...args)=>execFileSync('cast',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const calldata=(sig,...args)=>cast('calldata',sig,...args.map(String));
const norm=a=>a.toLowerCase();
const wordAddress=x=>'0x'+x.slice(-40).toLowerCase();
const hex=n=>'0x'+BigInt(n).toString(16);
const steps=[],contracts={};
let nextId=0;
async function rpc(method,params=[]){
 const response=await fetch(URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++nextId,method,params}),signal:AbortSignal.timeout(10000)});
 assert.equal(response.ok,true);
 const result=await response.json();
 if(result.error)throw Error(method+': '+JSON.stringify(result.error));
 return result.result;
}
async function call(to,sig,...args){return rpc('eth_call',[{to,data:calldata(sig,...args)},'latest']);}
async function number(to,sig,...args){return BigInt(await call(to,sig,...args));}
async function address(to,sig,...args){return wordAddress(await call(to,sig,...args));}
async function requireCode(a){
 const code=await rpc('eth_getCode',[a,'latest']);assert.notEqual(code,'0x');
 return {address:a,runtimeBytes:(code.length-2)/2,runtimeKeccak256:cast('keccak',code)};
}
async function record(name,tx){
 const hash=await rpc('eth_sendTransaction',[{...tx,gas:hex(LIMIT)}]);
 let receipt;
 for(let i=0;i<50;i++){receipt=await rpc('eth_getTransactionReceipt',[hash]);if(receipt)break;await sleep(100);}
 assert.ok(receipt,name+' receipt missing');assert.equal(receipt.status,'0x1',name+' failed');
 const block=await rpc('eth_getBlockByHash',[receipt.blockHash,false]);
 assert.equal(BigInt(block.gasLimit),LIMIT);
 assert.ok(BigInt(receipt.gasUsed)<LIMIT,name+' exceeds local gas limit');
 steps.push({name,txHash:hash,blockNumber:Number(BigInt(receipt.blockNumber)),gasUsed:Number(BigInt(receipt.gasUsed)),status:'success'});
 return receipt;
}
async function deploy(name,file,contract,from,args='0x'){
 const a=JSON.parse(readFileSync('out/'+file+'/'+contract+'.json','utf8'));
 const code=a.bytecode.object;assert.match(code,/^0x[0-9a-f]+$/i);assert.match(args,/^0x[0-9a-f]*$/i);
 const data=code+args.slice(2);assert.ok((data.length-2)/2<=49152);
 const r=await record(name,{from,data});const dest=norm(r.contractAddress);
 const mined=await rpc('eth_getTransactionByHash',[r.transactionHash]);
 assert.equal(norm(mined.input),norm(data));assert.equal(norm(mined.from),norm(from));assert.equal(mined.to,null);
 contracts[name]=await requireCode(dest);return dest;
}
async function rejectCall(name,from,to,data){
 await assert.rejects(rpc('eth_call',[{from,to,data,gas:hex(LIMIT)},'latest']),/eth_call:/);
 return name;
}
const anvil=spawn('anvil',['--host','127.0.0.1','--port','18545','--chain-id','84532','--hardfork','cancun','--gas-limit',String(LIMIT),'--accounts','10','--silent'],{stdio:['ignore','ignore','inherit']});
try{
 let ready=false;
 for(let i=0;i<100;i++){if(anvil.exitCode!==null)throw Error('Anvil exited');try{await rpc('eth_chainId');ready=true;break;}catch{await sleep(100);}}
 assert.ok(ready,'local Anvil not available');
 assert.match(await rpc('web3_clientVersion'),/anvil/i);assert.equal(BigInt(await rpc('eth_chainId')),CHAIN);
 assert.equal(BigInt(await rpc('eth_blockNumber')),0n);
 const accounts=(await rpc('eth_accounts')).map(norm);assert.ok(accounts.length>=9);
 const [creator,...rest]=accounts,founder=rest[5],distributor=rest[6],payee=rest[7];
 // Public, deterministic disposable test keys; never funded or used outside this loopback rehearsal.
 const signerKeys=[0x12345n,0x23456n,0x34567n].map(n=>'0x'+n.toString(16).padStart(64,'0'));
 const signers=signerKeys.map(key=>({key,address:norm(cast('wallet','address','--private-key',key))})).sort((a,b)=>a.address.localeCompare(b.address));
 const owners=[...signers.map(x=>x.address),rest[3],rest[4]];
 assert.equal(new Set([creator,...owners,founder,distributor,payee]).size,9);
 const setup=await deploy('setupFactory','SafeQuorumIssuanceFixture.sol','SafeQuorumReserveFactoryFixture',creator);
 const singleton=await address(setup,'singleton()'),bootstrap=await address(setup,'bootstrap()'),guardDeployer=await address(setup,'guardDeployer()');
 assert.equal(new Set([setup,singleton,bootstrap,guardDeployer]).size,4);
 const verify=async(file,name,at,imm=[])=>verifyRuntime(JSON.parse(readFileSync('out/'+file+'/'+name+'.json','utf8')),await rpc('eth_getCode',[at,'latest']),imm);
 const factoryProvenance={setup:await verify('SafeQuorumIssuanceFixture.sol','SafeQuorumReserveFactoryFixture',setup,[singleton,bootstrap,guardDeployer]),singleton:await verify('Safe.sol','Safe',singleton),bootstrap:await verify('SafeEpochGuardFixture.sol','SafeGuardBootstrapFixture',bootstrap),singletonAddress:singleton,bootstrapAddress:bootstrap};
 assert.equal(await address(guardDeployer,'factory()'),setup);
 const guardDeployerCode=await requireCode(guardDeployer);
 contracts.guardDeployer=guardDeployerCode;
 contracts.bootstrap=await requireCode(bootstrap);
 assert.equal(await call(setup,'guardDeployerHash()'),guardDeployerCode.runtimeKeccak256);
 factoryProvenance.guardDeployer={...guardDeployerCode,...await verify('SafeQuorumIssuanceFixture.sol','SafeQuorumGuardDeployerFixture',guardDeployer,[setup])};
 const helper=await deploy('conditionalHelper','V3AtomicSuccessorFixture.sol','V3SuccessorConditionalDeployer',creator);
 const legacyDeployer=await address(helper,'legacyDeployer()');
 assert.notEqual(legacyDeployer,helper);
 assert.equal(await address(legacyDeployer,'factory()'),helper);
 const legacyDeployerCode=await requireCode(legacyDeployer);
 contracts.legacyDeployer=legacyDeployerCode;
 assert.equal(await call(helper,'legacyDeployerHash()'),legacyDeployerCode.runtimeKeccak256);
 factoryProvenance.legacyDeployer={...legacyDeployerCode,...await verify('V3AtomicSuccessorFixture.sol','V3SuccessorLegacyDeployer',legacyDeployer,[helper])};
 factoryProvenance.conditionalHelper=await verify('V3AtomicSuccessorFixture.sol','V3SuccessorConditionalDeployer',helper,[legacyDeployer]);
 const helperHash=contracts.conditionalHelper.runtimeKeccak256;
 const successor=await deploy('successorFactory','SafeQuorumIssuanceFixture.sol','V3QuorumSuccessorFixture',creator,cast('abi-encode','f(address,address,bytes32)',setup,helper,helperHash));
 assert.equal(await address(successor,'conditional()'),helper);
 assert.equal(await call(successor,'conditionalHash()'),helperHash);
 const core=await address(successor,'core()');
 contracts.coreDeployer=await requireCode(core);
 factoryProvenance.coreDeployer={...contracts.coreDeployer,...await verify('V3AtomicSuccessorFixture.sol','V3SuccessorCoreDeployer',core)};
 assert.equal(await address(successor,'creator()'),creator);
 assert.equal(await address(successor,'guardFactory()'),setup);
 assert.equal(await call(successor,'guardFactoryHash()'),contracts.setupFactory.runtimeKeccak256);
 const quote=await deploy('syntheticQuote','SafeReserveGuard.t.sol','ReserveQuote',creator);
 const builder=await deploy('syntheticPoolBuilder','SafeReserveGuard.t.sol','ReservePoolBuilder',creator);
 const lp=await deploy('syntheticLPDestination','SafeReserveGuard.t.sol','ReserveLPDestination',creator);
 await record('initializeSafeAndGuard',{from:creator,to:setup,data:calldata('create(address[],address)','['+owners.join(',')+']',successor)});
 const guard=await address(successor,'configuredGuard()');
 const wallet=await address(guard,'wallet()');
 contracts.guard=await requireCode(guard);contracts.wallet=await requireCode(wallet);
 contracts.singleton=await requireCode(await address(setup,'singleton()'));
 factoryProvenance.wallet=await verify('SafeProxy.sol','SafeProxy',wallet);
 assert.equal(await address(guard,'successor()'),successor);
 assert.equal(await number(wallet,'getThreshold()'),3n);
 assert.equal(await number(guard,'memberCount()'),5n);
 for(const owner of owners)assert.equal(await number(wallet,'isOwner(address)',owner),1n);
 assert.equal(await number(wallet,'nonce()'),0n);assert.equal(await number(guard,'epoch()'),1n);
 assert.equal(await number(successor,'used()'),0n);assert.equal(await address(successor,'token()'),ZERO);
 const latest=await rpc('eth_getBlockByNumber',['latest',false]);
 const start=BigInt(latest.timestamp)+86400n;
 const tuple='('+[founder,distributor,guard,start,1000,'('+[quote,builder,lp,1000].join(',')+')'].join(',')+')';
 const issue=calldata('issueSuccessor(uint256,uint256,uint256,(address,address,address,uint256,uint256,(address,address,address,uint256)))',1,BigInt(latest.timestamp),start,tuple);
 const negative=[];
 negative.push(await rejectCall('creatorDirectIssuance',creator,successor,calldata('create((address,address,address,uint256,uint256,(address,address,address,uint256)))',tuple)));
 negative.push(await rejectCall('directGuardIssuance',creator,guard,issue));
 const hash=await call(wallet,'getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)',guard,0,issue,0,0,0,0,ZERO,ZERO,0);
 assert.match(hash,/^0x[0-9a-f]{64}$/i);
 const sigs=signers.map(({key})=>cast('wallet','sign','--no-hash','--private-key',key,hash));
 for(const sig of sigs)assert.match(sig,/^0x[0-9a-f]{128}(1b|1c)$/i);
 const pack=list=>'0x'+list.map(x=>x.slice(2)).join('');
 const exec=sigs=>calldata('execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',guard,0,issue,0,0,0,0,ZERO,ZERO,sigs);
 negative.push(await rejectCall('twoSignaturesCannotIssue',creator,wallet,exec(pack(sigs.slice(0,2)))));
 assert.equal(await number(wallet,'nonce()'),0n);assert.equal(await number(successor,'used()'),0n);
 await record('quorumAtomicIssuance',{from:creator,to:wallet,data:exec(pack(sigs))});
 assert.equal(await number(wallet,'nonce()'),1n);assert.equal(await number(guard,'bound()'),1n);
 assert.equal(await number(guard,'transactionActive()'),0n);assert.equal(await number(guard,'issuing()'),0n);
 const token=await address(successor,'token()');contracts.token=await requireCode(token);
 factoryProvenance.token=await verify('V3AtomicSuccessorFixture.sol','V3SuccessorTestToken',token,[successor]);
 assert.equal(await address(token,'issuer()'),successor);
 assert.equal(await address(guard,'asset()'),token);assert.equal(await number(token,'issued()'),1n);
 assert.equal(await number(token,'totalSupply()'),SUPPLY);assert.equal(await number(token,'decimals()'),6n);
 const vaults=[];
 for(let i=0;i<7;i++){
  const a=await address(successor,'vaults(uint256)',i);assert.equal(a,await address(guard,'destinations(uint256)',i));
  const balance=await number(token,'balanceOf(address)',a);assert.equal(balance,amounts[i]);
  vaults.push({...await requireCode(a),balanceRaw:String(balance)});
 }
 assert.equal(new Set(vaults.map(x=>x.address)).size,7);
 for(const a of [creator,wallet,guard,successor,founder,distributor,payee,...owners])assert.equal(await number(token,'balanceOf(address)',a),0n);
 negative.push(await rejectCall('consumedSafeNonceCannotReplay',creator,wallet,exec(pack(sigs))));
 const manifest={status:'LOCAL_ANVIL_REHEARSAL_ONLY',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),chainId:Number(CHAIN),localHardfork:'cancun',localBlockGasLimit:Number(LIMIT),testOnly:true,signatureMode:'ECDSA_ONLY',factoryProvenance,contracts,roles:{creator,owners,founder,distributor},startTimestamp:Number(start),totalSupplyRaw:String(SUPPLY),vaults,transactions:steps,negativeEthCalls:negative,limitations:'Synthetic quote/pool/LP, local unlocked Anvil accounts, three offline ECDSA signatures, no public RPC, no real signers, no production review. Gas observations are local receipts only, not a public Base Sepolia gas estimate or authorization.'};
 assert.match(manifest.sourceSha,/^[a-f0-9]{40}$/);
 writeFileSync(process.argv[2],JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
 if(process.argv[3]){
  const evidence=await verifyLocalAuthorizations({rpc,call,number,address,record,cast,calldata,creator,wallet,guard,token,quote,vaults,payee,signers,contracts,sourceSha:manifest.sourceSha});
  writeFileSync(process.argv[3],JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
 }
}finally{anvil.kill();}
