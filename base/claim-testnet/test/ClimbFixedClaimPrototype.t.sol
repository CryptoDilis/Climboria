// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbFixedClaimPrototype,ClimbClaimTestToken} from "../src/ClimbFixedClaimPrototype.sol";
interface VmClaim {
 function chainId(uint256) external;
 function warp(uint256) external;
 function prank(address) external;
 function expectRevert(bytes4) external;
}
contract ClimbFixedClaimPrototypeTest {
 VmClaim constant vm=VmClaim(address(uint160(uint256(keccak256("hevm cheat code")))));
 address constant ALICE=address(0xA11CE);
 address constant BOB=address(0xB0B);
 bytes32 constant A=bytes32(uint256(1));
 bytes32 constant B=bytes32(uint256(2));
 ClimbFixedClaimPrototype c;
 ClimbClaimTestToken t;
 bytes32[] ids;
 address[] recipients;
 uint256[] amounts;
 function setUp() public {
  vm.chainId(84532);
  ids.push(A);ids.push(B);
  recipients.push(ALICE);recipients.push(BOB);
  amounts.push(60e6);amounts.push(30e6);
  c=new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,block.timestamp+1 days,address(this));
  t=c.token();
 }
 function testAtomicFundingAndFixedSupply() public view {
  require(t.totalSupply()==1000e6&&t.balanceOf(address(c))==100e6&&t.balanceOf(address(this))==900e6);
  require(c.allocated()==90e6&&c.budget()==100e6&&c.manifestHash()!=bytes32(0));
 }
 function testClaimsDoNotMint() public {
  vm.prank(ALICE);c.claim(A);
  vm.prank(BOB);c.claim(B);
  require(t.balanceOf(ALICE)==60e6&&t.balanceOf(BOB)==30e6&&c.paid()==90e6);
  require(t.totalSupply()==1000e6&&t.balanceOf(address(c))==10e6);
 }
 function testUnauthorizedAndUnknownClaim() public {
  vm.expectRevert(ClimbFixedClaimPrototype.NotEligible.selector);c.claim(A);
  vm.prank(ALICE);vm.expectRevert(ClimbFixedClaimPrototype.NotEligible.selector);c.claim(B);
  vm.expectRevert(ClimbFixedClaimPrototype.NotEligible.selector);c.claim(bytes32(uint256(3)));
 }
 function testRejectReplay() public {
  vm.prank(ALICE);c.claim(A);
  vm.prank(ALICE);vm.expectRevert(ClimbFixedClaimPrototype.AlreadyClaimed.selector);c.claim(A);
  require(c.paid()==60e6);
 }
 function testCloseAndBurnOnlyUnspentBudget() public {
  vm.prank(ALICE);c.claim(A);
  t.transfer(address(c),1e6);
  vm.warp(c.deadline());
  vm.prank(BOB);c.closeAndBurn();
  require(c.burned()==40e6&&c.closed()&&t.totalSupply()==960e6&&t.balanceOf(address(c))==1e6);
  vm.expectRevert(ClimbFixedClaimPrototype.AlreadyClosed.selector);c.closeAndBurn();
 }
 function testDeadlineAndEarlyClose() public {
  vm.expectRevert(ClimbFixedClaimPrototype.TooEarly.selector);c.closeAndBurn();
  vm.warp(c.deadline());
  vm.prank(ALICE);vm.expectRevert(ClimbFixedClaimPrototype.ClaimClosed.selector);c.claim(A);
  c.closeAndBurn();require(t.totalSupply()==900e6);
 }
 function testRejectDuplicateEntitlement() public {
  ids[1]=A;
  vm.expectRevert(ClimbFixedClaimPrototype.InvalidManifest.selector);
  new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,block.timestamp+1 days,address(this));
 }
 function testRejectExcessAllocation() public {
  amounts[1]=41e6;
  vm.expectRevert(ClimbFixedClaimPrototype.InvalidManifest.selector);
  new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,block.timestamp+1 days,address(this));
 }
 function testRejectZeroRecipientAndWindow() public {
  recipients[1]=address(0);
  vm.expectRevert(ClimbFixedClaimPrototype.InvalidManifest.selector);
  new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,block.timestamp+1 days,address(this));
  recipients[1]=BOB;
  vm.expectRevert(ClimbFixedClaimPrototype.InvalidWindow.selector);
  new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,block.timestamp,address(this));
 }
 function testRejectMainnet() public {
  vm.chainId(8453);
  vm.expectRevert(ClimbFixedClaimPrototype.WrongChain.selector);
  new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,block.timestamp+1 days,address(this));
 }
 function testNoAdminOrMintOrForcedBurn() public {
  (bool m,)=address(t).call(abi.encodeWithSignature("mint(address,uint256)",ALICE,1));
  (bool b,)=address(t).call(abi.encodeWithSignature("burnFrom(address,uint256)",address(c),1));
  (bool a,)=address(c).call(abi.encodeWithSignature("setAward(bytes32,uint256)",A,1));
  require(!m&&!b&&!a&&t.totalSupply()==1000e6);
 }
 function testManifestDomainSeparatesInstances() public {
  ClimbFixedClaimPrototype other=new ClimbFixedClaimPrototype(ids,recipients,amounts,100e6,c.deadline(),address(this));
  require(c.manifestHash()!=other.manifestHash());
 }
}
