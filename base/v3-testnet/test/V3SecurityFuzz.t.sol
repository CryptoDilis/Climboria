// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbV3TestTokenTest} from "./ClimbV3TestToken.t.sol";
import {V3GovernedGameRewardTest} from "./V3GovernedGameReward.t.sol";
import {V3EpochPolicyTest} from "./V3EpochPolicy.t.sol";
import {V3GovernedGameRewardFixture} from "../src/V3GovernedGameRewardFixture.sol";
import {V3EpochSpendFixture} from "../src/V3EpochSpendFixture.sol";

// Focused property tests reusing existing test-only setup; no contract source changes.
contract V3AllocationFuzz is ClimbV3TestTokenTest {
    function testFuzz_FounderCumulativeCeiling(uint256 raw) public {
        uint256 elapsed=raw%(65*MONTH);
        vm.warp(start+elapsed);
        uint256 m=elapsed/MONTH;
        uint256 expected=m<=12?0:m>=48?F:F*(m-12)/36;
        require(f.vested()==expected);
        if(expected!=0) f.release();
        require(f.released()==expected&&t.balanceOf(FOUNDER)==expected);
        require(t.balanceOf(address(f))==F-expected&&t.totalSupply()==SUPPLY);
    }
}
contract V3RewardFuzz is V3GovernedGameRewardTest {
    function testFuzz_MonthlyCapTelescopes(uint256 raw) public view {
        uint256 month=raw%65;
        uint256 allocation=vault.ALLOCATION();
        uint256[5] memory weights=[uint256(30),25,20,15,10];
        if(month>=60){require(vault.monthlyCap(month)==0);return;}
        uint256 year=month/12;
        uint256 prior;
        for(uint256 i=0;i<year;i++) prior+=weights[i];
        uint256 annual=allocation*(prior+weights[year])/100-allocation*prior/100;
        uint256 j=month%12;
        require(vault.monthlyCap(month)==annual*(j+1)/12-annual*j/12);
    }
    function testFuzz_RewardReplayAndWalletCap(uint96 raw) public {
        uint256 amount=uint256(raw)%1000+1;
        V3GovernedGameRewardFixture.Reward memory r=reward("FUZZ",amount,1);
        vault.claim(r,sign(r,A));
        rotate(vm.addr(B));r.generation=3;
        bytes memory s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.AlreadyPaid.selector);vault.claim(r,s);
        r.eventId="NEXT";r.amount=1001-amount;s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.CapExceeded.selector);vault.claim(r,s);
        require(vault.released()==amount&&vault.monthlyReleased(0)==amount&&vault.walletReleased(0,PLAYER)==amount&&vault.paid("FUZZ")&&!vault.paid("NEXT"));
    }
}
contract V3ExpenseFuzz is V3EpochPolicyTest {
    function testFuzz_CrossReserveSingleUse(uint96 raw) public {
        uint256 amount=uint256(raw)%c.monthlyCap(0)+1;
        bytes32 a=propose(e,"FUZZ-E","A",amount);
        bytes32 b=propose(c,"FUZZ-E","B",amount);
        vm.warp(start+2 days);
        e.execute(a);
        (bool ok,)=address(c).call(abi.encodeCall(c.execute,(b)));
        require(!ok&&e.totalSpent()==amount&&c.totalSpent()==0);
        require(factory.registry().consumedBy("FUZZ-E")==address(e)&&token.balanceOf(PAYEE)==amount);
    }
    function testFuzz_PastMonthRejected(uint256 raw) public {
        uint256 month=raw%59;
        vm.warp(start+(month+1)*30 days);
        vm.expectRevert(V3EpochSpendFixture.InvalidProposal.selector);
        control.propose(e,PAYEE,1,"PAST","N",month);
        require(e.totalSpent()==0&&factory.registry().consumedBy("PAST")==address(0));
    }
}
