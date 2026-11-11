# Climboria development checkpoint — 2026-11-11 18:30 +08

## Execution order
DEX → Swap → Login → Launchpad. Gameplay/GLB investigation remains a separate diagnostic track and must not displace ecosystem release work.

## Verified since the previous checkpoint
- [x] PR #266 exact-head Validate run 42972552677 passed on 79acbc8222f6e70840eabc92c34e3f0517f72ef9.
- [x] PR #266 Browser Smoke run 42972552578: DEX/Swap/auth/mobile checks through step 16 passed; step 17 (Jarrell's Peak desktop/mobile gameplay smoke) failed. This is isolated to the GLB/gameplay gate; it does not invalidate the passing DEX/Swap steps.
- [x] PR #267 adds a read-only GLB v2 container audit that reports dimensions/format/byte size for embedded images and validates that image metadata can be decoded.
- [x] PR #267 exact-head Validate run 42994562962 passed on 6660588c47f93c50ed1886710940844f7bdf0078; all 16 job steps completed successfully, including the GLB audit and DEX/Swap/auth validation.
- [!] The GLB audit step completed successfully, but the available GitHub job-step interface exposes step status rather than stdout. Do not invent texture dimensions or claim the measured report was reviewed. Retrieve the run log/artifact output through an authorized log-capable path before selecting texture compression/resizing changes.

## GLB diagnosis — current evidence
- Prior #266 timing correction remains authoritative: 42.9 MB GLB transfer took approximately 223.8 seconds; parse/dependency phase had been pending for approximately 34.4 seconds at the failure snapshot. Do not mislabel total elapsed as parser duration.
- PR #266's latest browser smoke still failed only at the Jarrell's Peak gameplay step after all ecosystem/browser checks passed.
- PR #267's successful audit validates the GLB structure and embedded image metadata, but no numeric image dimensions are recorded here until the actual stdout is inspected.
- Do not increase timeouts, bypass readiness, substitute a fallback avatar, or weaken acceptance assertions.

## Always-visible delivery checklist
- [x] DEX implementation merged and DEX-specific mobile/browser checks previously passed.
- [ ] DEX production deployment/live provider verification remains to be independently confirmed.
- [ ] Swap: complete Metis-only instruction/CPI/account-role semantic validation, token movement/fee proof, controlled Devnet lifecycle, production Worker configuration, and independent security review. Signable-order and execution gates remain closed.
- [ ] Login: verify real Supabase email/OAuth/Web3 provider configuration, SMTP/confirmation, redirects, CAPTCHA/Turnstile, real-account lifecycle and cross-user isolation.
- [ ] Launchpad: establish custody/treasury/fee authority and production signer policy; prove full Devnet create → bonding curve → migration → pool/LP lifecycle. No signing, migration or funds movement without approved policy.
- [ ] Gameplay: inspect actual GLB audit stdout; then optimize embedded image payload or delivery only from measured evidence; rerun strict mobile readiness and full smoke.

## Exact next actions
1. Continue the agreed ecosystem order: resume P2 Swap semantic validation on the latest mainline; do not switch the sprint to gameplay.
2. Separately retrieve and inspect PR #267 run 42994562962's GLB audit stdout to obtain exact texture dimensions/byte sizes.
3. Compare the #266 browser smoke failure payload with the audit measurements; design a distinct evidence-based asset/delivery counter-fix. No speculative duplicate patch.
4. Record each resulting commit, exact-head Validate/Browser Smoke run, root cause, verification, unresolved blocker and next task here or in the main README.
