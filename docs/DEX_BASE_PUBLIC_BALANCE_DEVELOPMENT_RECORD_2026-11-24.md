# Base DEX public holder balance — 2026-11-24

Parent feature branch: dex/base-onchain-metadata-20261124 at 32551f668b43726f4abcdbbeac154cd0a9966831 (#682).
- #679 merged at 3d83bcb122562c36c78801c59e3b90ec6a5c1349; post-merge Pages https://github.com/CryptoDilis/Climboria/actions/runs/45336697692 and production quote smoke https://github.com/CryptoDilis/Climboria/actions/runs/45336697417 succeeded. Base Safety, Validate, local smoke and read-only quote regression also passed.
- #682 combined head passed Base safety https://github.com/CryptoDilis/Climboria/actions/runs/45336775651 and browser smoke https://github.com/CryptoDilis/Climboria/actions/runs/45336775670; quote state regression was still running at initial checkpoint.
- ebc15864288a877b10dc73632328f9cbc7e46876: optional ERC-20 balanceOf(public holder) eth_call, fixed contract and observed block, exact uint256/BigInt decimal formatting, unavailable results not zero.
- 725e711af8a83d52ce6c901477ba3b6be63c9450: optional public address field with explicit provider disclosure, no wallet connection, no signing or secret input.
- f7cda07baf96da7c7058adac2dea0b63348e231d: regression tests for balance ABI, invalid addresses, zero, large values, missing decimals and reverted calls; not yet CI verified.

Next exact: finish #682 checks and merge first. Port this child branch onto exact merged main, preserving other workstreams; run existing Base Safety suite and all applicable CI, then merge only after green. Verify production browser RPC behavior on independently identified Base ERC-20 and public holder; compare observed block balance with independent source where available. Public RPC availability/CORS and live reads are not yet confirmed. No native ETH balance, connected wallet identity, price quote, allowance, transaction or trading permissions. Base execution remains disabled. No changes to Game, Swap, ClimbX, Launchpad or bridge.
