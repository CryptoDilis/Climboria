# CLIMB V3 #994 re-review — G: remaining V3 policy regression tests
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Eight complete test sources, GitHub-reported blob IDs; not independently rehashed. V3 CI 46015224824 SUCCESS. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/test/V3EpochPolicy.t.sol
Git blob: 255df36ed0120b75cfbfd9154d02e9dd37129764

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3EpochSpendFixture,V3EpochPolicyFactory,IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {V3SharedExpenseRegistry} from "../src/V3SharedExpenseFixture.sol";
interface VmEpoch {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract EpochTestAsset is ERC20 {
    constructor() ERC20("Synthetic epoch asset","EPOCHTEST"){_mint(msg.sender,888888888000000);}
}
// Deliberately unrestricted mock. Never use this for actual custody.
contract MockEpochCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public override threshold=3;
    uint256 public override memberCount=5;
    mapping(address=>bool) public override isMember;
    function expenseRecipientAllowed(address) external pure returns(bool){return true;}
    function configure(uint256 e,uint256 t,uint256 n) external {epoch=e;threshold=t;memberCount=n;}
    function member(address a,bool yes) external {isMember[a]=yes;}
    function propose(V3EpochSpendFixture v,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32){
        return v.propose(recipient,amount,evidence,month,nonce);
    }
    function cancel(V3EpochSpendFixture v,bytes32 id) external {v.cancel(id);}
}
contract V3EpochPolicyTest {
    VmEpoch constant vm=VmEpoch(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    EpochTestAsset token;
    MockEpochCustody control;
    V3EpochPolicyFactory factory;
    V3EpochSpendFixture e;
    V3EpochSpendFixture c;
    function setUp() public {
        vm.chainId(84532);
        token=new EpochTestAsset();control=new MockEpochCustody();
        start=block.timestamp+1 days;
        factory=new V3EpochPolicyFactory(token,control,start,FOUNDER);
        e=factory.ecosystem();c=factory.community();
        token.transfer(address(e),e.budget());token.transfer(address(c),c.budget());
    }
    function propose(V3EpochSpendFixture v,bytes32 evidence,bytes32 nonce,uint256 amount) internal returns(bytes32){
        return control.propose(v,PAYEE,amount,evidence,0,nonce);
    }
    function testOnlyCustodyAuthorizesAndDelay() public {
        vm.expectRevert(V3EpochSpendFixture.Unauthorized.selector);e.propose(PAYEE,10,"E",0,"N");
        bytes32 id=propose(e,"E","N",10);
        vm.warp(start);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(id);
        vm.warp(start+2 days);e.execute(id);
        require(e.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testRotationInvalidatesPriorProposalAndRequiresFreshDelay() public {
        bytes32 old=propose(e,"E","N",10);
        vm.warp(start+2 days);control.configure(2,3,5);e.syncEpoch();
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(old);
        bytes32 fresh=propose(e,"E","N",10);require(fresh!=old);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(fresh);
        vm.warp(start+4 days);e.execute(fresh);require(e.totalSpent()==10);
    }
    function testObservedEpochRollbackAndWrongThresholdRejected() public {
        control.configure(2,3,5);e.syncEpoch();control.configure(1,3,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        control.configure(3,2,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        control.configure(3,3,4);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        require(e.highestObservedEpoch()==2);
    }
    function testConsumedExpenseSurvivesEpochAcrossPurposes() public {
        bytes32 a=propose(e,"E","A",10);vm.warp(start+2 days);e.execute(a);
        control.configure(2,3,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidProposal.selector);propose(c,"E","B",20);
        require(factory.registry().consumedBy("E")==address(e)&&e.totalSpent()==10);
    }
    function testRecipientRecheckedBeforeExecution() public {
        bytes32 a=propose(e,"E","A",10);vm.warp(start+2 days);
        control.member(PAYEE,true);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(a);
        require(e.totalSpent()==0);
    }
    function testCancellationAndCapPreserved() public {
        uint256 cap=e.monthlyCap(0);
        bytes32 a=propose(e,"E","A",cap);control.cancel(e,a);
        bytes32 b=propose(e,"F","B",cap);bytes32 d=propose(e,"G","D",1);
        vm.warp(start+2 days);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(a);
        e.execute(b);
        vm.expectRevert(V3EpochSpendFixture.CapExceeded.selector);e.execute(d);
        require(e.totalSpent()==cap&&factory.registry().consumedBy("E")==address(0));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);
        new V3EpochPolicyFactory(token,control,start,FOUNDER);
    }
}

```

## base/v3-testnet/test/V3GameReward.t.sol
Git blob: da6d806c6bfc10430165edc951c0224710b49f55

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3GameRewardFixture} from "../src/V3GameRewardFixture.sol";
interface VmReward {
    function chainId(uint256) external;
    function warp(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert(bytes4) external;
    function expectRevert() external;
}
contract RewardTestAsset is ERC20 {
    constructor() ERC20("Synthetic reward asset","REWARDTEST"){_mint(msg.sender,888888888000000);}
}
contract V3GameRewardTest {
    VmReward constant vm=VmReward(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant KEY=12345;
    address constant FOUNDER=address(99);
    address constant PLAYER=address(100);
    uint256 start;
    RewardTestAsset token;
    V3GameRewardFixture vault;
    function setUp() public {
        vm.chainId(84532);token=new RewardTestAsset();start=block.timestamp+1 days;
        vault=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        token.transfer(address(vault),vault.ALLOCATION());
    }
    function reward(bytes32 id,address recipient,uint256 amount,uint256 m) internal view returns(V3GameRewardFixture.Reward memory){
        return V3GameRewardFixture.Reward(id,recipient,amount,m,start+(m+1)*30 days);
    }
    function sig(V3GameRewardFixture target,V3GameRewardFixture.Reward memory x,uint256 key) internal returns(bytes memory){
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(key,target.digest(x));return abi.encodePacked(r,s,v);
    }
    function testSignedRewardDirectToPlayerAndReplay() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY);vault.claim(x,s);
        require(token.balanceOf(PLAYER)==100&&vault.released()==100&&vault.paid("E")&&vault.walletReleased(0,PLAYER)==100);
        vm.expectRevert(V3GameRewardFixture.AlreadyPaid.selector);vault.claim(x,s);
        x.recipient=address(101);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.AlreadyPaid.selector);vault.claim(x,s);
    }
    function testWrongSignerAndModifiedRecipientRejected() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY+1);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);vault.claim(x,s);
        s=sig(vault,x,KEY);x.recipient=address(101);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);vault.claim(x,s);
    }
    function testCrossVaultSignatureRejected() public {
        V3GameRewardFixture other=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);
        bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidSigner.selector);other.claim(x,s);
    }
    function testMonthAndExpiry() public {
        V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
        vm.warp(start+30 days);vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
        vm.warp(start+60*30 days);vm.expectRevert(V3GameRewardFixture.OutsideWindow.selector);vault.claim(x,s);
    }
    function testWalletCapAndNoRollover() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("A",PLAYER,900,0);vault.claim(x,sig(vault,x,KEY));
        x=reward("B",PLAYER,101,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);vault.claim(x,s);
        vm.warp(start+30 days);x=reward("C",PLAYER,1001,1);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);vault.claim(x,s);
        x=reward("D",PLAYER,1000,1);vault.claim(x,sig(vault,x,KEY));require(vault.released()==1900);
    }
    function testAggregateCap() public {
        V3GameRewardFixture large=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,vault.ALLOCATION());
        token.transfer(address(large),large.ALLOCATION());vm.warp(start);
        V3GameRewardFixture.Reward memory x=reward("A",PLAYER,large.monthlyCap(0),0);large.claim(x,sig(large,x,KEY));
        x=reward("B",address(101),1,0);bytes memory s=sig(large,x,KEY);
        vm.expectRevert(V3GameRewardFixture.CapExceeded.selector);large.claim(x,s);
    }
    function testTransferRevertRollsBackAccounting() public {
        V3GameRewardFixture empty=new V3GameRewardFixture(token,vm.addr(KEY),FOUNDER,start,1000);
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("E",PLAYER,100,0);bytes memory s=sig(empty,x,KEY);
        vm.expectRevert();empty.claim(x,s);
        require(!empty.paid("E")&&empty.released()==0&&empty.walletReleased(0,PLAYER)==0);
        token.transfer(address(empty),100);empty.claim(x,s);require(empty.paid("E"));
    }
    function testFounderAndSignerExcluded() public {
        vm.warp(start);V3GameRewardFixture.Reward memory x=reward("A",FOUNDER,100,0);bytes memory s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidReward.selector);vault.claim(x,s);
        x=reward("B",vault.distributor(),100,0);s=sig(vault,x,KEY);
        vm.expectRevert(V3GameRewardFixture.InvalidReward.selector);vault.claim(x,s);
    }
    function testMainnetRejected() public {
        address signer=vm.addr(KEY);vm.chainId(8453);
        vm.expectRevert(V3GameRewardFixture.InvalidConfig.selector);new V3GameRewardFixture(token,signer,FOUNDER,start,1000);
    }
}

```

## base/v3-testnet/test/V3GovernedGameReward.t.sol
Git blob: 4820818f13f5b6ed9c00612e1edbd7394aade62a

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3GovernedGameRewardFixture,IV3RewardCustody} from "../src/V3GovernedGameRewardFixture.sol";
import {RewardTestAsset,VmReward} from "./V3GameReward.t.sol";

contract V3GovernedGameRewardTest is IV3RewardCustody {
    VmReward constant vm=VmReward(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant A=12345;
    uint256 constant B=23456;
    address constant FOUNDER=address(99);
    address constant PLAYER=address(100);
    uint256 public override epoch=1;
    uint256 public override threshold=3;
    uint256 public override memberCount=5;
    mapping(address=>bool) public excluded;
    RewardTestAsset token;
    V3GovernedGameRewardFixture vault;
    uint256 start;
    function rewardSignerAllowed(address a) external view override returns(bool){return !excluded[a];}
    function setUp() public {
        vm.chainId(84532);token=new RewardTestAsset();start=block.timestamp+1 days;
        vault=new V3GovernedGameRewardFixture(token,vm.addr(A),FOUNDER,start,1000,this);
        token.transfer(address(vault),vault.ALLOCATION());
        vm.warp(start);
    }
    function reward(bytes32 id,uint256 amount,uint256 gen) internal view returns(V3GovernedGameRewardFixture.Reward memory){
        return V3GovernedGameRewardFixture.Reward(id,PLAYER,amount,0,start+30 days,gen);
    }
    function sign(V3GovernedGameRewardFixture.Reward memory r,uint256 key) internal returns(bytes memory){
        (uint8 v,bytes32 x,bytes32 y)=vm.sign(key,vault.digest(r));return abi.encodePacked(x,y,v);
    }
    function schedule(address signer) internal {
        vault.schedule(epoch,vault.generation(),signer,block.timestamp,block.timestamp+1 days);
    }
    function rotate(address signer) internal {
        vault.revoke(epoch,vault.generation());schedule(signer);
        vm.warp(block.timestamp+2 days);vault.activate(epoch,vault.generation(),vault.rotationSerial(),signer);
    }
    function testRevocationStopsClaimsAndGenerationPreventsReplayAfterReuse() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("OLD",100,1);
        bytes memory old=sign(r,A);
        vault.revoke(1,1);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,old);
        schedule(vm.addr(B));vm.warp(block.timestamp+2 days);vault.activate(1,2,1,vm.addr(B));
        rotate(vm.addr(A));
        require(vault.generation()==5&&vault.distributor()==vm.addr(A));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,old);
        r.generation=5;vault.claim(r,sign(r,A));require(vault.paid("OLD"));
    }
    function testAccountingAndPaidIdsPersistAcrossRotation() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("PAID",900,1);vault.claim(r,sign(r,A));
        rotate(vm.addr(B));
        r.generation=3;
        bytes memory s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.AlreadyPaid.selector);vault.claim(r,s);
        r.eventId="NEW";r.amount=101;s=sign(r,B);
        vm.expectRevert(V3GovernedGameRewardFixture.CapExceeded.selector);vault.claim(r,s);
        r.amount=100;vault.claim(r,sign(r,B));
        require(vault.released()==1000&&vault.monthlyReleased(0)==1000&&vault.walletReleased(0,PLAYER)==1000);
    }
    function testDelayExpiryAndScheduleSerial() public {
        vault.revoke(1,1);schedule(vm.addr(B));address b=vm.addr(B);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,1,b);
        vault.cancel(1,2,1);schedule(b);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,1,b);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.cancel(1,2,1);
        vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(1,2,2,b);
        schedule(b);vm.warp(block.timestamp+2 days);vault.activate(1,2,3,b);
    }
    function testEpochAndRoleChangeInvalidatePendingActivation() public {
        vault.revoke(1,1);address b=vm.addr(B);schedule(b);
        vm.warp(block.timestamp+2 days);epoch=2;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(2,2,1,b);
        schedule(b);vm.warp(block.timestamp+2 days);excluded[b]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.activate(2,2,2,b);
        excluded[b]=false;vault.activate(2,2,2,b);
    }
    function testUnauthorizedAndInvalidWindow() public {
        (bool ok,)=address(new RewardUntrustedCaller()).call(abi.encodeCall(RewardUntrustedCaller.revoke,(vault)));
        require(!ok&&vault.generation()==1);
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.revoke(1,2);
        vault.revoke(1,1);address b=vm.addr(B);excluded[b]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.schedule(1,2,b,block.timestamp,block.timestamp+1 days);
        excluded[b]=false;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.schedule(1,2,b,block.timestamp,block.timestamp+2 days);
    }
    function testSignerAndCustodyRoleChangesFailClosed() public {
        V3GovernedGameRewardFixture.Reward memory r=reward("E",100,1);
        bytes memory s=sign(r,A);excluded[vm.addr(A)]=true;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);vault.claim(r,s);
        excluded[vm.addr(A)]=false;threshold=2;
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidAuthority.selector);vault.claim(r,s);
        threshold=3;vault.claim(r,s);require(vault.paid("E"));
    }
}
contract RewardUntrustedCaller {
    function revoke(V3GovernedGameRewardFixture vault) external {vault.revoke(1,1);}
}

