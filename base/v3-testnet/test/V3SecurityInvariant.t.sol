// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {VmSuccessor,SuccessorQuote,SuccessorMockCustody,SuccessorMockPoolBuilder,SuccessorCustodyDestination} from "./V3AtomicSuccessor.t.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConditionalDeployer,V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken} from "../src/V3AtomicSuccessorFixture.sol";
import {V3FounderVesting} from "../src/ClimbV3TestToken.sol";
import {V3GovernedGameRewardFixture} from "../src/V3GovernedGameRewardFixture.sol";
import {V3EpochSpendFixture} from "../src/V3EpochSpendFixture.sol";

/// Test-only handler: mock custody, disposable key, no real liquidity or legacy activation.
contract V3SequenceHandler {
    VmSuccessor constant vm=VmSuccessor(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant MONTH=30 days;
    uint256 constant KEY=12345;
    address constant FOUNDER=address(1001);
    address constant PLAYER=address(1003);
    address constant PAYEE=address(1004);
    V3SuccessorTestToken immutable token;
    V3AtomicSuccessorFixture immutable factory;
    SuccessorMockCustody immutable custody;
    uint256 immutable start;
    uint256 public burned;
    uint256 public releasedCalls;
    uint256 public rewardCalls;
    uint256 public expenseCalls;
    mapping(bytes32=>address) public consumed;
    mapping(bytes32=>bool) public rewarded;
    constructor(V3SuccessorTestToken t,V3AtomicSuccessorFixture f,SuccessorMockCustody c,uint256 begin){
        token=t;factory=f;custody=c;start=begin;
    }
    function advance(uint32 raw) external {
        uint256 next=block.timestamp+uint256(raw)%(40 days+1);
        uint256 end=start+65*MONTH;
        vm.warp(next>end?end:next);
    }
    function rotateEpoch() external {custody.rotate();}
    function releaseFounder() external {
        V3FounderVesting f=V3FounderVesting(factory.vaults(0));
        uint256 expected=f.vested();
        if(expected==f.released())return;
        f.release();require(f.released()==expected);releasedCalls++;
    }
    function burnFounder(uint96 raw) external {
        uint256 balance=token.balanceOf(FOUNDER);
        if(balance==0)return;
        uint256 amount=uint256(raw)%balance+1;
        vm.prank(FOUNDER);token.burn(amount);burned+=amount;
    }
    function claimReward(uint8 slot,uint96 raw) external {
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60)return;
        V3GovernedGameRewardFixture g=V3GovernedGameRewardFixture(factory.vaults(1));
        bytes32 id=bytes32(uint256(slot)%16+1);
        if(rewarded[id]){require(g.paid(id));return;}
        uint256 left=1000-g.walletReleased(m,PLAYER);
        uint256 monthLeft=g.monthlyCap(m)-g.monthlyReleased(m);
        if(left>monthLeft)left=monthLeft;
        if(left==0)return;
        uint256 amount=uint256(raw)%left+1;
        V3GovernedGameRewardFixture.Reward memory reward=V3GovernedGameRewardFixture.Reward(id,PLAYER,amount,m,start+(m+1)*MONTH,g.generation());
        (uint8 v,bytes32 x,bytes32 y)=vm.sign(KEY,g.digest(reward));
        g.claim(reward,abi.encodePacked(x,y,v));
        rewarded[id]=true;rewardCalls++;
        require(g.paid(id));
    }
    function spendExpense(uint8 which,uint8 slot,uint96 raw) external {
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60||block.timestamp+2 days>=start+(m+1)*MONTH)return;
        V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(3+uint256(which)%3));
        bytes32 evidence=bytes32(uint256(slot)%16+1);
        if(consumed[evidence]!=address(0)){require(e.registry().consumedBy(evidence)==consumed[evidence]);return;}
        uint256 left=e.monthlyCap(m)-e.spent(m);
        if(left==0)return;
        uint256 amount=uint256(raw)%left+1;
        vm.prank(address(custody));
        bytes32 id=e.propose(PAYEE,amount,evidence,m,bytes32(uint256(expenseCalls+1)),0);
        vm.warp(block.timestamp+2 days);
        e.execute(id);
        consumed[evidence]=address(e);expenseCalls++;
        require(e.registry().consumedBy(evidence)==address(e));
    }
}

