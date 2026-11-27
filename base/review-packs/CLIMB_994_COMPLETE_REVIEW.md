# CLIMB V3 — three-AI re-review source bundle
Review ONLY exact CI checkout 7f729c032ad8ca81a831ce075f13095e7f71008c; #994 head 04cf55e979b7ef047e15a6d92474995a3a7b762e. Source snapshot (not a deployment pin): https://github.com/CryptoDilis/Climboria/tree/7f729c032ad8ca81a831ce075f13095e7f71008c

Contents: 17 project Solidity contract files, 18 Solidity test files, 2 Foundry configs, 2 workflows and 2 policy documents. All source retrieved at exact ref; Git blob IDs recorded, not independently recomputed. No secrets or real signing data. Seven part files at 8f5e5bc012e453b8bf5bbb1bb35c765f619b5cd1. This bundle is not a standalone compilable repository: full pinned Safe/OpenZeppelin dependencies and off-chain scripts are not embedded. Reviewers must obtain those separately using exact checkout and dependency pins in workflow. If not accessible, declare scope limitation and do not claim full security clearance. Off-chain paths include base/safe-custody, base/v3-testnet, base/claim-auth, base/token-accounting, base/inventory-probe and token/climb-bridge. Review only applicable paths; distinguish older sibling test fixtures from designated quorum candidate. No user funds or production network activity.

## Verified CI evidence (not reviewer-executed)
Safe 46015224825 job 140560524220, 59 Solidity tests passed, exact #994 merge checkout above. V3 46015224824 and Validate 46015224844 successful. Clean rebuild in same CI environment, bytecode size and local rehearsal passed. Not independent compilation or professional audit. Actual production custody, recovery, genuine legacy snapshot/appeals, game event authority, real liquidity adapter and production candidate remain open. TESTNET_NO_GO / MAINNET_NO_GO. No approval to remove chain lock or deploy.

## Instructions to reviewers
Review all relevant contracts from scratch plus prior issue remediation T01-T13. Cite exact path, function, code lines, prerequisites, impact, reachable execution path, confidence, and minimum regression/fix. Distinguish reproducible exploitable issues, policy/design gaps, intentional restrictions, historical sibling issues, and unverified assumptions. Check supply/decimals, atomic issuance, role separation, Safe signatures/nonce/expiry/rotation, shared expense registry and recipient role drift, game authority/rotation/caps, legacy proof/replay/closure, real dependency identity/liquidity/recovery. Identify previously fixed findings, residual/new findings, dependency gaps; no assumptions of execution. Propose Foundry tests/fuzz/invariants, state what was actually executed. Give separate controlled Sepolia and mainnet GO/NO-GO with blockers and precise reasons. Do not authorize signing/deployment or claim professional audit.

## Part identities
- A_CORE: 97c97459f255c3ee38a334fc8773fa4ea13cac88
- B_RESERVES: 87f522fa7c81a1f8c54b4bf2074f400655851b32
- C_LEGACY_AND_SIBLINGS: afa565c77c2af55ed3b76528b4a7b5ffa1ee86d6
- D_BUILD_AND_POLICY: 7b4944958f3cf402dcc42dcdb99f7e23c8b8cb38
- E_SAFE_TESTS: cbf6ad964bf15a1bb7a5a64c8190c165ff328c24
- F_V3_TESTS: 28cafaa7f68670c96b41b0f08c7cb10ec2a6331d
- G_V3_TESTS: 019743214b75eaa8f4610c615ee11f90e41a9304

# CLIMB V3 #994 re-review — A: quorum, issuance and gaming
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Full source text for all six named files. Source identities returned by GitHub, not independently rehashed. TESTNET_NO_GO / MAINNET_NO_GO. This is one part of the source pack; review B and C too. Older sibling contracts are test-only. No professional audit or deployment authorization.

## base/safe-custody/src/SafeEpochGuardFixture.sol
Git blob: be7a9181155b937019e6bd3f322358a1df750752

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
    modifier onlyWallet(){if(msg.sender!=address(wallet))revert Unauthorized();_;}
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

## base/safe-custody/src/SafeQuorumIssuanceFixture.sol
Git blob: fac23bb27e50f24b17ca36fca946b5e21114029b

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

## base/safe-custody/src/SafeReserveGuardFixture.sol
Git blob: 614b4b0f80dcde7060549de1a8344a34affebac4

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
    // The vault calls this at proposal and execution, including after signer rotation.
    function expenseRecipientAllowed(address a) public view returns(bool){
        return bound&&a!=distributor&&!_reservedRole(a)&&!_rewardRole(a);
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
    function proposeExpense(uint256 expected,uint256 i,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _authorizationWindow(validAfter,validUntil);
        if(!expenseRecipientAllowed(recipient))revert Forbidden();
        _expense(i,expected).propose(recipient,amount,evidence,month,nonce);
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
        if(len==164)return selector==this.scheduleLegacy.selector||selector==this.scheduleRewardSigner.selector;
        if(len==132)return selector==this.activateRewardSigner.selector;
        if(len==260)return selector==this.scheduleLiquidity.selector;
        return len==292&&selector==this.proposeExpense.selector;
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

## base/v3-testnet/src/V3AtomicSuccessorFixture.sol
Git blob: fd8592b99705f37e6a714314719c5a536b0b5bf7

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting} from "./ClimbV3TestToken.sol";
import {V3GovernedGameRewardFixture,IV3RewardCustody} from "./V3GovernedGameRewardFixture.sol";
import {V3EpochPolicyFactory,IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";
import {IV3BurnableAsset} from "./V3BoundedLegacyFixture.sol";
import {V3DeferredLegacyFixture} from "./V3DeferredLegacyFixture.sol";
import {V3LegacyProofClaimFixture} from "./V3LegacyProofClaimFixture.sol";
import {IV3SyntheticPool} from "./V3LiquidityPolicyFixture.sol";
import {V3DeferredLiquidityFixture} from "./V3DeferredLiquidityFixture.sol";

// Test-only pool builder. Real pool/position manager selection is not implemented.
interface IV3SyntheticPoolBuilder {
    function createPool(IERC20 asset,IERC20 quote) external returns(IV3SyntheticPool);
}

/// @notice Zero-supply on construction; only the atomic factory can issue once.
contract V3SuccessorTestToken is ERC20 {
    error InvalidIssuance();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    address public immutable issuer;
    bool public issued;
    constructor() ERC20("CLIMB V3 Successor Test Only","CLIMBV3NEXTTEST"){
        if(block.chainid!=84532) revert InvalidIssuance();
        issuer=msg.sender;
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
    // Canonical order: founder, gaming, liquidity, ecosystem, community, treasury, legacy.
    function issue(address[7] calldata vaults) external {
        if(msg.sender!=issuer||issued||totalSupply()!=0) revert InvalidIssuance();
        uint256[7] memory amounts=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++){
            if(vaults[i].code.length==0||vaults[i]==issuer||vaults[i]==address(this)) revert InvalidIssuance();
            for(uint256 j=0;j<i;j++) if(vaults[i]==vaults[j]) revert InvalidIssuance();
        }
        issued=true;
        for(uint256 i=0;i<7;i++) _mint(vaults[i],amounts[i]);
        assert(totalSupply()==INITIAL_SUPPLY);
    }
}

struct V3SuccessorLiquidityConfig {
    IERC20 quote;
    IV3SyntheticPoolBuilder builder;
    address custody;
    uint256 trancheCap;
}
struct V3SuccessorConfig {
    address founder;
    address distributor;
    IV3CustodyEpochFixture control;
    uint256 start;
    uint256 gamingWalletMonthlyCap;
    V3SuccessorLiquidityConfig liquidity;
}

// Separate immutable deployment helpers avoid putting all child creation bytecode
// in the runtime of the atomic issuer. No token custody or generic calls.
contract V3SuccessorCoreDeployer {
    function deploy(IERC20 asset,V3SuccessorConfig calldata cfg) external returns(address founder,address gaming,V3EpochPolicyFactory expenses){
        founder=address(new V3FounderVesting(asset,cfg.founder,cfg.start));
        gaming=address(new V3GovernedGameRewardFixture(asset,cfg.distributor,cfg.founder,cfg.start,cfg.gamingWalletMonthlyCap,IV3RewardCustody(address(cfg.control))));
        expenses=new V3EpochPolicyFactory(asset,cfg.control,cfg.start,cfg.founder);
    }
}
/// @notice Constructor-created staging helper; never receives issued supply.
contract V3SuccessorLegacyDeployer {
    error Unauthorized();
    address public immutable factory;
    constructor(){factory=msg.sender;}
    function legacy(V3SuccessorTestToken asset,IV3CustodyEpochFixture control) external returns(V3DeferredLegacyFixture){
        if(msg.sender!=factory||block.chainid!=84532)revert Unauthorized();
        return new V3DeferredLegacyFixture(IV3BurnableAsset(address(asset)),control);
    }
    function proofLegacy(V3SuccessorTestToken asset,IV3CustodyEpochFixture control) external returns(V3LegacyProofClaimFixture){
        if(msg.sender!=factory||block.chainid!=84532)revert Unauthorized();
        return new V3LegacyProofClaimFixture(IV3BurnableAsset(address(asset)),control);
    }
}
contract V3SuccessorConditionalDeployer {
    error InvalidLegacyDeployer();
    V3SuccessorLegacyDeployer public immutable legacyDeployer;
    bytes32 public legacyDeployerHash;
    constructor(){
        V3SuccessorLegacyDeployer helper=new V3SuccessorLegacyDeployer();
        legacyDeployer=helper;legacyDeployerHash=address(helper).codehash;
    }
    function liquidity(IERC20 asset,V3SuccessorLiquidityConfig calldata cfg,IV3CustodyEpochFixture control) external returns(V3DeferredLiquidityFixture v){
        IV3SyntheticPool p=cfg.builder.createPool(asset,cfg.quote);
        v=new V3DeferredLiquidityFixture(asset,cfg.quote,p,control,cfg.custody,cfg.trancheCap);
    }
    function legacy(V3SuccessorTestToken asset,IV3CustodyEpochFixture control) external returns(V3DeferredLegacyFixture v){
        _checkLegacyDeployer();
        v=legacyDeployer.legacy(asset,control);
        _checkLegacyDeployer();
        if(address(v.token())!=address(asset)||address(v.custody())!=address(control))revert InvalidLegacyDeployer();
    }
    // Proof-based vault selected by the synthetic successor issuance.
    function proofLegacy(V3SuccessorTestToken asset,IV3CustodyEpochFixture control) external returns(V3LegacyProofClaimFixture v){
        _checkLegacyDeployer();
        v=legacyDeployer.proofLegacy(asset,control);
        _checkLegacyDeployer();
        if(address(v.token())!=address(asset)||address(v.custody())!=address(control))revert InvalidLegacyDeployer();
    }
    function _checkLegacyDeployer() private view {
        if(address(legacyDeployer).codehash!=legacyDeployerHash)revert InvalidLegacyDeployer();
    }
}

/// @notice Offline integration of the existing successor fixtures, not a production
/// token. No real multisig, DEX adapter, Solana authorization, or live eligibility.
contract V3AtomicSuccessorFixture {
    error InvalidConfig();
    address public immutable creator;
    V3SuccessorCoreDeployer public immutable core;
    V3SuccessorConditionalDeployer public immutable conditional;
    bytes32 public immutable conditionalHash;
    V3SuccessorTestToken public token;
    address[7] public vaults;
    V3EpochPolicyFactory public expenses;
    bool public used;
    event Created(address indexed token,address[7] vaults);
    // Staged helper identity must be independently verified against the reviewed
    // artifact before signing issuance. A caller-selected hash is not authentication.
    constructor(V3SuccessorConditionalDeployer helper,bytes32 expectedHash){
        if(block.chainid!=84532||address(helper).code.length==0||expectedHash==0||address(helper).codehash!=expectedHash) revert InvalidConfig();
        creator=msg.sender;
        core=new V3SuccessorCoreDeployer();
        conditional=helper;conditionalHash=expectedHash;
    }
    function create(V3SuccessorConfig calldata cfg) external virtual returns(V3SuccessorTestToken asset){
        if(msg.sender!=creator)revert InvalidConfig();
        return _create(cfg);
    }
    function _create(V3SuccessorConfig calldata cfg) internal returns(V3SuccessorTestToken asset){
        if(used||block.chainid!=84532||address(conditional).codehash!=conditionalHash||cfg.founder==address(0)||cfg.distributor==address(0)||cfg.founder==cfg.distributor||
           cfg.founder==address(this)||cfg.distributor==address(this)||cfg.liquidity.custody==cfg.founder||cfg.liquidity.custody==cfg.distributor||
           address(cfg.control)==cfg.founder||address(cfg.control)==cfg.distributor||
           cfg.control.isMember(cfg.founder)||cfg.control.isMember(cfg.distributor)) revert InvalidConfig();
        used=true;
        asset=new V3SuccessorTestToken();
        token=asset;
        _deployPolicies(asset,cfg);
        if(address(conditional).codehash!=conditionalHash)revert InvalidConfig();
        // No supply before all policy constructors succeed; no intermediate EOA/factory float.
        _beforeIssue();
        asset.issue(vaults);
        assert(asset.balanceOf(address(this))==0&&asset.balanceOf(msg.sender)==0&&asset.balanceOf(cfg.founder)==0&&asset.balanceOf(cfg.distributor)==0);
        emit Created(address(asset),vaults);
    }
    function _beforeIssue() internal virtual {}
    function _deployPolicies(V3SuccessorTestToken asset,V3SuccessorConfig calldata cfg) private {
        (address f,address g,V3EpochPolicyFactory e)=core.deploy(asset,cfg);
        expenses=e;
        vaults[0]=f;vaults[1]=g;
        vaults[2]=address(conditional.liquidity(asset,cfg.liquidity,cfg.control));
        vaults[3]=address(e.ecosystem());vaults[4]=address(e.community());vaults[5]=address(e.treasury());
        vaults[6]=address(conditional.proofLegacy(asset,cfg.control));
    }
}

```

## base/v3-testnet/src/ClimbV3TestToken.sol
Git blob: 29db411f53556b2c68a0c260f19efcb6d7cef579

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Inert test-only reserve. No release path; NOT a production vault or LP lock.
contract V3InactiveReserve {
    error WrongChain();
    bytes32 public immutable purpose;
    constructor(bytes32 label) {
        if(block.chainid!=84532) revert WrongChain();
        purpose=label;
    }
}

/// @notice Synthetic fixed beneficiary, no catch-up at cliff, 36 installments.
/// A model month is exactly 30 days, not a calendar month.
contract V3FounderVesting {
    error WrongChain();
    error InvalidConfig();
    error NothingDue();
    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable start;
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=17777777760000;
    uint256 public released;
    constructor(IERC20 asset,address receiver,uint256 begin){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset)==address(0)||receiver==address(0)||receiver==address(this)||begin<=block.timestamp||begin>block.timestamp+365 days) revert InvalidConfig();
        token=asset;beneficiary=receiver;start=begin;
    }
    function vested() public view returns(uint256){
        if(block.timestamp<=start) return 0;
        uint256 elapsed=(block.timestamp-start)/MONTH;
        if(elapsed<=12) return 0;
        if(elapsed>=48) return ALLOCATION;
        return ALLOCATION*(elapsed-12)/36;
    }
    function release() external {
        uint256 amount=vested()-released;
        if(amount==0) revert NothingDue();
        released+=amount;
        require(token.transfer(beneficiary,amount));
    }
}

/// @notice Synthetic release ceiling, not a player reward system. Unused monthly
/// capacity expires; unused tokens remain locked permanently in this prototype.
contract V3GamingVault {
    error WrongChain();
    error InvalidConfig();
    error NotDistributor();
    error OutsideWindow();
    error CapExceeded();
    IERC20 public immutable token;
    address public immutable distributor;
    uint256 public immutable start;
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=311111110800000;
    mapping(uint256=>uint256) public monthlyReleased;
    uint256 public released;
    constructor(IERC20 asset,address receiver,uint256 begin){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset)==address(0)||receiver==address(0)||receiver==address(this)||begin<=block.timestamp||begin>block.timestamp+365 days) revert InvalidConfig();
        token=asset;distributor=receiver;start=begin;
    }
    function monthlyCap(uint256 m) public pure returns(uint256){
        if(m>=60) return 0;
        uint256 annual=ALLOCATION*(30-5*(m/12))/100;
        uint256 i=m%12;
        return annual*(i+1)/12-annual*i/12;
    }
    function release(uint256 amount) external {
        if(msg.sender!=distributor) revert NotDistributor();
        if(block.timestamp<start) revert OutsideWindow();
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60) revert OutsideWindow();
        if(amount==0||amount>monthlyCap(m)-monthlyReleased[m]) revert CapExceeded();
        monthlyReleased[m]+=amount;
        released+=amount;
        require(token.transfer(distributor,amount));
    }
}

/// @notice Exact V3 test issuance. No production token, quote assets, liquidity,
/// public claim, external deposit or mainnet deployment.
contract ClimbV3TestToken is ERC20 {
    error WrongChain();
    error InvalidConfig();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    V3FounderVesting public immutable founderVault;
    V3GamingVault public immutable gamingVault;
    V3InactiveReserve public immutable liquidityReserve;
    V3InactiveReserve public immutable ecosystemReserve;
    V3InactiveReserve public immutable communityReserve;
    V3InactiveReserve public immutable treasuryReserve;
    V3InactiveReserve public immutable legacyReserve;
    constructor(address founder,address distributor,uint256 start) ERC20("CLIMB V3 Test Only","CLIMBV3TEST"){
        if(block.chainid!=84532) revert WrongChain();
        if(founder==address(0)||distributor==address(0)||founder==distributor||founder==address(this)||distributor==address(this)) revert InvalidConfig();
        founderVault=new V3FounderVesting(IERC20(address(this)),founder,start);
        gamingVault=new V3GamingVault(IERC20(address(this)),distributor,start);
        liquidityReserve=new V3InactiveReserve("LIQUIDITY");
        ecosystemReserve=new V3InactiveReserve("ECOSYSTEM");
        communityReserve=new V3InactiveReserve("COMMUNITY");
        treasuryReserve=new V3InactiveReserve("TREASURY");
        legacyReserve=new V3InactiveReserve("LEGACY");
        _mint(address(founderVault),17777777760000);
        _mint(address(gamingVault),311111110800000);
        _mint(address(liquidityReserve),222222222000000);
        _mint(address(ecosystemReserve),133333333200000);
        _mint(address(communityReserve),88888888800000);
        _mint(address(treasuryReserve),106666666560000);
        _mint(address(legacyReserve),8888888880000);
        assert(totalSupply()==INITIAL_SUPPLY);
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}

```

## base/v3-testnet/src/V3GovernedGameRewardFixture.sol
Git blob: 9a7a644b2d3a7bdbe9e07979698308f07c0c2b9b

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

interface IV3RewardCustody {
    function epoch() external view returns(uint256);
    function threshold() external view returns(uint256);
    function memberCount() external view returns(uint256);
    // Adapter must exclude owners, pending owner replacements and reserved roles.
    function rewardSignerAllowed(address signer) external view returns(bool);
}

/// @notice Isolated test-only governed reward candidate. NOT wired to the Safe
/// successor; the adapter must independently enforce exact quorum authorization.
contract V3GovernedGameRewardFixture is EIP712,ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error InvalidReward();
    error OutsideWindow();
    error InvalidSigner();
    error AlreadyPaid();
    error CapExceeded();
    error Unauthorized();
    error InvalidAuthority();
    uint256 public constant DELAY=2 days;
    uint256 public constant WINDOW=7 days;
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=311111110800000;
    bytes32 public constant REWARD_TYPEHASH=keccak256("Reward(bytes32 eventId,address recipient,uint256 amount,uint256 month,uint256 deadline,uint256 generation)");
    IERC20 public immutable token;
    address public distributor;
    IV3RewardCustody public immutable custody;
    bytes32 public immutable custodyHash;
    uint256 public generation=1;
    uint256 public rotationSerial;
    struct Rotation {address signer;uint256 epoch;uint256 readyAt;uint256 expiresAt;}
    Rotation public pending;
    mapping(address=>bool) public formerOrCurrentSigner;
    event SignerRevoked(address indexed oldSigner,uint256 indexed generation);
    event SignerScheduled(address indexed signer,uint256 indexed serial,uint256 epoch,uint256 readyAt,uint256 expiresAt);
    event SignerCancelled(uint256 indexed serial);
    event SignerActivated(address indexed signer,uint256 indexed generation,uint256 indexed serial);
    address public immutable excludedFounder;
    uint256 public immutable start;
    uint256 public immutable walletMonthlyCap;
    uint256 public released;
    mapping(bytes32=>bool) public paid;
    mapping(uint256=>uint256) public monthlyReleased;
    mapping(uint256=>mapping(address=>uint256)) public walletReleased;
    event RewardPaid(bytes32 indexed eventId,address indexed recipient,uint256 amount,uint256 month);
    struct Reward {bytes32 eventId;address recipient;uint256 amount;uint256 month;uint256 deadline;uint256 generation;}
    constructor(IERC20 asset,address signer,address founder,uint256 begin,uint256 walletCap,IV3RewardCustody control) EIP712("CLIMB V3 Governed Synthetic Game Rewards","2"){
        if(block.chainid!=84532||address(asset).code.length==0||signer==address(0)||founder==address(0)||signer==founder||
           signer.code.length!=0||begin<=block.timestamp||begin-block.timestamp>365 days||walletCap==0||walletCap>ALLOCATION) revert InvalidConfig();
        token=asset;distributor=signer;excludedFounder=founder;start=begin;walletMonthlyCap=walletCap;
        if(address(control).code.length==0)revert InvalidConfig();
        custody=control;custodyHash=address(control).codehash;
        if(_epoch()==0||!_eligible(signer))revert InvalidConfig();
        formerOrCurrentSigner[signer]=true;
    }
    function _epoch() private view returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyHash||custody.threshold()!=3||custody.memberCount()!=5)revert InvalidAuthority();
        e=custody.epoch();
        if(e==0)revert InvalidAuthority();
    }
    function _eligible(address signer) private view returns(bool){
        return signer!=address(0)&&signer!=address(1)&&signer!=excludedFounder&&signer!=address(this)&&
            signer!=address(token)&&signer!=address(custody)&&signer.code.length==0&&custody.rewardSignerAllowed(signer);
    }
    function _authorize(uint256 expectedEpoch,uint256 expectedGeneration) private view {
        if(msg.sender!=address(custody))revert Unauthorized();
        if(_epoch()!=expectedEpoch||generation!=expectedGeneration)revert InvalidAuthority();
    }
    function revoke(uint256 expectedEpoch,uint256 expectedGeneration) external {
        _authorize(expectedEpoch,expectedGeneration);
        address old=distributor;
        if(old==address(0))revert InvalidAuthority();
        distributor=address(0);generation++;delete pending;
        emit SignerRevoked(old,generation);
    }
    function schedule(uint256 expectedEpoch,uint256 expectedGeneration,address signer,uint256 validAfter,uint256 validUntil) external {
        _authorize(expectedEpoch,expectedGeneration);
        if(distributor!=address(0)||!_eligible(signer)||validAfter>block.timestamp||validUntil<=block.timestamp||
            validUntil<=validAfter||validUntil-validAfter>1 days||
            (pending.signer!=address(0)&&pending.epoch==expectedEpoch&&block.timestamp<pending.expiresAt))revert InvalidAuthority();
        rotationSerial++;
        pending=Rotation(signer,expectedEpoch,block.timestamp+DELAY,block.timestamp+DELAY+WINDOW);
        emit SignerScheduled(signer,rotationSerial,expectedEpoch,pending.readyAt,pending.expiresAt);
    }
    function cancel(uint256 expectedEpoch,uint256 expectedGeneration,uint256 serial) external {
        _authorize(expectedEpoch,expectedGeneration);
        if(serial!=rotationSerial||pending.signer==address(0))revert InvalidAuthority();
        delete pending;emit SignerCancelled(serial);
    }
    function activate(uint256 expectedEpoch,uint256 expectedGeneration,uint256 serial,address signer) external {
        _authorize(expectedEpoch,expectedGeneration);
        Rotation memory p=pending;
        if(distributor!=address(0)||serial!=rotationSerial||p.signer!=signer||p.epoch!=expectedEpoch||
            block.timestamp<p.readyAt||block.timestamp>=p.expiresAt||!_eligible(signer))revert InvalidAuthority();
        delete pending;generation++;distributor=signer;formerOrCurrentSigner[signer]=true;
        emit SignerActivated(signer,generation,serial);
    }
    // Compact binding predicate for the authenticated successor's actual guard.
    function matchesInitialBinding(address expectedToken,address expectedCustody,address expectedFounder) external view returns(bool){
        return address(token)==expectedToken&&address(custody)==expectedCustody&&
            custodyHash==expectedCustody.codehash&&generation==1&&excludedFounder==expectedFounder&&
            distributor!=address(0)&&formerOrCurrentSigner[distributor];
    }
    function reservedSignerRole(address a) external view returns(bool){
        return formerOrCurrentSigner[a]||a==pending.signer;
    }
    function monthlyCap(uint256 m) public pure returns(uint256){
        if(m>=60)return 0;
        uint256 annual=ALLOCATION*(30-5*(m/12))/100;
        uint256 i=m%12;return annual*(i+1)/12-annual*i/12;
    }
    function digest(Reward calldata reward) public view returns(bytes32){
        return _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH,reward.eventId,reward.recipient,reward.amount,reward.month,reward.deadline,reward.generation)));
    }
    function claim(Reward calldata reward,bytes calldata signature) external nonReentrant {
        if(block.chainid!=84532||block.timestamp<start)revert OutsideWindow();
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60||reward.month!=m||block.timestamp>=reward.deadline||reward.deadline>start+(m+1)*MONTH)revert OutsideWindow();
        _epoch();
        if(reward.generation!=generation||!_eligible(distributor))revert InvalidSigner();
        if(reward.eventId==0||reward.amount==0||reward.recipient==address(0)||reward.recipient==address(this)||
           reward.recipient==address(token)||formerOrCurrentSigner[reward.recipient]||reward.recipient==excludedFounder)revert InvalidReward();
        if(paid[reward.eventId])revert AlreadyPaid();
        if(ECDSA.recover(digest(reward),signature)!=distributor)revert InvalidSigner();
        if(reward.amount>monthlyCap(m)-monthlyReleased[m]||reward.amount>walletMonthlyCap-walletReleased[m][reward.recipient]||
           reward.amount>ALLOCATION-released)revert CapExceeded();
        paid[reward.eventId]=true;monthlyReleased[m]+=reward.amount;walletReleased[m][reward.recipient]+=reward.amount;released+=reward.amount;
        token.safeTransfer(reward.recipient,reward.amount);
        emit RewardPaid(reward.eventId,reward.recipient,reward.amount,m);
    }
}

