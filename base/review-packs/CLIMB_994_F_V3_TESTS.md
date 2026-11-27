# CLIMB V3 #994 re-review — F: token issuance, legacy and liquidity tests
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Six complete test sources, GitHub-reported blob IDs; not independently rehashed. V3 CI 46015224824 SUCCESS. TESTNET_NO_GO / MAINNET_NO_GO.

## base/v3-testnet/test/ClimbV3IntegratedTestToken.t.sol
Git blob: 94426c3969ddba33c477efefccdd47168566f768

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbV3IntegratedTestToken} from "../src/ClimbV3IntegratedTestToken.sol";
import {V3GamingVault} from "../src/ClimbV3TestToken.sol";
import {V3RestrictedSpend} from "../src/V3RestrictedSpend.sol";
interface VmIntegrated {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract ClimbV3IntegratedTestTokenTest {
    VmIntegrated constant vm=VmIntegrated(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(0xF00D);
    address constant DISTRIBUTOR=address(0xB0B);
    address constant PAYEE=address(0xCAFE);
    uint256 constant SUPPLY=888888888000000;
    uint256 start;
    address[5] signers;
    ClimbV3IntegratedTestToken t;
    function setUp() public {
        vm.chainId(84532);
        start=block.timestamp+1 days;
        for(uint256 i=0;i<5;i++)signers[i]=address(uint160(1000+i));
        t=new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
    function testExactFundingAndAssetBinding() public view {
        require(t.totalSupply()==SUPPLY&&t.decimals()==6);
        require(t.balanceOf(address(t.founderVault()))==17777777760000);
        require(t.balanceOf(address(t.gamingVault()))==311111110800000);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
        V3RestrictedSpend[3] memory v=[t.ecosystemReserve(),t.communityReserve(),t.treasuryReserve()];
        uint256[3] memory caps=[uint256(133333333200000),88888888800000,106666666560000];
        for(uint256 i=0;i<3;i++){
            require(address(v[i].token())==address(t)&&v[i].budget()==caps[i]&&t.balanceOf(address(v[i]))==caps[i]);
        }
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==0&&t.balanceOf(DISTRIBUTOR)==0);
    }
    function propose(V3RestrictedSpend v,uint256 amount) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,"MILESTONE",0,"NONCE");
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testReleaseBoundToOneReserve() public {
        V3RestrictedSpend v=t.ecosystemReserve();
        uint256 amount=v.monthlyCap(0);
        bytes32 id=propose(v,amount);
        vm.warp(start+2 days);
        V3RestrictedSpend other=t.treasuryReserve();
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);other.execute(id);
        v.execute(id);
        require(t.balanceOf(PAYEE)==amount&&v.totalSpent()==amount);
        require(t.balanceOf(address(v))==v.budget()-amount);
        require(t.treasuryReserve().totalSpent()==0&&t.communityReserve().totalSpent()==0);
        require(t.totalSupply()==SUPPLY);
    }
    function testConcurrentReleaseAndBurnConservation() public {
        uint256 amount=1000000;
        bytes32 a=propose(t.ecosystemReserve(),amount);
        bytes32 b=propose(t.communityReserve(),amount);
        require(a!=b);
        vm.warp(start+2 days);
        t.ecosystemReserve().execute(a);
        t.communityReserve().execute(b);
        V3GamingVault game=t.gamingVault();
        vm.prank(DISTRIBUTOR);game.release(amount);
        vm.prank(PAYEE);t.burn(amount);
        require(t.totalSupply()==SUPPLY-amount);
        require(t.balanceOf(PAYEE)==amount&&t.balanceOf(DISTRIBUTOR)==amount);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
    }
    function testNoLiquidityOrLegacyRelease() public {
        (bool a,)=address(t.liquidityReserve()).call(abi.encodeWithSignature("release(address,uint256)",PAYEE,1));
        (bool b,)=address(t.legacyReserve()).call(abi.encodeWithSignature("release(address,uint256)",PAYEE,1));
        require(!a&&!b);
    }
    function testRejectSignerDistributorOverlap() public {
        signers[0]=DISTRIBUTOR;
        vm.expectRevert(ClimbV3IntegratedTestToken.InvalidConfig.selector);
        new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbV3IntegratedTestToken.WrongChain.selector);
        new ClimbV3IntegratedTestToken(FOUNDER,DISTRIBUTOR,start,signers);
    }
}

