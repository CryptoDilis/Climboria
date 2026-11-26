# CLIMB Solana bonding-curve custody review — 2026-11-26 UTC

## On-chain evidence
[Successful raw run #45831418093](https://github.com/CryptoDilis/Climboria/actions/runs/45831418093) reports matching raw candidate observations at slot 474168385, reported blockhash C17Lp4LYbNpCsTTuZT41Cf8pemACcmZjDoB5eLXXnG5H. Largest account FZZbYE8uchTGd3Q6kXvWNmK4Qdq9t5eyghvhHoEk6oMd holds 995,283,518.333260 CLIMB; token authority EZfyVaAzfDcFuDCEv1T7SzQ8Ly7waJJfXfeaxmT8GR23, owned by program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P.

## Official interface review
Fetched Pump.fun's [published program documentation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md) blob cdd6e6744c2797e9d502615a84a316cfe97a3ff8 and [pump.json IDL](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json) blob bb79d04e5a4ef8b286d67511757c23a15672ef51 via GitHub connector. Documentation confirms program ID and bonding-curve PDA seeds ["bonding-curve", mint]. create_v2 specifies associated bonding-curve ATA seeds [bonding_curve, token_program, mint] under associated-token program.

Offline derivation using SHA256 Solana PDA domain marker and Ed25519 compressed-point check reproduced both exact addresses with bump 255:
- Pump program + ["bonding-curve", canonical CLIMB mint] => EZfyVaAzfDcFuDCEv1T7SzQ8Ly7waJJfXfeaxmT8GR23.
- Associated token program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL + [curve PDA, Token-2022 program, canonical mint] => FZZbYE8uchTGd3Q6kXvWNmK4Qdq9t5eyghvhHoEk6oMd.

This establishes strong matching evidence of program-controlled curve vault custody, not founder private-key control. Independent provider provenance and actual deployed executable semantics remain unverified. The public interface is not a full program audit.

## Retirement constraints
The documentation describes buy/sell while the curve operates, completion when real_token_reserves reaches zero, and permissionless migration of completed curve liquidity to PumpSwap. The former withdraw instruction is described as disabled; migration is not a burn of the original CLIMB mint (the documentation mentions LP-token burning, which is distinct). The fetched IDL exposes no ordinary creator instruction specifically to shut down the curve or burn its token inventory. Creator fee/creator management is not equivalent to token vault ownership. Do not assert no protocol-admin intervention can ever exist; the interface alone does not prove impossibility. Current curve complete flag and raw reserve fields were not decoded; vault balance is not necessarily equal to real_token_reserves. No estimate of purchase cost or plan to buy out the curve.

## Decision implications
Treat reserve as non-founder-controlled and not available for retirement or compensation by default. Ongoing Solana trades and legacy supply may continue. The proposed separate Base replacement and fixed one-time compensation remain the safer design candidate against open-ended conversion arbitrage, pending explicit founder approval and independently reviewed holder eligibility, notice and legal obligations. No claim entitlement or cutoff approved. Do not market distinct supplies as one conserved supply.

Next: preserve evidence and compare illustrative Base fixed supply/compensation/liquidity allocations. If retirement is still considered, obtain official protocol confirmation of any authorized retirement path and verify current curve state, deployed program and authority constraints; no unauthorized transaction. Mainnet NO_GO.
