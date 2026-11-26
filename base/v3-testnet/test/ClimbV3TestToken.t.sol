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
