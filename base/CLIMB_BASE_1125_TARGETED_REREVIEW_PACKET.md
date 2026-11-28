# CLIMB Base #1125 targeted adversarial re-review
2026-11-28 UTC. Review candidate only. TESTNET_NO_GO / MAINNET_NO_GO.
Exact draft head e88fd3d12694cff9611da25b8d5d5847bbe442c1, CI merge checkout 95499beb94380d34fb8ed7748ed6054470a84268 (parents #1117 8cfad09319e946fb852ac3a33a76ecad2e0e7584 and exact draft head; tree e770a8d9f7dacc661bf664e8502647014c7d69db). No deployment, funded testing, new signer selection, or approval inferred.

## Reviewer task
Independently review the actual embedded sources below against the previously identified cancellation/expiry revival gap. Seek counterexamples, not confirmation. Separate contract-level exploit, intended quorum capability, operational risk, and unsupported production assumptions. For each issue supply severity, exact file/function, prerequisites, minimal regression, remediation and residual risk. State whether the scoped corrected test-only contract is acceptable for controlled unfunded Sepolia, and separately whether production is ready (production gates remain unmet). Do not claim to have run tools, inspected dependencies or authenticated public chain data unless actually done.

## Exact changes and evidence
- A successful nomination advances per-address odd/even conflict context; release requires current epoch, current odd context, no active nomination and existing role eligibility. Old signed ABI is rejected. New expense identity includes context; vault stores context separately and rechecks at execution before accounting/transfer. Separate quorum release and fresh authorized proposal are required. A future-context signature can be created before a conflict and later accepted if the quorum successfully performs all required transitions; the test expressly characterizes this residual, not signature freshness proof.
- Scope: original owners rotated out were not themselves nominated in this system; their existing ordinary eligibility returns subject to current roles and fresh epoch approval. Previously nominated owners remain blocked until explicit release after leaving ownership. No new cooling-off rule, no beneficial ownership proof.
- A proposal nonce is nonzero and bound to complete ID including context, not independently consumed across contexts. Same salt can yield distinct IDs after a context transition; this does not bypass fresh quorum or single-use evidence but differs from a strict globally unique salt policy. Review whether stronger nonce uniqueness is necessary; do not silently describe it as enforced.
- All five workflows SUCCESS: Safe 46121955673 job 140908190888 (22 direct/30 quorum, local historical context and spending); differential 46121955683 (12 jobs, 92 Safe tests per compiler, actual new three cases PASS), V3 allocation 46121955677, invariants 46121955674, Slither 46121955696. Actual local authorization artifact shows three expense records context=0, eligible=true; liquidity null. Local execution artifact three contextMatched=true. Nonzero context transitions covered by Solidity regression, not by this specific mined receipt artifact. Tests use disposable keys.
- Guard deployer sizes 22745/22678 (0.8.19/0.8.39), runtime headroom 1831/1898; required 1024 preserved. Core deployer 23558/23339, headroom 1018/1237 (existing core manifest has no 1024 floor; tight residual). Same compiler settings as #1117 for compared 0.8.39 input. No canonical repin.
- Independently downloaded five ZIPs; SHA256 and CRC verified against GitHub metadata: Safe Slither 15254385133 fad3a021ed395694be15b462aa971f6b98e3ddc0e2979d0dca5389852fb63d38; V3 Slither 15254138164 9c5ff6dc1c15c4ee3075811b79ddd934f24c6897d57f79d99f5b3dc044332477; Safe patched compiler 15254331142 f2e3248c9b449fac0805c9170a6c83599a8f68a35286aa7ab22098d2b14a8b14; local authorization 15254241991 fed80fe82ab122c126f4b581cdaa07980e838e24d77ed0d5634bb0c738f8ff39; local expense 15254158076 663352e13597b56923f345f77f8924e7e44b1a28bb03b87376a4cddf69734b89. All recorded exact merge checkout above.
- Compared actual 114 fully-qualified compiler outputs with #1117 patched artifact 15251535761: same keys, same settings, six changed input source entries (one vault duplicated import alias, two guards, two Safe tests); six non-test ABI changes including duplicate aliases, four distinct contracts/interfaces. 33 creation and 33 runtime bytecode object changes (23 non-test each; includes metadata/dependency changes). No reuse of old runtime hashes. Vault proposalContext appended slot 5; reserve expenseContext slot 26; derived quorum guard issuing moves slot 26→27. Old Proposal tuple unchanged. Fresh deployment only; no storage upgrade/migration claim.
- Exact changed ABI: expenseContext(address) 612b8ced; releaseExpenseRecipient(uint256,address,uint256,uint256,uint256) 4404048a; proposeExpense(uint256,uint256,address,uint256,bytes32,uint256,bytes32,uint256,uint256,uint256) be61343e; vault propose(address,uint256,bytes32,uint256,bytes32,uint256) 99e8e0a0; proposalContext(bytes32) 802b0a02. Old proposal signatures removed.
- Slither compare actual reports against #1117 Safe 15251361323 and V3 15251805135: Safe 217→221, V3 181→181; both 39 High unchanged; Medium 23/20 unchanged; total 402 findings vs 398. By detector/impact/sorted element type-name-relative path multiset: Safe +8/-4, V3 +2/-2. Python dependency manifests identical. Safe medium unused-return replaced same proposeExpense return-ID issue (now includes context); ID persisted/emitted and locally reconciled, public operational reconciliation still unresolved. Low timestamp findings reflect moved/extended role and proposal/execute predicates, newly release guard and wrapper, no randomness; exact expiry and monotonic invalidation regressions passed, sequencer timestamp residual remains. Informational dead-code on base _onNomination intentionally no-op for rotation-only base and overridden by reserve guard; no blanket suppression. V3 timestamp two replaced by new context-bearing predicates. No new High or net Medium, not clearance of existing 78 High/43 Medium findings.
- Review limits: embedded project files only, not complete dependencies or raw artifacts; upstream pinned Safe bf943f80fec5ac647159d26161446ac5d716a294 and OZ dc44c9f1a4c3b10af99492eed84f83ed244203f6. Full exact CI artifacts accessible via run IDs. Public historical auth, real independent signer custody, recovery policy, production liquidity/legacy/reward inputs, final release manifest and authorization remain blockers.

## Required adversarial questions
1. Can nomination cancellation, expiry, supersession, repeat nomination, failed schedule or same-block ordering resurrect old proposals or permit stale context? Distinguish actual on-chain ordering from pre-signed future context.
2. Can release be called with stale epoch/context, still pending or owner, wrong selector/length, invalid signed window, two signatures, reentrant path or stale configuration? Check inherited quorum guard and base-only no-op hook.
3. Can old ABI or mismatched context bypass guard/vault checks, duplicate evidence, reset caps, pay before 48h or change unrelated recipient eligibility? Verify context and epoch rollbacks.
4. Can wallet-check deduplication change authorization/revert ordering, or the new inherited layout cause unsafe assumptions? No proxy upgrade proposed.
5. Does typed intent verify exactly what its claimed input can support? Caller-supplied historical state is not authenticated public state, and context zero local evidence is not coverage of every transition.
6. Identify any newly introduced high/medium issue, missing tests or unreviewed assumptions. Explicitly separate current fixture and real production requirements.

## Embedded source manifest
- `base/safe-custody/src/SafeEpochGuardFixture.sol` Git blob `26ed34f43f56f4b2e1476313a51b19f4c0e7ffc2`
- `base/safe-custody/src/SafeReserveGuardFixture.sol` Git blob `0b48056e8a43ffe995140a944291720d554bbb65`
- `base/safe-custody/src/SafeQuorumIssuanceFixture.sol` Git blob `fac23bb27e50f24b17ca36fca946b5e21114029b`
- `base/v3-testnet/src/V3EpochSpendFixture.sol` Git blob `e8ff341221bf8b101d234ee55612b2b6c09e5aba`
- `base/safe-custody/test/SafeReserveGuard.t.sol` Git blob `1a802be1d7b2b54df640612082dade9b439e37ab`
- `base/safe-custody/typed-intent-reconciliation.mjs` Git blob `e2826b4c2cfb7b8993fa87e8d6e40012deca1075`

## Exact source files

### base/safe-custody/src/SafeEpochGuardFixture.sol
```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {BaseGuard} from "safe-contracts/base/GuardManager.sol";

interface ITestSafeProxy { function masterCopy() external view returns(address); }

/// @notice Test-only, rotation-only custody boundary. Cannot spend or forward assets.
/// Not independently reviewed, no recovery below quorum, do not fund.
contract SafeEpochGuardFixture is BaseGuard {
    error InvalidConfig();
    error InvalidAuthorizationWindow();
    uint256 public constant MAX_AUTHORIZATION_WINDOW=1 days;
    error Unauthorized();
    error Forbidden();
    error NotReady();
    error UnsupportedSignatureMode();
    error TransactionInProgress();
    uint256 public constant DELAY=2 days;
    uint256 public constant WINDOW=7 days;
    uint256 private constant GUARD_SLOT=0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8;
    uint256 private constant FALLBACK_SLOT=0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5;
    bytes4 private constant SWAP=bytes4(keccak256("swapOwner(address,address,address)"));
    Safe public immutable wallet;
    address public immutable singleton;
    bytes32 public immutable proxyHash;
    bytes32 public immutable singletonHash;
    uint256 public epoch=1;
    // Every scheduled rotation has a distinct signed execution payload, even after cancellation.
    uint256 public rotationSerial;
    struct Rotation { bytes32 digest; address oldOwner; address newOwner; uint256 readyAt; uint256 expiresAt; }
    Rotation public pending;
    bool private rotating;
    bool public transactionActive;
    event RotationScheduled(uint256 indexed epoch,bytes32 indexed digest,uint256 readyAt,uint256 expiresAt);
    event RotationCancelled(uint256 indexed epoch,bytes32 indexed digest);
    event AuthorizationInvalidated(uint256 indexed epoch,uint256 indexed consumedNonce);
    event Rotated(uint256 indexed epoch,address indexed oldOwner,address indexed newOwner);

    constructor(Safe account,address implementation){
        if(block.chainid!=84532||address(account).code.length==0||implementation.code.length==0||
           ITestSafeProxy(address(account)).masterCopy()!=implementation) revert InvalidConfig();
        wallet=account;singleton=implementation;
        proxyHash=address(account).codehash;singletonHash=implementation.codehash;
    }
    modifier onlyWallet(){_requireWallet();_;}
    function _requireWallet() private view {if(msg.sender!=address(wallet))revert Unauthorized();}
    function threshold() external view returns(uint256){validateConfig();return wallet.getThreshold();}
    function memberCount() external view returns(uint256){validateConfig();return wallet.getOwners().length;}
    function isMember(address a) external view returns(bool){validateConfig();return wallet.isOwner(a);}
    function validateConfig() public view {
        if(block.chainid!=84532||address(wallet).codehash!=proxyHash||singleton.codehash!=singletonHash||
           ITestSafeProxy(address(wallet)).masterCopy()!=singleton||wallet.getThreshold()!=3||
           wallet.getOwners().length!=5||abi.decode(wallet.getStorageAt(GUARD_SLOT,1),(address))!=address(this)||
           abi.decode(wallet.getStorageAt(FALLBACK_SLOT,1),(address))!=address(0)) revert InvalidConfig();
        (address[] memory modules,address next)=wallet.getModulesPaginated(address(1),1);
        if(modules.length!=0||next!=address(1))revert InvalidConfig();
    }
    function _eligibleReplacement(address oldOwner,address newOwner) private view returns(bool){
        return wallet.isOwner(oldOwner)&&!wallet.isOwner(newOwner)&&newOwner!=address(0)&&newOwner!=address(1)&&
            newOwner!=address(wallet)&&newOwner!=address(this)&&newOwner.code.length==0&&_rotationOwnerAllowed(newOwner);
    }
    function _authorizationWindow(uint256 validAfter,uint256 validUntil) internal view {
        if(validAfter>block.timestamp||validUntil<=block.timestamp||validUntil<=validAfter||validUntil-validAfter>MAX_AUTHORIZATION_WINDOW)revert InvalidAuthorizationWindow();
    }
    function scheduleRotation(uint256 expectedEpoch,address prev,address oldOwner,address newOwner,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        validateConfig();
        if(expectedEpoch!=epoch||rotating||(pending.digest!=0&&block.timestamp<pending.expiresAt)||
           !_eligibleReplacement(oldOwner,newOwner))revert Forbidden();
        address[] memory owners=wallet.getOwners();bool valid;
        for(uint256 i=0;i<owners.length;i++){
            if(owners[i]==oldOwner&&prev==(i==0?address(1):owners[i-1]))valid=true;
        }
        if(!valid)revert Forbidden();
        rotationSerial++;
        bytes32 digest=keccak256(abi.encodePacked(abi.encodeWithSelector(SWAP,prev,oldOwner,newOwner),rotationSerial));
        pending=Rotation(digest,oldOwner,newOwner,block.timestamp+DELAY,block.timestamp+DELAY+WINDOW);
        _onNomination(newOwner);
        emit RotationScheduled(epoch,digest,pending.readyAt,pending.expiresAt);
    }
    function cancelRotation(uint256 expectedEpoch,uint256 expectedSerial) external onlyWallet {
        validateConfig();
        bytes32 d=pending.digest;
        if(expectedEpoch!=epoch||expectedSerial!=rotationSerial||d==0||rotating)revert Forbidden();
        delete pending;emit RotationCancelled(epoch,d);
    }
    // Quorum-only nonce consumption, before or after binding. Must win the
    // transaction ordering race; does not cancel an already executed action.
    function invalidateAuthorization(uint256 expectedEpoch,uint256 expectedNonce) external onlyWallet {
        validateConfig();
        if(!transactionActive||rotating||expectedEpoch!=epoch||expectedNonce!=wallet.nonce()-1)revert Forbidden();
        emit AuthorizationInvalidated(epoch,expectedNonce);
    }
    function checkTransaction(address to,uint256 value,bytes memory data,Enum.Operation operation,
        uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address payable refundReceiver,
        bytes memory signatures,address) external override onlyWallet {
        if(transactionActive)revert TransactionInProgress();
        if(value!=0||operation!=Enum.Operation.Call||safeTxGas!=0||baseGas!=0||gasPrice!=0||
           gasToken!=address(0)||refundReceiver!=address(0))revert Forbidden();
        _checkSignerModes(signatures);
        transactionActive=true;
        _checkCall(to,data);
    }
    // Safe has already verified three distinct, sorted owners. Require an actual
    // ECDSA signature for each; approved-hash and sender modes cannot prove fresh
    // key authorization, even if a delegated account later clears its code.
    // Do not reject a whole owner set merely because a non-signing owner has code.
    function _checkSignerModes(bytes memory signatures) private pure {
        if(signatures.length!=195)revert UnsupportedSignatureMode();
        for(uint256 i=0;i<3;i++){
            uint8 v=uint8(signatures[i*65+64]);
            if(v!=27&&v!=28&&v!=31&&v!=32)revert UnsupportedSignatureMode();
        }
    }
    function _onNomination(address) internal virtual {}
    function _rotationOwnerAllowed(address) internal view virtual returns(bool){return true;}
    function _policyCallAllowed(bytes4,uint256) internal view virtual returns(bool){return false;}
    function _checkCall(address to,bytes memory data) private {
        validateConfig();
        if(rotating||data.length<4)revert Forbidden();
        bytes4 selector=bytes4(data);
        if(to==address(this)){
            if((selector==this.scheduleRotation.selector&&data.length==196)||
               (selector==this.cancelRotation.selector&&data.length==68)||
               (selector==this.invalidateAuthorization.selector&&data.length==68)||_policyCallAllowed(selector,data.length))return;
            revert Forbidden();
        }
        if(to!=address(wallet)||selector!=SWAP||data.length!=132)revert Forbidden();
        // Safe swapOwner decodes its three address arguments; the appended serial is
        // additionally authenticated by the Safe transaction hash and this guard's digest.
        Rotation memory p=pending;
        if(p.digest==0||p.digest!=keccak256(data)||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt)revert NotReady();
        // A scheduled address may acquire code or cease to satisfy policy during the delay.
        if(!_eligibleReplacement(p.oldOwner,p.newOwner))revert Forbidden();
        rotating=true;
    }
    function checkAfterExecution(bytes32,bool success) external override onlyWallet {
        if(!transactionActive||!success)revert Forbidden();
        validateConfig();
        if(rotating){
            Rotation memory p=pending;
            if(wallet.isOwner(p.oldOwner)||!wallet.isOwner(p.newOwner)||p.newOwner.code.length!=0||!_rotationOwnerAllowed(p.newOwner))revert InvalidConfig();
            rotating=false;delete pending;epoch++;
            emit Rotated(epoch,p.oldOwner,p.newOwner);
        }
        transactionActive=false;
    }
}

/// @dev Used exclusively by the factory as the Safe setup delegatecall target.
/// Calls the proxy itself, satisfying Safe self-authorization without exposing
/// a post-setup public initializer or retaining any authority in the helper.
contract SafeGuardBootstrapFixture {
    function install(address guard) external {
        Safe(payable(address(this))).setGuard(guard);
    }
}

/// @notice Test-only factory uses freshly compiled actual pinned Safe source.
/// Proxy initialization and guard installation occur in one transaction.
contract GuardedSafeFactoryFixture {
    error InvalidConfig();
    Safe public immutable singleton;
    SafeGuardBootstrapFixture public immutable bootstrap;
    constructor(){
        if(block.chainid!=84532)revert InvalidConfig();
        singleton=new Safe();bootstrap=new SafeGuardBootstrapFixture();
    }
    function create(address[] calldata owners) external returns(Safe wallet,SafeEpochGuardFixture guard){
        if(block.chainid!=84532||owners.length!=5)revert InvalidConfig();
        for(uint256 i=0;i<owners.length;i++)if(owners[i].code.length!=0)revert InvalidConfig();
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=new SafeEpochGuardFixture(wallet,address(singleton));
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
    }
}

```


### base/safe-custody/src/SafeReserveGuardFixture.sol
```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {SafeEpochGuardFixture,SafeGuardBootstrapFixture} from "./SafeEpochGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorTestToken} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3SharedExpenseRegistry} from "v3-src/V3SharedExpenseFixture.sol";
import {V3DeferredLiquidityFixture} from "v3-src/V3DeferredLiquidityFixture.sol";
import {V3LegacyProofClaimFixture} from "v3-src/V3LegacyProofClaimFixture.sol";
import {V3FounderVesting} from "v3-src/ClimbV3TestToken.sol";
import {V3GovernedGameRewardFixture} from "v3-src/V3GovernedGameRewardFixture.sol";

/// @notice Test-only typed governance adapter over actual pinned Safe.
/// One fixed successor, one quorum-approved binding, no generic call or transfer.
/// Not a production dependency, actual eligibility or real liquidity adapter.
contract SafeReserveGuardFixture is SafeEpochGuardFixture {
    V3AtomicSuccessorFixture public immutable successor;
    bytes32 public immutable successorHash;
    bool public bound;
    address public founder;
    address public distributor;
    address public lpCustody;
    uint256 public legacyScheduleSerial;
    V3SuccessorTestToken public asset;
    address[7] public destinations;
    bytes32[7] public destinationHashes;
    mapping(address=>uint256) public expenseContext;
    event ExpenseContextChanged(address indexed recipient,uint256 context);
    event Bound(address indexed asset,address[7] vaults);
    constructor(Safe account,address implementation,V3AtomicSuccessorFixture fixedSuccessor)
        SafeEpochGuardFixture(account,implementation){
        if(address(fixedSuccessor).code.length==0||fixedSuccessor.used())revert InvalidConfig();
        successor=fixedSuccessor;successorHash=address(fixedSuccessor).codehash;
    }
    function _current(uint256 expected) internal view {
        validateConfig();
        if(expected!=epoch)revert Forbidden();
    }
    function bindSuccessor(uint256 expected,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        _current(expected);
        _bind(true);
    }
    function _bind(bool alreadyIssued) internal {
        if(bound||address(successor).codehash!=successorHash||!successor.used())revert InvalidConfig();
        V3SuccessorTestToken t=successor.token();
        if(address(t).code.length==0||t.issued()!=alreadyIssued||t.issuer()!=address(successor)||t.totalSupply()!=(alreadyIssued?t.INITIAL_SUPPLY():0))revert InvalidConfig();
        for(uint256 i=0;i<7;i++){
            address v=successor.vaults(i);
            if(v.code.length==0||v==address(this)||v==address(wallet))revert InvalidConfig();
            for(uint256 j=0;j<i;j++)if(v==destinations[j])revert InvalidConfig();
            destinations[i]=v;destinationHashes[i]=v.codehash;
        }
        V3FounderVesting f=V3FounderVesting(destinations[0]);
        V3GovernedGameRewardFixture g=V3GovernedGameRewardFixture(destinations[1]);
        founder=f.beneficiary();distributor=g.distributor();
        if(address(f.token())!=address(t)||!g.matchesInitialBinding(address(t),address(this),founder))revert InvalidConfig();
        if(wallet.isOwner(founder)||wallet.isOwner(distributor)||founder==address(wallet)||distributor==address(wallet)||
            founder==address(this)||distributor==address(this))revert InvalidConfig();
        V3DeferredLiquidityFixture l=V3DeferredLiquidityFixture(destinations[2]);
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(destinations[6]);
        if(address(l.asset())!=address(t)||address(l.custody())!=address(this)||
           !legacy.matchesInitialBinding(address(t),address(this)))revert InvalidConfig();
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        if(address(registry).code.length==0||!registry.isSealed())revert InvalidConfig();
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(destinations[i]);
            if(address(v.token())!=address(t)||address(v.custody())!=address(this)||
               address(v.registry())!=address(registry)||!registry.consumer(address(v))||v.excludedFounder()!=founder)revert InvalidConfig();
        }
        address lp=l.lpCustody();
        if(lp.code.length==0||lp==founder||lp==distributor||lp==address(this)||lp==address(wallet)||lp==address(successor)||wallet.isOwner(lp))revert InvalidConfig();
        for(uint256 i=0;i<7;i++)if(lp==destinations[i])revert InvalidConfig();
        lpCustody=lp;
        asset=t;bound=true;emit Bound(address(t),destinations);
    }
    function _target(uint256 i,uint256 expected) private view returns(address v){
        _current(expected);
        if(!bound||i>=7||address(successor).codehash!=successorHash)revert InvalidConfig();
        v=destinations[i];
        if(v.codehash!=destinationHashes[i])revert InvalidConfig();
    }
    function _expense(uint256 i,uint256 expected) private view returns(V3EpochSpendFixture){
        if(i<3||i>5)revert Forbidden();
        return V3EpochSpendFixture(_target(i,expected));
    }
    function _gaming() private view returns(V3GovernedGameRewardFixture g){
        if(!bound||destinations[1].codehash!=destinationHashes[1])revert InvalidConfig();
        return V3GovernedGameRewardFixture(destinations[1]);
    }
    function _reservedRole(address a) private view returns(bool){
        if(a==founder||a==lpCustody||a==address(successor)||a==address(asset)||a==singleton||a==address(wallet)||a==address(this))return true;
        for(uint256 i=0;i<7;i++)if(a==destinations[i])return true;
        return false;
    }
    function rewardSignerAllowed(address a) external view returns(bool){
        validateConfig();
        // The constructor calls before binding, whereas a deployed vault may claim only after binding.
        if(!bound&&msg.sender.code.length!=0)return false;
        if(bound&&destinations[1].codehash!=destinationHashes[1])return false;
        return a!=address(0)&&!_reservedRole(a)&&!wallet.isOwner(a)&&
            !(pending.digest!=0&&block.timestamp<pending.expiresAt&&a==pending.newOwner);
    }
    function _rewardRole(address a) private view returns(bool){
        return _gaming().reservedSignerRole(a);
    }
    /// @notice Partial role predicate; NOT standalone payment authorization.
    /// @dev The vault must also enforce epoch, recipient, evidence, delay and budget checks.
    function _expenseRoleAllowed(address a) private view returns(bool){
        if(!bound)return false;
        validateConfig();
        return a!=address(0)&&a!=address(1)&&!wallet.isOwner(a)&&a!=distributor&&!_reservedRole(a)&&!_rewardRole(a)&&
            !(pending.digest!=0&&block.timestamp<pending.expiresAt&&a==pending.newOwner);
    }
    function expenseRecipientAllowed(address a) public view returns(bool){
        return expenseContext[a]%2==0&&_expenseRoleAllowed(a);
    }
    function _onNomination(address a) internal override {
        uint256 c=expenseContext[a];
        expenseContext[a]=c+1+c%2;
        emit ExpenseContextChanged(a,expenseContext[a]);
    }
    function releaseExpenseRecipient(uint256 expected,address recipient,uint256 context,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        _current(expected);
        if(context%2!=1||expenseContext[recipient]!=context||!_expenseRoleAllowed(recipient))revert Forbidden();
        expenseContext[recipient]=context+1;
        emit ExpenseContextChanged(recipient,context+1);
    }
    function revokeRewardSigner(uint256 expected,uint256 generation) external onlyWallet {
        V3GovernedGameRewardFixture(_target(1,expected)).revoke(expected,generation);
    }
    function scheduleRewardSigner(uint256 expected,uint256 generation,address signer,uint256 validAfter,uint256 validUntil) external onlyWallet {
        V3GovernedGameRewardFixture(_target(1,expected)).schedule(expected,generation,signer,validAfter,validUntil);
    }
    function cancelRewardSigner(uint256 expected,uint256 generation,uint256 serial) external onlyWallet {
        V3GovernedGameRewardFixture(_target(1,expected)).cancel(expected,generation,serial);
    }
    function activateRewardSigner(uint256 expected,uint256 generation,uint256 serial,address signer) external onlyWallet {
        V3GovernedGameRewardFixture(_target(1,expected)).activate(expected,generation,serial,signer);
    }
    // Both bounds are signed as Safe calldata. This constrains execution, not signing time.
    function proposeExpense(uint256 expected,uint256 i,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce,uint256 context,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        if(expenseContext[recipient]!=context||!expenseRecipientAllowed(recipient))revert Forbidden();
        _expense(i,expected).propose(recipient,amount,evidence,month,nonce,context);
    }
    function cancelExpense(uint256 expected,uint256 i,bytes32 id) external onlyWallet {_expense(i,expected).cancel(id);}
    function scheduleLiquidity(uint256 expected,uint256 a,uint256 q,uint256 minShares,uint256 deadline,bytes32 nonce,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        V3DeferredLiquidityFixture(_target(2,expected)).schedule(a,q,minShares,deadline,nonce);
    }
    function cancelLiquidity(uint256 expected,bytes32 id) external onlyWallet {V3DeferredLiquidityFixture(_target(2,expected)).cancel(id);}
    function scheduleLegacy(uint256 expected,bytes32 digest,uint256 expiresAt,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        V3LegacyProofClaimFixture(_target(6,expected)).schedule(digest,expiresAt);
        legacyScheduleSerial++;
    }
    function cancelLegacy(uint256 expected,uint256 expectedSerial) external onlyWallet {
        if(expectedSerial!=legacyScheduleSerial)revert Forbidden();
        V3LegacyProofClaimFixture(_target(6,expected)).cancel();
    }
    function _rotationOwnerAllowed(address a) internal view virtual override returns(bool){
        // Prevent changes before binding and known role conflicts afterwards.
        return bound&&a!=distributor&&!_reservedRole(a)&&!_rewardRole(a);
    }
    function _policyCallAllowed(bytes4 selector,uint256 len) internal view virtual override returns(bool){
        if(!bound)return selector==this.bindSuccessor.selector&&len==100;
        // Group exact static ABI lengths; the accepted selector/length pairs are unchanged.
        if(len==68)return selector==this.cancelLiquidity.selector||selector==this.cancelLegacy.selector||selector==this.revokeRewardSigner.selector;
        if(len==100)return selector==this.cancelExpense.selector||selector==this.cancelRewardSigner.selector;
        if(len==164)return selector==this.scheduleLegacy.selector||selector==this.scheduleRewardSigner.selector||selector==this.releaseExpenseRecipient.selector;
        if(len==132)return selector==this.activateRewardSigner.selector;
        if(len==260)return selector==this.scheduleLiquidity.selector;
        return len==324&&selector==this.proposeExpense.selector;
    }
}
contract SafeReserveFactoryFixture {
    error InvalidConfig();
    Safe public immutable singleton;
    SafeGuardBootstrapFixture public immutable bootstrap;
    constructor(){
        if(block.chainid!=84532)revert InvalidConfig();
        singleton=new Safe();bootstrap=new SafeGuardBootstrapFixture();
    }
    function create(address[] calldata owners,V3AtomicSuccessorFixture successor) external returns(Safe wallet,SafeReserveGuardFixture guard){
        if(block.chainid!=84532||owners.length!=5)revert InvalidConfig();
        for(uint256 i=0;i<owners.length;i++)if(owners[i].code.length!=0)revert InvalidConfig();
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=new SafeReserveGuardFixture(wallet,address(singleton),successor);
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
    }
}

```


### base/safe-custody/src/SafeQuorumIssuanceFixture.sol
```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {SafeGuardBootstrapFixture} from "./SafeEpochGuardFixture.sol";
import {SafeReserveGuardFixture} from "./SafeReserveGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorTestToken,V3SuccessorConfig,V3SuccessorConditionalDeployer} from "v3-src/V3AtomicSuccessorFixture.sol";

interface IQuorumBindingFixture {
    function successor() external view returns(V3AtomicSuccessorFixture);
    function bindBeforeIssuance() external;
    function bound() external view returns(bool);
}
/// @notice Test-only factory. A fixed Safe setup factory configures one guard.
/// Actual Safe quorum must authorize exact creation payload via that guard.
contract V3QuorumSuccessorFixture is V3AtomicSuccessorFixture {
    address public immutable guardFactory;
    bytes32 public immutable guardFactoryHash;
    address public configuredGuard;
    bytes32 public configuredGuardHash;
    constructor(address setupFactory,V3SuccessorConditionalDeployer helper,bytes32 helperHash) V3AtomicSuccessorFixture(helper,helperHash){
        if(setupFactory.code.length==0)revert InvalidConfig();
        guardFactory=setupFactory;guardFactoryHash=setupFactory.codehash;
    }
    function configureGuard(address guard) external {
        if(msg.sender!=guardFactory||guardFactory.codehash!=guardFactoryHash||configuredGuard!=address(0)||used||guard.code.length==0||
           address(IQuorumBindingFixture(guard).successor())!=address(this))revert InvalidConfig();
        configuredGuard=guard;configuredGuardHash=guard.codehash;
    }
    function create(V3SuccessorConfig calldata cfg) external override returns(V3SuccessorTestToken asset){
        if(guardFactory.codehash!=guardFactoryHash||msg.sender!=configuredGuard||msg.sender.codehash!=configuredGuardHash||
           address(cfg.control)!=configuredGuard)revert InvalidConfig();
        return _create(cfg);
    }
    function _beforeIssue() internal override {
        IQuorumBindingFixture guard=IQuorumBindingFixture(configuredGuard);
        guard.bindBeforeIssuance();
        if(!guard.bound())revert InvalidConfig();
    }
}
/// @notice Actual Safe quorum -> zero-supply creation -> binding -> issuance,
/// all inside one transaction; failure reverts every step. No production asset.
contract SafeQuorumReserveGuardFixture is SafeReserveGuardFixture {
    error InvalidIssuanceDeadline();
    bool public issuing;
    uint256 public constant MAX_ISSUANCE_WINDOW=1 days;
    // Match the existing testnet preflight ceiling; not a production reward policy.
    uint256 public constant MAX_TEST_GAMING_WALLET_MONTHLY_CAP=5_185_185_180_000;
    event IssuanceInvalidated(uint256 indexed epoch,uint256 indexed consumedNonce);
    event QuorumIssued(address indexed token,bytes32 indexed configHash);
    constructor(Safe wallet_,address implementation,V3QuorumSuccessorFixture factory_)
        SafeReserveGuardFixture(wallet_,implementation,factory_){}
    function issueSuccessor(uint256 expected,uint256 validAfter,uint256 deadline,V3SuccessorConfig calldata cfg) external onlyWallet {
        _current(expected);
        _authorizationWindow(validAfter,deadline);
        if(deadline>cfg.start)revert InvalidIssuanceDeadline();
        if(issuing||bound||cfg.gamingWalletMonthlyCap==0||cfg.gamingWalletMonthlyCap>MAX_TEST_GAMING_WALLET_MONTHLY_CAP||address(cfg.control)!=address(this)||
           V3QuorumSuccessorFixture(address(successor)).configuredGuard()!=address(this)||
           cfg.founder==address(wallet)||cfg.distributor==address(wallet)||
           cfg.liquidity.custody==address(wallet)||cfg.liquidity.custody==address(this))revert InvalidConfig();
        issuing=true;
        V3SuccessorTestToken t=successor.create(cfg);
        if(!bound||address(t)!=address(asset)||!t.issued()||t.totalSupply()!=t.INITIAL_SUPPLY())revert InvalidConfig();
        uint256[7] memory expectedAmounts=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++)if(t.balanceOf(destinations[i])!=expectedAmounts[i])revert InvalidConfig();
        if(t.balanceOf(address(wallet))!=0||t.balanceOf(address(this))!=0||t.balanceOf(address(successor))!=0||
           t.balanceOf(founder)!=0||t.balanceOf(distributor)!=0)revert InvalidConfig();
        issuing=false;emit QuorumIssued(address(t),keccak256(abi.encode(cfg)));
    }
    // A fresh quorum may consume the pending Safe nonce without issuing any supply.
    // This is not instant revocation: it must be mined before the old payload.
    function invalidateIssuance(uint256 expected) external onlyWallet {
        _current(expected);
        if(bound||issuing)revert Forbidden();
        emit IssuanceInvalidated(expected,wallet.nonce()-1);
    }
    function bindBeforeIssuance() external {
        if(msg.sender!=address(successor)||!issuing||bound)revert Unauthorized();
        _bind(false);

    }
    function _rotationOwnerAllowed(address a) internal view override returns(bool){
        return !issuing&&super._rotationOwnerAllowed(a);
    }
    function _policyCallAllowed(bytes4 selector,uint256 len) internal view override returns(bool){
        if(issuing)return false;
        if(!bound)return (selector==this.issueSuccessor.selector&&len==388)||
            (selector==this.invalidateIssuance.selector&&len==36);
        return super._policyCallAllowed(selector,len);
    }
}
/// @notice Created by the setup factory constructor, not supplied by a caller.
contract SafeQuorumGuardDeployerFixture {
    error Unauthorized();
    address public immutable factory;
    constructor(){factory=msg.sender;}
    function deploy(Safe wallet,address singleton,V3QuorumSuccessorFixture successor) external returns(SafeQuorumReserveGuardFixture){
        if(msg.sender!=factory||block.chainid!=84532)revert Unauthorized();
        return new SafeQuorumReserveGuardFixture(wallet,singleton,successor);
    }
}
contract SafeQuorumReserveFactoryFixture {
    error InvalidConfig();
    Safe public immutable singleton;
    SafeGuardBootstrapFixture public immutable bootstrap;
    SafeQuorumGuardDeployerFixture public immutable guardDeployer;
    bytes32 public guardDeployerHash;
    constructor(){
        if(block.chainid!=84532)revert InvalidConfig();
        singleton=new Safe();bootstrap=new SafeGuardBootstrapFixture();
        SafeQuorumGuardDeployerFixture helper=new SafeQuorumGuardDeployerFixture();
        guardDeployer=helper;guardDeployerHash=address(helper).codehash;
    }
    function create(address[] calldata owners,V3QuorumSuccessorFixture successor) external returns(Safe wallet,SafeQuorumReserveGuardFixture guard){
        if(block.chainid!=84532||address(guardDeployer).codehash!=guardDeployerHash||owners.length!=5||successor.creator()!=msg.sender||
           successor.guardFactory()!=address(this)||successor.configuredGuard()!=address(0))revert InvalidConfig();
        for(uint256 i=0;i<owners.length;i++)if(owners[i].code.length!=0)revert InvalidConfig();
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=guardDeployer.deploy(wallet,address(singleton),successor);
        if(address(guardDeployer).codehash!=guardDeployerHash||guard.wallet()!=wallet||guard.singleton()!=address(singleton)||address(guard.successor())!=address(successor))revert InvalidConfig();
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
        successor.configureGuard(address(guard));
    }
}

```


### base/v3-testnet/src/V3EpochSpendFixture.sol
```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {V3SharedExpenseRegistry} from "./V3SharedExpenseFixture.sol";

// Synthetic custody adapter boundary. A real independently reviewed multisig adapter
// must enforce monotonic epochs, quorum, rotation delay and authentic configuration.
interface IV3CustodyEpochFixture {
    function epoch() external view returns(uint256);
    function isMember(address account) external view returns(bool);
    function threshold() external view returns(uint256);
    function memberCount() external view returns(uint256);
}

interface IV3ExpenseRecipientPolicy {
    function expenseRecipientAllowed(address recipient) external view returns(bool);
    function expenseContext(address recipient) external view returns(uint256);
}

/// @notice Test-only spending policy. No signer rotation or custody implementation here.
contract V3EpochSpendFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidProposal();
    error NotReady();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant DELAY=2 days;
    IERC20 public immutable token;
    IV3CustodyEpochFixture public immutable custody;
    V3SharedExpenseRegistry public immutable registry;
    bytes32 public immutable custodyCodeHash;
    uint256 public immutable budget;
    uint256 public immutable start;
    address public immutable excludedFounder;
    bytes32 public immutable purpose;
    uint256 public highestObservedEpoch;
    uint256 public totalSpent;
    mapping(uint256=>uint256) public spent;
    struct Proposal {
        address recipient;
        uint256 amount;
        bytes32 evidence;
        uint256 month;
        uint256 epoch;
        uint256 readyAt;
        bool executed;
        bool cancelled;
    }
    mapping(bytes32=>Proposal) public proposals;
    mapping(bytes32=>uint256) public proposalContext;
    event Proposed(bytes32 indexed id,uint256 indexed epoch,bytes32 indexed evidence,address recipient,uint256 amount,uint256 readyAt);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id,uint256 indexed epoch,uint256 amount);
    constructor(IERC20 asset,IV3CustodyEpochFixture control,V3SharedExpenseRegistry shared,uint256 cap,uint256 begin,address founder,bytes32 label){
        if(block.chainid!=84532||address(asset).code.length==0||address(control).code.length==0||address(shared).code.length==0||
           cap==0||cap>888888888000000||begin<=block.timestamp||begin-block.timestamp>365 days||founder==address(0)||label==0) revert InvalidConfig();
        token=asset;custody=control;registry=shared;budget=cap;start=begin;excludedFounder=founder;purpose=label;
        custodyCodeHash=address(control).codehash;
        uint256 initialEpoch=control.epoch();
        if(initialEpoch==0||control.threshold()!=3||control.memberCount()!=5) revert InvalidConfig();
        highestObservedEpoch=initialEpoch;
    }
    function _readEpoch() internal view returns(uint256 e){
        if(address(custody).codehash!=custodyCodeHash||custody.threshold()!=3||custody.memberCount()!=5) revert InvalidConfig();
        e=custody.epoch();
        if(e==0||e<highestObservedEpoch) revert InvalidConfig();
    }
    function _observe() internal returns(uint256 e){e=_readEpoch();highestObservedEpoch=e;}
    function syncEpoch() external { _observe(); }
    function monthlyCap(uint256 m) public view returns(uint256){
        return m>=60?0:budget*(m+1)/60-budget*m/60;
    }
    function _recipientAllowed(address recipient) internal view returns(bool){
        return recipient!=address(0)&&recipient!=address(this)&&recipient!=address(custody)&&recipient!=address(registry)&&recipient!=excludedFounder&&!custody.isMember(recipient)&&
            IV3ExpenseRecipientPolicy(address(custody)).expenseRecipientAllowed(recipient);
    }
    // Only the synthetic multisig boundary authorizes a proposal; execution is public
    // after the delay. Fresh authorization is required after any epoch change.
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce,uint256 context) external returns(bytes32 id){
        if(msg.sender!=address(custody)) revert Unauthorized();
        uint256 e=_observe();
        if(context%2!=0||context!=IV3ExpenseRecipientPolicy(address(custody)).expenseContext(recipient)||!_recipientAllowed(recipient)||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)||
           block.timestamp+DELAY>=start+(month+1)*MONTH||registry.consumedBy(evidence)!=address(0)) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),address(token),purpose,e,recipient,amount,evidence,month,nonce,context));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,e,block.timestamp+DELAY,false,false);
        proposalContext[id]=context;
        emit Proposed(id,e,evidence,recipient,amount,block.timestamp+DELAY);
    }
    function cancel(bytes32 id) external {
        if(msg.sender!=address(custody)) revert Unauthorized();
        _observe();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||p.cancelled) revert InvalidProposal();
        p.cancelled=true;emit Cancelled(id);
    }
    function execute(bytes32 id) external nonReentrant {
        uint256 e=_observe();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||p.cancelled||p.epoch!=e||proposalContext[id]!=IV3ExpenseRecipientPolicy(address(custody)).expenseContext(p.recipient)||!_recipientAllowed(p.recipient)||
           block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;spent[p.month]+=p.amount;totalSpent+=p.amount;
        registry.consume(p.evidence,id);
        token.safeTransfer(p.recipient,p.amount);
        emit Executed(id,e,p.amount);
    }
}

contract V3EpochPolicyFactory {
    V3SharedExpenseRegistry public immutable registry;
    V3EpochSpendFixture public immutable ecosystem;
    V3EpochSpendFixture public immutable community;
    V3EpochSpendFixture public immutable treasury;
    constructor(IERC20 asset,IV3CustodyEpochFixture control,uint256 begin,address founder){
        V3SharedExpenseRegistry shared=new V3SharedExpenseRegistry();
        registry=shared;
        V3EpochSpendFixture e=new V3EpochSpendFixture(asset,control,shared,133333333200000,begin,founder,"ECOSYSTEM");
        V3EpochSpendFixture c=new V3EpochSpendFixture(asset,control,shared,88888888800000,begin,founder,"COMMUNITY");
        V3EpochSpendFixture t=new V3EpochSpendFixture(asset,control,shared,106666666560000,begin,founder,"TREASURY");
        ecosystem=e;community=c;treasury=t;
        shared.bind([address(e),address(c),address(t)]);
    }
}

```


### base/safe-custody/test/SafeReserveGuard.t.sol
```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeReserveFactoryFixture,SafeReserveGuardFixture} from "../src/SafeReserveGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConditionalDeployer,V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken,IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3DeferredLiquidityFixture} from "v3-src/V3DeferredLiquidityFixture.sol";
import {V3LegacyProofClaimFixture} from "v3-src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "v3-src/V3LegacyProofVerifierFixture.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
interface VmReserveGuard {
    struct Log {bytes32[] topics; bytes data; address emitter;}
    function recordLogs() external;
    function getRecordedLogs() external returns(Log[] memory);
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}
contract ReserveQuote is ERC20 {
    constructor() ERC20("Synthetic quote","QTEST"){_mint(msg.sender,1000000);}
}
contract ReserveLPDestination {}
contract ReservePool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    constructor(IERC20 a,IERC20 q) ERC20("Synthetic LP","LPTEST"){asset=address(a);quote=address(q);}
    function addLiquidity(uint256 a,uint256 q,uint256 min,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,address(this),a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        require(min<=100);_mint(recipient,100);return 100;
    }
}
contract ReservePoolBuilder is IV3SyntheticPoolBuilder {
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){return IV3SyntheticPool(address(new ReservePool(a,q)));}
}
contract SafeReserveGuardTest {
    VmReserveGuard constant vm=VmReserveGuard(address(uint160(uint256(keccak256("hevm cheat code")))));
    // Deterministic disposable offline test keys; never use as funded wallet keys.
    uint256[3] private testKeys;
    address A;address B;address C;
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    address constant FOUNDER=address(0x201);
    address constant DISTRIBUTOR=address(0x202);
    address constant PAYEE=address(0x203);
    uint256 constant SUPPLY=888888888000000;
    Safe wallet;
    SafeReserveGuardFixture guard;
    V3AtomicSuccessorFixture successor;
    V3SuccessorTestToken token;
    ReserveQuote quote;
    uint256 start;
    function setUp() public {
        vm.chainId(84532);V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        SafeReserveFactoryFixture factory=new SafeReserveFactoryFixture();
        testKeys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++){
            if(vm.addr(testKeys[j])<vm.addr(testKeys[i])){
                (testKeys[i],testKeys[j])=(testKeys[j],testKeys[i]);
            }
        }
        A=vm.addr(testKeys[0]);B=vm.addr(testKeys[1]);C=vm.addr(testKeys[2]);
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners,successor);
        quote=new ReserveQuote();start=block.timestamp+1 days;
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),start,1000,
            V3SuccessorLiquidityConfig(quote,new ReservePoolBuilder(),address(new ReserveLPDestination()),1000));
        token=successor.create(cfg);
    }
    function _signed(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        return _signedAt(to,data,count,wallet.nonce());
    }
    function _signedAt(address to,bytes memory data,uint256 count,uint256 nonce) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<count;i++){
            (uint8 v,bytes32 rr,bytes32 ss)=vm.sign(testKeys[i],h);
            sigs=abi.encodePacked(sigs,rr,ss,v);
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(bytes memory data) private {require(_exec(address(guard),data,_signed(address(guard),data,3)));}
    function _reject(address to,bytes memory data,uint256 count) private {
        bytes memory sigs=_signed(to,data,count);vm.expectRevert();_exec(to,data,sigs);
    }
    function _bind() private {_quorum(abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)));}
    function _propose(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes memory){
        return abi.encodeCall(SafeReserveGuardFixture.proposeExpense,(e,i,PAYEE,10,evidence,0,nonce,0,block.timestamp,block.timestamp+1 hours));
    }
    function _id(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),e,PAYEE,uint256(10),evidence,uint256(0),nonce,uint256(0)));
    }
    // Match the emitted authorization ID and complete event payload, not merely receipt success.
    function _assertAuthorizationEvent(address emitter,bytes32 eventTopic,bytes32 id,bytes32 evidence,bytes32 dataHash) private {
        VmReserveGuard.Log[] memory logs=vm.getRecordedLogs();
        uint256 matches;
        for(uint256 i=0;i<logs.length;i++){
            if(logs[i].emitter!=emitter||logs[i].topics.length==0||logs[i].topics[0]!=eventTopic)continue;
            matches++;
            require(logs[i].topics.length==(evidence==0?3:4));
            require(logs[i].topics[1]==id&&logs[i].topics[2]==bytes32(uint256(1)));
            if(evidence!=0)require(logs[i].topics[3]==evidence);
            require(keccak256(logs[i].data)==dataHash);
        }
        require(matches==1);
    }
    function _assertExpenseProposed(uint256 i,bytes32 evidence,bytes32 nonce) private {
        _assertAuthorizationEvent(successor.vaults(i),keccak256("Proposed(bytes32,uint256,bytes32,address,uint256,uint256)"),
            _id(1,i,evidence,nonce),evidence,keccak256(abi.encode(PAYEE,uint256(10),block.timestamp+2 days)));
    }
    function _assertLiquidityScheduled(V3DeferredLiquidityFixture l,bytes32 id,uint256 deadline) private {
        _assertAuthorizationEvent(address(l),keccak256("Scheduled(bytes32,uint256,uint256,uint256,uint256,uint256)"),
            id,bytes32(0),keccak256(abi.encode(uint256(1000),uint256(500),block.timestamp+2 days,deadline)));
    }
    function testActualECDSAQuorumPayloadBindingAndNonceReplay() public {
        bytes memory binding=abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_signed(address(guard),binding,3);
        require(_exec(address(guard),binding,sigs)&&wallet.nonce()==1);
        bytes memory data=_propose(1,3,"E","N");
        bytes memory two=_signed(address(guard),data,2);
        vm.expectRevert();_exec(address(guard),data,two);
        require(wallet.nonce()==1);
        sigs=_signed(address(guard),data,3);
        bytes memory altered=_propose(1,4,"E","N");
        vm.expectRevert();_exec(address(guard),altered,sigs);
        require(wallet.nonce()==1);
        require(_exec(address(guard),data,sigs)&&wallet.nonce()==2);
        vm.expectRevert();_exec(address(guard),data,sigs);
        require(wallet.nonce()==2);
        vm.warp(start+2 days);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        v.execute(_id(1,3,"E","N"));
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testFixedBindingAndNoDeployerFloat() public {
        require(!guard.bound()&&token.totalSupply()==SUPPLY&&token.balanceOf(address(wallet))==0&&token.balanceOf(address(guard))==0);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),2);
        _bind();require(guard.bound()&&address(guard.asset())==address(token));
        for(uint256 i=0;i<7;i++)require(guard.destinations(i)==successor.vaults(i));
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),3);
    }
    function testActualQuorumExpenseAndSharedReplay() public {
        _bind();_reject(address(guard),_propose(1,3,"E","N"),2);
        vm.recordLogs();_quorum(_propose(1,3,"E","N"));_assertExpenseProposed(3,"E","N");
        vm.recordLogs();_quorum(_propose(1,4,"E","M"));_assertExpenseProposed(4,"E","M");
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=_id(1,3,"E","N");
        vm.expectRevert();v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        V3EpochSpendFixture c=V3EpochSpendFixture(successor.vaults(4));bytes32 other=_id(1,4,"E","M");
        vm.expectRevert();c.execute(other);
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testRotationInvalidatesOutstandingAndOldEpochAuthorization() public {
        _bind();_quorum(_propose(1,3,"E","N"));
        bytes32 old=_id(1,3,"E","N");
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(start+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        vm.expectRevert();v.execute(old);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _quorum(_propose(2,3,"E","N"));bytes32 fresh=_id(2,3,"E","N");
        vm.warp(block.timestamp+2 days);v.execute(fresh);
        require(token.balanceOf(PAYEE)==10);
    }

    function testPlainReservePendingExpenseAndActualRotation() public {
        _bind();
        for(uint256 i=3;i<=5;i++)_quorum(_propose(1,i,bytes32(i),bytes32(i)));
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        require(!guard.expenseRecipientAllowed(PAYEE)&&!wallet.isOwner(PAYEE));
        vm.warp(start+2 days);
        for(uint256 i=3;i<=5;i++)_assertPlainPendingExpenseRejected(i);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,PAYEE),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&wallet.isOwner(PAYEE)&&!wallet.isOwner(E));
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            bytes32 id=_id(1,i,bytes32(i),bytes32(i));
            vm.expectRevert();v.execute(id);
            _reject(address(guard),_propose(2,i,bytes32(i+10),bytes32(i+10)),3);
            require(v.totalSpent()==0&&v.registry().consumedBy(bytes32(i))==address(0));
        }
        require(token.balanceOf(PAYEE)==0&&token.totalSupply()==SUPPLY&&!guard.transactionActive());
    }
    function _assertPlainPendingExpenseRejected(uint256 i) private {
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        uint256 n=wallet.nonce();uint256 balance=token.balanceOf(address(v));
        _reject(address(guard),_propose(1,i,bytes32(i+10),bytes32(i+10)),3);
        bytes32 id=_id(1,i,bytes32(i),bytes32(i));
        vm.expectRevert();v.execute(id);
        require(wallet.nonce()==n&&!guard.transactionActive()&&v.totalSpent()==0&&v.spent(0)==0);
        require(v.registry().consumedBy(bytes32(i))==address(0)&&token.balanceOf(address(v))==balance);
    }
    // Recipient context permanently invalidates affected proposals, not unrelated ones.
    function testRejectPlainExpenseRevivalAfterCancellation() public {
        _rejectPlainExpenseRevival(false);
    }
    function testRejectPlainExpenseRevivalAtExpiry() public {
        _rejectPlainExpenseRevival(true);
    }
    function _rejectPlainExpenseRevival(bool expire) private {
        _bind();
        for(uint256 i=3;i<=5;i++)_quorum(_propose(1,i,bytes32(i),bytes32(i)));
        address unrelated=address(0x204);
        _quorum(abi.encodeCall(guard.proposeExpense,(1,3,unrelated,10,"UNRELATED",0,"N",0,block.timestamp,block.timestamp+1 hours)));
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        (bytes32 digest,,address candidate,,uint256 expiresAt)=guard.pending();
        require(digest!=0&&candidate==PAYEE);
        vm.warp(expire?expiresAt-1:start+2 days);
        for(uint256 i=3;i<=5;i++)_assertPlainPendingExpenseRejected(i);
        _executeUnrelatedExpense(unrelated);
        if(expire)vm.warp(expiresAt);
        else _quorum(abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        require(!wallet.isOwner(PAYEE)&&!guard.expenseRecipientAllowed(PAYEE)&&guard.epoch()==1&&guard.expenseContext(PAYEE)==1);
        _releasePayee();
        require(guard.expenseRecipientAllowed(PAYEE)&&guard.expenseContext(PAYEE)==2);
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            bytes32 id=_id(1,i,bytes32(i),bytes32(i));
            vm.expectRevert();v.execute(id);
            require(v.registry().consumedBy(bytes32(i))==address(0));
            require(v.totalSpent()==(i==3?10:0));
        }
        require(token.balanceOf(PAYEE)==0&&token.balanceOf(unrelated)==10&&token.totalSupply()==SUPPLY);
    }
    function _releasePayee() private {
        _quorum(abi.encodeCall(guard.releaseExpenseRecipient,(1,PAYEE,guard.expenseContext(PAYEE),block.timestamp,block.timestamp+1 hours)));
    }
    function _freshId(uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),uint256(1),PAYEE,uint256(10),evidence,uint256(0),nonce,uint256(2)));
    }
    function _executeUnrelatedExpense(address unrelated) private {
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),uint256(1),unrelated,
            uint256(10),bytes32("UNRELATED"),uint256(0),bytes32("N"),uint256(0)));
        require(guard.expenseRecipientAllowed(unrelated)&&!guard.expenseRecipientAllowed(PAYEE));
        v.execute(id);
        require(token.balanceOf(unrelated)==10&&v.registry().consumedProposal("UNRELATED")==id);
    }
    // Manual containment of already recorded proposals is possible, but is not
    // automatic lifecycle invalidation and does not cover outstanding signatures.
    function testQuorumCancelsAffectedExpensesBeforeOwnerRelease() public {
        _bind();
        for(uint256 i=3;i<=5;i++)_quorum(_propose(1,i,bytes32(i),bytes32(i)));
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        for(uint256 i=3;i<=5;i++){
            bytes32 id=_id(1,i,bytes32(i),bytes32(i));
            _quorum(abi.encodeCall(guard.cancelExpense,(1,i,id)));
        }
        _quorum(abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        require(!guard.expenseRecipientAllowed(PAYEE)&&guard.epoch()==1);
        _releasePayee();
        vm.warp(start+2 days);
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            bytes32 id=_id(1,i,bytes32(i),bytes32(i));
            vm.expectRevert();v.execute(id);
            require(v.totalSpent()==0&&v.registry().consumedBy(bytes32(i))==address(0));
            _quorum(abi.encodeCall(guard.proposeExpense,(1,i,PAYEE,10,bytes32(i),0,bytes32(i+100),2,block.timestamp,block.timestamp+1 hours)));
            bytes32 fresh=_freshId(i,bytes32(i),bytes32(i+100));
            vm.expectRevert();v.execute(fresh);
        }
        vm.warp(block.timestamp+2 days);
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            bytes32 fresh=_freshId(i,bytes32(i),bytes32(i+100));
            v.execute(fresh);
            require(v.totalSpent()==10&&v.registry().consumedProposal(bytes32(i))==fresh);
        }
        require(token.balanceOf(PAYEE)==30&&token.totalSupply()==SUPPLY);
    }
    function testRejectPreConflictSignedExpenseAfterCancellation() public {
        _bind();
        bytes memory data=_propose(1,3,"PRECONFLICT","N");
        bytes memory sigs=_signedAt(address(guard),data,3,wallet.nonce()+3);
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        _reject(address(guard),abi.encodeCall(guard.releaseExpenseRecipient,(1,PAYEE,1,block.timestamp,block.timestamp+1 hours)),3);
        _quorum(abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        _releasePayee();
        uint256 n=wallet.nonce();
        vm.expectRevert();_exec(address(guard),data,sigs);
        require(wallet.nonce()==n&&guard.expenseContext(PAYEE)==2&&!guard.transactionActive());
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        require(v.registry().consumedBy("PRECONFLICT")==address(0)&&v.totalSpent()==0&&token.balanceOf(PAYEE)==0);
    }
    function testNominationFailureRollbackAndRepeatedConflictContext() public {
        _bind();
        uint256 n=wallet.nonce();
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,A,E,PAYEE,block.timestamp,block.timestamp+1 hours)),3);
        require(wallet.nonce()==n&&guard.expenseContext(PAYEE)==0&&guard.rotationSerial()==0);
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        _quorum(abi.encodeCall(guard.cancelRotation,(1,1)));
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        require(guard.expenseContext(PAYEE)==3&&guard.rotationSerial()==2);
        _quorum(abi.encodeCall(guard.cancelRotation,(1,2)));
        n=wallet.nonce();
        _reject(address(guard),abi.encodeCall(guard.releaseExpenseRecipient,(1,PAYEE,1,block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.releaseExpenseRecipient,(2,PAYEE,3,block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.releaseExpenseRecipient,(1,PAYEE,3,block.timestamp,block.timestamp+1 hours)),2);
        require(wallet.nonce()==n&&guard.expenseContext(PAYEE)==3&&!guard.expenseRecipientAllowed(PAYEE));
        _releasePayee();
        require(guard.expenseContext(PAYEE)==4&&guard.expenseRecipientAllowed(PAYEE)&&guard.expenseContext(F)==0);
    }
    function testFormerOwnerRequiresReleaseAfterActualRotation() public {
        _bind();
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        vm.warp(start+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,PAYEE),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&wallet.isOwner(PAYEE));
        _reject(address(guard),abi.encodeCall(guard.releaseExpenseRecipient,(2,PAYEE,1,block.timestamp,block.timestamp+1 hours)),3);
        _quorum(abi.encodeCall(guard.scheduleRotation,(2,D,PAYEE,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,PAYEE,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==3&&!wallet.isOwner(PAYEE)&&!guard.expenseRecipientAllowed(PAYEE)&&guard.expenseContext(PAYEE)==1);
        _quorum(abi.encodeCall(guard.releaseExpenseRecipient,(3,PAYEE,1,block.timestamp,block.timestamp+1 hours)));
        require(guard.expenseRecipientAllowed(PAYEE)&&guard.expenseContext(PAYEE)==2);
    }
    // Document the boundary: a quorum can pre-sign predictable future contexts.
    // This is not proof of when ECDSA signatures were generated.
    function testCharacterizeFutureContextPresigningResidual() public {
        _bind();
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"FUTURE",0,bytes32("N"),2,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_signedAt(address(guard),data,3,wallet.nonce()+3);
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        _quorum(abi.encodeCall(guard.cancelRotation,(1,1)));
        _releasePayee();
        require(_exec(address(guard),data,sigs));
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=_freshId(3,"FUTURE","N");
        require(v.proposalContext(id)==2&&v.totalSpent()==0&&token.balanceOf(PAYEE)==0);
        vm.expectRevert();v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testPlainReservePendingOwnerBlocksRewardSchedule() public {
        _bind();
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        _quorum(abi.encodeCall(guard.revokeRewardSigner,(1,1)));
        require(!guard.rewardSignerAllowed(PAYEE));
        uint256 n=wallet.nonce();
        _reject(address(guard),abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,block.timestamp,block.timestamp+1 hours)),3);
        require(wallet.nonce()==n&&guard.epoch()==1&&!guard.transactionActive()&&!wallet.isOwner(PAYEE));
        (bytes32 digest,,address replacement,,)=guard.pending();
        require(digest!=0&&replacement==PAYEE);
        vm.warp(start+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,PAYEE),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&wallet.isOwner(PAYEE)&&!guard.rewardSignerAllowed(PAYEE));
    }

    function testPlainReserveExpensePredicateRejectsInvalidRolesAndConfig() public {
        require(!guard.expenseRecipientAllowed(PAYEE));
        _bind();
        require(!guard.expenseRecipientAllowed(address(0))&&!guard.expenseRecipientAllowed(address(1)));
        address[] memory current=wallet.getOwners();
        for(uint256 i=0;i<current.length;i++)require(!guard.expenseRecipientAllowed(current[i]));
        require(!guard.expenseRecipientAllowed(FOUNDER)&&!guard.expenseRecipientAllowed(DISTRIBUTOR));
        require(guard.expenseRecipientAllowed(PAYEE));
        // Ordinary contract payees are not categorically prohibited.
        require(guard.expenseRecipientAllowed(address(new ReserveLPDestination())));
        uint256 n=wallet.nonce();
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,3,address(1),10,"E",0,"N",0,block.timestamp,block.timestamp+1 hours)),3);
        require(wallet.nonce()==n&&!guard.transactionActive()&&token.totalSupply()==SUPPLY);
        // An invalid Safe configuration must fail closed even for a standalone view.
        vm.etch(address(wallet),"");
        vm.expectRevert();guard.expenseRecipientAllowed(PAYEE);
    }
    function testNoGenericTransferOrRoleConflict() public {
        _bind();
        _reject(address(token),abi.encodeCall(token.transfer,(PAYEE,1)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,0,PAYEE,10,"E",0,"N",0,block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,3,address(wallet),10,"E",0,"N",0,block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,FOUNDER,block.timestamp,block.timestamp+1 hours)),3);
        vm.expectRevert();guard.proposeExpense(1,3,PAYEE,10,"E",0,"N",0,block.timestamp,block.timestamp+1 hours);
    }
    function testRoleSeparationPersistsWhenDestinationCodeDisappears() public {
        _bind();
        address lp=V3DeferredLiquidityFixture(successor.vaults(2)).lpCustody();
        require(guard.lpCustody()==lp);
        vm.etch(lp,"");
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,lp,block.timestamp,block.timestamp+1 hours)),3);
        address v=successor.vaults(0);vm.etch(v,"");
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,v,block.timestamp,block.timestamp+1 hours)),3);
        // The healthy quorum must still be able to replace an unrelated owner.
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
    }
    function testPlainBindingRejectsSuccessorAsLPCustody() public {
        // Fresh sibling flow with an otherwise structurally valid, conflicting LP role.
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        SafeReserveFactoryFixture factory=new SafeReserveFactoryFixture();
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners,successor);
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),start,1000,
            V3SuccessorLiquidityConfig(quote,new ReservePoolBuilder(),address(successor),1000));
        token=successor.create(cfg);
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),3);
        require(!guard.bound()&&guard.lpCustody()==address(0)&&wallet.nonce()==0&&!guard.transactionActive());
    }
    function testSignedExpenseValidityWindow() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory future=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",0,t+1 hours,t+2 hours));
        bytes memory signedFuture=_signed(address(guard),future,3);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        vm.warp(t+1 hours);
        bytes memory tooLong=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",0,t,t+2 days));
        _reject(address(guard),tooLong,3);
        vm.warp(t+2 hours);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        _quorum(_propose(1,3,"E","N"));
        require(wallet.nonce()==2&&token.totalSupply()==SUPPLY);
    }
    function testSchedulingRejectsExpiredSignedWindows() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory liquidity=abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,t+7 days,"LP",t,t+1 hours));
        bytes memory legacy=abi.encodeCall(guard.scheduleLegacy,(1,bytes32("MANIFEST"),t+7 days,t,t+1 hours));
        bytes memory ls=_signed(address(guard),liquidity,3);
        bytes memory gs=_signed(address(guard),legacy,3);
        uint256 n=wallet.nonce();
        vm.warp(t+1 hours);
        vm.expectRevert();_exec(address(guard),liquidity,ls);
        vm.expectRevert();_exec(address(guard),legacy,gs);
        require(wallet.nonce()==n&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,t+7 days,"LP",block.timestamp,block.timestamp+1 hours)));
        require(wallet.nonce()==n+1);
    }
    function testPlainReserveRewardScheduleSignedWindowBoundaries() public {
        _bind();
        _quorum(abi.encodeCall(guard.revokeRewardSigner,(1,1)));
        uint256 t=block.timestamp;
        uint256 n=wallet.nonce();
        bytes memory future=abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,t+1 hours,t+2 hours));
        bytes memory sigs=_signed(address(guard),future,3);
        vm.expectRevert();_exec(address(guard),future,sigs);
        require(wallet.nonce()==n&&!guard.transactionActive());
        _reject(address(guard),abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,t,t+1 days+1)),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,t,t)),3);
        vm.warp(t+2 hours);
        vm.expectRevert();_exec(address(guard),future,sigs);
        require(wallet.nonce()==n&&guard.epoch()==1&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,block.timestamp,block.timestamp+1 days)));
        require(wallet.nonce()==n+1&&token.totalSupply()==SUPPLY);
        vm.warp(block.timestamp+2 days);
        _quorum(abi.encodeCall(guard.activateRewardSigner,(1,2,1,PAYEE)));
        require(wallet.nonce()==n+2&&guard.epoch()==1&&!guard.transactionActive());
    }
    function testStaleLegacyCancellationCannotCancelReplacement() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory schedule=abi.encodeCall(guard.scheduleLegacy,(1,bytes32("MANIFEST"),t+7 days,t,t+1 hours));
        _quorum(schedule);
        require(guard.legacyScheduleSerial()==1);
        bytes memory cancel=abi.encodeCall(guard.cancelLegacy,(1,1));
        bytes memory stale=_signedAt(address(guard),cancel,3,wallet.nonce()+2);
        _quorum(cancel);_quorum(schedule);
        uint256 n=wallet.nonce();
        vm.expectRevert();_exec(address(guard),cancel,stale);
        require(wallet.nonce()==n&&guard.legacyScheduleSerial()==2&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.cancelLegacy,(1,2)));
        require(wallet.nonce()==n+1);
    }
    function _legacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),PAYEE,100,100,bytes32(uint256(31)));
    }
    function _legacyCommitment(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_legacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function testLiquidityAndLegacySchedulingThroughActualSafe() public {
        _bind();
        V3DeferredLiquidityFixture l=V3DeferredLiquidityFixture(successor.vaults(2));
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        uint256 deadline=block.timestamp+7 days;
        vm.recordLogs();
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,deadline,"LP",block.timestamp,block.timestamp+1 hours)));
        bytes32 id=keccak256(abi.encode(block.chainid,address(l),address(token),address(quote),address(l.pool()),uint256(1),uint256(1000),uint256(500),uint256(50),deadline,bytes32("LP")));
        _assertLiquidityScheduled(l,id,deadline);
        LegacyVerifier.Commitment memory c=_legacyCommitment(legacy);
        _quorum(abi.encodeCall(guard.scheduleLegacy,(1,legacy.activationDigest(c),deadline,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        quote.transfer(address(l),500);l.execute(id);
        legacy.activate(c);
        vm.prank(PAYEE);legacy.claim(0,_legacyRow(),new LegacyVerifier.Node[](0));
        require(l.spent()==1000&&legacy.paid()==100&&token.balanceOf(PAYEE)==100&&token.totalSupply()==SUPPLY);
    }
}

```


### base/safe-custody/typed-intent-reconciliation.mjs
```javascript
// Offline typed intent derivation for the exact review-only Reserve ABI.
// Inputs must come from independently authenticated historical configuration and
// Safe transaction data. This module does not recover signatures or prove finality.
import {execFileSync} from 'node:child_process';
import {matchAuthorizationReceipt} from './authorization-receipt-match.mjs';
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const shape=(o,keys)=>need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),'SHAPE');
const q=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'QUANTITY');return BigInt(x);};
const hex=x=>'0x'+x.toString(16);
const word=x=>x.toString(16).padStart(64,'0');
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x)&&BigInt(x)>0n;
const addr=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&BigInt(x)>0n;
const zero='0x'+'0'.repeat(40);
const labels=['ECOSYSTEM','COMMUNITY','TREASURY'];
const selectors={expense:'be61343e',liquidity:'ae7b6095'};
function keccak(words){
 const input='0x'+words.join('');
 need(/^0x(?:[0-9a-f]{64})+$/.test(input),'HASH_INPUT');
 const out=execFileSync('cast',['keccak',input],{encoding:'utf8',timeout:5000,maxBuffer:1024,stdio:['ignore','pipe','ignore']}).trim();
 need(hash(out),'HASH_OUTPUT');return out;
}
export function deriveTypedIntent(c,t){
 shape(c,['chainId','blockNumber','blockHash','timestamp','transactionHash','safe','guard','safeTxHash','token','epoch','expenseVaults','liquidityVault','quote','pool','recipientContext']);
 shape(t,['to','operation','value','safeTxGas','baseGas','gasPrice','gasToken','refundReceiver','data']);
 need(c.chainId===84532&&q(c.blockNumber)>0n&&hash(c.blockHash)&&hash(c.transactionHash)&&hash(c.safeTxHash),'CONTEXT');
 const now=q(c.timestamp),epoch=q(c.epoch);
 need(now>0n&&now<=2n**256n-1n-2592000n&&epoch>0n,'CONTEXT_RANGE');
 need(Array.isArray(c.expenseVaults)&&c.expenseVaults.length===3,'VAULTS');
 const roles=[c.safe,c.guard,c.token,c.liquidityVault,c.quote,c.pool,...c.expenseVaults];
 need(roles.every(addr)&&new Set(roles).size===roles.length,'ROLE_CONTEXT');
 need(t.to===c.guard&&t.operation===0&&[t.value,t.safeTxGas,t.baseGas,t.gasPrice].every(x=>x==='0x0')&&t.gasToken===zero&&t.refundReceiver===zero,'SAFE_BOUNDARY');
 need(typeof t.data==='string'&&/^0x[0-9a-f]+$/.test(t.data),'CALLDATA');
 const selector=t.data.slice(2,10);
 const kind=selector===selectors.expense?'expense':selector===selectors.liquidity?'liquidity':null;
 need(kind!==null&&t.data.length===2+8+(kind==='expense'?10:8)*64,'SELECTOR_LENGTH');
 const w=t.data.slice(10).match(/.{64}/g),n=i=>BigInt('0x'+w[i]);
 need(n(0)===epoch,'EPOCH');
 const va=n(w.length-2),vu=n(w.length-1);
 need(va<=now&&vu>now&&vu>va&&vu-va<=86400n,'SIGNED_WINDOW');
 const common={kind,chainId:84532,blockNumber:c.blockNumber,blockHash:c.blockHash,transactionHash:c.transactionHash,safe:c.safe,safeTxHash:c.safeTxHash,epoch:c.epoch,readyAt:hex(now+172800n)};
 if(kind==='expense'){
  const i=n(1);need(i>=3n&&i<=5n,'VAULT_INDEX');
  need(/^0{24}[0-9a-f]{40}$/.test(w[2]),'ADDRESS_WORD');
  const recipient='0x'+w[2].slice(24),evidence='0x'+w[4];
  need(addr(recipient)&&n(2)!==1n&&n(3)>0n&&hash(evidence)&&n(5)<60n&&n(6)>0n&&n(7)%2n===0n,'EXPENSE_FIELDS');
  shape(c.recipientContext,['recipient','context','eligible']);
  need(c.recipientContext.recipient===recipient&&q(c.recipientContext.context)===n(7)&&c.recipientContext.eligible===true,'RECIPIENT_CONTEXT');
  const idx=Number(i-3n),vault=c.expenseVaults[idx],purpose=Buffer.from(labels[idx],'ascii').toString('hex').padEnd(64,'0');
  const id=keccak([word(84532n),word(BigInt(vault)),word(BigInt(c.token)),purpose,w[0],...w.slice(2,8)]);
  return {...common,vault,id,recipient,evidence,amount:hex(n(3))};
 }
 need(c.recipientContext===null,'UNEXPECTED_RECIPIENT_CONTEXT');
 need(n(1)>0n&&n(2)>0n&&n(3)>0n&&n(4)>now+172800n&&n(4)-now<=2592000n&&n(5)>0n,'LIQUIDITY_FIELDS');
 const vault=c.liquidityVault,id=keccak([word(84532n),word(BigInt(vault)),word(BigInt(c.token)),word(BigInt(c.quote)),word(BigInt(c.pool)),...w.slice(0,6)]);
 return {...common,vault,id,assetAmount:hex(n(1)),quoteAmount:hex(n(2)),deadline:hex(n(4))};
}
export function reconcileTypedIntent(c,t,receipt){
 return matchAuthorizationReceipt(deriveTypedIntent(c,t),receipt);
}

```
