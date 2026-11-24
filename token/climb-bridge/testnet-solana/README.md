# Solana Devnet CLIMBTEST mint preparation

**Not deployed. Not mainnet CLIMB.** Match the observed metadata-only Token-2022 mint on Devnet using a new mint, six decimals and 1,000 test tokens; same maximum as the Base Sepolia test scaffold. Distinct name/symbol, example.invalid metadata URI. No freeze authority. Temporary mint and metadata authorities only during initial test asset creation.

Pinned [official CLI source](https://github.com/solana-program/token-2022/blob/e8ca680ca8aeb12f9598524b003c776c6a4168f2/clients/cli/src/command.rs) shows enable_metadata initializing a self pointer (lines 415-426), metadata initialization with rent transfer (645-674), and metadata/pointer authority inspection (1117-1136). Layout from [Token-2022 extension source](https://github.com/solana-program/token-2022/blob/e8ca680ca8aeb12f9598524b003c776c6a4168f2/interface/src/extension/mod.rs) and [metadata state](https://github.com/solana-program/token-metadata/blob/4b4226514a0360ce933a66c9e638e909ecd66068/interface/src/state.rs). No custom transaction encoder or signer. The pinned CLI build/version and exact command arguments must be verified before issuing anything.

## Sequence after review and explicit testnet authorization
1. Use separate disposable Devnet payer and mint accounts, verify genesis, fund exclusively with faucet SOL. Owner retains all private keys; never add them to GitHub.
2. Create Token-2022 mint with metadata pointer to itself, six decimals, no freeze authority or other mint extensions. Initialize metadata with the exact test-only spec in mint-plan.mjs, including rent top-up.
3. Create test holder ATA under Token-2022. Mint exactly 1,000 CLIMBTEST (1,000,000,000 raw units). Revoke metadata update, metadata pointer and mint authorities only after successful verification of issuance and metadata; no real CLIMB mint interaction.
4. Inspect finalized raw mint, authority state, extension bytes, ATA balance and supply. Record actual mint and signatures; no NTT lock until exact testnet manager governance and binding are reviewed.
5. Deploy distinct Base Sepolia test scaffold, verify zero supply, bind only verified NTT manager. Verify both peers before first 1-unit round trip.

The rent script is automatically run on its own scoped main merge, using only public Devnet RPC; no keys and no broadcast. It calculates initial/final mint storage and illustrative immutable-owner ATA rent. It does not include the NTT program image, manager/transceiver accounts, transaction fees or Base gas. Do not claim deployment funding from this estimate alone.

## Pinned Solana local NTT locking integration

A separate CI appends `integration/climb_locking_fixture.rs` to the pinned upstream v3.0.0 transfer test, builds local SBF programs and runs the local bank test. The fixture injects metadata-only mint state, performs actual local Token-2022 issuance and authority revocation before NTT initialization, and checks exact six-decimal locking and unchanged mint bytes. No live network, no real token, no VAA/guardian or reverse-unlock proof. The mainnet feature is solely for the upstream checked-in core fixture; it never authorizes mainnet. Compilation/test success must be observed in CI, and no deployment artifact trust is inferred.