```


---

# CLIMB V3 #994 re-review — B: reserve, liquidity and claim policy
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Six complete files, GitHub-reported blob IDs; not independently rehashed. Review with A and C. No real pool, holder eligibility or release authorization established. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/src/V3EpochSpendFixture.sol
Git blob: 8268b3d33b436309750252603a4993565f7e5ddb

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
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32 id){
        if(msg.sender!=address(custody)) revert Unauthorized();
        uint256 e=_observe();
        if(!_recipientAllowed(recipient)||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)||
           block.timestamp+DELAY>=start+(month+1)*MONTH||registry.consumedBy(evidence)!=address(0)) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),address(token),purpose,e,recipient,amount,evidence,month,nonce));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,e,block.timestamp+DELAY,false,false);
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
        if(p.recipient==address(0)||p.executed||p.cancelled||p.epoch!=e||!_recipientAllowed(p.recipient)||
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

## base/v3-testnet/src/V3SharedExpenseFixture.sol
Git blob: bf6b4be76c32b7fcff0ad15423673bbe380c67c9

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only fixed 3-of-5 approval vault for milestone expenditures.
/// Synthetic signers and limits; independence and evidence truth are off-chain
/// requirements. No generic calls, signer changes, sweeping or automatic rollover.
/// @notice Test-only registry. Bound once to three policy vaults by the creating factory.
contract V3SharedExpenseRegistry {
    error InvalidBinding();
    error UnauthorizedConsumer();
    error ExpenseAlreadyConsumed();
    address private immutable binder;
    bool public isSealed;
    mapping(address=>bool) public consumer;
    mapping(bytes32=>address) public consumedBy;
    mapping(bytes32=>bytes32) public consumedProposal;
    event ExpenseConsumed(bytes32 indexed evidence,address indexed vault,bytes32 indexed proposal);
    constructor(){
        if(block.chainid!=84532) revert InvalidBinding();
        binder=msg.sender;
    }
    function bind(address[3] calldata vaults) external {
        if(msg.sender!=binder||isSealed) revert InvalidBinding();
        for(uint256 i=0;i<3;i++){
            address v=vaults[i];
            if(v.code.length==0||consumer[v]) revert InvalidBinding();
            consumer[v]=true;
        }
        isSealed=true;
    }
    function consume(bytes32 evidence,bytes32 proposal) external {
        if(!isSealed||!consumer[msg.sender]) revert UnauthorizedConsumer();
        if(evidence==0||proposal==0||consumedBy[evidence]!=address(0)) revert ExpenseAlreadyConsumed();
        consumedBy[evidence]=msg.sender;
        consumedProposal[evidence]=proposal;
        emit ExpenseConsumed(evidence,msg.sender,proposal);
    }
}

contract V3SharedRestrictedSpend {
    error WrongChain();
    error InvalidConfig();
    error Unauthorized();
    error InvalidProposal();
    error AlreadyApproved();
    error NotReady();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant DELAY=2 days;
    V3SharedExpenseRegistry public immutable registry;
    IERC20 public immutable token;
    uint256 public immutable start;
    uint256 public immutable budget;
    address public immutable excludedFounder;
    bytes32 public immutable purpose;
    mapping(address=>bool) public signer;
    mapping(uint256=>uint256) public spent;
    uint256 public totalSpent;
    struct Proposal {
        address recipient;
        uint256 amount;
        bytes32 evidence;
        uint256 month;
        uint256 readyAt;
        uint8 approvals;
        bool executed;
    }
    mapping(bytes32=>Proposal) public proposals;
    mapping(bytes32=>mapping(address=>bool)) public approved;
    mapping(bytes32=>mapping(address=>bool)) public cancelVoted;
    mapping(bytes32=>uint8) public cancelVotes;
    mapping(bytes32=>bool) public cancelled;
    event Proposed(bytes32 indexed id,address indexed recipient,uint256 amount,bytes32 evidence,uint256 month);
    event Approved(bytes32 indexed id,address indexed signer);
    event ApprovalRevoked(bytes32 indexed id,address indexed signer);
    event CancellationVoted(bytes32 indexed id,address indexed signer);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id,address indexed recipient,uint256 amount);
    constructor(IERC20 asset,address[5] memory signers,address founder,uint256 begin,uint256 cap,bytes32 label,V3SharedExpenseRegistry shared){
        if(block.chainid!=84532) revert WrongChain();
        if(address(shared).code.length==0||address(asset)==address(0)||founder==address(0)||begin<=block.timestamp||begin>block.timestamp+365 days||cap==0||cap>888888888000000||label==0) revert InvalidConfig();
        registry=shared;token=asset;start=begin;budget=cap;purpose=label;excludedFounder=founder;
        for(uint256 i=0;i<5;i++){
            address s=signers[i];
            if(s==address(0)||s==founder||s==address(this)||signer[s]) revert InvalidConfig();
            signer[s]=true;
        }
    }
    function monthlyCap(uint256 month) public view returns(uint256){
        if(month>=60) return 0;
        return budget*(month+1)/60-budget*month/60;
    }
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32 id){
        if(!signer[msg.sender]) revert Unauthorized();
        if(recipient==address(0)||recipient==address(this)||recipient==excludedFounder||signer[recipient]||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)) revert InvalidProposal();
        uint256 end=start+(month+1)*MONTH;
        if(block.timestamp+DELAY>=end) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),purpose,recipient,amount,evidence,month,nonce));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,0,0,false);
        emit Proposed(id,recipient,amount,evidence,month);
    }
    function approve(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        if(approved[id][msg.sender]) revert AlreadyApproved();
        approved[id][msg.sender]=true;
        p.approvals++;
        if(p.approvals==3) p.readyAt=block.timestamp+DELAY;
        emit Approved(id,msg.sender);
    }
    /// @notice A signer can withdraw its own approval before execution.
    /// Falling below threshold resets the delay; a fresh quorum starts it again.
    function revokeApproval(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||!approved[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        approved[id][msg.sender]=false;
        p.approvals--;
        if(p.approvals<3) p.readyAt=0;
        emit ApprovalRevoked(id,msg.sender);
    }
    /// @notice Three distinct cancellation votes permanently invalidate this ID.
    /// Votes are irreversible. Until quorum, execution can still win the race.
    function voteCancel(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||cancelVoted[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        cancelVoted[id][msg.sender]=true;
        cancelVotes[id]++;
        emit CancellationVoted(id,msg.sender);
        if(cancelVotes[id]==3){
            cancelled[id]=true;
            emit Cancelled(id);
        }
    }
    function execute(bytes32 id) external {
        Proposal storage p=proposals[id];
        if(p.executed||cancelled[id]||p.approvals<3||block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;
        spent[p.month]+=p.amount;
        totalSpent+=p.amount;
        registry.consume(p.evidence,id);
        require(token.transfer(p.recipient,p.amount));
        emit Executed(id,p.recipient,p.amount);
    }
}

// Factory binds all three consumers atomically, with no subsequent configuration route.
// This is an isolated test fixture, not a new token or production custody implementation.
contract V3SharedExpenseFixture {
    V3SharedExpenseRegistry public immutable registry;
    V3SharedRestrictedSpend public immutable ecosystem;
    V3SharedRestrictedSpend public immutable community;
    V3SharedRestrictedSpend public immutable treasury;
    constructor(IERC20 asset,address[5] memory signers,address founder,uint256 begin){
        V3SharedExpenseRegistry shared=new V3SharedExpenseRegistry();
        registry=shared;
        V3SharedRestrictedSpend e=new V3SharedRestrictedSpend(asset,signers,founder,begin,133333333200000,"ECOSYSTEM",shared);
        V3SharedRestrictedSpend c=new V3SharedRestrictedSpend(asset,signers,founder,begin,88888888800000,"COMMUNITY",shared);
        V3SharedRestrictedSpend t=new V3SharedRestrictedSpend(asset,signers,founder,begin,106666666560000,"TREASURY",shared);
        ecosystem=e;community=c;treasury=t;
        shared.bind([address(e),address(c),address(t)]);
    }
}

```

## base/v3-testnet/src/V3RestrictedSpend.sol
Git blob: e46c8af5e5faa6c8632ae837b8c2e439e4b02daf

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only fixed 3-of-5 approval vault for milestone expenditures.
/// Synthetic signers and limits; independence and evidence truth are off-chain
/// requirements. No generic calls, signer changes, sweeping or automatic rollover.
contract V3RestrictedSpend {
    error WrongChain();
    error InvalidConfig();
    error Unauthorized();
    error InvalidProposal();
    error AlreadyApproved();
    error NotReady();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant DELAY=2 days;
    IERC20 public immutable token;
    uint256 public immutable start;
    uint256 public immutable budget;
    address public immutable excludedFounder;
    bytes32 public immutable purpose;
    mapping(address=>bool) public signer;
    mapping(uint256=>uint256) public spent;
    uint256 public totalSpent;
    struct Proposal {
        address recipient;
        uint256 amount;
        bytes32 evidence;
        uint256 month;
        uint256 readyAt;
        uint8 approvals;
        bool executed;
    }
    mapping(bytes32=>Proposal) public proposals;
    mapping(bytes32=>mapping(address=>bool)) public approved;
    mapping(bytes32=>mapping(address=>bool)) public cancelVoted;
    mapping(bytes32=>uint8) public cancelVotes;
    mapping(bytes32=>bool) public cancelled;
    event Proposed(bytes32 indexed id,address indexed recipient,uint256 amount,bytes32 evidence,uint256 month);
    event Approved(bytes32 indexed id,address indexed signer);
    event ApprovalRevoked(bytes32 indexed id,address indexed signer);
    event CancellationVoted(bytes32 indexed id,address indexed signer);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id,address indexed recipient,uint256 amount);
    constructor(IERC20 asset,address[5] memory signers,address founder,uint256 begin,uint256 cap,bytes32 label){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset)==address(0)||founder==address(0)||begin<=block.timestamp||begin>block.timestamp+365 days||cap==0||cap>888888888000000||label==0) revert InvalidConfig();
        token=asset;start=begin;budget=cap;purpose=label;excludedFounder=founder;
        for(uint256 i=0;i<5;i++){
            address s=signers[i];
            if(s==address(0)||s==founder||s==address(this)||signer[s]) revert InvalidConfig();
            signer[s]=true;
        }
    }
    function monthlyCap(uint256 month) public view returns(uint256){
        if(month>=60) return 0;
        return budget*(month+1)/60-budget*month/60;
    }
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32 id){
        if(!signer[msg.sender]) revert Unauthorized();
        if(recipient==address(0)||recipient==address(this)||recipient==excludedFounder||signer[recipient]||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)) revert InvalidProposal();
        uint256 end=start+(month+1)*MONTH;
        if(block.timestamp+DELAY>=end) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),purpose,recipient,amount,evidence,month,nonce));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,0,0,false);
        emit Proposed(id,recipient,amount,evidence,month);
    }
    function approve(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        if(approved[id][msg.sender]) revert AlreadyApproved();
        approved[id][msg.sender]=true;
        p.approvals++;
        if(p.approvals==3) p.readyAt=block.timestamp+DELAY;
        emit Approved(id,msg.sender);
    }
    /// @notice A signer can withdraw its own approval before execution.
    /// Falling below threshold resets the delay; a fresh quorum starts it again.
    function revokeApproval(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||!approved[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        approved[id][msg.sender]=false;
        p.approvals--;
        if(p.approvals<3) p.readyAt=0;
        emit ApprovalRevoked(id,msg.sender);
    }
    /// @notice Three distinct cancellation votes permanently invalidate this ID.
    /// Votes are irreversible. Until quorum, execution can still win the race.
    function voteCancel(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||cancelVoted[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        cancelVoted[id][msg.sender]=true;
        cancelVotes[id]++;
        emit CancellationVoted(id,msg.sender);
        if(cancelVotes[id]==3){
            cancelled[id]=true;
            emit Cancelled(id);
        }
    }
    function execute(bytes32 id) external {
        Proposal storage p=proposals[id];
        if(p.executed||cancelled[id]||p.approvals<3||block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;
        spent[p.month]+=p.amount;
        totalSpent+=p.amount;
        require(token.transfer(p.recipient,p.amount));
        emit Executed(id,p.recipient,p.amount);
    }
}

```

## base/v3-testnet/src/V3DeferredLiquidityFixture.sol
Git blob: 663af5a41cb9ed1b2943f044ddd01809229e525e

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";
import {IV3SyntheticPool,V3SyntheticLPLock} from "./V3LiquidityPolicyFixture.sol";

/// @notice Isolated Base Sepolia synthetic deferral/tranche fixture, NOT a real DEX.
/// No quote funding required on creation. Custody adapter is trusted for quorum
/// and monotonic epochs. No unrestricted CLIMB withdrawal or allowance.
contract V3DeferredLiquidityFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidAction();
    error NotReady();
    error BalanceMismatch();
    uint256 public constant RESERVE=222222222000000;
    uint256 public constant DELAY=2 days;
    IERC20 public immutable asset;
    IERC20 public immutable quote;
    IV3SyntheticPool public immutable pool;
    IV3CustodyEpochFixture public immutable custody;
    address public immutable lpCustody;
    bytes32 public immutable poolCodeHash;
    bytes32 public immutable custodyCodeHash;
    bytes32 public immutable lpCustodyCodeHash;
    uint256 public immutable trancheCap;
    uint256 public highestObservedEpoch;
    uint256 public spent;
    struct Action {
        uint256 assetAmount;
        uint256 quoteAmount;
        uint256 minShares;
        uint256 epoch;
        uint256 readyAt;
        uint256 deadline;
        bool executed;
        bool cancelled;
        address locker;
    }
    mapping(bytes32=>Action) public actions;
    struct PoolSnapshot {uint256 assetBalance;uint256 quoteBalance;uint256 supply;}
    event Scheduled(bytes32 indexed id,uint256 indexed epoch,uint256 assetAmount,uint256 quoteAmount,uint256 readyAt,uint256 deadline);
    event Cancelled(bytes32 indexed id);
    event Locked(bytes32 indexed id,address indexed locker,uint256 assetSpent,uint256 quoteSpent,uint256 shares);
    constructor(IERC20 a,IERC20 q,IV3SyntheticPool p,IV3CustodyEpochFixture control,address destination,uint256 cap){
        if(block.chainid!=84532||address(a).code.length==0||address(q).code.length==0||address(p).code.length==0||
           address(control).code.length==0||destination.code.length==0||address(a)==address(q)||address(p)==address(a)||address(p)==address(q)||
           destination==address(a)||destination==address(q)||destination==address(p)||destination==address(this)||
           p.asset()!=address(a)||p.quote()!=address(q)||cap==0||cap>RESERVE||
           control.threshold()!=3||control.memberCount()!=5||control.epoch()==0) revert InvalidConfig();
        asset=a;quote=q;pool=p;custody=control;lpCustody=destination;trancheCap=cap;
        poolCodeHash=address(p).codehash;custodyCodeHash=address(control).codehash;lpCustodyCodeHash=destination.codehash;
        highestObservedEpoch=control.epoch();
    }
    function _observe() private returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyCodeHash||custody.threshold()!=3||custody.memberCount()!=5||
           address(pool).codehash!=poolCodeHash||pool.asset()!=address(asset)||pool.quote()!=address(quote)||lpCustody.codehash!=lpCustodyCodeHash)revert InvalidConfig();
        e=custody.epoch();if(e==0||e<highestObservedEpoch)revert InvalidConfig();
        highestObservedEpoch=e;
    }
    function syncEpoch() external {_observe();}
    function schedule(uint256 a,uint256 q,uint256 minShares,uint256 deadline,bytes32 nonce) external returns(bytes32 id){
        if(msg.sender!=address(custody))revert Unauthorized();
        uint256 e=_observe();
        if(a==0||a>trancheCap||a>RESERVE-spent||q==0||minShares==0||nonce==0||
           deadline<=block.timestamp+DELAY||deadline-block.timestamp>30 days)revert InvalidAction();
        id=keccak256(abi.encode(block.chainid,address(this),address(asset),address(quote),address(pool),e,a,q,minShares,deadline,nonce));
        if(actions[id].readyAt!=0)revert InvalidAction();
        actions[id]=Action(a,q,minShares,e,block.timestamp+DELAY,deadline,false,false,address(0));
        emit Scheduled(id,e,a,q,block.timestamp+DELAY,deadline);
    }
    function cancel(bytes32 id) external {
        if(msg.sender!=address(custody))revert Unauthorized();
        _observe();
        Action storage x=actions[id];
        if(x.readyAt==0||x.executed||x.cancelled)revert InvalidAction();
        x.cancelled=true;emit Cancelled(id);
    }
    function execute(bytes32 id) external nonReentrant {
        uint256 e=_observe();
        Action storage x=actions[id];
        if(x.readyAt==0||x.executed||x.cancelled||x.epoch!=e||block.timestamp<x.readyAt||block.timestamp>=x.deadline||
           x.assetAmount>RESERVE-spent||asset.balanceOf(address(this))<RESERVE-spent||quote.balanceOf(address(this))<x.quoteAmount)revert NotReady();
        // The fresh locker is fixed to the exact pool shares and destination.
        V3SyntheticLPLock lock=new V3SyntheticLPLock(pool,lpCustody,x.deadline+730 days);
        x.executed=true;x.locker=address(lock);spent+=x.assetAmount;
        uint256 shares=_add(x,lock);
        emit Locked(id,address(lock),x.assetAmount,x.quoteAmount,shares);
    }
    function _add(Action storage x,V3SyntheticLPLock lock) private returns(uint256 shares){
        uint256 a0=asset.balanceOf(address(this));uint256 q0=quote.balanceOf(address(this));uint256 l0=pool.balanceOf(address(lock));
        PoolSnapshot memory beforePool=PoolSnapshot(asset.balanceOf(address(pool)),quote.balanceOf(address(pool)),pool.totalSupply());
        if(asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0)revert BalanceMismatch();
        asset.safeApprove(address(pool),x.assetAmount);quote.safeApprove(address(pool),x.quoteAmount);
        shares=pool.addLiquidity(x.assetAmount,x.quoteAmount,x.minShares,address(lock));
        asset.safeApprove(address(pool),0);quote.safeApprove(address(pool),0);
        uint256 l1=pool.balanceOf(address(lock));
        if(asset.balanceOf(address(this))!=a0-x.assetAmount||quote.balanceOf(address(this))!=q0-x.quoteAmount||
           l1<l0||l1-l0!=shares||shares<x.minShares||asset.allowance(address(this),address(pool))!=0||
           quote.allowance(address(this),address(pool))!=0)revert BalanceMismatch();
        // Synthetic pool must retain both inputs and mint only the reported locked shares.
        // Pool-reported supply is not independent evidence of economic backing.
        if(asset.balanceOf(address(pool))!=beforePool.assetBalance+x.assetAmount||
           quote.balanceOf(address(pool))!=beforePool.quoteBalance+x.quoteAmount||
           pool.totalSupply()!=beforePool.supply+shares)revert BalanceMismatch();
    }
}

```

## base/v3-testnet/src/V3LiquidityPolicyFixture.sol
Git blob: 650000b2089bfff743471a1938bed0eeaa636fd4

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

// Synthetic fungible LP interface ONLY. Not a real DEX router or NFT position manager.
interface IV3SyntheticPool is IERC20 {
    function asset() external view returns(address);
    function quote() external view returns(address);
    function addLiquidity(uint256 assetAmount,uint256 quoteAmount,uint256 minShares,address recipient) external returns(uint256);
}

/// @notice Test-only fixed LP custody and time lock. No early release or arbitrary recipient.
contract V3SyntheticLPLock {
    using SafeERC20 for IERC20;
    error InvalidLock();
    error Locked();
    IERC20 public immutable lp;
    address public immutable custody;
    bytes32 public immutable custodyCodeHash;
    uint256 public immutable unlockAt;
    constructor(IERC20 shares,address destination,uint256 unlock){
        if(block.chainid!=84532||address(shares).code.length==0||destination.code.length==0||unlock<block.timestamp+730 days) revert InvalidLock();
        lp=shares;custody=destination;custodyCodeHash=destination.codehash;unlockAt=unlock;
    }
    function release() external {
        if(block.timestamp<unlockAt||custody.codehash!=custodyCodeHash) revert Locked();
        lp.safeTransfer(custody,lp.balanceOf(address(this)));
    }
}

/// @notice One exact precommitted synthetic liquidity action, no admin or arbitrary router calls.
/// A real pool integration must independently validate price, slippage, custody and code.
contract V3LiquidityPolicyFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error NotReady();
    error BalanceMismatch();
    uint256 public constant RESERVE=222222222000000;
    IERC20 public immutable asset;
    IERC20 public immutable quote;
    IV3SyntheticPool public immutable pool;
    bytes32 public immutable poolCodeHash;
    V3SyntheticLPLock public immutable locker;
    uint256 public immutable assetAmount;
    uint256 public immutable quoteAmount;
    uint256 public immutable minShares;
    uint256 public immutable executeBefore;
    bool public executed;
    uint256 public sharesLocked;
    event LiquidityLocked(uint256 assetSpent,uint256 quoteSpent,uint256 shares,address locker);
    constructor(IERC20 a,IERC20 q,IV3SyntheticPool p,bytes32 poolHash,address custody,uint256 aAmount,uint256 qAmount,uint256 minimum,uint256 expiry){
        if(block.chainid!=84532||address(a).code.length==0||address(q).code.length==0||address(p).code.length==0||
           address(a)==address(q)||address(p)==address(a)||address(p)==address(q)||poolHash!=address(p).codehash||
           p.asset()!=address(a)||p.quote()!=address(q)||aAmount==0||aAmount>RESERVE||qAmount==0||minimum==0||
           expiry<=block.timestamp||expiry-block.timestamp>30 days) revert InvalidConfig();
        asset=a;quote=q;pool=p;poolCodeHash=poolHash;assetAmount=aAmount;quoteAmount=qAmount;minShares=minimum;executeBefore=expiry;
        // Expiry + lock length ensures at least 730 days from any permitted execution.
        locker=new V3SyntheticLPLock(p,custody,expiry+730 days);
    }
    function execute() external nonReentrant {
        if(executed||block.timestamp>=executeBefore||address(pool).codehash!=poolCodeHash||pool.asset()!=address(asset)||pool.quote()!=address(quote)) revert NotReady();
        uint256 beforeA=asset.balanceOf(address(this));uint256 beforeQ=quote.balanceOf(address(this));
        uint256 beforeLP=pool.balanceOf(address(locker));
        if(beforeA<RESERVE||beforeQ<quoteAmount||asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0) revert NotReady();
        executed=true;
        asset.safeApprove(address(pool),assetAmount);quote.safeApprove(address(pool),quoteAmount);
        uint256 reported=pool.addLiquidity(assetAmount,quoteAmount,minShares,address(locker));
        asset.safeApprove(address(pool),0);quote.safeApprove(address(pool),0);
        uint256 afterLP=pool.balanceOf(address(locker));
        if(asset.balanceOf(address(this))!=beforeA-assetAmount||quote.balanceOf(address(this))!=beforeQ-quoteAmount||
           afterLP<beforeLP||afterLP-beforeLP!=reported||reported<minShares||
           asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0) revert BalanceMismatch();
        sharesLocked=reported;
        emit LiquidityLocked(assetAmount,quoteAmount,reported,address(locker));
    }
}

```

## base/v3-testnet/src/V3LegacyProofClaimFixture.sol
Git blob: 5dd3310cb79663c1a3da30ca5e95a57e0ac7ba8e

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {IV3BurnableAsset} from "./V3BoundedLegacyFixture.sol";
import {IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";
import {V3LegacyProofVerifierFixture as Verifier} from "./V3LegacyProofVerifierFixture.sol";

/// @notice Synthetic campaign for the test-only successor issuance.
/// Root approval is a custody commitment, not proof of source eligibility.
/// No production use, migration or real funds.
contract V3LegacyProofClaimFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidAction();
    error NotReady();
    error NotEligible();
    error AlreadyClaimed();
    uint256 public constant RESERVE=8888888880000;
    uint256 public constant DELAY=2 days;
    uint256 public constant CLAIM_WINDOW=30 days;
    uint256 public constant APPEAL_WINDOW=14 days;
    IV3BurnableAsset public immutable token;
    IV3CustodyEpochFixture public immutable custody;
    Verifier public immutable verifier;
    bytes32 public immutable custodyHash;
    bytes32 public immutable verifierHash;
    uint256 public highestObservedEpoch;
    struct Pending {bytes32 digest;uint256 epoch;uint256 readyAt;uint256 expiresAt;}
    Pending public pending;
    Verifier.Commitment private active;
    bool public activated;
    bool public closed;
    uint256 public burned;
    uint256 public deadline;
    uint256 public appealEnd;
    uint256 public paid;
    mapping(uint256=>bool) public claimedIndex;
    mapping(bytes32=>bool) public claimedSource;
    event Scheduled(bytes32 indexed digest,uint256 epoch,uint256 readyAt,uint256 expiresAt);
    event Cancelled(bytes32 indexed digest);
    event Activated(bytes32 indexed root,uint256 allocated,uint256 deadline);
    event Closed(bytes32 indexed reviewEvidence,uint256 burned);
    event Claimed(uint256 indexed index,bytes32 indexed source,address indexed recipient,uint256 award);
    constructor(IV3BurnableAsset asset,IV3CustodyEpochFixture control){
        if(block.chainid!=84532||address(asset).code.length==0||address(control).code.length==0||
            control.threshold()!=3||control.memberCount()!=5||control.epoch()==0)revert InvalidConfig();
        token=asset;custody=control;custodyHash=address(control).codehash;
        highestObservedEpoch=control.epoch();
        Verifier v=new Verifier();verifier=v;verifierHash=address(v).codehash;
    }
    function _observe() private returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyHash||address(verifier).codehash!=verifierHash||
            custody.threshold()!=3||custody.memberCount()!=5)revert InvalidConfig();
        e=custody.epoch();if(e==0||e<highestObservedEpoch)revert InvalidConfig();
        highestObservedEpoch=e;
    }
    function commitment() external view returns(Verifier.Commitment memory){return active;}
    function allocated() external view returns(uint256){return active.allocated;}
    function matchesInitialBinding(address expectedToken,address expectedCustody) external view returns(bool){
        return address(token)==expectedToken&&address(custody)==expectedCustody&&
            custodyHash==expectedCustody.codehash&&address(verifier).codehash==verifierHash&&!activated&&!closed&&paid==0;
    }
    function activationDigest(Verifier.Commitment calldata c) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_BASE_LEGACY_PROOF_ACTIVATION_TEST_V1",block.chainid,address(this),address(token),c));
    }
    function schedule(bytes32 digest,uint256 expiresAt) external {
        if(msg.sender!=address(custody))revert Unauthorized();
        uint256 e=_observe();
        if(closed||(activated&&block.timestamp<appealEnd)||digest==0||expiresAt<=block.timestamp+DELAY||expiresAt-block.timestamp>30 days||
            (pending.digest!=0&&pending.epoch==e&&block.timestamp<pending.expiresAt))revert InvalidAction();
        pending=Pending(digest,e,block.timestamp+DELAY,expiresAt);
        emit Scheduled(digest,e,pending.readyAt,expiresAt);
    }
    function cancel() external {
        if(msg.sender!=address(custody))revert Unauthorized();
        _observe();bytes32 digest=pending.digest;
        if(digest==0)revert InvalidAction();
        delete pending;emit Cancelled(digest);
    }
    function activate(Verifier.Commitment calldata c) external {
        uint256 e=_observe();
        if(activated||c.targetToken!=address(token)||c.targetVault!=address(this)||c.contextHash==0||c.manifestDigest==0||
            c.root==0||c.count==0||c.count>100000||c.cap==0||c.cap>RESERVE||c.allocated==0||c.allocated>c.cap)revert InvalidAction();
        Pending memory p=pending;
        if(p.digest!=activationDigest(c)||p.epoch!=e||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt||
            token.balanceOf(address(this))<RESERVE)revert NotReady();
        delete pending;active=c;activated=true;
        deadline=block.timestamp+CLAIM_WINDOW;appealEnd=deadline+APPEAL_WINDOW;
        emit Activated(c.root,c.allocated,deadline);
    }
    function claim(uint256 index,Verifier.Row calldata row,Verifier.Node[] calldata siblings) external nonReentrant {
        _observe();
        if(!activated||closed||block.timestamp>=deadline)revert NotReady();
        if(row.recipient!=msg.sender)revert NotEligible();
        if(claimedIndex[index]||claimedSource[row.sourceAccount])revert AlreadyClaimed();
        if(row.award==0||row.award>active.allocated-paid||!verifier.verify(active,index,row,siblings))revert NotEligible();
        claimedIndex[index]=true;claimedSource[row.sourceAccount]=true;paid+=row.award;
        IERC20(address(token)).safeTransfer(msg.sender,row.award);
        emit Claimed(index,row.sourceAccount,msg.sender,row.award);
    }
    // Synthetic parity with the previous deferred legacy policy. A review
    // digest alone does not establish that real appeals were adjudicated.
    function closureDigest(bytes32 reviewEvidence) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_BASE_LEGACY_PROOF_CLOSURE_TEST_V1",block.chainid,address(this),address(token),
            active.root,active.manifestDigest,deadline,appealEnd,paid,reviewEvidence));
    }
    function finalize(bytes32 reviewEvidence) external nonReentrant {
        if(!activated||closed||block.timestamp<appealEnd||reviewEvidence==0)revert NotReady();
        uint256 e=_observe();
        Pending memory p=pending;
        if(p.digest!=closureDigest(reviewEvidence)||p.epoch!=e||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt)revert NotReady();
        delete pending;closed=true;burned=RESERVE-paid;
        token.burn(burned);
        emit Closed(reviewEvidence,burned);
    }
    // No sweep, root replacement, or appeal adjudication; donations stay locked.
}

```


---

# CLIMB V3 #994 re-review — C: proof verification and older/sibling fixtures
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Five complete files, GitHub-reported blob IDs; not independently rehashed. Older sibling paths are not the selected quorum issuance path; distinguish their findings from the intended successor. Review A and B too. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/src/ClimbV3IntegratedTestToken.sol
Git blob: be7e331ae669c65139b0e1385ca5c6d27bff2872

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting,V3GamingVault,V3InactiveReserve} from "./ClimbV3TestToken.sol";
import {V3RestrictedSpend} from "./V3RestrictedSpend.sol";

