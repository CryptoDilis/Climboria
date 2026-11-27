// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IV3BurnableAsset} from "./V3BoundedLegacyFixture.sol";
import {IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";

/// @notice Synthetic Base Sepolia fixture only. No actual source authentication,
/// appeals adjudication, independent custody or cross-deployment replay guarantee.
contract V3DeferredLegacyFixture {
    using SafeERC20 for IERC20;
    error InvalidConfig();
    error Unauthorized();
    error InvalidAction();
    error InvalidManifest();
    error NotReady();
    error NotEligible();
    error AlreadyClaimed();
    uint256 public constant RESERVE=8888888880000;
    uint256 public constant DELAY=2 days;
    uint256 public constant CLAIM_WINDOW=30 days;
    uint256 public constant APPEAL_WINDOW=14 days;
    IV3BurnableAsset public immutable token;
    IV3CustodyEpochFixture public immutable custody;
    bytes32 public immutable custodyCodeHash;
    uint256 public highestObservedEpoch;
    struct Pending { bytes32 digest; uint256 epoch; uint256 readyAt; uint256 expiresAt; }
    Pending public pending;
    bool public activated;
    bool public closed;
    uint256 public opens;
    uint256 public deadline;
    uint256 public appealEnd;
    uint256 public budget;
    uint256 public allocated;
    uint256 public paid;
    uint256 public burned;
    mapping(bytes32=>address) public recipient;
    mapping(bytes32=>uint256) public award;
    mapping(bytes32=>bool) public claimed;
    event Scheduled(bool indexed closure,bytes32 indexed digest,uint256 epoch,uint256 readyAt,uint256 expiresAt);
    event Cancelled(bytes32 indexed digest);
    event Activated(bytes32 indexed digest,uint256 budget,uint256 allocated,uint256 opens,uint256 deadline,uint256 appealEnd);
    event Claimed(bytes32 indexed id,address indexed recipient,uint256 amount);
    event Closed(bytes32 indexed reviewEvidence,uint256 burned);

    constructor(IV3BurnableAsset asset,IV3CustodyEpochFixture control){
        if(block.chainid!=84532||address(asset).code.length==0||address(control).code.length==0||
            control.threshold()!=3||control.memberCount()!=5||control.epoch()==0) revert InvalidConfig();
        token=asset;custody=control;custodyCodeHash=address(control).codehash;
        highestObservedEpoch=control.epoch();
    }
    function _observe() private returns(uint256 e){
        if(block.chainid!=84532||address(custody).codehash!=custodyCodeHash||
            custody.threshold()!=3||custody.memberCount()!=5) revert InvalidConfig();
        e=custody.epoch();
        if(e==0||e<highestObservedEpoch) revert InvalidConfig();
        highestObservedEpoch=e;
    }
    function syncEpoch() external {_observe();}
    function schedule(bytes32 digest,uint256 expiresAt) external {
        if(msg.sender!=address(custody)) revert Unauthorized();
        uint256 e=_observe();
        if(closed||digest==0||(activated&&block.timestamp<appealEnd)||
            expiresAt<=block.timestamp+DELAY||expiresAt-block.timestamp>30 days) revert InvalidAction();
        Pending memory old=pending;
        if(old.digest!=0&&old.epoch==e&&block.timestamp<old.expiresAt) revert InvalidAction();
        pending=Pending(digest,e,block.timestamp+DELAY,expiresAt);
        emit Scheduled(activated,digest,e,block.timestamp+DELAY,expiresAt);
    }
    function cancel() external {
        if(msg.sender!=address(custody)) revert Unauthorized();
        _observe();
        bytes32 digest=pending.digest;
        if(digest==0) revert InvalidAction();
        delete pending;emit Cancelled(digest);
    }
    function _consume(bytes32 digest) private {
        uint256 e=_observe();
        Pending memory p=pending;
        if(digest==0||p.digest!=digest||p.epoch!=e||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt) revert NotReady();
        delete pending;
    }
    function manifestDigest(bytes32 campaign,uint256 cap,bytes32[] calldata ids,address[] calldata recipients,uint256[] calldata amounts) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_V3_DEFERRED_LEGACY_TEST_V1",block.chainid,address(this),address(token),campaign,cap,ids,recipients,amounts));
    }
    function activate(bytes32 campaign,uint256 cap,bytes32[] calldata ids,address[] calldata recipients,uint256[] calldata amounts) external {
        if(activated||closed) revert InvalidAction();
        if(campaign==0||cap==0||cap>RESERVE||ids.length==0||ids.length>32||ids.length!=recipients.length||ids.length!=amounts.length) revert InvalidManifest();
        bytes32 digest=manifestDigest(campaign,cap,ids,recipients,amounts);
        _consume(digest);
        if(token.balanceOf(address(this))<RESERVE) revert NotReady();
        uint256 total;
        for(uint256 i=0;i<ids.length;i++){
            if(ids[i]==0||recipient[ids[i]]!=address(0)||recipients[i]==address(0)||recipients[i]==address(this)||amounts[i]==0||amounts[i]>cap-total) revert InvalidManifest();
            recipient[ids[i]]=recipients[i];award[ids[i]]=amounts[i];total+=amounts[i];
        }
        activated=true;budget=cap;allocated=total;
        opens=block.timestamp;deadline=opens+CLAIM_WINDOW;appealEnd=deadline+APPEAL_WINDOW;
        emit Activated(digest,cap,total,opens,deadline,appealEnd);
    }
    function claim(bytes32 id) external {
        if(block.chainid!=84532||!activated||closed||block.timestamp>=deadline) revert NotReady();
        if(recipient[id]!=msg.sender) revert NotEligible();
        if(claimed[id]) revert AlreadyClaimed();
        claimed[id]=true;uint256 amount=award[id];paid+=amount;
        IERC20(address(token)).safeTransfer(msg.sender,amount);
        emit Claimed(id,msg.sender,amount);
    }
    // Evidence is a synthetic commitment, NOT proof of adjudicated appeals.
    function closureDigest(bytes32 reviewEvidence) public view returns(bytes32){
        return keccak256(abi.encode("CLIMB_V3_DEFERRED_LEGACY_CLOSE_TEST_V1",block.chainid,address(this),address(token),deadline,appealEnd,paid,reviewEvidence));
    }
    function finalize(bytes32 reviewEvidence) external {
        if(!activated||closed||block.timestamp<appealEnd||reviewEvidence==0) revert NotReady();
        _consume(closureDigest(reviewEvidence));
        closed=true;burned=RESERVE-paid;token.burn(burned);
        emit Closed(reviewEvidence,burned);
    }
}
