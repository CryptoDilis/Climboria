# CLIMB V3 #994 re-review — D: build settings and proposed economics
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Complete six named files; GitHub-reported IDs, not independently rehashed. Dependencies are referenced, not vendored in this pack. Actual Safe run 46015224825 job 140560524220 passed 59 Solidity tests, clean rebuild, size limits and local rehearsal; V3 46015224824 and Validate 46015224844 successful. No independent build, real custody, production adapter, real game payout or final legacy eligibility proof. Read policy as proposed, not deployed. Review all applicable source, and list omissions. TESTNET_NO_GO / MAINNET_NO_GO.

## base/safe-custody/foundry.toml
Git blob: a7505e3e5bdebea5e0b4b53ad9f83f43f5be2e40

````
[profile.default]
src = "src"
test = "test"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
allow_paths = ["../v3-testnet"]
remappings = ["safe-contracts/=lib/safe-contracts/contracts/", "openzeppelin-contracts/=lib/openzeppelin-contracts/", "v3-src/=../v3-testnet/src/"]

````

## base/v3-testnet/foundry.toml
Git blob: 60d4b86162d127b5777e6836e853535255c72c34

````
[profile.default]
src = "src"
test = "test"
out = "out"
libs = ["lib"]
remappings = ["openzeppelin-contracts/=lib/openzeppelin-contracts/"]
solc_version = "0.8.19"
evm_version = "london"
optimizer = true
optimizer_runs = 200

````

## .github/workflows/climb-base-safe-custody.yml
Git blob: 71001251a9397175f5588c8d7eba15adf05b4d32

````
name: CLIMB Base Safe Custody Boundary
on:
  pull_request:
    paths:
      - 'base/safe-custody/**'
      - 'base/v3-testnet/src/**'
      - '.github/workflows/climb-base-safe-custody.yml'
  push:
    branches: [main]
    paths:
      - 'base/safe-custody/**'
      - 'base/v3-testnet/src/**'
      - '.github/workflows/climb-base-safe-custody.yml'
permissions:
  contents: read
