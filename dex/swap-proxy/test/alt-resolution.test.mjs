import test from "node:test";
import assert from "node:assert/strict";
import { resolveAddressLookupTables, ADDRESS_LOOKUP_TABLE_PROGRAM_ID } from "../src/alt-resolution.mjs";

const ACTIVE = (1n << 64n) - 1n;
function encode(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros=0; while(zeros<bytes.length&&bytes[zeros]===0)zeros++;
  const digits=[0];
  for(const byte of bytes){let carry=byte;for(let i=0;i<digits.length;i++){carry+=digits[i]*256;digits[i]=carry%58;carry=Math.floor(carry/58)}while(carry){digits.push(carry%58);carry=Math.floor(carry/58)}}
  let out="1".repeat(zeros);
  for(let i=digits.length-1;i>=0;i--){if(zeros&&i===0&&digits[i]===0)continue;out+=alphabet[digits[i]]}
  return out;
}
const tableKey = "AddressLookupTab1e1111111111111111111111111";
const keys = [1,2,3].map(n=>new Uint8Array(32).fill(n));
function account({owner=ADDRESS_LOOKUP_TABLE_PROGRAM_ID,deactivation=ACTIVE,lastExtended=4n,startIndex=0,addresses=keys}={}) {
  const data=new Uint8Array(56+addresses.length*32),view=new DataView(data.buffer);
  view.setUint32(0,1,true);view.setBigUint64(4,deactivation,true);view.setBigUint64(12,lastExtended,true);data[20]=startIndex;data[21]=0;
  addresses.forEach((key,i)=>data.set(key,56+i*32));
  return {owner,executable:false,data};
}
const fetcher=value=>async address=>{assert.equal(address,tableKey);return value};

test("resolves writable and readonly address groups in canonical order",async()=>{
  const result=await resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[1],readonlyIndexes:[0,2]}],fetchAccount:fetcher(account()),currentSlot:9});
  assert.deepEqual(result.writable,[encode(keys[1])]);
  assert.deepEqual(result.readonly,[encode(keys[0]),encode(keys[2])]);
  assert.deepEqual(result.all,[...result.writable,...result.readonly]);
});

test("rejects accounts not owned by the canonical ALT program",async()=>{
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[0],readonlyIndexes:[]}],fetchAccount:fetcher(account({owner:"11111111111111111111111111111111"})),currentSlot:9}),/not owned by the canonical ALT program/);
});

test("rejects deactivated tables and future extension slots",async()=>{
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[0],readonlyIndexes:[]}],fetchAccount:fetcher(account({deactivation:8n})),currentSlot:9}),/deactivated/);
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[0],readonlyIndexes:[]}],fetchAccount:fetcher(account({lastExtended:10n})),currentSlot:9}),/future extension slot/);
});

test("rejects addresses appended in the same slot",async()=>{
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[1],readonlyIndexes:[]}],fetchAccount:fetcher(account({lastExtended:9n,startIndex:1})),currentSlot:9}),/extended in the current slot/);
});

test("rejects out-of-range and duplicate indexes",async()=>{
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[3],readonlyIndexes:[]}],fetchAccount:fetcher(account()),currentSlot:9}),/out of range/);
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[1],readonlyIndexes:[1]}],fetchAccount:fetcher(account()),currentSlot:9}),/duplicate loaded indexes/);
});

test("rejects duplicate tables, invalid slots and malformed account layouts",async()=>{
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[0],readonlyIndexes:[]},{accountKey:tableKey,writableIndexes:[1],readonlyIndexes:[]}],fetchAccount:fetcher(account()),currentSlot:9}),/duplicate address lookup table/);
  await assert.rejects(resolveAddressLookupTables({lookups:[],fetchAccount:async()=>null,currentSlot:-1}),/finalized current slot/);
  await assert.rejects(resolveAddressLookupTables({lookups:[{accountKey:tableKey,writableIndexes:[0],readonlyIndexes:[]}],fetchAccount:fetcher({owner:ADDRESS_LOOKUP_TABLE_PROGRAM_ID,executable:false,data:new Uint8Array(57)}),currentSlot:9}),/invalid metadata\/address layout/);
});
