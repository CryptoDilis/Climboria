import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { address, createSolanaRpc } from "@solana/kit";
import { fetchAllHistories } from "@solana/idl";
import { buildOfficialIdlHistoryRevisions } from "./official-idl-history.mjs";

const programId = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const outputDir = join(process.cwd(), "artifacts", "jupiter-idl-history");
const outputPath = join(outputDir, "official-jupiter-history.json");
const errorPath = join(outputDir, "official-jupiter-history-error.json");
const rpcUrl = process.env.SOLANA_RPC_URL;

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return rpcUrl ? message.split(rpcUrl).join("[REDACTED_RPC_URL]") : message;
}

await mkdir(outputDir, { recursive: true });

try {
  if (!rpcUrl) throw new Error("Missing encrypted Actions secret SOLANA_RPC_URL");
  const parsedUrl = new URL(rpcUrl);
  if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
    throw new Error("SOLANA_RPC_URL must be an HTTPS endpoint without URL-embedded credentials");
  }

  const rpc = createSolanaRpc(rpcUrl);
  const histories = await fetchAllHistories(rpc, address(programId));
  const anchor = buildOfficialIdlHistoryRevisions(histories.anchor);
  const pmp = buildOfficialIdlHistoryRevisions(histories.pmp);

  const report = {
    status: "ok",
    provider: "@solana/idl@0.3.0",
    reconstruction: "direct on-chain Anchor and Program Metadata history replay",
    programId,
    rpcHost: parsedUrl.host,
    fetchedAt: new Date().toISOString(),
    anchorAddress: histories.anchorAddress,
    pmpAddress: histories.pmpAddress,
    histories: { anchor, pmp },
    summary: {
      anchorSnapshotCount: histories.anchor.length,
      pmpSnapshotCount: histories.pmp.length,
      anchorRevisionCount: anchor.length,
      pmpRevisionCount: pmp.length,
      totalRevisionCount: anchor.length + pmp.length,
    },
  };

  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    status: report.status,
    provider: report.provider,
    programId: report.programId,
    rpcHost: report.rpcHost,
    anchorAddress: report.anchorAddress,
    pmpAddress: report.pmpAddress,
    summary: report.summary,
    output: outputPath,
  }, null, 2));
} catch (error) {
  const report = {
    status: "error",
    provider: "@solana/idl@0.3.0",
    programId,
    fetchedAt: new Date().toISOString(),
    error: safeError(error),
  };
  await writeFile(errorPath, JSON.stringify(report, null, 2) + "\n");
  console.error(`Official on-chain Jupiter IDL history reconstruction failed: ${report.error}`);
  process.exitCode = 1;
}