jobs:
  offline:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: base/safe-custody
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: foundry-rs/foundry-toolchain@dba66c27052e63476d886f22216e119ba7e615bf
        with:
          version: v1.5.0
          cache: false
      - name: Fetch exact Safe v1.4.1 source
        run: |
          set -euo pipefail
          mkdir -p lib/safe-contracts
          git -C lib/safe-contracts init
          git -C lib/safe-contracts fetch --depth=1 https://github.com/safe-fndn/safe-smart-account.git bf943f80fec5ac647159d26161446ac5d716a294
          git -C lib/safe-contracts checkout --detach FETCH_HEAD
          test "$(git -C lib/safe-contracts rev-parse HEAD)" = bf943f80fec5ac647159d26161446ac5d716a294
      - name: Fetch pinned OpenZeppelin source
        run: |
          set -euo pipefail
          mkdir -p lib/openzeppelin-contracts
          git -C lib/openzeppelin-contracts init
          git -C lib/openzeppelin-contracts fetch --depth=1 https://github.com/OpenZeppelin/openzeppelin-contracts.git dc44c9f1a4c3b10af99492eed84f83ed244203f6
          git -C lib/openzeppelin-contracts checkout --detach FETCH_HEAD
          test "$(git -C lib/openzeppelin-contracts rev-parse HEAD)" = dc44c9f1a4c3b10af99492eed84f83ed244203f6
      - name: Exercise actual Safe and proxy custody boundaries
        run: |
          set -euo pipefail
          forge test --match-contract SafeCustodyBoundaryTest -vv | tee "$RUNNER_TEMP/safe-boundary.log"
          grep -Eq '6 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/safe-boundary.log"
      - name: Exercise restricted Safe rotation guard
        run: |
          set -euo pipefail
          forge test --match-contract SafeEpochGuardTest -vv | tee "$RUNNER_TEMP/safe-epoch-guard.log"
          grep -Eq '15 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/safe-epoch-guard.log"
      - name: Exercise actual Safe and seven-vault reserve integration
        run: |
          set -euo pipefail
          forge test --match-contract SafeReserveGuardTest -vv | tee "$RUNNER_TEMP/safe-reserve-guard.log"
          grep -Eq '11 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/safe-reserve-guard.log"
      - name: Exercise atomic quorum issuance and binding
        run: |
          set -euo pipefail
          forge test --match-contract SafeQuorumIssuanceTest -vv | tee "$RUNNER_TEMP/safe-quorum-issuance.log"
          grep -Eq '27 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/safe-quorum-issuance.log"
      - name: Verify Safe custody bytecode size limits
        run: |
          set -euo pipefail
          node --test snapshot-build.test.mjs
          forge clean
          forge build --force
          node snapshot-build.mjs "$RUNNER_TEMP/safe-build-first.json"
          node size-manifest.mjs "$RUNNER_TEMP/safe-custody-size.json"
          forge clean
          forge build --force
          node snapshot-build.mjs "$RUNNER_TEMP/safe-build-second.json"
          node size-manifest.mjs "$RUNNER_TEMP/safe-custody-size-second.json"
          cmp "$RUNNER_TEMP/safe-build-first.json" "$RUNNER_TEMP/safe-build-second.json"
          cmp "$RUNNER_TEMP/safe-custody-size.json" "$RUNNER_TEMP/safe-custody-size-second.json"
          echo "Clean rebuild artifact comparison passed"
      - uses: actions/upload-artifact@v4
        with:
          name: safe-clean-rebuild-evidence
          path: |
            ${{ runner.temp }}/safe-build-first.json
            ${{ runner.temp }}/safe-build-second.json
          if-no-files-found: error
          retention-days: 14
      - uses: actions/upload-artifact@v4
        with:
          name: safe-custody-size
          path: ${{ runner.temp }}/safe-custody-size.json
          if-no-files-found: error
          retention-days: 14
      - name: Rehearse separate mined setup and quorum issuance transactions locally
        run: |
          set -euo pipefail
          node --test verify-runtime-template.test.mjs
          node local-deployment-rehearsal.mjs "$RUNNER_TEMP/safe-local-rehearsal.json"
      - uses: actions/upload-artifact@v4
        with:
          name: safe-local-rehearsal
          path: ${{ runner.temp }}/safe-local-rehearsal.json
          if-no-files-found: error
          retention-days: 14
      - name: Verify frozen testnet build and fail-closed preflight
        run: |
          set -euo pipefail
          if node -e "process.exit(require('./frozen-testnet-candidate.json').status==='RETIRED_PENDING_VERIFIED_REPIN'?0:1)"; then
            if node testnet-preflight.mjs --verify-build; then
              echo "Retired candidate unexpectedly accepted"; exit 1
            fi
          else
            node testnet-preflight.mjs --verify-build
          fi
          node --test testnet-preflight.test.mjs
          if node testnet-preflight.mjs testnet-preflight.example.json "$RUNNER_TEMP/blocked-preflight.json"; then
            echo "Blank config unexpectedly accepted"; exit 1
          fi
          test ! -e "$RUNNER_TEMP/blocked-preflight.json"
      - name: Verify offline custody role-control evidence
        run: node --test role-control-evidence.test.mjs
      - name: Verify fee-budget observation arithmetic
        run: node --test observe-fee-budget.test.mjs
      - name: Check active public evidence pin
        id: public-pin
        run: node -e "console.log('active='+String(require('./frozen-testnet-candidate.json').status==='TEST_ONLY_FROZEN_BUILD_NOT_APPROVAL'))" >> "$GITHUB_OUTPUT"
      - name: Observe exact first-stage gas and illustrative L2 budget
        if: github.ref == 'refs/heads/main' && steps.public-pin.outputs.active == 'true'
        run: |
          set -euo pipefail
          node observe-fee-budget.mjs "$RUNNER_TEMP/safe-local-rehearsal.json" > "$RUNNER_TEMP/safe-fee-budget.json"
          cat "$RUNNER_TEMP/safe-fee-budget.json"
      - uses: actions/upload-artifact@v4
        if: github.ref == 'refs/heads/main' && steps.public-pin.outputs.active == 'true'
        with:
          name: safe-fee-budget-observation
          path: ${{ runner.temp }}/safe-fee-budget.json
          if-no-files-found: error
          retention-days: 14