/// @notice Integrated offline test candidate; never use real recipients or funds.
/// Liquidity and legacy reserves intentionally have no release path.
contract ClimbV3IntegratedTestToken is ERC20 {
    error WrongChain();
    error InvalidConfig();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    V3FounderVesting public immutable founderVault;
    V3GamingVault public immutable gamingVault;
    V3InactiveReserve public immutable liquidityReserve;
    V3RestrictedSpend public immutable ecosystemReserve;
    V3RestrictedSpend public immutable communityReserve;
    V3RestrictedSpend public immutable treasuryReserve;
    V3InactiveReserve public immutable legacyReserve;
    constructor(address founder,address distributor,uint256 start,address[5] memory signers) ERC20("CLIMB V3 Integrated Test Only","CLIMBV3INTTEST"){
        if(block.chainid!=84532) revert WrongChain();
        if(founder==address(0)||distributor==address(0)||founder==distributor||founder==address(this)||distributor==address(this)) revert InvalidConfig();
        for(uint256 i=0;i<5;i++){
            if(signers[i]==distributor||signers[i]==address(this)) revert InvalidConfig();
        }
        founderVault=new V3FounderVesting(IERC20(address(this)),founder,start);
        gamingVault=new V3GamingVault(IERC20(address(this)),distributor,start);
        liquidityReserve=new V3InactiveReserve("LIQUIDITY");
        ecosystemReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,133333333200000,"ECOSYSTEM");
        communityReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,88888888800000,"COMMUNITY");
        treasuryReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,106666666560000,"TREASURY");
        legacyReserve=new V3InactiveReserve("LEGACY");
        _mint(address(founderVault),17777777760000);
        _mint(address(gamingVault),311111110800000);
        _mint(address(liquidityReserve),222222222000000);
        _mint(address(ecosystemReserve),133333333200000);
        _mint(address(communityReserve),88888888800000);
        _mint(address(treasuryReserve),106666666560000);
        _mint(address(legacyReserve),8888888880000);
        assert(totalSupply()==INITIAL_SUPPLY);
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}

```

## base/v3-testnet/src/V3BoundedLegacyFixture.sol
Git blob: c76b46dd34227e10655184d82adb16911687ee5b

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
interface IV3BurnableAsset is IERC20 { function burn(uint256 amount) external; }

/// @notice Isolated test-only, prefunded, one-time campaign fixture.
/// No source-wallet authentication, live eligibility, or production governance.
contract V3BoundedLegacyFixture {
    using SafeERC20 for IERC20;
    error WrongChain();
    error InvalidConfig();
    error InvalidManifest();
    error InvalidWindow();
    error NotEligible();
    error AlreadyClaimed();
    error NotFunded();
    uint256 public constant RESERVE = 8888888880000;
    IV3BurnableAsset public immutable token;
    bytes32 public immutable commitment;
    uint256 public immutable opens;
    uint256 public immutable deadline;
    uint256 public immutable closure;
    bool public activated;
    bool public closed;
    uint256 public budget;
    uint256 public allocated;
    uint256 public paid;
    uint256 public burned;
    mapping(bytes32=>address) public recipient;
    mapping(bytes32=>uint256) public award;
    mapping(bytes32=>bool) public claimed;
    event Activated(bytes32 indexed commitment,uint256 budget,uint256 allocated);
    event Claimed(bytes32 indexed id,address indexed recipient,uint256 amount);
    event Closed(uint256 burned);
    constructor(IV3BurnableAsset asset,bytes32 manifest,uint256 begin,uint256 end,uint256 closeAt){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset).code.length==0||manifest==0) revert InvalidConfig();
        if(begin<=block.timestamp||begin-block.timestamp>365 days||end<=begin||end-begin>90 days||closeAt<=end||closeAt-end>90 days) revert InvalidWindow();
        token=asset;commitment=manifest;opens=begin;deadline=end;closure=closeAt;
    }
    function activate(bytes32[] calldata ids,address[] calldata recipients,uint256[] calldata amounts,uint256 cap,bytes32 campaign) external {
        if(activated||closed||block.timestamp>=opens) revert InvalidWindow();
        if(campaign==0||cap==0||cap>RESERVE||ids.length==0||ids.length>32||ids.length!=recipients.length||ids.length!=amounts.length) revert InvalidManifest();
        if(keccak256(abi.encode("CLIMB_V3_SYNTHETIC_LEGACY_V1",block.chainid,address(token),opens,deadline,closure,campaign,cap,ids,recipients,amounts))!=commitment) revert InvalidManifest();
        if(token.balanceOf(address(this))<RESERVE) revert NotFunded();
        uint256 total;
        for(uint256 i=0;i<ids.length;i++){
            if(ids[i]==0||recipient[ids[i]]!=address(0)||recipients[i]==address(0)||recipients[i]==address(this)||amounts[i]==0||amounts[i]>cap-total) revert InvalidManifest();
            recipient[ids[i]]=recipients[i];award[ids[i]]=amounts[i];total+=amounts[i];
        }
        activated=true;budget=cap;allocated=total;
        emit Activated(commitment,cap,total);
    }
    function claim(bytes32 id) external {
        if(!activated||closed||block.timestamp<opens||block.timestamp>=deadline) revert InvalidWindow();
        if(recipient[id]!=msg.sender) revert NotEligible();
        if(claimed[id]) revert AlreadyClaimed();
        claimed[id]=true;uint256 amount=award[id];paid+=amount;
        IERC20(address(token)).safeTransfer(msg.sender,amount);
        emit Claimed(id,msg.sender,amount);
    }
    // This fixture has no appeals resolution path. Delay is a model closure window only.
    // Unsolicited donations do not increase the grant cap or the amount burned.
    function closeAndBurn() external {
        if(!activated||closed||block.timestamp<closure) revert InvalidWindow();
        closed=true;burned=RESERVE-paid;token.burn(burned);
        emit Closed(burned);
    }
}

```

## base/v3-testnet/src/V3DeferredLegacyFixture.sol
Git blob: 50f4b7100973ce54af045161ed1fc1bbee86e336

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IV3BurnableAsset} from "./V3BoundedLegacyFixture.sol";
import {IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";

/// @notice Synthetic Base Sepolia fixture only. No actual source authentication,
/// appeals adjudication, independent custody or cross-deployment replay guarantee.
contract V3DeferredLegacyFixture {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidAction();
    error InvalidManifest();
    error NotReady();
    error NotEligible();
    error AlreadyClaimed();
    uint256 public constant RESERVE=8888888880000;
    uint256 public constant DELAY=2 days;
    uint256 public constant CLAIM_WINDOW=30 days;
    uint256 public constant APPEAL_WINDOW=14 days;
    IV3BurnableAsset public immutable token;
    IV3CustodyEpochFixture public immutable custody;
    bytes32 public immutable custodyCodeHash;
    uint256 public highestObservedEpoch;
    struct Pending { bytes32 digest; uint256 epoch; uint256 readyAt; uint256 expiresAt; }
    Pending public pending;
    bool public activated;
    bool public closed;
    uint256 public opens;
    uint256 public deadline;
    uint256 public appealEnd;
    uint256 public budget;
    uint256 public allocated;
    uint256 public paid;
    uint256 public burned;
    mapping(bytes32=>address) public recipient;
    mapping(bytes32=>uint256) public award;
    mapping(bytes32=>bool) public claimed;
    event Scheduled(bool indexed closure,bytes32 indexed digest,uint256 epoch,uint256 readyAt,uint256 expiresAt);
    event Cancelled(bytes32 indexed digest);
    event Activated(bytes32 indexed digest,uint256 budget,uint256 allocated,uint256 opens,uint256 deadline,uint256 appealEnd);
    event Claimed(bytes32 indexed id,address indexed recipient,uint256 amount);
    event Closed(bytes32 indexed reviewEvidence,uint256 burned);

    constructor(IV3BurnableAsset asset,IV3CustodyEpochFixture control){
        if(block.chainid!=84532||address(asset).code.length==0||address(control).code.length==0||
            control.threshold()!=3||control.memberCount()!=5||control.epoch()==0) revert InvalidConfig();
        token=asset;custody=control;custodyCodeHash=address(control).codehash;
        highestObservedEpoch=control.epoch();
    }
    function _observe() private returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyCodeHash||
            custody.threshold()!=3||custody.memberCount()!=5) revert InvalidConfig();
        e=custody.epoch();
        if(e==0||e<highestObservedEpoch) revert InvalidConfig();
        highestObservedEpoch=e;
    }
    function syncEpoch() external {_observe();}
    function schedule(bytes32 digest,uint256 expiresAt) external {
        if(msg.sender!=address(custody)) revert Unauthorized();
        uint256 e=_observe();
        if(closed||digest==0||(activated&&block.timestamp<appealEnd)||
            expiresAt<=block.timestamp+DELAY||expiresAt-block.timestamp>30 days) revert InvalidAction();
        Pending memory old=pending;
        if(old.digest!=0&&old.epoch==e&&block.timestamp<old.expiresAt) revert InvalidAction();
        pending=Pending(digest,e,block.timestamp+DELAY,expiresAt);
        emit Scheduled(activated,digest,e,block.timestamp+DELAY,expiresAt);
    }
    function cancel() external {
        if(msg.sender!=address(custody)) revert Unauthorized();
        _observe();
        bytes32 digest=pending.digest;
        if(digest==0) revert InvalidAction();
        delete pending;emit Cancelled(digest);
    }
    function _consume(bytes32 digest) private {
        uint256 e=_observe();
        Pending memory p=pending;
        if(digest==0||p.digest!=digest||p.epoch!=e||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt) revert NotReady();
        delete pending;
    }
    function manifestDigest(bytes32 campaign,uint256 cap,bytes32[] calldata ids,address[] calldata recipients,uint256[] calldata amounts) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_V3_DEFERRED_LEGACY_TEST_V1",block.chainid,address(this),address(token),campaign,cap,ids,recipients,amounts));
    }
    function activate(bytes32 campaign,uint256 cap,bytes32[] calldata ids,address[] calldata recipients,uint256[] calldata amounts) external {
        if(activated||closed) revert InvalidAction();
        if(campaign==0||cap==0||cap>RESERVE||ids.length==0||ids.length>32||ids.length!=recipients.length||ids.length!=amounts.length) revert InvalidManifest();
        bytes32 digest=manifestDigest(campaign,cap,ids,recipients,amounts);
        _consume(digest);
        if(token.balanceOf(address(this))<RESERVE) revert NotReady();
        uint256 total;
        for(uint256 i=0;i<ids.length;i++){
            if(ids[i]==0||recipient[ids[i]]!=address(0)||recipients[i]==address(0)||recipients[i]==address(this)||amounts[i]==0||amounts[i]>cap-total) revert InvalidManifest();
            recipient[ids[i]]=recipients[i];award[ids[i]]=amounts[i];total+=amounts[i];
        }
        activated=true;budget=cap;allocated=total;
        opens=block.timestamp;deadline=opens+CLAIM_WINDOW;appealEnd=deadline+APPEAL_WINDOW;
        emit Activated(digest,cap,total,opens,deadline,appealEnd);
    }
    function claim(bytes32 id) external {
        if(block.chainid!=84532||!activated||closed||block.timestamp>=deadline) revert NotReady();
        if(recipient[id]!=msg.sender) revert NotEligible();
        if(claimed[id]) revert AlreadyClaimed();
        claimed[id]=true;uint256 amount=award[id];paid+=amount;
        IERC20(address(token)).safeTransfer(msg.sender,amount);
        emit Claimed(id,msg.sender,amount);
    }
    // Evidence is a synthetic commitment, NOT proof of adjudicated appeals.
    function closureDigest(bytes32 reviewEvidence) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_V3_DEFERRED_LEGACY_CLOSE_TEST_V1",block.chainid,address(this),address(token),deadline,appealEnd,paid,reviewEvidence));
    }
    function finalize(bytes32 reviewEvidence) external {
        if(!activated||closed||block.timestamp<appealEnd||reviewEvidence==0) revert NotReady();
        _consume(closureDigest(reviewEvidence));
        closed=true;burned=RESERVE-paid;token.burn(burned);
        emit Closed(reviewEvidence,burned);
    }
}

```

## base/v3-testnet/src/V3GameRewardFixture.sol
Git blob: d22448bbae70f9a2a370515d3953e32983142146

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

/// @notice Test-only direct reward settlement. A trusted server must establish
/// event uniqueness, eligibility and player identity before signing; the chain
/// cannot prove gameplay. Fixed signing key, no production recovery mechanism.
contract V3GameRewardFixture is EIP712,ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error InvalidReward();
    error OutsideWindow();
    error InvalidSigner();
    error AlreadyPaid();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=311111110800000;
    bytes32 public constant REWARD_TYPEHASH=keccak256("Reward(bytes32 eventId,address recipient,uint256 amount,uint256 month,uint256 deadline)");
    IERC20 public immutable token;
    address public immutable distributor;
    address public immutable excludedFounder;
    uint256 public immutable start;
    uint256 public immutable walletMonthlyCap;
    uint256 public released;
    mapping(bytes32=>bool) public paid;
    mapping(uint256=>uint256) public monthlyReleased;
    mapping(uint256=>mapping(address=>uint256)) public walletReleased;
    event RewardPaid(bytes32 indexed eventId,address indexed recipient,uint256 amount,uint256 month);
    struct Reward {bytes32 eventId;address recipient;uint256 amount;uint256 month;uint256 deadline;}
    constructor(IERC20 asset,address signer,address founder,uint256 begin,uint256 walletCap) EIP712("CLIMB V3 Synthetic Game Rewards","1"){
        if(block.chainid!=84532||address(asset).code.length==0||signer==address(0)||founder==address(0)||signer==founder||
           signer.code.length!=0||begin<=block.timestamp||begin-block.timestamp>365 days||walletCap==0||walletCap>ALLOCATION) revert InvalidConfig();
        token=asset;distributor=signer;excludedFounder=founder;start=begin;walletMonthlyCap=walletCap;
    }
    function monthlyCap(uint256 m) public pure returns(uint256){
        if(m>=60)return 0;
        uint256 annual=ALLOCATION*(30-5*(m/12))/100;
        uint256 i=m%12;return annual*(i+1)/12-annual*i/12;
    }
    function digest(Reward calldata reward) public view returns(bytes32){
        return _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH,reward.eventId,reward.recipient,reward.amount,reward.month,reward.deadline)));
    }
    function claim(Reward calldata reward,bytes calldata signature) external nonReentrant {
        if(block.chainid!=84532||block.timestamp<start)revert OutsideWindow();
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60||reward.month!=m||block.timestamp>=reward.deadline||reward.deadline>start+(m+1)*MONTH)revert OutsideWindow();
        if(reward.eventId==0||reward.amount==0||reward.recipient==address(0)||reward.recipient==address(this)||
           reward.recipient==address(token)||reward.recipient==distributor||reward.recipient==excludedFounder)revert InvalidReward();
        if(paid[reward.eventId])revert AlreadyPaid();
        if(ECDSA.recover(digest(reward),signature)!=distributor)revert InvalidSigner();
        if(reward.amount>monthlyCap(m)-monthlyReleased[m]||reward.amount>walletMonthlyCap-walletReleased[m][reward.recipient]||
           reward.amount>ALLOCATION-released)revert CapExceeded();
        paid[reward.eventId]=true;monthlyReleased[m]+=reward.amount;walletReleased[m][reward.recipient]+=reward.amount;released+=reward.amount;
        token.safeTransfer(reward.recipient,reward.amount);
        emit RewardPaid(reward.eventId,reward.recipient,reward.amount,m);
    }
}

```

## base/v3-testnet/src/V3LegacyProofVerifierFixture.sol
Git blob: b3344dc970c408a224d62267fc5e745b1db7cd9b

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