```

## base/v3-testnet/test/V3LegacyProofClaim.t.sol
Git blob: 5e53b973b7eec06132557333f80eb40cd5b9e1a1

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofClaimFixture as Claim} from "../src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as Verifier} from "../src/V3LegacyProofVerifierFixture.sol";
import {IV3BurnableAsset} from "../src/V3BoundedLegacyFixture.sol";
import {LegacyFixtureAsset} from "./V3BoundedLegacy.t.sol";
import {DeferredLegacyMockCustody,VmDeferredLegacy} from "./V3DeferredLegacy.t.sol";
contract V3LegacyProofClaimTest {
    VmDeferredLegacy constant vm=VmDeferredLegacy(address(uint160(uint256(keccak256("hevm cheat code")))));
    LegacyFixtureAsset asset;
    DeferredLegacyMockCustody control;
    Claim vault;
    address constant A=address(101);
    address constant B=address(102);
    bytes32 constant DOMAIN=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
    Verifier.Commitment c;
    Verifier.Row a;
    Verifier.Row b;
    Verifier.Node[] p;
    Verifier.Node[] q;
    function setUp() public {
        vm.chainId(84532);asset=new LegacyFixtureAsset();control=new DeferredLegacyMockCustody();
        vault=new Claim(IV3BurnableAsset(address(asset)),control);
        asset.transfer(address(vault),vault.RESERVE());
        a=Verifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),A,100,7,bytes32(uint256(31)));
        b=Verifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),B,200,9,bytes32(uint256(32)));
        _build();
    }
    function _leaf(uint256 i,Verifier.Row memory r) private pure returns(bytes32){
        return sha256(abi.encodePacked(DOMAIN,bytes1(0x01),bytes32(uint256(1)),i,r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
    }
    function _build() private {
        bytes32 l=_leaf(0,a);bytes32 r=_leaf(1,b);
        bytes32 h=sha256(abi.encodePacked(DOMAIN,bytes1(0x03),l,a.award,r,b.award));
        c=Verifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(asset),address(vault),2,20,a.award+b.award,
            sha256(abi.encodePacked(DOMAIN,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(asset),address(vault),uint256(2),uint256(20),h,a.award+b.award)));
        delete p;delete q;p.push(Verifier.Node(r,b.award));q.push(Verifier.Node(l,a.award));
    }
    // The mock adapter has no actual Safe authorization; local impersonation
    // exercises the exact custody-only boundary, never a live account.
    function _schedule() private {
        bytes32 digest=vault.activationDigest(c);
        vm.prank(address(control));vault.schedule(digest,block.timestamp+7 days);
    }
    function _ready() private {_schedule();vm.warp(block.timestamp+2 days);vault.activate(c);}
    function testDelayedActivationAndExactReserveClaims() public {
        _schedule();vm.expectRevert(Claim.NotReady.selector);vault.activate(c);
        vm.warp(block.timestamp+2 days);vault.activate(c);
        vm.prank(A);vault.claim(0,a,p);
        vm.prank(B);vault.claim(1,b,q);
        require(vault.paid()==16&&asset.balanceOf(A)==7&&asset.balanceOf(B)==9);
        require(asset.balanceOf(address(vault))==vault.RESERVE()-16&&asset.totalSupply()==888888888000000);
        require(vault.claimedIndex(0)&&vault.claimedSource(a.sourceAccount));
    }
    function testRecipientAndReplayRejection() public {
        _ready();vm.prank(B);vm.expectRevert(Claim.NotEligible.selector);vault.claim(0,a,p);
        vm.prank(A);vault.claim(0,a,p);
        vm.prank(A);vm.expectRevert(Claim.AlreadyClaimed.selector);vault.claim(0,a,p);
        require(vault.paid()==7);
    }
    function testDuplicateSourceAcrossDifferentIndicesRejected() public {
        b.sourceAccount=a.sourceAccount;_build();_ready();
        vm.prank(A);vault.claim(0,a,p);
        vm.prank(B);vm.expectRevert(Claim.AlreadyClaimed.selector);vault.claim(1,b,q);
        require(vault.paid()==7&&!vault.claimedIndex(1));
    }
    function testAlteredProofDoesNotConsumeClaim() public {
        _ready();a.award=8;
        vm.prank(A);vm.expectRevert(Claim.NotEligible.selector);vault.claim(0,a,p);
        require(!vault.claimedIndex(0)&&!vault.claimedSource(a.sourceAccount)&&vault.paid()==0);
        a.award=7;vm.prank(A);vault.claim(0,a,p);require(vault.paid()==7);
    }
    function testEpochChangeAndCancellationInvalidateActivation() public {
        _schedule();control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.activate(c);
        _schedule();vm.prank(address(control));vault.cancel();vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.activate(c);
        _ready();require(vault.activated());
    }
    function _scheduleClosure(bytes32 review) private {
        bytes32 digest=vault.closureDigest(review);
        vm.prank(address(control));vault.schedule(digest,block.timestamp+7 days);
    }
    function testClosureRequiresAppealWindowAndCurrentEpoch() public {
        _ready();vm.prank(A);vault.claim(0,a,p);
        bytes32 review=bytes32(uint256(99));
        bytes32 digest=vault.closureDigest(review);
        vm.prank(address(control));vm.expectRevert(Claim.InvalidAction.selector);
        vault.schedule(digest,block.timestamp+7 days);
        vm.warp(vault.appealEnd());
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
        _scheduleClosure(review);control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
        _scheduleClosure(review);vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(bytes32(uint256(98)));
        vault.finalize(review);
        require(vault.closed()&&vault.paid()==7&&vault.burned()+vault.paid()==vault.RESERVE());
        require(asset.totalSupply()==888888888000000-vault.burned());
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
    }
    function testClosureCancellationAndDonationsPreserveAccounting() public {
        _ready();vm.prank(B);vault.claim(1,b,q);
        asset.transfer(address(vault),5);
        vm.warp(vault.appealEnd());
        bytes32 review=bytes32(uint256(99));
        _scheduleClosure(review);vm.prank(address(control));vault.cancel();
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(Claim.NotReady.selector);vault.finalize(review);
        _scheduleClosure(review);vm.warp(block.timestamp+2 days);vault.finalize(review);
        require(vault.closed()&&vault.burned()==vault.RESERVE()-9&&asset.balanceOf(address(vault))==5);
        vm.expectRevert(Claim.InvalidAction.selector);vault.activate(c);
        vm.prank(A);vm.expectRevert(Claim.NotReady.selector);vault.claim(0,a,p);
    }
    function testUnauthorizedScheduleAndDeadline() public {
        bytes32 digest=vault.activationDigest(c);
        vm.expectRevert(Claim.Unauthorized.selector);vault.schedule(digest,block.timestamp+7 days);
        _ready();vm.warp(vault.deadline());
        vm.prank(A);vm.expectRevert(Claim.NotReady.selector);vault.claim(0,a,p);
        require(vault.paid()==0);
    }
}

```

