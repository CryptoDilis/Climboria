/** Read-only unconnected OHLCV contract parser. Not imported by production Worker/DEX. */
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
    const raw = row.slice(0, 6);
    // Number(null), Number("") and Number(false) all equal 0. Missing
    // provider volume must not be reported as a genuine zero-volume candle.
    if (raw.some(value => typeof value !== "number" &&
        (typeof value !== "string" || !value.trim()))) {
      throw new Error(`OHLCV candle ${index} contains a missing or invalid field`);
    }
    const values = raw.map(Number);
    if (!values.every(finite)) throw new Error(`OHLCV candle ${index} contains a non-finite value`);
    const [timestamp, open, high, low, close, volume] = values;
    if ([open, high, low, close].some(value => value <= 0)) {
      throw new Error(`OHLCV candle ${index} has non-positive price`);
    }
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

  const rows = body.data?.attributes?.ohlcv_list;
  if (!Array.isArray(rows)) throw new Error("GeckoTerminal OHLCV list missing or invalid");
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


/**
 * Match GeckoTerminal's query token=base/quote to the returned USD series.
 *
 * The API's token=quote response can flip meta.base/meta.quote to report USD
 * candles for the original quote token. Therefore the request parameter
 * is NOT the low-level requestedOrientation (which is relative to response
 * meta). In both cases the returned meta.base must be the selected token.
 *
 * Does not prove that the OHLC response belongs to the requested pool:
 * GeckoTerminal's OHLC payload does not reliably echo the pool address.
 * The calling capture must bind its HTTP URL to the selected pool and record
 * that provenance independently. This helper performs no network requests.
 */
export function normalizeGeckoTerminalRequestedPoolOhlcv({
  status,
  headers = null,
  body,
  originalPool,
  requestedTokenSide
}) {
  if (requestedTokenSide !== "base" && requestedTokenSide !== "quote") {
    throw new Error("GeckoTerminal request token side must be base or quote");
  }
  if (!originalPool || typeof originalPool.address !== "string" || !originalPool.address.trim() ||
      typeof originalPool.baseTokenAddress !== "string" || !originalPool.baseTokenAddress.trim() ||
      typeof originalPool.quoteTokenAddress !== "string" || !originalPool.quoteTokenAddress.trim() ||
      originalPool.baseTokenAddress === originalPool.quoteTokenAddress) {
    throw new Error("Original selected pool address and distinct base/quote mints are required");
  }
  const selected = requestedTokenSide === "base"
    ? originalPool.baseTokenAddress : originalPool.quoteTokenAddress;
  const other = requestedTokenSide === "base"
    ? originalPool.quoteTokenAddress : originalPool.baseTokenAddress;
  const result = normalizeGeckoTerminalOhlcv({
    status,
    headers,
    body,
    expectedPool: { address: originalPool.address, baseTokenAddress: selected, quoteTokenAddress: other },
    selectedTokenAddress: selected,
    requestedOrientation: "base"
  });
  return { ...result, requestedTokenSide, returnedSeriesTokenPosition: "base" };
}
