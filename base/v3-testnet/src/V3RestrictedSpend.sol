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
    event Proposed(bytes32 indexed id,address indexed recipient,uint256 amount,bytes32 evidence,uint256 month);
    event Approved(bytes32 indexed id,address indexed signer);
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
        if(p.recipient==address(0)||p.executed||block.timestamp>=start+(p.month+1)*MONTH) revert InvalidProposal();
        if(approved[id][msg.sender]) revert AlreadyApproved();
        approved[id][msg.sender]=true;
        p.approvals++;
        if(p.approvals==3) p.readyAt=block.timestamp+DELAY;
        emit Approved(id,msg.sender);
    }
    function execute(bytes32 id) external {
        Proposal storage p=proposals[id];
        if(p.executed||p.approvals<3||block.timestamp<p.readyAt||block.timestamp<start+p.month*MONTH||block.timestamp>=start+(p.month+1)*MONTH) revert NotReady();
        if(p.amount>monthlyCap(p.month)-spent[p.month]||p.amount>budget-totalSpent) revert CapExceeded();
        p.executed=true;
        spent[p.month]+=p.amount;
        totalSpent+=p.amount;
        require(token.transfer(p.recipient,p.amount));
        emit Executed(id,p.recipient,p.amount);
    }
}
