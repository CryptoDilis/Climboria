import test from "node:test";
import assert from "node:assert/strict";
import { safeRaydiumOperatorError } from "../tools/raydium-v4-safe-error.mjs";

test("never echoes private HTTPS RPC endpoint or credentials from fetch failures", () => {
  const secret = "https://private-rpc.example/rpc?api-key=SECRET_DO_NOT_PRINT";
  for (const error of [
    new TypeError("fetch failed: " + secret),
    new Error("HTTP 403 for " + secret),
    new Error("Raydium V4 trusted-pool discovery: " + secret),
    new Error("URL is invalid: " + secret),
    { message: secret }
  ]) {
    const safe = safeRaydiumOperatorError(error);
    assert.doesNotMatch(safe, /SECRET_DO_NOT_PRINT|private-rpc\.example|api-key/);
    assert.match(safe, /suppressed/);
  }
});

test("preserves only safe operator-actionable input diagnostics", () => {
  assert.equal(
    safeRaydiumOperatorError(new Error("CLIMBORIA_SOLANA_RPC_URL must be configured in the operator environment")),
    "CLIMBORIA_SOLANA_RPC_URL must be configured in the operator environment"
  );
  assert.equal(safeRaydiumOperatorError(new Error("Invalid --min-slot")), "Invalid --min-slot");
  assert.equal(
    safeRaydiumOperatorError(new Error("Raydium V4 trusted-pool discovery: unsupported or unspecified Raydium network")),
    "invalid pool address or Raydium network"
  );
});

test("does not trust arbitrary error objects or custom thrown strings", () => {
  assert.match(safeRaydiumOperatorError("rpc-secret"), /suppressed/);
  assert.match(safeRaydiumOperatorError(null), /suppressed/);
});
