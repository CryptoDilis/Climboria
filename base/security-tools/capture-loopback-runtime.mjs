 // Capture the exact mined pre-issuance block in the local-only rehearsal.
 // This file is injected into a temporary copy of the pinned script.
 // It emits an unsigned bundle; all pins are locally generated test pins.
 {
 const fs=await import('node:fs');
 const {createHash}=await import('node:crypto');
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const encode=obj=>Buffer.from(JSON.stringify(obj));
 const block=latest.number;
 const codeAt=async at=>{
   const code=await rpc('eth_getCode',[at,block]);
   assert.match(code,/^0x(?:[0-9a-f]{2})+$/);
   return code;
 };
 const callAt=async (at,sig)=>rpc('eth_call',[{to:at,data:calldata(sig)},block]);
 const wordAt=async(at,sig)=>{
   const word=await callAt(at,sig);
   assert.match(word,/^0x[0-9a-f]{64}$/);
   return word.slice(2);
 };
 const addrWord=a=>a.slice(2).padStart(64,'0');
 const hashCode=code=>cast('keccak',code).slice(2);
 const roleAddresses={guard,successor,safe:wallet,singleton};
 assert.equal(new Set(Object.values(roleAddresses)).size,4);
 const codeEntries={};
 for(const [role,at] of Object.entries(roleAddresses)){
   codeEntries[role]={address:at,runtime_hex:(await codeAt(at)).slice(2)};
 }
 const mastercopy=await rpc('eth_getStorageAt',[wallet,'0x0',block]);
 assert.equal(mastercopy,'0x'+addrWord(singleton));
 assert.equal(await wordAt(guard,'wallet()'),addrWord(wallet));
 assert.equal(await wordAt(guard,'singleton()'),addrWord(singleton));
 assert.equal(await wordAt(guard,'successor()'),addrWord(successor));
 assert.equal(await wordAt(successor,'configuredGuard()'),addrWord(guard));
 assert.equal(BigInt('0x'+await wordAt(successor,'used()')),0n);
 assert.equal(BigInt('0x'+await wordAt(guard,'bound()')),0n);
 assert.equal(BigInt('0x'+await wordAt(guard,'issuing()')),0n);
 assert.equal(BigInt('0x'+await wordAt(guard,'transactionActive()')),0n);
 const ownerWords=(await callAt(wallet,'getOwners()')).slice(2);
 assert.equal(ownerWords.length,7*64);
 assert.equal(BigInt('0x'+ownerWords.slice(0,64)),32n);
 assert.equal(BigInt('0x'+ownerWords.slice(64,128)),5n);
 const actualOwners=Array.from({length:5},(_,i)=>{
   const w=ownerWords.slice(128+i*64,192+i*64);
   assert.equal(w.slice(0,24),'0'.repeat(24));
   return '0x'+w.slice(24);
 });
 assert.deepEqual([...actualOwners].sort(),[...owners].sort());
 const actualNonce=Number(BigInt('0x'+await wordAt(wallet,'nonce()')));
 const actualEpoch=Number(BigInt('0x'+await wordAt(guard,'epoch()')));
 const actualThreshold=Number(BigInt('0x'+await wordAt(wallet,'getThreshold()')));
 assert.equal(actualNonce,0);assert.equal(actualEpoch,1);assert.equal(actualThreshold,3);
 const capture=process.env.FROZEN_CAPTURE;
 const invocation=fs.readdirSync(capture+'/standard-json').filter(n=>n.startsWith('invocation.'));
 assert.equal(invocation.length,1);
 const prefix=capture+'/standard-json/'+invocation[0]+'/';
 const compilerInput=readFileSync(prefix+'input.json');
 const compilerOutput=readFileSync(prefix+'output.json');
 assert.equal(sha(compilerOutput),'85de75841374eaa75742cf0e503d7a7266a33ab097ec944c12e021d990089c7a');
 const compiler=JSON.parse(compilerOutput);
 const decl={};
 function walk(n,owner=null){
   if(Array.isArray(n)){for(const v of n)walk(v,owner);return;}
   if(!n||typeof n!=='object')return;
   if(n.nodeType==='ContractDefinition')owner=n.name;
   if(n.nodeType==='VariableDeclaration'&&n.mutability==='immutable'){
     const val={owner,name:n.name,type:n.typeDescriptions.typeString};
     if(decl[n.id])assert.deepEqual(decl[n.id],val);
     decl[n.id]=val;
   }
   for(const v of Object.values(n))walk(v,owner);
 }
 for(const source of Object.values(compiler.sources))walk(source.ast);
 const sourceCommit='6deaf2dc0139882215eb71d1ed8fe2785984a0ab';
 const header={schema:1,status:'REVIEW_ONLY_NO_GO',chain_id:84532,source_commit:sourceCommit};
 // Expected role words come from the actual local setup intent and
 // explicit getter/other-contract observations, not the runtime offsets.
 // The core address is a getter-derived value, not independent production proof.
 const roleWords={
   guard:{
     'SafeEpochGuardFixture.wallet':addrWord(wallet),
     'SafeEpochGuardFixture.singleton':addrWord(singleton),
     'SafeEpochGuardFixture.proxyHash':hashCode('0x'+codeEntries.safe.runtime_hex),
     'SafeEpochGuardFixture.singletonHash':hashCode('0x'+codeEntries.singleton.runtime_hex),
     'SafeReserveGuardFixture.successor':addrWord(successor),
     'SafeReserveGuardFixture.successorHash':hashCode('0x'+codeEntries.successor.runtime_hex)
   },
   successor:{
     'V3AtomicSuccessorFixture.creator':addrWord(creator),
     'V3AtomicSuccessorFixture.core':await wordAt(successor,'core()'),
     'V3AtomicSuccessorFixture.conditional':addrWord(helper),
     'V3AtomicSuccessorFixture.conditionalHash':hashCode(await codeAt(helper)),
     'V3QuorumSuccessorFixture.guardFactory':addrWord(setup),
     'V3QuorumSuccessorFixture.guardFactoryHash':hashCode(await codeAt(setup))
   },
   safe:{},singleton:{}
 };
 const specs={
   guard:['src/SafeQuorumIssuanceFixture.sol','SafeQuorumReserveGuardFixture'],
   successor:['src/SafeQuorumIssuanceFixture.sol','V3QuorumSuccessorFixture'],
   safe:['lib/safe-contracts/contracts/proxies/SafeProxy.sol','SafeProxy'],
   singleton:['lib/safe-contracts/contracts/Safe.sol','Safe']
 };
 const plans={};
 for(const [role,[source,name]] of Object.entries(specs)){
   const d=compiler.contracts[source][name].evm.deployedBytecode;
   const words={};
   for(const id of Object.keys(d.immutableReferences||{})){
     const r=decl[id];assert.ok(r);
     const word=roleWords[role][r.owner+'.'+r.name];
     assert.match(word,/^[0-9a-f]{64}$/);
     words[id]={...r,word};
   }
   assert.equal(Object.keys(words).length,Object.keys(roleWords[role]).length);
   plans[role]={address:roleAddresses[role],plan:{...header,
     compiler_output_sha256:sha(compilerOutput),source_unit:source,contract:name,
     runtime_template_sha256:sha(Buffer.from(d.object,'hex')),immutables:words}};
 }
 const ts=Number(BigInt(latest.timestamp));
 const blockNumber=Number(BigInt(block));
 assert.ok(Number.isSafeInteger(ts)&&Number.isSafeInteger(blockNumber)&&blockNumber>0);
 const rawPayload=Buffer.from(issue.slice(2),'hex');
 const plan={...header,safe:wallet,successor,owners:[...owners],threshold:3,
   payload_sha256:sha(rawPayload),expected_epoch:1,
   fields:{epoch:1,valid_after:ts,deadline:Number(start),founder,distributor,guard,
     start:Number(start),gaming_wallet_monthly_cap:1000,quote,builder,lp_custody:lp,tranche_cap:1000}};
 const planRaw=encode(plan);
 const envelope={...header,plan_sha256:sha(planRaw),safe:wallet,to:guard,nonce:actualNonce,
   value:0,operation:0,safe_tx_gas:0,base_gas:0,gas_price:0,gas_token:ZERO,refund_receiver:ZERO,data:issue};
 const state={schema:1,status:'REVIEW_ONLY_NO_GO',chain_id:84532,safe:wallet,guard,
   block_number:blockNumber,block_hash:latest.hash,timestamp:ts,nonce:actualNonce,
   epoch:actualEpoch,owners:actualOwners,threshold:actualThreshold};
 const observed={...header,block_number:blockNumber,block_hash:latest.hash,safe_slot0:mastercopy.slice(2),contracts:codeEntries};
 const note=(role,ref)=>encode({status:'LOCAL_REHEARSAL_ONLY_NOT_RELEASE_EVIDENCE',role,reference:ref});
 const raw={
   compiler:note('compiler','Captured solc 0.8.39 output; no compiler binary in this bundle'),
   source_archive:note('source_archive',sourceCommit),
   safe_dependency:note('safe_dependency','bf943f80fec5ac647159d26161446ac5d716a294'),
   oz_dependency:note('oz_dependency','dc44c9f1a4c3b10af99492eed84f83ed244203f6'),
   compiler_input:compilerInput,compiler_output:compilerOutput,
   build_reproduction:note('build_reproduction','Prior frozen compiler evidence; not rebuilt in this experiment'),
   external_review:note('external_review','No fresh independent reviewer or approval; loopback test only'),
   deployment_plan:planRaw,issuance_payload:rawPayload,unsigned_envelope:encode(envelope),
   state_observation:encode(state),runtime_plans:encode({...header,contracts:plans}),
   runtime_observations:encode(observed)
 };
 const dir=process.env.LOOPBACK_BUNDLE;
 fs.mkdirSync(dir,{recursive:false});
 const artifacts={};
 for(const [role,data] of Object.entries(raw)){
   const file=role+'.bin';writeFileSync(dir+'/'+file,data);
   artifacts[role]={file,sha256:sha(data)};
 }
 const manifest=encode({...header,schema:3,artifacts});
 writeFileSync(dir+'/manifest.json',manifest);
 writeFileSync(dir+'.pins.json',JSON.stringify({
   status:'SELF_GENERATED_LOCAL_TEST_PINS_NOT_TRUSTED_RELEASE_PINS',
   manifest:sha(manifest),state:sha(raw.state_observation),plans:sha(raw.runtime_plans),
   code:sha(raw.runtime_observations),review_timestamp:ts
 },null,2));
 assert.equal(await rpc('eth_blockNumber'),block);
 console.log('LOCAL_PRE_ISSUANCE_SNAPSHOT_CAPTURED',blockNumber,latest.hash);
 }
