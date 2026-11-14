import {
  decodeBase58,
  parseSolanaV0Transaction,
  validateSignedOrderTransaction,
  validateUnsignedOrderTransaction
} from "./transaction-validation.mjs";
import { readBoundedRequestJson } from "./bounded-request-json.mjs";

const MAX_ORDER_AGE_MS = 120_000;
const ORDER_CLEANUP_MS = 86_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// The Durable Object is an internal replay-lock boundary, not an excuse to
// allocate an untrusted request body before checking its size. Reuse the same
// strict, streaming byte limit as the public Worker. No JSONP, oversized
// Content-Length, invalid UTF-8 or unbounded request.text() allocations.
async function readBody(request) {
  return readBoundedRequestJson(request, 60_000);
}

export class SwapOrderStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/store" && request.method === "PUT") {
        const body = await readBody(request);
        const { requestId, transaction, taker, lastValidBlockHeight, expiresAt, resolvedLookups = [], lookupContextSlot = null, tokenAccountEvidence } = body || {};
        if (typeof requestId !== "string" || requestId.length < 8 || requestId.length > 200 ||
            !/^[A-Za-z0-9._:-]+$/.test(requestId)) return json({ error: "Invalid Jupiter request ID" }, 400);
        if (typeof transaction !== "string" || transaction.length > 4096 ||
            typeof taker !== "string" || !Number.isSafeInteger(expiresAt) ||
            expiresAt <= Date.now() || expiresAt > Date.now() + MAX_ORDER_AGE_MS ||
            (lastValidBlockHeight !== null && lastValidBlockHeight !== undefined &&
              (!Number.isSafeInteger(lastValidBlockHeight) || lastValidBlockHeight <= 0))) {
          return json({ error: "Invalid or expired order record" }, 400);
        }
        const valid = validateUnsignedOrderTransaction({ transaction, taker });
        if (!valid.ok) return json({ error: valid.error }, 422);
        if (!Array.isArray(resolvedLookups) || resolvedLookups.length > 32 ||
            (lookupContextSlot !== null && lookupContextSlot !== undefined && (!Number.isSafeInteger(lookupContextSlot) || lookupContextSlot < 0))) {
          return json({ error: "Resolved address lookup evidence is invalid" }, 400);
        }
        const sourceEvidence = tokenAccountEvidence?.source;
        const destinationEvidence = tokenAccountEvidence?.destination;
        const inputMintEvidence = tokenAccountEvidence?.inputMint;
        const outputMintEvidence = tokenAccountEvidence?.outputMint;
        const evidenceAmount = tokenAccountEvidence?.requestedAmount;
        const evidenceSlot = tokenAccountEvidence?.contextSlot;
        const validEvidenceAmount = typeof evidenceAmount === "string" && /^[1-9][0-9]{0,19}$/.test(evidenceAmount);
        const validSourceAmount = typeof sourceEvidence?.amount === "string" && /^(0|[1-9][0-9]*)$/.test(sourceEvidence.amount);
        const validMintEvidence = mint => mint && typeof mint.address === "string" &&
          Number.isInteger(mint.decimals) && mint.decimals >= 0 && mint.decimals <= 255 &&
          typeof mint.supply === "string" && /^(0|[1-9][0-9]*)$/.test(mint.supply) &&
          (mint.mintAuthority === null || typeof mint.mintAuthority === "string") &&
          (mint.freezeAuthority === null || typeof mint.freezeAuthority === "string");
        if (!Number.isSafeInteger(evidenceSlot) || evidenceSlot < 0 ||
            (lookupContextSlot !== null && evidenceSlot < lookupContextSlot) ||
            !validEvidenceAmount || !validSourceAmount || !sourceEvidence || !destinationEvidence ||
            !inputMintEvidence || !outputMintEvidence ||
            typeof sourceEvidence.address !== "string" || typeof destinationEvidence.address !== "string" ||
            decodeBase58(sourceEvidence.address).length !== 32 || decodeBase58(destinationEvidence.address).length !== 32 ||
            decodeBase58(inputMintEvidence.address).length !== 32 || decodeBase58(outputMintEvidence.address).length !== 32 ||
            sourceEvidence.address === destinationEvidence.address ||
            sourceEvidence.owner !== taker || destinationEvidence.owner !== taker ||
            typeof sourceEvidence.mint !== "string" || typeof destinationEvidence.mint !== "string" ||
            sourceEvidence.mint !== inputMintEvidence.address || destinationEvidence.mint !== outputMintEvidence.address ||
            inputMintEvidence.address === outputMintEvidence.address ||
            typeof destinationEvidence.amount !== "string" || !/^(0|[1-9][0-9]*)$/.test(destinationEvidence.amount) ||
            typeof sourceEvidence.native !== "boolean" || typeof destinationEvidence.native !== "boolean" ||
            sourceEvidence.native !== (sourceEvidence.mint === "So11111111111111111111111111111111111111112") ||
            destinationEvidence.native !== (destinationEvidence.mint === "So11111111111111111111111111111111111111112") ||
            !validMintEvidence(inputMintEvidence) || !validMintEvidence(outputMintEvidence) ||
            BigInt(sourceEvidence.amount) < BigInt(evidenceAmount)) {
          return json({ error: "Finalized token-account and mint evidence is missing, stale or inconsistent" }, 400);
        }
        const record = {
          requestId,
          transaction,
          taker,
          lastValidBlockHeight: lastValidBlockHeight ?? null,
          expiresAt,
          resolvedLookups,
          lookupContextSlot: lookupContextSlot ?? null,
          tokenAccountEvidence,
          state: "ready",
          createdAt: Date.now()
        };
        if (await this.ctx.storage.get("order")) return json({ error: "Order token has already been used" }, 409);
        // Schedule cleanup before persisting so an alarm failure cannot orphan a stored order.
        await this.ctx.storage.setAlarm(Date.now() + ORDER_CLEANUP_MS);
        const created = this.ctx.storage.transactionSync(() => {
          const existing = this.ctx.storage.kv.get("order");
          if (existing) return false;
          this.ctx.storage.kv.put("order", record);
          return true;
        });
        if (!created) return json({ error: "Order token has already been used" }, 409);
        return json({ ok: true, state: "ready" }, 201);
      }

      if (url.pathname === "/claim" && request.method === "POST") {
        const body = await readBody(request);
        if (typeof body?.signedTransaction !== "string") return json({ error: "Signed transaction is required" }, 400);
        const record = await this.ctx.storage.get("order");
        if (!record) return json({ error: "Order token was not found or has expired" }, 404);
        if (record.expiresAt <= Date.now()) return json({ error: "Order has expired; request a fresh order" }, 410);
        if (record.state !== "ready") return json({ error: "Order has already been claimed and cannot be replayed" }, 409);
        const valid = await validateSignedOrderTransaction({
          originalTransaction: record.transaction,
          signedTransaction: body.signedTransaction,
          taker: record.taker
        });
        if (!valid.ok) return json({ error: valid.error }, 400);
        const claimed = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current || current.expiresAt <= Date.now()) return { status: 410, error: "Order has expired" };
          if (current.state !== "ready") return { status: 409, error: "Order has already been claimed and cannot be replayed" };
          this.ctx.storage.kv.put("order", { ...current, state: "executing", claimedAt: Date.now() });
          return {
            status: 200,
            record: {
              requestId: current.requestId,
              lastValidBlockHeight: current.lastValidBlockHeight
            }
          };
        });
        if (claimed.status !== 200) return json({ error: claimed.error }, claimed.status);
        return json({ ok: true, record: claimed.record });
      }

      if (url.pathname === "/settle" && request.method === "POST") {
        const body = await readBody(request);
        if (!["completed", "failed", "uncertain"].includes(body?.state)) {
          return json({ error: "Invalid terminal order state" }, 400);
        }
        const settled = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current) return false;
          if (current.state !== "executing") return false;
          this.ctx.storage.kv.put("order", {
            ...current,
            state: body.state,
            settledAt: Date.now(),
            signature: typeof body.signature === "string" ? body.signature.slice(0, 100) : null
          });
          return true;
        });
        if (!settled) return json({ error: "Order is not in an executable state" }, 409);
        return json({ ok: true, state: body.state });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      // Reject malformed caller bodies with fixed client-safe codes. Never
      // reflect arbitrary storage/crypto/provider exceptions that could leak
      // secrets, user payloads or Worker internals.
      const reason = error instanceof Error ? error.message : "";
      const badRequest = new Set([
        "Content-Type must be application/json",
        "Invalid Content-Length", "Request body too large", "Invalid JSON body"
      ]);
      return badRequest.has(reason)
        ? json({ error: reason }, 400)
        : json({ error: "Order store failed securely" }, 503);
    }
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
