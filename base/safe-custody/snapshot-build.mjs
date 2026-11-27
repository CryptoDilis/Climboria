// Compare clean compiler output from the same pinned CI environment, not an independent audit.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
export function artifactDigest(a){
 assert.ok(Array.isArray(a.abi),'missing ABI');
 for(const b of [a.bytecode,a.deployedBytecode])assert.match(b?.object??'',/^0x(?:[a-fA-F0-9]{2})*$/,'invalid or unresolved bytecode');
 // Include exact code and all linker/immutable locations, ABI and compiler metadata.
 const metadata=a.metadata??a.rawMetadata;
 assert.ok(metadata,'missing compiler metadata');
 const m=typeof metadata==='string'?JSON.parse(metadata):metadata;
 assert.match(m.compiler?.version??'',/^0\.8\.19(?:\+|$)/,'unexpected compiler');
 assert.ok(m.settings?.optimizer?.enabled===true&&m.settings.optimizer.runs===1,'unexpected optimizer');
 assert.equal(m.settings.evmVersion,'paris','unexpected EVM target');
 return {sha256:digest({abi:a.abi,bytecode:a.bytecode,deployedBytecode:a.deployedBytecode,metadata:m}),compiler:m.compiler.version,evmVersion:m.settings.evmVersion,optimizerRuns:m.settings.optimizer.runs};
}
export function snapshot(root){
 const entries=[];
 function walk(dir){
  for(const d of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const p=join(dir,d.name);
   if(d.isDirectory()){if(d.name!=='build-info')walk(p);continue;}
   if(!d.isFile()||!d.name.endsWith('.json'))continue;
   const a=JSON.parse(readFileSync(p,'utf8'));
   if(!a.bytecode&&!a.deployedBytecode)continue;
   entries.push({path:relative(root,p),...artifactDigest(a)});
  }
 }
 walk(root);assert.ok(entries.length>0,'no compiler artifacts');
 for(const name of ['Safe.sol/Safe.json','SafeQuorumIssuanceFixture.sol/V3QuorumSuccessorFixture.json','SafeQuorumIssuanceFixture.sol/SafeQuorumReserveGuardFixture.json','SafeQuorumIssuanceFixture.sol/SafeQuorumReserveFactoryFixture.json'])assert.ok(entries.some(x=>x.path===name),'missing '+name);
 return entries;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const sourceSha=git('rev-parse','HEAD');assert.equal(sourceSha,process.env.GITHUB_SHA);
 const safeSource=git('-C','lib/safe-contracts','rev-parse','HEAD');
 const openzeppelinSource=git('-C','lib/openzeppelin-contracts','rev-parse','HEAD');
 assert.equal(safeSource,'bf943f80fec5ac647159d26161446ac5d716a294');
 assert.equal(openzeppelinSource,'dc44c9f1a4c3b10af99492eed84f83ed244203f6');
 for(const dir of ['lib/safe-contracts','lib/openzeppelin-contracts'])assert.equal(git('-C',dir,'status','--porcelain','--untracked-files=all'),'','dependency checkout modified');
 const artifacts=snapshot('out');
 const result={status:'SAME_ENVIRONMENT_CLEAN_BUILD_EVIDENCE_ONLY_NO_GO',sourceSha,safeSource,openzeppelinSource,forgeVersion:execFileSync('forge',['--version'],{encoding:'utf8'}).trim(),artifacts,artifactSetSha256:digest(artifacts)};
 writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,sourceSha,artifactCount:artifacts.length,artifactSetSha256:result.artifactSetSha256,evmTargets:[...new Set(artifacts.map(x=>x.evmVersion))]}));
}
