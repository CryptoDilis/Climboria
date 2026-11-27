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