````

## .github/workflows/climb-base-v3-prototype.yml
Git blob: 19d2893d9fd96e9dd61a2d85800bb3935eba5a91

````
name: CLIMB Base V3 Allocation Prototype
on:
  workflow_dispatch:
    inputs:
      payer:
        description: 'Public Base Sepolia payer (synthetic role estimate only; no deployment)'
        required: true
        type: string
      role_config:
        description: 'Optional JSON with public founder, distributor and five signers; NEVER private keys'
        required: false
        type: string
      prepare_review:
        description: 'Prepare unsigned review artifact only (requires public roles and funded test payer)'
        required: false
        type: boolean
        default: false
  pull_request:
    paths:
      - 'base/v3-testnet/**'
      - '.github/workflows/climb-base-v3-prototype.yml'
  push:
    branches: [main]
    paths:
      - 'base/v3-testnet/**'
      - '.github/workflows/climb-base-v3-prototype.yml'
permissions:
  contents: read
jobs:
  offline:
    if: github.event_name != 'workflow_dispatch' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: base/v3-testnet
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: foundry-rs/foundry-toolchain@dba66c27052e63476d886f22216e119ba7e615bf
        with:
          version: v1.5.0
          cache: false
      - name: Fetch pinned OpenZeppelin source
        run: |
          set -euo pipefail
          mkdir -p lib/openzeppelin-contracts
          git -C lib/openzeppelin-contracts init
          git -C lib/openzeppelin-contracts fetch --depth=1 https://github.com/OpenZeppelin/openzeppelin-contracts.git dc44c9f1a4c3b10af99492eed84f83ed244203f6
          git -C lib/openzeppelin-contracts checkout --detach FETCH_HEAD
          test "$(git -C lib/openzeppelin-contracts rev-parse HEAD)" = dc44c9f1a4c3b10af99492eed84f83ed244203f6
      - name: Run exact offline V3 prototype tests
        run: |
          set -euo pipefail
          forge test --match-contract ClimbV3TestTokenTest -vv | tee "$RUNNER_TEMP/climb-v3-tests.log"
          grep -Eq '13 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-tests.log"
      - name: Run isolated restricted spend tests
        run: |
          set -euo pipefail
          forge test --match-contract V3RestrictedSpendTest -vv | tee "$RUNNER_TEMP/climb-v3-spend-tests.log"
          grep -Eq '15 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-spend-tests.log"
      - name: Run integrated V3 reserve tests
        run: |
          set -euo pipefail
          forge test --match-contract ClimbV3IntegratedTestTokenTest -vv | tee "$RUNNER_TEMP/climb-v3-integrated-tests.log"
          grep -Eq '6 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-integrated-tests.log"
      - name: Run shared expense successor fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3SharedExpenseTest -vv | tee "$RUNNER_TEMP/climb-v3-shared-expense-tests.log"
          grep -Eq '7 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-shared-expense-tests.log"
      - name: Run bounded legacy successor fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3BoundedLegacyTest -vv | tee "$RUNNER_TEMP/climb-v3-bounded-legacy-tests.log"
          grep -Eq '10 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-bounded-legacy-tests.log"
      - name: Run synthetic liquidity successor fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3LiquidityPolicyTest -vv | tee "$RUNNER_TEMP/climb-v3-liquidity-tests.log"
          grep -Eq '7 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-liquidity-tests.log"
      - name: Run custody epoch policy fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3EpochPolicyTest -vv | tee "$RUNNER_TEMP/climb-v3-epoch-tests.log"
          grep -Eq '7 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-epoch-tests.log"
      - name: Run atomic seven-policy successor fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3AtomicSuccessorTest -vv | tee "$RUNNER_TEMP/climb-v3-atomic-successor-tests.log"
          grep -Eq '10 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-atomic-successor-tests.log"
      - name: Run signed game reward fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3GameRewardTest -vv | tee "$RUNNER_TEMP/climb-v3-game-reward-tests.log"
          grep -Eq '9 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-game-reward-tests.log"
      - name: Run isolated governed game reward tests
        run: |
          set -euo pipefail
          forge test --match-contract V3GovernedGameRewardTest -vv | tee "$RUNNER_TEMP/climb-v3-governed-reward-tests.log"
          grep -Eq '6 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-governed-reward-tests.log"
      - name: Run deferred liquidity fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3DeferredLiquidityTest -vv | tee "$RUNNER_TEMP/climb-v3-deferred-liquidity-tests.log"
          grep -Eq '9 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-deferred-liquidity-tests.log"
      - name: Run deferred legacy fixture tests
        run: |
          set -euo pipefail
          forge test --match-contract V3DeferredLegacyTest -vv | tee "$RUNNER_TEMP/climb-v3-deferred-legacy-tests.log"
          grep -Eq '12 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-deferred-legacy-tests.log"
      - name: Run isolated binary legacy proof verifier tests
        run: |
          set -euo pipefail
          forge test --match-contract V3LegacyProofVerifierTest -vv | tee "$RUNNER_TEMP/climb-v3-legacy-proof-tests.log"
          grep -Eq '6 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-legacy-proof-tests.log"
      - name: Run isolated legacy proof claim tests
        run: |
          set -euo pipefail
          forge test --match-contract V3LegacyProofClaimTest -vv | tee "$RUNNER_TEMP/climb-v3-legacy-claim-tests.log"
          grep -Eq '8 tests passed, 0 failed, 0 skipped' "$RUNNER_TEMP/climb-v3-legacy-claim-tests.log"
      - name: Fingerprint integrated test build (no deployment)
        env:
          V3_SOURCE_SHA: ${{ github.sha }}
        run: |
          set -euo pipefail
          forge build
          node build-manifest.mjs "$RUNNER_TEMP/v3-build-manifest.json"
      - name: Verify original deployed creation template remains unchanged
        run: |
          node --input-type=module -e 'import {readFileSync} from "node:fs"; import assert from "node:assert/strict"; const m=JSON.parse(readFileSync(process.env.RUNNER_TEMP+"/v3-build-manifest.json","utf8")); const t=m.contracts.find(x=>x.name==="ClimbV3IntegratedTestToken"); assert.equal(t.creationSha256,"75a53139963cbbf3b62e8769f22064f3a7c4056d1b772be7f64ac15c8aa383cd"); assert.equal(t.runtimeTemplateSha256,"10908e061fc8bb75381a1c17bf221657a3ee802145237472b8df63b173511c30");'
      - name: Verify successor contract size limits
        env:
          V3_SOURCE_SHA: ${{ github.sha }}
        run: node successor-size-manifest.mjs "$RUNNER_TEMP/v3-successor-size.json"
      - uses: actions/upload-artifact@v4
        with:
          name: climb-v3-successor-size
          path: ${{ runner.temp }}/v3-successor-size.json
          if-no-files-found: error
          retention-days: 14
      - name: Archive test-only build evidence
        uses: actions/upload-artifact@v4
        with:
          name: climb-v3-build-manifest
          path: ${{ runner.temp }}/v3-build-manifest.json
          if-no-files-found: error
          retention-days: 14
      - name: Test local durable game reward reservations
        run: node --test game-reward-reservation.test.mjs
      - name: Test synthetic canonical legacy manifest evidence
        run: node --test legacy-canonical-evidence.test.mjs
      - name: Test synthetic indexed legacy allocation-sum proofs
        run: node --test legacy-sum-proof.test.mjs
      - name: Test canonical binary legacy proof generator
        run: node --test legacy-binary-proof.test.mjs
      - name: Test synthetic legacy key-control signatures
        run: node --test legacy-owner-proof.test.mjs
      - name: Test synthetic legacy manifest proof consumption
        run: node --test legacy-owner-ledger.test.mjs
      - name: Test V3 read-only estimator
        run: node --test estimate-creation.test.mjs
      - name: Test unsigned review binding
        run: node --test unsigned-review.test.mjs
      - name: Test finalized V3 creation verifier
        run: node --test verify-creation.test.mjs
      - name: Test historical pre-start verifier
        run: node --test check-prestart.test.mjs
      - name: Test exact monthly unlock disclosure
        run: node --test unlock-schedule.test.mjs
      - name: Generate test fixture unlock schedule
        run: node unlock-schedule.mjs > "$RUNNER_TEMP/v3-unlock-schedule.json"
      - uses: actions/upload-artifact@v4
        with:
          name: climb-v3-test-fixture-unlock-schedule
          path: ${{ runner.temp }}/v3-unlock-schedule.json
          if-no-files-found: error
          retention-days: 14
      - name: Estimate V3 creation (read-only, never deploy)
        if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'
        env:
          TEST_PAYER: ${{ inputs.payer }}
          TEST_ROLE_CONFIG: ${{ inputs.role_config }}
        run: |
          set -euo pipefail
          node estimate-creation.mjs "$RUNNER_TEMP/v3-build-manifest.json" "$GITHUB_SHA" "$TEST_PAYER" > "$RUNNER_TEMP/v3-creation-estimate.json"
          cat "$RUNNER_TEMP/v3-creation-estimate.json"
      - uses: actions/upload-artifact@v4
        if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'
        with:
          name: climb-v3-creation-estimate
          path: ${{ runner.temp }}/v3-creation-estimate.json
          if-no-files-found: error
          retention-days: 7
      - name: Prepare unsigned review artifact (no signing)
        if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.prepare_review
        env:
          TEST_PAYER: ${{ inputs.payer }}
          TEST_ROLE_CONFIG: ${{ inputs.role_config }}
        run: |
          set -euo pipefail
          node unsigned-review.mjs "$RUNNER_TEMP/v3-build-manifest.json" "$GITHUB_SHA" "$TEST_PAYER" "$RUNNER_TEMP/v3-creation-estimate.json" "$RUNNER_TEMP/v3-unsigned-review.json"
      - uses: actions/upload-artifact@v4
        if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.prepare_review
        with:
          name: climb-v3-unsigned-review
          path: ${{ runner.temp }}/v3-unsigned-review.json
          if-no-files-found: error
          retention-days: 3

