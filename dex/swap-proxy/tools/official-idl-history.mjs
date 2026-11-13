import { createHash } from "node:crypto";

function toSlot(value, label) {
  try {
    return BigInt(value).toString();
  } catch {
    throw new TypeError(`Invalid ${label} slot: ${String(value)}`);
  }
}

function formatBlockTime(value) {
  if (value === null || value === undefined) return null;
  return new Date(Number(value) * 1000).toISOString().replace("T", " ").slice(0, 19);
}

function idlVersion(content) {
  try {
    const parsed = JSON.parse(content);
    const version = parsed?.version ?? parsed?.metadata?.version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

export function buildOfficialIdlHistoryRevisions(snapshots) {
  if (!Array.isArray(snapshots)) throw new TypeError("IDL history snapshots must be an array");
  const ordered = snapshots.map((snapshot, index) => ({ snapshot, index })).sort((a, b) => {
    const left = BigInt(a.snapshot.slot);
    const right = BigInt(b.snapshot.slot);
    return left < right ? -1 : left > right ? 1 : a.index - b.index;
  });
  const versions = [];
  let previousContent = null;

  for (const { snapshot } of ordered) {
    if (typeof snapshot.decodedContent !== "string") continue;
    if (snapshot.decodedContent === previousContent) continue;
    previousContent = snapshot.decodedContent;
    const slot = toSlot(snapshot.slot, "revision");
    versions.push({
      content: snapshot.decodedContent,
      contentSha256: createHash("sha256").update(snapshot.decodedContent).digest("hex"),
      instruction: snapshot.instruction ?? null,
      signature: snapshot.signature ?? null,
      slot,
      time: formatBlockTime(snapshot.blockTime),
      version: idlVersion(snapshot.decodedContent),
    });
  }

  const lastSnapshot = ordered.at(-1)?.snapshot ?? null;
  const closed = lastSnapshot ? !lastSnapshot.state : false;
  return versions.map((revision, index) => {
    const next = versions[index + 1];
    const activeTo = next
      ? { slot: next.slot, time: next.time }
      : closed
        ? { slot: toSlot(lastSnapshot.slot, "close"), time: formatBlockTime(lastSnapshot.blockTime) }
        : "current";
    return {
      ...revision,
      activeFrom: { slot: revision.slot, time: revision.time },
      activeTo,
    };
  });
}