/// @notice Isolated Base Sepolia binary Merkle-sum verifier. No custody,
/// claim execution, root registration, or authentication of source eligibility.
/// Binary V2 deliberately differs from the offline JSON V1 commitment.
contract V3LegacyProofVerifierFixture {
    uint256 public constant RESERVE=8888888880000;
    bytes32 public constant DOMAIN=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
    struct Commitment {
        bytes32 contextHash;
        bytes32 manifestDigest;
        address targetToken;
        address targetVault;
        uint256 count;
        uint256 cap;
        uint256 allocated;
        bytes32 root;
    }
    struct Row {
        bytes32 sourceAccount;
        bytes32 sourceOwner;
        address recipient;
        uint256 sourceAmount;
        uint256 award;
        bytes32 evidenceHash;
    }
    struct Node {bytes32 hash;uint256 sum;}
    function _leaf(bytes32 context,uint256 index,Row calldata row) private pure returns(Node memory){
        return Node(sha256(abi.encodePacked(DOMAIN,bytes1(0x01),context,index,row.sourceAccount,row.sourceOwner,
            row.recipient,row.sourceAmount,row.award,row.evidenceHash)),row.award);
    }
    function _root(Commitment calldata c,Node memory n) private pure returns(bytes32){
        return sha256(abi.encodePacked(DOMAIN,bytes1(0x04),c.contextHash,c.manifestDigest,
            uint256(84532),c.targetToken,c.targetVault,c.count,c.cap,n.hash,n.sum));
    }
    function verify(Commitment calldata c,uint256 index,Row calldata row,Node[] calldata siblings) external view returns(bool){
        if(block.chainid!=84532||c.contextHash==0||c.manifestDigest==0||c.root==0||
            c.targetToken==address(0)||c.targetVault==address(0)||c.targetToken==c.targetVault||
            c.count==0||c.count>100000||index>=c.count||c.cap==0||c.cap>RESERVE||
            c.allocated==0||c.allocated>c.cap||row.sourceAccount==0||row.sourceOwner==0||
            row.recipient==address(0)||row.recipient==c.targetToken||row.recipient==c.targetVault||
            row.sourceAmount==0||row.sourceAmount>type(uint64).max||row.award==0||row.award>c.allocated||row.evidenceHash==0)return false;
        uint256 depth;uint256 width=1;
        while(width<c.count){width*=2;depth++;}
        if(siblings.length!=depth)return false;
        Node memory n=_leaf(c.contextHash,index,row);
        for(uint256 i=0;i<depth;i++){
            Node calldata s=siblings[i];
            if(s.hash==0||s.sum>c.allocated-n.sum)return false;
            bytes32 h=index%2==0?
                sha256(abi.encodePacked(DOMAIN,bytes1(0x03),n.hash,n.sum,s.hash,s.sum)):
                sha256(abi.encodePacked(DOMAIN,bytes1(0x03),s.hash,s.sum,n.hash,n.sum));
            n=Node(h,n.sum+s.sum);index/=2;
        }
        return n.sum==c.allocated&&c.root==_root(c,n);
    }
}

```


---

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



---

# CLIMB V3 #994 re-review — E: actual Safe regression source
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Four complete Safe test files; GitHub-reported blob IDs, not independently rehashed. CI run 46015224825 job 140560524220 passed 59 tests (6+15+11+27), including expense recipient role drift. Tests are local and not independent review. Test execution claims by reviewers must distinguish observed CI evidence from newly executed tests. TESTNET_NO_GO / MAINNET_NO_GO.

## base/safe-custody/test/SafeQuorumIssuance.t.sol
Git blob: 75cf676108285441de67df85779629b3490b7c16

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofClaimFixture} from "v3-src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "v3-src/V3LegacyProofVerifierFixture.sol";
import {Safe} from "safe-contracts/Safe.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
import {IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeQuorumReserveFactoryFixture,SafeQuorumReserveGuardFixture,V3QuorumSuccessorFixture,SafeQuorumGuardDeployerFixture} from "../src/SafeQuorumIssuanceFixture.sol";
import {V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken,V3SuccessorConditionalDeployer} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3SharedExpenseRegistry} from "v3-src/V3SharedExpenseFixture.sol";
import {V3GovernedGameRewardFixture} from "v3-src/V3GovernedGameRewardFixture.sol";
import {ReserveQuote,ReservePool,ReservePoolBuilder,ReserveLPDestination} from "./SafeReserveGuard.t.sol";
interface VmQuorumIssue {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}
/// @notice Malicious synthetic builder attempts a second validly signed Safe transaction
/// during issuance. It catches the rejection and returns a test-only pool.
contract NestedSafePoolBuilder is IV3SyntheticPoolBuilder {
    Safe public immutable wallet;
    address public immutable guard;
    bytes private payload;
    bytes private signatures;
    bool public attempted;
    bool public rejected;
    bytes4 public rejection;
    constructor(Safe account,address target){wallet=account;guard=target;}
    function arm(bytes calldata data,bytes calldata sigs) external {payload=data;signatures=sigs;}
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){
        attempted=true;
        try wallet.execTransaction(guard,0,payload,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),signatures) returns(bool){
            revert("nested Safe transaction unexpectedly accepted");
        } catch(bytes memory reason){
            rejected=true;
            if(reason.length>=4)rejection=bytes4(reason);
        }
        return IV3SyntheticPool(address(new ReservePool(a,q)));
    }
}
contract SafeQuorumIssuanceTest {
    VmQuorumIssue constant vm=VmQuorumIssue(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256[3] private keys;
    address[] private owners;
    address constant FOUNDER=address(0x201);
    address constant DISTRIBUTOR=address(0x202);
    address constant PAYEE=address(0x203);
    uint256 constant SUPPLY=888888888000000;
    Safe wallet;
    SafeQuorumReserveFactoryFixture setup;
    V3QuorumSuccessorFixture successor;
    SafeQuorumReserveGuardFixture guard;
    V3SuccessorConfig cfg;
    function setUp() public {
        vm.chainId(84532);
        setup=new SafeQuorumReserveFactoryFixture();
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3QuorumSuccessorFixture(address(setup),helper,address(helper).codehash);
        keys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++){
            if(vm.addr(keys[j])<vm.addr(keys[i]))(keys[i],keys[j])=(keys[j],keys[i]);
        }
        for(uint256 i=0;i<3;i++)owners.push(vm.addr(keys[i]));
        owners.push(address(0x104));owners.push(address(0x105));
        (wallet,guard)=setup.create(owners,successor);
        cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),block.timestamp+1 days,1000,
            V3SuccessorLiquidityConfig(new ReserveQuote(),new ReservePoolBuilder(),address(new ReserveLPDestination()),1000));
    }
    function _sign(bytes memory data,uint256 n) private returns(bytes memory sigs){
        return _signAt(data,n,wallet.nonce());
    }
    function _signAt(bytes memory data,uint256 n,uint256 nonce) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(address(guard),0,data,Enum.Operation.Call,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<n;i++){
            (uint8 v,bytes32 r,bytes32 s)=vm.sign(keys[i],h);sigs=abi.encodePacked(sigs,r,s,v);
        }
    }
    function _exec(bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(address(guard),0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _data() private view returns(bytes memory){return abi.encodeCall(guard.issueSuccessor,(1,block.timestamp,block.timestamp+1 hours,cfg));}
    function _issue() private {bytes memory data=_data();require(_exec(data,_sign(data,3)));}
    function _empty() private view {
        require(!successor.used()&&!guard.bound()&&!guard.issuing()&&!guard.transactionActive()&&address(successor.token())==address(0)&&wallet.nonce()==0);
        require(address(guard.asset())==address(0)&&guard.founder()==address(0)&&guard.distributor()==address(0));
        for(uint256 i=0;i<7;i++)require(successor.vaults(i)==address(0)&&guard.destinations(i)==address(0));
    }
    function testRestrictedGuardDeployerAndMutationRollback() public {
        SafeQuorumGuardDeployerFixture helper=setup.guardDeployer();
        require(helper.factory()==address(setup)&&address(helper).codehash==setup.guardDeployerHash());
        address implementation=address(setup.singleton());
        vm.expectRevert(SafeQuorumGuardDeployerFixture.Unauthorized.selector);
        helper.deploy(wallet,implementation,successor);
        V3QuorumSuccessorFixture fresh=new V3QuorumSuccessorFixture(address(setup),successor.conditional(),successor.conditionalHash());
        bytes memory original=address(helper).code;
        vm.etch(address(helper),hex"60006000f3");
        vm.expectRevert();setup.create(owners,fresh);
        require(fresh.configuredGuard()==address(0)&&!fresh.used());
        vm.etch(address(helper),original);
        (Safe nextWallet,SafeQuorumReserveGuardFixture nextGuard)=setup.create(owners,fresh);
        require(address(nextWallet)!=address(wallet)&&fresh.configuredGuard()==address(nextGuard));
        nextGuard.validateConfig();
        _empty();_issue();
    }
    function testChangedConditionalHelperRejectsQuorumIssuance() public {
        address helper=address(successor.conditional());
        bytes memory original=helper.code;
        require(helper.codehash==successor.conditionalHash());
        vm.etch(helper,hex"60006000f3");
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        vm.etch(helper,original);_issue();
        require(successor.token().totalSupply()==SUPPLY);
    }
    function testNoCreatorOrUnregisteredCallerIssuance() public {
        require(successor.configuredGuard()==address(guard));
        vm.expectRevert();successor.create(cfg);
        vm.expectRevert();successor.configureGuard(address(guard));
        vm.expectRevert();guard.bindBeforeIssuance();
        vm.expectRevert();guard.issueSuccessor(1,block.timestamp,block.timestamp+1 hours,cfg);
        _empty();
    }
    function testSetupFactoryCannotBeFrontRunOrReused() public {
        V3QuorumSuccessorFixture fresh=new V3QuorumSuccessorFixture(address(setup),successor.conditional(),successor.conditionalHash());
        vm.prank(PAYEE);vm.expectRevert();setup.create(owners,fresh);
        require(fresh.configuredGuard()==address(0));
        vm.expectRevert();setup.create(owners,successor);
        _empty();
    }
    function testQuorumAtomicBindingExactAllocationAndNoFloat() public {
        _empty();_issue();
        V3SuccessorTestToken t=successor.token();
        require(guard.bound()&&!guard.issuing()&&t.issued()&&t.totalSupply()==SUPPLY&&wallet.nonce()==1&&guard.lpCustody()==cfg.liquidity.custody);
        uint256[7] memory amounts=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++)require(guard.destinations(i)==successor.vaults(i)&&t.balanceOf(guard.destinations(i))==amounts[i]);
        require(t.balanceOf(address(this))==0&&t.balanceOf(address(guard))==0&&t.balanceOf(address(wallet))==0);
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);
        require(t.totalSupply()==SUPPLY);
    }
    function testTwoSignaturesAndMutatedConfigurationCannotIssue() public {
        bytes memory data=_data();bytes memory sigs=_sign(data,2);
        vm.expectRevert();_exec(data,sigs);_empty();
        sigs=_sign(data,3);cfg.gamingWalletMonthlyCap=1001;
        bytes memory altered=_data();vm.expectRevert();_exec(altered,sigs);_empty();
        cfg.gamingWalletMonthlyCap=1000;require(_exec(data,sigs));
        require(guard.bound());
    }
    function testGamingCapEnforcedOnChainBeforeIssuance() public {
        uint256 cap=guard.MAX_TEST_GAMING_WALLET_MONTHLY_CAP();
        require(cap==5_185_185_180_000);
        cfg.gamingWalletMonthlyCap=cap+1;
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.gamingWalletMonthlyCap=0;
        data=_data();sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.gamingWalletMonthlyCap=cap;_issue();
        require(V3GovernedGameRewardFixture(successor.vaults(1)).walletMonthlyCap()==cap&&successor.token().totalSupply()==SUPPLY);
    }
    function testPolicyFailureRollsBackEntireIssueAndSafeNonce() public {
        cfg.liquidity.trancheCap=0;
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.liquidity.trancheCap=1000;_issue();require(guard.bound());
    }
    function testForbiddenRoleConfigurationRollsBack() public {
        cfg.founder=owners[0];
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.founder=FOUNDER;cfg.liquidity.custody=address(wallet);
        data=_data();sigs=_sign(data,3);vm.expectRevert();_exec(data,sigs);_empty();
    }
    function testLateBindingFailureRollsBackAllGuardAndVaultState() public {
        address previous=cfg.liquidity.custody;
        cfg.liquidity.custody=address(successor);
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.liquidity.custody=previous;_issue();require(guard.bound()&&!guard.transactionActive());
    }
    function testNestedValidlySignedSafeTransactionRejectedDuringIssuance() public {
        NestedSafePoolBuilder builder=new NestedSafePoolBuilder(wallet,address(guard));
        cfg.liquidity.builder=builder;
        bytes memory nested=abi.encodeCall(guard.cancelRotation,(1,0));
        builder.arm(nested,_signAt(nested,3,wallet.nonce()+1));
        _issue();
        require(builder.attempted()&&builder.rejected()&&builder.rejection()==bytes4(keccak256("TransactionInProgress()")));
        require(wallet.nonce()==1&&guard.bound()&&!guard.transactionActive()&&successor.token().totalSupply()==SUPPLY);
    }
    function testIssuanceRejectsPrematureAndOverlongSignedWindows() public {
        uint256 t=block.timestamp;
        bytes memory early=abi.encodeCall(guard.issueSuccessor,(1,t+1 hours,t+2 hours,cfg));
        bytes memory sigs=_sign(early,3);
        vm.expectRevert();_exec(early,sigs);_empty();
        bytes memory wide=abi.encodeCall(guard.issueSuccessor,(1,t,t+2 days,cfg));
        sigs=_sign(wide,3);
        vm.expectRevert();_exec(wide,sigs);_empty();
        _issue();require(guard.bound());
    }
    function testExpiredIssuanceCannotExecute() public {
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.warp(block.timestamp+1 hours);
        // Safe wraps target execution failure as GS013 (zero safeTxGas/gasPrice).
        vm.expectRevert();_exec(data,sigs);_empty();
        _issue();require(guard.bound());
    }
    function testQuorumCanInvalidateSignedIssuanceWithoutMinting() public {
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        bytes memory invalidation=abi.encodeCall(guard.invalidateIssuance,(1));
        vm.expectRevert();guard.invalidateIssuance(1);
        require(_exec(invalidation,_sign(invalidation,3)));
        require(wallet.nonce()==1&&!successor.used()&&!guard.bound()&&!guard.transactionActive()&&address(successor.token())==address(0));
        vm.expectRevert();_exec(data,sigs);
        require(wallet.nonce()==1&&!successor.used()&&!guard.bound());
        _issue();require(wallet.nonce()==2&&guard.bound());
        bytes memory postBindSigs=_sign(invalidation,3);
        vm.expectRevert();_exec(invalidation,postBindSigs);
        require(wallet.nonce()==2);
    }
    function testBoundQuorumCanInvalidateUnexecutedExpenseAuthorization() public {
        _issue();
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours));
        bytes memory stale=_sign(data,3);
        bytes memory invalidation=abi.encodeCall(guard.invalidateAuthorization,(1,1));
        vm.expectRevert();guard.invalidateAuthorization(1,1);
        bytes memory wrong=abi.encodeCall(guard.invalidateAuthorization,(1,2));
        bytes memory wrongSigs=_sign(wrong,3);
        vm.expectRevert();_exec(wrong,wrongSigs);
        require(wallet.nonce()==1);
        require(_exec(invalidation,_sign(invalidation,3)));
        require(wallet.nonce()==2&&guard.bound()&&!guard.transactionActive());
        vm.expectRevert();_exec(data,stale);
        require(wallet.nonce()==2&&successor.token().totalSupply()==SUPPLY);
        require(_exec(data,_sign(data,3)));
        require(wallet.nonce()==3);
    }
    function _expenseId(uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(successor.token()),v.purpose(),uint256(1),PAYEE,uint256(10),evidence,uint256(0),nonce));
    }
    function _proposeExpense(uint256 i,bytes32 evidence,bytes32 nonce) private {
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,i,PAYEE,10,evidence,0,nonce,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
    }
    function testAtomicQuorumExpenseRaceAcrossAllThreeReserves() public {
        _issue();
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        require(registry.isSealed());
        for(uint256 i=3;i<=5;i++){
            require(registry.consumer(successor.vaults(i)));
            _proposeExpense(i,"INVOICE",bytes32(i));
        }
        V3EpochSpendFixture winner=V3EpochSpendFixture(successor.vaults(4));
        bytes32 win=_expenseId(4,"INVOICE",bytes32(uint256(4)));
        vm.warp(cfg.start+2 days);
        winner.execute(win);
        require(registry.consumedBy("INVOICE")==address(winner)&&registry.consumedProposal("INVOICE")==win);
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            if(i==4){require(v.totalSpent()==10&&v.spent(0)==10);continue;}
            bytes32 id=_expenseId(i,"INVOICE",bytes32(i));
            uint256 beforeBalance=successor.token().balanceOf(address(v));
            vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);v.execute(id);
            require(v.totalSpent()==0&&v.spent(0)==0&&successor.token().balanceOf(address(v))==beforeBalance);
            (,,,,,,bool executed,)=v.proposals(id);require(!executed);
        }
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
        // A consumed evidence commitment cannot be proposed again with a fresh nonce.
        bytes memory duplicate=abi.encodeCall(guard.proposeExpense,(1,5,PAYEE,10,"INVOICE",0,"FRESH",block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_sign(duplicate,3);uint256 n=wallet.nonce();
        vm.expectRevert();_exec(duplicate,sigs);require(wallet.nonce()==n&&!guard.transactionActive());
    }
    function testCancelledExpenseDoesNotConsumeEvidence() public {
        _issue();_proposeExpense(3,"CANCELLED","OLD");
        bytes32 old=_expenseId(3,"CANCELLED","OLD");
        bytes memory cancellation=abi.encodeCall(guard.cancelExpense,(1,3,old));
        require(_exec(cancellation,_sign(cancellation,3)));
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        require(registry.consumedBy("CANCELLED")==address(0));
        _proposeExpense(5,"CANCELLED","NEW");
        vm.warp(cfg.start+2 days);
        V3EpochSpendFixture previous=V3EpochSpendFixture(successor.vaults(3));
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);previous.execute(old);
        V3EpochSpendFixture replacement=V3EpochSpendFixture(successor.vaults(5));
        replacement.execute(_expenseId(5,"CANCELLED","NEW"));
        require(registry.consumedBy("CANCELLED")==address(replacement)&&previous.totalSpent()==0&&replacement.totalSpent()==10);
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
    }
    function testQuorumRewardRevocationAndActivation() public {
        _issue();
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        require(address(gaming.custody())==address(guard)&&gaming.generation()==1);
        vm.expectRevert();guard.revokeRewardSigner(1,1);
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        bytes memory two=_sign(data,2);
        vm.expectRevert();_exec(data,two);
        require(wallet.nonce()==1&&gaming.generation()==1);
        require(_exec(data,_sign(data,3)));
        require(gaming.distributor()==address(0)&&gaming.generation()==2);
        address candidate=address(0x9876);
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        data=abi.encodeCall(guard.activateRewardSigner,(1,2,1,candidate));
        bytes memory early=_sign(data,3);
        vm.expectRevert();_exec(data,early);
        require(gaming.generation()==2);
        vm.warp(block.timestamp+2 days);
        require(_exec(data,_sign(data,3)));
        require(gaming.distributor()==candidate&&gaming.generation()==3&&successor.token().totalSupply()==SUPPLY);
    }
    function testPendingRewardAndOwnerRolesCannotOverlap() public {
        _issue();
        address candidate=PAYEE;
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        bytes memory ownerChange=abi.encodeCall(guard.scheduleRotation,(1,owners[3],owners[4],candidate,block.timestamp,block.timestamp+1 hours));
        bytes memory rejected=_sign(ownerChange,3);
        uint256 nonce=wallet.nonce();
        vm.expectRevert();_exec(ownerChange,rejected);
        require(wallet.nonce()==nonce&&!guard.transactionActive());
        data=abi.encodeCall(guard.cancelRewardSigner,(1,2,1));
        require(_exec(data,_sign(data,3)));
        require(_exec(ownerChange,_sign(ownerChange,3)));
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        rejected=_sign(data,3);nonce=wallet.nonce();
        vm.expectRevert();_exec(data,rejected);
        require(wallet.nonce()==nonce&&!guard.transactionActive());
    }
    function testExpenseExecutionRechecksPendingActiveAndFormerRewardSigner() public {
        _issue();
        _proposeExpense(3,"ROLE_DRIFT","OLD");
        bytes32 id=_expenseId(3,"ROLE_DRIFT","OLD");
        V3EpochSpendFixture expense=V3EpochSpendFixture(successor.vaults(3));
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(cfg.start+2 days);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);expense.execute(id);
        data=abi.encodeCall(guard.activateRewardSigner,(1,2,1,PAYEE));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);expense.execute(id);
        data=abi.encodeCall(guard.revokeRewardSigner,(1,3));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);expense.execute(id);
        require(expense.totalSpent()==0&&registry.consumedBy("ROLE_DRIFT")==address(0));
        require(successor.token().balanceOf(PAYEE)==0&&successor.token().totalSupply()==SUPPLY);
        (,,,,,,bool executed,)=expense.proposals(id);require(!executed);
    }
    function testRewardSelectorRejectsTrailingOrMissingWords() public {
        _issue();
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        bytes memory correct=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        bytes memory trailing=abi.encodePacked(correct,bytes32(uint256(0)));
        bytes memory sigs=_sign(trailing,3);
        uint256 n=wallet.nonce();
        vm.expectRevert();_exec(trailing,sigs);
        bytes memory shortCall=abi.encodeWithSelector(guard.revokeRewardSigner.selector,uint256(1));
        sigs=_sign(shortCall,3);
        vm.expectRevert();_exec(shortCall,sigs);
        require(wallet.nonce()==n&&gaming.generation()==1&&!guard.transactionActive());
        require(_exec(correct,_sign(correct,3)));
        require(gaming.generation()==2);
    }
    function testInitialRewardBindingPredicate() public {
        _issue();
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        address t=address(successor.token());
        require(gaming.matchesInitialBinding(t,address(guard),cfg.founder));
        require(!gaming.matchesInitialBinding(PAYEE,address(guard),cfg.founder));
        require(!gaming.matchesInitialBinding(t,PAYEE,cfg.founder));
        require(!gaming.matchesInitialBinding(t,address(guard),PAYEE));
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        require(!gaming.matchesInitialBinding(t,address(guard),cfg.founder));
    }
    function _signSyntheticReward(V3GovernedGameRewardFixture gaming,V3GovernedGameRewardFixture.Reward memory reward,uint256 testKey) private returns(bytes memory){
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(testKey,gaming.digest(reward));
        return abi.encodePacked(r,s,v);
    }
    function testRewardAccountingSurvivesActualQuorumRotation() public {
        // Disposable deterministic keys, offline fixture only.
        uint256 first=12345;uint256 replacement=23456;
        cfg.distributor=vm.addr(first);
        address candidate=vm.addr(replacement);
        _issue();vm.warp(cfg.start);
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        V3GovernedGameRewardFixture.Reward memory reward=V3GovernedGameRewardFixture.Reward("PAID",PAYEE,900,0,cfg.start+30 days,1);
        gaming.claim(reward,_signSyntheticReward(gaming,reward,first));
        reward.eventId="NEW";reward.amount=100;
        bytes memory old=_signSyntheticReward(gaming,reward,first);
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);gaming.claim(reward,old);
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(block.timestamp+2 days);
        data=abi.encodeCall(guard.activateRewardSigner,(1,2,1,candidate));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);gaming.claim(reward,old);
        reward.generation=3;reward.eventId="PAID";
        bytes memory sig=_signSyntheticReward(gaming,reward,replacement);
        vm.expectRevert(V3GovernedGameRewardFixture.AlreadyPaid.selector);gaming.claim(reward,sig);
        reward.eventId="NEW";reward.amount=101;
        sig=_signSyntheticReward(gaming,reward,replacement);
        vm.expectRevert(V3GovernedGameRewardFixture.CapExceeded.selector);gaming.claim(reward,sig);
        reward.amount=100;gaming.claim(reward,_signSyntheticReward(gaming,reward,replacement));
        require(gaming.released()==1000&&gaming.monthlyReleased(0)==1000&&gaming.walletReleased(0,PAYEE)==1000);
        require(successor.token().totalSupply()==SUPPLY&&successor.token().balanceOf(PAYEE)==1000);
    }
    function _proofLegacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),PAYEE,100,100,bytes32(uint256(31)));
    }
    function _proofLegacyCommitment(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_proofLegacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function testQuorumLegacyProofClaimAndClosure() public {
        _issue();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        require(legacy.matchesInitialBinding(address(successor.token()),address(guard)));
        LegacyVerifier.Commitment memory c=_proofLegacyCommitment(legacy);
        bytes32 digest=legacy.activationDigest(c);
        bytes memory data=abi.encodeCall(guard.scheduleLegacy,(1,digest,block.timestamp+7 days,block.timestamp,block.timestamp+1 hours));
        vm.expectRevert();guard.scheduleLegacy(1,digest,block.timestamp+7 days,block.timestamp,block.timestamp+1 hours);
        bytes memory two=_sign(data,2);
        vm.expectRevert();_exec(data,two);
        require(wallet.nonce()==1&&guard.legacyScheduleSerial()==0);
        require(_exec(data,_sign(data,3)));
        vm.expectRevert();legacy.activate(c);
        vm.warp(block.timestamp+2 days);legacy.activate(c);
        LegacyVerifier.Row memory row=_proofLegacyRow();
        LegacyVerifier.Node[] memory proof=new LegacyVerifier.Node[](0);
        vm.prank(PAYEE);legacy.claim(0,row,proof);
        require(legacy.paid()==100&&successor.token().balanceOf(PAYEE)==100);
        vm.prank(PAYEE);vm.expectRevert();legacy.claim(0,row,proof);
        vm.warp(legacy.appealEnd());
        digest=legacy.closureDigest("REVIEW");
        data=abi.encodeCall(guard.scheduleLegacy,(1,digest,block.timestamp+7 days,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(block.timestamp+2 days);legacy.finalize("REVIEW");
        require(legacy.closed()&&legacy.paid()+legacy.burned()==legacy.RESERVE());
        require(successor.token().totalSupply()==SUPPLY-legacy.burned());
    }
    function _multiLegacyLeaf(uint256 index,LegacyVerifier.Row memory r) private pure returns(bytes32){
        return sha256(abi.encodePacked(sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2"),bytes1(0x01),
            bytes32(uint256(1)),index,r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
    }
    function _multiLegacyRoot(V3LegacyProofClaimFixture legacy,bytes32 left,bytes32 right) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        bytes32 top=sha256(abi.encodePacked(domain,bytes1(0x03),left,uint256(100),right,uint256(200)));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),2,300,300,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),
            address(legacy.token()),address(legacy),uint256(2),uint256(300),top,uint256(300))));
    }
    function _activateMultiLegacy(V3LegacyProofClaimFixture legacy,LegacyVerifier.Commitment memory c) private {
        bytes memory data=abi.encodeCall(guard.scheduleLegacy,(1,legacy.activationDigest(c),block.timestamp+7 days,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(block.timestamp+2 days);legacy.activate(c);
    }
    function testQuorumMultiLeafLegacyProofConservation() public {
        _issue();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        LegacyVerifier.Row memory a=_proofLegacyRow();
        address other=address(0x204);
        LegacyVerifier.Row memory b=LegacyVerifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),other,200,200,bytes32(uint256(32)));
        bytes32 left=_multiLegacyLeaf(0,a);bytes32 right=_multiLegacyLeaf(1,b);
        _activateMultiLegacy(legacy,_multiLegacyRoot(legacy,left,right));
        LegacyVerifier.Node[] memory p=new LegacyVerifier.Node[](1);
        p[0]=LegacyVerifier.Node(left,100);
        vm.prank(other);legacy.claim(1,b,p);
        p[0]=LegacyVerifier.Node(right,201);
        vm.prank(PAYEE);vm.expectRevert(V3LegacyProofClaimFixture.NotEligible.selector);legacy.claim(0,a,p);
        require(!legacy.claimedIndex(0)&&!legacy.claimedSource(a.sourceAccount)&&legacy.paid()==200);
        p[0]=LegacyVerifier.Node(right,200);
        vm.prank(PAYEE);legacy.claim(0,a,p);
        require(legacy.paid()==300&&legacy.allocated()==300&&successor.token().balanceOf(PAYEE)==100&&successor.token().balanceOf(other)==200);
        require(successor.token().totalSupply()==SUPPLY&&successor.token().balanceOf(address(legacy))==legacy.RESERVE()-300);
    }
    function testQuorumDuplicateSourceInApprovedRootCannotDoublePay() public {
        _issue();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        LegacyVerifier.Row memory a=_proofLegacyRow();
        address other=address(0x204);
        LegacyVerifier.Row memory b=LegacyVerifier.Row(a.sourceAccount,bytes32(uint256(22)),other,200,200,bytes32(uint256(32)));
        bytes32 left=_multiLegacyLeaf(0,a);bytes32 right=_multiLegacyLeaf(1,b);
        _activateMultiLegacy(legacy,_multiLegacyRoot(legacy,left,right));
        LegacyVerifier.Node[] memory p=new LegacyVerifier.Node[](1);
        p[0]=LegacyVerifier.Node(right,200);
        vm.prank(PAYEE);legacy.claim(0,a,p);
        p[0]=LegacyVerifier.Node(left,100);
        vm.prank(other);vm.expectRevert(V3LegacyProofClaimFixture.AlreadyClaimed.selector);legacy.claim(1,b,p);
        require(legacy.paid()==100&&!legacy.claimedIndex(1)&&successor.token().balanceOf(other)==0);
        require(successor.token().totalSupply()==SUPPLY);
    }
    function testBoundPoliciesOperateAfterAtomicIssue() public {
        _issue();
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=keccak256(abi.encode(block.chainid,address(v),address(successor.token()),v.purpose(),uint256(1),PAYEE,uint256(10),bytes32("E"),uint256(0),bytes32("N")));
        vm.warp(cfg.start+2 days);v.execute(id);
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
    }
}

```

