// Public read-only Base RPC observations, not token authenticity or trading authorization.
export const BASE_RPC_URL = "https://mainnet.base.org";
export const BASE_CHAIN_HEX = "0x2105";
const MAX_RESPONSE = 131072;
const SELECTORS = Object.freeze({name:"0x06fdde03",symbol:"0x95d89b41",decimals:"0x313ce567"});
export function normalizeContract(value) {
  return typeof value==="string" && /^0x[0-9a-fA-F]{40}$/.test(value.trim()) && !/^0x0{40}$/.test(value.trim()) ? value.trim().toLowerCase() : null;
}
function hexBytes(value) {
  return typeof value==="string" && /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
}
function word(hex, start) { return BigInt("0x"+hex.slice(start,start+64)); }
export function decodeDecimals(value) {
  if(!hexBytes(value)||value.length!==66) return null;
  const n=word(value.slice(2),0);
  return n<=255n?Number(n):null;
}
export function decodeTokenText(value) {
  if(!hexBytes(value)||value.length<130||value.length>642) return null;
  const hex=value.slice(2);
  if(word(hex,0)!==32n) return null;
  const length=word(hex,64);
  if(length<1n||length>192n) return null;
  const n=Number(length);
  if(hex.length!==128+Math.ceil(n/32)*64||!/^0*$/.test(hex.slice(128+n*2))) return null;
  try {
    const bytes=Uint8Array.from(hex.slice(128,128+n*2).match(/../g),b=>parseInt(b,16));
    const result=new TextDecoder("utf-8",{fatal:true}).decode(bytes).trim();
    return result && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(result) ? result : null;
  } catch { return null; }
}
async function boundedJSON(response) {
  const length=response.headers?.get("content-length");
  if(length && Number(length)>MAX_RESPONSE) throw Error("RPC response too large");
  if(response.body?.getReader) {
    const reader=response.body.getReader(); const chunks=[]; let count=0;
    try {
      while(true) {
        const {done,value}=await reader.read();
        if(done) break;
        count+=value.byteLength;
        if(count>MAX_RESPONSE) { await reader.cancel(); throw Error("RPC response too large"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes=new Uint8Array(count); let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }
  const text=await response.text();
  if(new TextEncoder().encode(text).byteLength>MAX_RESPONSE) throw Error("RPC response too large");
  return JSON.parse(text);
}
export async function readBaseTokenMetadata(contract,{fetchImpl=globalThis.fetch,signal}={}) {
  const address=normalizeContract(contract);
  if(!address) throw Error("Enter a valid nonzero Base contract address.");
  let id=0;
  const deadline=AbortSignal.timeout(12000);
  const requestSignal=signal?AbortSignal.any([signal,deadline]):deadline;
  async function rpc(method,params,{optional=false}={}) {
    const requestId=++id;
    const response=await fetchImpl(BASE_RPC_URL,{
      method:"POST", headers:{"content-type":"application/json",accept:"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),
      credentials:"omit",cache:"no-store",redirect:"error",signal:requestSignal
    });
    if(!response.ok) throw Error("Base RPC unavailable (HTTP "+response.status+").");
    const data=await boundedJSON(response);
    if(!data||data.jsonrpc!=="2.0"||data.id!==requestId) throw Error("Unexpected RPC response.");
    if(Object.hasOwn(data,"error")) {
      // Optional metadata may be absent/revert. Do not hide transport, rate-limit or other RPC errors.
      if(optional&&data.error?.code===3) return null;
      throw Error("Base RPC returned an error.");
    }
    if(!Object.hasOwn(data,"result")) throw Error("Missing RPC result.");
    return data.result;
  }
  if(await rpc("eth_chainId",[])!==BASE_CHAIN_HEX) throw Error("Unexpected RPC chain. Expected Base (8453).");
  const block=await rpc("eth_blockNumber",[]);
  if(typeof block!=="string"||!/^0x(?:0|[1-9a-f][0-9a-f]{0,15})$/.test(block)) throw Error("Invalid block reference.");
  const code=await rpc("eth_getCode",[address,block]);
  if(!hexBytes(code)) throw Error("Invalid contract bytecode response.");
  if(code==="0x") return {address,block,hasCode:false,name:null,symbol:null,decimals:null};
  const result=await Promise.all(Object.entries(SELECTORS).map(async ([key,data])=>[key,await rpc("eth_call",[{to:address,data},block],{optional:true})]));
  const values=Object.fromEntries(result);
  return {address,block,hasCode:true,name:decodeTokenText(values.name),symbol:decodeTokenText(values.symbol),decimals:decodeDecimals(values.decimals)};
}
export function initBaseMetadataInspector(doc=globalThis.document,read=readBaseTokenMetadata) {
  const form=doc.getElementById("baseMetadataForm"), input=doc.getElementById("baseMetadataContract"),
    status=doc.getElementById("baseMetadataStatus"), result=doc.getElementById("baseMetadataResult");
  if(!form||!input||!status||!result) return;
  let current;
  function clear(){current?.abort();current=null;result.replaceChildren();status.textContent="Enter an exact Base contract. No wallet required.";}
  input.addEventListener("input",clear);
  form.addEventListener("submit",async event=>{
    event.preventDefault();clear();
    const address=normalizeContract(input.value);
    if(!address){status.textContent="Enter a valid nonzero 0x-prefixed, 40-hex-digit address.";return;}
    const controller=new AbortController();current=controller;
    status.textContent="Reading Base RPC…";
    try{
      const info=await read(address,{signal:controller.signal});
      if(current!==controller||controller.signal.aborted) return;
      const add=(label,value)=>{const row=doc.createElement("p");row.textContent=label+": "+value;result.append(row);};
      add("Contract",info.address);add("Observed block",BigInt(info.block).toString());
      add("Contract bytecode",info.hasCode?"Present":"Not present");
      if(info.hasCode){add("Name",info.name??"Unavailable");add("Symbol",info.symbol??"Unavailable");add("Decimals",info.decimals??"Unavailable");}
      const link=doc.createElement("a");link.href="https://basescan.org/address/"+address;
      link.target="_blank";link.rel="noopener noreferrer";link.textContent="Inspect address on BaseScan";result.append(link);
      status.textContent="Read-only RPC observation. Bytecode and metadata do not prove token legitimacy or safety.";
    }catch{
      if(current===controller&&!controller.signal.aborted) status.textContent="Base RPC lookup failed. No metadata verified. Retry later or inspect independently on BaseScan.";
    }finally{if(current===controller)current=null;}
  });
}
if(typeof document!=="undefined") initBaseMetadataInspector(document);
