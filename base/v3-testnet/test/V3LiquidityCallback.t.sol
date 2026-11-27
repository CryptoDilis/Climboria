// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {LPFixtureAsset,LPFixtureCustody,VmLP} from "./V3LiquidityPolicy.t.sol";
import {DeferredMockControl} from "./V3DeferredLiquidity.t.sol";
import {V3DeferredLiquidityFixture} from "../src/V3DeferredLiquidityFixture.sol";
import {V3LiquidityPolicyFixture,IV3SyntheticPool} from "../src/V3LiquidityPolicyFixture.sol";

/// Synthetic malicious callback harness; no live pool or real assets.
contract CallbackFixturePool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    bytes public callbackData;
    bool public bubble;
    uint256 public attempts;
    bytes32 public lastError;
    constructor(address a,address q) ERC20("Callback test pool","CALLBACK"){asset=a;quote=q;}
    function configure(bytes calldata data,bool propagate) external {callbackData=data;bubble=propagate;}
    function addLiquidity(uint256 a,uint256 q,uint256 minimum,address recipient) external returns(uint256){
        require(minimum<=100);
        require(IERC20(asset).transferFrom(msg.sender,address(this),a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        if(callbackData.length!=0){
            attempts++;
            (bool ok,bytes memory reason)=msg.sender.call(callbackData);
            require(!ok,"nested execution unexpectedly succeeded");
            lastError=keccak256(reason);
            require(lastError==keccak256(abi.encodeWithSignature("Error(string)","ReentrancyGuard: reentrant call")),"wrong rejection reason");
            if(bubble)assembly { revert(add(reason,32),mload(reason)) }
        }
        _mint(recipient,100);return 100;
    }
}

contract V3LiquidityCallbackTest {
    VmLP constant vm=VmLP(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant RESERVE=222222222000000;
    LPFixtureAsset asset;
    LPFixtureAsset quote;
    CallbackFixturePool pool;
    LPFixtureCustody destination;
    DeferredMockControl control;
    V3DeferredLiquidityFixture vault;
    function setUp() public {
        vm.chainId(84532);
        asset=new LPFixtureAsset();quote=new LPFixtureAsset();
        pool=new CallbackFixturePool(address(asset),address(quote));
        destination=new LPFixtureCustody();control=new DeferredMockControl();
        vault=new V3DeferredLiquidityFixture(asset,quote,IV3SyntheticPool(address(pool)),control,address(destination),RESERVE/2);
        asset.transfer(address(vault),RESERVE);quote.transfer(address(vault),1000);
    }
    function _schedule(bytes32 nonce) private returns(bytes32){
        return control.schedule(vault,1000,500,50,block.timestamp+7 days,nonce);
    }
    function _assertSpent(uint256 tranches) private view {
        require(vault.spent()==1000*tranches&&asset.balanceOf(address(vault))==RESERVE-1000*tranches);
        require(quote.balanceOf(address(vault))==1000-500*tranches);
        require(asset.balanceOf(address(pool))==1000*tranches&&quote.balanceOf(address(pool))==500*tranches);
        require(pool.totalSupply()==100*tranches);
        require(asset.allowance(address(vault),address(pool))==0&&quote.allowance(address(vault),address(pool))==0);
    }
    function testDeferredSameActionCallbackRejected() public {
        bytes32 id=_schedule("SAME");
        pool.configure(abi.encodeCall(vault.execute,(id)),false);
        vm.warp(block.timestamp+2 days);vault.execute(id);
        _assertSpent(1);require(pool.attempts()==1);
        (,,,,,,bool executed,,address locker)=vault.actions(id);
        require(executed&&locker!=address(0)&&pool.balanceOf(locker)==100);
    }
    function testDeferredCrossActionCallbackAndAtomicRollback() public {
        bytes32 a=_schedule("A");bytes32 b=_schedule("B");
        vm.warp(block.timestamp+2 days);
        pool.configure(abi.encodeCall(vault.execute,(b)),true);
        (bool ok,bytes memory reason)=address(vault).call(abi.encodeCall(vault.execute,(a)));
        require(!ok&&keccak256(reason)==keccak256(abi.encodeWithSignature("Error(string)","ReentrancyGuard: reentrant call")));
        _assertSpent(0);require(pool.attempts()==0);
        (,,,,,,bool doneA,,address lockA)=vault.actions(a);
        (,,,,,,bool doneB,,address lockB)=vault.actions(b);
        require(!doneA&&!doneB&&lockA==address(0)&&lockB==address(0));
        pool.configure(abi.encodeCall(vault.execute,(b)),false);vault.execute(a);
        _assertSpent(1);require(pool.attempts()==1);
        (,,,,,,doneB,,lockB)=vault.actions(b);require(!doneB&&lockB==address(0));
        pool.configure("",false);vault.execute(b);_assertSpent(2);
        (,,,,,,,,lockA)=vault.actions(a);(,,,,,,,,lockB)=vault.actions(b);
        require(lockA!=lockB&&pool.balanceOf(lockA)==100&&pool.balanceOf(lockB)==100);
    }
    function testOneShotCallbackRejected() public {
        V3LiquidityPolicyFixture single=new V3LiquidityPolicyFixture(asset,quote,IV3SyntheticPool(address(pool)),address(pool).codehash,address(destination),1000,500,50,block.timestamp+1 days);
        asset.transfer(address(single),RESERVE);quote.transfer(address(single),500);
        pool.configure(abi.encodeCall(single.execute,()),false);single.execute();
        require(single.executed()&&single.sharesLocked()==100&&pool.attempts()==1);
        require(asset.balanceOf(address(single))==RESERVE-1000&&quote.balanceOf(address(single))==0);
        require(pool.balanceOf(address(single.locker()))==100&&pool.totalSupply()==100);
        require(asset.allowance(address(single),address(pool))==0&&quote.allowance(address(single),address(pool))==0);
    }
}