```

## base/v3-testnet/test/ClimbV3TestToken.t.sol
Git blob: acf600eb037b0ea0a69dfd8e45b53f9f14bbb94c

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbV3TestToken,V3FounderVesting,V3GamingVault} from "../src/ClimbV3TestToken.sol";
interface VmV3 {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract ClimbV3TestTokenTest {
    VmV3 constant vm=VmV3(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(0xA11CE);
    address constant DISTRIBUTOR=address(0xB0B);
    uint256 constant MONTH=30 days;
    uint256 constant SUPPLY=888888888000000;
    uint256 constant F=17777777760000;
    uint256 constant G=311111110800000;
    uint256 start;
    ClimbV3TestToken t;
    V3FounderVesting f;
    V3GamingVault g;
    function setUp() public {
        vm.chainId(84532);
        start=block.timestamp+1 days;
        t=new ClimbV3TestToken(FOUNDER,DISTRIBUTOR,start);
        f=t.founderVault();g=t.gamingVault();
    }
    function testExactAllocationsAndZeroLaunchFloat() public view {
        require(t.decimals()==6&&t.totalSupply()==SUPPLY);
        require(t.balanceOf(address(f))==F&&t.balanceOf(address(g))==G);
        require(t.balanceOf(address(t.liquidityReserve()))==222222222000000);
        require(t.balanceOf(address(t.ecosystemReserve()))==133333333200000);
        require(t.balanceOf(address(t.communityReserve()))==88888888800000);
        require(t.balanceOf(address(t.treasuryReserve()))==106666666560000);
        require(t.balanceOf(address(t.legacyReserve()))==8888888880000);
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==0&&t.balanceOf(DISTRIBUTOR)==0);
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbV3TestToken.WrongChain.selector);
        new ClimbV3TestToken(FOUNDER,DISTRIBUTOR,start);
    }
    function testRejectSameBeneficiaryAndDistributor() public {
        vm.expectRevert(ClimbV3TestToken.InvalidConfig.selector);
        new ClimbV3TestToken(FOUNDER,FOUNDER,start);
    }
    function testRejectImmediateStart() public {
        vm.expectRevert(V3FounderVesting.InvalidConfig.selector);
        new ClimbV3TestToken(FOUNDER,DISTRIBUTOR,block.timestamp);
    }
    function testFounderCliffNoCatchup() public {
        vm.warp(start+12*MONTH);
        require(f.vested()==0);
        vm.expectRevert(V3FounderVesting.NothingDue.selector);f.release();
        vm.warp(start+13*MONTH);
        f.release();
        require(t.balanceOf(FOUNDER)==F/36&&f.released()==F/36);
        vm.expectRevert(V3FounderVesting.NothingDue.selector);f.release();
    }
    function testFounderExactFinalRemainder() public {
        for(uint256 i=13;i<=48;i++){
            vm.warp(start+i*MONTH);
            f.release();
            require(f.released()==F*(i-12)/36);
        }
        require(t.balanceOf(FOUNDER)==F&&t.balanceOf(address(f))==0);
        require(t.totalSupply()==SUPPLY);
    }
    function testFounderCannotRedirectOrAccelerate() public {
        (bool a,)=address(f).call(abi.encodeWithSignature("setBeneficiary(address)",address(this)));
        (bool b,)=address(f).call(abi.encodeWithSignature("accelerate()"));
        require(!a&&!b);
        vm.warp(start+13*MONTH);
        f.release();
        require(t.balanceOf(address(this))==0&&t.balanceOf(FOUNDER)==F/36);
    }
    function testGamingCapsSumToAllocation() public view {
        uint256 sum;
        for(uint256 i=0;i<60;i++)sum+=g.monthlyCap(i);
        require(sum==G&&g.monthlyCap(60)==0);
        require(g.monthlyCap(0)>g.monthlyCap(12)&&g.monthlyCap(12)>g.monthlyCap(24));
    }
    function testGamingBeforeStartAndUnauthorized() public {
        vm.prank(DISTRIBUTOR);vm.expectRevert(V3GamingVault.OutsideWindow.selector);g.release(1);
        vm.warp(start);
        vm.expectRevert(V3GamingVault.NotDistributor.selector);g.release(1);
    }
    function testGamingMonthlyCapAndNoCatchup() public {
        vm.warp(start+MONTH);
        uint256 cap=g.monthlyCap(1);
        vm.prank(DISTRIBUTOR);g.release(cap);
        vm.prank(DISTRIBUTOR);vm.expectRevert(V3GamingVault.CapExceeded.selector);g.release(1);
        require(g.monthlyReleased(0)==0&&g.monthlyReleased(1)==cap&&g.released()==cap);
    }
    function testGamingExpiry() public {
        vm.warp(start+60*MONTH);
        vm.prank(DISTRIBUTOR);vm.expectRevert(V3GamingVault.OutsideWindow.selector);g.release(1);
        require(t.balanceOf(address(g))==G);
    }
    function testNoMintForcedBurnOrReserveRelease() public {
        (bool a,)=address(t).call(abi.encodeWithSignature("mint(address,uint256)",address(this),1));
        (bool b,)=address(t).call(abi.encodeWithSignature("burnFrom(address,uint256)",address(t.liquidityReserve()),1));
        (bool c,)=address(t.liquidityReserve()).call(abi.encodeWithSignature("release(address,uint256)",address(this),1));
        require(!a&&!b&&!c&&t.totalSupply()==SUPPLY);
    }
    function testHolderBurnAndUntaxedTransfer() public {
        vm.warp(start+13*MONTH);f.release();
        vm.prank(FOUNDER);t.transfer(DISTRIBUTOR,100);
        require(t.balanceOf(DISTRIBUTOR)==100&&t.totalSupply()==SUPPLY);
        vm.prank(DISTRIBUTOR);t.burn(100);
        require(t.totalSupply()==SUPPLY-100&&t.balanceOf(DISTRIBUTOR)==0);
    }
}

```