## base/v3-testnet/test/V3LegacyProofVerifier.t.sol
Git blob: 40a57c373dc44eb32a8ccf01e39cf9fc9a5afafa

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofVerifierFixture as Verifier} from "../src/V3LegacyProofVerifierFixture.sol";
interface VmLegacyProof {function chainId(uint256) external;}
contract V3LegacyProofVerifierTest {
    VmLegacyProof constant vm=VmLegacyProof(address(uint160(uint256(keccak256("hevm cheat code")))));
    Verifier verifier;
    function setUp() public {vm.chainId(84532);verifier=new Verifier();}
    // Independent Python SHA-256 / fixed-width byte encoding vector.
    function commitment() private pure returns(Verifier.Commitment memory){
        return Verifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(201),address(202),2,20,16,
            0x874e84f376daa40563141813015b5a4c1c08cc6001867759f4db578a914e53ca);
    }
    function row() private pure returns(Verifier.Row memory){
        return Verifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),address(101),100,7,bytes32(uint256(31)));
    }
    function proof() private pure returns(Verifier.Node[] memory p){
        p=new Verifier.Node[](1);p[0]=Verifier.Node(0x75d8a2ff3aec21ef9e700d051fded9469549b855cbbe3cea9962cb32be7525c6,9);
    }
    function testIndependentBinaryVectorBothDirections() public view {
        require(verifier.verify(commitment(),0,row(),proof()));
        Verifier.Node[] memory p=new Verifier.Node[](1);
        p[0]=Verifier.Node(0x75fbb26e69e9985e6dbf2ee85ef03bb81d96893056876376a869c2b022a18615,7);
        Verifier.Row memory r=Verifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),address(102),200,9,bytes32(uint256(32)));
        require(verifier.verify(commitment(),1,r,p));
    }
    function testCanonicalGeneratorVector() public view {
        Verifier.Commitment memory c=Verifier.Commitment(
            0x09ced17b8f096101418527fcff7a87e27c417f7ebff09ff9cc0f2b4522371406,
            0xda25814f85c83754bee9858baa74f8f431f772f2ff1567e609919599640532ee,
            address(201),address(202),2,20,16,
            0x5d5cb73c8bacde515bccff52fcc9efc3604d39be51de7d95dbf2c52bb8d70284);
        Verifier.Row memory r=Verifier.Row(bytes32((uint256(1)<<248)+11),bytes32((uint256(1)<<248)+21),address(101),100,7,bytes32(uint256(31)));
        Verifier.Node[] memory p=new Verifier.Node[](1);
        p[0]=Verifier.Node(0x7cd40b1190294231661d449f7f60100bb708a01b10e502c547c6810360b57e5c,9);
        require(verifier.verify(c,0,r,p));
    }
    function testAlteredRowAndIndexRejected() public view {
        Verifier.Row memory r=row();r.award++;
        require(!verifier.verify(commitment(),0,r,proof()));
        r=row();r.recipient=address(999);require(!verifier.verify(commitment(),0,r,proof()));
        require(!verifier.verify(commitment(),1,row(),proof()));
        require(!verifier.verify(commitment(),2,row(),proof()));
    }
    function testAlteredSumHashAndLengthRejected() public view {
        Verifier.Node[] memory p=proof();p[0].sum=type(uint256).max;
        require(!verifier.verify(commitment(),0,row(),p));
        p=proof();p[0].hash=bytes32(uint256(1));require(!verifier.verify(commitment(),0,row(),p));
        p=new Verifier.Node[](0);require(!verifier.verify(commitment(),0,row(),p));
    }
    function testContextTargetAndCapBinding() public view {
        Verifier.Commitment memory c=commitment();c.contextHash=bytes32(uint256(99));
        require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.targetVault=address(999);require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.cap=19;require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.cap=verifier.RESERVE()+1;require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.allocated=15;require(!verifier.verify(c,0,row(),proof()));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);require(!verifier.verify(commitment(),0,row(),proof()));
    }
}

