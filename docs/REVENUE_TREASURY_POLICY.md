# Climboria Revenue & Treasury Policy

**Version:** 1.1 — proposed policy; not evidence of deployed fee collection or payouts.
**Status:** DESIGN / APPROVAL & IMPLEMENTATION REQUIRED.

## Approved direction
- DEX contribution: fixed **10% of eligible net available revenue**, calculated independently for DEX.
- Launchpad contribution: fixed **10% of eligible net available revenue**, calculated independently for Launchpad.
- Marketplace accounting: separate ledgers for the proposed 5% gross-sales allocation and proposed 5% buy/sell transaction tax.
- Treasury reporting: weekly; reporting period Monday 00:00 UTC through Sunday 23:59 UTC; target publication the following Monday after reconciliation.
- Reward currency: $CLIMB intended; weekly payout target Friday 03:00 UTC (11:00 AM Philippines time), subject to available funds and operational readiness.

## 1. DEX and Launchpad contribution formula
For each product independently:

Eligible Net Available Revenue = Actual Revenue Received − Refunds/Reversals − Documented Direct Operating Costs − Applicable Taxes/Mandatory Charges − Other Approved Product Obligations.

Contribution = max(0, Eligible Net Available Revenue) × 10%.

Only actual revenue received counts. Trading volume, gross transaction volume, token market capitalization, projected revenue, unrealized gains, and uncollected fees are excluded. Do not deduct the same cost twice. General overhead or discretionary spending is deductible only if explicitly approved, consistently allocated, documented, and disclosed.

**Illustrative example only:** DEX revenue received $60,000 less $2,000 refunds, $8,000 direct costs, $3,000 taxes/mandatory charges, and $2,000 approved obligations = $45,000 eligible net available revenue; contribution = $4,500. Launchpad revenue received $40,000 less $1,000 refunds, $5,000 direct costs, $2,000 taxes/mandatory charges, and $1,000 approved obligations = $31,000; contribution = $3,100. Combined illustrative contribution = $7,600. These are not actual Climboria figures.

If eligible net available revenue is zero or negative, contribution for that period is zero. No unfunded reward liability is created.

## 2. Marketplace — separate accounting
- Proposed 5% of eligible gross marketplace sales: Summit Rewards Treasury allocation.
- Proposed 5% buy/sell transaction tax: separate tax ledger and destination.

The calculation base, payer, exemptions, collection method, and destination of each rule must be documented before activation. The two rules must not create accidental double-counting or undisclosed duplicate charges. The gross-sales allocation's funding source (platform proceeds versus seller charge) remains unresolved and must be decided before implementation. Do not silently change the existing marketplace fee model: reconcile this proposal with the prior 2.5% buy / 2.5% sell fee design before coding.

## 3. Treasury accounts and allocation
Maintain separate ledgers/accounts for DEX contribution, Launchpad contribution, marketplace gross-sales allocation, marketplace transaction tax, Jarrell's Peak rewards, and other restricted donations. Combine DEX and Launchpad contributions only after each product's calculation and reconciliation. The marketplace allocation remains separate unless a later approved policy explicitly changes it. Donations must honor donor-designated purposes.

## 4. Jarrell's Peak and player rewards
Approved DEX/Launchpad contributions may support Jarrell's Peak and published community incentive programs. Rewards are payable only from available, approved funds. Before a program opens, publish eligibility, scoring, anti-cheat controls, wallet verification, payout method, dispute process, and funding availability. Participation does not guarantee rewards or earnings.

## 5. Weekly treasury report
Reporting period: Monday 00:00 UTC to Sunday 23:59 UTC. Target publication: following Monday after reconciliation. Report opening and closing balances per account; revenue received by product; refunds; each deduction category; eligible net available revenue; 10% calculations; marketplace gross sales and 5% allocation; transaction tax separately; expenses and approvals; transfers; rewards allocated/paid/pending; restricted donations; and on-chain transaction references where applicable. Distinguish $CLIMB units from fiat valuations and state price source and timestamp.

Payout target: Friday 03:00 UTC / 11:00 AM Philippine time. This is a target, not a guarantee; disclose funding, technical, network, compliance, or verification delays.

## 6. Controls and security
Use separate treasury wallets or auditable sub-ledgers; least-privilege access; multisignature approvals for material withdrawals; documented approval thresholds; immutable transaction records; weekly reconciliation; public wallet addresses where safe; key rotation and recovery procedures; and emergency pause authority. Never place private keys, seed phrases, or privileged secrets in frontend code or repository files.

## 7. Decisions still required before implementation
1. Approve exact eligible revenue/deduction definitions and supporting evidence.
2. Decide whether the marketplace 5% gross-sales allocation is platform-funded or charged to sellers.
3. Define the 5% buy/sell tax base, payer, exemptions, and destination; reconcile with existing 2.5% buy + 2.5% sell fee design.
4. Decide public reporting detail for commercially sensitive product data while always publishing reconciled contribution totals.
5. Set multisig signers, withdrawal threshold, and approval procedure.
6. Complete legal, tax, accounting, and security review for each supported jurisdiction and chain.
7. Implement, test, and independently verify fee collection, ledger reconciliation, and payout processes.

## 8. Status and limitations
The 10% DEX and Launchpad rate and the marketplace rules are proposed policy commitments pending formal approval, legal/accounting review, and technical implementation. This document does not claim that DEX/Launchpad revenue exists, that fee collection is deployed, that treasury wallets are funded, or that payouts are operational. No token value, revenue, reward, profit, or financial return is guaranteed.
