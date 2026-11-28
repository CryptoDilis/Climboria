// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {V4MarketingBudget} from "./V4MarketingBudgetLocalFixture.sol";

interface IV4MarketingControl {
    function epoch() external view returns(uint256);
    function validateConfig() external view;
    function recipientAllowed(address a) external view returns(bool);
    function expenseContext(address a) external view returns(uint256);
}

/// @notice Local-only campaign vault; no exceptional spending or generic asset recovery.
/// @dev Evidence is unique among executed marketing proposals, not proof of off-chain purpose.
/// Other categories remain sealed; a shared cross-vault registry is future work.
contract V4MarketingReleaseLocal {
    using SafeERC20 for IERC20;
    using V4MarketingBudget for V4MarketingBudget.State;
    error Denied();
    IERC20 public immutable token;
    IV4MarketingControl public immutable control;
    uint256 public immutable start;
    bytes32 public immutable controlHash;
    V4MarketingBudget.State private state;
    struct Proposal {
        address recipient; uint256 amount; bytes32 evidence; uint256 month;
        uint256 epoch; uint256 context; uint256 readyAt; bool executed; bool cancelled;
    }
    mapping(bytes32=>Proposal) public proposals;
    mapping(bytes32=>bytes32) public consumedBy;
    event Proposed(bytes32 indexed id,address indexed recipient,bytes32 indexed evidence,uint256 amount,uint256 month,uint256 epoch,uint256 context,uint256 readyAt);
    event Paid(bytes32 indexed id,bytes32 indexed evidence,uint256 amount);
    event Cancelled(bytes32 indexed id);
    constructor(IV4MarketingControl c) {
        if(block.chainid!=31337||address(c).code.length==0||block.timestamp==0)revert Denied();
        token=IERC20(msg.sender);control=c;controlHash=address(c).codehash;start=block.timestamp;
        state=V4MarketingBudget.initial();
    }
    function _epoch() private view returns(uint256){
        if(block.chainid!=31337||address(control).codehash!=controlHash)revert Denied();
        control.validateConfig();return control.epoch();
    }
    function monthNow() public view returns(uint256){return (block.timestamp-start)/30 days;}
    function snapshot() external view returns(uint256 spent,uint256 capacity){
        V4MarketingBudget.State memory s=state.advance(monthNow());return(s.spent,s.available());
    }
    function propose(address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 salt,uint256 context) external returns(bytes32 id){
        if(msg.sender!=address(control))revert Denied();
        uint256 e=_epoch();uint256 m=monthNow();
        uint256 ready=block.timestamp+2 days;
        if(month<m||month>m+1||ready>=start+(month+1)*30 days||
           amount==0||amount>3*V4MarketingBudget.CAP||evidence==0||salt==0||consumedBy[evidence]!=0||
           !control.recipientAllowed(recipient)||context!=control.expenseContext(recipient))revert Denied();
        id=keccak256(abi.encode(block.chainid,address(this),address(token),e,recipient,amount,evidence,month,salt,context));
        if(id==0||proposals[id].recipient!=address(0))revert Denied();
        proposals[id]=Proposal(recipient,amount,evidence,month,e,context,ready,false,false);
        emit Proposed(id,recipient,evidence,amount,month,e,context,ready);
    }
    function cancel(bytes32 id) external {
        if(msg.sender!=address(control))revert Denied();
        _epoch();
        Proposal storage p=proposals[id];
        if(p.recipient==address(0)||p.executed||p.cancelled)revert Denied();
        p.cancelled=true;emit Cancelled(id);
    }
    function execute(bytes32 id) external {
        Proposal storage p=proposals[id];
        uint256 e=_epoch();
        if(p.recipient==address(0)||p.executed||p.cancelled||p.epoch!=e||p.month!=monthNow()||
           block.timestamp<p.readyAt||p.context!=control.expenseContext(p.recipient)||
           !control.recipientAllowed(p.recipient)||consumedBy[p.evidence]!=0)revert Denied();
        state=state.consume(p.month,p.amount);
        p.executed=true;consumedBy[p.evidence]=id;
        token.safeTransfer(p.recipient,p.amount);
        emit Paid(id,p.evidence,p.amount);
    }
}