```

## base/v3-testnet/test/V3LiquidityPolicy.t.sol
Git blob: d0694981645225a6d7ce0e6f952d041106a75980

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3LiquidityPolicyFixture,V3SyntheticLPLock,IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
interface VmLP {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract LPFixtureAsset is ERC20 {
    constructor() ERC20("Synthetic asset","SYN"){_mint(msg.sender,888888888000000);}
}
contract LPFixtureCustody {}
contract LPFixturePool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    uint256 public mode;
    constructor(address a,address q) ERC20("Synthetic LP","SYNLP"){asset=a;quote=q;}
    function setMode(uint256 m) external {mode=m;}
    function addLiquidity(uint256 a,uint256 q,uint256,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,mode==6?address(0x777):address(this),mode==1?a-1:a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        uint256 shares=mode==2?1:100;
        _mint(mode==3?msg.sender:recipient,shares);
        if(mode==5)_mint(address(0x777),shares);
        return mode==4?101:shares;
    }
}
contract V3LiquidityPolicyTest {
    VmLP constant vm=VmLP(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=222222222000000;
    uint256 constant A=1000;
    uint256 constant Q=500;
    LPFixtureAsset asset;
    LPFixtureAsset quote;
    LPFixturePool pool;
    LPFixtureCustody custody;
    V3LiquidityPolicyFixture vault;
    uint256 expiry;
    function setUp() public {
        vm.chainId(84532);
        asset=new LPFixtureAsset();quote=new LPFixtureAsset();
        pool=new LPFixturePool(address(asset),address(quote));custody=new LPFixtureCustody();
        expiry=block.timestamp+1 days;
        vault=make(address(custody),A,Q,50,expiry,address(pool).codehash);
        asset.transfer(address(vault),RESERVE);quote.transfer(address(vault),Q);
    }
    function make(address dest,uint256 a,uint256 q,uint256 minimum,uint256 end,bytes32 h) internal returns(V3LiquidityPolicyFixture){
        return new V3LiquidityPolicyFixture(asset,quote,IV3SyntheticPool(address(pool)),h,dest,a,q,minimum,end);
    }
    function testExactSpendAndDirectLockedShares() public {
        vault.execute();
        require(vault.executed()&&vault.sharesLocked()==100);
        require(asset.balanceOf(address(vault))==RESERVE-A&&quote.balanceOf(address(vault))==0);
        require(asset.balanceOf(address(pool))==A&&quote.balanceOf(address(pool))==Q);
        require(pool.balanceOf(address(vault.locker()))==100&&pool.balanceOf(address(vault))==0);
        require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);vault.execute();
    }
    function testLockDurationAndFixedCustody() public {
        vault.execute();
        V3SyntheticLPLock lock=vault.locker();
        require(lock.unlockAt()==expiry+730 days&&lock.custody()==address(custody));
        vm.warp(lock.unlockAt()-1);
        vm.expectRevert(V3SyntheticLPLock.Locked.selector);lock.release();
        vm.warp(lock.unlockAt());lock.release();
        require(pool.balanceOf(address(custody))==100&&pool.balanceOf(address(lock))==0);
    }
    function testUnfundedQuoteAndReserveRejected() public {
        V3LiquidityPolicyFixture empty=make(address(custody),A,Q,50,expiry,address(pool).codehash);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);empty.execute();
        asset.transfer(address(empty),RESERVE);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);empty.execute();
        require(!empty.executed());
    }
    function testRejectPartialSpendLowSharesWrongRecipientOrReport() public {
        for(uint256 m=1;m<=4;m++){
            pool.setMode(m);
            vm.expectRevert(V3LiquidityPolicyFixture.BalanceMismatch.selector);vault.execute();
            require(!vault.executed()&&asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==Q);
            require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
            require(pool.totalSupply()==0);
        }
        pool.setMode(0);vault.execute();require(vault.executed());
    }
    function testRejectInvalidParametersAndEOACustody() public {
        bytes32 h=address(pool).codehash;
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),RESERVE+1,Q,50,expiry,h);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,0,50,expiry,h);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,Q,0,expiry,h);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,Q,50,expiry,bytes32(0));
        vm.expectRevert(V3SyntheticLPLock.InvalidLock.selector);make(address(123),A,Q,50,expiry,h);
    }
    function testExpiryKeepsReserveLocked() public {
        vm.warp(expiry);
        vm.expectRevert(V3LiquidityPolicyFixture.NotReady.selector);vault.execute();
        require(asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==Q);
    }
    function testMainnetRejected() public {
        bytes32 h=address(pool).codehash;
        vm.chainId(8453);
        vm.expectRevert(V3LiquidityPolicyFixture.InvalidConfig.selector);make(address(custody),A,Q,50,expiry,h);
    }
}

```

