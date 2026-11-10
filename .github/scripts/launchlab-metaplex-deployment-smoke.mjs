#!/usr/bin/env node
/** Read-only Devnet capture of canonical Metaplex Token Metadata deployment provenance. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { captureDevnetMetaplexProgramProvenance, PINNED_METAPLEX_BUILD_ARTIFACT } from "./launchlab-metaplex-deployment-probe.mjs";

const prefix = process.env.LAUNCHLAB_TOOLS_PREFIX || "/tmp/launchlab-tools";
const require = createRequire(`${prefix}/package.json`);
const { Connection, PublicKey } = require("@solana/web3.js");
const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpcUrl, { commitment: "finalized" });
const artifactPath = process.env.METAPLEX_BUILD_ARTIFACT_PATH;
let buildArtifact = PINNED_METAPLEX_BUILD_ARTIFACT;
if (artifactPath) {
  const artifactBytes = readFileSync(artifactPath);
  buildArtifact = {
    sourceCommit: process.env.METAPLEX_SOURCE_COMMIT || null,
    workflowRunId: null,
    artifactId: null,
    artifactPath,
    byteLength: artifactBytes.length,
    sha256: createHash("sha256").update(artifactBytes).digest("hex"),
  };
}
const result = await captureDevnetMetaplexProgramProvenance({
  connection,
  sdk: { PublicKey },
  cluster: "devnet",
  buildArtifact,
});
process.stdout.write(JSON.stringify({
  ...result,
  note: "Deployment metadata and bytecode hash are captured from finalized Devnet accounts and compared against the official pinned Metaplex GitHub Actions token_metadata.so artifact. An exact match requires identical artifact prefix and only zero-filled loader padding. The build artifact source commit/path and hash are printed with the comparison.",
}, null, 2) + "\n");
