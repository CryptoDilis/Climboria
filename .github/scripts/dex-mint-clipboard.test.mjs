import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Execute the actual production DEX click handler without network, wallets,
// browser permissions, clipboard writes, or live providers.
const html = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
const premium = readFileSync(new URL("../../dex/premium-terminal.js", import.meta.url), "utf8");
const startMarker = "$('copyTokenMint').addEventListener('click',async()=>";
const endMarker = "\n$('watchToken').addEventListener";
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "Expected real DEX mint-copy handler in index.html");
const handlerSource = html.slice(start, end).trim();
const MINT = "So11111111111111111111111111111111111111112";

function harness(writeText, activeCommunityMint = MINT) {
  const listeners = [];
  const timeouts = [];
  const button = {
    textContent: "Copy token mint",
    addEventListener(event, callback) {
      assert.equal(event, "click");
      listeners.push(callback);
    }
  };
  runInNewContext(handlerSource, {
    $: id => {
      assert.equal(id, "copyTokenMint");
      return button;
    },
    activeCommunityMint,
    navigator: { clipboard: { writeText } },
    setTimeout: callback => { timeouts.push(callback); return timeouts.length; }
  }, { filename: "dex/index.html" });
  assert.equal(listeners.length, 1, "Only the authoritative DEX handler must be registered");
  return { button, click: () => listeners[0](), timeouts };
}

test("premium add-on must never report copied or register a second mint-copy handler", () => {
  assert.doesNotMatch(premium, /copyTokenMint/, "Remove misleading second click handler from premium script");
});

test("mint copy stays pending until actual clipboard write succeeds", async () => {
  let resolveWrite;
  let capturedMint;
  const pending = new Promise(resolve => { resolveWrite = resolve; });
  const h = harness(mint => { capturedMint = mint; return pending; });
  const completion = h.click();
  assert.equal(capturedMint, MINT);
  assert.equal(h.button.textContent, "Copy token mint", "No early success before clipboard resolves");
  resolveWrite();
  await completion;
  assert.equal(h.button.textContent, "Copied");
  assert.equal(h.timeouts.length, 1, "Success reset is scheduled after verified copy");
});

test("clipboard rejection never claims copied", async () => {
  const h = harness(() => Promise.reject(new Error("Clipboard permission denied")));
  await h.click();
  assert.equal(h.button.textContent, "Copy unavailable");
  assert.equal(h.timeouts.length, 0);
});

test("without an active token mint no clipboard write or success is allowed", async () => {
  let writes = 0;
  const h = harness(async () => { writes += 1; }, null);
  await h.click();
  assert.equal(writes, 0);
  assert.equal(h.button.textContent, "Copy token mint");
});