## base/v3-testnet/test/V3AtomicSuccessor.t.sol
Git blob: 0b82c6586f0ed23d01601d96132b8513c2ffa950

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting} from "../src/ClimbV3TestToken.sol";
import {V3GovernedGameRewardFixture} from "../src/V3GovernedGameRewardFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "../src/V3LegacyProofVerifierFixture.sol";
import {V3LegacyProofClaimFixture} from "../src/V3LegacyProofClaimFixture.sol";
import {IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
import {V3DeferredLiquidityFixture} from "../src/V3DeferredLiquidityFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConditionalDeployer,V3SuccessorLegacyDeployer,V3SuccessorTestToken,V3SuccessorConfig,V3SuccessorLiquidityConfig,IV3SyntheticPoolBuilder} from "../src/V3AtomicSuccessorFixture.sol";
interface VmSuccessor {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function warp(uint256) external;
    function prank(address) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert(bytes4) external;
}
contract SuccessorQuote is ERC20 {
    constructor() ERC20("Synthetic quote","QTEST"){_mint(msg.sender,1000000);}
}
contract SuccessorCustodyDestination {}
// Intentionally unrestricted mock. NOT actual multisig authorization.
contract SuccessorMockCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public constant override threshold=3;
    uint256 public constant override memberCount=5;
    function isMember(address) external pure override returns(bool){return false;}
    function rewardSignerAllowed(address) external pure returns(bool){return true;}
    function expenseRecipientAllowed(address) external pure returns(bool){return true;}
    function propose(V3EpochSpendFixture v,address recipient,bytes32 evidence,bytes32 nonce,uint256 amount) external returns(bytes32){
        return v.propose(recipient,amount,evidence,0,nonce);
    }
    function scheduleLiquidity(V3DeferredLiquidityFixture v,uint256 deadline) external returns(bytes32){return v.schedule(1000,500,50,deadline,"LP");}
    function scheduleLegacy(V3LegacyProofClaimFixture v,bytes32 digest,uint256 expiry) external {v.schedule(digest,expiry);}
    function rotate() external {epoch++;}
}
contract SuccessorMockPool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    constructor(IERC20 a,IERC20 q) ERC20("Synthetic LP","LPTEST"){asset=address(a);quote=address(q);}
    function addLiquidity(uint256 a,uint256 q,uint256 minimum,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,address(this),a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        require(minimum<=100);_mint(recipient,100);return 100;
    }
}
contract SuccessorMockPoolBuilder is IV3SyntheticPoolBuilder {
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){
        return IV3SyntheticPool(address(new SuccessorMockPool(a,q)));
    }
}
contract V3AtomicSuccessorTest {
    VmSuccessor constant vm=VmSuccessor(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant SUPPLY=888888888000000;
    address constant FOUNDER=address(1001);
    uint256 constant REWARD_KEY=12345;
    address DISTRIBUTOR;
    address constant CLAIMANT=address(1003);
    address constant PAYEE=address(1004);
    SuccessorQuote quote;
    SuccessorMockCustody control;
    V3AtomicSuccessorFixture factory;
    V3SuccessorConfig cfg;
    function setUp() public {
        vm.chainId(84532);
        quote=new SuccessorQuote();control=new SuccessorMockCustody();
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        factory=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        DISTRIBUTOR=vm.addr(REWARD_KEY);
        cfg.gamingWalletMonthlyCap=1000;
        cfg.founder=FOUNDER;cfg.distributor=DISTRIBUTOR;cfg.control=control;cfg.start=block.timestamp+1 days;
        cfg.liquidity=V3SuccessorLiquidityConfig(quote,new SuccessorMockPoolBuilder(),address(new SuccessorCustodyDestination()),1000);
    }
    function testConditionalHelperIdentityPinned() public {
        V3SuccessorConditionalDeployer helper=factory.conditional();
        require(factory.conditionalHash()==address(helper).codehash);
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);
        new V3AtomicSuccessorFixture(helper,bytes32(uint256(1)));
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);
        new V3AtomicSuccessorFixture(V3SuccessorConditionalDeployer(address(0)),bytes32(0));
        bytes memory original=address(helper).code;
        vm.etch(address(helper),hex"60006000f3");
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0));
        vm.etch(address(helper),original);
        require(factory.create(cfg).totalSupply()==SUPPLY);
    }
    function testStagedLegacyHelperIdentityAndRollback() public {
        V3SuccessorConditionalDeployer helper=factory.conditional();
        V3SuccessorLegacyDeployer stage=helper.legacyDeployer();
        require(stage.factory()==address(helper)&&helper.legacyDeployerHash()==address(stage).codehash);
        V3SuccessorTestToken empty=new V3SuccessorTestToken();
        vm.expectRevert(V3SuccessorLegacyDeployer.Unauthorized.selector);
        stage.legacy(empty,control);
        vm.expectRevert(V3SuccessorLegacyDeployer.Unauthorized.selector);
        stage.proofLegacy(empty,control);
        bytes memory original=address(stage).code;
        vm.etch(address(stage),hex"60006000f3");
        vm.expectRevert(V3SuccessorConditionalDeployer.InvalidLegacyDeployer.selector);
        factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0)&&factory.vaults(6)==address(0));
        vm.etch(address(stage),original);
        V3LegacyProofClaimFixture proof=helper.proofLegacy(empty,control);
        require(address(proof.token())==address(empty)&&address(proof.custody())==address(control)&&!proof.activated());
        require(empty.totalSupply()==0&&empty.balanceOf(address(proof))==0);
        V3SuccessorTestToken token=factory.create(cfg);
        require(token.totalSupply()==SUPPLY&&token.balanceOf(factory.vaults(6))==8888888880000);
    }
    function testAtomicSevenDestinationsAndZeroFloat() public {
        V3SuccessorTestToken token=factory.create(cfg);
        require(token.issued()&&token.issuer()==address(factory)&&token.totalSupply()==SUPPLY&&token.decimals()==6);
        uint256[7] memory expected=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++){
            require(token.balanceOf(factory.vaults(i))==expected[i]);
            for(uint256 j=0;j<i;j++)require(factory.vaults(i)!=factory.vaults(j));
        }
        require(token.balanceOf(address(this))==0&&token.balanceOf(address(factory))==0&&token.balanceOf(FOUNDER)==0&&token.balanceOf(DISTRIBUTOR)==0);
        require(address(V3FounderVesting(factory.vaults(0)).token())==address(token));
        require(address(V3GovernedGameRewardFixture(factory.vaults(1)).token())==address(token));
        require(address(V3DeferredLiquidityFixture(factory.vaults(2)).asset())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(3)).token())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(4)).token())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(5)).token())==address(token));
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        require(address(legacy.token())==address(token)&&!legacy.activated()&&legacy.allocated()==0&&address(legacy.custody())==address(control));
    }
    function testFactoryAndTokenCannotIssueTwice() public {
        V3SuccessorTestToken token=factory.create(cfg);
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
        address[7] memory v;for(uint256 i=0;i<7;i++)v[i]=factory.vaults(i);
        vm.prank(address(factory));vm.expectRevert(V3SuccessorTestToken.InvalidIssuance.selector);token.issue(v);
    }
    function testNonCreatorCannotConsumeFactory() public {
        vm.prank(PAYEE);vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0));
        factory.create(cfg);
    }
    function testInvalidLiquidityConfigRollsBackWholeCreation() public {
        cfg.liquidity.trancheCap=0;
        vm.expectRevert(V3DeferredLiquidityFixture.InvalidConfig.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0)&&factory.vaults(0)==address(0));
        cfg.liquidity.trancheCap=1000;require(factory.create(cfg).totalSupply()==SUPPLY);
    }
    function testIntegratedReleaseLiquidityClaimAndBurnConservation() public {
        V3SuccessorTestToken token=factory.create(cfg);
        _scheduleLiquidity();
        _scheduleLegacy();
        V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(3));
        V3EpochSpendFixture c=V3EpochSpendFixture(factory.vaults(4));
        bytes32 a=control.propose(e,PAYEE,"E","A",10);
        bytes32 b=control.propose(c,PAYEE,"E","B",10);
        vm.warp(cfg.start+2 days);e.execute(a);
        _executeLiquidity(token);
        vm.expectRevert(bytes4(keccak256("ExpenseAlreadyConsumed()")));c.execute(b);
        _claimGameReward();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        _activateLegacy(legacy);
        vm.prank(CLAIMANT);legacy.claim(0,_legacyRow(),new LegacyVerifier.Node[](0));
        require(token.totalSupply()==SUPPLY&&token.balanceOf(PAYEE)==210&&token.balanceOf(DISTRIBUTOR)==0&&token.balanceOf(CLAIMANT)==100);
        vm.prank(CLAIMANT);token.burn(10);
        vm.warp(legacy.appealEnd());
        control.scheduleLegacy(legacy,legacy.closureDigest("REVIEW"),block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);legacy.finalize("REVIEW");
        require(token.totalSupply()==SUPPLY-10-(legacy.RESERVE()-100)&&legacy.paid()+legacy.burned()==legacy.RESERVE());
    }
    function _legacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),CLAIMANT,100,100,bytes32(uint256(31)));
    }
    function _manifest(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_legacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function _scheduleLegacy() private {
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        control.scheduleLegacy(legacy,legacy.activationDigest(_manifest(legacy)),block.timestamp+7 days);
    }
    function _activateLegacy(V3LegacyProofClaimFixture legacy) private {
        legacy.activate(_manifest(legacy));
    }
    function testDeferredLegacyDoesNotBlockIssuanceOrRequireEarlyManifest() public {
        V3SuccessorTestToken token=factory.create(cfg);
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(factory.vaults(6));
        vm.warp(block.timestamp+365 days);
        require(!legacy.activated()&&token.balanceOf(address(legacy))==legacy.RESERVE());
        vm.expectRevert(V3LegacyProofClaimFixture.NotReady.selector);legacy.finalize("REVIEW");
        _scheduleLegacy();
        vm.warp(block.timestamp+2 days);_activateLegacy(legacy);
        require(legacy.activated()&&legacy.deadline()==block.timestamp+30 days&&token.totalSupply()==SUPPLY);
    }
    bytes32 private lpAction;
    function _scheduleLiquidity() private {
        V3DeferredLiquidityFixture liquidity=V3DeferredLiquidityFixture(factory.vaults(2));
        require(quote.balanceOf(address(liquidity))==0&&liquidity.spent()==0);
        lpAction=control.scheduleLiquidity(liquidity,cfg.start+7 days);
    }
    function _executeLiquidity(V3SuccessorTestToken token) private {
        V3DeferredLiquidityFixture liquidity=V3DeferredLiquidityFixture(factory.vaults(2));
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);liquidity.execute(lpAction);
        quote.transfer(address(liquidity),500);liquidity.execute(lpAction);
        (,,,,,,,,address lock)=liquidity.actions(lpAction);
        require(liquidity.pool().balanceOf(lock)==100&&token.balanceOf(address(liquidity.pool()))==1000);
    }
    function _claimGameReward() private {
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(factory.vaults(1));
        V3GovernedGameRewardFixture.Reward memory x=V3GovernedGameRewardFixture.Reward("GAME_EVENT",PAYEE,200,0,cfg.start+30 days,1);
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(REWARD_KEY,gaming.digest(x));
        gaming.claim(x,abi.encodePacked(r,s,v));
    }
    function testEpochChangeAndFounderCliffInIntegratedAsset() public {
        V3SuccessorTestToken token=factory.create(cfg);
        V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(3));
        bytes32 old=control.propose(e,PAYEE,"E","A",10);
        vm.warp(cfg.start+2 days);control.rotate();
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(old);
        V3FounderVesting f=V3FounderVesting(factory.vaults(0));
        vm.warp(cfg.start+12*30 days);
        vm.expectRevert(V3FounderVesting.NothingDue.selector);f.release();
        vm.warp(cfg.start+13*30 days);f.release();
        require(token.balanceOf(FOUNDER)==f.ALLOCATION()/36&&token.totalSupply()==SUPPLY);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        V3SuccessorConditionalDeployer helper=factory.conditional();bytes32 expected=factory.conditionalHash();
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);new V3AtomicSuccessorFixture(helper,expected);
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
    }
}

