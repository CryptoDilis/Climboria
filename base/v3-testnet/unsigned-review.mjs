// Review-only Base Sepolia handoff. Never signs or broadcasts.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {parseRoleConfig} from './estimate-creation.mjs';
const fail=()=>{throw new Error('NO_GO: invalid V3 review handoff');};
const sha=hex=>createHash('sha256').update(Buffer.from(hex.slice(2),'hex')).digest('hex');
const amount=s=>{if(typeof s!=='string'||!/^(0|[1-9][0-9]{0,77})$/.test(s))fail();const n=BigInt(s);if(n>=2n**256n)fail();return n;};
const word=n=>n.toString(16).padStart(64,'0');
export function prepareReview(artifact,manifest,source,payer,config,estimate,now=Math.floor(Date.now()/1000)){
 const roles=parseRoleConfig(config,payer);
 const from=payer.toLowerCase(),creation=artifact?.bytecode?.object;
 const entry=manifest?.contracts?.find(x=>x.name==='ClimbV3IntegratedTestToken');
 if(!/^[a-f0-9]{40}$/.test(source)||manifest?.sourceSha!==source||manifest?.chainId!==84532||manifest?.status!=='TEST_ONLY_BUILD_TEMPLATE_NO_DEPLOYMENT'||!entry||!/^0x(?:[a-fA-F0-9]{2})+$/.test(creation??'')||sha(creation)!==entry.creationSha256||entry.creationBytes!==(creation.length-2)/2||entry.creationBytes+256>49152)fail();
 const abi=artifact.abi?.filter(x=>x.type==='constructor');
 if(abi?.length!==1||JSON.stringify(abi[0].inputs.map(x=>x.type))!==JSON.stringify(['address','address','uint256','address[5]']))fail();
 if(estimate?.status!=='PUBLIC_ROLE_ESTIMATE_ONLY_NO_DEPLOYMENT'||estimate.chainId!==84532||estimate.sourceSha!==source||estimate.payer!==from||estimate.creationTemplateSha256!==entry.creationSha256||!/^0x[1-9a-f][0-9a-f]*$/.test(estimate.observedBlock??'')||!/^0x[0-9a-f]{64}$/.test(estimate.blockHash??''))fail();
 const p=estimate.publicRoles;
 if(!p||JSON.stringify([p.founder,p.distributor,...(p.signers??[])])!==JSON.stringify(roles))fail();
 const start=amount(p.start),clock=BigInt(now);
 // Estimate chooses observed block timestamp + seven days. Reject stale/future evidence.
 if(start<clock+604800n-900n||start>clock+604800n+60n)fail();
 const data=creation.toLowerCase()+word(BigInt(roles[0]))+word(BigInt(roles[1]))+word(start)+roles.slice(2).map(a=>word(BigInt(a))).join('');
 if(sha(data)!==estimate.constructorSpecificCreationSha256)fail();
 const gas=amount(estimate.executionGas),price=amount(estimate.gasPriceWei),fee=amount(estimate.illustrativeL2FeeWei),balance=amount(estimate.balanceWei);
 if(gas===0n||price===0n||gas*price!==fee||estimate.coversIllustrativeL2Fee!==true||balance<fee)fail();
 return {status:'V3_UNSIGNED_TEST_ONLY_REVIEW_NO_GO',sourceSha:source,chainId:84532,publicRoles:p,creationTemplateSha256:entry.creationSha256,constructorSpecificCreationSha256:sha(data),estimate,transaction:{chainId:84532,from,to:null,value:'0x0',data},caveat:'Review only. No signature, nonce, gas limit or final fee parameters. Single RPC estimate excludes L1/operator fees and margin. Actual control, full fee sufficiency, independent review and explicit test-only deployment approval remain required. Liquidity and legacy reserves are permanently inert. Never mainnet or official CLIMB.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==7)fail();const [m,s,p,e,o]=process.argv.slice(2);
 const read=f=>JSON.parse(readFileSync(f,'utf8'));
 const result=prepareReview(read('out/ClimbV3IntegratedTestToken.sol/ClimbV3IntegratedTestToken.json'),read(m),s,p,JSON.parse(process.env.TEST_ROLE_CONFIG??''),read(e));
 writeFileSync(o,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.status,sourceSha:s,chainId:84532,constructorSpecificCreationSha256:result.constructorSpecificCreationSha256},null,2));
 }catch{console.error('NO_GO: V3 unsigned test-only review rejected');process.exitCode=1;}
}
