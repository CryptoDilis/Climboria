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