## base/safe-custody/test/SafeReserveGuard.t.sol
Git blob: 22114c3ee880ca3a4b4353874b30893123870c00

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
        return abi.encodeCall(SafeReserveGuardFixture.proposeExpense,(e,i,PAYEE,10,evidence,0,nonce,block.timestamp,block.timestamp+1 hours));
    }
    function _id(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),e,PAYEE,uint256(10),evidence,uint256(0),nonce));
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
        _quorum(_propose(1,3,"E","N"));_quorum(_propose(1,4,"E","M"));
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
    function testNoGenericTransferOrRoleConflict() public {
        _bind();
        _reject(address(token),abi.encodeCall(token.transfer,(PAYEE,1)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,0,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,3,address(wallet),10,"E",0,"N",block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,FOUNDER,block.timestamp,block.timestamp+1 hours)),3);
        vm.expectRevert();guard.proposeExpense(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours);
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
        bytes memory future=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",t+1 hours,t+2 hours));
        bytes memory signedFuture=_signed(address(guard),future,3);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        vm.warp(t+1 hours);
        bytes memory tooLong=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",t,t+2 days));
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
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,deadline,"LP",block.timestamp,block.timestamp+1 hours)));
        bytes32 id=keccak256(abi.encode(block.chainid,address(l),address(token),address(quote),address(l.pool()),uint256(1),uint256(1000),uint256(500),uint256(50),deadline,bytes32("LP")));
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

## base/safe-custody/test/SafeEpochGuard.t.sol
Git blob: 04948b9da702ea6e19d1ec1fd007c1b3c119d5c0

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeEpochGuardFixture,GuardedSafeFactoryFixture} from "../src/SafeEpochGuardFixture.sol";
interface VmEpochGuard {
    function chainId(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function etch(address,bytes calldata) external;
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}
contract PermissiveOwnerValidator {
    function isValidSignature(bytes memory,bytes memory) external pure returns(bytes4){return 0x20c13b0b;}
}
contract SafeEpochGuardTest {
    VmEpochGuard constant vm=VmEpochGuard(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256[3] private keys;
    address A;address B;address C;
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    Safe wallet;
    SafeEpochGuardFixture guard;
    GuardedSafeFactoryFixture factory;
    function setUp() public {
        vm.chainId(84532);factory=new GuardedSafeFactoryFixture();
        keys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++)if(vm.addr(keys[j])<vm.addr(keys[i]))(keys[i],keys[j])=(keys[j],keys[i]);
        A=vm.addr(keys[0]);B=vm.addr(keys[1]);C=vm.addr(keys[2]);
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners);
    }
    function _signed(address to,bytes memory data,Enum.Operation op,uint256 count) private returns(bytes memory sigs){
        return _signedAt(to,data,op,count,wallet.nonce());
    }
    function _signedAt(address to,bytes memory data,Enum.Operation op,uint256 count,uint256 nonce) private returns(bytes memory sigs){
        bytes32 hash=wallet.getTransactionHash(to,0,data,op,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<count;i++){
            (uint8 v,bytes32 r,bytes32 s)=vm.sign(keys[i],hash);
            sigs=abi.encodePacked(sigs,r,s,v);
        }
    }
    function _approved(address to,bytes memory data,Enum.Operation op,uint256 count) private returns(bytes memory sigs){
        bytes32 hash=wallet.getTransactionHash(to,0,data,op,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            sigs=abi.encodePacked(sigs,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _exec(address to,bytes memory data,Enum.Operation op,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,op,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(address to,bytes memory data) private {
        require(_exec(to,data,Enum.Operation.Call,_signed(to,data,Enum.Operation.Call,3)));
    }
    function _reject(address to,bytes memory data,Enum.Operation op,uint256 count) private {
        bytes memory sigs=_signed(to,data,op,count);
        vm.expectRevert();_exec(to,data,op,sigs);
    }
    function _schedule(uint256 e,address oldOwner,address newOwner) private {
        _quorum(address(guard),abi.encodeCall(guard.scheduleRotation,(e,D,oldOwner,newOwner,block.timestamp,block.timestamp+1 hours)));
    }
    function _swap(address oldOwner,address newOwner) private view returns(bytes memory){
        return abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,oldOwner,newOwner),guard.rotationSerial());
    }
    function testAtomicInitializationAndConfiguration() public {
        guard.validateConfig();require(guard.epoch()==1&&guard.threshold()==3&&guard.memberCount()==5&&guard.isMember(E)&&wallet.nonce()==0);
        vm.expectRevert();wallet.setup(new address[](0),1,address(0),"",address(0),address(0),0,payable(address(0)));
    }
    function testRealQuorumAndDirectCallerRejection() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        vm.expectRevert();guard.scheduleRotation(1,D,E,F,block.timestamp,block.timestamp+1 hours);
        _reject(address(guard),data,Enum.Operation.Call,2);
        _quorum(address(guard),data);
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
    }
    function testForbiddenConfigurationAndDelegatecallPaths() public {
        _reject(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("enableModule(address)",F),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("setFallbackHandler(address)",F),Enum.Operation.Call,3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)),Enum.Operation.DelegateCall,3);
        _reject(F,hex"12345678",Enum.Operation.Call,3);
        guard.validateConfig();require(guard.epoch()==1);
    }
    function testDelayExactRotationAndMonotonicABA() public {
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);
        _reject(address(wallet),_swap(E,address(0x107)),Enum.Operation.Call,3);
        _quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,F,E,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        _schedule(2,F,E);vm.warp(block.timestamp+2 days);
        _quorum(address(wallet),_swap(F,E));
        require(guard.epoch()==3&&guard.isMember(E)&&!guard.isMember(F));
    }
    function testCancelledAndExpiredRotationsRequireFreshDelay() public {
        _schedule(1,E,F);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        vm.warp(block.timestamp+2 days);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);vm.warp(block.timestamp+9 days);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);_quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2);
    }
    function testCancelledScheduleCannotReuseFutureNonceApproval() public {
        _schedule(1,E,F);
        bytes memory stale=_swap(E,F);
        uint256 first=guard.rotationSerial();
        // Cancel and reschedule each consume one nonce. Sign the old payload at
        // the future nonce so the Safe nonce alone cannot explain its rejection.
        bytes memory sigs=_signedAt(address(wallet),stale,Enum.Operation.Call,3,wallet.nonce()+2);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        _schedule(1,E,F);
        require(guard.rotationSerial()==first+1&&wallet.nonce()==3);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(SafeEpochGuardFixture.NotReady.selector);
        _exec(address(wallet),stale,Enum.Operation.Call,sigs);
        require(wallet.nonce()==3&&guard.epoch()==1&&!guard.transactionActive()&&guard.isMember(E));
        _reject(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),Enum.Operation.Call,3);
        _quorum(address(wallet),_swap(E,F));
        require(wallet.nonce()==4&&guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
    }
    function testStaleCancellationCannotCancelNewSchedule() public {
        _schedule(1,E,F);
        bytes memory stale=abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial()));
        bytes memory sigs=_signedAt(address(guard),stale,Enum.Operation.Call,3,wallet.nonce()+2);
        _quorum(address(guard),stale);
        _schedule(1,E,F);
        vm.expectRevert();_exec(address(guard),stale,Enum.Operation.Call,sigs);
        require(wallet.nonce()==3&&guard.rotationSerial()==2&&!guard.transactionActive());
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        (digest,,,,)=guard.pending();require(digest==0&&wallet.nonce()==4);
    }
    function testInvalidRotationDoesNotChangeEpoch() public {
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,C,E,F,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,A,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        require(guard.epoch()==1&&guard.isMember(E));
    }
    function testReplacementAcquiringCodeDuringDelayRejected() public {
        _schedule(1,E,F);
        vm.etch(F,hex"60006000f3");
        vm.warp(block.timestamp+2 days);
        uint256 nonce=wallet.nonce();
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        require(wallet.nonce()==nonce&&guard.epoch()==1&&guard.isMember(E)&&!guard.isMember(F)&&!guard.transactionActive());
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        (digest,,,,)=guard.pending();require(digest==0);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        vm.etch(F,"");
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);_quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E)&&!guard.transactionActive());
    }
    function testContractSignatureFromCodeBearingOwnerRejected() public {
        vm.etch(C,address(new PermissiveOwnerValidator()).code);
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_signed(address(guard),data,Enum.Operation.Call,2);
        // Safe v1.4.1 validates the permissive contract signature before the guard.
        sigs=abi.encodePacked(sigs,bytes32(uint256(uint160(C))),bytes32(uint256(195)),uint8(0),uint256(0));
        vm.expectRevert(SafeEpochGuardFixture.UnsupportedSignatureMode.selector);
        _exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&!guard.transactionActive()&&guard.epoch()==1);
    }
    function testApprovedHashFromCodeBearingOwnerRejected() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_approved(address(guard),data,Enum.Operation.Call,3);
        vm.etch(C,address(new PermissiveOwnerValidator()).code);
        vm.expectRevert(SafeEpochGuardFixture.UnsupportedSignatureMode.selector);
        _exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&!guard.transactionActive()&&guard.epoch()==1);
    }
    function testApprovedHashesRejectedAfterOwnerCodeCleared() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        vm.etch(C,address(new PermissiveOwnerValidator()).code);
        bytes memory sigs=_approved(address(guard),data,Enum.Operation.Call,3);
        vm.etch(C,"");
        vm.expectRevert(SafeEpochGuardFixture.UnsupportedSignatureMode.selector);
        _exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&!guard.transactionActive()&&guard.epoch()==1);
        _quorum(address(guard),data);
        require(wallet.nonce()==1);
    }
    function testNonSigningCodeBearingOwnerCanBeRotatedOut() public {
        vm.etch(E,address(new PermissiveOwnerValidator()).code);
        _schedule(1,E,F);
        vm.warp(block.timestamp+2 days);
        _quorum(address(wallet),_swap(E,F));
        require(wallet.nonce()==2&&guard.epoch()==2&&!guard.isMember(E)&&guard.isMember(F)&&!guard.transactionActive());
    }
    function testRotationSchedulingRejectsExpiredAuthorization() public {
        uint256 t=block.timestamp;
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,t,t+1 hours));
        bytes memory sigs=_signed(address(guard),data,Enum.Operation.Call,3);
        vm.warp(t+1 hours);
        vm.expectRevert();_exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&guard.rotationSerial()==0&&!guard.transactionActive());
        _schedule(1,E,F);require(wallet.nonce()==1&&guard.rotationSerial()==1);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert();new GuardedSafeFactoryFixture();
    }
}

```

## base/safe-custody/test/SafeCustodyBoundary.t.sol
Git blob: f411b21cc9be90c6ebcbbdb6817ceac38f1bcd9e

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {BaseGuard} from "safe-contracts/base/GuardManager.sol";

interface VmSafeBoundary {
    function prank(address) external;
    function expectRevert() external;
}
contract BoundaryTarget {
    uint256 public calls;
    function touch() external {calls++;}
}
contract BoundaryModule {
    function touch(Safe wallet,BoundaryTarget target) external returns(bool){
        return wallet.execTransactionFromModule(address(target),0,abi.encodeCall(target.touch,()),Enum.Operation.Call);
    }
}
contract BoundaryDenyGuard is BaseGuard {
    function checkTransaction(address,uint256,bytes memory,Enum.Operation,uint256,uint256,uint256,address,address payable,bytes memory,address) external pure override {
        revert("DENIED");
    }
    function checkAfterExecution(bytes32,bool) external pure override {}
}
contract BoundaryAllowGuard is BaseGuard {
    function checkTransaction(address,uint256,bytes memory,Enum.Operation,uint256,uint256,uint256,address,address payable,bytes memory,address) external pure override {}
    function checkAfterExecution(bytes32,bool) external pure override {}
}

/// @notice Actual pinned Safe source behavior, not a production custody adapter.
/// Uses approved-hash signatures from synthetic test owners; no private keys or network.
contract SafeCustodyBoundaryTest {
    VmSafeBoundary constant vm=VmSafeBoundary(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant A=address(0x101);
    address constant B=address(0x102);
    address constant C=address(0x103);
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    address constant SENTINEL=address(1);
    Safe wallet;
    BoundaryTarget target;
    function setUp() public {
        Safe implementation=new Safe();
        wallet=Safe(payable(address(new SafeProxy(address(implementation)))));
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        wallet.setup(owners,3,address(0),"",address(0),address(0),0,payable(address(0)));
        target=new BoundaryTarget();
    }
    function _approved(address to,bytes memory data,uint256 count) private returns(bytes memory signatures){
        bytes32 hash=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            signatures=abi.encodePacked(signatures,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(address to,bytes memory data) private {
        bytes memory sigs=_approved(to,data,3);
        require(_exec(to,data,sigs));
    }
    function testActualSetupAndThreeOwnerQuorum() public {
        require(wallet.getThreshold()==3&&wallet.getOwners().length==5&&wallet.isOwner(A));
        (address[] memory modules,address next)=wallet.getModulesPaginated(SENTINEL,10);
        require(modules.length==0&&next==SENTINEL);
        _quorum(address(target),abi.encodeCall(target.touch,()));
        require(target.calls()==1&&wallet.nonce()==1);
    }
    function testTwoApprovalsCannotExecute() public {
        bytes memory data=abi.encodeCall(target.touch,());
        bytes memory sigs=_approved(address(target),data,2);
        vm.expectRevert();_exec(address(target),data,sigs);
        require(target.calls()==0&&wallet.nonce()==0);
    }
    function testOwnerSetHashReturnsAfterRotationABA() public {
        bytes32 beforeHash=keccak256(abi.encode(wallet.getOwners()));
        _quorum(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F));
        require(!wallet.isOwner(E)&&wallet.isOwner(F)&&keccak256(abi.encode(wallet.getOwners()))!=beforeHash);
        _quorum(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,F,E));
        require(wallet.isOwner(E)&&!wallet.isOwner(F)&&keccak256(abi.encode(wallet.getOwners()))==beforeHash&&wallet.nonce()==2);
    }
    function testOrdinarySafeAllowsThresholdReduction() public {
        _quorum(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1));
        require(wallet.getThreshold()==1);
        bytes memory data=abi.encodeCall(target.touch,());
        require(_exec(address(target),data,_approved(address(target),data,1)));
        require(target.calls()==1);
    }
    function testEnabledModuleBypassesNormalTransactionGuard() public {
        BoundaryModule module=new BoundaryModule();
        _quorum(address(wallet),abi.encodeWithSignature("enableModule(address)",address(module)));
        BoundaryDenyGuard guard=new BoundaryDenyGuard();
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(guard)));
        bytes memory data=abi.encodeCall(target.touch,());
        bytes memory sigs=_approved(address(target),data,3);
        vm.expectRevert();_exec(address(target),data,sigs);
        require(target.calls()==0);
        require(module.touch(wallet,target)&&target.calls()==1);
    }
    function testOrdinaryAllowGuardCanBeRemoved() public {
        BoundaryAllowGuard guard=new BoundaryAllowGuard();
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(guard)));
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)));
        _quorum(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1));
        require(wallet.getThreshold()==1);
    }
}

```


---

# CLIMB V3 #994 re-review — F: token issuance, legacy and liquidity tests
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Six complete test sources, GitHub-reported blob IDs; not independently rehashed. V3 CI 46015224824 SUCCESS. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/test/ClimbV3IntegratedTestToken.t.sol
Git blob: 94426c3969ddba33c477efefccdd47168566f768

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbV3IntegratedTestToken} from "../src/ClimbV3IntegratedTestToken.sol";
import {V3GamingVault} from "../src/ClimbV3TestToken.sol";
import {V3RestrictedSpend} from "../src/V3RestrictedSpend.sol";
interface VmIntegrated {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract ClimbV3IntegratedTestTokenTest {
    VmIntegrated constant vm=VmIntegrated(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(0xF00D);
    address constant DISTRIBUTOR=address(0xB0B);
    address constant PAYEE=address(0xCAFE);
    uint256 constant SUPPLY=888888888000000;
    uint256 start;
    address[5] signers;
    ClimbV3IntegratedTestToken t;
    function setUp() public {
        vm.chainId(84532);
        start=block.timestamp+1 days;
        for(uint256 i=0;i<5;i++)signers[i]=address(uint160(1000+i));
        t=new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
    function testExactFundingAndAssetBinding() public view {
        require(t.totalSupply()==SUPPLY&&t.decimals()==6);
        require(t.balanceOf(address(t.founderVault()))==17777777760000);
        require(t.balanceOf(address(t.gamingVault()))==311111110800000);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
        V3RestrictedSpend[3] memory v=[t.ecosystemReserve(),t.communityReserve(),t.treasuryReserve()];
        uint256[3] memory caps=[uint256(133333333200000),88888888800000,106666666560000];
        for(uint256 i=0;i<3;i++){
            require(address(v[i].token())==address(t)&&v[i].budget()==caps[i]&&t.balanceOf(address(v[i]))==caps[i]);
        }
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==0&&t.balanceOf(DISTRIBUTOR)==0);
    }
    function propose(V3RestrictedSpend v,uint256 amount) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,"MILESTONE",0,"NONCE");
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testReleaseBoundToOneReserve() public {
        V3RestrictedSpend v=t.ecosystemReserve();
        uint256 amount=v.monthlyCap(0);
        bytes32 id=propose(v,amount);
        vm.warp(start+2 days);
        V3RestrictedSpend other=t.treasuryReserve();
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);other.execute(id);
        v.execute(id);
        require(t.balanceOf(PAYEE)==amount&&v.totalSpent()==amount);
        require(t.balanceOf(address(v))==v.budget()-amount);
        require(t.treasuryReserve().totalSpent()==0&&t.communityReserve().totalSpent()==0);
        require(t.totalSupply()==SUPPLY);
    }
    function testConcurrentReleaseAndBurnConservation() public {
        uint256 amount=1000000;
        bytes32 a=propose(t.ecosystemReserve(),amount);
        bytes32 b=propose(t.communityReserve(),amount);
        require(a!=b);
        vm.warp(start+2 days);
        t.ecosystemReserve().execute(a);
        t.communityReserve().execute(b);
        V3GamingVault game=t.gamingVault();
        vm.prank(DISTRIBUTOR);game.release(amount);
        vm.prank(PAYEE);t.burn(amount);
        require(t.totalSupply()==SUPPLY-amount);
        require(t.balanceOf(PAYEE)==amount&&t.balanceOf(DISTRIBUTOR)==amount);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
    }
    function testNoLiquidityOrLegacyRelease() public {
        (bool a,)=address(t.liquidityReserve()).call(abi.encodeWithSignature("release(address,uint256)",PAYEE,1));
        (bool b,)=address(t.legacyReserve()).call(abi.encodeWithSignature("release(address,uint256)",PAYEE,1));
        require(!a&&!b);
    }
    function testRejectSignerDistributorOverlap() public {
        signers[0]=DISTRIBUTOR;
        vm.expectRevert(ClimbV3IntegratedTestToken.InvalidConfig.selector);
        new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbV3IntegratedTestToken.WrongChain.selector);
        new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
}