````

## base/CLIMB_TOKENOMICS_V3.md
Git blob: e486b8df0d56503323824e189dc863422e737590

# CLIMB Base tokenomics V3 — investor-readiness review
2026-11-26 UTC. Founder selected 888,888,888 as proposed fixed initial Base supply and asked to proceed if the design withstands review. V3 is the recommended engineering baseline, not unconditional owner approval of issuance, allocations, eligibility, sale or mainnet release. Status DESIGN_GO / MAINNET_NO_GO.

## Exact proposed allocation (6 decimals)
| Purpose | Share | CLIMB |
| --- | ---: | ---: |
| Gaming rewards | 35% | 311111110.800000 |
| Liquidity reserve | 25% | 222222222.000000 |
| Ecosystem & Launchpad | 15% | 133333333.200000 |
| Community & Marketing | 10% | 88888888.800000 |
| Treasury & Operations | 12% | 106666666.560000 |
| Founder & Team | 2% | 17777777.760000 |
| Legacy holder compensation reserve (maximum) | 1% | 8888888.880000 |
| Total | 100% | 888888888.000000 |

Integer accounting verified: 888888888000000 raw units, no rounding deficit. This supersedes earlier denominations as the working design, not the historical evidence. No hidden allocation, no additional mint after initial issuance, standard non-upgradeable ERC-20, holder-only voluntary burn, no transfer tax, blacklist or forced confiscation. Marketplace/service fees are distinct from token transfer taxes; rates still subject to approval. Neither burns nor fixed supply guarantee appreciation.

