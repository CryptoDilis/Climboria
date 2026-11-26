# Fixed-issuance burn prototype (test only)

Distinct from the existing NTT CLIMBTEST asset. Local EVM tests only, constructor restricted to Base Sepolia chain 84532. Name CLIMB Burn Test Only, symbol CLIMBBURNTEST, 6 decimals, 1,000 synthetic tokens issued once to constructor caller. The test quantity is not a proposed production supply.

Pinned Solidity 0.8.19 / OpenZeppelin 4.9.6 commit dc44c9f1a4c3b10af99492eed84f83ed244203f6 / Foundry v1.5.0. No owner role, mint entry point, burnFrom, tax, upgrade, migration or fee collector. Holders can burn their own balances; totalBurned derives from initial supply minus totalSupply. Transfers and allowances follow standard ERC20 behavior. A standard approved transferFrom can move approved assets; it is not a forced-burn privilege.

CI runs 8 explicit local tests (not actual network deployment or security clearance). No RPC, private keys, signed transactions, production config or deploy artifact. No Solana assets or NTT changes. No proof of actual holder entitlements. Marketplace fees and migration claim/accounting are future separately tested components. Production allocation, retirement feasibility and release authorization remain unresolved. Do not copy the test supply into production.

Next: review exact-head CI; fix any failures; only merge after green and clean. Then model fee allocation and cumulative issuance/retirement accounting as separate tests. Actual finalized Solana inventory and curve custody/retirement feasibility remain outstanding. Mainnet NO_GO.