## base/v3-testnet/test/V3RestrictedSpend.t.sol
Git blob: 92c32f4b428859eea1f6482e73808499a5de5136

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3RestrictedSpend} from "../src/V3RestrictedSpend.sol";
interface VmSpend {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract SpendFixtureToken is ERC20 {
    constructor() ERC20("Synthetic spend fixture","FIXTURE"){_mint(msg.sender,600000);}
}
contract V3RestrictedSpendTest {
    VmSpend constant vm=VmSpend(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    SpendFixtureToken token;
    V3RestrictedSpend v;
    address[5] signers;
    function setUp() public {
        vm.chainId(84532);
        for(uint256 i=0;i<5;i++) signers[i]=address(uint160(i+10));
        token=new SpendFixtureToken();
        start=block.timestamp+1 days;
        v=new V3RestrictedSpend(token,signers,FOUNDER,start,600000,"TREASURY");
        token.transfer(address(v),600000);
    }
    function propose(uint256 amount,uint256 month,bytes32 nonce) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,"EVIDENCE",month,nonce);
    }
    function approve3(bytes32 id) internal {
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testThresholdDelayAndExactPayment() public {
        bytes32 id=propose(10000,0,"A");
        for(uint256 i=0;i<2;i++){vm.prank(signers[i]);v.approve(id);}
        vm.warp(start);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[2]);v.approve(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10000&&v.totalSpent()==10000&&v.spent(0)==10000);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
    }
    function testDuplicateAndUnauthorizedApprovals() public {
        bytes32 id=propose(1,0,"A");
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.approve(id);
        vm.prank(signers[0]);v.approve(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.AlreadyApproved.selector);v.approve(id);
    }
    function testAggregateCapAndNoRollover() public {
        bytes32 a=propose(8000,1,"A");
        bytes32 b=propose(3000,1,"B");
        approve3(a);approve3(b);
        vm.warp(start+30 days);v.execute(a);
        vm.expectRevert(V3RestrictedSpend.CapExceeded.selector);v.execute(b);
        require(v.spent(0)==0&&v.spent(1)==8000);
    }
    function testExpiry() public {
        bytes32 a=propose(1,0,"A");approve3(a);
        vm.warp(start+30 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(a);
    }
    function testBeforeWindowEvenWithThreshold() public {
        bytes32 a=propose(1,1,"A");approve3(a);
        vm.warp(start+2 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(a);
    }
    function testRejectDirectFounderAndSignerRecipient() public {
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(FOUNDER,1,"E",0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(signers[1],1,"E",0,"A");
    }
    function testRejectDuplicateSignerAndFounderSigner() public {
        address[5] memory s=signers;s[4]=s[0];
        vm.expectRevert(V3RestrictedSpend.InvalidConfig.selector);new V3RestrictedSpend(token,s,FOUNDER,start,1,"T");
        s[4]=FOUNDER;
        vm.expectRevert(V3RestrictedSpend.InvalidConfig.selector);new V3RestrictedSpend(token,s,FOUNDER,start,1,"T");
    }
    function testExactCapSum() public {
        V3RestrictedSpend odd=new V3RestrictedSpend(token,signers,FOUNDER,start,600001,"ODD");
        uint256 sum;for(uint256 i=0;i<60;i++)sum+=odd.monthlyCap(i);
        require(sum==600001&&odd.monthlyCap(60)==0);
    }
    function testDuplicateProposalAndMissingEvidence() public {
        propose(1,0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(PAYEE,1,"EVIDENCE",0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(PAYEE,1,0,0,"B");
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(V3RestrictedSpend.WrongChain.selector);new V3RestrictedSpend(token,signers,FOUNDER,start,1,"T");
    }

    function testRevocationResetsDelayAtLostQuorum() public {
        bytes32 id=propose(10000,0,"A");approve3(id);
        vm.warp(start+2 days);
        vm.prank(signers[1]);v.revokeApproval(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[3]);v.approve(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.warp(start+4 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10000);
    }
    function testRevocationWithRemainingQuorumKeepsDelay() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(signers[3]);v.approve(id);
        vm.prank(signers[0]);v.revokeApproval(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==1);
    }
    function testCancellationQuorumPermanentAndNoSpend() public {
        bytes32 id=propose(10000,0,"A");approve3(id);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.voteCancel(id);}
        require(v.cancelled(id)&&v.cancelVotes(id)==3);
        vm.warp(start+2 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[3]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.approve(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        require(v.totalSpent()==0&&token.balanceOf(PAYEE)==0);
        bytes32 next=propose(10000,0,"B");approve3(next);
        vm.warp(start+4 days);v.execute(next);
        require(token.balanceOf(PAYEE)==10000);
    }
    function testMinorityCancelCannotVetoOrDoubleVote() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(signers[0]);v.voteCancel(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
        vm.prank(signers[1]);v.voteCancel(id);
        require(!v.cancelled(id));
        vm.warp(start+2 days);v.execute(id);
        vm.prank(signers[2]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
    }
    function testUnauthorizedUnknownAndExpiredActions() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.voteCancel(id);
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.revokeApproval(id);
        vm.prank(signers[4]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(bytes32(uint256(999)));
        vm.warp(start+30 days);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
    }
}

```

## base/v3-testnet/test/V3SharedExpense.t.sol
Git blob: 7be349f573d7b827f586112c21ef58948348fb7f

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3SharedExpenseFixture,V3SharedExpenseRegistry,V3SharedRestrictedSpend} from "../src/V3SharedExpenseFixture.sol";
interface VmShared {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
}
contract SharedTestAsset is ERC20 {
    constructor() ERC20("Synthetic expense asset","EXPTEST"){_mint(msg.sender,888888888000000);}
}
contract V3SharedExpenseTest {
    VmShared constant vm=VmShared(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    SharedTestAsset token;
    V3SharedExpenseFixture fixture;
    V3SharedExpenseRegistry registry;
    V3SharedRestrictedSpend e;
    V3SharedRestrictedSpend c;
    V3SharedRestrictedSpend t;
    address[5] signers;
    function setUp() public {
        vm.chainId(84532);
        for(uint256 i=0;i<5;i++)signers[i]=address(uint160(i+10));
        token=new SharedTestAsset();
        start=block.timestamp+1 days;
        fixture=new V3SharedExpenseFixture(token,signers,FOUNDER,start);
        registry=fixture.registry();e=fixture.ecosystem();c=fixture.community();t=fixture.treasury();
        token.transfer(address(e),e.budget());token.transfer(address(c),c.budget());
        // Treasury deliberately unfunded until a test transfers funds.
    }
    function proposal(V3SharedRestrictedSpend v,bytes32 evidence,bytes32 nonce,uint256 amount) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,evidence,0,nonce);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testAtomicBindingAndNoRebind() public {
        require(registry.isSealed()&&registry.consumer(address(e))&&registry.consumer(address(c))&&registry.consumer(address(t)));
        require(address(e.registry())==address(registry)&&address(c.registry())==address(registry)&&address(t.registry())==address(registry));
        vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);registry.bind([address(e),address(c),address(t)]);
        vm.expectRevert(V3SharedExpenseRegistry.UnauthorizedConsumer.selector);registry.consume("E","P");
    }
    function testSameExpenseAcrossPurposesCannotPayTwice() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"E","B",20);
        vm.warp(start+2 days);e.execute(a);
        require(registry.consumedBy("E")==address(e)&&registry.consumedProposal("E")==a);
        vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);c.execute(b);
        require(e.totalSpent()==10&&c.totalSpent()==0&&token.balanceOf(PAYEE)==10);
    }
    function testSameVaultDifferentNonceCannotReplayExpense() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(e,"E","B",20);
        vm.warp(start+2 days);e.execute(a);
        vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);e.execute(b);
        require(e.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testTransferRevertRollsBackConsumptionAndAccounting() public {
        bytes32 a=proposal(t,"E","A",10);
        vm.warp(start+2 days);
        vm.expectRevert();t.execute(a);
        require(registry.consumedBy("E")==address(0)&&t.totalSpent()==0&&t.spent(0)==0);
        token.transfer(address(t),10);t.execute(a);
        require(registry.consumedBy("E")==address(t)&&t.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testCancelledProposalDoesNotConsumeExpense() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"E","B",20);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);e.voteCancel(a);}
        vm.warp(start+2 days);
        vm.expectRevert(V3SharedRestrictedSpend.NotReady.selector);e.execute(a);
        require(registry.consumedBy("E")==address(0));c.execute(b);
        require(registry.consumedBy("E")==address(c)&&token.balanceOf(PAYEE)==20);
    }
    function testDifferentExpensesAndDelay() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"F","B",20);
        vm.expectRevert(V3SharedRestrictedSpend.NotReady.selector);e.execute(a);
        vm.warp(start+2 days);e.execute(a);c.execute(b);
        require(registry.consumedBy("E")==address(e)&&registry.consumedBy("F")==address(c)&&token.balanceOf(PAYEE)==30);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);new V3SharedExpenseFixture(token,signers,FOUNDER,block.timestamp+1 days);
    }
}

```