## Investor concerns and proposed controls
1. Gaming: 60-month controlled distribution; annual maximum shares of gaming allocation 30/25/20/15/10%, exact annual ceilings 93333333.240000 / 77777777.700000 / 62222222.160000 / 46666666.620000 / 31111111.080000 CLIMB. Not mandatory emissions or halving. Implement monthly subcaps, verified gameplay, anti-bot/anti-cheat, sustainable demand and optional sinks; start rewards only after game and economy readiness. Reduce actual release if liquidity or demand is insufficient. Unused allocations remain locked; no automatic acceleration or catch-up dumps. Define post-term remaining reserve and policy before launch.
2. Liquidity: 25% is a token reserve, not already funded or locked LP. Reserve to verifiable restricted custody, staged pairing only with funded ETH/USDC, publish exact initial float, paired amount, pool type, lock duration and ownership. Target minimum 24-month independently verifiable lock on initial LP positions; review fee collection, position management, unlock and emergency policy for selected pool/locker. No founder unilateral withdrawal or token sale. A lock does not prevent price collapse or other risk. If no funded quote asset, defer trading launch.
3. Ecosystem & Launchpad: proposed internal percentages of whole supply: 5% qualified launchpad incentives/development, 3% partnerships, 3% chain integrations, 2% developer grants, 2% future expansion. Milestone-based release over 60 months, no unrestricted initial unlock. No subsidized token purchases or undisclosed related-party grants. Publish grant criteria, recipients/amounts where appropriate and measurable deliverables.
4. Community & Marketing: separate 10% budget for verified quests, community, campaigns and disclosed marketing compensation; no automatic airdrops, wash trading or price promotion promises. Define monthly/milestone limits and anti-Sybil criteria before launch. No staking APY or public sale promised.
5. Treasury: 12% operating budget, distinct from growth programs, public expense policy and periodic allocation/release reports. Disclose actual founder salary/related-party payments separately; never route founder vesting around the lock using other budgets. All managed reserves have distinct verifiable wallets/vaults, enforceable restrictions, independent signer participation and no single founder control. Proposed 3-of-5 multisig with at least three independent signers, reviewed conflicts and transaction timelocks where appropriate; actual signers and contracts unresolved. Low founder allocation alone does not eliminate concentration risk.
6. Founder/team: zero initial unlock; 12-month cliff with zero accrued catch-up release at cliff, then 36 monthly installments (48 months total), cumulative integer floor and final remainder settlement. No acceleration, revocation to unrestricted team wallet, admin bypass or transfer of vesting rights designed to evade lock. Publish beneficiaries and vesting contracts subject to privacy/legal review.
7. Legacy: separately disclosed 1% maximum segregated reserve, NOT automatically distributed. Observed external candidate total 1060338.773023 legacy units; full reserve divided by that provisional weight would imply about 8.383065 Base units per legacy unit, not a recommended ratio or price parity. Require independent valuation, verified snapshot/beneficial holders, good-faith purchaser treatment, founder conflict disclosure, fair public notice, claims and appeals. Choose actual grant budget <= cap before activation; no ongoing 1:1 conversion or automatic eligibility for later purchases after approved cutoff. No reallocation of unused cap to insiders; proposed burn only after reviewed claims/appeals closure. Preserve original Solana contract/supply disclosure; distinct replacement economy, not supply-conserving migration. Founder reported legacy holdings handled separately under reviewed policy, not hidden insider payout.
8. Circulating supply: publish exact launch float and monthly maximum unlock schedule across all reserves; no presumption that 888888888 is circulating. No launch price, FDV, liquidity sufficiency or investor return claim without data. Show locked balances, actual releases, pool reserves and burns with verifiable links; distinguish circulating supply methodology from on-chain total supply.

