// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeReserveFactoryFixture,SafeReserveGuardFixture} from "../src/SafeReserveGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken,IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3DeferredLiquidityFixture} from "v3-src/V3DeferredLiquidityFixture.sol";
import {V3DeferredLegacyFixture} from "v3-src/V3DeferredLegacyFixture.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
interface VmReserveGuard {
    function chainId(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}
contract ReserveQuote is ERC20 {
    constructor() ERC20("Synthetic quote","QTEST"){_mint(msg.sender,1000000);}
}
contract ReserveLPDestination {}
contract ReservePool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    constructor(IERC20 a,IERC20 q) ERC20("Synthetic LP","LPTEST"){asset=address(a);quote=address(q);}
    function addLiquidity(uint256 a,uint256 q,uint256 min,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,address(this),a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        require(min<=100);_mint(recipient,100);return 100;
    }
}
contract ReservePoolBuilder is IV3SyntheticPoolBuilder {
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){return IV3SyntheticPool(address(new ReservePool(a,q)));}
}
contract SafeReserveGuardTest {
    VmReserveGuard constant vm=VmReserveGuard(address(uint160(uint256(keccak256("hevm cheat code")))));
    // Deterministic disposable offline test keys; never use as funded wallet keys.
    uint256[3] private testKeys;
    address A;address B;address C;
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    address constant FOUNDER=address(0x201);
    address constant DISTRIBUTOR=address(0x202);
    address constant PAYEE=address(0x203);
    uint256 constant SUPPLY=888888888000000;
    Safe wallet;
    SafeReserveGuardFixture guard;
    V3AtomicSuccessorFixture successor;
    V3SuccessorTestToken token;
    ReserveQuote quote;
    uint256 start;
    function setUp() public {
        vm.chainId(84532);successor=new V3AtomicSuccessorFixture();
        SafeReserveFactoryFixture factory=new SafeReserveFactoryFixture();
        testKeys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++){
            if(vm.addr(testKeys[j])<vm.addr(testKeys[i])){
                (testKeys[i],testKeys[j])=(testKeys[j],testKeys[i]);
            }
        }
        A=vm.addr(testKeys[0]);B=vm.addr(testKeys[1]);C=vm.addr(testKeys[2]);
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners,successor);
        quote=new ReserveQuote();start=block.timestamp+1 days;
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),start,1000,
            V3SuccessorLiquidityConfig(quote,new ReservePoolBuilder(),address(new ReserveLPDestination()),1000));
        token=successor.create(cfg);
    }
    function _approved(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        bytes32 hash=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            sigs=abi.encodePacked(sigs,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _signed(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        for(uint256 i=0;i<count;i++){
            (uint8 v,bytes32 rr,bytes32 ss)=vm.sign(testKeys[i],h);
            sigs=abi.encodePacked(sigs,rr,ss,v);
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(bytes memory data) private {require(_exec(address(guard),data,_approved(address(guard),data,3)));}
    function _reject(address to,bytes memory data,uint256 count) private {
        bytes memory sigs=_approved(to,data,count);vm.expectRevert();_exec(to,data,sigs);
    }
    function _bind() private {_quorum(abi.encodeCall(guard.bindSuccessor,(1)));}
    function _propose(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private pure returns(bytes memory){
        return abi.encodeCall(SafeReserveGuardFixture.proposeExpense,(e,i,PAYEE,10,evidence,0,nonce));
    }
    function _id(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),e,PAYEE,uint256(10),evidence,uint256(0),nonce));
    }
    function testActualECDSAQuorumPayloadBindingAndNonceReplay() public {
        bytes memory binding=abi.encodeCall(guard.bindSuccessor,(1));
        bytes memory sigs=_signed(address(guard),binding,3);
        require(_exec(address(guard),binding,sigs)&&wallet.nonce()==1);
        bytes memory data=_propose(1,3,"E","N");
        bytes memory two=_signed(address(guard),data,2);
        vm.expectRevert();_exec(address(guard),data,two);
        require(wallet.nonce()==1);
        sigs=_signed(address(guard),data,3);
        bytes memory altered=_propose(1,4,"E","N");
        vm.expectRevert();_exec(address(guard),altered,sigs);
        require(wallet.nonce()==1);
        require(_exec(address(guard),data,sigs)&&wallet.nonce()==2);
        vm.expectRevert();_exec(address(guard),data,sigs);
        require(wallet.nonce()==2);
        vm.warp(start+2 days);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        v.execute(_id(1,3,"E","N"));
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testFixedBindingAndNoDeployerFloat() public {
        require(!guard.bound()&&token.totalSupply()==SUPPLY&&token.balanceOf(address(wallet))==0&&token.balanceOf(address(guard))==0);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1)),2);
        _bind();require(guard.bound()&&address(guard.asset())==address(token));
        for(uint256 i=0;i<7;i++)require(guard.destinations(i)==successor.vaults(i));
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1)),3);
    }
    function testActualQuorumExpenseAndSharedReplay() public {
        _bind();_reject(address(guard),_propose(1,3,"E","N"),2);
        _quorum(_propose(1,3,"E","N"));_quorum(_propose(1,4,"E","M"));
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=_id(1,3,"E","N");
        vm.expectRevert();v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        V3EpochSpendFixture c=V3EpochSpendFixture(successor.vaults(4));bytes32 other=_id(1,4,"E","M");
        vm.expectRevert();c.execute(other);
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testRotationInvalidatesOutstandingAndOldEpochAuthorization() public {
        _bind();_quorum(_propose(1,3,"E","N"));
        bytes32 old=_id(1,3,"E","N");
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F)));
        vm.warp(start+2 days);
        bytes memory swap=abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F);
        require(_exec(address(wallet),swap,_approved(address(wallet),swap,3)));
        require(guard.epoch()==2);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        vm.expectRevert();v.execute(old);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _quorum(_propose(2,3,"E","N"));bytes32 fresh=_id(2,3,"E","N");
        vm.warp(block.timestamp+2 days);v.execute(fresh);
        require(token.balanceOf(PAYEE)==10);
    }
    function testNoGenericTransferOrRoleConflict() public {
        _bind();
        _reject(address(token),abi.encodeCall(token.transfer,(PAYEE,1)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,0,PAYEE,10,"E",0,"N")),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,3,address(wallet),10,"E",0,"N")),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,FOUNDER)),3);
        vm.expectRevert();guard.proposeExpense(1,3,PAYEE,10,"E",0,"N");
    }
    function testLiquidityAndLegacySchedulingThroughActualSafe() public {
        _bind();
        V3DeferredLiquidityFixture l=V3DeferredLiquidityFixture(successor.vaults(2));
        V3DeferredLegacyFixture legacy=V3DeferredLegacyFixture(successor.vaults(6));
        uint256 deadline=block.timestamp+7 days;
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,deadline,"LP")));
        bytes32 id=keccak256(abi.encode(block.chainid,address(l),address(token),address(quote),address(l.pool()),uint256(1),uint256(1000),uint256(500),uint256(50),deadline,bytes32("LP")));
        bytes32[] memory ids=new bytes32[](1);ids[0]="CLAIM";
        address[] memory recipients=new address[](1);recipients[0]=PAYEE;
        uint256[] memory amounts=new uint256[](1);amounts[0]=100;
        _quorum(abi.encodeCall(guard.scheduleLegacy,(1,legacy.manifestDigest("TEST",100,ids,recipients,amounts),deadline)));
        vm.warp(block.timestamp+2 days);
        quote.transfer(address(l),500);l.execute(id);
        legacy.activate("TEST",100,ids,recipients,amounts);
        vm.prank(PAYEE);legacy.claim("CLAIM");
        require(l.spent()==1000&&legacy.paid()==100&&token.balanceOf(PAYEE)==100&&token.totalSupply()==SUPPLY);
    }
}
