// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
interface IV3BurnableAsset is IERC20 { function burn(uint256 amount) external; }

/// @notice Isolated test-only, prefunded, one-time campaign fixture.
/// No source-wallet authentication, live eligibility, or production governance.
contract V3BoundedLegacyFixture {
    using SafeERC20 for IERC20;
    error WrongChain();
    error InvalidConfig();
    error InvalidManifest();
    error InvalidWindow();
    error NotEligible();
    error AlreadyClaimed();
    error NotFunded();
    uint256 public constant RESERVE = 8888888880000;
    IV3BurnableAsset public immutable token;
    bytes32 public immutable commitment;
    uint256 public immutable opens;
    uint256 public immutable deadline;
    uint256 public immutable closure;
    bool public activated;
    bool public closed;
    uint256 public budget;
    uint256 public allocated;
    uint256 public paid;
    uint256 public burned;
    mapping(bytes32=>address) public recipient;
    mapping(bytes32=>uint256) public award;
    mapping(bytes32=>bool) public claimed;
    event Activated(bytes32 indexed commitment,uint256 budget,uint256 allocated);
    event Claimed(bytes32 indexed id,address indexed recipient,uint256 amount);
    event Closed(uint256 burned);
    constructor(IV3BurnableAsset asset,bytes32 manifest,uint256 begin,uint256 end,uint256 closeAt){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset).code.length==0||manifest==0) revert InvalidConfig();
        if(begin<=block.timestamp||begin-block.timestamp>365 days||end<=begin||end-begin>90 days||closeAt<=end||closeAt-end>90 days) revert InvalidWindow();
        token=asset;commitment=manifest;opens=begin;deadline=end;closure=closeAt;
    }
    function activate(bytes32[] calldata ids,address[] calldata recipients,uint256[] calldata amounts,uint256 cap,bytes32 campaign) external {
        if(activated||closed||block.timestamp>=opens) revert InvalidWindow();
        if(campaign==0||cap==0||cap>RESERVE||ids.length==0||ids.length>32||ids.length!=recipients.length||ids.length!=amounts.length) revert InvalidManifest();
        if(keccak256(abi.encode("CLIMB_V3_SYNTHETIC_LEGACY_V1",block.chainid,address(token),opens,deadline,closure,campaign,cap,ids,recipients,amounts))!=commitment) revert InvalidManifest();
        if(token.balanceOf(address(this))<RESERVE) revert NotFunded();
        uint256 total;
        for(uint256 i=0;i<ids.length;i++){
            if(ids[i]==0||recipient[ids[i]]!=address(0)||recipients[i]==address(0)||recipients[i]==address(this)||amounts[i]==0||amounts[i]>cap-total) revert InvalidManifest();
            recipient[ids[i]]=recipients[i];award[ids[i]]=amounts[i];total+=amounts[i];
        }
        activated=true;budget=cap;allocated=total;
        emit Activated(commitment,cap,total);
    }
    function claim(bytes32 id) external {
        if(!activated||closed||block.timestamp<opens||block.timestamp>=deadline) revert InvalidWindow();
        if(recipient[id]!=msg.sender) revert NotEligible();
        if(claimed[id]) revert AlreadyClaimed();
        claimed[id]=true;uint256 amount=award[id];paid+=amount;
        IERC20(address(token)).safeTransfer(msg.sender,amount);
        emit Claimed(id,msg.sender,amount);
    }
    // This fixture has no appeals resolution path. Delay is a model closure window only.
    // Unsolicited donations do not increase the grant cap or the amount burned.
    function closeAndBurn() external {
        if(!activated||closed||block.timestamp<closure) revert InvalidWindow();
        closed=true;burned=RESERVE-paid;token.burn(burned);
        emit Closed(burned);
    }
}
