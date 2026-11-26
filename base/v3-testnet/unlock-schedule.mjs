// Exact integer schedule of the deployed V3 test fixture, not a circulating-supply forecast.
import {pathToFileURL} from 'node:url';
export const INITIAL=888888888000000n;
export const ALLOCATION={gaming:311111110800000n,liquidity:222222222000000n,ecosystem:133333333200000n,community:88888888800000n,treasury:106666666560000n,founder:17777777760000n,legacy:8888888880000n};
export const MONTH=2592000n;
const valid=m=>Number.isInteger(m)&&m>=0&&m<60;
export function founderVested(m){
 if(!Number.isInteger(m)||m<0)throw Error('invalid month');
 return m<=12?0n:m>=48?ALLOCATION.founder:ALLOCATION.founder*BigInt(m-12)/36n;
}
export function period(m){
 if(!valid(m))throw Error('invalid period');
 const i=BigInt(m%12),annual=ALLOCATION.gaming*BigInt(30-5*Math.floor(m/12))/100n;
 const equal=allocation=>allocation*BigInt(m+1)/60n-allocation*BigInt(m)/60n;
 const row={gaming:annual*(i+1n)/12n-annual*i/12n,ecosystem:equal(ALLOCATION.ecosystem),community:equal(ALLOCATION.community),treasury:equal(ALLOCATION.treasury),founderNewlyVested:founderVested(m)-(m===0?0n:founderVested(m-1)),liquidity:0n,legacy:0n};
 const total=Object.values(row).reduce((a,b)=>a+b,0n);
 return {...row,totalNewlyEligible:total};
}
export function schedule(){
 let cumulative=0n;
 const periods=Array.from({length:60},(_,m)=>{
  const row=period(m);cumulative+=row.totalNewlyEligible;
  return {period:m,startOffsetSeconds:String(BigInt(m)*MONTH),endOffsetSecondsExclusive:String(BigInt(m+1)*MONTH),...Object.fromEntries(Object.entries(row).map(([k,v])=>[k,String(v)])),cumulativeNewlyEligible:String(cumulative)};
 });
 return {status:'V3_TEST_FIXTURE_SCHEDULE_NOT_PRODUCTION',initialSupplyRaw:String(INITIAL),decimals:6,initialDeployerFloatRaw:'0',periodSeconds:String(MONTH),allocationRaw:Object.fromEntries(Object.entries(ALLOCATION).map(([k,v])=>[k,String(v)])),maximumScheduledEligibilityRaw:String(cumulative),inertReserveRaw:String(ALLOCATION.liquidity+ALLOCATION.legacy),periods,
 caveat:'Test fixture only: gaming and restricted spend monthly ceilings are not required distributions; unused capacity does not roll over. Founder newly vested amount is not a monthly transfer cap: previously vested but unclaimed amounts can be released later. Cumulative is a theoretical upper bound, not actual release/circulating supply. Liquidity and legacy are permanently inert, not funded LP or approved claim. Production terms and launch float remain unapproved.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(schedule(),null,2));
