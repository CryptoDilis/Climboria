import {
  decodeBase58,
  encodeBase58,
  parseSolanaV0Transaction,
  validateSignedOrderTransaction,
  validateUnsignedOrderTransaction
} from "./transaction-validation.mjs";
import { readBoundedRequestJson } from "./bounded-request-json.mjs";

const MAX_ORDER_AGE_MS = 120_000;
const ORDER_CLEANUP_MS = 86_400_000;
// Preserve claimed, provider-unconfirmed and unknown-outcome replay evidence
// long enough for operator investigation. This is finite retention, NOT
// indefinite idempotency or an independently authenticated chain record.
const CLAIMED_ORDER_RETENTION_MS = 30 * 86_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// The Durable Object is an internal replay-lock boundary, not an excuse to
// allocate an untrusted request body before checking its size. Reuse the same
// strict, streaming byte limit as the public Worker. No JSONP, oversized
// Content-Length, invalid UTF-8 or whole-body allocation.
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
        // Bind the one-time order claim to the actual authenticated
        // transaction ID (the first signature) before ANY upstream execute.
        // The signature cannot be chosen by the Jupiter response or caller:
        // validateSignedOrderTransaction already verified its Ed25519 proof.
        const claimedSignature = encodeBase58(
          parseSolanaV0Transaction(body.signedTransaction).signatures[0]
        );
        const claimed = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current || current.expiresAt <= Date.now()) return { status: 410, error: "Order has expired" };
          if (current.state !== "ready") return { status: 409, error: "Order has already been claimed and cannot be replayed" };
          const claimedAt = Date.now();
          this.ctx.storage.kv.put("order", {
            ...current, state: "executing", claimedAt, claimedSignature,
            retainUntil: claimedAt + CLAIMED_ORDER_RETENTION_MS
          });
          return {
            status: 200,
            record: {
              requestId: current.requestId,
              lastValidBlockHeight: current.lastValidBlockHeight,
              claimedSignature
            }
          };
        });
        if (claimed.status !== 200) return json({ error: claimed.error }, claimed.status);
        return json({ ok: true, record: claimed.record });
      }

      if (url.pathname === "/settle" && request.method === "POST") {
        const body = await readBody(request);
        // Neither provider "Success" nor "Failed" is finalized chain
        // settlement. Only explicit provider-observation states or unknown
        // are allowed here; completed AND final failed need a separately
        // audited on-chain reconciliation path that does not yet exist.
        if (!["provider_success_unconfirmed", "provider_failure_unconfirmed", "uncertain"].includes(body?.state)) {
          return json({ error: "Invalid terminal order state" }, 400);
        }
        const settled = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current) return false;
          if (current.state !== "executing" ||
              typeof current.claimedSignature !== "string" ||
              !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(current.claimedSignature)) return false;
          // A returned provider signature must match the authenticated
          // claimed signature byte-for-byte; no arbitrary signatures or
          // cross-order receipts, even if Jupiter reports Success.
          const suppliedSignature = body.signature === undefined || body.signature === null
            ? null : body.signature;
          if (suppliedSignature !== null && suppliedSignature !== current.claimedSignature) return false;
          if (["provider_success_unconfirmed", "provider_failure_unconfirmed"].includes(body.state) &&
              suppliedSignature !== current.claimedSignature) return false;
          this.ctx.storage.kv.put("order", {
            ...current,
            state: body.state,
            settledAt: Date.now(),
            // An unknown provider outcome still has an authenticated on-chain
            // transaction ID from /claim. Never replace it with null: operators
            // must reconcile that exact signature before any retry.
            signature: suppliedSignature ?? current.claimedSignature
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
    // Alarm and /claim can interleave at ANY await. A prior asynchronous
    // get("order") followed by deleteAll() could erase an order claimed in
    // between, destroying the authenticated signature and replay lock.
    // Read + optionally delete the order in ONE synchronous DO transaction.
    const now = Date.now();
    const decision = this.ctx.storage.transactionSync(() => {
      const record = this.ctx.storage.kv.get("order");
      if (!record) return { action: "empty" };
      if (record.state === "ready") {
        this.ctx.storage.kv.delete("order");
        return { action: "deleted" };
      }

      let retainUntil = record.retainUntil;
      if (!Number.isSafeInteger(retainUntil) || retainUntil <= 0) {
        // Legacy claim migration remains conservative and atomic too.
        // Prefer preserving evidence on uncertain/malformed timestamps.
        const base = Number.isSafeInteger(record.claimedAt) &&
          record.claimedAt > 0 ? record.claimedAt : now;
        retainUntil = Math.max(now + ORDER_CLEANUP_MS, base + CLAIMED_ORDER_RETENTION_MS);
        this.ctx.storage.kv.put("order", { ...record, retainUntil });
      }
      if (now >= retainUntil) {
        this.ctx.storage.kv.delete("order");
        return { action: "deleted" };
      }
      return { action: "reschedule", retainUntil };
    });

    if (decision.action === "reschedule") {
      // If this fails, Cloudflare retries the alarm; the claimed order is
      // already durable and is NEVER deleted to "fix" the schedule error.
      await this.ctx.storage.setAlarm(decision.retainUntil);
    }
  }
}