## Remaining launch blockers
Actual quote-asset liquidity budget, final vesting/LP locker implementation and independent signer custody, approved launch float and all-category monthly release caps, independently verified eligibility and actual compensation budget, legal/consumer review, integrated Base Sepolia acceptance and independent review of exact production artifact. No investor/grant approval guarantee. Owner conditional instruction does not authorize mainnet while these holes remain. No actual issuance, wallet signing, holder allocation, public tokenomics replacement or fund movement.

Next: implement exact V3 allocation and vesting/controlled-release engineering design on testnet only, with integer supply conservation and no bypass; confirm actual liquidity budget and legacy terms before public launch. See CLIMB_BASE_RELEASE_GATES.md.

## Public presentation and marketing sub-budget proposal — 2026-11-27 UTC
Owner requested publication of V3 tokenomics on homepage and whitepaper, including marketing, partnerships, giveaways, airdrops and CEX listing planning. Proposed subdivisions of the existing 10% Community & Marketing reserve, expressed as shares of total initial supply: airdrops 3% (26,666,666.64 CLIMB), giveaways 1% (8,888,888.88), marketing 4% (35,555,555.52), community events 2% (17,777,777.76). Total 10%; no increase in issuance. These are planning ceilings, not approved executable subcaps, entitlements or launch commitments. Existing ecosystem partnership sub-budget remains 3% of total supply. No dedicated CEX budget approved: evaluate capped Treasury & Operations expenses with actual counterparty, asset, fees and funding review. No listing or conversion guarantee. Proposed campaign controls include approved terms, anti-abuse, unique expense/campaign IDs, reviewed funded distribution mechanism, future 3-of-5 approvals and applicable delay/caps; team reserves locked pending viable phased custody and release approval. Current expense vaults are not a general airdrop distributor. No new contract changes or fund movement. Public pages must label all as proposed and not live. Remove old mint display and historical supply card; retain short prior-holder safety disclosure and internal evidence for eligibility and appeals. This does not delete on-chain history, change existing holder policy or approve issuance.