```

## base/v3-testnet/test/ClimbV3TestToken.t.sol
Git blob: acf600eb037b0ea0a69dfd8e45b53f9f14bbb94c

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbV3TestToken,V3FounderVesting,V3GamingVault} from "../src/ClimbV3TestToken.sol";
interface VmV3 {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract ClimbV3TestTokenTest {
    VmV3 constant vm=VmV3(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(0xA11CE);
    address constant DISTRIBUTOR=address(0xB0B);
    uint256 constant MONTH=30 days;
    uint256 constant SUPPLY=888888888000000;
    uint256 constant F=17777777760000;
    uint256 constant G=311111110800000;
    uint256 start;
    ClimbV3TestToken t;
    V3FounderVesting f;
    V3GamingVault g;
    function setUp() public {
        vm.chainId(84532);
        start=block.timestamp+1 days;
        t=new ClimbV3TestToken(FOUNDER,DISTRIBUTOR,start);
        f=t.founderVault();g=t.gamingVault();
    }
    function testExactAllocationsAndZeroLaunchFloat() public view {
        require(t.decimals()==6&&t.totalSupply()==SUPPLY);
        require(t.balanceOf(address(f))==F&&t.balanceOf(address(g))==G);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.ecosystemReserve()))==133333333200000);
        require(t.balanceOf(address(t.communityReserve()))==88888888800000);
        require(t.balanceOf(address(t.treasuryReserve()))==106666666560000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==0&&t.balanceOf(DISTRIBUTOR)==0);
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbV3TestToken.WrongChain.selector);
        new ClimbV3TestToken(FOUNDER,DISTRIBUTOR,start);
    }
    function testRejectSameBeneficiaryAndDistributor() public {
        vm.expectRevert(ClimbV3TestToken.InvalidConfig.selector);
        new ClimbV3TestToken(FOUNDER,FOUNDER,start);
    }
    function testRejectImmediateStart() public {
        vm.expectRevert(V3FounderVesting.InvalidConfig.selector);
        new ClimbV3TestToken(FOUNDER,DISTRIBUTOR,block.timestamp);
    }
    function testFounderCliffNoCatchup() public {
        vm.warp(start+12*MONTH);
        require(f.vested()==0);
        vm.expectRevert(V3FounderVesting.NothingDue.selector);f.release();
        vm.warp(start+13*MONTH);
        f.release();
        require(t.balanceOf(FOUNDER)==F/36&&f.released()==F/36);
        vm.expectRevert(V3FounderVesting.NothingDue.selector);f.release();
    }
    function testFounderExactFinalRemainder() public {
        for(uint256 i=13;i<=48;i++){
            vm.warp(start+i*MONTH);
            f.release();
            require(f.released()==F*(i-12)/36);
        }
        require(t.balanceOf(FOUNDER)==F&&t.balanceOf(address(f))==0);
        require(t.totalSupply()==SUPPLY);
    }
    function testFounderCannotRedirectOrAccelerate() public {
        (bool a,)=address(f).call(abi.encodeWithSignature("setBeneficiary(address)",address(this)));
        (bool b,)=address(f).call(abi.encodeWithSignature("accelerate()"));
        require(!a&&!b);
        vm.warp(start+13*MONTH);
        f.release();
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==F/36);
    }
    function testGamingCapsSumToAllocation() public view {
        uint256 sum;
        for(uint256 i=0;i<60;i++)sum+=g.monthlyCap(i);
        require(sum==G&&g.monthlyCap(60)==0);
        require(g.monthlyCap(0)>g.monthlyCap(12)&&g.monthlyCap(12)>g.monthlyCap(24));
    }
    function testGamingBeforeStartAndUnauthorized() public {
        vm.prank(DISTRIBUTOR);vm.expectRevert(V3GamingVault.OutsideWindow.selector);g.release(1);
        vm.warp(start);
        vm.expectRevert(V3GamingVault.NotDistributor.selector);g.release(1);
    }
    function testGamingMonthlyCapAndNoCatchup() public {
        vm.warp(start+MONTH);
        uint256 cap=g.monthlyCap(1);
        vm.prank(DISTRIBUTOR);g.release(cap);
        vm.prank(DISTRIBUTOR);vm.expectRevert(V3GamingVault.CapExceeded.selector);g.release(1);
        require(g.monthlyReleased(0)==0&&g.monthlyReleased(1)==cap&&g.released()==cap);
    }
    function testGamingExpiry() public {
        vm.warp(start+60*MONTH);
        vm.prank(DISTRIBUTOR);vm.expectRevert(V3GamingVault.OutsideWindow.selector);g.release(1);
        require(t.balanceOf(address(g))==G);
    }
    function testNoMintForcedBurnOrReserveRelease() public {
        (bool a,)=address(t).call(abi.encodeWithSignature("mint(address,uint256)",address(this),1));
        (bool b,)=address(t).call(abi.encodeWithSignature("burnFrom(address,uint256)",address(t.liquidityReserve()),1));
        (bool c,)=address(t.liquidityReserve()).call(abi.encodeWithSignature("release(address,uint256)",address(this),1));
        require(!a&&!b&&!c&&t.totalSupply()==SUPPLY);
    }
    function testHolderBurnAndUntaxedTransfer() public {
        vm.warp(start+13*MONTH);f.release();
        vm.prank(FOUNDER);t.transfer(DISTRIBUTOR,100);
        require(t.balanceOf(DISTRIBUTOR)==100&&t.totalSupply()==SUPPLY);
        vm.prank(DISTRIBUTOR);t.burn(100);
        require(t.totalSupply()==SUPPLY-100&&t.balanceOf(DISTRIBUTOR)==0);
    }
}

```

## base/v3-testnet/test/V3AtomicSuccessor.t.sol
Git blob: 0b82c6586f0ed23d01601d96132b8513c2ffa950

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting} from "../src/ClimbV3TestToken.sol";
import {V3GovernedGameRewardFixture} from "../src/V3GovernedGameRewardFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "../src/V3LegacyProofVerifierFixture.sol";
import {V3LegacyProofClaimFixture} from "../src/V3LegacyProofClaimFixture.sol";
import {IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
import {V3DeferredLiquidityFixture} from "../src/V3DeferredLiquidityFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConditionalDeployer,V3SuccessorLegacyDeployer,V3SuccessorTestToken,V3SuccessorConfig,V3SuccessorLiquidityConfig,IV3SyntheticPoolBuilder} from "../src/V3AtomicSuccessorFixture.sol";
interface VmSuccessor {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function warp(uint256) external;
    function prank(address) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert(bytes4) external;
}
contract SuccessorQuote is ERC20 {
    constructor() ERC20("Synthetic quote","QTEST"){_mint(msg.sender,1000000);}
}
contract SuccessorCustodyDestination {}
// Intentionally unrestricted mock. NOT actual multisig authorization.
contract SuccessorMockCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public constant override threshold=3;
    uint256 public constant override memberCount=5;
    function isMember(address) external pure override returns(bool){return false;}
    function rewardSignerAllowed(address) external pure returns(bool){return true;}
    function expenseRecipientAllowed(address) external pure returns(bool){return true;}
    function propose(V3EpochSpendFixture v,address recipient,bytes32 evidence,bytes32 nonce,uint256 amount) external returns(bytes32){
        return v.propose(recipient,amount,evidence,0,nonce);
    }
    function scheduleLiquidity(V3DeferredLiquidityFixture v,uint256 deadline) external returns(bytes32){return v.schedule(1000,500,50,deadline,"LP");}
    function scheduleLegacy(V3LegacyProofClaimFixture v,bytes32 digest,uint256 expiry) external {v.schedule(digest,expiry);}
    function rotate() external {epoch++;}
}
contract SuccessorMockPool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    constructor(IERC20 a,IERC20 q) ERC20("Synthetic LP","LPTEST"){asset=address(a);quote=address(q);}
    function addLiquidity(uint256 a,uint256 q,uint256 minimum,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,address(this),a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        require(minimum<=100);_mint(recipient,100);return 100;
    }
}
contract SuccessorMockPoolBuilder is IV3SyntheticPoolBuilder {
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){
        return IV3SyntheticPool(address(new SuccessorMockPool(a,q)));
    }
}
contract V3AtomicSuccessorTest {
    VmSuccessor constant vm=VmSuccessor(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant SUPPLY=888888888000000;
    address constant FOUNDER=address(1001);
    uint256 constant REWARD_KEY=12345;
    address DISTRIBUTOR;
    address constant CLAIMANT=address(1003);
    address constant PAYEE=address(1004);
    SuccessorQuote quote;
    SuccessorMockCustody control;
    V3AtomicSuccessorFixture factory;
    V3SuccessorConfig cfg;
    function setUp() public {
        vm.chainId(84532);
        quote=new SuccessorQuote();control=new SuccessorMockCustody();
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        factory=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        DISTRIBUTOR=vm.addr(REWARD_KEY);
        cfg.gamingWalletMonthlyCap=1000;
        cfg.founder=FOUNDER;cfg.distributor=DISTRIBUTOR;cfg.control=control;cfg.start=block.timestamp+1 days;
        cfg.liquidity=V3SuccessorLiquidityConfig(quote,new SuccessorMockPoolBuilder(),address(new SuccessorCustodyDestination()),1000);
    }
    function testConditionalHelperIdentityPinned() public {
        V3SuccessorConditionalDeployer helper=factory.conditional();
        require(factory.conditionalHash()==address(helper).codehash);
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);
        new V3AtomicSuccessorFixture(helper,bytes32(uint256(1)));
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);
        new V3AtomicSuccessorFixture(V3SuccessorConditionalDeployer(address(0)),bytes32(0));
        bytes memory original=address(helper).code;
        vm.etch(address(helper),hex"60006000f3");
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0));
        vm.etch(address(helper),original);
        require(factory.create(cfg).totalSupply()==SUPPLY);
    }
    function testStagedLegacyHelperIdentityAndRollback() public {
        V3SuccessorConditionalDeployer helper=factory.conditional();
        V3SuccessorLegacyDeployer stage=helper.legacyDeployer();
        require(stage.factory()==address(helper)&&helper.legacyDeployerHash()==address(stage).codehash);
        V3SuccessorTestToken empty=new V3SuccessorTestToken();
        vm.expectRevert(V3SuccessorLegacyDeployer.Unauthorized.selector);
        stage.legacy(empty,control);
        vm.expectRevert(V3SuccessorLegacyDeployer.Unauthorized.selector);
        stage.proofLegacy(empty,control);
        bytes memory original=address(stage).code;
        vm.etch(address(stage),hex"60006000f3");
        vm.expectRevert(V3SuccessorConditionalDeployer.InvalidLegacyDeployer.selector);
        factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0)&&factory.vaults(6)==address(0));
        vm.etch(address(stage),original);
        V3LegacyProofClaimFixture proof=helper.proofLegacy(empty,control);
        require(address(proof.token())==address(empty)&&address(proof.custody())==address(control)&&!proof.activated());
        require(empty.totalSupply()==0&&empty.balanceOf(address(proof))==0);
        V3SuccessorTestToken token=factory.create(cfg);
        require(token.totalSupply()==SUPPLY&&token.balanceOf(factory.vaults(6))==8888888880000);
    }
    function testAtomicSevenDestinationsAndZeroFloat() public {
        V3SuccessorTestToken token=factory.create(cfg);
        require(token.issued()&&token.issuer()==address(factory)&&token.totalSupply()==SUPPLY&&token.decimals()==6);
        uint256[7] memory expected=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++){
            require(token.balanceOf(factory.vaults(i))==expected[i]);
            for(uint256 j=0;j<i;j++)require(factory.vaults(i)!=factory.vaults(j));
        }
        require(token.balanceOf(address(this))==0&&token.balanceOf(address(factory))==0&&token.balanceOf(FOUNDER)==0&&token.balanceOf(DISTRIBUTOR)==0);
        require(address(V3FounderVesting(factory.vaults(0)).token())==address(token));
        require(address(V3GovernedGameRewardFixture(factory.vaults(1)).token())==address(token));
        require(address(V3DeferredLiquidityFixture(factory.vaults(2)).asset())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(3)).token())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(4)).token())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(5)).token())==address(token));
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        require(address(legacy.token())==address(token)&&!legacy.activated()&&legacy.allocated()==0&&address(legacy.custody())==address(control));
    }
    function testFactoryAndTokenCannotIssueTwice() public {
        V3SuccessorTestToken token=factory.create(cfg);
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
        address[7] memory v;for(uint256 i=0;i<7;i++)v[i]=factory.vaults(i);
        vm.prank(address(factory));vm.expectRevert(V3SuccessorTestToken.InvalidIssuance.selector);token.issue(v);
    }
    function testNonCreatorCannotConsumeFactory() public {
        vm.prank(PAYEE);vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0));
        factory.create(cfg);
    }
    function testInvalidLiquidityConfigRollsBackWholeCreation() public {
        cfg.liquidity.trancheCap=0;
        vm.expectRevert(V3DeferredLiquidityFixture.InvalidConfig.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0)&&factory.vaults(0)==address(0));
        cfg.liquidity.trancheCap=1000;require(factory.create(cfg).totalSupply()==SUPPLY);
    }
    function testIntegratedReleaseLiquidityClaimAndBurnConservation() public {
        V3SuccessorTestToken token=factory.create(cfg);
        _scheduleLiquidity();
        _scheduleLegacy();
        V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(3));
        V3EpochSpendFixture c=V3EpochSpendFixture(factory.vaults(4));
        bytes32 a=control.propose(e,PAYEE,"E","A",10);
        bytes32 b=control.propose(c,PAYEE,"E","B",10);
        vm.warp(cfg.start+2 days);e.execute(a);
        _executeLiquidity(token);
        vm.expectRevert(bytes4(keccak256("ExpenseAlreadyConsumed()")));c.execute(b);
        _claimGameReward();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        _activateLegacy(legacy);
        vm.prank(CLAIMANT);legacy.claim(0,_legacyRow(),new LegacyVerifier.Node[](0));
        require(token.totalSupply()==SUPPLY&&token.balanceOf(PAYEE)==210&&token.balanceOf(DISTRIBUTOR)==0&&token.balanceOf(CLAIMANT)==100);
        vm.prank(CLAIMANT);token.burn(10);
        vm.warp(legacy.appealEnd());
        control.scheduleLegacy(legacy,legacy.closureDigest("REVIEW"),block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);legacy.finalize("REVIEW");
        require(token.totalSupply()==SUPPLY-10-(legacy.RESERVE()-100)&&legacy.paid()+legacy.burned()==legacy.RESERVE());
    }
    function _legacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),CLAIMANT,100,100,bytes32(uint256(31)));
    }
    function _manifest(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_legacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function _scheduleLegacy() private {
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        control.scheduleLegacy(legacy,legacy.activationDigest(_manifest(legacy)),block.timestamp+7 days);
    }
    function _activateLegacy(V3LegacyProofClaimFixture legacy) private {
        legacy.activate(_manifest(legacy));
    }
    function testDeferredLegacyDoesNotBlockIssuanceOrRequireEarlyManifest() public {
        V3SuccessorTestToken token=factory.create(cfg);
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        vm.warp(block.timestamp+365 days);
        require(!legacy.activated()&&token.balanceOf(address(legacy))==legacy.RESERVE());
        vm.expectRevert(V3LegacyProofClaimFixture.NotReady.selector);legacy.finalize("REVIEW");
        _scheduleLegacy();
        vm.warp(block.timestamp+2 days);_activateLegacy(legacy);
        require(legacy.activated()&&legacy.deadline()==block.timestamp+30 days&&token.totalSupply()==SUPPLY);
    }
    bytes32 private lpAction;
    function _scheduleLiquidity() private {
        V3DeferredLiquidityFixture liquidity=V3DeferredLiquidityFixture(factory.vaults(2));
        require(quote.balanceOf(address(liquidity))==0&&liquidity.spent()==0);
        lpAction=control.scheduleLiquidity(liquidity,cfg.start+7 days);
    }
    function _executeLiquidity(V3SuccessorTestToken token) private {
        V3DeferredLiquidityFixture liquidity=V3DeferredLiquidityFixture(factory.vaults(2));
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);liquidity.execute(lpAction);
        quote.transfer(address(liquidity),500);liquidity.execute(lpAction);
        (,,,,,,,,address lock)=liquidity.actions(lpAction);
        require(liquidity.pool().balanceOf(lock)==100&&token.balanceOf(address(liquidity.pool()))==1000);
    }
    function _claimGameReward() private {
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(factory.vaults(1));
        V3GovernedGameRewardFixture.Reward memory x=V3GovernedGameRewardFixture.Reward("GAME_EVENT",PAYEE,200,0,cfg.start+30 days,1);
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(REWARD_KEY,gaming.digest(x));
        gaming.claim(x,abi.encodePacked(r,s,v));
    }
    function testEpochChangeAndFounderCliffInIntegratedAsset() public {
        V3SuccessorTestToken token=factory.create(cfg);
        V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(3));
        bytes32 old=control.propose(e,PAYEE,"E","A",10);
        vm.warp(cfg.start+2 days);control.rotate();
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(old);
        V3FounderVesting f=V3FounderVesting(factory.vaults(0));
        vm.warp(cfg.start+12*30 days);
        vm.expectRevert(V3FounderVesting.NothingDue.selector);f.release();
        vm.warp(cfg.start+13*30 days);f.release();
        require(token.balanceOf(FOUNDER)==f.ALLOCATION()/36&&token.totalSupply()==SUPPLY);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        V3SuccessorConditionalDeployer helper=factory.conditional();bytes32 expected=factory.conditionalHash();
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);new V3AtomicSuccessorFixture(helper,expected);
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
    }
}

```

## base/v3-testnet/test/V3BoundedLegacy.t.sol
Git blob: dc2d2c5c65a038d3591dc49cbaf0f655abf74d13

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3BoundedLegacyFixture,IV3BurnableAsset} from "../src/V3BoundedLegacyFixture.sol";
interface VmLegacy {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract LegacyFixtureAsset is ERC20 {
    constructor() ERC20("Synthetic legacy asset","LEGTEST"){_mint(msg.sender,888888888000000);}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}
contract V3BoundedLegacyTest {
    VmLegacy constant vm=VmLegacy(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=8888888880000;
    uint256 constant SUPPLY=888888888000000;
    uint256 constant CAP=1000000;
    address constant A=address(101);
    address constant B=address(102);
    bytes32 constant CAMPAIGN="SYNTHETIC";
    LegacyFixtureAsset asset;
    V3BoundedLegacyFixture vault;
    uint256 opens;uint256 deadline;uint256 closure;
    bytes32[] ids;address[] recipients;uint256[] amounts;
    function setUp() public {
        vm.chainId(84532);
        asset=new LegacyFixtureAsset();
        opens=block.timestamp+1 days;deadline=opens+30 days;closure=deadline+14 days;
        ids.push("A");ids.push("B");recipients.push(A);recipients.push(B);amounts.push(100);amounts.push(200);
        vault=make(CAP);
        asset.transfer(address(vault),RESERVE);
    }
    function make(uint256 cap) internal returns(V3BoundedLegacyFixture){
        bytes32 h=keccak256(abi.encode("CLIMB_V3_SYNTHETIC_LEGACY_V1",block.chainid,address(asset),opens,deadline,closure,CAMPAIGN,cap,ids,recipients,amounts));
        return new V3BoundedLegacyFixture(IV3BurnableAsset(address(asset)),h,opens,deadline,closure);
    }
    function activate() internal {vault.activate(ids,recipients,amounts,CAP,CAMPAIGN);}
    function testExactManifestOneTimeActivation() public {
        activate();require(vault.activated()&&vault.budget()==CAP&&vault.allocated()==300);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);activate();
    }
    function testManifestMutationRejected() public {
        amounts[0]=101;
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);activate();
        require(!vault.activated());
    }
    function testUnfundedCannotActivate() public {
        vault=make(CAP);
        vm.expectRevert(V3BoundedLegacyFixture.NotFunded.selector);activate();
        require(!vault.activated());
    }
    function testDuplicateAndOversizedAllocationRejected() public {
        ids[1]=ids[0];vault=make(CAP);asset.transfer(address(vault),RESERVE);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);activate();
        require(!vault.activated()&&vault.recipient(ids[0])==address(0));
        ids[1]="B";amounts[1]=CAP;vault=make(CAP);asset.transfer(address(vault),RESERVE);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);activate();
    }
    function testCapAboveReserveRejected() public {
        vault=make(RESERVE+1);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);vault.activate(ids,recipients,amounts,RESERVE+1,CAMPAIGN);
    }
    function testRecipientOnlyClaimAndReplayNoMint() public {
        activate();vm.warp(opens);
        vm.expectRevert(V3BoundedLegacyFixture.NotEligible.selector);vault.claim("A");
        vm.prank(A);vault.claim("A");
        require(asset.balanceOf(A)==100&&vault.paid()==100&&asset.totalSupply()==SUPPLY);
        vm.prank(A);vm.expectRevert(V3BoundedLegacyFixture.AlreadyClaimed.selector);vault.claim("A");
    }
    function testClaimAndClosureWindows() public {
        activate();vm.prank(A);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.claim("A");
        vm.warp(deadline);vm.prank(A);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.claim("A");
        vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.closeAndBurn();
        vm.warp(closure);vault.closeAndBurn();
        require(vault.closed()&&vault.burned()==RESERVE&&asset.totalSupply()==SUPPLY-RESERVE);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.closeAndBurn();
    }
    function testPaidAndBurnedReconcileDonationExcluded() public {
        activate();asset.transfer(address(vault),5);vm.warp(opens);
        vm.prank(B);vault.claim("B");vm.warp(closure);vault.closeAndBurn();
        require(vault.paid()+vault.burned()==RESERVE&&vault.burned()==RESERVE-200&&asset.balanceOf(address(vault))==5&&asset.totalSupply()==SUPPLY-RESERVE+200);
    }
    function testMissedActivationFailsClosed() public {
        vm.warp(opens);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);activate();
        vm.warp(closure);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.closeAndBurn();
        require(asset.balanceOf(address(vault))==RESERVE);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert(V3BoundedLegacyFixture.WrongChain.selector);
        new V3BoundedLegacyFixture(IV3BurnableAsset(address(asset)),bytes32("M"),opens,deadline,closure);
    }
}

```

