# EVM multichain market validation candidate — 2026-11-27 UTC

Scope: DEX / Swap only. Parent PR #1011 prior head 527448ee passed all five workflows (46032654299, 46032654348, 46032654317, 46032654409, 46032654429). Reconciled with main 033226684776c79f923275991c4fa0bdcbabf37c at b2471404f3ac65c4ddfe5e89ddcc89dabbb6551c; exact five Swap paths preserved. Fresh parent CI pending; no merge or public deployment claimed.

## Candidate
- a9dbb5e0e8e0ad5671f0a21c308e874d9c9964ea: reuse the Base market parser with explicit numeric chain allowlist 8453 (base), 1 (ethereum), 56 (bsc); reject missing/unsupported chain and malformed or identical counterpart addresses. Existing Base wrapper stays pinned to 8453 and retains output shape. No Ethereum/BNB UI or provider request is enabled.
- 71a4d5663bc9fc97bc511175249943ea63f39c9c: regression cases for same contract and pool on multiple networks, numeric allowlist, malformed counterpart, quote-side price/change borrowing. Fixture-only evidence until CI completes.
- Provider chain labels are candidate mappings, not proof of live provider support. Next: verify CI, reconcile parent merge, independently verify provider response/network identity and unavailable states, then integrate separately gated read-only market UI. Wallet/route/execution integrations require separate review. No cross-chain bridging, signing, funds or fee activation. Game, Launchpad, token contracts and ClimbX unchanged.
