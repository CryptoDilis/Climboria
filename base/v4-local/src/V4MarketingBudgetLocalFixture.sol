// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

/// @notice Local accounting model only. No token transfer, mint, custody, or allowance.
/// @dev Proposed test semantics: fixed 30-day periods from TGE, current plus two prior
/// periods, oldest credits first. Exceptional spending is deliberately not implemented.
/// These choices require policy confirmation before an operational release vault.
library V4MarketingBudget {
    error InvalidBudget();
    uint256 internal constant POOL = 62222222160000;
    uint256 internal constant CAP = 3111111108000;
    uint256 internal constant PERIOD = 30 days;
    struct State {
        uint256 month;
        uint256 spent;
        uint256[3] credit; // current, previous, second previous
    }
    function initial() internal pure returns(State memory s) {
        // Genesis marketing tranche already counts as month zero spending.
        s.spent = CAP;
    }
    function advance(State memory s,uint256 month) internal pure returns(State memory) {
        if(month<s.month) revert InvalidBudget();
        uint256 d=month-s.month;
        if(d==1) {
            s.credit[2]=s.credit[1];
            s.credit[1]=s.credit[0];
            s.credit[0]=CAP;
        } else if(d==2) {
            s.credit[2]=s.credit[0];
            s.credit[1]=CAP;
            s.credit[0]=CAP;
        } else if(d>=3) {
            s.credit=[CAP,CAP,CAP];
        }
        s.month=month;
        return s;
    }
    function available(State memory s) internal pure returns(uint256) {
        uint256 credits=s.credit[0]+s.credit[1]+s.credit[2];
        uint256 left=POOL-s.spent;
        return credits<left?credits:left;
    }
    function consume(State memory s,uint256 month,uint256 amount) internal pure returns(State memory) {
        s=advance(s,month);
        if(amount==0||amount>available(s)) revert InvalidBudget();
        uint256 due=amount;
        for(uint256 i=3;i>0&&due>0;) {
            --i;
            uint256 take=s.credit[i]<due?s.credit[i]:due;
            s.credit[i]-=take;
            due-=take;
        }
        assert(due==0);
        s.spent+=amount;
        return s;
    }
}

/// @notice LOCAL-ONLY harness for budget verification. Controller is NOT a Safe.
/// @dev No financial action; recordSpend only mutates accounting counters. No exception,
/// reset, cap edit, clock injection or public-chain deployment path.
contract V4MarketingBudgetLocalFixture {
    error InvalidContext();
    using V4MarketingBudget for V4MarketingBudget.State;
    uint256 public immutable start;
    address public immutable controller;
    V4MarketingBudget.State private state;
    constructor(uint256 tge) {
        if(block.chainid!=31337||tge==0||tge>block.timestamp) revert InvalidContext();
        start=tge;
        controller=msg.sender;
        state=V4MarketingBudget.initial();
    }
    function currentMonth() public view returns(uint256) {
        if(block.timestamp<start) revert InvalidContext();
        return (block.timestamp-start)/V4MarketingBudget.PERIOD;
    }
    function snapshot() external view returns(uint256 month,uint256 spent,uint256[3] memory credit,uint256 capacity) {
        V4MarketingBudget.State memory s=state.advance(currentMonth());
        return(s.month,s.spent,s.credit,s.available());
    }
    function recordSpend(uint256 amount) external {
        if(block.chainid!=31337||msg.sender!=controller) revert InvalidContext();
        state=state.consume(currentMonth(),amount);
    }
}