## base/v3-testnet/test/V3DeferredLegacy.t.sol
Git blob: d82f4be299ced48452566677cc8e19ace95689ef

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3DeferredLegacyFixture} from "../src/V3DeferredLegacyFixture.sol";
import {IV3BurnableAsset} from "../src/V3BoundedLegacyFixture.sol";
import {IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {LegacyFixtureAsset} from "./V3BoundedLegacy.t.sol";
interface VmDeferredLegacy {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract DeferredLegacyMockCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public constant override threshold=3;
    uint256 public constant override memberCount=5;
    function isMember(address) external pure override returns(bool){return false;}
    function rotate() external {epoch++;}
    function schedule(V3DeferredLegacyFixture v,bytes32 h,uint256 expiry) external {v.schedule(h,expiry);}
    function cancel(V3DeferredLegacyFixture v) external {v.cancel();}
}
contract V3DeferredLegacyTest {
    VmDeferredLegacy constant vm=VmDeferredLegacy(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=8888888880000;
    uint256 constant SUPPLY=888888888000000;
    address constant A=address(101);
    bytes32 constant CAMPAIGN="SYNTHETIC";
    bytes32 constant REVIEW="REVIEW";
    LegacyFixtureAsset asset;
    DeferredLegacyMockCustody control;
    V3DeferredLegacyFixture vault;
    bytes32[] ids; address[] recipients; uint256[] amounts;
    function setUp() public {
        vm.chainId(84532);asset=new LegacyFixtureAsset();control=new DeferredLegacyMockCustody();
        vault=new V3DeferredLegacyFixture(IV3BurnableAsset(address(asset)),control);
        asset.transfer(address(vault),RESERVE);
        ids.push("A");recipients.push(A);amounts.push(100);
    }
    function digest() internal view returns(bytes32){return vault.manifestDigest(CAMPAIGN,100,ids,recipients,amounts);}
    function schedule() internal {control.schedule(vault,digest(),block.timestamp+7 days);}
    function activate() internal {vault.activate(CAMPAIGN,100,ids,recipients,amounts);}
    function ready() internal {schedule();vm.warp(block.timestamp+2 days);activate();}
    function testIndefiniteDeferralAndRelativeWindows() public {
        vm.warp(block.timestamp+365 days);require(!vault.activated()&&asset.balanceOf(address(vault))==RESERVE);
        ready();require(vault.opens()==block.timestamp&&vault.deadline()==block.timestamp+30 days&&vault.appealEnd()==block.timestamp+44 days);
    }
    function testUnauthorizedAndDelay() public {
        bytes32 h=digest();vm.expectRevert(V3DeferredLegacyFixture.Unauthorized.selector);vault.schedule(h,block.timestamp+7 days);
        schedule();vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        vm.warp(block.timestamp+2 days);activate();
        vm.expectRevert(V3DeferredLegacyFixture.InvalidAction.selector);activate();
    }
    function testExpiredAndCancelledCommitmentCanBeReplaced() public {
        schedule();vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        schedule();control.cancel(vault);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        ready();
    }
    function testStaleEpochRequiresNewDelay() public {
        schedule();control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        schedule();vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        vm.warp(block.timestamp+2 days);activate();
    }
    function testManifestBindingAndAtomicFailure() public {
        schedule();vm.warp(block.timestamp+2 days);amounts[0]=99;
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        amounts[0]=100;activate();require(vault.allocated()==100);
    }
    function testRecipientOnlyReplayAndClaimDeadline() public {
        ready();vm.expectRevert(V3DeferredLegacyFixture.NotEligible.selector);vault.claim("A");
        vm.prank(A);vault.claim("A");require(asset.balanceOf(A)==100&&asset.totalSupply()==SUPPLY);
        vm.prank(A);vm.expectRevert(V3DeferredLegacyFixture.AlreadyClaimed.selector);vault.claim("A");
        vm.warp(vault.deadline());vm.prank(A);vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.claim("A");
    }
    function testClosureRequiresSeparateDelayedCurrentEpochReview() public {
        ready();vm.prank(A);vault.claim("A");asset.transfer(address(vault),5);
        bytes32 h=vault.closureDigest(REVIEW);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidAction.selector);control.schedule(vault,h,block.timestamp+7 days);
        vm.warp(vault.appealEnd());
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.finalize(REVIEW);
        control.schedule(vault,h,block.timestamp+7 days);control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.finalize(REVIEW);
        control.schedule(vault,h,block.timestamp+7 days);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.finalize("OTHER");
        vault.finalize(REVIEW);
        require(vault.closed()&&vault.burned()+vault.paid()==RESERVE&&asset.balanceOf(address(vault))==5&&asset.totalSupply()==SUPPLY-RESERVE+100);
    }
    function testDuplicateIdentityRollsBackApprovedManifest() public {
        ids.push("A");recipients.push(address(102));amounts.push(1);
        bytes32 h=vault.manifestDigest(CAMPAIGN,101,ids,recipients,amounts);
        control.schedule(vault,h,block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidManifest.selector);
        vault.activate(CAMPAIGN,101,ids,recipients,amounts);
        require(!vault.activated()&&vault.recipient("A")==address(0)&&vault.award("A")==0&&vault.allocated()==0);
        (bytes32 retained,,,)=vault.pending();require(retained==h);
        require(asset.balanceOf(address(vault))==RESERVE&&asset.totalSupply()==SUPPLY);
    }
    function testExactManifestEntryLimitAndDistinctClaims() public {
        amounts[0]=1;
        for(uint256 i=1;i<33;i++){
            ids.push(bytes32(i));recipients.push(address(uint160(1000+i)));amounts.push(1);
        }
        bytes32 h=vault.manifestDigest(CAMPAIGN,33,ids,recipients,amounts);
        control.schedule(vault,h,block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidManifest.selector);
        vault.activate(CAMPAIGN,33,ids,recipients,amounts);
        require(!vault.activated()&&vault.allocated()==0);
        control.cancel(vault);ids.pop();recipients.pop();amounts.pop();
        h=vault.manifestDigest(CAMPAIGN,32,ids,recipients,amounts);
        control.schedule(vault,h,block.timestamp+7 days);vm.warp(block.timestamp+2 days);
        vault.activate(CAMPAIGN,32,ids,recipients,amounts);
        require(vault.activated()&&vault.allocated()==32);
        for(uint256 i=0;i<32;i++){
            vm.prank(recipients[i]);vault.claim(ids[i]);
        }
        require(vault.paid()==32&&asset.balanceOf(address(vault))==RESERVE-32&&asset.totalSupply()==SUPPLY);
    }
    function testOverBudgetManifestCannotPartiallyActivate() public {
        ids.push("B");recipients.push(address(102));amounts.push(1);
        schedule();vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidManifest.selector);activate();
        require(!vault.activated()&&vault.recipient("A")==address(0)&&vault.award("B")==0&&vault.paid()==0);
        control.cancel(vault);ids.pop();recipients.pop();amounts.pop();
        ready();require(vault.allocated()==100);
    }
    function testDistinctIdsMayShareRecipientInCurrentSyntheticPolicy() public {
        // Documents existing behavior, not approval of a real eligibility policy.
        ids.push("B");recipients.push(A);amounts.push(100);
        control.schedule(vault,vault.manifestDigest(CAMPAIGN,200,ids,recipients,amounts),block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);vault.activate(CAMPAIGN,200,ids,recipients,amounts);
        vm.prank(A);vault.claim("A");vm.prank(A);vault.claim("B");
        require(vault.paid()==200&&asset.balanceOf(A)==200&&asset.totalSupply()==SUPPLY);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3DeferredLegacyFixture.InvalidConfig.selector);
        new V3DeferredLegacyFixture(IV3BurnableAsset(address(asset)),control);
    }
}

```

## base/v3-testnet/test/V3DeferredLiquidity.t.sol
Git blob: 64b9d8a393234e9a9e6d5bcab6102c03849733c3

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3DeferredLiquidityFixture} from "../src/V3DeferredLiquidityFixture.sol";
import {V3SyntheticLPLock,IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
import {LPFixtureAsset,LPFixturePool,LPFixtureCustody} from "./V3LiquidityPolicy.t.sol";
import {IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
interface VmDeferred {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract DeferredMockControl is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public constant override threshold=3;
    uint256 public constant override memberCount=5;
    function isMember(address) external pure override returns(bool){return false;}
    function rotate() external {epoch++;}
    function schedule(V3DeferredLiquidityFixture v,uint256 a,uint256 q,uint256 min,uint256 deadline,bytes32 nonce) external returns(bytes32){
        return v.schedule(a,q,min,deadline,nonce);
    }
    function cancel(V3DeferredLiquidityFixture v,bytes32 id) external {v.cancel(id);}
}
contract V3DeferredLiquidityTest {
    VmDeferred constant vm=VmDeferred(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=222222222000000;
    LPFixtureAsset asset;
    LPFixtureAsset quote;
    LPFixturePool pool;
    LPFixtureCustody destination;
    DeferredMockControl control;
    V3DeferredLiquidityFixture vault;
    function setUp() public {
        vm.chainId(84532);asset=new LPFixtureAsset();quote=new LPFixtureAsset();
        pool=new LPFixturePool(address(asset),address(quote));destination=new LPFixtureCustody();control=new DeferredMockControl();
        vault=new V3DeferredLiquidityFixture(asset,quote,IV3SyntheticPool(address(pool)),control,address(destination),RESERVE/2);
        asset.transfer(address(vault),RESERVE);
    }
    function schedule(uint256 a,bytes32 nonce) internal returns(bytes32){
        return control.schedule(vault,a,500,50,block.timestamp+7 days,nonce);
    }
    function testZeroQuoteIndefiniteDeferralAndLaterFunding() public {
        vm.warp(block.timestamp+365 days);
        require(asset.balanceOf(address(vault))==RESERVE&&vault.spent()==0&&quote.balanceOf(address(vault))==0);
        bytes32 id=schedule(1000,"A");
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(id);
        quote.transfer(address(vault),500);vault.execute(id);
        require(vault.spent()==1000&&asset.balanceOf(address(vault))==RESERVE-1000);
    }
    function testCustodyOnlyAndDelay() public {
        vm.expectRevert(V3DeferredLiquidityFixture.Unauthorized.selector);vault.schedule(1000,500,50,block.timestamp+7 days,"A");
        bytes32 id=schedule(1000,"A");quote.transfer(address(vault),500);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(id);
        vm.warp(block.timestamp+2 days);vault.execute(id);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(id);
    }
    function testMultipleTranchesAndDistinctLocks() public {
        bytes32 a=schedule(1000,"A");bytes32 b=schedule(2000,"B");quote.transfer(address(vault),1000);
        vm.warp(block.timestamp+2 days);vault.execute(a);vault.execute(b);
        (,,,,,uint256 deadlineA,,,address lockA)=vault.actions(a);
        (,,,,,,,,address lockB)=vault.actions(b);
        require(lockA!=lockB&&pool.balanceOf(lockA)==100&&pool.balanceOf(lockB)==100);
        require(V3SyntheticLPLock(lockA).unlockAt()==deadlineA+730 days&&vault.spent()==3000);
        require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
    }
    function testExpiredActionCanBeReplacedWithoutUnlocking() public {
        bytes32 old=schedule(1000,"A");quote.transfer(address(vault),500);
        vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(old);
        bytes32 fresh=schedule(1000,"B");vm.warp(block.timestamp+2 days);vault.execute(fresh);
        require(vault.spent()==1000);
    }
    function testStaleEpochAndCancellation() public {
        bytes32 a=schedule(1000,"A");bytes32 b=schedule(1000,"B");
        control.cancel(vault,b);control.rotate();vault.syncEpoch();quote.transfer(address(vault),500);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(a);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(b);
        bytes32 fresh=schedule(1000,"A");require(fresh!=a);
        vm.warp(block.timestamp+2 days);vault.execute(fresh);
    }
    function testTrancheAndTotalCap() public {
        vm.expectRevert(V3DeferredLiquidityFixture.InvalidAction.selector);schedule(RESERVE/2+1,"X");
        bytes32 a=schedule(RESERVE/2,"A");bytes32 b=schedule(RESERVE/2,"B");bytes32 c=schedule(1,"C");
        quote.transfer(address(vault),1500);vm.warp(block.timestamp+2 days);
        vault.execute(a);vault.execute(b);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(c);
        require(vault.spent()==RESERVE);
    }
    function testPoolMismatchRollsBack() public {
        bytes32 id=schedule(1000,"A");quote.transfer(address(vault),500);vm.warp(block.timestamp+2 days);
        pool.setMode(1);
        vm.expectRevert(V3DeferredLiquidityFixture.BalanceMismatch.selector);vault.execute(id);
        require(vault.spent()==0&&asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==500);
        pool.setMode(0);vault.execute(id);require(vault.spent()==1000);
    }
    function testRejectExtraSharesAndRedirectedInputs() public {
        bytes32 id=schedule(1000,"DILUTION");quote.transfer(address(vault),500);
        vm.warp(block.timestamp+2 days);
        for(uint256 m=5;m<=6;m++){
            pool.setMode(m);
            vm.expectRevert(V3DeferredLiquidityFixture.BalanceMismatch.selector);vault.execute(id);
            require(vault.spent()==0&&asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==500);
            require(pool.totalSupply()==0&&asset.balanceOf(address(pool))==0&&quote.balanceOf(address(pool))==0&&asset.balanceOf(address(0x777))==0);
            require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
            (,,,,,,bool executed,,address locker)=vault.actions(id);require(!executed&&locker==address(0));
        }
        pool.setMode(0);vault.execute(id);
        require(vault.spent()==1000&&pool.totalSupply()==100&&asset.balanceOf(address(pool))==1000&&quote.balanceOf(address(pool))==500);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3DeferredLiquidityFixture.InvalidConfig.selector);
        new V3DeferredLiquidityFixture(asset,quote,IV3SyntheticPool(address(pool)),control,address(destination),1000);
    }
}

```


---

# CLIMB V3 #994 re-review — G: remaining V3 policy regression tests
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Eight complete test sources, GitHub-reported blob IDs; not independently rehashed. V3 CI 46015224824 SUCCESS. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/test/V3EpochPolicy.t.sol
Git blob: 255df36ed0120b75cfbfd9154d02e9dd37129764

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3EpochSpendFixture,V3EpochPolicyFactory,IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {V3SharedExpenseRegistry} from "../src/V3SharedExpenseFixture.sol";
interface VmEpoch {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract EpochTestAsset is ERC20 {
    constructor() ERC20("Synthetic epoch asset","EPOCHTEST"){_mint(msg.sender,888888888000000);}
}
// Deliberately unrestricted mock. Never use this for actual custody.
contract MockEpochCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public override threshold=3;
    uint256 public override memberCount=5;
    mapping(address=>bool) public override isMember;
    function expenseRecipientAllowed(address) external pure returns(bool){return true;}
    function configure(uint256 e,uint256 t,uint256 n) external {epoch=e;threshold=t;memberCount=n;}
    function member(address a,bool yes) external {isMember[a]=yes;}
    function propose(V3EpochSpendFixture v,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32){
        return v.propose(recipient,amount,evidence,month,nonce);
    }
    function cancel(V3EpochSpendFixture v,bytes32 id) external {v.cancel(id);}
}
contract V3EpochPolicyTest {
    VmEpoch constant vm=VmEpoch(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    EpochTestAsset token;
    MockEpochCustody control;
    V3EpochPolicyFactory factory;
    V3EpochSpendFixture e;
    V3EpochSpendFixture c;
    function setUp() public {
        vm.chainId(84532);
        token=new EpochTestAsset();control=new MockEpochCustody();
        start=block.timestamp+1 days;
        factory=new V3EpochPolicyFactory(token,control,start,FOUNDER);
        e=factory.ecosystem();c=factory.community();
        token.transfer(address(e),e.budget());token.transfer(address(c),c.budget());
    }
    function propose(V3EpochSpendFixture v,bytes32 evidence,bytes32 nonce,uint256 amount) internal returns(bytes32){
        return control.propose(v,PAYEE,amount,evidence,0,nonce);
    }
    function testOnlyCustodyAuthorizesAndDelay() public {
        vm.expectRevert(V3EpochSpendFixture.Unauthorized.selector);e.propose(PAYEE,10,"E",0,"N");
        bytes32 id=propose(e,"E","N",10);
        vm.warp(start);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(id);
        vm.warp(start+2 days);e.execute(id);
        require(e.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testRotationInvalidatesPriorProposalAndRequiresFreshDelay() public {
        bytes32 old=propose(e,"E","N",10);
        vm.warp(start+2 days);control.configure(2,3,5);e.syncEpoch();
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(old);
        bytes32 fresh=propose(e,"E","N",10);require(fresh!=old);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(fresh);
        vm.warp(start+4 days);e.execute(fresh);require(e.totalSpent()==10);
    }
    function testObservedEpochRollbackAndWrongThresholdRejected() public {
        control.configure(2,3,5);e.syncEpoch();control.configure(1,3,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        control.configure(3,2,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        control.configure(3,3,4);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        require(e.highestObservedEpoch()==2);
    }
    function testConsumedExpenseSurvivesEpochAcrossPurposes() public {
        bytes32 a=propose(e,"E","A",10);vm.warp(start+2 days);e.execute(a);
        control.configure(2,3,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidProposal.selector);propose(c,"E","B",20);
        require(factory.registry().consumedBy("E")==address(e)&&e.totalSpent()==10);
    }
    function testRecipientRecheckedBeforeExecution() public {
        bytes32 a=propose(e,"E","A",10);vm.warp(start+2 days);
        control.member(PAYEE,true);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(a);
        require(e.totalSpent()==0);
    }
    function testCancellationAndCapPreserved() public {
        uint256 cap=e.monthlyCap(0);
        bytes32 a=propose(e,"E","A",cap);control.cancel(e,a);
        bytes32 b=propose(e,"F","B",cap);bytes32 d=propose(e,"G","D",1);
        vm.warp(start+2 days);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(a);
        e.execute(b);
        vm.expectRevert(V3EpochSpendFixture.CapExceeded.selector);e.execute(d);
        require(e.totalSpent()==cap&&factory.registry().consumedBy("E")==address(0));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);
        new V3EpochPolicyFactory(token,control,start,FOUNDER);
    }
}

```

## base/v3-testnet/test/V3GameReward.t.sol
Git blob: da6d806c6bfc10430165edc951c0224710b49f55

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3GameRewardFixture} from "../src/V3GameRewardFixture.sol";
interface VmReward {
    function chainId(uint256) external;
    function warp(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert(bytes4) external;
    function expectRevert() external;
}
contract RewardTestAsset is ERC20 {
    constructor() ERC20("Synthetic reward asset","REWARDTEST"){_mint(msg.sender,888888888000000);}
}
contract V3GameRewardTest {
    VmReward constant vm=VmReward(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant KEY=12345;
    address constant FOUNDER=address(99);
    address constant PLAYER=address(100);
    uint256 start;
    RewardTestAsset token;
    V3GameRewardFixture vault;
    function setUp() public {
        vm.chainId(84532);token=new RewardTestAsset();start=block.timestamp+1 days;
        vault=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        token.transfer(address(vault),vault.ALLOCATION());
    }
    function reward(bytes32 id,address recipient,uint256 amount,uint256 m) internal view returns(V3GameRewardFixture.Reward memory){
        return V3GameRewardFixture.Reward(id,recipient,amount,m,start+(m+1)*30 days);
    }
    function sig(V3GameRewardFixture target,V3GameRewardFixture.Reward memory x,uint256 key) internal returns(bytes memory){
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(key,target.digest(x));return abi.encodePacked(r,s,v);
    }
    function testSignedRewardDirectToPlayerAndReplay() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY);vault.claim(x,s);
        require(token.balanceOf(PLAYER)==100&&vault.released()==100&&vault.paid("E")&&vault.walletReleased(0,PLAYER)==100);
        vm.expectRevert(V3GameRewardFixture.AlreadyPaid.selector);vault.claim(x,s);
        x.recipient=address(101);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.AlreadyPaid.selector);vault.claim(x,s);
    }
    function testWrongSignerAndModifiedRecipientRejected() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY+1);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);vault.claim(x,s);
        s=sig(vault,x,KEY);x.recipient=address(101);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);vault.claim(x,s);
    }
    function testCrossVaultSignatureRejected() public {
        V3GameRewardFixture other=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);other.claim(x,s);
    }
    function testMonthAndExpiry() public {
        V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
        vm.warp(start+30 days);vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
        vm.warp(start+60*30 days);vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
    }
    function testWalletCapAndNoRollover() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("A",PLAYER,900,0);vault.claim(x,sig(vault,x,KEY));
        x=reward("B",PLAYER,101,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);vault.claim(x,s);
        vm.warp(start+30 days);x=reward("C",PLAYER,1001,1);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);vault.claim(x,s);
        x=reward("D",PLAYER,1000,1);vault.claim(x,sig(vault,x,KEY));require(vault.released()==1900);
    }
    function testAggregateCap() public {
        V3GameRewardFixture large=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,vault.ALLOCATION());
        token.transfer(address(large),large.ALLOCATION());vm.warp(start);
        V3GameRewardFixture.Reward memory x=reward("A",PLAYER,large.monthlyCap(0),0);large.claim(x,sig(large,x,KEY));
        x=reward("B",address(101),1,0);bytes memory s=sig(large,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);large.claim(x,s);
    }
    function testTransferRevertRollsBackAccounting() public {
        V3GameRewardFixture empty=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);bytes memory s=sig(empty,x,KEY);
        vm.expectRevert();empty.claim(x,s);
        require(!empty.paid("E")&&empty.released()==0&&empty.walletReleased(0,PLAYER)==0);
        token.transfer(address(empty),100);empty.claim(x,s);require(empty.paid("E"));
    }
    function testFounderAndSignerExcluded() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("A",FOUNDER,100,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidReward.selector);vault.claim(x,s);
        x=reward("B",vault.distributor(),100,0);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidReward.selector);vault.claim(x,s);
    }
    function testMainnetRejected() public {
        address signer=vm.addr(KEY);vm.chainId(8453);
        vm.expectRevert(V3GameRewardFixture.InvalidConfig.selector);new V3GameRewardFixture(token,signer,FOUNDER,start,1000);
    }
}

```

## base/v3-testnet/test/V3GovernedGameReward.t.sol
Git blob: 4820818f13f5b6ed9c00612e1edbd7394aade62a

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3GovernedGameRewardFixture,IV3RewardCustody} from "../src/V3GovernedGameRewardFixture.sol";
import {RewardTestAsset,VmReward} from "./V3GameReward.t.sol";

contract V3GovernedGameRewardTest is IV3RewardCustody {
    VmReward constant vm=VmReward(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant A=12345;
    uint256 constant B=23456;
    address constant FOUNDER=address(99);
    address constant PLAYER=address(100);
    uint256 public override epoch=1;
    uint256 public override threshold=3;
    uint256 public override memberCount=5;
    mapping(address=>bool) public excluded;
    RewardTestAsset token;
    V3GovernedGameRewardFixture vault;
    uint256 start;
    function rewardSignerAllowed(address a) external view override returns(bool){return !excluded[a];}
    function setUp() public {
        vm.chainId(84532);token=new RewardTestAsset();start=block.timestamp+1 days;
        vault=new V3GovernedGameRewardFixture(token,vm.addr(A),FOUNDER,start,1000,this);
        token.transfer(address(vault),vault.ALLOCATION());
        vm.warp(start);
    }
    function reward(bytes32 id,uint256 amount,uint256 gen) internal view returns(V3GovernedGameRewardFixture.Reward memory){
        return V3GovernedGameRewardFixture.Reward(id,PLAYER,amount,0,start+30 days,gen);
    }
    function sign(V3GovernedGameRewardFixture.Reward memory r,uint256 key) internal returns(bytes memory){
        (uint8 v,bytes32 x,bytes32 y)=vm.sign(key,vault.digest(r));return abi.encodePacked(x,y,v);
    }
    function schedule(address signer) internal {
        vault.schedule(epoch,vault.generation(),signer,block.timestamp,block.timestamp+1 days);
    }
    function rotate(address signer) internal {
        vault.revoke(epoch,vault.generation());schedule(signer);
        vm.warp(block.timestamp+2 days);vault.activate(epoch,vault.generation(),vault.rotationSerial(),signer);
    }
    function testRevocationStopsClaimsAndGenerationPreventsReplayAfterReuse() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("OLD",100,1);
        bytes memory old=sign(r,A);
        vault.revoke(1,1);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,old);
        schedule(vm.addr(B));vm.warp(block.timestamp+2 days);vault.activate(1,2,1,vm.addr(B));
        rotate(vm.addr(A));
        require(vault.generation()==5&&vault.distributor()==vm.addr(A));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,old);
        r.generation=5;vault.claim(r,sign(r,A));require(vault.paid("OLD"));
    }
    function testAccountingAndPaidIdsPersistAcrossRotation() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("PAID",900,1);vault.claim(r,sign(r,A));
        rotate(vm.addr(B));
        r.generation=3;
        bytes memory s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.AlreadyPaid.selector);vault.claim(r,s);
        r.eventId="NEW";r.amount=101;s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.CapExceeded.selector);vault.claim(r,s);
        r.amount=100;vault.claim(r,sign(r,B));
        require(vault.released()==1000&&vault.monthlyReleased(0)==1000&&vault.walletReleased(0,PLAYER)==1000);
    }
    function testDelayExpiryAndScheduleSerial() public {
        vault.revoke(1,1);schedule(vm.addr(B));address b=vm.addr(B);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,1,b);
        vault.cancel(1,2,1);schedule(b);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,1,b);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.cancel(1,2,1);
        vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,2,b);
        schedule(b);vm.warp(block.timestamp+2 days);vault.activate(1,2,3,b);
    }
    function testEpochAndRoleChangeInvalidatePendingActivation() public {
        vault.revoke(1,1);address b=vm.addr(B);schedule(b);
        vm.warp(block.timestamp+2 days);epoch=2;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(2,2,1,b);
        schedule(b);vm.warp(block.timestamp+2 days);excluded[b]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(2,2,2,b);
        excluded[b]=false;vault.activate(2,2,2,b);
    }
    function testUnauthorizedAndInvalidWindow() public {
        (bool ok,)=address(new RewardUntrustedCaller()).call(abi.encodeCall(RewardUntrustedCaller.revoke,(vault)));
        require(!ok&&vault.generation()==1);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.revoke(1,2);
        vault.revoke(1,1);address b=vm.addr(B);excluded[b]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.schedule(1,2,b,block.timestamp,block.timestamp+1 days);
        excluded[b]=false;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.schedule(1,2,b,block.timestamp,block.timestamp+2 days);
    }
    function testSignerAndCustodyRoleChangesFailClosed() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("E",100,1);
        bytes memory s=sign(r,A);excluded[vm.addr(A)]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,s);
        excluded[vm.addr(A)]=false;threshold=2;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.claim(r,s);
        threshold=3;vault.claim(r,s);require(vault.paid("E"));
    }
}
contract RewardUntrustedCaller {
    function revoke(V3GovernedGameRewardFixture vault) external {vault.revoke(1,1);}
}

