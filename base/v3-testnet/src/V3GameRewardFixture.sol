// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

/// @notice Test-only direct reward settlement. A trusted server must establish
/// event uniqueness, eligibility and player identity before signing; the chain
/// cannot prove gameplay. Fixed signing key, no production recovery mechanism.
contract V3GameRewardFixture is EIP712,ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error InvalidReward();
    error OutsideWindow();
    error InvalidSigner();
    error AlreadyPaid();
    error CapExceeded();
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=311111110800000;
    bytes32 public constant REWARD_TYPEHASH=keccak256("Reward(bytes32 eventId,address recipient,uint256 amount,uint256 month,uint256 deadline)");
    IERC20 public immutable token;
    address public immutable distributor;
    address public immutable excludedFounder;
    uint256 public immutable start;
    uint256 public immutable walletMonthlyCap;
    uint256 public released;
    mapping(bytes32=>bool) public paid;
    mapping(uint256=>uint256) public monthlyReleased;
    mapping(uint256=>mapping(address=>uint256)) public walletReleased;
    event RewardPaid(bytes32 indexed eventId,address indexed recipient,uint256 amount,uint256 month);
    struct Reward {bytes32 eventId;address recipient;uint256 amount;uint256 month;uint256 deadline;}
    constructor(IERC20 asset,address signer,address founder,uint256 begin,uint256 walletCap) EIP712("CLIMB V3 Synthetic Game Rewards","1"){
        if(block.chainid!=84532||address(asset).code.length==0||signer==address(0)||founder==address(0)||signer==founder||
           signer.code.length!=0||begin<=block.timestamp||begin-block.timestamp>365 days||walletCap==0||walletCap>ALLOCATION) revert InvalidConfig();
        token=asset;distributor=signer;excludedFounder=founder;start=begin;walletMonthlyCap=walletCap;
    }
    function monthlyCap(uint256 m) public pure returns(uint256){
        if(m>=60)return 0;
        uint256 annual=ALLOCATION*(30-5*(m/12))/100;
        uint256 i=m%12;return annual*(i+1)/12-annual*i/12;
    }
    function digest(Reward calldata reward) public view returns(bytes32){
        return _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH,reward.eventId,reward.recipient,reward.amount,reward.month,reward.deadline)));
    }
    function claim(Reward calldata reward,bytes calldata signature) external nonReentrant {
        if(block.chainid!=84532||block.timestamp<start)revert OutsideWindow();
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60||reward.month!=m||block.timestamp>=reward.deadline||reward.deadline>start+(m+1)*MONTH)revert OutsideWindow();
        if(reward.eventId==0||reward.amount==0||reward.recipient==address(0)||reward.recipient==address(this)||
           reward.recipient==address(token)||reward.recipient==distributor||reward.recipient==excludedFounder)revert InvalidReward();
        if(paid[reward.eventId])revert AlreadyPaid();
        if(ECDSA.recover(digest(reward),signature)!=distributor)revert InvalidSigner();
        if(reward.amount>monthlyCap(m)-monthlyReleased[m]||reward.amount>walletMonthlyCap-walletReleased[m][reward.recipient]||
           reward.amount>ALLOCATION-released)revert CapExceeded();
        paid[reward.eventId]=true;monthlyReleased[m]+=reward.amount;walletReleased[m][reward.recipient]+=reward.amount;released+=reward.amount;
        token.safeTransfer(reward.recipient,reward.amount);
        emit RewardPaid(reward.eventId,reward.recipient,reward.amount,m);
    }
}
