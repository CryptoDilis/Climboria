const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableTransportError(error) {
  return error?.name === "AbortError"
    || error?.name === "TimeoutError"
    || error instanceof TypeError;
}

function retryAfterMs(response, now = Date.now()) {
  const value = response?.headers?.get?.("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null;
}

export async function fetchWithRetry(fetchImpl, input, initForAttempt = {}, options = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  const maxAttempts = Number.isInteger(options.maxAttempts)
    ? Math.max(1, Math.min(options.maxAttempts, 6))
    : 4;
  const baseDelayMs = Number.isInteger(options.baseDelayMs)
    ? Math.max(0, options.baseDelayMs)
    : 500;
  const maxDelayMs = Number.isInteger(options.maxDelayMs)
    ? Math.max(0, options.maxDelayMs)
    : 4000;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const attempts = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const init = typeof initForAttempt === "function" ? initForAttempt(attempt) : initForAttempt;
    let response;
    try {
      response = await fetchImpl(input, init);
    } catch (error) {
      attempts.push({
        attempt,
        status: null,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!isRetryableTransportError(error) || attempt === maxAttempts) {
        error.retryAttempts = attempts;
        throw error;
      }
      await sleep(Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1))));
      continue;
    }

    attempts.push({ attempt, status: response.status });
    if (!RETRYABLE_HTTP_STATUSES.has(response.status) || attempt === maxAttempts) {
      return { response, attempts };
    }

    try {
      await response.body?.cancel?.();
    } catch {
      // Discarding a retry response is best-effort; preserve the original status.
    }
    const serverDelay = retryAfterMs(response);
    const delay = serverDelay === null
      ? baseDelayMs * (2 ** (attempt - 1))
      : serverDelay;
    await sleep(Math.min(maxDelayMs, delay));
  }

  throw new Error("HTTP retry loop ended without a response");
}