```

## base/v3-testnet/test/V3BoundedLegacy.t.sol
Git blob: dc2d2c5c65a038d3591dc49cbaf0f655abf74d13

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3BoundedLegacyFixture,IV3BurnableAsset} from "../src/V3BoundedLegacyFixture.sol";
interface VmLegacy {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract LegacyFixtureAsset is ERC20 {
    constructor() ERC20("Synthetic legacy asset","LEGTEST"){_mint(msg.sender,888888888000000);}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}
contract V3BoundedLegacyTest {
    VmLegacy constant vm=VmLegacy(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=8888888880000;
    uint256 constant SUPPLY=888888888000000;
    uint256 constant CAP=1000000;
    address constant A=address(101);
    address constant B=address(102);
    bytes32 constant CAMPAIGN="SYNTHETIC";
    LegacyFixtureAsset asset;
    V3BoundedLegacyFixture vault;
    uint256 opens;uint256 deadline;uint256 closure;
    bytes32[] ids;address[] recipients;uint256[] amounts;
    function setUp() public {
        vm.chainId(84532);
        asset=new LegacyFixtureAsset();
        opens=block.timestamp+1 days;deadline=opens+30 days;closure=deadline+14 days;
        ids.push("A");ids.push("B");recipients.push(A);recipients.push(B);amounts.push(100);amounts.push(200);
        vault=make(CAP);
        asset.transfer(address(vault),RESERVE);
    }
    function make(uint256 cap) internal returns(V3BoundedLegacyFixture){
        bytes32 h=keccak256(abi.encode("CLIMB_V3_SYNTHETIC_LEGACY_V1",block.chainid,address(asset),opens,deadline,closure,CAMPAIGN,cap,ids,recipients,amounts));
        return new V3BoundedLegacyFixture(IV3BurnableAsset(address(asset)),h,opens,deadline,closure);
    }
    function activate() internal {vault.activate(ids,recipients,amounts,CAP,CAMPAIGN);}
    function testExactManifestOneTimeActivation() public {
        activate();require(vault.activated()&&vault.budget()==CAP&&vault.allocated()==300);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);activate();
    }
    function testManifestMutationRejected() public {
        amounts[0]=101;
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);activate();
        require(!vault.activated());
    }
    function testUnfundedCannotActivate() public {
        vault=make(CAP);
        vm.expectRevert(V3BoundedLegacyFixture.NotFunded.selector);activate();
        require(!vault.activated());
    }
    function testDuplicateAndOversizedAllocationRejected() public {
        ids[1]=ids[0];vault=make(CAP);asset.transfer(address(vault),RESERVE);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);activate();
        require(!vault.activated()&&vault.recipient(ids[0])==address(0));
        ids[1]="B";amounts[1]=CAP;vault=make(CAP);asset.transfer(address(vault),RESERVE);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);activate();
    }
    function testCapAboveReserveRejected() public {
        vault=make(RESERVE+1);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);vault.activate(ids,recipients,amounts,RESERVE+1,CAMPAIGN);
    }
    function testRecipientOnlyClaimAndReplayNoMint() public {
        activate();vm.warp(opens);
        vm.expectRevert(V3BoundedLegacyFixture.NotEligible.selector);vault.claim("A");
        vm.prank(A);vault.claim("A");
        require(asset.balanceOf(A)==100&&vault.paid()==100&&asset.totalSupply()==SUPPLY);
        vm.prank(A);vm.expectRevert(V3BoundedLegacyFixture.AlreadyClaimed.selector);vault.claim("A");
    }
    function testClaimAndClosureWindows() public {
        activate();vm.prank(A);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.claim("A");
        vm.warp(deadline);vm.prank(A);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.claim("A");
        vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.closeAndBurn();
        vm.warp(closure);vault.closeAndBurn();
        require(vault.closed()&&vault.burned()==RESERVE&&asset.totalSupply()==SUPPLY-RESERVE);
        vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.closeAndBurn();
    }
    function testPaidAndBurnedReconcileDonationExcluded() public {
        activate();asset.transfer(address(vault),5);vm.warp(opens);
        vm.prank(B);vault.claim("B");vm.warp(closure);vault.closeAndBurn();
        require(vault.paid()+vault.burned()==RESERVE&&vault.burned()==RESERVE-200&&asset.balanceOf(address(vault))==5&&asset.totalSupply()==SUPPLY-RESERVE+200);
    }
    function testMissedActivationFailsClosed() public {
        vm.warp(opens);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);activate();
        vm.warp(closure);vm.expectRevert(V3BoundedLegacyFixture.InvalidWindow.selector);vault.closeAndBurn();
        require(asset.balanceOf(address(vault))==RESERVE);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert(V3BoundedLegacyFixture.WrongChain.selector);
        new V3BoundedLegacyFixture(IV3BurnableAsset(address(asset)),bytes32("M"),opens,deadline,closure);
    }
}

```

