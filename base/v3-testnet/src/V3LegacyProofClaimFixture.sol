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
