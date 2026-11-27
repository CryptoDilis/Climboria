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
