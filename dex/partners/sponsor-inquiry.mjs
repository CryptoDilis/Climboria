/* Climboria DEX sponsorship intake — client-side email draft only.
 * No application API, wallet, payment processor, analytics or storage.
 */
export const SPONSORSHIP_EMAIL = "climboria@gmail.com";

const PLACEMENTS = new Set([
  "DEX premium banner inquiry",
  "DEX token intelligence placement inquiry",
  "General DEX sponsorship inquiry"
]);
const LIMITS = Object.freeze({ project: 90, email: 160, website: 220, dates: 90, budget: 90, notes: 450 });
const CONTROL_AND_BIDI = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

function clean(value, max) {
  return String(value ?? "").replace(CONTROL_AND_BIDI, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function buildSponsorshipInquiry(values) {
  if (!values || typeof values !== "object") throw Error("Enter a project and contact email.");
  const project = clean(values.project, LIMITS.project);
  const email = clean(values.email, LIMITS.email);
  const rawWebsite = clean(values.website, LIMITS.website);
  const dates = clean(values.dates, LIMITS.dates);
  const budget = clean(values.budget, LIMITS.budget);
  const notes = clean(values.notes, LIMITS.notes);
  const placement = clean(values.placement, 100);

  if (!project) throw Error("Enter your project or organization name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("Enter a valid contact email.");
  if (!PLACEMENTS.has(placement)) throw Error("Choose a supported sponsorship inquiry category.");

  let website = "Not supplied";
  if (rawWebsite) {
    let url;
    try { url = new URL(rawWebsite); }
    catch { throw Error("Enter a complete website URL starting with https://."); }
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
      throw Error("Use a public HTTPS website without embedded credentials.");
    }
    website = url.href;
  }

  const subject = "Climboria DEX Sponsorship Inquiry — " + project;
  const body = [
    "Hello Climboria team,",
    "",
    "We are interested in a clearly disclosed sponsorship placement.",
    "",
    "Project / organization: " + project,
    "Contact email: " + email,
    "Official website: " + website,
    "Placement interest: " + placement,
    "Proposed campaign dates: " + (dates || "To discuss"),
    "Indicative budget: " + (budget || "To discuss"),
    "Brief description: " + (notes || "To discuss"),
    "",
    "Please let us know availability, placement policy, and custom pricing.",
    "We understand all sponsored content must be labeled, reviewed,",
    "and does not imply that tokens are safe or endorsed.",
    "",
    "Regards,",
    project
  ].join("\n");
  const href = "mailto:" + SPONSORSHIP_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  if (href.length > 2900) throw Error("Inquiry is too long for email-app links; shorten the description.");
  return Object.freeze({ to: SPONSORSHIP_EMAIL, subject, body, href });
}

export function initializeSponsorshipIntake(doc, clipboard) {
  const form = doc.getElementById("sponsorshipForm");
  const status = doc.getElementById("sponsorshipStatus");
  const results = doc.getElementById("sponsorshipResults");
  const emailLink = doc.getElementById("openSponsorEmail");
  const preview = doc.getElementById("sponsorshipPreview");
  const copy = doc.getElementById("copySponsorInquiry");
  if (!form || !status || !results || !emailLink || !preview || !copy) return false;

  let current = null;
  const reset = () => {
    current = null;
    results.hidden = true;
    emailLink.removeAttribute("href");
    preview.value = "";
  };
  form.addEventListener("input", () => {
    if (current) {
      reset();
      status.textContent = "Details changed. Preview your revised inquiry again before sending.";
    }
  });
  form.addEventListener("change", () => {
    if (current) reset();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    reset();
    try {
      const fields = Object.fromEntries(new FormData(form));
      current = buildSponsorshipInquiry(fields);
      emailLink.href = current.href;
      preview.value = "To: " + current.to + "\nSubject: " + current.subject + "\n\n" + current.body;
      results.hidden = false;
      status.textContent = "Email draft ready. Choose Open email app or Copy inquiry. Nothing has been sent or saved.";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Please review the inquiry fields.";
    }
  });
  copy.addEventListener("click", async () => {
    if (!current) return;
    try {
      if (!clipboard || typeof clipboard.writeText !== "function") throw Error("Clipboard unavailable");
      await clipboard.writeText(preview.value);
      status.textContent = "Inquiry copied. Paste it into your email app and send to climboria@gmail.com.";
    } catch {
      preview.focus();
      preview.select();
      status.textContent = "Automatic copying unavailable. Select and copy the draft above manually.";
    }
  });
  return true;
}

if (typeof document !== "undefined") {
  const boot = () => initializeSponsorshipIntake(document, globalThis.navigator?.clipboard);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