contract V3SecurityInvariantTest {
    VmSuccessor constant vm=VmSuccessor(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant SUPPLY=888888888000000;
    uint256 constant MONTH=30 days;
    address constant FOUNDER=address(1001);
    address constant PLAYER=address(1003);
    address constant PAYEE=address(1004);
    V3AtomicSuccessorFixture factory;
    V3SuccessorTestToken token;
    V3SequenceHandler handler;
    function setUp() public {
        vm.chainId(84532);
        SuccessorMockCustody control=new SuccessorMockCustody();
        SuccessorQuote quote=new SuccessorQuote();
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        factory=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        uint256 start=block.timestamp+1 days;
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,vm.addr(12345),control,start,1000,
            V3SuccessorLiquidityConfig(quote,new SuccessorMockPoolBuilder(),address(new SuccessorCustodyDestination()),1000));
        token=factory.create(cfg);
        handler=new V3SequenceHandler(token,factory,control,start);
        vm.warp(start+12*MONTH);
    }
    // Foundry invariant target discovery; only the handler's public mutators are fuzzed.
    function targetContracts() external view returns(address[] memory targets){
        targets=new address[](1);targets[0]=address(handler);
    }
    function invariant_SupplyAndVaultConservation() public view {
        require(token.totalSupply()+handler.burned()==SUPPLY);
        V3FounderVesting f=V3FounderVesting(factory.vaults(0));
        V3GovernedGameRewardFixture g=V3GovernedGameRewardFixture(factory.vaults(1));
        require(f.released()<=f.vested()&&f.released()<=f.ALLOCATION());
        require(g.released()<=g.ALLOCATION());
        require(token.balanceOf(address(f))+f.released()==f.ALLOCATION());
        require(token.balanceOf(FOUNDER)+handler.burned()==f.released());
        require(token.balanceOf(address(g))+g.released()==g.ALLOCATION()&&token.balanceOf(PLAYER)==g.released());
        uint256 expenses;
        for(uint256 i=3;i<6;i++){
            V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(i));
            require(e.totalSpent()<=e.budget()&&token.balanceOf(address(e))+e.totalSpent()==e.budget());
            expenses+=e.totalSpent();
        }
        require(token.balanceOf(PAYEE)==expenses);
        require(token.balanceOf(factory.vaults(2))==222222222000000&&token.balanceOf(factory.vaults(6))==8888888880000);
        require(token.balanceOf(address(factory))==0&&token.balanceOf(address(handler))==0);
    }
    function invariant_MonthlyCapsAndReplayFlags() public view {
        V3GovernedGameRewardFixture g=V3GovernedGameRewardFixture(factory.vaults(1));
        uint256 rewardSum;
        for(uint256 m=0;m<60;m++){
            uint256 released=g.monthlyReleased(m);
            require(released<=g.monthlyCap(m)&&released==g.walletReleased(m,PLAYER)&&released<=1000);
            rewardSum+=released;
        }
        require(rewardSum==g.released());
        for(uint256 i=3;i<6;i++){
            V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(i));
            uint256 sum;
            for(uint256 m=0;m<60;m++){uint256 spent=e.spent(m);require(spent<=e.monthlyCap(m));sum+=spent;}
            require(sum==e.totalSpent());
        }
        V3EpochSpendFixture e0=V3EpochSpendFixture(factory.vaults(3));
        for(uint256 i=1;i<=16;i++){
            bytes32 id=bytes32(i);
            require(g.paid(id)==handler.rewarded(id));
            require(e0.registry().consumedBy(id)==handler.consumed(id));
        }
    }
}
