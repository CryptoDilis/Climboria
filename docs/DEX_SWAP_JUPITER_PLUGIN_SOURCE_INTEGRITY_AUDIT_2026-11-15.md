# Jupiter Plugin source and integrity audit — 2026-11-15

**Scope:** Climboria Swap and Signature DEX only. This is a read-only upstream provenance and browser-loading audit; it does not enable a wallet, transaction signing, a custom execution endpoint, a provider widget, fees, Game, ClimbX, or Launchpad.

## Decision

**Provider activation remains NO-GO.** Current official Jupiter Plugin source, API and currently served artifacts have now been verified, but the vendor's own bootstrap dynamically loads executable and stylesheet dependencies without an integrity attribute. Climboria's existing host cannot enforce the complete dependency chain with SRI, so enabling the widget would overstate the security of a bootstrap-only hash.

This is a precise supply-chain blocker, not an assertion that Jupiter is untrusted or that a browser-synthetic test passed. The public site remains quote-only.

## Verified first-party integration facts

- Jupiter's current developer documentation identifies **Jupiter Plugin** as the in-site swap widget and gives the plain-HTML embed URL `https://plugin.jup.ag/plugin-v1.js`, followed by `window.Jupiter.init({ displayMode: "integrated", integratedTargetId })`.
- The documentation states that the Plugin is powered by Ultra and owns routing, slippage, MEV protection, transaction submission, wallet connection, token selection, and status UI. Climboria must therefore not also call its custom `/api/swap/order` or `/api/swap/execute` pipeline.
- The official repository's current `package.json` identifies `@jup-ag/plugin` version `1.0.18` and declares `MIT`; however, Jupiter's separately published SDK/API License Agreement also governs use of its SDK/API and documentation. A package metadata field alone is not a production legal clearance.
- The official customization contract exposes integrated/widget/modal display modes, optional wallet passthrough, initial mint fields, error/success callbacks, and optional referral fields. Climboria must leave referral/fee fields unset: `revenue.feeCollectionEnabled:false` and `revenue.feeRecipient:null`.

Primary sources:

- [Jupiter Plugin integration guide](https://developers.jup.ag/docs/tool-kits/plugin/index)
- [Jupiter Plugin HTML example](https://developers.jup.ag/docs/tool-kits/plugin/html-app-example)
- [Embed swap widget guide](https://developers.jup.ag/docs/guides/how-to-embed-a-swap-widget)
- [Plugin customization and wallet contract](https://developers.jup.ag/docs/tool-kits/plugin/customization)
- [Official Plugin source](https://github.com/jup-ag/plugin)
- [Jupiter SDK/API License Agreement](https://developers.jup.ag/docs/legal/sdk-api-license-agreement)

## Artifact verification performed

At audit time, direct HTTPS requests received `200 OK`, no redirects, `Access-Control-Allow-Origin: *`, and `Cache-Control: public, max-age=3600` from `plugin.jup.ag`. The public `plugin-v1.js` alias and `plugin-1.0.18.js` had the same bytes. The live artifacts matched, byte-for-byte, their files at official Plugin source commit `d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf`.

| Artifact | SHA-384 SRI observed | Bytes |
| --- | --- | ---: |
| `https://plugin.jup.ag/plugin-1.0.18.js` | `sha384-aPExK0yy7w5DZjkLRMWvSKhuEz9kvz/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy` | 243,597 |
| `https://plugin.jup.ag/plugin-1.0.18-app.js` | `sha384-6biewkmJfDzET07cdGWHy+jwuhkI+oP98oqqwrvEHTiGUY/SqbybduLkiD5cawE+` | 797,972 |
| `https://plugin.jup.ag/plugin-1.0.18-Tailwind.css` | `sha384-Ong35s4t7omIls1bLzrmmM3B2jLwHx4XINBaK6iLZvpqpYoGOv9i5YbTTzW5Ssl4` | 26,583 |
| `https://plugin.jup.ag/plugin-1.0.18-Jupiter.css` | `sha384-YYdqEnPj2Ekofq4mqijjNRPv7oDEQjVbHk4iYVY0OdwmIoB0U7cV8105vO2eoTXB` | 29,292 |
| `https://plugin.jup.ag/scoped-preflight-v4.css` | `sha384-j68Cx7NTIAPq+c1/H8kj6ROqZcz4eOgjXYHyNNDylErckJyx/jeBRvVYnGNSNHCS` | 3,062 |

These are audit observations, not a release pin: the server cache lifetime is one hour and neither the public `v1` alias nor Climboria's current code supplies a supported complete runtime integrity manifest.

## Proven activation blocker

The verified Plugin bootstrap source at the commit above uses `document.head.append(el)` to load `plugin-${version}-app.js` **without** `integrity` or `crossorigin`. Its renderer then uses `fetch(url)` to obtain its three first-party stylesheet assets (and Google Fonts CSS) before inserting style text into an open shadow root, again without an integrity check.

A `<script integrity>` on only `plugin-1.0.18.js` cannot protect the dynamically appended application script or the fetched styles. The existing Climboria provider host similarly only accepts the older `terminal.jup.ag/main-v*.js` convention, which is not the current official Plugin artifact and must not be configured.

## Required evidence before a provider-enable PR

1. A current first-party Jupiter mechanism that binds the bootstrap, application JavaScript and stylesheet chain to a supported immutable release manifest with integrity verification, **or** a separately reviewed approach that can verify every executable dependency before use without monkey-patching browser primitives.
2. Written legal/compliance confirmation that the chosen distribution and branding/attribution comply with Jupiter's current SDK/API agreement and all bundled third-party licenses.
3. A minimal code PR that changes only Swap/DEX provider hosting, keeps `swap-config.js enabled:false` until release acceptance, leaves `feeCollectionEnabled:false` and `feeRecipient:null`, and never calls Climboria's custom order/sign/execute endpoints.
4. Focused unit and real-browser desktop/mobile tests against the **actual pinned** provider artifact. Synthetic fixtures remain regression coverage only.
5. A supervised, owner-controlled, smallest practical mainnet transaction after staging and explicit wallet review; record the finalized signature, input/output mint addresses and amounts, provider/network fees, displayed minimum received, and independent explorer confirmation. No private key is requested or handled by Climboria.
6. Exact-head CI, deployed production evidence, and an immediate rollback switch before public feature activation.

## Current configuration and release truth

- `swap-config.js enabled:false`
- `managedProvider.enabled:false`, `scriptUrl:null`, `integrity:null`
- `revenue.feeCollectionEnabled:false`, `revenue.feeRecipient:null`
- Worker `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false` and `EXECUTION_SECURITY_REVIEW_COMPLETE=false`
- No customer-funded swap, wallet prompt, provider execution, custom execution path, Climboria integrator fee, or on-chain receipt has been produced by this audit.

**Next action:** obtain the provider's complete signed/integrity-manifest release mechanism or decide against this embedded provider. Until then, preserve quote-only Swap/DEX and fail closed.
