# CLIMB V3 #994 re-review — B: reserve, liquidity and claim policy
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Six complete files, GitHub-reported blob IDs; not independently rehashed. Review with A and C. No real pool, holder eligibility or release authorization established. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/src/V3EpochSpendFixture.sol
Git blob: 8268b3d33b436309750252603a4993565f7e5ddb

```solidity
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

interface IV3ExpenseRecipientPolicy {
    function expenseRecipientAllowed(address recipient) external view returns(bool);
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
        uint256 initialEpoch=control.epoch();
        if(initialEpoch==0||control.threshold()!=3||control.memberCount()!=5) revert InvalidConfig();
        highestObservedEpoch=initialEpoch;
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
        return recipient!=address(0)&&recipient!=address(this)&&recipient!=address(custody)&&recipient!=address(registry)&&recipient!=excludedFounder&&!custody.isMember(recipient)&&
            IV3ExpenseRecipientPolicy(address(custody)).expenseRecipientAllowed(recipient);
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

```

## base/v3-testnet/src/V3SharedExpenseFixture.sol
Git blob: bf6b4be76c32b7fcff0ad15423673bbe380c67c9

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only fixed 3-of-5 approval vault for milestone expenditures.
/// Synthetic signers and limits; independence and evidence truth are off-chain
/// requirements. No generic calls, signer changes, sweeping or automatic rollover.
/// @notice Test-only registry. Bound once to three policy vaults by the creating factory.
contract V3SharedExpenseRegistry {
    error InvalidBinding();
    error UnauthorizedConsumer();
    error ExpenseAlreadyConsumed();
    address private immutable binder;
    bool public isSealed;
    mapping(address=>bool) public consumer;
    mapping(bytes32=>address) public consumedBy;
    mapping(bytes32=>bytes32) public consumedProposal;
    event ExpenseConsumed(bytes32 indexed evidence,address indexed vault,bytes32 indexed proposal);
    constructor(){
        if(block.chainid!=84532) revert InvalidBinding();
        binder=msg.sender;
    }
    function bind(address[3] calldata vaults) external {
        if(msg.sender!=binder||isSealed) revert InvalidBinding();
        for(uint256 i=0;i<3;i++){
            address v=vaults[i];
            if(v.code.length==0||consumer[v]) revert InvalidBinding();
            consumer[v]=true;
        }
        isSealed=true;
    }
    function consume(bytes32 evidence,bytes32 proposal) external {
        if(!isSealed||!consumer[msg.sender]) revert UnauthorizedConsumer();
        if(evidence==0||proposal==0||consumedBy[evidence]!=address(0)) revert ExpenseAlreadyConsumed();
        consumedBy[evidence]=msg.sender;
        consumedProposal[evidence]=proposal;
        emit ExpenseConsumed(evidence,msg.sender,proposal);
    }
}

