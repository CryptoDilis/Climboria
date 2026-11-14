/**
 * Bounded, fail-closed JSON reader for third-party Swap/DEX metadata.
 *
 * Never expose provider response bytes or URL/credential-bearing exceptions.
 * Null means empty, malformed, truncated, oversized, or unreadable response.
 * The caller must treat null as unavailable, NEVER as a valid order/quote.
 */
export async function readBoundedProviderJson(response, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 ||
      maxBytes > 1024 * 1024) {
    throw new Error("Invalid provider response byte limit");
  }
  if (!response?.body || typeof response.body.getReader !== "function") return null;
  const length = response.headers?.get?.("content-length");
  if (length !== null && /^\d+$/.test(length) && Number(length) > maxBytes) {
    // Do not download a response that advertises excessive size.
    try { await response.body.cancel(); } catch {}
    return null;
  }
  let reader;
  try { reader = response.body.getReader(); } catch { return null; }
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return null;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { return null; }
  } catch {
    return null;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}
