// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Local-only vesting experiment. No migration, beneficiary rotation, revocation,
/// arbitrary withdrawal, or integration with the V4 genesis factory at this stage.
/// @dev Proposed test assumptions: 30-day months and continuous per-second linear accrual
/// after a zero-unlock 12-month cliff. Production interpretation remains unapproved.
contract V4VestingLocal {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error NothingDue();
    uint256 public constant TEAM=88888888800000;
    uint256 public constant ADVISORS=17777777760000;
    uint256 public constant CLIFF=360 days;
    uint256 public constant DURATION=1080 days;
    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable start;
    uint256 public immutable allocation;
    uint256 public released;
    event Released(address indexed beneficiary,uint256 amount,uint256 cumulative);
    // Constructor is called only by the isolated synthetic issuer in tests.
    constructor(address recipient,uint256 tge,bool advisor) {
        if(block.chainid!=31337||recipient==address(0)||recipient==address(this)||
           recipient==msg.sender||uint160(recipient)<=0xffff||recipient.code.length!=0||
           tge==0||tge!=block.timestamp)revert InvalidConfig();
        token=IERC20(msg.sender);beneficiary=recipient;start=tge;
        allocation=advisor?ADVISORS:TEAM;
    }
    function vestedAt(uint256 timestamp) public view returns(uint256){
        if(timestamp<=start+CLIFF)return 0;
        uint256 elapsed=timestamp-start-CLIFF;
        if(elapsed>=DURATION)return allocation;
        return allocation*elapsed/DURATION;
    }
    function releasable() public view returns(uint256){
        uint256 vested=vestedAt(block.timestamp);
        return vested>released?vested-released:0;
    }
    function release() external {
        if(block.chainid!=31337)revert InvalidConfig();
        uint256 amount=releasable();
        if(amount==0)revert NothingDue();
        released+=amount;
        token.safeTransfer(beneficiary,amount);
        emit Released(beneficiary,amount,released);
    }
}
