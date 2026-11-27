// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

// Synthetic fungible LP interface ONLY. Not a real DEX router or NFT position manager.
interface IV3SyntheticPool is IERC20 {
    function asset() external view returns(address);
    function quote() external view returns(address);
    function addLiquidity(uint256 assetAmount,uint256 quoteAmount,uint256 minShares,address recipient) external returns(uint256);
}

/// @notice Test-only fixed LP custody and time lock. No early release or arbitrary recipient.
contract V3SyntheticLPLock {
    using SafeERC20 for IERC20;
    error InvalidLock();
    error Locked();
    IERC20 public immutable lp;
    address public immutable custody;
    bytes32 public immutable custodyCodeHash;
    uint256 public immutable unlockAt;
    constructor(IERC20 shares,address destination,uint256 unlock){
        if(block.chainid!=84532||address(shares).code.length==0||destination.code.length==0||unlock<block.timestamp+730 days) revert InvalidLock();
        lp=shares;custody=destination;custodyCodeHash=destination.codehash;unlockAt=unlock;
    }
    function release() external {
        if(block.timestamp<unlockAt||custody.codehash!=custodyCodeHash) revert Locked();
        lp.safeTransfer(custody,lp.balanceOf(address(this)));
    }
}

/// @notice One exact precommitted synthetic liquidity action, no admin or arbitrary router calls.
/// A real pool integration must independently validate price, slippage, custody and code.
contract V3LiquidityPolicyFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error NotReady();
    error BalanceMismatch();
    uint256 public constant RESERVE=222222222000000;
    IERC20 public immutable asset;
    IERC20 public immutable quote;
    IV3SyntheticPool public immutable pool;
    bytes32 public immutable poolCodeHash;
    V3SyntheticLPLock public immutable locker;
    uint256 public immutable assetAmount;
    uint256 public immutable quoteAmount;
    uint256 public immutable minShares;
    uint256 public immutable executeBefore;
    bool public executed;
    uint256 public sharesLocked;
    event LiquidityLocked(uint256 assetSpent,uint256 quoteSpent,uint256 shares,address locker);
    constructor(IERC20 a,IERC20 q,IV3SyntheticPool p,bytes32 poolHash,address custody,uint256 aAmount,uint256 qAmount,uint256 minimum,uint256 expiry){
        if(block.chainid!=84532||address(a).code.length==0||address(q).code.length==0||address(p).code.length==0||
           address(a)==address(q)||address(p)==address(a)||address(p)==address(q)||poolHash!=address(p).codehash||
           p.asset()!=address(a)||p.quote()!=address(q)||aAmount==0||aAmount>RESERVE||qAmount==0||minimum==0||
           expiry<=block.timestamp||expiry-block.timestamp>30 days) revert InvalidConfig();
        asset=a;quote=q;pool=p;poolCodeHash=poolHash;assetAmount=aAmount;quoteAmount=qAmount;minShares=minimum;executeBefore=expiry;
        // Expiry + lock length ensures at least 730 days from any permitted execution.
        locker=new V3SyntheticLPLock(p,custody,expiry+730 days);
    }
    function execute() external nonReentrant {
        if(executed||block.timestamp>=executeBefore||address(pool).codehash!=poolCodeHash||pool.asset()!=address(asset)||pool.quote()!=address(quote)) revert NotReady();
        uint256 beforeA=asset.balanceOf(address(this));uint256 beforeQ=quote.balanceOf(address(this));
        uint256 beforeLP=pool.balanceOf(address(locker));
        if(beforeA<RESERVE||beforeQ<quoteAmount||asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0) revert NotReady();
        executed=true;
        asset.safeApprove(address(pool),assetAmount);quote.safeApprove(address(pool),quoteAmount);
        uint256 reported=pool.addLiquidity(assetAmount,quoteAmount,minShares,address(locker));
        asset.safeApprove(address(pool),0);quote.safeApprove(address(pool),0);
        uint256 afterLP=pool.balanceOf(address(locker));
        if(asset.balanceOf(address(this))!=beforeA-assetAmount||quote.balanceOf(address(this))!=beforeQ-quoteAmount||
           afterLP<beforeLP||afterLP-beforeLP!=reported||reported<minShares||
           asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0) revert BalanceMismatch();
        sharesLocked=reported;
        emit LiquidityLocked(assetAmount,quoteAmount,reported,address(locker));
    }
}
