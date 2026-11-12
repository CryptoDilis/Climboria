const finite = Number.isFinite;

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const key = Object.keys(headers).find(item => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

function tokenAddress(token, label) {
  const address = token?.address;
  if (typeof address !== "string" || !address.trim()) {
    throw new Error(`GeckoTerminal response is missing ${label} token address metadata`);
  }
  return address;
}

function normalizeRows(rows) {
  if (rows == null) return [];
  if (!Array.isArray(rows)) throw new Error("GeckoTerminal OHLCV rows must be an array");
  return rows.map((row, index) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new Error(`OHLCV candle ${index} must contain timestamp, open, high, low, close and volume`);
    }
    const values = row.slice(0, 6).map(Number);
    if (!values.every(finite)) throw new Error(`OHLCV candle ${index} contains a non-finite value`);
    const [timestamp, open, high, low, close, volume] = values;
    if (!Number.isSafeInteger(timestamp) || timestamp < 1_000_000_000 || timestamp > 99_999_999_999) {
      throw new Error(`OHLCV candle ${index} timestamp must be Unix seconds`);
    }
    if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) {
      throw new Error(`OHLCV candle ${index} violates high/low invariants`);
    }
    if (volume < 0) throw new Error(`OHLCV candle ${index} has negative volume`);
    return { timestamp, open, high, low, close, volume };
  });
}

/**
 * Validate and normalize one GeckoTerminal OHLCV response.
 * Pool identity is supplied by the caller because the OHLCV payload itself
 * does not reliably echo the requested pool address. Volume denomination is
 * deliberately left unknown; values are preserved exactly as reported.
 */
export function normalizeGeckoTerminalOhlcv({
  status,
  headers = null,
  body,
  expectedPool,
  selectedTokenAddress,
  requestedOrientation
}) {
  if (!Number.isInteger(status)) throw new Error("HTTP status is required");
  if (status === 429) {
    const retryAfter = headerValue(headers, "retry-after");
    throw new Error(`GeckoTerminal rate limited the request (HTTP 429)${retryAfter ? `; Retry-After: ${retryAfter}` : ""}`);
  }
  if (status >= 500) throw new Error(`GeckoTerminal server error (HTTP ${status})`);
  if (status < 200 || status >= 300) throw new Error(`GeckoTerminal request failed (HTTP ${status})`);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("GeckoTerminal response body must be an object");

  const meta = body.meta;
  const baseAddress = tokenAddress(meta?.base, "base");
  const quoteAddress = tokenAddress(meta?.quote, "quote");
  if (!expectedPool || typeof expectedPool.baseTokenAddress !== "string" || typeof expectedPool.quoteTokenAddress !== "string") {
    throw new Error("Expected pool base/quote token identities are required");
  }
  const expected = new Set([expectedPool.baseTokenAddress, expectedPool.quoteTokenAddress]);
  if (baseAddress === quoteAddress || !expected.has(baseAddress) || !expected.has(quoteAddress) ||
      baseAddress !== expectedPool.baseTokenAddress && baseAddress !== expectedPool.quoteTokenAddress ||
      quoteAddress !== expectedPool.baseTokenAddress && quoteAddress !== expectedPool.quoteTokenAddress) {
    throw new Error("GeckoTerminal response token metadata does not match the expected pool identities");
  }
  if (baseAddress !== expectedPool.baseTokenAddress || quoteAddress !== expectedPool.quoteTokenAddress) {
    throw new Error("GeckoTerminal response base/quote pool identity is reversed or mismatched");
  }
  if (requestedOrientation !== "base" && requestedOrientation !== "quote") {
    throw new Error("Requested orientation must be base or quote");
  }
  const expectedSelected = requestedOrientation === "base" ? baseAddress : quoteAddress;
  if (selectedTokenAddress !== expectedSelected) {
    throw new Error("Selected token identity does not match requested OHLCV orientation");
  }

  const rows = body.data?.attributes?.ohlcv_list ?? [];
  const candles = normalizeRows(rows);
  const orderAscending = candles.every((candle, i) => i === 0 || candle.timestamp > candles[i - 1].timestamp);
  const orderDescending = candles.every((candle, i) => i === 0 || candle.timestamp < candles[i - 1].timestamp);
  if (candles.length > 1 && !orderAscending && !orderDescending) {
    throw new Error("OHLCV timestamps must be strictly monotonic; duplicate or unordered candles found");
  }
  if (orderDescending) candles.reverse();

  return {
    status: candles.length ? "ok" : "empty",
    poolAddress: expectedPool.address ?? null,
    baseTokenAddress: baseAddress,
    quoteTokenAddress: quoteAddress,
    selectedTokenAddress,
    orientation: requestedOrientation,
    priceCurrency: "USD",
    timestampUnit: "unix-seconds",
    candles,
    gapsPreserved: true,
    volume: { values: candles.map(candle => candle.volume), denomination: "unverified-provider-units" },
    cache: {
      cacheControl: headerValue(headers, "cache-control"),
      age: headerValue(headers, "age"),
      etag: headerValue(headers, "etag"),
      lastModified: headerValue(headers, "last-modified"),
      cfCacheStatus: headerValue(headers, "cf-cache-status"),
      retryAfter: headerValue(headers, "retry-after")
    }
  };
}
