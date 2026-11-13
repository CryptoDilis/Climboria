import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const outputPath = 'artifacts/geckoterminal-ohlcv-contract.json';
const pool = {
  network: 'solana',
  address: 'C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg',
  dexScreenerPair: 'C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg',
  baseToken: {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP'
  },
  quoteToken: {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'WSOL'
  }
};
const query = new URLSearchParams({
  aggregate: '15',
  limit: '5',
  currency: 'usd'
});
const capturedHeaders = [
  'date',
  'cache-control',
  'age',
  'etag',
  'last-modified',
  'expires',
  'x-cache',
  'cf-cache-status',
  'content-type',
  'retry-after',
  'ratelimit-limit',
  'ratelimit-remaining',
  'ratelimit-reset'
];

function readHeaders(headers) {
  return Object.fromEntries(capturedHeaders.map(name => [name, headers.get(name)]));
}

function validateCandles(rows, orientation) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${orientation}: response has no OHLCV rows`);
  }
  const normalized = rows.map((row, index) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new Error(`${orientation}: candle ${index} is not [timestamp, open, high, low, close, volume]`);
    }
    const values = row.slice(0, 6).map(Number);
    if (!values.every(Number.isFinite)) {
      throw new Error(`${orientation}: candle ${index} contains a non-finite value`);
    }
    const [timestamp, open, high, low, close, volume] = values;
    if (!Number.isInteger(timestamp) || timestamp < 1_000_000_000 || timestamp > 99_999_999_999) {
      throw new Error(`${orientation}: candle ${index} timestamp is not plausible Unix seconds: ${row[0]}`);
    }
    if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) {
      throw new Error(`${orientation}: candle ${index} violates OHLC high/low invariants`);
    }
    if (volume < 0) throw new Error(`${orientation}: candle ${index} has negative volume`);
    return { timestamp, open, high, low, close, volume };
  });
  const ascending = normalized.every((candle, index) => index === 0 || candle.timestamp > normalized[index - 1].timestamp);
  const descending = normalized.every((candle, index) => index === 0 || candle.timestamp < normalized[index - 1].timestamp);
  if (!ascending && !descending) {
    throw new Error(`${orientation}: candle timestamps are not strictly monotonic`);
  }
  return {
    rowCount: normalized.length,
    timestampOrder: ascending ? 'ascending' : 'descending',
    firstTimestamp: normalized[0].timestamp,
    lastTimestamp: normalized.at(-1).timestamp,
    firstCandle: normalized[0],
    lastCandle: normalized.at(-1),
    sample: normalized
  };
}

async function captureOrientation(orientation) {
  const url = new URL(
    `https://api.geckoterminal.com/api/v2/networks/${pool.network}/pools/${pool.address}/ohlcv/minute`
  );
  for (const [key, value] of query) url.searchParams.set(key, value);
  url.searchParams.set('token', orientation);
  const startedAt = new Date().toISOString();
  const response = await fetch(url, {
    headers: {
      accept: 'application/json;version=20230203',
      'user-agent': 'Climboria-OHLCV-Contract-Audit/1.0'
    },
    signal: AbortSignal.timeout(20000)
  });
  const receivedAt = new Date().toISOString();
  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(`${orientation}: invalid JSON response (HTTP ${response.status})`);
  }
  const record = {
    orientation,
    requestedToken: orientation === 'base' ? pool.baseToken : pool.quoteToken,
    request: {
      url: url.toString(),
      startedAt,
      receivedAt,
      accept: 'application/json;version=20230203'
    },
    httpStatus: response.status,
    responseHeaders: readHeaders(response.headers),
    responseMeta: body?.meta ?? null,
    errors: body?.errors ?? null
  };
  if (!response.ok) {
    record.error = `HTTP ${response.status}: ${bodyText.slice(0, 500)}`;
    return record;
  }
  const rows = body?.data?.attributes?.ohlcv_list;
  record.validation = validateCandles(rows, orientation);
  return record;
}

await mkdir(dirname(outputPath), { recursive: true });
const capture = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  provider: 'GeckoTerminal',
  endpoint: '/networks/{network}/pools/{pool_address}/ohlcv/{timeframe}',
  pool,
  parameters: {
    timeframe: 'minute',
    aggregate: 15,
    limit: 5,
    currency: 'usd',
    orientations: ['base', 'quote'],
    apiVersion: '20230203'
  },
  documentedConstraints: {
    publicCacheSeconds: 60,
    statedPostConfirmationUpdateSeconds: '2-3 (subject to network availability)',
    approximatePublicRequestsPerMinute: 10,
    beta: true
  },
  observations: [],
  errors: []
};

for (const orientation of ['base', 'quote']) {
  try {
    const observation = await captureOrientation(orientation);
    capture.observations.push(observation);
    if (!observation.validation) {
      capture.errors.push(`${orientation}: ${observation.error ?? 'OHLCV validation missing'}`);
    }
  } catch (error) {
    capture.errors.push(`${orientation}: ${error.message}`);
  }
}
capture.status = capture.observations.length === 2 && capture.errors.length === 0
  ? 'captured'
  : 'incomplete';
await writeFile(outputPath, JSON.stringify(capture, null, 2) + '\n');
console.log(JSON.stringify({
  status: capture.status,
  outputPath,
  capturedAt: capture.capturedAt,
  observations: capture.observations.map(item => ({
    orientation: item.orientation,
    httpStatus: item.httpStatus,
    headers: item.responseHeaders,
    validation: item.validation ? {
      rowCount: item.validation.rowCount,
      timestampOrder: item.validation.timestampOrder,
      firstTimestamp: item.validation.firstTimestamp,
      lastTimestamp: item.validation.lastTimestamp,
      firstClose: item.validation.firstCandle.close,
      lastClose: item.validation.lastCandle.close
    } : null,
    error: item.error ?? null
  })),
  errors: capture.errors
}, null, 2));
if (capture.status !== 'captured') process.exitCode = 1;
