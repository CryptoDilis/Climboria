// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3GovernedGameRewardFixture,IV3RewardCustody} from "../src/V3GovernedGameRewardFixture.sol";
import {RewardTestAsset,VmReward} from "./V3GameReward.t.sol";

contract V3GovernedGameRewardTest is IV3RewardCustody {
    VmReward constant vm=VmReward(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant A=12345;
    uint256 constant B=23456;
    address constant FOUNDER=address(99);
    address constant PLAYER=address(100);
    uint256 public override epoch=1;
    uint256 public override threshold=3;
    uint256 public override memberCount=5;
    mapping(address=>bool) public excluded;
    RewardTestAsset token;
    V3GovernedGameRewardFixture vault;
    uint256 start;
    function rewardSignerAllowed(address a) external view override returns(bool){return !excluded[a];}
    function setUp() public {
        vm.chainId(84532);token=new RewardTestAsset();start=block.timestamp+1 days;
        vault=new V3GovernedGameRewardFixture(token,vm.addr(A),FOUNDER,start,1000,this);
        token.transfer(address(vault),vault.ALLOCATION());
        vm.warp(start);
    }
    function reward(bytes32 id,uint256 amount,uint256 gen) internal view returns(V3GovernedGameRewardFixture.Reward memory){
        return V3GovernedGameRewardFixture.Reward(id,PLAYER,amount,0,start+30 days,gen);
    }
    function sign(V3GovernedGameRewardFixture.Reward memory r,uint256 key) internal returns(bytes memory){
        (uint8 v,bytes32 x,bytes32 y)=vm.sign(key,vault.digest(r));return abi.encodePacked(x,y,v);
    }
    function schedule(address signer) internal {
        vault.schedule(epoch,vault.generation(),signer,block.timestamp,block.timestamp+1 days);
    }
    function rotate(address signer) internal {
        vault.revoke(epoch,vault.generation());schedule(signer);
        vm.warp(block.timestamp+2 days);vault.activate(epoch,vault.generation(),vault.rotationSerial(),signer);
    }
    function testRevocationStopsClaimsAndGenerationPreventsReplayAfterReuse() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("OLD",100,1);
        bytes memory old=sign(r,A);
        vault.revoke(1,1);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,old);
        schedule(vm.addr(B));vm.warp(block.timestamp+2 days);vault.activate(1,2,1,vm.addr(B));
        rotate(vm.addr(A));
        require(vault.generation()==5&&vault.distributor()==vm.addr(A));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,old);
        r.generation=5;vault.claim(r,sign(r,A));require(vault.paid("OLD"));
    }
    function testAccountingAndPaidIdsPersistAcrossRotation() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("PAID",900,1);vault.claim(r,sign(r,A));
        rotate(vm.addr(B));
        r.generation=3;
        bytes memory s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.AlreadyPaid.selector);vault.claim(r,s);
        r.eventId="NEW";r.amount=101;s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.CapExceeded.selector);vault.claim(r,s);
        r.amount=100;vault.claim(r,sign(r,B));
        require(vault.released()==1000&&vault.monthlyReleased(0)==1000&&vault.walletReleased(0,PLAYER)==1000);
    }
    function testDelayExpiryAndScheduleSerial() public {
        vault.revoke(1,1);schedule(vm.addr(B));address b=vm.addr(B);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,1,b);
        vault.cancel(1,2,1);schedule(b);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,1,b);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.cancel(1,2,1);
        vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,2,b);
        schedule(b);vm.warp(block.timestamp+2 days);vault.activate(1,2,3,b);
    }
    function testEpochAndRoleChangeInvalidatePendingActivation() public {
        vault.revoke(1,1);address b=vm.addr(B);schedule(b);
        vm.warp(block.timestamp+2 days);epoch=2;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(2,2,1,b);
        schedule(b);vm.warp(block.timestamp+2 days);excluded[b]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(2,2,2,b);
        excluded[b]=false;vault.activate(2,2,2,b);
    }
    function testUnauthorizedAndInvalidWindow() public {
        (bool ok,)=address(new RewardUntrustedCaller()).call(abi.encodeCall(RewardUntrustedCaller.revoke,(vault)));
        require(!ok&&vault.generation()==1);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.revoke(1,2);
        vault.revoke(1,1);address b=vm.addr(B);excluded[b]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.schedule(1,2,b,block.timestamp,block.timestamp+1 days);
        excluded[b]=false;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.schedule(1,2,b,block.timestamp,block.timestamp+2 days);
    }
    function testSignerAndCustodyRoleChangesFailClosed() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("E",100,1);
        bytes memory s=sign(r,A);excluded[vm.addr(A)]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,s);
        excluded[vm.addr(A)]=false;threshold=2;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.claim(r,s);
        threshold=3;vault.claim(r,s);require(vault.paid("E"));
    }
}
contract RewardUntrustedCaller {
    function revoke(V3GovernedGameRewardFixture vault) external {vault.revoke(1,1);}
}
