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
        require(IERC20(asset).transferFrom(msg.sender,address(this),mode==1?a-1:a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        uint256 shares=mode==2?1:100;
        _mint(mode==3?msg.sender:recipient,shares);
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
