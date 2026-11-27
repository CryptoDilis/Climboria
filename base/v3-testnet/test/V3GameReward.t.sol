// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3GameRewardFixture} from "../src/V3GameRewardFixture.sol";
interface VmReward {
    function chainId(uint256) external;
    function warp(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert(bytes4) external;
    function expectRevert() external;
}
contract RewardTestAsset is ERC20 {
    constructor() ERC20("Synthetic reward asset","REWARDTEST"){_mint(msg.sender,888888888000000);}
}
contract V3GameRewardTest {
    VmReward constant vm=VmReward(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant KEY=12345;
    address constant FOUNDER=address(99);
    address constant PLAYER=address(100);
    uint256 start;
    RewardTestAsset token;
    V3GameRewardFixture vault;
    function setUp() public {
        vm.chainId(84532);token=new RewardTestAsset();start=block.timestamp+1 days;
        vault=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        token.transfer(address(vault),vault.ALLOCATION());
    }
    function reward(bytes32 id,address recipient,uint256 amount,uint256 m) internal view returns(V3GameRewardFixture.Reward memory){
        return V3GameRewardFixture.Reward(id,recipient,amount,m,start+(m+1)*30 days);
    }
    function sig(V3GameRewardFixture target,V3GameRewardFixture.Reward memory x,uint256 key) internal returns(bytes memory){
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(key,target.digest(x));return abi.encodePacked(r,s,v);
    }
    function testSignedRewardDirectToPlayerAndReplay() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY);vault.claim(x,s);
        require(token.balanceOf(PLAYER)==100&&vault.released()==100&&vault.paid("E")&&vault.walletReleased(0,PLAYER)==100);
        vm.expectRevert(V3GameRewardFixture.AlreadyPaid.selector);vault.claim(x,s);
        x.recipient=address(101);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.AlreadyPaid.selector);vault.claim(x,s);
    }
    function testWrongSignerAndModifiedRecipientRejected() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY+1);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);vault.claim(x,s);
        s=sig(vault,x,KEY);x.recipient=address(101);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);vault.claim(x,s);
    }
    function testCrossVaultSignatureRejected() public {
        V3GameRewardFixture other=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);other.claim(x,s);
    }
    function testMonthAndExpiry() public {
        V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
        vm.warp(start+30 days);vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
        vm.warp(start+60*30 days);vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
    }
    function testWalletCapAndNoRollover() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("A",PLAYER,900,0);vault.claim(x,sig(vault,x,KEY));
        x=reward("B",PLAYER,101,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);vault.claim(x,s);
        vm.warp(start+30 days);x=reward("C",PLAYER,1001,1);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);vault.claim(x,s);
        x=reward("D",PLAYER,1000,1);vault.claim(x,sig(vault,x,KEY));require(vault.released()==1900);
    }
    function testAggregateCap() public {
        V3GameRewardFixture large=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,vault.ALLOCATION());
        token.transfer(address(large),large.ALLOCATION());vm.warp(start);
        V3GameRewardFixture.Reward memory x=reward("A",PLAYER,large.monthlyCap(0),0);large.claim(x,sig(large,x,KEY));
        x=reward("B",address(101),1,0);bytes memory s=sig(large,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);large.claim(x,s);
    }
    function testTransferRevertRollsBackAccounting() public {
        V3GameRewardFixture empty=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);bytes memory s=sig(empty,x,KEY);
        vm.expectRevert();empty.claim(x,s);
        require(!empty.paid("E")&&empty.released()==0&&empty.walletReleased(0,PLAYER)==0);
        token.transfer(address(empty),100);empty.claim(x,s);require(empty.paid("E"));
    }
    function testFounderAndSignerExcluded() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("A",FOUNDER,100,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidReward.selector);vault.claim(x,s);
        x=reward("B",vault.distributor(),100,0);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidReward.selector);vault.claim(x,s);
    }
    function testMainnetRejected() public {
        address signer=vm.addr(KEY);vm.chainId(8453);
        vm.expectRevert(V3GameRewardFixture.InvalidConfig.selector);new V3GameRewardFixture(token,signer,FOUNDER,start,1000);
    }
}