## base/V3_PRODUCTION_RELEASE_SPEC.md
Git blob: ff452501ecde03b03bab3e20b79b19fab93493ab

# V3 production reserve release specification — review draft

Status: DESIGN_REVIEW_REQUIRED / MAINNET_NO_GO. The Base Sepolia integrated allocation fixture is finalized and verified ([run 45912751132](https://github.com/CryptoDilis/Climboria/actions/runs/45912751132)); it is NOT a production token. Its liquidity/legacy vaults are permanently inert and the five fixed signers cannot rotate. No production recipients, contract dependencies, quote assets, snapshot or eligibility approved.

## 1. Immutable supply and reserve separation

Use the V3 working allocation in CLIMB_TOKENOMICS_V3.md, with 6 decimals and exactly 888888888000000 initial raw units. Mint once atomically to seven distinct policy contracts; no issuer-controlled float, further mint, confiscation, hidden transfer fee or upgrade bypass. Holder-only burn reduces supply; no reserve refills from burned capacity. Every vault has immutable token identity and purpose. No generic arbitrary call, delegatecall, unlimited allowance, sweep, rescue of CLIMB, or alternate spending path. Any rescue of unrelated assets must be explicitly scoped and reviewed.

Accounting invariant: sum of seven initial allocations = initialSupply; actual totalSupply = initialSupply - verified burns; claims and releases transfer existing tokens, never mint. Track per-purpose spent amounts, outstanding obligations, and locked balances separately; unsolicited transfers must not increase authorized budget. Do not equate all tokens outside reserve contracts with actual circulating supply. Publish verified balances and a separately defined circulation methodology.

## 2. Custody and common expense policy

Select an independently reviewed deployed multisig implementation, exact version, owners and threshold, recovery behavior and module/guard configuration before funding. Proposed 3-of-5 with at least three independent signers. A Safe-like wallet alone is not a spending policy. Asset and reserve constraints must be enforced in separate non-upgradeable contracts. Signer replacement must not change purpose, budgets, beneficiaries or schedule, and pending approvals must not survive signer epoch changes. Recovery below quorum, delayed rotation, threshold preservation and key loss must be reviewed; no unilateral hidden administrator. No real signer selection here.

For ecosystem/community/treasury, shared expense registry must atomically consume unique reviewed expense IDs across purposes. IDs cannot alone prove a real invoice or beneficial recipient; independent conflict-of-interest and duplicate-invoice process is required. Each release binds asset, chain, vault, purpose, recipient, amount, approved period, unique expense ID and current signer epoch. Execute only within cap and timelock; mark registry consumed before external token transfer, revert atomically on failure. Never reset a consumed ID on cancellation or signer rotation. An unused proposal may be cancelled before execution. No alternate direct treasury path or founder compensation through grant budgets. Proposed policy remains subject to independent review.

## 3. Liquidity reserve (222222222000000 raw)

No initial quote asset or funded pool is assumed. No public trading activation until actual quote assets are available and launch float/price and risk disclosures reviewed. Distinguish a restricted token reserve from a funded LP position. Prefer dedicated policy-controlled staging that cannot transfer unrestricted CLIMB to an EOA. Each approved liquidity action must specify exact chain, CLIMB/quote pair, vetted factory/router or position manager, pool identity, amounts, maximum slippage, price/range bounds where applicable, fee recipient, LP custody/lock and minimum lock expiration. Require atomic mint/deposit of the LP position to approved locker/custody with measurable token consumption and no arbitrary residual allowance. Return unspent CLIMB to reserve; quote accounting and fee collection are separate. Use only allowlisted exact code and reviewed selectors, not arbitrary route calldata. If cannot independently verify custody/lock (including concentrated liquidity position NFT behavior), keep tokens locked and trading deferred.

Proposed initial LP lock >= 24 months; not yet a selected locker, funded position or guarantee. Position changes, emergency policy and post-lock exit need independent review and explicit disclosure. No unilateral founder withdrawal, off-market disposal, or release of unused reserve through an LP management loophole.

## 4. Legacy reserve (maximum 8888888880000 raw)

Separate replacement economy, not a permanent bridge. Legacy Solana supply can continue to exist/trade. No automatic 1:1 conversion. No snapshot, exchange ratio or holder entitlement approved. Establish independent historical evidence, beneficial ownership, later good-faith buyer treatment, appeals, conflict review and legal/consumer review before choosing actual cap C <= reserve maximum.

Prefer a pre-funded immutable one-time claims campaign, with one approved commitment/root and exact aggregate cap, deadline and reviewed appeals window. Activation requires an independently reproduced manifest and explicit production authorization; no root substitution or extra mint. If campaign is not ready at token creation, use an independently reviewed one-time bounded activation mechanism with immutable asset/cap/purpose, no unrestricted recipient payout or arbitrary root/contract replacement. Do not release reserve to an ordinary admin wallet. Enforce source authorization, destination control, version/chain/contract binding, unique entitlement and durable cross-deployment replay protection; claims must pay from funded reserve. After disclosed claims and appeals closure, unused/dust disposition must match approved policy (proposed burn, no insider reallocation). No forced legacy surrender. Current inert fixture cannot activate claims.

## 5. Public acceptance and blocking decisions

Creation observed: exact seven vault balances, zero deployer/role float, immutable runtime/getters and total supply. Historical negative tests separate; actual positive releases require elapsed public schedule and authorized test actions. Local time warp validates math but not elapsed public time. The start of existing test deployment is 1796316972 (2026-12-03 16:56:12 UTC); month = 30 days. Do not accelerate its schedule. The founder receives nothing until first installment at model month 13, full at month 48. Gaming and restricted expense windows run 60 model months. Restricted approval delay 48 hours. A separate accelerated fixture is not equivalent evidence.

| Decision / evidence | Blocking production condition |
| --- | --- |
| Custody | Exact implementation, independent owners, recovery and policy enforcement reviewed |
| Liquidity | Select exact pool/locker integration and approved launch float/budget or documented zero-funded deferral |
| Legacy | Reviewed cutoff, eligibility, claims/appeals, cap and activation mechanism |
| Gaming | Verified game events, abuse prevention, distributor controls, unused reserve policy |
| Aggregate unlock | Publish exact per-purpose and aggregate monthly maxima and initial float |
| Security | Reproduce exact production build, adversarial independent review, remediate material findings and verify integrated candidate |
| Release | Explicit approval of exact mainnet artifact and real destinations, verified finalized issuance, official CA/disclosures; separate claim/trading gates |

Do not build a live token using inert test reserve contracts. No production deployment authorized. Do not publish the testnet CA as official CLIMB.