contract V3SharedRestrictedSpend {
    error WrongChain();
    error InvalidConfig();
    error Unauthorized();
    error InvalidProposal();
    error AlreadyApproved();
    error NotReady();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant DELAY=2 days;
    V3SharedExpenseRegistry public immutable registry;
    IERC20 public immutable token;
    uint256 public immutable start;
    uint256 public immutable budget;
    address public immutable excludedFounder;
    bytes32 public immutable purpose;
    mapping(address=>bool) public signer;
    mapping(uint256=>uint256) public spent;
    uint256 public totalSpent;
    struct Proposal {
        address recipient;
        uint256 amount;
        bytes32 evidence;
        uint256 month;
        uint256 readyAt;
        uint8 approvals;
        bool executed;
    }
    mapping(bytes32=>Proposal) public proposals;
    mapping(bytes32=>mapping(address=>bool)) public approved;
    mapping(bytes32=>mapping(address=>bool)) public cancelVoted;
    mapping(bytes32=>uint8) public cancelVotes;
    mapping(bytes32=>bool) public cancelled;
    event Proposed(bytes32 indexed id,address indexed recipient,uint256 amount,bytes32 evidence,uint256 month);
    event Approved(bytes32 indexed id,address indexed signer);
    event ApprovalRevoked(bytes32 indexed id,address indexed signer);
    event CancellationVoted(bytes32 indexed id,address indexed signer);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id,address indexed recipient,uint256 amount);
    constructor(IERC20 asset,address[5] memory signers,address founder,uint256 begin,uint256 cap,bytes32 label,V3SharedExpenseRegistry shared){
        if(block.chainid!=84532) revert WrongChain();
        if(address(shared).code.length==0||address(asset)==address(0)||founder==address(0)||begin<=block.timestamp||begin>block.timestamp+365 days||cap==0||cap>888888888000000||label==0) revert InvalidConfig();
        registry=shared;token=asset;start=begin;budget=cap;purpose=label;excludedFounder=founder;
        for(uint256 i=0;i<5;i++){
            address s=signers[i];
            if(s==address(0)||s==founder||s==address(this)||signer[s]) revert InvalidConfig();
            signer[s]=true;
        }
    }
    function monthlyCap(uint256 month) public view returns(uint256){
        if(month>=60) return 0;
        return budget*(month+1)/60-budget*month/60;
    }
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32 id){
        if(!signer[msg.sender]) revert Unauthorized();
        if(recipient==address(0)||recipient==address(this)||recipient==excludedFounder||signer[recipient]||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)) revert InvalidProposal();
        uint256 end=start+(month+1)*MONTH;
        if(block.timestamp+DELAY>=end) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),purpose,recipient,amount,evidence,month,nonce));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,0,0,false);
        emit Proposed(id,recipient,amount,evidence,month);
    }
    function approve(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        if(approved[id][msg.sender]) revert AlreadyApproved();
        approved[id][msg.sender]=true;
        p.approvals++;
        if(p.approvals==3) p.readyAt=block.timestamp+DELAY;
        emit Approved(id,msg.sender);
    }
    /// @notice A signer can withdraw its own approval before execution.
    /// Falling below threshold resets the delay; a fresh quorum starts it again.
    function revokeApproval(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||!approved[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        approved[id][msg.sender]=false;
        p.approvals--;
        if(p.approvals<3) p.readyAt=0;
        emit ApprovalRevoked(id,msg.sender);
    }
    /// @notice Three distinct cancellation votes permanently invalidate this ID.
    /// Votes are irreversible. Until quorum, execution can still win the race.
    function voteCancel(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||cancelVoted[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        cancelVoted[id][msg.sender]=true;
        cancelVotes[id]++;
        emit CancellationVoted(id,msg.sender);
        if(cancelVotes[id]==3){
            cancelled[id]=true;
            emit Cancelled(id);
        }
    }
    function execute(bytes32 id) external {
        Proposal storage p=proposals[id];
        if(p.executed||cancelled[id]||p.approvals<3||block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;
        spent[p.month]+=p.amount;
        totalSpent+=p.amount;
        registry.consume(p.evidence,id);
        require(token.transfer(p.recipient,p.amount));
        emit Executed(id,p.recipient,p.amount);
    }
}

// Factory binds all three consumers atomically, with no subsequent configuration route.
// This is an isolated test fixture, not a new token or production custody implementation.
contract V3SharedExpenseFixture {
    V3SharedExpenseRegistry public immutable registry;
    V3SharedRestrictedSpend public immutable ecosystem;
    V3SharedRestrictedSpend public immutable community;
    V3SharedRestrictedSpend public immutable treasury;
    constructor(IERC20 asset,address[5] memory signers,address founder,uint256 begin){
        V3SharedExpenseRegistry shared=new V3SharedExpenseRegistry();
        registry=shared;
        V3SharedRestrictedSpend e=new V3SharedRestrictedSpend(asset,signers,founder,begin,133333333200000,"ECOSYSTEM",shared);
        V3SharedRestrictedSpend c=new V3SharedRestrictedSpend(asset,signers,founder,begin,88888888800000,"COMMUNITY",shared);
        V3SharedRestrictedSpend t=new V3SharedRestrictedSpend(asset,signers,founder,begin,106666666560000,"TREASURY",shared);
        ecosystem=e;community=c;treasury=t;
        shared.bind([address(e),address(c),address(t)]);
    }
}

```

## base/v3-testnet/src/V3RestrictedSpend.sol
Git blob: e46c8af5e5faa6c8632ae837b8c2e439e4b02daf

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only fixed 3-of-5 approval vault for milestone expenditures.
/// Synthetic signers and limits; independence and evidence truth are off-chain
/// requirements. No generic calls, signer changes, sweeping or automatic rollover.
contract V3RestrictedSpend {
    error WrongChain();
    error InvalidConfig();
    error Unauthorized();
    error InvalidProposal();
    error AlreadyApproved();
    error NotReady();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant DELAY=2 days;
    IERC20 public immutable token;
    uint256 public immutable start;
    uint256 public immutable budget;
    address public immutable excludedFounder;
    bytes32 public immutable purpose;
    mapping(address=>bool) public signer;
    mapping(uint256=>uint256) public spent;
    uint256 public totalSpent;
    struct Proposal {
        address recipient;
        uint256 amount;
        bytes32 evidence;
        uint256 month;
        uint256 readyAt;
        uint8 approvals;
        bool executed;
    }
    mapping(bytes32=>Proposal) public proposals;
    mapping(bytes32=>mapping(address=>bool)) public approved;
    mapping(bytes32=>mapping(address=>bool)) public cancelVoted;
    mapping(bytes32=>uint8) public cancelVotes;
    mapping(bytes32=>bool) public cancelled;
    event Proposed(bytes32 indexed id,address indexed recipient,uint256 amount,bytes32 evidence,uint256 month);
    event Approved(bytes32 indexed id,address indexed signer);
    event ApprovalRevoked(bytes32 indexed id,address indexed signer);
    event CancellationVoted(bytes32 indexed id,address indexed signer);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id,address indexed recipient,uint256 amount);
    constructor(IERC20 asset,address[5] memory signers,address founder,uint256 begin,uint256 cap,bytes32 label){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset)==address(0)||founder==address(0)||begin<=block.timestamp||begin>block.timestamp+365 days||cap==0||cap>888888888000000||label==0) revert InvalidConfig();
        token=asset;start=begin;budget=cap;purpose=label;excludedFounder=founder;
        for(uint256 i=0;i<5;i++){
            address s=signers[i];
            if(s==address(0)||s==founder||s==address(this)||signer[s]) revert InvalidConfig();
            signer[s]=true;
        }
    }
    function monthlyCap(uint256 month) public view returns(uint256){
        if(month>=60) return 0;
        return budget*(month+1)/60-budget*month/60;
    }
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32 id){
        if(!signer[msg.sender]) revert Unauthorized();
        if(recipient==address(0)||recipient==address(this)||recipient==excludedFounder||signer[recipient]||evidence==0||nonce==0||month>=60||amount==0||amount>monthlyCap(month)) revert InvalidProposal();
        uint256 end=start+(month+1)*MONTH;
        if(block.timestamp+DELAY>=end) revert InvalidProposal();
        id=keccak256(abi.encode(block.chainid,address(this),purpose,recipient,amount,evidence,month,nonce));
        if(proposals[id].recipient!=address(0)) revert InvalidProposal();
        proposals[id]=Proposal(recipient,amount,evidence,month,0,0,false);
        emit Proposed(id,recipient,amount,evidence,month);
    }
    function approve(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        if(approved[id][msg.sender]) revert AlreadyApproved();
        approved[id][msg.sender]=true;
        p.approvals++;
        if(p.approvals==3) p.readyAt=block.timestamp+DELAY;
        emit Approved(id,msg.sender);
    }
    /// @notice A signer can withdraw its own approval before execution.
    /// Falling below threshold resets the delay; a fresh quorum starts it again.
    function revokeApproval(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||!approved[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        approved[id][msg.sender]=false;
        p.approvals--;
        if(p.approvals<3) p.readyAt=0;
        emit ApprovalRevoked(id,msg.sender);
    }
    /// @notice Three distinct cancellation votes permanently invalidate this ID.
    /// Votes are irreversible. Until quorum, execution can still win the race.
    function voteCancel(bytes32 id) external {
        if(!signer[msg.sender]) revert Unauthorized();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||cancelled[id]||cancelVoted[id][msg.sender]||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        cancelVoted[id][msg.sender]=true;
        cancelVotes[id]++;
        emit CancellationVoted(id,msg.sender);
        if(cancelVotes[id]==3){
            cancelled[id]=true;
            emit Cancelled(id);
        }
    }
    function execute(bytes32 id) external {
        Proposal storage p=proposals[id];
        if(p.executed||cancelled[id]||p.approvals<3||block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;
        spent[p.month]+=p.amount;
        totalSpent+=p.amount;
        require(token.transfer(p.recipient,p.amount));
        emit Executed(id,p.recipient,p.amount);
    }
}

```

## base/v3-testnet/src/V3DeferredLiquidityFixture.sol
Git blob: 663af5a41cb9ed1b2943f044ddd01809229e525e

```solidity
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
    struct PoolSnapshot {uint256 assetBalance;uint256 quoteBalance;uint256 supply;}
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
        PoolSnapshot memory beforePool=PoolSnapshot(asset.balanceOf(address(pool)),quote.balanceOf(address(pool)),pool.totalSupply());
        if(asset.allowance(address(this),address(pool))!=0||quote.allowance(address(this),address(pool))!=0)revert BalanceMismatch();
        asset.safeApprove(address(pool),x.assetAmount);quote.safeApprove(address(pool),x.quoteAmount);
        shares=pool.addLiquidity(x.assetAmount,x.quoteAmount,x.minShares,address(lock));
        asset.safeApprove(address(pool),0);quote.safeApprove(address(pool),0);
        uint256 l1=pool.balanceOf(address(lock));
        if(asset.balanceOf(address(this))!=a0-x.assetAmount||quote.balanceOf(address(this))!=q0-x.quoteAmount||
           l1<l0||l1-l0!=shares||shares<x.minShares||asset.allowance(address(this),address(pool))!=0||
           quote.allowance(address(this),address(pool))!=0)revert BalanceMismatch();
        // Synthetic pool must retain both inputs and mint only the reported locked shares.
        // Pool-reported supply is not independent evidence of economic backing.
        if(asset.balanceOf(address(pool))!=beforePool.assetBalance+x.assetAmount||
           quote.balanceOf(address(pool))!=beforePool.quoteBalance+x.quoteAmount||
           pool.totalSupply()!=beforePool.supply+shares)revert BalanceMismatch();
    }
}

```

## base/v3-testnet/src/V3LiquidityPolicyFixture.sol
Git blob: 650000b2089bfff743471a1938bed0eeaa636fd4

```solidity
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

```

## base/v3-testnet/src/V3LegacyProofClaimFixture.sol
Git blob: 5dd3310cb79663c1a3da30ca5e95a57e0ac7ba8e

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {IV3BurnableAsset} from "./V3BoundedLegacyFixture.sol";
import {IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";
import {V3LegacyProofVerifierFixture as Verifier} from "./V3LegacyProofVerifierFixture.sol";

/// @notice Synthetic campaign for the test-only successor issuance.
/// Root approval is a custody commitment, not proof of source eligibility.
/// No production use, migration or real funds.
contract V3LegacyProofClaimFixture is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidAction();
    error NotReady();
    error NotEligible();
    error AlreadyClaimed();
    uint256 public constant RESERVE=8888888880000;
    uint256 public constant DELAY=2 days;
    uint256 public constant CLAIM_WINDOW=30 days;
    uint256 public constant APPEAL_WINDOW=14 days;
    IV3BurnableAsset public immutable token;
    IV3CustodyEpochFixture public immutable custody;
    Verifier public immutable verifier;
    bytes32 public immutable custodyHash;
    bytes32 public immutable verifierHash;
    uint256 public highestObservedEpoch;
    struct Pending {bytes32 digest;uint256 epoch;uint256 readyAt;uint256 expiresAt;}
    Pending public pending;
    Verifier.Commitment private active;
    bool public activated;
    bool public closed;
    uint256 public burned;
    uint256 public deadline;
    uint256 public appealEnd;
    uint256 public paid;
    mapping(uint256=>bool) public claimedIndex;
    mapping(bytes32=>bool) public claimedSource;
    event Scheduled(bytes32 indexed digest,uint256 epoch,uint256 readyAt,uint256 expiresAt);
    event Cancelled(bytes32 indexed digest);
    event Activated(bytes32 indexed root,uint256 allocated,uint256 deadline);
    event Closed(bytes32 indexed reviewEvidence,uint256 burned);
    event Claimed(uint256 indexed index,bytes32 indexed source,address indexed recipient,uint256 award);
    constructor(IV3BurnableAsset asset,IV3CustodyEpochFixture control){
        if(block.chainid!=84532||address(asset).code.length==0||address(control).code.length==0||
            control.threshold()!=3||control.memberCount()!=5||control.epoch()==0)revert InvalidConfig();
        token=asset;custody=control;custodyHash=address(control).codehash;
        highestObservedEpoch=control.epoch();
        Verifier v=new Verifier();verifier=v;verifierHash=address(v).codehash;
    }
    function _observe() private returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyHash||address(verifier).codehash!=verifierHash||
            custody.threshold()!=3||custody.memberCount()!=5)revert InvalidConfig();
        e=custody.epoch();if(e==0||e<highestObservedEpoch)revert InvalidConfig();
        highestObservedEpoch=e;
    }
    function commitment() external view returns(Verifier.Commitment memory){return active;}
    function allocated() external view returns(uint256){return active.allocated;}
    function matchesInitialBinding(address expectedToken,address expectedCustody) external view returns(bool){
        return address(token)==expectedToken&&address(custody)==expectedCustody&&
            custodyHash==expectedCustody.codehash&&address(verifier).codehash==verifierHash&&!activated&&!closed&&paid==0;
    }
    function activationDigest(Verifier.Commitment calldata c) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_BASE_LEGACY_PROOF_ACTIVATION_TEST_V1",block.chainid,address(this),address(token),c));
    }
    function schedule(bytes32 digest,uint256 expiresAt) external {
        if(msg.sender!=address(custody))revert Unauthorized();
        uint256 e=_observe();
        if(closed||(activated&&block.timestamp<appealEnd)||digest==0||expiresAt<=block.timestamp+DELAY||expiresAt-block.timestamp>30 days||
            (pending.digest!=0&&pending.epoch==e&&block.timestamp<pending.expiresAt))revert InvalidAction();
        pending=Pending(digest,e,block.timestamp+DELAY,expiresAt);
        emit Scheduled(digest,e,pending.readyAt,expiresAt);
    }
    function cancel() external {
        if(msg.sender!=address(custody))revert Unauthorized();
        _observe();bytes32 digest=pending.digest;
        if(digest==0)revert InvalidAction();
        delete pending;emit Cancelled(digest);
    }
    function activate(Verifier.Commitment calldata c) external {
        uint256 e=_observe();
        if(activated||c.targetToken!=address(token)||c.targetVault!=address(this)||c.contextHash==0||c.manifestDigest==0||
            c.root==0||c.count==0||c.count>100000||c.cap==0||c.cap>RESERVE||c.allocated==0||c.allocated>c.cap)revert InvalidAction();
        Pending memory p=pending;
        if(p.digest!=activationDigest(c)||p.epoch!=e||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt||
            token.balanceOf(address(this))<RESERVE)revert NotReady();
        delete pending;active=c;activated=true;
        deadline=block.timestamp+CLAIM_WINDOW;appealEnd=deadline+APPEAL_WINDOW;
        emit Activated(c.root,c.allocated,deadline);
    }
    function claim(uint256 index,Verifier.Row calldata row,Verifier.Node[] calldata siblings) external nonReentrant {
        _observe();
        if(!activated||closed||block.timestamp>=deadline)revert NotReady();
        if(row.recipient!=msg.sender)revert NotEligible();
        if(claimedIndex[index]||claimedSource[row.sourceAccount])revert AlreadyClaimed();
        if(row.award==0||row.award>active.allocated-paid||!verifier.verify(active,index,row,siblings))revert NotEligible();
        claimedIndex[index]=true;claimedSource[row.sourceAccount]=true;paid+=row.award;
        IERC20(address(token)).safeTransfer(msg.sender,row.award);
        emit Claimed(index,row.sourceAccount,msg.sender,row.award);
    }
    // Synthetic parity with the previous deferred legacy policy. A review
    // digest alone does not establish that real appeals were adjudicated.
    function closureDigest(bytes32 reviewEvidence) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_BASE_LEGACY_PROOF_CLOSURE_TEST_V1",block.chainid,address(this),address(token),
            active.root,active.manifestDigest,deadline,appealEnd,paid,reviewEvidence));
    }
    function finalize(bytes32 reviewEvidence) external nonReentrant {
        if(!activated||closed||block.timestamp<appealEnd||reviewEvidence==0)revert NotReady();
        uint256 e=_observe();
        Pending memory p=pending;
        if(p.digest!=closureDigest(reviewEvidence)||p.epoch!=e||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt)revert NotReady();
        delete pending;closed=true;burned=RESERVE-paid;
        token.burn(burned);
        emit Closed(reviewEvidence,burned);
    }
    // No sweep, root replacement, or appeal adjudication; donations stay locked.
}

```
