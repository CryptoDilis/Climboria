// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {V3SharedExpenseRegistry} from "./V3SharedExpenseFixture.sol";

// Synthetic custody adapter boundary. A real independently reviewed multisig adapter
// must enforce monotonic epochs, quorum, rotation delay and authentic configuration.
interface IV3CustodyEpochFixture {
    function epoch() external view returns(uint256);
    function isMember(address account) external view returns(bool);
    function threshold() external view returns(uint256);
    function memberCount() external view returns(uint256);
}

/// @notice Test-only spending policy. No signer rotation or custody implementation here.
contract V3EpochSpendFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidProposal();
    error NotReady();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant DELAY=2 days;
    IERC20 public immutable token;
    IV3CustodyEpochFixture public immutable custody;
    V3SharedExpenseRegistry public immutable registry;
    bytes32 public immutable custodyCodeHash;
    uint256 public immutable budget;
    uint256 public immutable start;
    address public immutable excludedFounder;
    bytes32 public immutable purpose;
    uint256 public highestObservedEpoch;
    uint256 public totalSpent;
    mapping(uint256=>uint256) public spent;
    struct Proposal {
        address recipient;
        uint256 amount;
        bytes32 evidence;
        uint256 month;
        uint256 epoch;
        uint256 readyAt;
        bool executed;
        bool cancelled;
    }
    mapping(bytes32=>Proposal) public proposals;
    event Proposed(bytes32 indexed id,uint256 indexed epoch,bytes32 indexed evidence,address recipient,uint256 amount,uint256 readyAt);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id,uint256 indexed epoch,uint256 amount);
    constructor(IERC20 asset,IV3CustodyEpochFixture control,V3SharedExpenseRegistry shared,uint256 cap,uint256 begin,address founder,bytes32 label){
        if(block.chainid!=84532||address(asset).code.length==0||address(control).code.length==0||address(shared).code.length==0||
           cap==0||cap>888888888000000||begin<=block.timestamp||begin-block.timestamp>365 days||founder==address(0)||label==0) revert InvalidConfig();
        token=asset;custody=control;registry=shared;budget=cap;start=begin;excludedFounder=founder;purpose=label;
        custodyCodeHash=address(control).codehash;
        highestObservedEpoch=_readEpoch();
    }
    function _readEpoch() internal view returns(uint256 e){
        if(address(custody).codehash!=custodyCodeHash||custody.threshold()!=3||custody.memberCount()!=5) revert InvalidConfig();
        e=custody.epoch();
        if(e==0||e<highestObservedEpoch) revert InvalidConfig();
    }
    function _observe() internal returns(uint256 e){e=_readEpoch();highestObservedEpoch=e;}
    function syncEpoch() external { _observe(); }
    function monthlyCap(uint256 m) public view returns(uint256){
        return m>=60?0:budget*(m+1)/60-budget*m/60;
    }
    function _recipientAllowed(address recipient) internal view returns(bool){
        return recipient!=address(0)&&recipient!=address(this)&&recipient!=address(custody)&&recipient!=address(registry)&&recipient!=excludedFounder&&!custody.isMember(recipient);
    }
    // Only the synthetic multisig boundary authorizes a proposal; execution is public
    // after the delay. Fresh authorization is required after any epoch change.
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32 id){
        if(msg.sender!=address(custody)) revert Unauthorized();
        uint256 e=_observe();
        if(!_recipientAllowed(recipient)||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)||
           block.timestamp+DELAY>=start+(month+1)*MONTH||registry.consumedBy(evidence)!=address(0)) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),address(token),purpose,e,recipient,amount,evidence,month,nonce));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,e,block.timestamp+DELAY,false,false);
        emit Proposed(id,e,evidence,recipient,amount,block.timestamp+DELAY);
    }
    function cancel(bytes32 id) external {
        if(msg.sender!=address(custody)) revert Unauthorized();
        _observe();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||p.cancelled) revert InvalidProposal();
        p.cancelled=true;emit Cancelled(id);
    }
    function execute(bytes32 id) external nonReentrant {
        uint256 e=_observe();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||p.cancelled||p.epoch!=e||!_recipientAllowed(p.recipient)||
           block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;spent[p.month]+=p.amount;totalSpent+=p.amount;
        registry.consume(p.evidence,id);
        token.safeTransfer(p.recipient,p.amount);
        emit Executed(id,e,p.amount);
    }
}

contract V3EpochPolicyFactory {
    V3SharedExpenseRegistry public immutable registry;
    V3EpochSpendFixture public immutable ecosystem;
    V3EpochSpendFixture public immutable community;
    V3EpochSpendFixture public immutable treasury;
    constructor(IERC20 asset,IV3CustodyEpochFixture control,uint256 begin,address founder){
        V3SharedExpenseRegistry shared=new V3SharedExpenseRegistry();
        registry=shared;
        V3EpochSpendFixture e=new V3EpochSpendFixture(asset,control,shared,133333333200000,begin,founder,"ECOSYSTEM");
        V3EpochSpendFixture c=new V3EpochSpendFixture(asset,control,shared,88888888800000,begin,founder,"COMMUNITY");
        V3EpochSpendFixture t=new V3EpochSpendFixture(asset,control,shared,106666666560000,begin,founder,"TREASURY");
        ecosystem=e;community=c;treasury=t;
        shared.bind([address(e),address(c),address(t)]);
    }
}
