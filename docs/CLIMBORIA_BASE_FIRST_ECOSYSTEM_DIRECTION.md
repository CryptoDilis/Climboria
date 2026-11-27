# Climboria — Base-first, multichain ecosystem direction
Owner direction received 2026-11-27 UTC. Status: PRODUCT_DIRECTION_APPROVED / IMPLEMENTATION_PENDING. Applies across Game, Base token, DEX/Swap, ClimbX, Launchpad, homepage and whitepaper.

## Product decision
Base is the intended primary blockchain and default network of Climboria's ecosystem and main UI. Solana is retained as a secondary supported blockchain alongside Ethereum, BNB Chain and future separately verified networks; Solana is not an EVM chain. Previous Solana-first prioritization is superseded for new product planning, not a directive to remove working routes or bypass security controls. Existing Solana token identity, history, balances and records must not be erased or misrepresented.

## Implementation requirements
| Workstream | Target direction | Acceptance |
|---|---|---|
| Main UI / whitepaper | Base-first chain branding, navigation, wallet context and default selection | Accurate network labels; distinguish live, test-only, quote-only and planned features; do not invent a Base CA or claim live issuance. Keep user-selected chain on subsequent visits where safe. |
| Game (Jarrell's Peak and Arena) | Base for future blockchain-backed assets, ownership, reward settlement and optional on-chain actions | Retain existing email/social/guest authentication and real-time off-chain movement, combat, chat and cloud saves; link wallet separately. Authenticate game event ledger, prevent replay, respect caps and custody. Gameplay remains playable without an on-chain transaction per action. |
| CLIMB | Base intended primary token network | Current public Solana mint remains distinct and accurately disclosed. No mainnet issue, supply change, bridge, migration or token claim until supply model, source eligibility, security review and release gates are approved. |
| DEX / Swap | Base primary default; Solana and other EVM chains selectable | Preserve verified functionality and fail-closed execution gates; per-chain provider/token/transaction verification; no unsupported route presented as live; do not silently switch wallet networks or sign. |
| ClimbX | Base-first strategy and execution integration | Separate chain-specific execution, budget denomination and risk policies; preserve existing Solana policy until explicitly redesigned. No execution without verified DEX path and authorization. |
| Climboria Signature Launchpad | Base first, then additional supported networks | Separate chain-specific launch contracts, fees, supply and verification; no automatic launch or funds. |

## Implementation order
1. Inventory homepage, navigation, whitepaper, wallet/network defaults, runtime gates and current public disclosures. Implement a chain capability model and Base-first UI defaults without altering security gates.
2. Continue Base V3 remediation and exact CI; verify #921 and T07 evidence. Decide T11 cross-chain supply model before any public Base token issuance. A Base-first product is not permission to mint a duplicate supply or replace Solana balances.
3. Align Game wallet linking and future reward settlement with Base while preserving existing real-time gameplay and auth. Finish authenticated event evidence and custody reviews before token rewards.
4. Reprioritize Base DEX/Swap; retain Solana routes at their actual verified readiness. Expand ClimbX and Launchpad only after verified execution and chain-specific review.
5. Verify desktop/mobile UI, network switching, identity, no false live claims, and exact production release evidence. Update workstream development records with PR/SHA, CI, remaining gates.

## Non-negotiable safety and release state
This is a product-direction decision, not approval of new token economics or transactions. ETH on Base mainnet and Base Sepolia ETH are separate gas assets. No live wallet signing, public deployment, liquidity funding, legacy holder allocation, real bridge or migration authorized by this record. Base V3 TESTNET_NO_GO / MAINNET_NO_GO remain unchanged pending existing review gates. No inference of user eligibility from founder status or former token holdings. No personal financial details recorded here.

## Open decisions
Canonical bridge versus migration/replacement, authoritative Solana snapshot/cutoff if applicable, total supply conservation, real Base asset contract selection, game reward settlement and chain-specific ClimbX budget units require separate review. Preserve existing allocations until a deliberate reviewed decision changes them. Base default is a UX priority, not mandatory wallet switching or a requirement to hold CLIMB to play.

## First UI implementation cycle — 2026-11-27 UTC
[PR #923](https://github.com/CryptoDilis/Climboria/pull/923), exact head 7e828869ca3f697ca6eecdafc90816341104414b. Homepage/whitepaper Base-first roadmap, existing EVM sign-in option first, disabled DEX preview label updated, Base default Swap URL restoration with explicit Solana and legacy mint-pair compatibility, initial Solana-only controls disabled and Jupiter handoff hidden, Base market table prioritized on desktop/mobile. Two regression tests added in existing Jupiter handoff suite. No execution gates, authentication methods, Game runtime, token contracts, supply or migration changed. Source changes pending exact CI and browser acceptance; not merged or deployed. Next verify #923, repair any old Solana-default expectations in existing tests without weakening security, verify desktop/mobile market order, Base default and explicit Solana routes, then merge only green and verify Pages deployment. Continue Base token T07/T11 and Game wallet/reward planning separately.

### Initial CI correction — 2026-11-27 UTC
Initial Base Swap Read-Only Market Safety run 45944559318 job 140326180263 failed two static assertions requiring the Base external handoff to remain hidden before initialization. Restored hidden initial markup for both external handoffs; existing network initialization reveals only the selected chain's handoff. Updated Swap title and description. Corrected head eea1123fb0375de5b16c248825030a6d1dc6559e; exact fresh CI pending. No safety test removed, no native execution enabled. Next verify corrected CI and existing browser tests before merge. DEX/Swap workstream's large historical development record was not retrievable in full via the connector; this dedicated direction record is the handoff for these UI changes.
