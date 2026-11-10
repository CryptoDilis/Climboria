import {
  parseSolanaV0Transaction,
  validateSignedOrderTransaction,
  validateUnsignedOrderTransaction
} from "./transaction-validation.mjs";

const MAX_ORDER_AGE_MS = 120_000;
const ORDER_CLEANUP_MS = 86_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function readBody(request) {
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > 60_000) throw new Error("Order-store request is too large");
  try { return JSON.parse(raw); } catch { throw new Error("Invalid order-store JSON"); }
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
        const { requestId, transaction, taker, lastValidBlockHeight, expiresAt } = body || {};
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
        const record = {
          requestId,
          transaction,
          taker,
          lastValidBlockHeight: lastValidBlockHeight ?? null,
          expiresAt,
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
      return json({ error: error instanceof Error ? error.message : "Order store failed" }, 503);
    }
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
