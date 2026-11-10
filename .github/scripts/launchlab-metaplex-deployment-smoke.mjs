#!/usr/bin/env node
/** Read-only Devnet capture of canonical Metaplex Token Metadata deployment provenance. */
import { createRequire } from "node:module";
import { captureDevnetMetaplexProgramProvenance } from "./launchlab-metaplex-deployment-probe.mjs";

const prefix = process.env.LAUNCHLAB_TOOLS_PREFIX || "/tmp/launchlab-tools";
const require = createRequire(`${prefix}/package.json`);
const { Connection, PublicKey } = require("@solana/web3.js");
const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpcUrl, { commitment: "finalized" });
const result = await captureDevnetMetaplexProgramProvenance({
  connection,
  sdk: { PublicKey },
  cluster: "devnet",
});
process.stdout.write(JSON.stringify({
  ...result,
  note: "Deployment metadata and bytecode hash are captured from finalized Devnet accounts. Source commit matching is not claimed; a reproducible build comparison is still required.",
}, null, 2) + "\n");
