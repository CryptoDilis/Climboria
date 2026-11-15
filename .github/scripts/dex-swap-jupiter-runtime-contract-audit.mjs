#!/usr/bin/env node
/**
 * STATIC Jupiter v1.0.18 runtime dependency review, not widget execution.
 *
 * Audit pinned, immutable source files for how the widget actually loads its
 * app JS and CSS and record which security gates are still absent. Producing
 * this report NEVER approves redistribution, a live wallet, or production.
 */
import { gitBlobDigest, MANIFEST, UPSTREAM_COMMIT } from "./dex-swap-jupiter-source-provenance.mjs";
import { pathToFileURL } from "node:url";

export const SOURCE_FILES = Object.freeze([
  Object.freeze({
    path: "src/library.tsx",
    bytes: 11884,
    gitBlob: "6038a122ca18a640ae09e743bb53663cdd1775c3"
  }),
  Object.freeze({
    path: "src/components/ShadowDomContainer.tsx",
    bytes: 2067,
    gitBlob: "ddec6e692825ca8b0a02c42c02ed6c663b0b1cd4"
  })
]);

const SRC_ROOT = "https://raw.githubusercontent.com/jup-ag/plugin/" + UPSTREAM_COMMIT + "/";

export async function readExactSourceText(file, fetchFn) {
  if (!file || !/^src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.tsx$/.test(file.path) ||
      !Number.isSafeInteger(file.bytes) || file.bytes < 1 || file.bytes > 100_000 ||
      !/^[a-f0-9]{40}$/.test(file.gitBlob)) {
    throw Error("Invalid immutable Jupiter source contract");
  }
  if (typeof fetchFn !== "function") throw Error("Missing fetch function");
  const response = await fetchFn(SRC_ROOT + file.path, {
    redirect: "error", signal: AbortSignal.timeout(12000)
  });
  if (!response?.ok || response.status !== 200 || !response.body?.getReader) {
    throw Error("Pinned Jupiter source read rejected: " + file.path);
  }
  // HTTP Content-Length may describe compressed transport bytes.
  // Bound decoded content BEFORE gathering in memory.
  const reader = response.body.getReader();
  const chunks = [];
  let count = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      count += item.value.byteLength;
      if (count > file.bytes) throw Error("Pinned source unexpectedly oversized: " + file.path);
      chunks.push(Buffer.from(item.value));
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  }
  const bytes = Buffer.concat(chunks, count);
  if (count !== file.bytes || gitBlobDigest(bytes) !== file.gitBlob) {
    throw Error("Pinned Jupiter source Git blob mismatch: " + file.path);
  }
  return bytes.toString("utf8");
}

function requireOne(source, token, hint) {
  if (!source.includes(token)) throw Error("Unreviewed Jupiter runtime drift: " + hint);
}

/**
 * A positive report proves the current dependency wiring is UNDERSTOOD;
 * it deliberately requires releaseApproved=false until a separately tested
 * runtime enforcement mechanism and legal distribution terms are established.
 */
