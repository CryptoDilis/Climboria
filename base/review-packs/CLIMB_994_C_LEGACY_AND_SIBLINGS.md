# CLIMB V3 #994 re-review — C: proof verification and older/sibling fixtures
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Five complete files, GitHub-reported blob IDs; not independently rehashed. Older sibling paths are not the selected quorum issuance path; distinguish their findings from the intended successor. Review A and B too. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/src/ClimbV3IntegratedTestToken.sol
Git blob: be7e331ae669c65139b0e1385ca5c6d27bff2872

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting,V3GamingVault,V3InactiveReserve} from "./ClimbV3TestToken.sol";
import {V3RestrictedSpend} from "./V3RestrictedSpend.sol";

/// @notice Integrated offline test candidate; never use real recipients or funds.
/// Liquidity and legacy reserves intentionally have no release path.
contract ClimbV3IntegratedTestToken is ERC20 {
    error WrongChain();
    error InvalidConfig();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    V3FounderVesting public immutable founderVault;
    V3GamingVault public immutable gamingVault;
    V3InactiveReserve public immutable liquidityReserve;
    V3RestrictedSpend public immutable ecosystemReserve;
    V3RestrictedSpend public immutable communityReserve;
    V3RestrictedSpend public immutable treasuryReserve;
    V3InactiveReserve public immutable legacyReserve;
    constructor(address founder,address distributor,uint256 start,address[5] memory signers) ERC20("CLIMB V3 Integrated Test Only","CLIMBV3INTTEST"){
        if(block.chainid!=84532) revert WrongChain();
        if(founder==address(0)||distributor==address(0)||founder==distributor||founder==address(this)||distributor==address(this)) revert InvalidConfig();
        for(uint256 i=0;i<5;i++){
            if(signers[i]==distributor||signers[i]==address(this)) revert InvalidConfig();
        }
        founderVault=new V3FounderVesting(IERC20(address(this)),founder,start);
        gamingVault=new V3GamingVault(IERC20(address(this)),distributor,start);
        liquidityReserve=new V3InactiveReserve("LIQUIDITY");
        ecosystemReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,133333333200000,"ECOSYSTEM");
        communityReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,88888888800000,"COMMUNITY");
        treasuryReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,106666666560000,"TREASURY");
        legacyReserve=new V3InactiveReserve("LEGACY");
        _mint(address(founderVault),17777777760000);
        _mint(address(gamingVault),311111110800000);
        _mint(address(liquidityReserve),222222222000000);
        _mint(address(ecosystemReserve),133333333200000);
        _mint(address(communityReserve),88888888800000);
        _mint(address(treasuryReserve),106666666560000);
        _mint(address(legacyReserve),8888888880000);
        assert(totalSupply()==INITIAL_SUPPLY);
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}

```

## base/v3-testnet/src/V3BoundedLegacyFixture.sol
Git blob: c76b46dd34227e10655184d82adb16911687ee5b

```solidity
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

```

## base/v3-testnet/src/V3DeferredLegacyFixture.sol
Git blob: 50f4b7100973ce54af045161ed1fc1bbee86e336

```solidity
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

```

## base/v3-testnet/src/V3GameRewardFixture.sol
Git blob: d22448bbae70f9a2a370515d3953e32983142146

```solidity
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

```

## base/v3-testnet/src/V3LegacyProofVerifierFixture.sol
Git blob: b3344dc970c408a224d62267fc5e745b1db7cd9b

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

/// @notice Isolated Base Sepolia binary Merkle-sum verifier. No custody,
/// claim execution, root registration, or authentication of source eligibility.
/// Binary V2 deliberately differs from the offline JSON V1 commitment.
contract V3LegacyProofVerifierFixture {
    uint256 public constant RESERVE=8888888880000;
    bytes32 public constant DOMAIN=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
    struct Commitment {
        bytes32 contextHash;
        bytes32 manifestDigest;
        address targetToken;
        address targetVault;
        uint256 count;
        uint256 cap;
        uint256 allocated;
        bytes32 root;
    }
    struct Row {
        bytes32 sourceAccount;
        bytes32 sourceOwner;
        address recipient;
        uint256 sourceAmount;
        uint256 award;
        bytes32 evidenceHash;
    }
    struct Node {bytes32 hash;uint256 sum;}
    function _leaf(bytes32 context,uint256 index,Row calldata row) private pure returns(Node memory){
        return Node(sha256(abi.encodePacked(DOMAIN,bytes1(0x01),context,index,row.sourceAccount,row.sourceOwner,
            row.recipient,row.sourceAmount,row.award,row.evidenceHash)),row.award);
    }
    function _root(Commitment calldata c,Node memory n) private pure returns(bytes32){
        return sha256(abi.encodePacked(DOMAIN,bytes1(0x04),c.contextHash,c.manifestDigest,
            uint256(84532),c.targetToken,c.targetVault,c.count,c.cap,n.hash,n.sum));
    }
    function verify(Commitment calldata c,uint256 index,Row calldata row,Node[] calldata siblings) external view returns(bool){
        if(block.chainid!=84532||c.contextHash==0||c.manifestDigest==0||c.root==0||
            c.targetToken==address(0)||c.targetVault==address(0)||c.targetToken==c.targetVault||
            c.count==0||c.count>100000||index>=c.count||c.cap==0||c.cap>RESERVE||
            c.allocated==0||c.allocated>c.cap||row.sourceAccount==0||row.sourceOwner==0||
            row.recipient==address(0)||row.recipient==c.targetToken||row.recipient==c.targetVault||
            row.sourceAmount==0||row.sourceAmount>type(uint64).max||row.award==0||row.award>c.allocated||row.evidenceHash==0)return false;
        uint256 depth;uint256 width=1;
        while(width<c.count){width*=2;depth++;}
        if(siblings.length!=depth)return false;
        Node memory n=_leaf(c.contextHash,index,row);
        for(uint256 i=0;i<depth;i++){
            Node calldata s=siblings[i];
            if(s.hash==0||s.sum>c.allocated-n.sum)return false;
            bytes32 h=index%2==0?
                sha256(abi.encodePacked(DOMAIN,bytes1(0x03),n.hash,n.sum,s.hash,s.sum)):
                sha256(abi.encodePacked(DOMAIN,bytes1(0x03),s.hash,s.sum,n.hash,n.sum));
            n=Node(h,n.sum+s.sum);index/=2;
        }
        return n.sum==c.allocated&&c.root==_root(c,n);
    }
}

```
