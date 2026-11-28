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
        V3GovernedGameRewardFixture target=V3GovernedGameRewardFixture(_target(1,expected));
        // Effects precede interaction; a failed schedule rolls back the context and event.
        _onNomination(signer);
        target.schedule(expected,generation,signer,validAfter,validUntil);
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
        V3LegacyProofClaimFixture target=V3LegacyProofClaimFixture(_target(6,expected));
        legacyScheduleSerial++;
        target.schedule(digest,expiresAt);
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