## base/v3-testnet/test/V3DeferredLegacy.t.sol
Git blob: d82f4be299ced48452566677cc8e19ace95689ef

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3DeferredLegacyFixture} from "../src/V3DeferredLegacyFixture.sol";
import {IV3BurnableAsset} from "../src/V3BoundedLegacyFixture.sol";
import {IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {LegacyFixtureAsset} from "./V3BoundedLegacy.t.sol";
interface VmDeferredLegacy {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract DeferredLegacyMockCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public constant override threshold=3;
    uint256 public constant override memberCount=5;
    function isMember(address) external pure override returns(bool){return false;}
    function rotate() external {epoch++;}
    function schedule(V3DeferredLegacyFixture v,bytes32 h,uint256 expiry) external {v.schedule(h,expiry);}
    function cancel(V3DeferredLegacyFixture v) external {v.cancel();}
}
contract V3DeferredLegacyTest {
    VmDeferredLegacy constant vm=VmDeferredLegacy(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=8888888880000;
    uint256 constant SUPPLY=888888888000000;
    address constant A=address(101);
    bytes32 constant CAMPAIGN="SYNTHETIC";
    bytes32 constant REVIEW="REVIEW";
    LegacyFixtureAsset asset;
    DeferredLegacyMockCustody control;
    V3DeferredLegacyFixture vault;
    bytes32[] ids; address[] recipients; uint256[] amounts;
    function setUp() public {
        vm.chainId(84532);asset=new LegacyFixtureAsset();control=new DeferredLegacyMockCustody();
        vault=new V3DeferredLegacyFixture(IV3BurnableAsset(address(asset)),control);
        asset.transfer(address(vault),RESERVE);
        ids.push("A");recipients.push(A);amounts.push(100);
    }
    function digest() internal view returns(bytes32){return vault.manifestDigest(CAMPAIGN,100,ids,recipients,amounts);}
    function schedule() internal {control.schedule(vault,digest(),block.timestamp+7 days);}
    function activate() internal {vault.activate(CAMPAIGN,100,ids,recipients,amounts);}
    function ready() internal {schedule();vm.warp(block.timestamp+2 days);activate();}
    function testIndefiniteDeferralAndRelativeWindows() public {
        vm.warp(block.timestamp+365 days);require(!vault.activated()&&asset.balanceOf(address(vault))==RESERVE);
        ready();require(vault.opens()==block.timestamp&&vault.deadline()==block.timestamp+30 days&&vault.appealEnd()==block.timestamp+44 days);
    }
    function testUnauthorizedAndDelay() public {
        bytes32 h=digest();vm.expectRevert(V3DeferredLegacyFixture.Unauthorized.selector);vault.schedule(h,block.timestamp+7 days);
        schedule();vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        vm.warp(block.timestamp+2 days);activate();
        vm.expectRevert(V3DeferredLegacyFixture.InvalidAction.selector);activate();
    }
    function testExpiredAndCancelledCommitmentCanBeReplaced() public {
        schedule();vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        schedule();control.cancel(vault);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        ready();
    }
    function testStaleEpochRequiresNewDelay() public {
        schedule();control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        schedule();vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        vm.warp(block.timestamp+2 days);activate();
    }
    function testManifestBindingAndAtomicFailure() public {
        schedule();vm.warp(block.timestamp+2 days);amounts[0]=99;
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);activate();
        amounts[0]=100;activate();require(vault.allocated()==100);
    }
    function testRecipientOnlyReplayAndClaimDeadline() public {
        ready();vm.expectRevert(V3DeferredLegacyFixture.NotEligible.selector);vault.claim("A");
        vm.prank(A);vault.claim("A");require(asset.balanceOf(A)==100&&asset.totalSupply()==SUPPLY);
        vm.prank(A);vm.expectRevert(V3DeferredLegacyFixture.AlreadyClaimed.selector);vault.claim("A");
        vm.warp(vault.deadline());vm.prank(A);vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.claim("A");
    }
    function testClosureRequiresSeparateDelayedCurrentEpochReview() public {
        ready();vm.prank(A);vault.claim("A");asset.transfer(address(vault),5);
        bytes32 h=vault.closureDigest(REVIEW);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidAction.selector);control.schedule(vault,h,block.timestamp+7 days);
        vm.warp(vault.appealEnd());
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.finalize(REVIEW);
        control.schedule(vault,h,block.timestamp+7 days);control.rotate();vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.finalize(REVIEW);
        control.schedule(vault,h,block.timestamp+7 days);vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.NotReady.selector);vault.finalize("OTHER");
        vault.finalize(REVIEW);
        require(vault.closed()&&vault.burned()+vault.paid()==RESERVE&&asset.balanceOf(address(vault))==5&&asset.totalSupply()==SUPPLY-RESERVE+100);
    }
    function testDuplicateIdentityRollsBackApprovedManifest() public {
        ids.push("A");recipients.push(address(102));amounts.push(1);
        bytes32 h=vault.manifestDigest(CAMPAIGN,101,ids,recipients,amounts);
        control.schedule(vault,h,block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidManifest.selector);
        vault.activate(CAMPAIGN,101,ids,recipients,amounts);
        require(!vault.activated()&&vault.recipient("A")==address(0)&&vault.award("A")==0&&vault.allocated()==0);
        (bytes32 retained,,,)=vault.pending();require(retained==h);
        require(asset.balanceOf(address(vault))==RESERVE&&asset.totalSupply()==SUPPLY);
    }
    function testExactManifestEntryLimitAndDistinctClaims() public {
        amounts[0]=1;
        for(uint256 i=1;i<33;i++){
            ids.push(bytes32(i));recipients.push(address(uint160(1000+i)));amounts.push(1);
        }
        bytes32 h=vault.manifestDigest(CAMPAIGN,33,ids,recipients,amounts);
        control.schedule(vault,h,block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidManifest.selector);
        vault.activate(CAMPAIGN,33,ids,recipients,amounts);
        require(!vault.activated()&&vault.allocated()==0);
        control.cancel(vault);ids.pop();recipients.pop();amounts.pop();
        h=vault.manifestDigest(CAMPAIGN,32,ids,recipients,amounts);
        control.schedule(vault,h,block.timestamp+7 days);vm.warp(block.timestamp+2 days);
        vault.activate(CAMPAIGN,32,ids,recipients,amounts);
        require(vault.activated()&&vault.allocated()==32);
        for(uint256 i=0;i<32;i++){
            vm.prank(recipients[i]);vault.claim(ids[i]);
        }
        require(vault.paid()==32&&asset.balanceOf(address(vault))==RESERVE-32&&asset.totalSupply()==SUPPLY);
    }
    function testOverBudgetManifestCannotPartiallyActivate() public {
        ids.push("B");recipients.push(address(102));amounts.push(1);
        schedule();vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLegacyFixture.InvalidManifest.selector);activate();
        require(!vault.activated()&&vault.recipient("A")==address(0)&&vault.award("B")==0&&vault.paid()==0);
        control.cancel(vault);ids.pop();recipients.pop();amounts.pop();
        ready();require(vault.allocated()==100);
    }
    function testDistinctIdsMayShareRecipientInCurrentSyntheticPolicy() public {
        // Documents existing behavior, not approval of a real eligibility policy.
        ids.push("B");recipients.push(A);amounts.push(100);
        control.schedule(vault,vault.manifestDigest(CAMPAIGN,200,ids,recipients,amounts),block.timestamp+7 days);
        vm.warp(block.timestamp+2 days);vault.activate(CAMPAIGN,200,ids,recipients,amounts);
        vm.prank(A);vault.claim("A");vm.prank(A);vault.claim("B");
        require(vault.paid()==200&&asset.balanceOf(A)==200&&asset.totalSupply()==SUPPLY);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3DeferredLegacyFixture.InvalidConfig.selector);
        new V3DeferredLegacyFixture(IV3BurnableAsset(address(asset)),control);
    }
}

