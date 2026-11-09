// Pure, read-only save-choice resolver. This module never reads storage or writes to Supabase.
export const SAVE_SCHEMA_VERSION = 1;
export const HERO_ALLOWLIST = Object.freeze(["Adventurer"]);

export function normalizeHero(value) {
  if (value === "ClimboriaHero") return "Adventurer"; // known legacy alias from gameplay loader
  return HERO_ALLOWLIST.includes(value) ? value : null;
}

export function resolveSaveChoice({ guestRaw = null, accountRow = null, accountError = null } = {}) {
  if (accountError) return { state: "read-error", guestHero: normalizeHero(guestRaw), accountHero: null };
  const guestPresent = typeof guestRaw === "string" && guestRaw.length > 0;
  const guestHero = guestPresent ? normalizeHero(guestRaw) : null;
  const guestInvalid = guestPresent && !guestHero;

  let accountHero = null;
  let accountInvalid = false;
  if (accountRow) {
    const version = accountRow.schema_version;
    const data = accountRow.save_data;
    if (version !== SAVE_SCHEMA_VERSION || !data || typeof data !== "object" || Array.isArray(data)) {
      accountInvalid = true;
    } else if (Object.prototype.hasOwnProperty.call(data, "selectedHero")) {
      accountHero = normalizeHero(data.selectedHero);
      accountInvalid = !accountHero;
    }
  }

  if (guestInvalid || accountInvalid) return { state: "invalid-data", guestHero, accountHero: null };
  if (!accountRow) return { state: guestHero ? "guest-only" : "no-save", guestHero, accountHero: null };
  if (!accountHero) return { state: guestHero ? "guest-only-account-save" : "account-save-no-hero", guestHero, accountHero: null };
  if (!guestHero) return { state: "account-only", guestHero: null, accountHero };
  if (guestHero === accountHero) return { state: "same-choice", guestHero, accountHero };
  return { state: "conflict", guestHero, accountHero };
}

export function applyChoiceLocally(choice, resolution, storage) {
  if (choice === "guest" && resolution.guestHero) return { hero: resolution.guestHero, wrote: false };
  if (choice === "account" && resolution.accountHero) {
    storage.setItem("climboria-selected-hero", resolution.accountHero);
    return { hero: resolution.accountHero, wrote: true };
  }
  throw new Error("The selected save choice is not available.");
}
