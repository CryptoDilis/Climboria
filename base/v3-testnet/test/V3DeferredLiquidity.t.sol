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
        control.cancel(b);control.rotate();vault.syncEpoch();quote.transfer(address(vault),500);
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
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3DeferredLiquidityFixture.InvalidConfig.selector);
        new V3DeferredLiquidityFixture(asset,quote,IV3SyntheticPool(address(pool)),control,address(destination),1000);
    }
}
