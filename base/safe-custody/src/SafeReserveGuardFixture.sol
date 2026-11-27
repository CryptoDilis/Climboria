// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {SafeEpochGuardFixture,SafeGuardBootstrapFixture} from "./SafeEpochGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorTestToken} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3DeferredLiquidityFixture} from "v3-src/V3DeferredLiquidityFixture.sol";
import {V3DeferredLegacyFixture} from "v3-src/V3DeferredLegacyFixture.sol";
import {V3FounderVesting} from "v3-src/ClimbV3TestToken.sol";
import {V3GameRewardFixture} from "v3-src/V3GameRewardFixture.sol";

/// @notice Test-only typed governance adapter over actual pinned Safe.
/// One fixed successor, one quorum-approved binding, no generic call or transfer.
/// Not a production dependency, actual eligibility or real liquidity adapter.
contract SafeReserveGuardFixture is SafeEpochGuardFixture {
    V3AtomicSuccessorFixture public immutable successor;
    bytes32 public immutable successorHash;
    bool public bound;
    address public founder;
    address public distributor;
    V3SuccessorTestToken public asset;
    address[7] public destinations;
    bytes32[7] public destinationHashes;
    event Bound(address indexed asset,address[7] vaults);
    constructor(Safe account,address implementation,V3AtomicSuccessorFixture fixedSuccessor)
        SafeEpochGuardFixture(account,implementation){
        if(address(fixedSuccessor).code.length==0||fixedSuccessor.used())revert InvalidConfig();
        successor=fixedSuccessor;successorHash=address(fixedSuccessor).codehash;
    }
    function _current(uint256 expected) private view {
        validateConfig();
        if(expected!=epoch)revert Forbidden();
    }
    function bindSuccessor(uint256 expected) external onlyWallet {
        _current(expected);
        if(bound||address(successor).codehash!=successorHash||!successor.used())revert InvalidConfig();
        V3SuccessorTestToken t=successor.token();
        if(address(t).code.length==0||!t.issued()||t.issuer()!=address(successor)||t.totalSupply()!=t.INITIAL_SUPPLY())revert InvalidConfig();
        for(uint256 i=0;i<7;i++){
            address v=successor.vaults(i);
            if(v.code.length==0||v==address(this)||v==address(wallet))revert InvalidConfig();
            for(uint256 j=0;j<i;j++)if(v==destinations[j])revert InvalidConfig();
            destinations[i]=v;destinationHashes[i]=v.codehash;
        }
        V3FounderVesting f=V3FounderVesting(destinations[0]);
        V3GameRewardFixture g=V3GameRewardFixture(destinations[1]);
        if(address(f.token())!=address(t)||address(g.token())!=address(t))revert InvalidConfig();
        founder=f.beneficiary();distributor=g.distributor();
        if(wallet.isOwner(founder)||wallet.isOwner(distributor)||founder==address(wallet)||distributor==address(wallet)||
            founder==address(this)||distributor==address(this))revert InvalidConfig();
        V3DeferredLiquidityFixture l=V3DeferredLiquidityFixture(destinations[2]);
        V3DeferredLegacyFixture legacy=V3DeferredLegacyFixture(destinations[6]);
        if(address(l.asset())!=address(t)||address(l.custody())!=address(this)||
           address(legacy.token())!=address(t)||address(legacy.custody())!=address(this))revert InvalidConfig();
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(destinations[i]);
            if(address(v.token())!=address(t)||address(v.custody())!=address(this)||
               address(v.registry())!=address(successor.expenses().registry())||v.excludedFounder()!=founder)revert InvalidConfig();
        }
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
    function proposeExpense(uint256 expected,uint256 i,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external onlyWallet {
        if(recipient==address(wallet)||recipient==distributor)revert Forbidden();
        for(uint256 j=0;j<7;j++)if(recipient==destinations[j])revert Forbidden();
        _expense(i,expected).propose(recipient,amount,evidence,month,nonce);
    }
    function cancelExpense(uint256 expected,uint256 i,bytes32 id) external onlyWallet {_expense(i,expected).cancel(id);}
    function scheduleLiquidity(uint256 expected,uint256 a,uint256 q,uint256 minShares,uint256 deadline,bytes32 nonce) external onlyWallet {
        V3DeferredLiquidityFixture(_target(2,expected)).schedule(a,q,minShares,deadline,nonce);
    }
    function cancelLiquidity(uint256 expected,bytes32 id) external onlyWallet {V3DeferredLiquidityFixture(_target(2,expected)).cancel(id);}
    function scheduleLegacy(uint256 expected,bytes32 digest,uint256 expiresAt) external onlyWallet {V3DeferredLegacyFixture(_target(6,expected)).schedule(digest,expiresAt);}
    function cancelLegacy(uint256 expected) external onlyWallet {V3DeferredLegacyFixture(_target(6,expected)).cancel();}
    function _rotationOwnerAllowed(address a) internal view override returns(bool){
        // Prevent changes before binding and known role conflicts afterwards.
        return bound&&a!=founder&&a!=distributor;
    }
    function _policyCallAllowed(bytes4 selector,uint256 len) internal view override returns(bool){
        if(!bound)return selector==this.bindSuccessor.selector&&len==36;
        return (selector==this.proposeExpense.selector&&len==228)||
               (selector==this.cancelExpense.selector&&len==100)||
               (selector==this.scheduleLiquidity.selector&&len==196)||
               (selector==this.cancelLiquidity.selector&&len==68)||
               (selector==this.scheduleLegacy.selector&&len==100)||
               (selector==this.cancelLegacy.selector&&len==36);
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
