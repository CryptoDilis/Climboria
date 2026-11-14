/**
 * Fail-closed incoming JSON parser for Cloudflare Worker POST endpoints.
 * The former request.text() allocated the entire untrusted request before
 * checking its byte length. This parser enforces the limit while streaming.
 *
 * Never include request bodies, header values or stream exceptions in errors.
 * Both wallet-signable order creation and execution stay hard source-disabled.
 */
export async function readBoundedRequestJson(request, maxBytes = 40000) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536) {
    throw new Error("Invalid JSON request byte limit");
  }
  const contentType = request?.headers?.get?.("content-type");
  if (typeof contentType !== "string" ||
      contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new Error("Content-Type must be application/json");
  }
  const length = request.headers.get("content-length");
  if (length !== null) {
    // Prevent coercion of noncanonical values (NaN/Infinity/scientific
    // notation/negative) and reject huge declared lengths before any reads.
    if (!/^[0-9]{1,20}$/.test(length)) throw new Error("Invalid Content-Length");
    if (BigInt(length) > BigInt(maxBytes)) throw new Error("Request body too large");
  }
  if (!request.body || typeof request.body.getReader !== "function") {
    throw new Error("Invalid JSON body");
  }
  let reader;
  try { reader = request.body.getReader(); }
  catch { throw new Error("Invalid JSON body"); }
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error("Invalid JSON body");
      size += value.byteLength;
      if (size > maxBytes) {
        // Read only until the first over-limit chunk, never buffer the rest.
        try { await reader.cancel(); } catch {}
        throw new Error("Request body too large");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error &&
        (error.message === "Request body too large" ||
         error.message === "Invalid JSON body")) throw error;
    throw new Error("Invalid JSON body");
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  if (size === 0) throw new Error("Invalid JSON body");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("Invalid JSON body"); }
  try { return JSON.parse(text); }
  catch { throw new Error("Invalid JSON body"); }
}
