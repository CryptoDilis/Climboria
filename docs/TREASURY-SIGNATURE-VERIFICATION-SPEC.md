# Climboria Treasury Wallet-Control Verification

Status: IMPLEMENTATION SPECIFICATION — NOT LIVE. No signature has been requested or verified.

## Scope

Verify control of the owner-proposed public receiving addresses without transferring funds:
- Solana: `J5W4CHVjTddn3sMheD6oo7aHUoN1SjK2ke1nkcVhjHLp`
- Base (EVM): `0xd595f6e998260583e7a07e77d17a7ee5160a8230`

The owner has personally attested control. Coinbase Wallet screenshots visually match both address labels. These are useful corroborating observations, not cryptographic proof.

## Required user experience

Create a dedicated page at `/treasury-verification/` with separate Solana and Base cards and explicit states:
- Not started
- Challenge issued
- Signature requested
- Signature verified
- Expired / rejected

Never reuse the normal Climboria login connection as proof of treasury control. Wallet connection only reveals an address; it is not a signature.

## Challenge protocol

The server must issue a cryptographically random nonce (at least 128 bits) and store a challenge record with:
- challenge ID
- chain identifier (`solana:mainnet` or `eip155:8453`)
- exact expected treasury address
- project/domain (`climboria.fun`)
- purpose (`Climboria treasury wallet-control verification`)
- issued-at and expiry (maximum 5 minutes)
- one-time-use status

The message shown in the wallet must be human-readable and bind all of the above. The client must not choose or alter the expected address, chain, purpose, expiry, or nonce.

## Signing

### Base / EVM
- Confirm provider chain ID is 8453 before requesting the signature.
- Request an EIP-191 personal message signature (for example, `personal_sign`) over the exact server-issued message.
- Recover the signer address server-side and compare it case-insensitively to the exact expected EVM address.
- A connected address alone, typed-data prompt, transaction, token approval, or contract interaction is not an acceptable substitute.

### Solana
- Obtain a Solana-capable wallet provider from the connected Coinbase Wallet session.
- Confirm the provider public key exactly matches the expected Solana address.
- Request off-chain `signMessage` over the exact server-issued UTF-8 message.
- Verify the Ed25519 signature server-side against the expected 32-byte public key.
- Do not submit a transaction or request SOL.

If the Coinbase Wallet app/browser session does not expose a Solana `signMessage` provider, stop and explain that the wallet integration does not expose the required capability in that environment. Do not route the user to an untrusted signing site.

## Backend security requirements

- Use a server-side store (Cloudflare Durable Object, D1, or KV with atomic consume semantics) for nonce issuance and one-time consumption. Do not implement proof verification solely in browser JavaScript or localStorage.
- Apply strict origin checks, rate limits, request size limits, challenge expiry, replay protection and per-address throttling.
- Validate exact chain, message, signature encoding, expected address and challenge ID.
- Return a signed verification receipt with timestamp and evidence ID; do not expose private configuration.
- Never log raw signatures unnecessarily; never request or store seed phrases, private keys, passwords or OTPs.
- Do not accept screenshots, wallet connection alone, or client-supplied `verified: true` flags as proof.
- Avoid storing full signature material after successful verification unless required; retain minimal audit metadata.

## Release gates

- [ ] Backend challenge storage provisioned with atomic single-use behavior.
- [ ] Server-side EVM signature recovery tested against valid, invalid, wrong-address, wrong-chain, expired and replayed cases.
- [ ] Server-side Solana Ed25519 verification tested against valid, invalid, wrong-key, expired and replayed cases.
- [ ] Coinbase Wallet mobile in-app browser tested for both EVM personal-sign and Solana signMessage capability.
- [ ] Exact treasury address and chain are displayed before the user approves the signature.
- [ ] UI explicitly states: signature only; no transfer, token approval, gas fee or contract call.
- [ ] No mainnet funds moved and no fee collection enabled.
- [ ] Audit record and owner review completed.

## Current blockers

The repository currently has no dedicated treasury verification page or deployed challenge-verification backend. The existing Cloudflare Worker is a Jupiter swap proxy and does not provide challenge storage or signature verification. Do not tell the owner to sign anything until this specification is implemented and deployed over the official HTTPS Climboria domain.

## Next implementation task

Provision the challenge backend and atomic nonce store, then implement the page and server-side verification endpoints. Test on mobile Coinbase Wallet before asking the owner to sign.
