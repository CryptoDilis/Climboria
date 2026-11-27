// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting} from "../src/ClimbV3TestToken.sol";
import {V3GameRewardFixture} from "../src/V3GameRewardFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {V3BoundedLegacyFixture} from "../src/V3BoundedLegacyFixture.sol";
import {IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";
import {V3DeferredLiquidityFixture} from "../src/V3DeferredLiquidityFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorTestToken,V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorLegacyConfig,IV3SyntheticPoolBuilder} from "../src/V3AtomicSuccessorFixture.sol";
interface VmSuccessor {
    function chainId(uint256) external;
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
    function propose(V3EpochSpendFixture v,address recipient,bytes32 evidence,bytes32 nonce,uint256 amount) external returns(bytes32){
        return v.propose(recipient,amount,evidence,0,nonce);
    }
    function scheduleLiquidity(V3DeferredLiquidityFixture v,uint256 deadline) external returns(bytes32){return v.schedule(1000,500,50,deadline,"LP");}
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
        factory=new V3AtomicSuccessorFixture();
        DISTRIBUTOR=vm.addr(REWARD_KEY);
        cfg.gamingWalletMonthlyCap=1000;
        cfg.founder=FOUNDER;cfg.distributor=DISTRIBUTOR;cfg.control=control;cfg.start=block.timestamp+1 days;
        cfg.liquidity=V3SuccessorLiquidityConfig(quote,new SuccessorMockPoolBuilder(),address(new SuccessorCustodyDestination()),1000);
        cfg.legacy.opens=cfg.start;cfg.legacy.deadline=cfg.start+30 days;cfg.legacy.closure=cfg.start+44 days;
        cfg.legacy.cap=100;cfg.legacy.campaign="TEST_CAMPAIGN";
        cfg.legacy.ids.push("CLAIM");cfg.legacy.recipients.push(CLAIMANT);cfg.legacy.amounts.push(100);
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
        require(address(V3GameRewardFixture(factory.vaults(1)).token())==address(token));
        require(address(V3DeferredLiquidityFixture(factory.vaults(2)).asset())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(3)).token())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(4)).token())==address(token));
        require(address(V3EpochSpendFixture(factory.vaults(5)).token())==address(token));
        V3BoundedLegacyFixture legacy=V3BoundedLegacyFixture(factory.vaults(6));
        require(address(legacy.token())==address(token)&&legacy.activated()&&legacy.allocated()==100);
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
    function testInvalidLegacyManifestRollsBackWholeCreation() public {
        cfg.legacy.amounts[0]=101;
        vm.expectRevert(V3BoundedLegacyFixture.InvalidManifest.selector);factory.create(cfg);
        require(!factory.used()&&address(factory.token())==address(0)&&factory.vaults(0)==address(0));
        cfg.legacy.amounts[0]=100;require(factory.create(cfg).totalSupply()==SUPPLY);
    }
    function testIntegratedReleaseLiquidityClaimAndBurnConservation() public {
        V3SuccessorTestToken token=factory.create(cfg);
        _scheduleLiquidity();
        V3EpochSpendFixture e=V3EpochSpendFixture(factory.vaults(3));
        V3EpochSpendFixture c=V3EpochSpendFixture(factory.vaults(4));
        bytes32 a=control.propose(e,PAYEE,"E","A",10);
        bytes32 b=control.propose(c,PAYEE,"E","B",10);
        vm.warp(cfg.start+2 days);e.execute(a);
        _executeLiquidity(token);
        vm.expectRevert(bytes4(keccak256("ExpenseAlreadyConsumed()")));c.execute(b);
        _claimGameReward();
        V3BoundedLegacyFixture legacy=V3BoundedLegacyFixture(factory.vaults(6));
        vm.prank(CLAIMANT);legacy.claim("CLAIM");
        require(token.totalSupply()==SUPPLY&&token.balanceOf(PAYEE)==210&&token.balanceOf(DISTRIBUTOR)==0&&token.balanceOf(CLAIMANT)==100);
        vm.prank(CLAIMANT);token.burn(10);
        vm.warp(cfg.legacy.closure);legacy.closeAndBurn();
        require(token.totalSupply()==SUPPLY-10-(legacy.RESERVE()-100)&&legacy.paid()+legacy.burned()==legacy.RESERVE());
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
        V3GameRewardFixture gaming=V3GameRewardFixture(factory.vaults(1));
        V3GameRewardFixture.Reward memory x=V3GameRewardFixture.Reward("GAME_EVENT",PAYEE,200,0,cfg.start+30 days);
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
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);new V3AtomicSuccessorFixture();
        vm.expectRevert(V3AtomicSuccessorFixture.InvalidConfig.selector);factory.create(cfg);
    }
}