```

## base/v3-testnet/test/V3LegacyProofClaim.t.sol
Git blob: 5e53b973b7eec06132557333f80eb40cd5b9e1a1

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofClaimFixture as Claim} from "../src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as Verifier} from "../src/V3LegacyProofVerifierFixture.sol";
import {IV3BurnableAsset} from "../src/V3BoundedLegacyFixture.sol";
import {LegacyFixtureAsset} from "./V3BoundedLegacy.t.sol";
import {DeferredLegacyMockCustody,VmDeferredLegacy} from "./V3DeferredLegacy.t.sol";
contract V3LegacyProofClaimTest {
    VmDeferredLegacy constant vm=VmDeferredLegacy(address(uint160(uint256(keccak256("hevm cheat code")))));
    LegacyFixtureAsset asset;
    DeferredLegacyMockCustody control;
    Claim vault;
    address constant A=address(101);
    address constant B=address(102);
    bytes32 constant DOMAIN=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
    Verifier.Commitment c;
    Verifier.Row a;
    Verifier.Row b;
    Verifier.Node[] p;
    Verifier.Node[] q;
    function setUp() public {
        vm.chainId(84532);asset=new LegacyFixtureAsset();control=new DeferredLegacyMockCustody();
        vault=new Claim(IV3BurnableAsset(address(asset)),control);
        asset.transfer(address(vault),vault.RESERVE());
        a=Verifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),A,100,7,bytes32(uint256(31)));
        b=Verifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),B,200,9,bytes32(uint256(32)));
        _build();
    }
    function _leaf(uint256 i,Verifier.Row memory r) private pure returns(bytes32){
        return sha256(abi.encodePacked(DOMAIN,bytes1(0x01),bytes32(uint256(1)),i,r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
    }
    function _build() private {
        bytes32 l=_leaf(0,a);bytes32 r=_leaf(1,b);
        bytes32 h=sha256(abi.encodePacked(DOMAIN,bytes1(0x03),l,a.award,r,b.award));
        c=Verifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(asset),address(vault),2,20,a.award+b.award,
            sha256(abi.encodePacked(DOMAIN,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(asset),address(vault),uint256(2),uint256(20),h,a.award+b.award)));
        delete p;delete q;p.push(Verifier.Node(r,b.award));q.push(Verifier.Node(l,a.award));
    }
    // The mock adapter has no actual Safe authorization; local impersonation
    // exercises the exact custody-only boundary, never a live account.
    function _schedule() private {
        bytes32 digest=vault.activationDigest(c);
        vm.prank(address(control));vault.schedule(digest,block.timestamp+7 days);
    }
    function _ready() private {_schedule();vm.warp(block.timestamp+2 days);vault.activate(c);}
    function testDelayedActivationAndExactReserveClaims() public {
        _schedule();vm.expectRevert(Claim.NotReady.selector);vault.activate(c);
        vm.warp(block.timestamp+2 days);vault.activate(c);
        vm.prank(A);vault.claim(0,a,p);
        vm.prank(B);vault.claim(1,b,q);
        require(vault.paid()==16&&asset.balanceOf(A)==7&&asset.balanceOf(B)==9);
        require(asset.balanceOf(address(vault))==vault.RESERVE()-16&&asset.totalSupply()==888888888000000);
        require(vault.claimedIndex(0)&&vault.claimedSource(a.sourceAccount));
    }
    function testRecipientAndReplayRejection() public {
        _ready();vm.prank(B);vm.expectRevert(Claim.NotEligible.selector);vault.claim(0,a,p);
        vm.prank(A);vault.claim(0,a,p);
        vm.prank(A);vm.expectRevert(Claim.AlreadyClaimed.selector);vault.claim(0,a,p);
        require(vault.paid()==7);
    }
    function testDuplicateSourceAcrossDifferentIndicesRejected() public {
        b.sourceAccount=a.sourceAccount;_build();_ready();
        vm.prank(A);vault.claim(0,a,p);
        vm.prank(B);vm.expectRevert(Claim.AlreadyClaimed.selector);vault.claim(1,b,q);
        require(vault.paid()==7&&!vault.claimedIndex(1));
    }
    function testAlteredProofDoesNotConsumeClaim() public {
        _ready();a.award=8;
        vm.prank(A);vm.expectRevert(Claim.NotEligible.selector);vault.claim(0,a,p);
        require(!vault.claimedIndex(0)&&!vault.claimedSource(a.sourceAccount)&&vault.paid()==0);
        a.award=7;vm.prank(A);vault.claim(0,a,p);require(vault.paid()==7);
    }
    function testEpochChangeAndCancellationInvalidateActivation() public {
        _schedule();control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.activate(c);
        _schedule();vm.prank(address(control));vault.cancel();vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.activate(c);
        _ready();require(vault.activated());
    }
    function _scheduleClosure(bytes32 review) private {
        bytes32 digest=vault.closureDigest(review);
        vm.prank(address(control));vault.schedule(digest,block.timestamp+7 days);
    }
    function testClosureRequiresAppealWindowAndCurrentEpoch() public {
        _ready();vm.prank(A);vault.claim(0,a,p);
        bytes32 review=bytes32(uint256(99));
        bytes32 digest=vault.closureDigest(review);
        vm.prank(address(control));vm.expectRevert(Claim.InvalidAction.selector);
        vault.schedule(digest,block.timestamp+7 days);
        vm.warp(vault.appealEnd());
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
        _scheduleClosure(review);control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
        _scheduleClosure(review);vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(bytes32(uint256(98)));
        vault.finalize(review);
        require(vault.closed()&&vault.paid()==7&&vault.burned()+vault.paid()==vault.RESERVE());
        require(asset.totalSupply()==888888888000000-vault.burned());
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
    }
    function testClosureCancellationAndDonationsPreserveAccounting() public {
        _ready();vm.prank(B);vault.claim(1,b,q);
        asset.transfer(address(vault),5);
        vm.warp(vault.appealEnd());
        bytes32 review=bytes32(uint256(99));
        _scheduleClosure(review);vm.prank(address(control));vault.cancel();
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
        _scheduleClosure(review);vm.warp(block.timestamp+2 days);vault.finalize(review);
        require(vault.closed()&&vault.burned()==vault.RESERVE()-9&&asset.balanceOf(address(vault))==5);
        vm.expectRevert(Claim.InvalidAction.selector);vault.activate(c);
        vm.prank(A);vm.expectRevert(Claim.NotReady.selector);vault.claim(0,a,p);
    }
    function testUnauthorizedScheduleAndDeadline() public {
        bytes32 digest=vault.activationDigest(c);
        vm.expectRevert(Claim.Unauthorized.selector);vault.schedule(digest,block.timestamp+7 days);
        _ready();vm.warp(vault.deadline());
        vm.prank(A);vm.expectRevert(Claim.NotReady.selector);vault.claim(0,a,p);
        require(vault.paid()==0);
    }
}

```

## base/v3-testnet/test/V3LegacyProofVerifier.t.sol
Git blob: 40a57c373dc44eb32a8ccf01e39cf9fc9a5afafa

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofVerifierFixture as Verifier} from "../src/V3LegacyProofVerifierFixture.sol";
interface VmLegacyProof {function chainId(uint256) external;}
contract V3LegacyProofVerifierTest {
    VmLegacyProof constant vm=VmLegacyProof(address(uint160(uint256(keccak256("hevm cheat code")))));
    Verifier verifier;
    function setUp() public {vm.chainId(84532);verifier=new Verifier();}
    // Independent Python SHA-256 / fixed-width byte encoding vector.
    function commitment() private pure returns(Verifier.Commitment memory){
        return Verifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(201),address(202),2,20,16,
            0x874e84f376daa40563141813015b5a4c1c08cc6001867759f4db578a914e53ca);
    }
    function row() private pure returns(Verifier.Row memory){
        return Verifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),address(101),100,7,bytes32(uint256(31)));
    }
    function proof() private pure returns(Verifier.Node[] memory p){
        p=new Verifier.Node[](1);p[0]=Verifier.Node(0x75d8a2ff3aec21ef9e700d051fded9469549b855cbbe3cea9962cb32be7525c6,9);
    }
    function testIndependentBinaryVectorBothDirections() public view {
        require(verifier.verify(commitment(),0,row(),proof()));
        Verifier.Node[] memory p=new Verifier.Node[](1);
        p[0]=Verifier.Node(0x75fbb26e69e9985e6dbf2ee85ef03bb81d96893056876376a869c2b022a18615,7);
        Verifier.Row memory r=Verifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),address(102),200,9,bytes32(uint256(32)));
        require(verifier.verify(commitment(),1,r,p));
    }
    function testCanonicalGeneratorVector() public view {
        Verifier.Commitment memory c=Verifier.Commitment(
            0x09ced17b8f096101418527fcff7a87e27c417f7ebff09ff9cc0f2b4522371406,
            0xda25814f85c83754bee9858baa74f8f431f772f2ff1567e609919599640532ee,
            address(201),address(202),2,20,16,
            0x5d5cb73c8bacde515bccff52fcc9efc3604d39be51de7d95dbf2c52bb8d70284);
        Verifier.Row memory r=Verifier.Row(bytes32((uint256(1)<<248)+11),bytes32((uint256(1)<<248)+21),address(101),100,7,bytes32(uint256(31)));
        Verifier.Node[] memory p=new Verifier.Node[](1);
        p[0]=Verifier.Node(0x7cd40b1190294231661d449f7f60100bb708a01b10e502c547c6810360b57e5c,9);
        require(verifier.verify(c,0,r,p));
    }
    function testAlteredRowAndIndexRejected() public view {
        Verifier.Row memory r=row();r.award++;
        require(!verifier.verify(commitment(),0,r,proof()));
        r=row();r.recipient=address(999);require(!verifier.verify(commitment(),0,r,proof()));
        require(!verifier.verify(commitment(),1,row(),proof()));
        require(!verifier.verify(commitment(),2,row(),proof()));
    }
    function testAlteredSumHashAndLengthRejected() public view {
        Verifier.Node[] memory p=proof();p[0].sum=type(uint256).max;
        require(!verifier.verify(commitment(),0,row(),p));
        p=proof();p[0].hash=bytes32(uint256(1));require(!verifier.verify(commitment(),0,row(),p));
        p=new Verifier.Node[](0);require(!verifier.verify(commitment(),0,row(),p));
    }
    function testContextTargetAndCapBinding() public view {
        Verifier.Commitment memory c=commitment();c.contextHash=bytes32(uint256(99));
        require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.targetVault=address(999);require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.cap=19;require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.cap=verifier.RESERVE()+1;require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.allocated=15;require(!verifier.verify(c,0,row(),proof()));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);require(!verifier.verify(commitment(),0,row(),proof()));
    }
}

```

## base/v3-testnet/test/V3LiquidityPolicy.t.sol
Git blob: d0694981645225a6d7ce0e6f952d041106a75980

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3LiquidityPolicyFixture,V3SyntheticLPLock,IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
interface VmLP {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract LPFixtureAsset is ERC20 {
    constructor() ERC20("Synthetic asset","SYN"){_mint(msg.sender,888888888000000);}
}
contract LPFixtureCustody {}
contract LPFixturePool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    uint256 public mode;
    constructor(address a,address q) ERC20("Synthetic LP","SYNLP"){asset=a;quote=q;}
    function setMode(uint256 m) external {mode=m;}
    function addLiquidity(uint256 a,uint256 q,uint256,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,mode==6?address(0x777):address(this),mode==1?a-1:a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        uint256 shares=mode==2?1:100;
        _mint(mode==3?msg.sender:recipient,shares);
        if(mode==5)_mint(address(0x777),shares);
        return mode==4?101:shares;
    }
}
contract V3LiquidityPolicyTest {
    VmLP constant vm=VmLP(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=222222222000000;
    uint256 constant A=1000;
    uint256 constant Q=500;
    LPFixtureAsset asset;
    LPFixtureAsset quote;
    LPFixturePool pool;
    LPFixtureCustody custody;
    V3LiquidityPolicyFixture vault;
    uint256 expiry;
    function setUp() public {
        vm.chainId(84532);
        asset=new LPFixtureAsset();quote=new LPFixtureAsset();
        pool=new LPFixturePool(address(asset),address(quote));custody=new LPFixtureCustody();
        expiry=block.timestamp+1 days;
        vault=make(address(custody),A,Q,50,expiry,address(pool).codehash);
        asset.transfer(address(vault),RESERVE);quote.transfer(address(vault),Q);
    }
    function make(address dest,uint256 a,uint256 q,uint256 minimum,uint256 end,bytes32 h) internal returns(V3LiquidityPolicyFixture){
        return new V3LiquidityPolicyFixture(asset,quote,IV3SyntheticPool(address(pool)),h,dest,a,q,minimum,end);
    }
    function testExactSpendAndDirectLockedShares() public {
        vault.execute();
        require(vault.executed()&&vault.sharesLocked()==100);
        require(asset.balanceOf(address(vault))==RESERVE-A&&quote.balanceOf(address(vault))==0);
        require(asset.balanceOf(address(pool))==A&&quote.balanceOf(address(pool))==Q);
        require(pool.balanceOf(address(vault.locker()))==100&&pool.balanceOf(address(vault))==0);
        require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);vault.execute();
    }
    function testLockDurationAndFixedCustody() public {
        vault.execute();
        V3SyntheticLPLock lock=vault.locker();
        require(lock.unlockAt()==expiry+730 days&&lock.custody()==address(custody));
        vm.warp(lock.unlockAt()-1);
        vm.expectRevert(V3SyntheticLPLock.Locked.selector);lock.release();
        vm.warp(lock.unlockAt());lock.release();
        require(pool.balanceOf(address(custody))==100&&pool.balanceOf(address(lock))==0);
    }
    function testUnfundedQuoteAndReserveRejected() public {
        V3LiquidityPolicyFixture empty=make(address(custody),A,Q,50,expiry,address(pool).codehash);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);empty.execute();
        asset.transfer(address(empty),RESERVE);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);empty.execute();
        require(!empty.executed());
    }
    function testRejectPartialSpendLowSharesWrongRecipientOrReport() public {
        for(uint256 m=1;m<=4;m++){
            pool.setMode(m);
            vm.expectRevert(V3LiquidityPolicyFixture.BalanceMismatch.selector);vault.execute();
            require(!vault.executed()&&asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==Q);
            require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
            require(pool.totalSupply()==0);
        }
        pool.setMode(0);vault.execute();require(vault.executed());
    }
    function testRejectInvalidParametersAndEOACustody() public {
        bytes32 h=address(pool).codehash;
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),RESERVE+1,Q,50,expiry,h);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,0,50,expiry,h);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,Q,0,expiry,h);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,Q,50,expiry,bytes32(0));
        vm.expectRevert(V3SyntheticLPLock.InvalidLock.selector);make(address(123),A,Q,50,expiry,h);
    }
    function testExpiryKeepsReserveLocked() public {
        vm.warp(expiry);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);vault.execute();
        require(asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==Q);
    }
    function testMainnetRejected() public {
        bytes32 h=address(pool).codehash;
        vm.chainId(8453);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,Q,50,expiry,h);
    }
}

```

## base/v3-testnet/test/V3RestrictedSpend.t.sol
Git blob: 92c32f4b428859eea1f6482e73808499a5de5136

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3RestrictedSpend} from "../src/V3RestrictedSpend.sol";
interface VmSpend {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract SpendFixtureToken is ERC20 {
    constructor() ERC20("Synthetic spend fixture","FIXTURE"){_mint(msg.sender,600000);}
}
contract V3RestrictedSpendTest {
    VmSpend constant vm=VmSpend(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    SpendFixtureToken token;
    V3RestrictedSpend v;
    address[5] signers;
    function setUp() public {
        vm.chainId(84532);
        for(uint256 i=0;i<5;i++) signers[i]=address(uint160(i+10));
        token=new SpendFixtureToken();
        start=block.timestamp+1 days;
        v=new V3RestrictedSpend(token,signers,FOUNDER,start,600000,"TREASURY");
        token.transfer(address(v),600000);
    }
    function propose(uint256 amount,uint256 month,bytes32 nonce) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,"EVIDENCE",month,nonce);
    }
    function approve3(bytes32 id) internal {
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testThresholdDelayAndExactPayment() public {
        bytes32 id=propose(10000,0,"A");
        for(uint256 i=0;i<2;i++){vm.prank(signers[i]);v.approve(id);}
        vm.warp(start);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[2]);v.approve(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10000&&v.totalSpent()==10000&&v.spent(0)==10000);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
    }
    function testDuplicateAndUnauthorizedApprovals() public {
        bytes32 id=propose(1,0,"A");
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.approve(id);
        vm.prank(signers[0]);v.approve(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.AlreadyApproved.selector);v.approve(id);
    }
    function testAggregateCapAndNoRollover() public {
        bytes32 a=propose(8000,1,"A");
        bytes32 b=propose(3000,1,"B");
        approve3(a);approve3(b);
        vm.warp(start+30 days);v.execute(a);
        vm.expectRevert(V3RestrictedSpend.CapExceeded.selector);v.execute(b);
        require(v.spent(0)==0&&v.spent(1)==8000);
    }
    function testExpiry() public {
        bytes32 a=propose(1,0,"A");approve3(a);
        vm.warp(start+30 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(a);
    }
    function testBeforeWindowEvenWithThreshold() public {
        bytes32 a=propose(1,1,"A");approve3(a);
        vm.warp(start+2 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(a);
    }
    function testRejectDirectFounderAndSignerRecipient() public {
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(FOUNDER,1,"E",0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(signers[1],1,"E",0,"A");
    }
    function testRejectDuplicateSignerAndFounderSigner() public {
        address[5] memory s=signers;s[4]=s[0];
        vm.expectRevert(V3RestrictedSpend.InvalidConfig.selector);new V3RestrictedSpend(token,s,FOUNDER,start,1,"T");
        s[4]=FOUNDER;
        vm.expectRevert(V3RestrictedSpend.InvalidConfig.selector);new V3RestrictedSpend(token,s,FOUNDER,start,1,"T");
    }
    function testExactCapSum() public {
        V3RestrictedSpend odd=new V3RestrictedSpend(token,signers,FOUNDER,start,600001,"ODD");
        uint256 sum;for(uint256 i=0;i<60;i++)sum+=odd.monthlyCap(i);
        require(sum==600001&&odd.monthlyCap(60)==0);
    }
    function testDuplicateProposalAndMissingEvidence() public {
        propose(1,0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(PAYEE,1,"EVIDENCE",0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(PAYEE,1,0,0,"B");
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(V3RestrictedSpend.WrongChain.selector);new V3RestrictedSpend(token,signers,FOUNDER,start,1,"T");
    }

    function testRevocationResetsDelayAtLostQuorum() public {
        bytes32 id=propose(10000,0,"A");approve3(id);
        vm.warp(start+2 days);
        vm.prank(signers[1]);v.revokeApproval(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[3]);v.approve(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.warp(start+4 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10000);
    }
    function testRevocationWithRemainingQuorumKeepsDelay() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(signers[3]);v.approve(id);
        vm.prank(signers[0]);v.revokeApproval(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==1);
    }
    function testCancellationQuorumPermanentAndNoSpend() public {
        bytes32 id=propose(10000,0,"A");approve3(id);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.voteCancel(id);}
        require(v.cancelled(id)&&v.cancelVotes(id)==3);
        vm.warp(start+2 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[3]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.approve(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        require(v.totalSpent()==0&&token.balanceOf(PAYEE)==0);
        bytes32 next=propose(10000,0,"B");approve3(next);
        vm.warp(start+4 days);v.execute(next);
        require(token.balanceOf(PAYEE)==10000);
    }
    function testMinorityCancelCannotVetoOrDoubleVote() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(signers[0]);v.voteCancel(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
        vm.prank(signers[1]);v.voteCancel(id);
        require(!v.cancelled(id));
        vm.warp(start+2 days);v.execute(id);
        vm.prank(signers[2]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
    }
    function testUnauthorizedUnknownAndExpiredActions() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.voteCancel(id);
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.revokeApproval(id);
        vm.prank(signers[4]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(bytes32(uint256(999)));
        vm.warp(start+30 days);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
    }
}

```

## base/v3-testnet/test/V3SharedExpense.t.sol
Git blob: 7be349f573d7b827f586112c21ef58948348fb7f

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3SharedExpenseFixture,V3SharedExpenseRegistry,V3SharedRestrictedSpend} from "../src/V3SharedExpenseFixture.sol";
interface VmShared {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
}
contract SharedTestAsset is ERC20 {
    constructor() ERC20("Synthetic expense asset","EXPTEST"){_mint(msg.sender,888888888000000);}
}
contract V3SharedExpenseTest {
    VmShared constant vm=VmShared(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    SharedTestAsset token;
    V3SharedExpenseFixture fixture;
    V3SharedExpenseRegistry registry;
    V3SharedRestrictedSpend e;
    V3SharedRestrictedSpend c;
    V3SharedRestrictedSpend t;
    address[5] signers;
    function setUp() public {
        vm.chainId(84532);
        for(uint256 i=0;i<5;i++)signers[i]=address(uint160(i+10));
        token=new SharedTestAsset();
        start=block.timestamp+1 days;
        fixture=new V3SharedExpenseFixture(token,signers,FOUNDER,start);
        registry=fixture.registry();e=fixture.ecosystem();c=fixture.community();t=fixture.treasury();
        token.transfer(address(e),e.budget());token.transfer(address(c),c.budget());
        // Treasury deliberately unfunded until a test transfers funds.
    }
    function proposal(V3SharedRestrictedSpend v,bytes32 evidence,bytes32 nonce,uint256 amount) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,evidence,0,nonce);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testAtomicBindingAndNoRebind() public {
        require(registry.isSealed()&&registry.consumer(address(e))&&registry.consumer(address(c))&&registry.consumer(address(t)));
        require(address(e.registry())==address(registry)&&address(c.registry())==address(registry)&&address(t.registry())==address(registry));
        vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);registry.bind([address(e),address(c),address(t)]);
        vm.expectRevert(V3SharedExpenseRegistry.UnauthorizedConsumer.selector);registry.consume("E","P");
    }
    function testSameExpenseAcrossPurposesCannotPayTwice() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"E","B",20);
        vm.warp(start+2 days);e.execute(a);
        require(registry.consumedBy("E")==address(e)&&registry.consumedProposal("E")==a);
        vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);c.execute(b);
        require(e.totalSpent()==10&&c.totalSpent()==0&&token.balanceOf(PAYEE)==10);
    }
    function testSameVaultDifferentNonceCannotReplayExpense() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(e,"E","B",20);
        vm.warp(start+2 days);e.execute(a);
        vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);e.execute(b);
        require(e.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testTransferRevertRollsBackConsumptionAndAccounting() public {
        bytes32 a=proposal(t,"E","A",10);
        vm.warp(start+2 days);
        vm.expectRevert();t.execute(a);
        require(registry.consumedBy("E")==address(0)&&t.totalSpent()==0&&t.spent(0)==0);
        token.transfer(address(t),10);t.execute(a);
        require(registry.consumedBy("E")==address(t)&&t.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testCancelledProposalDoesNotConsumeExpense() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"E","B",20);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);e.voteCancel(a);}
        vm.warp(start+2 days);
        vm.expectRevert(V3SharedRestrictedSpend.NotReady.selector);e.execute(a);
        require(registry.consumedBy("E")==address(0));c.execute(b);
        require(registry.consumedBy("E")==address(c)&&token.balanceOf(PAYEE)==20);
    }
    function testDifferentExpensesAndDelay() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"F","B",20);
        vm.expectRevert(V3SharedRestrictedSpend.NotReady.selector);e.execute(a);
        vm.warp(start+2 days);e.execute(a);c.execute(b);
        require(registry.consumedBy("E")==address(e)&&registry.consumedBy("F")==address(c)&&token.balanceOf(PAYEE)==30);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);new V3SharedExpenseFixture(token,signers,FOUNDER,block.timestamp+1 days);
    }
}

```
