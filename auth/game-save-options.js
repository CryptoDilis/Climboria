import { resolveSaveChoice, applyChoiceLocally } from "./save-choice.js";

const STYLE = `
#climboria-save-options-trigger{position:fixed;z-index:1400;left:max(12px,env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom));padding:10px 14px;border:1px solid #b99355;border-radius:9px;background:#101923ed;color:#ffe3a3;font:800 11px system-ui;letter-spacing:.1em;box-shadow:0 8px 24px #0008;cursor:pointer}
#climboria-save-options{position:fixed;z-index:1401;left:12px;bottom:calc(62px + env(safe-area-inset-bottom));width:min(340px,calc(100vw - 24px));max-height:min(70dvh,520px);overflow:auto;padding:16px;border:1px solid #b99355;border-radius:13px;background:linear-gradient(145deg,#111b27f7,#070b11f5);box-shadow:0 18px 48px #000c;color:#f4ecd8;font:13px/1.5 system-ui}
#climboria-save-options[hidden],#climboria-save-options-trigger[hidden]{display:none!important}
#climboria-save-options h2{margin:0 32px 8px 0;color:#ffe3a3;font:800 14px system-ui;letter-spacing:.1em}
#climboria-save-options p{margin:8px 0;color:#d4cbbb}
#climboria-save-options .save-actions{display:grid;gap:8px;margin-top:14px}
#climboria-save-options button{min-height:40px;padding:9px 12px;border:1px solid #927449;border-radius:8px;background:#182532;color:#f8edda;font:700 12px system-ui;cursor:pointer}
#climboria-save-options button:focus-visible{outline:2px solid #ffd36d;outline-offset:3px}
#climboria-save-options .save-close{position:absolute;right:12px;top:10px;min-height:32px;padding:4px 9px}
#climboria-save-options .save-status{min-height:42px;color:#e8d6b6}
@media(max-width:650px){#climboria-save-options-trigger{bottom:calc(12px + env(safe-area-inset-bottom));left:10px;padding:9px 11px}#climboria-save-options{left:10px;bottom:calc(58px + env(safe-area-inset-bottom));width:min(320px,calc(100vw - 20px));max-height:65dvh}}
`;

export function installGameSaveOptions({ client, documentRef = document, storage = localStorage } = {}) {
  if (!documentRef?.body || documentRef.getElementById("climboria-save-options-trigger")) return;
  const style = documentRef.createElement("style");
  style.textContent = STYLE;
  documentRef.head.append(style);

  const trigger = documentRef.createElement("button");
  trigger.id = "climboria-save-options-trigger";
  trigger.type = "button";
  trigger.textContent = "SAVE OPTIONS";
  trigger.setAttribute("aria-controls", "climboria-save-options");
  trigger.setAttribute("aria-expanded", "false");

  const panel = documentRef.createElement("section");
  panel.id = "climboria-save-options";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "climboria-save-options-title");
  panel.hidden = true;
  panel.innerHTML = `
    <button class="save-close" type="button" data-save-close aria-label="Close save options">CLOSE</button>
    <h2 id="climboria-save-options-title">SAVE OPTIONS</h2>
    <p class="save-status" role="status" aria-live="polite">Your progress stays on this device unless you explicitly choose otherwise.</p>
    <div class="save-actions"></div>`;

  documentRef.body.append(trigger, panel);
  const status = panel.querySelector(".save-status");
  const actions = panel.querySelector(".save-actions");
  let lastResolution = null;

  const close = () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  };
  const addAction = (label, onClick) => {
    const button = documentRef.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    actions.append(button);
  };

  panel.querySelector("[data-save-close]").addEventListener("click", close);
  trigger.addEventListener("click", async () => {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    actions.replaceChildren();
    status.textContent = "Checking save choices…";
    lastResolution = null;

    const { data: { session } = {}, error: sessionError } = client
      ? await client.auth.getSession().catch(error => ({ data: { session: null }, error }))
      : { data: { session: null }, error: null };

    const guestRaw = storage.getItem("climboria-selected-hero");
    if (sessionError) {
      status.textContent = "Account status could not be checked. Nothing was changed. You can continue playing.";
      return;
    }
    if (!session?.user) {
      status.textContent = "You are playing as a guest. Your local progress remains on this device. To check an account save, sign in from the Climboria homepage, then return here.";
      addAction("OPEN ACCOUNT SIGN-IN", () => { window.location.href = "../?openAuth=1"; });
      addAction("KEEP PLAYING AS GUEST", close);
      return;
    }

    let accountRow = null;
    let accountError = null;
    try {
      const result = await client
        .from("player_saves")
        .select("schema_version,save_data")
        .maybeSingle();
      accountRow = result.data || null;
      accountError = result.error || null;
    } catch (error) {
      accountError = error;
    }

    const resolution = resolveSaveChoice({ guestRaw, accountRow, accountError });
    lastResolution = resolution;
    if (resolution.state === "read-error") {
      status.textContent = "Your account save could not be read. No data was changed. You can continue with this device.";
      if (resolution.guestHero) addAction("KEEP THIS DEVICE", () => { close(); });
      addAction("DECIDE LATER", close);
      return;
    }
    if (resolution.state === "invalid-data") {
      status.textContent = "A save contains data this version cannot safely use. Nothing was overwritten or migrated. Continue playing without changing either copy.";
      addAction("DECIDE LATER", close);
      return;
    }
    if (resolution.state === "no-save") {
      status.textContent = "No local hero choice or account save was found. No save was created. You can continue playing.";
      addAction("DECIDE LATER", close);
      return;
    }
    if (resolution.state === "guest-only" || resolution.state === "guest-only-account-save") {
      status.textContent = "A local hero choice is available. The account save has no usable hero choice. Your local progress has not been uploaded.";
      addAction("KEEP THIS DEVICE", () => { close(); });
      addAction("DECIDE LATER", close);
      return;
    }
    if (resolution.state === "account-only") {
      status.textContent = "An account hero choice is available. Choosing it applies the cosmetic hero choice to this device only; it does not write to the cloud.";
      addAction("USE ACCOUNT CHOICE ON THIS DEVICE", () => {
        applyChoiceLocally("account", resolution, storage);
        status.textContent = "Account hero choice applied on this device. No cloud data was changed.";
        actions.replaceChildren();
        addAction("CLOSE", close);
      });
      addAction("DECIDE LATER", close);
      return;
    }
    if (resolution.state === "same-choice") {
      status.textContent = "Your local and account hero choices match. Both copies are preserved.";
      addAction("KEEP THIS DEVICE", close);
      addAction("DECIDE LATER", close);
    }
  });

  return Object.freeze({ trigger, panel, get resolution() { return lastResolution; } });
}