export function inspectJupiterRuntimeContract(library, shadow) {
  if (typeof library !== "string" || typeof shadow !== "string") {
    throw Error("Missing immutable runtime source");
  }
  requireOne(library, "const bundleName = `plugin-${require('../package.json').version}`;",
    "versioned bundle name");
  requireOne(library, "|| 'https://plugin.jup.ag'", "default remote domain");
  requireOne(library,
    "await loadRemote('jupiter-load-script-app', `${scriptDomain}/${bundleName}-app.js`, 'text/javascript');",
    "dynamically loaded versioned JS app");
  requireOne(library, "document.createElement('script')", "dynamic script element");
  requireOne(library, "el.src = href;", "script asset source");
  requireOne(library, "document.head.append(el);", "dynamic script injection");
  requireOne(library, "const stylesheetUrls = [", "stylesheet list");
  for (const asset of [
    "`${scriptDomain}/${bundleName}-Tailwind.css`",
    "`${scriptDomain}/scoped-preflight-v4.css`",
    "`${scriptDomain}/${bundleName}-Jupiter.css`"
  ]) {
    requireOne(library, asset, "versioned CSS reference " + asset);
  }
  requireOne(library,
    "'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Poppins&display=swap'",
    "external Google Font CSS");
  requireOne(library, "<ShadowDomContainer stylesheetUrls={stylesheetUrls}>",
    "shadow DOM stylesheet consumer");
  requireOne(shadow, "stylesheetUrls.map((url) =>", "dynamic stylesheet URL list");
  requireOne(shadow, "fetch(url).then((res) =>", "fetch-based CSS loader");
  requireOne(shadow, "return res.text();", "stylesheet text from network");
  requireOne(shadow, "document.createElement('style')", "inline shadow-root CSS element");
  requireOne(shadow, "styleEl.textContent = cssText;", "unattested CSS injection");
  requireOne(shadow, "newShadowRoot.appendChild(styleEl)", "shadow root stylesheet application");

  const filenames = MANIFEST.map(a => a.name);
  for (const path of [
    "plugin-1.0.18.js", "plugin-1.0.18-app.js",
    "plugin-1.0.18-Tailwind.css", "plugin-1.0.18-Jupiter.css",
    "scoped-preflight-v4.css"
  ]) {
    if (!filenames.includes(path)) throw Error("Missing SHA-384/immutable asset manifest: " + path);
  }
  // Source contract is not browser-level integrity. Dynamic script injection
  // has no SRI set and Shadow DOM CSS fetch is not compared to pinned hashes.
  if (/el\.integrity\s*=|el\.setAttribute\(['"]integrity['"]/.test(library) ||
      /crypto\.subtle\.digest|createHash\(|sha384-|integrity\s*=/.test(shadow)) {
    // A new integrity implementation must receive a fresh human review; a
    // simple token match cannot certify its correctness.
    throw Error("Jupiter runtime integrity mechanism changed: independent review required");
  }
  return Object.freeze({
    upstreamCommit: UPSTREAM_COMMIT,
    sourceFilesVerified: SOURCE_FILES.map(f => f.path),
    knownSha384RuntimeFiles: filenames.filter(f => !f.endsWith(".LICENSE.txt")),
    dynamicAppScript: "plugin-1.0.18-app.js",
    dynamicCss: [
      "plugin-1.0.18-Tailwind.css", "scoped-preflight-v4.css",
      "plugin-1.0.18-Jupiter.css"
    ],
    externalStylesheet: "https://fonts.googleapis.com/css2",
    browserEnforcesSriOnDynamicAppScript: false,
    browserVerifiesFetchedCssBeforeShadowDomInsertion: false,
    completeThirdPartyNetworkOrFontGraphVerified: false,
    rehostingTermsVerified: false,
    physicalWalletAcceptanceVerified: false,
    releaseApproved: false
  });
}

export async function auditExactUpstreamContract(fetchFn) {
  const [library, shadow] = await Promise.all(
    SOURCE_FILES.map(file => readExactSourceText(file, fetchFn))
  );
  return inspectJupiterRuntimeContract(library, shadow);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== "--audit-pinned-source") {
    console.error("Usage: node dex-swap-jupiter-runtime-contract-audit.mjs --audit-pinned-source");
    process.exitCode = 2;
  } else {
    try {
      const result = await auditExactUpstreamContract(fetch);
      console.log("PINNED JUPITER RUNTIME AUDIT (source only, not browser execution):");
      console.log(JSON.stringify(result, null, 2));
      if (result.releaseApproved !== false) throw Error("unexpected release approval");
      console.log("PASS source contract understood; production GO=NO until all release gates are independently met");
    } catch (err) {
      console.error("FAIL CLOSED: " + err.message);
      process.exitCode = 1;
    }
  }
}
