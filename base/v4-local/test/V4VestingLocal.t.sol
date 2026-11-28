// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V4VestingLocal} from "../src/V4VestingLocal.sol";
interface VmVestingLocal {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}
contract VestingSyntheticAsset is ERC20 {
    V4VestingLocal public immutable team;
    V4VestingLocal public immutable advisors;
    constructor(address a,address b) ERC20("Vesting fixture only","VESTLOCAL"){
        require(block.chainid==31337&&a!=b&&a!=msg.sender&&b!=msg.sender);
        team=new V4VestingLocal(a,block.timestamp,false);
        advisors=new V4VestingLocal(b,block.timestamp,true);
        _mint(address(team),88888888800000);
        _mint(address(advisors),17777777760000);
    }
    function decimals() public pure override returns(uint8){return 6;}
}
contract V4VestingLocalTest {
    VmVestingLocal constant vm=VmVestingLocal(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant START=100 days;
    uint256 constant TEAM=88888888800000;
    uint256 constant ADVISORS=17777777760000;
    address constant FOUNDER=address(0x100001);
    address constant ADVISOR=address(0x100002);
    VestingSyntheticAsset asset;
    V4VestingLocal team;V4VestingLocal advisors;
    function setUp() public {
        vm.chainId(31337);vm.warp(START);
        asset=new VestingSyntheticAsset(FOUNDER,ADVISOR);team=asset.team();advisors=asset.advisors();
    }
    function testExactSeparateAllocations() public view {
        require(team.allocation()==TEAM&&advisors.allocation()==ADVISORS);
        require(asset.balanceOf(address(team))==TEAM&&asset.balanceOf(address(advisors))==ADVISORS);
        require(asset.totalSupply()==TEAM+ADVISORS&&asset.balanceOf(FOUNDER)==0&&asset.balanceOf(ADVISOR)==0);
    }
    function testCliffExactBoundary() public {
        vm.warp(START+360 days-1);vm.expectRevert();team.release();
        vm.warp(START+360 days);vm.expectRevert();advisors.release();
        require(team.releasable()==0&&advisors.releasable()==0);
        vm.warp(START+360 days+1);
        require(team.releasable()==TEAM/1080 days&&advisors.releasable()==ADVISORS/1080 days);
    }
    function testMidpointAndFullVestingNoDust() public {
        vm.warp(START+900 days);team.release();advisors.release();
        require(asset.balanceOf(FOUNDER)==TEAM/2&&asset.balanceOf(ADVISOR)==ADVISORS/2);
        vm.warp(START+1440 days-1);team.release();advisors.release();
        require(team.released()<TEAM&&advisors.released()<ADVISORS);
        vm.warp(START+1440 days);team.release();advisors.release();
        require(team.released()==TEAM&&advisors.released()==ADVISORS);
        require(asset.balanceOf(address(team))==0&&asset.balanceOf(address(advisors))==0);
        require(asset.balanceOf(FOUNDER)==TEAM&&asset.balanceOf(ADVISOR)==ADVISORS);
        vm.expectRevert();team.release();
    }
    function testPermissionlessTriggerCannotRedirectPayment() public {
        vm.warp(START+720 days);address caller=address(0x100003);
        vm.prank(caller);team.release();
        require(asset.balanceOf(caller)==0&&asset.balanceOf(FOUNDER)==TEAM/3);
        (bool ok,)=address(team).call(abi.encodeWithSignature("setBeneficiary(address)",caller));require(!ok);
        (ok,)=address(team).call(abi.encodeWithSignature("withdraw(address,uint256)",caller,1));require(!ok);
        (ok,)=address(team).call(abi.encodeWithSignature("revoke()"));require(!ok);
    }
    function testTransferFailureRollsBackRelease() public {
        vm.prank(address(team));require(asset.transfer(address(this),TEAM));
        vm.warp(START+900 days);
        vm.expectRevert();team.release();
        require(team.released()==0&&team.releasable()==TEAM/2);
        require(asset.transfer(address(team),TEAM));
        team.release();require(team.released()==TEAM/2);
    }
    function testExtraDepositDoesNotExpandVesting() public {
        vm.warp(START+1440 days);advisors.release();
        vm.prank(ADVISOR);require(asset.transfer(address(team),1));
        team.release();
        require(team.released()==TEAM&&asset.balanceOf(address(team))==1);
        vm.expectRevert();team.release();
    }
    function testRejectInvalidRecipientsAndPublicChains() public {
        vm.expectRevert();new VestingSyntheticAsset(FOUNDER,FOUNDER);
        vm.expectRevert();new VestingSyntheticAsset(address(0),ADVISOR);
        vm.expectRevert();new VestingSyntheticAsset(address(this),ADVISOR);
        vm.chainId(84532);vm.expectRevert();new VestingSyntheticAsset(FOUNDER,ADVISOR);
        vm.chainId(8453);vm.expectRevert();new VestingSyntheticAsset(FOUNDER,ADVISOR);
        vm.warp(START+900 days);vm.expectRevert();team.release();
    }
    function testFuzz_VestedMonotonicAndCapped(uint256 rawA,uint256 rawB) public view {
        uint256 a=START+rawA%2000 days;uint256 b=START+rawB%2000 days;
        if(a>b)(a,b)=(b,a);
        require(team.vestedAt(a)<=team.vestedAt(b)&&team.vestedAt(b)<=TEAM);
        require(advisors.vestedAt(a)<=advisors.vestedAt(b)&&advisors.vestedAt(b)<=ADVISORS);
    }
    function testFuzz_PartialThenFinalReleaseConservesBalances(uint256 raw) public {
        vm.warp(START+360 days+1+raw%1080 days);
        team.release();advisors.release();
        require(team.released()+asset.balanceOf(address(team))==TEAM);
        require(advisors.released()+asset.balanceOf(address(advisors))==ADVISORS);
        vm.warp(START+1440 days);
        if(team.releasable()>0)team.release();
        if(advisors.releasable()>0)advisors.release();
        require(asset.balanceOf(FOUNDER)==TEAM&&asset.balanceOf(ADVISOR)==ADVISORS);
        require(asset.totalSupply()==TEAM+ADVISORS);
    }
}
