// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Dedicated synthetic test token; never official CLIMB.
contract ClimbClaimTestToken is ERC20 {
    error WrongChain();
    uint256 public constant INITIAL_TEST_SUPPLY = 1000e6;
    constructor(address reserve,address remainder,uint256 budget) ERC20("CLIMB Claim Test Only","CLIMBCLAIMTEST") {
        if(block.chainid != 84532) revert WrongChain();
        _mint(reserve,budget);
        _mint(remainder,INITIAL_TEST_SUPPLY-budget);
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}

/// @notice Test-only immutable recipient grants. No Solana authentication, live entitlements or admin.
contract ClimbFixedClaimPrototype {
    error WrongChain();
    error InvalidManifest();
    error InvalidWindow();
    error NotEligible();
    error AlreadyClaimed();
    error ClaimClosed();
    error TooEarly();
    error AlreadyClosed();

    ClimbClaimTestToken public immutable token;
    uint256 public immutable budget;
    uint256 public immutable deadline;
    bytes32 public immutable manifestHash;
    uint256 public immutable allocated;
    mapping(bytes32=>address) public recipient;
    mapping(bytes32=>uint256) public award;
    mapping(bytes32=>bool) public claimed;
    uint256 public paid;
    uint256 public burned;
    bool public closed;
    event Claimed(bytes32 indexed entitlementId,address indexed recipient,uint256 amount);
    event Closed(uint256 burned);

    // Explicitly synthetic, bounded constructor manifest. The remaining test supply
    // goes to a specified test address, never a real legacy allocation.
    constructor(bytes32[] memory ids,address[] memory recipients,uint256[] memory amounts,uint256 cap,uint256 end,address remainder){
        if(block.chainid!=84532) revert WrongChain();
        if(end<=block.timestamp||end-block.timestamp>90 days) revert InvalidWindow();
        if(ids.length==0||ids.length>32||ids.length!=recipients.length||ids.length!=amounts.length||
            cap==0||cap>1000e6||remainder==address(0)||remainder==address(this)) revert InvalidManifest();
        uint256 total;
        for(uint256 i;i<ids.length;i++){
            if(ids[i]==bytes32(0)||recipient[ids[i]]!=address(0)||recipients[i]==address(0)||
                recipients[i]==address(this)||amounts[i]==0||amounts[i]>cap-total) revert InvalidManifest();
            recipient[ids[i]]=recipients[i];
            award[ids[i]]=amounts[i];
            total+=amounts[i];
        }
        budget=cap;
        deadline=end;
        allocated=total;
        manifestHash=keccak256(abi.encode("CLIMB_SYNTHETIC_CLAIM_V1",block.chainid,address(this),ids,recipients,amounts,cap,end,remainder));
        token=new ClimbClaimTestToken(address(this),remainder,cap);
    }
    function claim(bytes32 id) external {
        if(closed||block.timestamp>=deadline) revert ClaimClosed();
        if(recipient[id]!=msg.sender) revert NotEligible();
        if(claimed[id]) revert AlreadyClaimed();
        claimed[id]=true;
        uint256 amount=award[id];
        paid+=amount;
        require(token.transfer(msg.sender,amount));
        emit Claimed(id,msg.sender,amount);
    }
    /// @notice Permissionless after immutable test deadline. Burns only the
    /// unspent budget; unsolicited token donations are not part of that budget.
    function closeAndBurn() external {
        if(closed) revert AlreadyClosed();
        if(block.timestamp<deadline) revert TooEarly();
        closed=true;
        burned=budget-paid;
        token.burn(burned);
        emit Closed(burned);
    }
}
