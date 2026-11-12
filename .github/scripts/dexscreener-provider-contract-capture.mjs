import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const outputPath = 'artifacts/dexscreener-provider-contract.json';
const targets = [
  {
    label: 'JUP expected base-side observation',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    expectedSide: 'base'
  },
  {
    label: 'USDC expected quote-side observation',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    expectedSide: 'quote'
  }
];

function projectPair(pair) {
  return {
    chainId: pair.chainId ?? null,
    dexId: pair.dexId ?? null,
    pairAddress: pair.pairAddress ?? null,
    baseToken: pair.baseToken ?? null,
    quoteToken: pair.quoteToken ?? null,
    priceNative: pair.priceNative ?? null,
    priceUsd: pair.priceUsd ?? null,
    txns: pair.txns ?? null,
    volume: pair.volume ?? null,
    priceChange: pair.priceChange ?? null,
    liquidity: pair.liquidity ?? null,
    fdv: pair.fdv ?? null,
    marketCap: pair.marketCap ?? null,
    pairCreatedAt: pair.pairCreatedAt ?? null
  };
}

async function fetchPools(target) {
  const url = `https://api.dexscreener.com/token-pairs/v1/solana/${target.mint}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Climboria-Provider-Contract-Audit/1.0'
        },
        signal: AbortSignal.timeout(15000)
      });
      const bodyText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${bodyText.slice(0, 500)}`);
      let pairs;
      try { pairs = JSON.parse(bodyText); }
      catch { throw new Error('Provider returned invalid JSON'); }
      if (!Array.isArray(pairs)) throw new Error('Expected token-pairs endpoint to return a JSON array');
      const observed = { base: [], quote: [], unrelated: 0 };
      for (const pair of pairs) {
        const base = pair?.baseToken?.address;
        const quote = pair?.quoteToken?.address;
        if (base === target.mint) observed.base.push(pair);
        else if (quote === target.mint) observed.quote.push(pair);
        else observed.unrelated += 1;
      }
      if (observed.unrelated) {
        throw new Error(`Provider returned ${observed.unrelated} pair(s) not containing requested mint`);
      }
      if (!observed.base.length && !observed.quote.length) {
        throw new Error('No returned pair contains the requested mint');
      }
      const sample = (items) => items
        .sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0))
        .slice(0, 12)
        .map(projectPair);
      return {
        label: target.label,
        requestedMint: target.mint,
        expectedSide: target.expectedSide,
        requestUrl: url,
        httpStatus: response.status,
        responsePairCount: pairs.length,
        observedSideCounts: { base: observed.base.length, quote: observed.quote.length },
        baseSideSamples: sample(observed.base),
        quoteSideSamples: sample(observed.quote)
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`${target.label} failed after 3 attempts: ${lastError?.message ?? 'unknown error'}`);
}

await mkdir(dirname(outputPath), { recursive: true });
const capture = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  provider: 'DexScreener',
  endpoint: '/token-pairs/v1/{chainId}/{tokenAddress}',
  evidenceScope: 'Live public response sample. Field orientation is recorded, not inferred from schema.',
  targets: [],
  errors: []
};
let failed = false;
for (const target of targets) {
  try {
    const result = await fetchPools(target);
    const count = result.observedSideCounts[result.expectedSide];
    if (!count) {
      failed = true;
      capture.errors.push(`${target.label}: no pool observed with requested mint on expected ${result.expectedSide} side; got ${JSON.stringify(result.observedSideCounts)}`);
    }
    capture.targets.push(result);
  } catch (error) {
    failed = true;
    capture.errors.push(error.message);
  }
}
const allSides = capture.targets.reduce((sum, target) => ({
  base: sum.base + target.observedSideCounts.base,
  quote: sum.quote + target.observedSideCounts.quote
}), { base: 0, quote: 0 });
capture.aggregateObservedSideCounts = allSides;
capture.status = failed ? 'incomplete' : 'captured';
await writeFile(outputPath, JSON.stringify(capture, null, 2) + '\n');
console.log(JSON.stringify({
  status: capture.status,
  outputPath,
  capturedAt: capture.capturedAt,
  aggregateObservedSideCounts: allSides,
  errors: capture.errors
}, null, 2));
if (failed) process.exitCode = 1;
