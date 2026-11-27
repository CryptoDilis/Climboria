// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

interface IV3RewardCustody {
    function epoch() external view returns(uint256);
    function threshold() external view returns(uint256);
    function memberCount() external view returns(uint256);
    // Adapter must exclude owners, pending owner replacements and reserved roles.
    function rewardSignerAllowed(address signer) external view returns(bool);
}

/// @notice Isolated test-only governed reward candidate. NOT wired to the Safe
/// successor; the adapter must independently enforce exact quorum authorization.
contract V3GovernedGameRewardFixture is EIP712,ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error InvalidReward();
    error OutsideWindow();
    error InvalidSigner();
    error AlreadyPaid();
    error CapExceeded();
    error Unauthorized();
    error InvalidAuthority();
    uint256 public constant DELAY=2 days;
    uint256 public constant WINDOW=7 days;
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=311111110800000;
    bytes32 public constant REWARD_TYPEHASH=keccak256("Reward(bytes32 eventId,address recipient,uint256 amount,uint256 month,uint256 deadline,uint256 generation)");
    IERC20 public immutable token;
    address public distributor;
    IV3RewardCustody public immutable custody;
    bytes32 public immutable custodyHash;
    uint256 public generation=1;
    uint256 public rotationSerial;
    struct Rotation {address signer;uint256 epoch;uint256 readyAt;uint256 expiresAt;}
    Rotation public pending;
    mapping(address=>bool) public formerOrCurrentSigner;
    event SignerRevoked(address indexed oldSigner,uint256 indexed generation);
    event SignerScheduled(address indexed signer,uint256 indexed serial,uint256 epoch,uint256 readyAt,uint256 expiresAt);
    event SignerCancelled(uint256 indexed serial);
    event SignerActivated(address indexed signer,uint256 indexed generation,uint256 indexed serial);
    address public immutable excludedFounder;
    uint256 public immutable start;
    uint256 public immutable walletMonthlyCap;
    uint256 public released;
    mapping(bytes32=>bool) public paid;
    mapping(uint256=>uint256) public monthlyReleased;
    mapping(uint256=>mapping(address=>uint256)) public walletReleased;
    event RewardPaid(bytes32 indexed eventId,address indexed recipient,uint256 amount,uint256 month);
    struct Reward {bytes32 eventId;address recipient;uint256 amount;uint256 month;uint256 deadline;uint256 generation;}
    constructor(IERC20 asset,address signer,address founder,uint256 begin,uint256 walletCap,IV3RewardCustody control) EIP712("CLIMB V3 Governed Synthetic Game Rewards","2"){
        if(block.chainid!=84532||address(asset).code.length==0||signer==address(0)||founder==address(0)||signer==founder||
           signer.code.length!=0||begin<=block.timestamp||begin-block.timestamp>365 days||walletCap==0||walletCap>ALLOCATION) revert InvalidConfig();
        token=asset;distributor=signer;excludedFounder=founder;start=begin;walletMonthlyCap=walletCap;
        if(address(control).code.length==0)revert InvalidConfig();
        custody=control;custodyHash=address(control).codehash;
        if(_epoch()==0||!_eligible(signer))revert InvalidConfig();
        formerOrCurrentSigner[signer]=true;
    }
    function _epoch() private view returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyHash||custody.threshold()!=3||custody.memberCount()!=5)revert InvalidAuthority();
        e=custody.epoch();
        if(e==0)revert InvalidAuthority();
    }
    function _eligible(address signer) private view returns(bool){
        return signer!=address(0)&&signer!=address(1)&&signer!=excludedFounder&&signer!=address(this)&&
            signer!=address(token)&&signer!=address(custody)&&signer.code.length==0&&custody.rewardSignerAllowed(signer);
    }
    function _authorize(uint256 expectedEpoch,uint256 expectedGeneration) private view {
        if(msg.sender!=address(custody))revert Unauthorized();
        if(_epoch()!=expectedEpoch||generation!=expectedGeneration)revert InvalidAuthority();
    }
    function revoke(uint256 expectedEpoch,uint256 expectedGeneration) external {
        _authorize(expectedEpoch,expectedGeneration);
        address old=distributor;
        if(old==address(0))revert InvalidAuthority();
        distributor=address(0);generation++;delete pending;
        emit SignerRevoked(old,generation);
    }
    // Proposed policy: previously activated signers cannot be scheduled or activated again.
    // Keep _eligible unchanged: the current signer must remain eligible for claims.
    function schedule(uint256 expectedEpoch,uint256 expectedGeneration,address signer,uint256 validAfter,uint256 validUntil) external {
        _authorize(expectedEpoch,expectedGeneration);
        if(distributor!=address(0)||formerOrCurrentSigner[signer]||!_eligible(signer)||validAfter>block.timestamp||validUntil<=block.timestamp||
            validUntil<=validAfter||validUntil-validAfter>1 days||
            (pending.signer!=address(0)&&pending.epoch==expectedEpoch&&block.timestamp<pending.expiresAt))revert InvalidAuthority();
        rotationSerial++;
        pending=Rotation(signer,expectedEpoch,block.timestamp+DELAY,block.timestamp+DELAY+WINDOW);
        emit SignerScheduled(signer,rotationSerial,expectedEpoch,pending.readyAt,pending.expiresAt);
    }
    function cancel(uint256 expectedEpoch,uint256 expectedGeneration,uint256 serial) external {
        _authorize(expectedEpoch,expectedGeneration);
        if(serial!=rotationSerial||pending.signer==address(0))revert InvalidAuthority();
        delete pending;emit SignerCancelled(serial);
    }
    function activate(uint256 expectedEpoch,uint256 expectedGeneration,uint256 serial,address signer) external {
        _authorize(expectedEpoch,expectedGeneration);
        Rotation memory p=pending;
        if(distributor!=address(0)||serial!=rotationSerial||p.signer!=signer||p.epoch!=expectedEpoch||
            block.timestamp<p.readyAt||block.timestamp>=p.expiresAt||formerOrCurrentSigner[signer]||!_eligible(signer))revert InvalidAuthority();
        delete pending;generation++;distributor=signer;formerOrCurrentSigner[signer]=true;
        emit SignerActivated(signer,generation,serial);
    }
    // Compact binding predicate for the authenticated successor's actual guard.
    function matchesInitialBinding(address expectedToken,address expectedCustody,address expectedFounder) external view returns(bool){
        return address(token)==expectedToken&&address(custody)==expectedCustody&&
            custodyHash==expectedCustody.codehash&&generation==1&&excludedFounder==expectedFounder&&
            distributor!=address(0)&&formerOrCurrentSigner[distributor];
    }
    function reservedSignerRole(address a) external view returns(bool){
        return formerOrCurrentSigner[a]||a==pending.signer;
    }
    function monthlyCap(uint256 m) public pure returns(uint256){
        if(m>=60)return 0;
        uint256 annual=ALLOCATION*(30-5*(m/12))/100;
        uint256 i=m%12;return annual*(i+1)/12-annual*i/12;
    }
    function digest(Reward calldata reward) public view returns(bytes32){
        return _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH,reward.eventId,reward.recipient,reward.amount,reward.month,reward.deadline,reward.generation)));
    }
    function claim(Reward calldata reward,bytes calldata signature) external nonReentrant {
        if(block.chainid!=84532||block.timestamp<start)revert OutsideWindow();
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60||reward.month!=m||block.timestamp>=reward.deadline||reward.deadline>start+(m+1)*MONTH)revert OutsideWindow();
        _epoch();
        if(reward.generation!=generation||!_eligible(distributor))revert InvalidSigner();
        if(reward.eventId==0||reward.amount==0||reward.recipient==address(0)||reward.recipient==address(this)||
           reward.recipient==address(token)||formerOrCurrentSigner[reward.recipient]||reward.recipient==excludedFounder)revert InvalidReward();
        if(paid[reward.eventId])revert AlreadyPaid();
        if(ECDSA.recover(digest(reward),signature)!=distributor)revert InvalidSigner();
        if(reward.amount>monthlyCap(m)-monthlyReleased[m]||reward.amount>walletMonthlyCap-walletReleased[m][reward.recipient]||
           reward.amount>ALLOCATION-released)revert CapExceeded();
        paid[reward.eventId]=true;monthlyReleased[m]+=reward.amount;walletReleased[m][reward.recipient]+=reward.amount;released+=reward.amount;
        token.safeTransfer(reward.recipient,reward.amount);
        emit RewardPaid(reward.eventId,reward.recipient,reward.amount,m);
    }
}
