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
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3DeferredLegacyFixture.InvalidConfig.selector);
        new V3DeferredLegacyFixture(IV3BurnableAsset(address(asset)),control);
    }
}
