// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbV3IntegratedTestToken} from "../src/ClimbV3IntegratedTestToken.sol";
import {V3GamingVault} from "../src/ClimbV3TestToken.sol";
import {V3RestrictedSpend} from "../src/V3RestrictedSpend.sol";
interface VmIntegrated {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract ClimbV3IntegratedTestTokenTest {
    VmIntegrated constant vm=VmIntegrated(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(0xF00D);
    address constant DISTRIBUTOR=address(0xB0B);
    address constant PAYEE=address(0xCAFE);
    uint256 constant SUPPLY=888888888000000;
    uint256 start;
    address[5] signers;
    ClimbV3IntegratedTestToken t;
    function setUp() public {
        vm.chainId(84532);
        start=block.timestamp+1 days;
        for(uint256 i=0;i<5;i++)signers[i]=address(uint160(1000+i));
        t=new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
    function testExactFundingAndAssetBinding() public view {
        require(t.totalSupply()==SUPPLY&&t.decimals()==6);
        require(t.balanceOf(address(t.founderVault()))==17777777760000);
        require(t.balanceOf(address(t.gamingVault()))==311111110800000);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
        V3RestrictedSpend[3] memory v=[t.ecosystemReserve(),t.communityReserve(),t.treasuryReserve()];
        uint256[3] memory caps=[uint256(133333333200000),88888888800000,106666666560000];
        for(uint256 i=0;i<3;i++){
            require(address(v[i].token())==address(t)&&v[i].budget()==caps[i]&&t.balanceOf(address(v[i]))==caps[i]);
        }
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==0&&t.balanceOf(DISTRIBUTOR)==0);
    }
    function propose(V3RestrictedSpend v,uint256 amount) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,"MILESTONE",0,"NONCE");
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testReleaseBoundToOneReserve() public {
        V3RestrictedSpend v=t.ecosystemReserve();
        uint256 amount=v.monthlyCap(0);
        bytes32 id=propose(v,amount);
        vm.warp(start+2 days);
        V3RestrictedSpend other=t.treasuryReserve();
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);other.execute(id);
        v.execute(id);
        require(t.balanceOf(PAYEE)==amount&&v.totalSpent()==amount);
        require(t.balanceOf(address(v))==v.budget()-amount);
        require(t.treasuryReserve().totalSpent()==0&&t.communityReserve().totalSpent()==0);
        require(t.totalSupply()==SUPPLY);
    }
    function testConcurrentReleaseAndBurnConservation() public {
        uint256 amount=1000000;
        bytes32 a=propose(t.ecosystemReserve(),amount);
        bytes32 b=propose(t.communityReserve(),amount);
        require(a!=b);
        vm.warp(start+2 days);
        t.ecosystemReserve().execute(a);
        t.communityReserve().execute(b);
        V3GamingVault game=t.gamingVault();
        vm.prank(DISTRIBUTOR);game.release(amount);
        vm.prank(PAYEE);t.burn(amount);
        require(t.totalSupply()==SUPPLY-amount);
        require(t.balanceOf(PAYEE)==amount&&t.balanceOf(DISTRIBUTOR)==amount);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
    }
    function testNoLiquidityOrLegacyRelease() public {
        (bool a,)=address(t.liquidityReserve()).call(abi.encodeWithSignature("release(address,uint256)",PAYEE,1));
        (bool b,)=address(t.legacyReserve()).call(abi.encodeWithSignature("release(address,uint256)",PAYEE,1));
        require(!a&&!b);
    }
    function testRejectSignerDistributorOverlap() public {
        signers[0]=DISTRIBUTOR;
        vm.expectRevert(ClimbV3IntegratedTestToken.InvalidConfig.selector);
        new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbV3IntegratedTestToken.WrongChain.selector);
        new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
}
