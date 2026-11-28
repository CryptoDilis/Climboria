// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V4MarketingBudget,V4MarketingBudgetLocalFixture} from "../src/V4MarketingBudgetLocalFixture.sol";
interface VmBudget {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract V4MarketingBudgetLocalTest {
    VmBudget constant vm=VmBudget(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant CAP=3111111108000;
    uint256 constant POOL=62222222160000;
    uint256 constant START=100 days;
    V4MarketingBudgetLocalFixture budget;
    function setUp() public {vm.chainId(31337);vm.warp(START);budget=new V4MarketingBudgetLocalFixture(START);}
    function at(uint256 month) private {vm.warp(START+month*30 days);}
    function capacity() private view returns(uint256 a) {(,,,a)=budget.snapshot();}
    function testTGEAlreadyConsumedAndBoundary() public {
        require(capacity()==0);
        vm.warp(START+30 days-1);require(capacity()==0);
        vm.expectRevert(V4MarketingBudget.InvalidBudget.selector);budget.recordSpend(1);
        at(1);require(capacity()==CAP);
        budget.recordSpend(CAP);require(capacity()==0);
    }
    function testNoDuplicateInitialRelease() public {
        (,uint256 spent,,)=budget.snapshot();require(spent==CAP);
        vm.expectRevert(V4MarketingBudget.InvalidBudget.selector);budget.recordSpend(CAP);
        (,spent,,)=budget.snapshot();require(spent==CAP);
    }
    function testTwoPriorMonthsAndExpiration() public {
        at(2);require(capacity()==2*CAP);
        at(3);require(capacity()==3*CAP);
        at(1000000);require(capacity()==3*CAP);
    }
    function testOldestFirstAndPartialRollover() public {
        at(3);budget.recordSpend(CAP+1);
        (,,uint256[3] memory c,uint256 a)=budget.snapshot();
        require(c[2]==0&&c[1]==CAP-1&&c[0]==CAP&&a==2*CAP-1);
        at(4);require(capacity()==3*CAP-1);
        at(5);require(capacity()==3*CAP);
    }
    function testLifetimeCapEvenWithSkippedMonths() public {
        for(uint256 m=1;m<=19;++m){at(m);budget.recordSpend(CAP);}
        at(100);require(capacity()==0);
        (,uint256 spent,,)=budget.snapshot();require(spent==POOL);
        vm.expectRevert(V4MarketingBudget.InvalidBudget.selector);budget.recordSpend(1);
    }
    function testLifetimeClampsAccumulatedCredits() public {
        for(uint256 m=1;m<=18;++m){at(m);budget.recordSpend(CAP);}
        at(30);require(capacity()==CAP);
        budget.recordSpend(CAP);require(capacity()==0);
    }
    function testUnauthorizedZeroAndOverspendRollback() public {
        at(1);
        vm.prank(address(0x100001));vm.expectRevert(V4MarketingBudgetLocalFixture.InvalidContext.selector);budget.recordSpend(1);
        vm.expectRevert(V4MarketingBudget.InvalidBudget.selector);budget.recordSpend(0);
        vm.expectRevert(V4MarketingBudget.InvalidBudget.selector);budget.recordSpend(CAP+1);
        require(capacity()==CAP);
    }
    function testClockRollbackRejectedAfterRecordedSpend() public {
        at(3);budget.recordSpend(1);at(2);
        vm.expectRevert(V4MarketingBudget.InvalidBudget.selector);budget.recordSpend(1);
        at(3);require(capacity()==3*CAP-1);
    }
    function testNoExceptionOrResetAndPublicChainBlocked() public {
        (bool exceptionOk,)=address(budget).call(abi.encodeWithSignature("exception(uint256)",CAP));
        (bool resetOk,)=address(budget).call(abi.encodeWithSignature("reset()"));
        require(!exceptionOk&&!resetOk);
        vm.chainId(84532);vm.expectRevert(V4MarketingBudgetLocalFixture.InvalidContext.selector);new V4MarketingBudgetLocalFixture(START);
        vm.chainId(8453);vm.expectRevert(V4MarketingBudgetLocalFixture.InvalidContext.selector);new V4MarketingBudgetLocalFixture(START);
    }
    function testFuzz_BoundedMonotonicSpend(uint256 seed) public {
        uint256 m;uint256 expected=CAP;
        for(uint256 i;i<24;++i){
            seed=uint256(keccak256(abi.encode(seed,i)));
            m+=seed%5;at(m);
            uint256 avail=capacity();
            require(avail<=3*CAP&&avail<=POOL-expected);
            if(avail>0){uint256 amount=1+(seed%avail);budget.recordSpend(amount);expected+=amount;}
            (,uint256 spent,,uint256 remaining)=budget.snapshot();
            require(spent==expected&&spent<=POOL&&remaining<=POOL-spent);
        }
    }
}
