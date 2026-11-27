// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";
import {IV3SyntheticPool,V3SyntheticLPLock} from "./V3LiquidityPolicyFixture.sol";

/// @notice Isolated Base Sepolia synthetic deferral/tranche fixture, NOT a real DEX.
/// No quote funding required on creation. Custody adapter is trusted for quorum
/// and monotonic epochs. No unrestricted CLIMB withdrawal or allowance.
contract V3DeferredLiquidityFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidAction();
    error NotReady();
    error BalanceMismatch();
    uint256 public constant RESERVE=222222222000000;
    uint256 public constant DELAY=2 days;
    IERC20 public immutable asset;
    IERC20 public immutable quote;
    IV3SyntheticPool public immutable pool;
    IV3CustodyEpochFixture public immutable custody;
    address public immutable lpCustody;
    bytes32 public immutable poolCodeHash;
    bytes32 public immutable custodyCodeHash;
    bytes32 public immutable lpCustodyCodeHash;
    uint256 public immutable trancheCap;
    uint256 public highestObservedEpoch;
    uint256 public spent;
    struct Action {
        uint256 assetAmount;
        uint256 quoteAmount;
        uint256 minShares;
        uint256 epoch;
        uint256 readyAt;
        uint256 deadline;
        bool executed;
        bool cancelled;
        address locker;
    }
    mapping(bytes32=>Action) public actions;
    event Scheduled(bytes32 indexed id,uint256 indexed epoch,uint256 assetAmount,uint256 quoteAmount,uint256 readyAt,uint256 deadline);
    event Cancelled(bytes32 indexed id);
    event Locked(bytes32 indexed id,address indexed locker,uint256 assetSpent,uint256 quoteSpent,uint256 shares);
    constructor(IERC20 a,IERC20 q,IV3SyntheticPool p,IV3CustodyEpochFixture control,address destination,uint256 cap){
        if(block.chainid!=84532||address(a).code.length==0||address(q).code.length==0||address(p).code.length==0||
           address(control).code.length==0||destination.code.length==0||address(a)==address(q)||address(p)==address(a)||address(p)==address(q)||
           destination==address(a)||destination==address(q)||destination==address(p)||destination==address(this)||
           p.asset()!=address(a)||p.quote()!=address(q)||cap==0||cap>RESERVE||
           control.threshold()!=3||control.memberCount()!=5||control.epoch()==0) revert InvalidConfig();
        asset=a;quote=q;pool=p;custody=control;lpCustody=destination;trancheCap=cap;
        poolCodeHash=address(p).codehash;custodyCodeHash=address(control).codehash;lpCustodyCodeHash=destination.codehash;
        highestObservedEpoch=control.epoch();
    }
    function _observe() private returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyCodeHash||custody.threshold()!=3||custody.memberCount()!=5||
           address(pool).codehash!=poolCodeHash||pool.asset()!=address(asset)||pool.quote()!=address(quote)||lpCustody.codehash!=lpCustodyCodeHash)revert InvalidConfig();
        e=custody.epoch();if(e==0||e<highestObservedEpoch)revert InvalidConfig();
        highestObservedEpoch=e;
    }
    function syncEpoch() external {_observe();}
    function schedule(uint256 a,uint256 q,uint256 minShares,uint256 deadline,bytes32 nonce) external returns(bytes32 id){
        if(msg.sender!=address(custody))revert Unauthorized();
        uint256 e=_observe();
        if(a==0||a>trancheCap||a>RESERVE-spent||q==0||minShares==0||nonce==0||
           deadline<=block.timestamp+DELAY||deadline-block.timestamp>30 days)revert InvalidAction();
        id=keccak256(abi.encode(block.chainid,address(this),address(asset),address(quote),address(pool),e,a,q,minShares,deadline,nonce));
        if(actions[id].readyAt!=0)revert InvalidAction();
        actions[id]=Action(a,q,minShares,e,block.timestamp+DELAY,deadline,false,false,address(0));
        emit Scheduled(id,e,a,q,block.timestamp+DELAY,deadline);
    }
    function cancel(bytes32 id) external {
        if(msg.sender!=address(custody))revert Unauthorized();
        _observe();
        Action storage x=actions[id];
        if(x.readyAt==0||x.executed||x.cancelled)revert InvalidAction();
        x.cancelled=true;emit Cancelled(id);
    }
    function execute(bytes32 id) external nonReentrant {
        uint256 e=_observe();
        Action storage x=actions[id];
        if(x.readyAt==0||x.executed||x.cancelled||x.epoch!=e||block.timestamp<x.readyAt||block.timestamp>=x.deadline||
           x.assetAmount>RESERVE-spent||asset.balanceOf(address(this))<RESERVE-spent||quote.balanceOf(address(this))<x.quoteAmount)revert NotReady();
        // The fresh locker is fixed to the exact pool shares and destination.
        V3SyntheticLPLock lock=new V3SyntheticLPLock(pool,lpCustody,x.deadline+730 days);
        x.executed=true;x.locker=address(lock);spent+=x.assetAmount;
        uint256 shares=_add(x,lock);
        emit Locked(id,address(lock),x.assetAmount,x.quoteAmount,shares);
    }
    function _add(Action storage x,V3SyntheticLPLock lock) private returns(uint256 shares){
        uint256 a0=asset.balanceOf(address(this));uint256 q0=quote.balanceOf(address(this));uint256 l0=pool.balanceOf(address(lock));
        if(asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0)revert BalanceMismatch();
        asset.safeApprove(address(pool),x.assetAmount);quote.safeApprove(address(pool),x.quoteAmount);
        shares=pool.addLiquidity(x.assetAmount,x.quoteAmount,x.minShares,address(lock));
        asset.safeApprove(address(pool),0);quote.safeApprove(address(pool),0);
        uint256 l1=pool.balanceOf(address(lock));
        if(asset.balanceOf(address(this))!=a0-x.assetAmount||quote.balanceOf(address(this))!=q0-x.quoteAmount||
           l1<l0||l1-l0!=shares||shares<x.minShares||asset.allowance(address(this),address(pool))!=0||
           quote.allowance(address(this),address(pool))!=0)revert BalanceMismatch();
    }
}
