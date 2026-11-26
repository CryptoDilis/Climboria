// Base Sepolia CLIMBBURNTEST only. No signing, broadcasting, fee/nonce assignment or production use.
import {buildManifest} from './build-manifest.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const fail=()=>{throw new Error('NO_GO: invalid test-only handoff evidence');};
const amount=s=>{if(typeof s!=='string'||!/^(0|[1-9][0-9]{0,77})$/.test(s))fail();return BigInt(s);};
export function prepareHandoff(artifact,source,commit,estimate,payer){
 const m=buildManifest(artifact,source,commit);
 if(typeof payer!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(payer)||/^0x0{40}$/.test(payer))fail();
 const from=payer.toLowerCase();
 if(estimate?.status!=='TEST_ONLY_CREATION_ESTIMATE_NO_GO'||estimate.chainId!==84532||estimate.sourceCommit!==commit||estimate.payer!==from||estimate.creationSha256!==m.creationSha256||estimate.runtimeSha256!==m.runtimeSha256)fail();
 if(typeof estimate.observedBlock!=='string'||!/^0x[1-9a-f][0-9a-f]*$/.test(estimate.observedBlock)||typeof estimate.blockHash!=='string'||!/^0x[0-9a-f]{64}$/.test(estimate.blockHash))fail();
 const gas=amount(estimate.executionGas),price=amount(estimate.gasPriceWei),fee=amount(estimate.illustrativeL2FeeWei),balance=amount(estimate.balanceWei);
 if(gas===0n||price===0n||gas*price!==fee||estimate.coversIllustrativeL2Fee!==true||balance<fee)fail();
 return {status:'UNSIGNED_TEST_ONLY_REVIEW_REQUIRED_NO_GO',manifest:m,estimate,transaction:{chainId:84532,from,to:null,value:'0x0',data:artifact.bytecode.object.toLowerCase()},caveat:'No signature, nonce, gas limit or final fee parameters. L2 estimate excludes L1 data/operator fees and margin; balance sufficiency for complete transaction not established. Review exact main artifact and current testnet wallet simulation before any owner-authorized test-only signing. Not official CLIMB or a migration. Never use mainnet.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==8)fail();const [a,s,c,e,p,o]=process.argv.slice(2);const r=prepareHandoff(JSON.parse(readFileSync(a,'utf8')),readFileSync(s,'utf8'),c,JSON.parse(readFileSync(e,'utf8')),p);writeFileSync(o,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:r.status,chainId:84532,sourceCommit:c,creationSha256:r.manifest.creationSha256,runtimeSha256:r.manifest.runtimeSha256},null,2));}
 catch{console.error('NO_GO: test-only unsigned handoff rejected');process.exitCode=1;}
}
