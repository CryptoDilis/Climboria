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

The successful initial locking test is recorded in PR #707 / run #45349377435. The extended local fixture now also attempts mock-attested six-decimal reverse unlock and exact replay rejection, restoring user balance and empty custody without changing mint bytes. This is a local simulated guardian fixture, not live guardian proof or a Base-to-Solana transaction. Extended CI passed: PR #715 / run #45354399241; mock-attested release and exact replay rejection observed.


## Operator command reference (source-verified, NOT executed)
2026-11-24 UTC. The pinned Token-2022 CLI [clap_app.rs](https://github.com/solana-program/token-2022/blob/e8ca680ca8aeb12f9598524b003c776c6a4168f2/clients/cli/src/clap_app.rs) defines global `--config`, `--url`, `--program-2022` (lines 653–728), create-token keypair/mint authority/decimals/freeze (744–784), enable-metadata (939–945), initialize-metadata positional fields and authorities (1077–1136), create-account (1311–1344), authorize/disable (1384–1440), mint/recipient (1627–1657), and kebab-case authority names including metadata-pointer and metadata (238–258). [command.rs](https://github.com/solana-program/token-2022/blob/e8ca680ca8aeb12f9598524b003c776c6a4168f2/clients/cli/src/command.rs) dispatches metadata authority changes to token_metadata_update_authority, distinct from pointer authority. The installed CLI version/build and its actual help must still be checked. Do not run any creation or revocation automatically in CI.

**Prerequisites:** local owner-controlled disposable payer and NEW mint keypair files outside this repository, a separate local CLI config file, faucet SOL, and explicit owner approval of test-only creation. Never import production keys. Do not proceed if any identity or balance checks fail. Example Bash reference with variables set locally by the owner:

```bash
# Set these three paths locally; do not send or commit their contents.
PAYER=/path/to/disposable-devnet-payer.json
NEW_MINT=/path/to/new-devnet-mint.json
CFG=/path/to/separate-devnet-config.yml
RPC=https://api.devnet.solana.com
PAYER_PUB=$(solana-keygen pubkey "$PAYER")
MINT=$(solana-keygen pubkey "$NEW_MINT")
test -n "$PAYER_PUB" && test -n "$MINT" && test "$MINT" != "$PAYER_PUB" || exit 1
test "$MINT" != 9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump || exit 1
test "$(solana --url "$RPC" genesis-hash)" = EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG || exit 1
solana --config "$CFG" config set --url "$RPC" --keypair "$PAYER"
spl-token --version
spl-token --program-2022 create-token --help
spl-token --program-2022 authorize --help
solana --url "$RPC" balance "$PAYER_PUB"

# Every invocation has an explicit Devnet RPC, Token-2022 program and fee payer.
# Recheck network before each invocation; stop on any failure.
st() {
  test "$(solana --url "$RPC" genesis-hash)" = EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG || return 1
  spl-token --config "$CFG" --url "$RPC" --program-2022 --fee-payer "$PAYER" "$@"
}
```

**Creation stage (only after owner approval):** run one command at a time; inspect each finalized result before continuing. Confirm the new mint account does not exist before create-token, and never repeat mint issuance blindly after an ambiguous result.

```bash
st create-token "$NEW_MINT" --decimals 6 --enable-metadata --mint-authority "$PAYER_PUB"
st initialize-metadata "$MINT" 'CLIMB Devnet Test Only' CLIMBTEST 'https://example.invalid/climb-testnet.json' --mint-authority "$PAYER" --update-authority "$PAYER_PUB"
st create-account "$MINT" --owner "$PAYER_PUB"
# Set ATA to the exact verified Token-2022 associated token account returned above.
# Verify ATA mint, owner and zero balance, and zero mint supply before issuing.
st mint "$MINT" 1000 "$ATA" --mint-authority "$PAYER"
```

**Separate irreversible authority-revocation stage:** first verify finalized mint/ATA supply is exactly 1,000,000,000 raw units, six decimals, self metadata pointer, matching test name/symbol/URI, no freeze authority or extra extensions; verify each current authority equals the local disposable payer. After owner confirms this exact new mint, run separately, inspecting after each step:

```bash
st authorize "$MINT" metadata --disable --authority "$PAYER"
st authorize "$MINT" metadata-pointer --disable --authority "$PAYER"
st authorize "$MINT" mint --disable --authority "$PAYER"
```

Do NOT use update-metadata-address --disable: that removes the pointer rather than revoking its authority. Final raw inspection must confirm both metadata and pointer authorities null, pointer still self, mint/freeze authorities null, and unchanged issued supply. Record the actual new Devnet mint, holder ATA, finalized signatures, tool versions and raw evidence. If any command fails or has an uncertain outcome, stop and inspect chain state instead of repeating. No NTT manager binding or transfers from this procedure. No mainnet.

Next: owner provides dedicated public testnet payer addresses, checks funding and exact CLI help, then performs approved test-only creation; compare actual finalized raw evidence. PR #715 local reverse unlock succeeded (run #45354399241, merge 3a871de5abc5a6e6eb40a2ea62fd723812dc4c43); actual testnet assets remain uncreated.

## Stage 28 — finalized test mint inspection (2026-11-24 UTC)
Added separate read-only Devnet verifier for the distinct newly created mint and canonical Token-2022 holder ATA. It requires exact test supply/metadata and extension layout, full holder balance, initialized immutable-owner ATA, no delegate/freeze/close authority, and expected authority state (`issued` = holder retains mint/pointer/metadata authority; `revoked` = all three null). Checks paired finalized accounts at one RPC context, hashes raw bytes, rejects original CLIMB mint, no signing or revocation. Manual main-only workflow [Created Test Mint Verification](https://github.com/CryptoDilis/Climboria/actions/workflows/climb-solana-created-test-mint-verification.yml) available after merge. Run issued before irreversible revocations and revoked after all three finalized. Single provider evidence only. PR/CI pending; no actual test mint or wallet yet. Next: verify CI, obtain dedicated funded public payer addresses, owner creates test assets and runs both inspections before manager binding. Mainnet NO_GO.
