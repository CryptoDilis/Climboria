(()=>{'use strict';
const API='https://api.dexscreener.com';
const SOL='So11111111111111111111111111111111111111112';
const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const HERO_MARKET_STALE_AFTER_MS=90_000;
let heroMarketFetchedAt=0;
let heroMarketRequest=0;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metric=n=>{if(n===null||n===undefined||typeof n==='boolean'||(typeof n==='string'&&!n.trim()))return null;const v=Number(n);return Number.isFinite(v)?v:null};
const money=n=>{const v=metric(n);if(v===null||v<0)return 'Unavailable';return v>=1e9?'$'+(v/1e9).toFixed(2)+'B':v>=1e6?'$'+(v/1e6).toFixed(2)+'M':v>=1e3?'$'+(v/1e3).toFixed(1)+'K':'$'+v.toFixed(2)};
const price=n=>{const v=metric(n);if(v===null||v<=0)return 'Unavailable';return '$'+(v<.0001?v.toExponential(2):v<1?v.toPrecision(4):v.toLocaleString('en-US',{maximumFractionDigits:4}))};
async function get(path){const r=await fetch(API+path,{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error('DexScreener HTTP '+r.status);return r.json()}
function setFlash(el,next){if(!el)return;const old=el.dataset.lastValue;if(old&&old!==next){el.classList.remove('price-flash-up','price-flash-down');void el.offsetWidth;el.classList.add(Number(next.replace(/[^0-9.+-]/g,''))>=Number(old.replace(/[^0-9.+-]/g,''))?'price-flash-up':'price-flash-down');}el.dataset.lastValue=next;el.textContent=next}
function renderHeroUnavailable(el,detail='Retrying with next market refresh'){
 heroMarketFetchedAt=0;
 el.dataset.marketState='unavailable';
 delete el.dataset.marketLeaderPool;
 delete el.dataset.marketFetchedAt;
 el.innerHTML='<div><small>MARKET LEADER · SOL / USDC</small><b>Live price temporarily unavailable</b></div><div class="hero-market-change muted">No cached or estimated price shown</div><span class="hero-market-source">'+esc(detail)+'</span>';
}
function isSolanaAddress(value){return typeof value==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)}
function hideStaleHeroMarket(){
 const el=$('heroMarket');
 if(el&&heroMarketFetchedAt&&Date.now()-heroMarketFetchedAt>HERO_MARKET_STALE_AFTER_MS)renderHeroUnavailable(el,'Refreshing verified SOL/USDC market data');
}
async function loadHero(){
 const el=$('heroMarket');if(!el)return;
 const request=++heroMarketRequest;
 try{
  const data=await get('/latest/dex/tokens/'+SOL);
  const fetchedAt=Date.now();
  const pairs=(data.pairs||[]).filter(p=>p?.chainId==='solana'&&p.baseToken?.address===SOL&&p.quoteToken?.address===USDC&&isSolanaAddress(p.pairAddress)&&Number.isFinite(Number(p.priceUsd))&&Number(p.priceUsd)>0&&Number(p.liquidity?.usd)>0);
  pairs.sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0));
  const p=pairs[0];if(!p)throw new Error('No verified wrapped-SOL/USDC pool returned');
  if(request!==heroMarketRequest)return;
  const change=metric(p.priceChange?.h24),changeText=change!==null?(change>0?'+':'')+change.toFixed(2)+'%':'24h change unavailable';
  const changeClass=change!==null?(change>=0?'positive':'negative'):'muted';
  const previous=Number(el.dataset.lastPrice),current=Number(p.priceUsd),flash=Number.isFinite(previous)&&Number.isFinite(current)&&current!==previous?(current>previous?'price-flash-up':'price-flash-down'):'';
  heroMarketFetchedAt=fetchedAt;
  el.dataset.marketState='fresh';
  el.dataset.marketLeaderPool=p.pairAddress;
  el.dataset.marketFetchedAt=String(fetchedAt);
  el.dataset.lastPrice=String(current);
  el.innerHTML='<div><small>MARKET LEADER · SOL / USDC</small><b id="heroSolPrice" class="'+flash+'">'+price(p.priceUsd)+'</b></div><div class="hero-market-change '+changeClass+'" id="heroSolChange">'+changeText+'</div><span class="hero-market-source">DexScreener · fetched '+new Date(fetchedAt).toLocaleTimeString()+' · verified SOL/USDC pool</span>';
 }catch(e){if(request===heroMarketRequest)renderHeroUnavailable(el)}
}
async function loadTrending(){
 const grid=$('premiumTrendingGrid');if(!grid)return;
 const updated=$('premiumTrendingUpdated');
 try{
  // Discover beyond a fixed ticker watchlist. DexScreener's profile and boost
  // endpoints are discovery sources, not a global market ranking; label them
  // honestly and rank only the eligible discovered Solana pairs by reported volume.
  const [profileRows,boostRows]=await Promise.all([
   get('/token-profiles/latest/v1'),
   get('/token-boosts/top/v1')
  ]);
  const candidates=new Map();
  const add=(rows,source)=>{
   for(const item of (Array.isArray(rows)?rows:[])){
    if(item?.chainId!=='solana'||typeof item.tokenAddress!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(item.tokenAddress))continue;
    const prior=candidates.get(item.tokenAddress)||{sources:new Set()};
    prior.sources.add(source);
    candidates.set(item.tokenAddress,prior);
   }
  };
  // Balance new profile discovery with currently most-boosted discovery.
  add((Array.isArray(profileRows)?profileRows:[]).slice(0,15),'Profile');
  add((Array.isArray(boostRows)?boostRows:[]).slice(0,15),'Boosted');
  const addresses=[...candidates.keys()].slice(0,30);
  if(!addresses.length){
   grid.innerHTML='<div class="premium-trending-empty">No eligible Solana tokens were returned by the latest-profile or active-boost feeds.</div>';
   if(updated)updated.textContent='No eligible discovery results';
   return;
  }
  // DexScreener supports up to 30 token addresses in one batch request.
  const pairPayload=await get('/tokens/v1/solana/'+addresses.join(','));
  const pairs=Array.isArray(pairPayload)?pairPayload:(Array.isArray(pairPayload?.pairs)?pairPayload.pairs:[]);
  const bestByMint=new Map();
  for(const p of pairs){
   const mint=p?.baseToken?.address;
   if(p?.chainId!=='solana'||!candidates.has(mint)||!p.pairAddress)continue;
   const liquidity=metric(p.liquidity?.usd),volume=metric(p.volume?.h24),usd=metric(p.priceUsd);
   if(liquidity===null||liquidity<=0||volume===null||volume<0||usd===null||usd<=0)continue;
   const prior=bestByMint.get(mint);
   if(!prior||liquidity>Number(prior.liquidity?.usd||0))bestByMint.set(mint,p);
  }
  const list=[...bestByMint.entries()].map(([mint,p])=>({
   ...p,
   discoverySource:[...candidates.get(mint).sources].sort().join(' + ')
  })).sort((a,b)=>(Number(b.volume?.h24)||0)-(Number(a.volume?.h24)||0)).slice(0,6);
  if(!list.length){
   grid.innerHTML='<div class="premium-trending-empty">No eligible live Solana pools were found for the discovered tokens.</div>';
   if(updated)updated.textContent='No eligible live pools';
   return;
  }
  const max=Math.max(...list.map(p=>Number(p.liquidity.usd)||0),1);
  grid.innerHTML=list.map(p=>{
   const change=metric(p.priceChange?.h24),cls=change!==null?(change>=0?'positive':'negative'):'muted';
   const changeText=change!==null?(change>0?'+':'')+change.toFixed(2)+'%':'24h change unavailable';
   const depth=Math.max(3,Math.round((Number(p.liquidity.usd)||0)/max*100));
   return '<button type="button" class="premium-asset-card" data-premium-mint="'+esc(p.baseToken.address)+'"><span class="premium-asset-top"><b>'+esc(p.baseToken.symbol||'TOKEN')+'</b><span class="'+cls+'">'+changeText+'</span></span><span class="premium-asset-name">'+esc(p.baseToken.name||'Unknown token')+' · '+esc(p.quoteToken?.symbol||'PAIR')+'</span><strong>'+price(p.priceUsd)+'</strong><span class="premium-asset-meta"><span>24h Vol <b>'+money(p.volume.h24)+'</b></span><span>Liquidity <b>'+money(p.liquidity.usd)+'</b></span></span><span class="premium-depth"><i style="width:'+depth+'%"></i></span><span class="premium-asset-action">Inspect token ↗</span><small class="premium-discovery-source">'+esc(p.discoverySource)+' discovery · not a global market ranking</small></button>';
  }).join('');
  if(updated)updated.textContent='Updated '+new Date().toLocaleTimeString()+' · '+list.length+' pools · latest profiles + active boosts · sorted by 24h volume';
 }catch(e){
  grid.innerHTML='<div class="premium-trending-empty">Live Solana discovery is temporarily unavailable. No sample prices or fabricated market data are shown.</div>';
  if(updated)updated.textContent='Provider unavailable · retrying';
 }
}
function bind(){
 const grid=$('premiumTrendingGrid');
 grid?.addEventListener('click',e=>{const card=e.target.closest('[data-premium-mint]');if(!card)return;const mint=card.dataset.premiumMint;if(typeof window.climboriaOpenDexToken==='function')window.climboriaOpenDexToken(mint);else{const url=new URL(location.href);url.searchParams.set('token',mint);location.href=url.pathname+url.search;}});
 const footer=$('footerLastRefresh');
 const updated=$('updated');
 if(footer&&updated){const observer=new MutationObserver(()=>{footer.textContent=updated.textContent.replace(/^Updated /,'')});observer.observe(updated,{childList:true,characterData:true,subtree:true});}
 const detailMint=$('detailMint');
 const verify=document.createElement('a');verify.className='detail-verify-solscan';verify.target='_blank';verify.rel='noopener';verify.textContent='Verify mint on Solscan ↗';verify.href='https://solscan.io/';
 detailMint?.parentNode?.insertBefore(verify,detailMint.nextSibling);
 if(detailMint){const observer=new MutationObserver(()=>{const match=detailMint.textContent.match(/[1-9A-HJ-NP-Za-km-z]{32,50}/);if(match)verify.href='https://solscan.io/token/'+encodeURIComponent(match[0])});observer.observe(detailMint,{childList:true,characterData:true,subtree:true});}
 const copy=$('copyTokenMint');copy?.addEventListener('click',()=>{const original='Copy token mint';copy.textContent='Copied ✓';setTimeout(()=>{if(copy.textContent==='Copied ✓')copy.textContent=original},1600)});
}
bind();loadHero();loadTrending();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){hideStaleHeroMarket();loadHero();loadTrending()}});setInterval(()=>{if(document.visibilityState==='visible'){hideStaleHeroMarket();loadHero();loadTrending()}},60000);
})();
