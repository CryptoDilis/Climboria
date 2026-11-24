// Read-only payer observation: accepts only two public addresses, no secret keys.
import {pathToFileURL} from 'node:url';
import {TESTNET} from './ntt-testnet-core.mjs';
import {CLIMB_SOLANA_MINT} from './mint-inspect.mjs';
import {estimateTestMintRent} from './testnet-solana/mint-plan.mjs';
const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail=()=>{throw new Error('NO_GO: invalid or unavailable testnet payer evidence');};
function solanaAddress(value){
 if(typeof value!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)||value===CLIMB_SOLANA_MINT)fail();
 let n=0n;for(const c of value)n=n*58n+BigInt(ALPHABET.indexOf(c));
 const zeros=value.match(/^1*/)[0].length;
 const length=n===0n?0:Math.ceil(n.toString(16).length/2);
 if(zeros+length!==32||n===0n)fail();
 return value;
}
function evmAddress(value){
 if(typeof value!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(value)||/^0x0{40}$/.test(value))fail();
 return value.toLowerCase();
}
async function rpc(url,method,params,fetchFn){
 const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
 if(!response?.ok)fail();const d=await response.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
}
export async function inspectTestnetPayers(solAddress,baseAddress,fetchFn=fetch){
 const sol=solanaAddress(solAddress),base=evmAddress(baseAddress),s=TESTNET.solana,b=TESTNET.base;
 const [rent,chain]=await Promise.all([estimateTestMintRent(fetchFn),rpc(b.rpc,'eth_chainId',[],fetchFn)]);
 if(chain!==b.chainId)fail();
 const [balance,wei,code]=await Promise.all([
  rpc(s.rpc,'getBalance',[sol,{commitment:'finalized'}],fetchFn),
  rpc(b.rpc,'eth_getBalance',[base,'finalized'],fetchFn),
  rpc(b.rpc,'eth_getCode',[base,'finalized'],fetchFn)
 ]);
 if(!Number.isSafeInteger(balance?.context?.slot)||balance.context.slot<=0||!Number.isSafeInteger(balance.value)||balance.value<0||typeof wei!=='string'||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(wei)||wei.length>66||code!=='0x')fail();
 return {assessment:'TESTNET_PAYER_BALANCES_ONLY',solana:{address:sol,network:'devnet',finalizedSlot:balance.context.slot,balanceLamports:balance.value,mintPlusOneAtaRentLamports:rent.illustrativeMintPlusOneAtaLamports,coversIllustrativeRent:balance.value>=rent.illustrativeMintPlusOneAtaLamports},base:{address:base,chainId:84532,balanceWei:BigInt(wei).toString(),hasNonzeroBalance:BigInt(wei)>0n},caveat:'No ownership or spending authorization proved. Solana rent floor excludes fees and program deployment; nonzero Base balance does not prove gas sufficiency. No mainnet RPC or transaction.',bridgeRelease:'NO_GO'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==4)fail();console.log(JSON.stringify(await inspectTestnetPayers(process.argv[2],process.argv[3]),null,2));}
 catch{console.error('NO_GO: supply two valid public testnet payer addresses and verify RPC availability');process.exitCode=1;}
}