```

## base/v3-testnet/test/V3DeferredLiquidity.t.sol
Git blob: 64b9d8a393234e9a9e6d5bcab6102c03849733c3

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3DeferredLiquidityFixture} from "../src/V3DeferredLiquidityFixture.sol";
import {V3SyntheticLPLock,IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
import {LPFixtureAsset,LPFixturePool,LPFixtureCustody} from "./V3LiquidityPolicy.t.sol";
import {IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
interface VmDeferred {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract DeferredMockControl is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public constant override threshold=3;
    uint256 public constant override memberCount=5;
    function isMember(address) external pure override returns(bool){return false;}
    function rotate() external {epoch++;}
    function schedule(V3DeferredLiquidityFixture v,uint256 a,uint256 q,uint256 min,uint256 deadline,bytes32 nonce) external returns(bytes32){
        return v.schedule(a,q,min,deadline,nonce);
    }
    function cancel(V3DeferredLiquidityFixture v,bytes32 id) external {v.cancel(id);}
}
contract V3DeferredLiquidityTest {
    VmDeferred constant vm=VmDeferred(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=222222222000000;
    LPFixtureAsset asset;
    LPFixtureAsset quote;
    LPFixturePool pool;
    LPFixtureCustody destination;
    DeferredMockControl control;
    V3DeferredLiquidityFixture vault;
    function setUp() public {
        vm.chainId(84532);asset=new LPFixtureAsset();quote=new LPFixtureAsset();
        pool=new LPFixturePool(address(asset),address(quote));destination=new LPFixtureCustody();control=new DeferredMockControl();
        vault=new V3DeferredLiquidityFixture(asset,quote,IV3SyntheticPool(address(pool)),control,address(destination),RESERVE/2);
        asset.transfer(address(vault),RESERVE);
    }
    function schedule(uint256 a,bytes32 nonce) internal returns(bytes32){
        return control.schedule(vault,a,500,50,block.timestamp+7 days,nonce);
    }
    function testZeroQuoteIndefiniteDeferralAndLaterFunding() public {
        vm.warp(block.timestamp+365 days);
        require(asset.balanceOf(address(vault))==RESERVE&&vault.spent()==0&&quote.balanceOf(address(vault))==0);
        bytes32 id=schedule(1000,"A");
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(id);
        quote.transfer(address(vault),500);vault.execute(id);
        require(vault.spent()==1000&&asset.balanceOf(address(vault))==RESERVE-1000);
    }
    function testCustodyOnlyAndDelay() public {
        vm.expectRevert(V3DeferredLiquidityFixture.Unauthorized.selector);vault.schedule(1000,500,50,block.timestamp+7 days,"A");
        bytes32 id=schedule(1000,"A");quote.transfer(address(vault),500);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(id);
        vm.warp(block.timestamp+2 days);vault.execute(id);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(id);
    }
    function testMultipleTranchesAndDistinctLocks() public {
        bytes32 a=schedule(1000,"A");bytes32 b=schedule(2000,"B");quote.transfer(address(vault),1000);
        vm.warp(block.timestamp+2 days);vault.execute(a);vault.execute(b);
        (,,,,,uint256 deadlineA,,,address lockA)=vault.actions(a);
        (,,,,,,,,address lockB)=vault.actions(b);
        require(lockA!=lockB&&pool.balanceOf(lockA)==100&&pool.balanceOf(lockB)==100);
        require(V3SyntheticLPLock(lockA).unlockAt()==deadlineA+730 days&&vault.spent()==3000);
        require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
    }
    function testExpiredActionCanBeReplacedWithoutUnlocking() public {
        bytes32 old=schedule(1000,"A");quote.transfer(address(vault),500);
        vm.warp(block.timestamp+7 days);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(old);
        bytes32 fresh=schedule(1000,"B");vm.warp(block.timestamp+2 days);vault.execute(fresh);
        require(vault.spent()==1000);
    }
    function testStaleEpochAndCancellation() public {
        bytes32 a=schedule(1000,"A");bytes32 b=schedule(1000,"B");
        control.cancel(vault,b);control.rotate();vault.syncEpoch();quote.transfer(address(vault),500);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(a);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(b);
        bytes32 fresh=schedule(1000,"A");require(fresh!=a);
        vm.warp(block.timestamp+2 days);vault.execute(fresh);
    }
    function testTrancheAndTotalCap() public {
        vm.expectRevert(V3DeferredLiquidityFixture.InvalidAction.selector);schedule(RESERVE/2+1,"X");
        bytes32 a=schedule(RESERVE/2,"A");bytes32 b=schedule(RESERVE/2,"B");bytes32 c=schedule(1,"C");
        quote.transfer(address(vault),1500);vm.warp(block.timestamp+2 days);
        vault.execute(a);vault.execute(b);
        vm.expectRevert(V3DeferredLiquidityFixture.NotReady.selector);vault.execute(c);
        require(vault.spent()==RESERVE);
    }
    function testPoolMismatchRollsBack() public {
        bytes32 id=schedule(1000,"A");quote.transfer(address(vault),500);vm.warp(block.timestamp+2 days);
        pool.setMode(1);
        vm.expectRevert(V3DeferredLiquidityFixture.BalanceMismatch.selector);vault.execute(id);
        require(vault.spent()==0&&asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==500);
        pool.setMode(0);vault.execute(id);require(vault.spent()==1000);
    }
    function testRejectExtraSharesAndRedirectedInputs() public {
        bytes32 id=schedule(1000,"DILUTION");quote.transfer(address(vault),500);
        vm.warp(block.timestamp+2 days);
        for(uint256 m=5;m<=6;m++){
            pool.setMode(m);
            vm.expectRevert(V3DeferredLiquidityFixture.BalanceMismatch.selector);vault.execute(id);
            require(vault.spent()==0&&asset.balanceOf(address(vault))==RESERVE&&quote.balanceOf(address(vault))==500);
            require(pool.totalSupply()==0&&asset.balanceOf(address(pool))==0&&quote.balanceOf(address(pool))==0&&asset.balanceOf(address(0x777))==0);
            require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
            (,,,,,,bool executed,,address locker)=vault.actions(id);require(!executed&&locker==address(0));
        }
        pool.setMode(0);vault.execute(id);
        require(vault.spent()==1000&&pool.totalSupply()==100&&asset.balanceOf(address(pool))==1000&&quote.balanceOf(address(pool))==500);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3DeferredLiquidityFixture.InvalidConfig.selector);
        new V3DeferredLiquidityFixture(asset,quote,IV3SyntheticPool(address(pool)),control,address(destination),1000);
    }
}

```
