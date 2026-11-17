#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { gitBlobDigest } from "./dex-swap-jupiter-source-provenance.mjs";
import {
  SOURCE_FILES, readExactSourceText, inspectJupiterRuntimeContract,
  auditExactUpstreamContract
} from "./dex-swap-jupiter-runtime-contract-audit.mjs";

const library = [
  "const bundleName = \`plugin-\${require('../package.json').version}\`;",
  "|| 'https://plugin.jup.ag'",
  "await loadRemote('jupiter-load-script-app', \`\${scriptDomain}/\${bundleName}-app.js\`, 'text/javascript');",
  "document.createElement('script')",
  "el.src = href;",
  "document.head.append(el);",
  "const stylesheetUrls = [",
  "\`\${scriptDomain}/\${bundleName}-Tailwind.css\`",
  "\`\${scriptDomain}/scoped-preflight-v4.css\`",
  "\`\${scriptDomain}/\${bundleName}-Jupiter.css\`",
  "'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Poppins&display=swap'",
  "<ShadowDomContainer stylesheetUrls={stylesheetUrls}>"
].join("\n");
const shadow = [
  "stylesheetUrls.map((url) =>",
  "fetch(url).then((res) =>",
  "return res.text();",
  "document.createElement('style')",
  "styleEl.textContent = cssText;",
  "newShadowRoot.appendChild(styleEl)"
].join("\n");

test("static upstream contract always classifies missing browser runtime SRI as release NO-GO", () => {
  const report = inspectJupiterRuntimeContract(library, shadow);
  assert.equal(report.releaseApproved, false);
  assert.equal(report.browserEnforcesSriOnDynamicAppScript, false);
  assert.equal(report.browserVerifiesFetchedCssBeforeShadowDomInsertion, false);
  assert.equal(report.completeThirdPartyNetworkOrFontGraphVerified, false);
  assert.equal(report.rehostingTermsVerified, false);
  assert.equal(report.physicalWalletAcceptanceVerified, false);
  assert.deepEqual(report.dynamicCss, [
    "plugin-1.0.18-Tailwind.css",
    "scoped-preflight-v4.css",
    "plugin-1.0.18-Jupiter.css"
  ]);
  assert.equal(report.externalStylesheet, "https://fonts.googleapis.com/css2");
});

test("source changes to versioned app, stylesheet loaders, font or Shadow DOM must fail closed", () => {
  const variants = [
    library.replace("plugin-1.0.18", "plugin-9.9.9"), // not a literal in source => separately reviewed
    library.replace("jupiter-load-script-app", "unknown-script"),
    library.replace("plugin.jup.ag", "unreviewed.example"),
    library.replace("document.head.append(el);", "document.body.append(el);"),
    library.replace("-Tailwind.css", "-new.css"),
    library.replace("scoped-preflight-v4.css", "preflight-drift.css"),
    library.replace("-Jupiter.css", "-different.css"),
    library.replace("fonts.googleapis.com", "fonts.evil.example"),
    library.replace("<ShadowDomContainer stylesheetUrls={stylesheetUrls}>",
      "<ShadowDomContainer />")
  ].filter(v => v !== library);
  assert.ok(variants.length >= 8);
  for (const altered of variants) {
    assert.throws(() => inspectJupiterRuntimeContract(altered, shadow),
      /Unreviewed Jupiter runtime drift/);
  }
  for (const changed of [
    shadow.replace("fetch(url).then((res) =>", "fetch(url, other).then((res) =>"),
    shadow.replace("res.text();", "res.json();"),
    shadow.replace("styleEl.textContent = cssText;", "styleEl.textContent = other;"),
    shadow.replace("newShadowRoot.appendChild(styleEl)", "document.head.appendChild(styleEl)")
  ]) assert.throws(() => inspectJupiterRuntimeContract(library, changed),
    /Unreviewed Jupiter runtime drift/);
});

test("unreviewed new-integrity mechanism must also request a new code review", () => {
  assert.throws(() => inspectJupiterRuntimeContract(
    library + "\nel.integrity = 'sha384-new';", shadow),
    /independent review required/);
  assert.throws(() => inspectJupiterRuntimeContract(
    library, shadow + "\ncrypto.subtle.digest()"),
    /independent review required/);
});

test("exact source downloader is constrained, byte-counted, SHA-bound and does not execute JS", async () => {
  const raw = Buffer.from(library);
  const asset = {path:"src/library.tsx",bytes:raw.length,gitBlob:gitBlobDigest(raw)};
  let called = 0;
  const fetcher = async (url, options) => {
    called++;
    assert.match(url, /raw.githubusercontent.com\/jup-ag\/plugin\/[a-f0-9]{40}\/src\/library.tsx$/);
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return new Response(raw);
  };
  const result = await readExactSourceText(asset, fetcher);
  assert.equal(result, library);
  assert.equal(called, 1);
  assert.equal(typeof globalThis.Jupiter, "undefined");
  await assert.rejects(readExactSourceText(
    {...asset, gitBlob:"0".repeat(40)}, fetcher),
    /Git blob mismatch/);
  await assert.rejects(readExactSourceText(asset, async () =>
    new Response(Buffer.concat([raw,Buffer.from("overflow")]))),
    /oversized/);
  await assert.rejects(readExactSourceText(asset, async () =>
    new Response(raw.subarray(0,raw.length-1))), /Git blob mismatch/);
  await assert.rejects(readExactSourceText({...asset,path:"../secret"}, fetcher),
    /Invalid immutable/);
  await assert.rejects(readExactSourceText({...asset,path:"https://evil.example/a"}, fetcher),
    /Invalid immutable/);
  await assert.rejects(readExactSourceText(asset, async () => new Response(null,{status:404})),
    /read rejected/);
  await assert.rejects(readExactSourceText(asset, async () => {throw Error("offline");}),
    /offline/);
});

test("staged audit contracts are two exact immutable upstream files only", () => {
  assert.deepEqual(SOURCE_FILES.map(x => x.path),
    ["src/library.tsx", "src/components/ShadowDomContainer.tsx"]);
  for (const entry of SOURCE_FILES) {
    assert.match(entry.gitBlob,/^[a-f0-9]{40}$/);
    assert.ok(entry.bytes < 100000);
  }
  assert.equal(typeof auditExactUpstreamContract, "function");
  assert.throws(() => inspectJupiterRuntimeContract(undefined, shadow), /Missing immutable/);
});
