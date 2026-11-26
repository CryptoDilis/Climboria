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
