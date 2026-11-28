// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeReserveFactoryFixture,SafeReserveGuardFixture} from "../src/SafeReserveGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConditionalDeployer,V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken,IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3DeferredLiquidityFixture} from "v3-src/V3DeferredLiquidityFixture.sol";
import {V3LegacyProofClaimFixture} from "v3-src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "v3-src/V3LegacyProofVerifierFixture.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
interface VmReserveGuard {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
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
        vm.chainId(84532);V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
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
    function _signed(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        return _signedAt(to,data,count,wallet.nonce());
    }
    function _signedAt(address to,bytes memory data,uint256 count,uint256 nonce) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<count;i++){
            (uint8 v,bytes32 rr,bytes32 ss)=vm.sign(testKeys[i],h);
            sigs=abi.encodePacked(sigs,rr,ss,v);
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(bytes memory data) private {require(_exec(address(guard),data,_signed(address(guard),data,3)));}
    function _reject(address to,bytes memory data,uint256 count) private {
        bytes memory sigs=_signed(to,data,count);vm.expectRevert();_exec(to,data,sigs);
    }
    function _bind() private {_quorum(abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)));}
    function _propose(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes memory){
        return abi.encodeCall(SafeReserveGuardFixture.proposeExpense,(e,i,PAYEE,10,evidence,0,nonce,block.timestamp,block.timestamp+1 hours));
    }
    function _id(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),e,PAYEE,uint256(10),evidence,uint256(0),nonce));
    }
    function testActualECDSAQuorumPayloadBindingAndNonceReplay() public {
        bytes memory binding=abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours));
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
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),2);
        _bind();require(guard.bound()&&address(guard.asset())==address(token));
        for(uint256 i=0;i<7;i++)require(guard.destinations(i)==successor.vaults(i));
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),3);
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
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(start+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        vm.expectRevert();v.execute(old);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _quorum(_propose(2,3,"E","N"));bytes32 fresh=_id(2,3,"E","N");
        vm.warp(block.timestamp+2 days);v.execute(fresh);
        require(token.balanceOf(PAYEE)==10);
    }

    function testPlainReservePendingExpenseAndActualRotation() public {
        _bind();
        for(uint256 i=3;i<=5;i++)_quorum(_propose(1,i,bytes32(i),bytes32(i)));
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        require(!guard.expenseRecipientAllowed(PAYEE)&&!wallet.isOwner(PAYEE));
        vm.warp(start+2 days);
        for(uint256 i=3;i<=5;i++)_assertPlainPendingExpenseRejected(i);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,PAYEE),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&wallet.isOwner(PAYEE)&&!wallet.isOwner(E));
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            bytes32 id=_id(1,i,bytes32(i),bytes32(i));
        vm.expectRevert();v.execute(id);
            _reject(address(guard),_propose(2,i,bytes32(i+10),bytes32(i+10)),3);
            require(v.totalSpent()==0&&v.registry().consumedBy(bytes32(i))==address(0));
        }
        require(token.balanceOf(PAYEE)==0&&token.totalSupply()==SUPPLY&&!guard.transactionActive());
    }
    function _assertPlainPendingExpenseRejected(uint256 i) private {
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        uint256 n=wallet.nonce();uint256 balance=token.balanceOf(address(v));
        _reject(address(guard),_propose(1,i,bytes32(i+10),bytes32(i+10)),3);
        bytes32 id=_id(1,i,bytes32(i),bytes32(i));
        vm.expectRevert();v.execute(id);
        require(wallet.nonce()==n&&!guard.transactionActive()&&v.totalSpent()==0&&v.spent(0)==0);
        require(v.registry().consumedBy(bytes32(i))==address(0)&&token.balanceOf(address(v))==balance);
    }
    function testPlainReservePendingOwnerBlocksRewardSchedule() public {
        _bind();
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,PAYEE,block.timestamp,block.timestamp+1 hours)));
        _quorum(abi.encodeCall(guard.revokeRewardSigner,(1,1)));
        require(!guard.rewardSignerAllowed(PAYEE));
        uint256 n=wallet.nonce();
        _reject(address(guard),abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,block.timestamp,block.timestamp+1 hours)),3);
        require(wallet.nonce()==n&&guard.epoch()==1&&!guard.transactionActive()&&!wallet.isOwner(PAYEE));
        (bytes32 digest,,address replacement,,)=guard.pending();
        require(digest!=0&&replacement==PAYEE);
        vm.warp(start+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,PAYEE),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&wallet.isOwner(PAYEE)&&!guard.rewardSignerAllowed(PAYEE));
    }

    function testNoGenericTransferOrRoleConflict() public {
        _bind();
        _reject(address(token),abi.encodeCall(token.transfer,(PAYEE,1)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,0,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,3,address(wallet),10,"E",0,"N",block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,FOUNDER,block.timestamp,block.timestamp+1 hours)),3);
        vm.expectRevert();guard.proposeExpense(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours);
    }
    function testRoleSeparationPersistsWhenDestinationCodeDisappears() public {
        _bind();
        address lp=V3DeferredLiquidityFixture(successor.vaults(2)).lpCustody();
        require(guard.lpCustody()==lp);
        vm.etch(lp,"");
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,lp,block.timestamp,block.timestamp+1 hours)),3);
        address v=successor.vaults(0);vm.etch(v,"");
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,v,block.timestamp,block.timestamp+1 hours)),3);
        // The healthy quorum must still be able to replace an unrelated owner.
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
    }
    function testPlainBindingRejectsSuccessorAsLPCustody() public {
        // Fresh sibling flow with an otherwise structurally valid, conflicting LP role.
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        SafeReserveFactoryFixture factory=new SafeReserveFactoryFixture();
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners,successor);
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),start,1000,
            V3SuccessorLiquidityConfig(quote,new ReservePoolBuilder(),address(successor),1000));
        token=successor.create(cfg);
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),3);
        require(!guard.bound()&&guard.lpCustody()==address(0)&&wallet.nonce()==0&&!guard.transactionActive());
    }
    function testSignedExpenseValidityWindow() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory future=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",t+1 hours,t+2 hours));
        bytes memory signedFuture=_signed(address(guard),future,3);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        vm.warp(t+1 hours);
        bytes memory tooLong=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",t,t+2 days));
        _reject(address(guard),tooLong,3);
        vm.warp(t+2 hours);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        _quorum(_propose(1,3,"E","N"));
        require(wallet.nonce()==2&&token.totalSupply()==SUPPLY);
    }
    function testSchedulingRejectsExpiredSignedWindows() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory liquidity=abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,t+7 days,"LP",t,t+1 hours));
        bytes memory legacy=abi.encodeCall(guard.scheduleLegacy,(1,bytes32("MANIFEST"),t+7 days,t,t+1 hours));
        bytes memory ls=_signed(address(guard),liquidity,3);
        bytes memory gs=_signed(address(guard),legacy,3);
        uint256 n=wallet.nonce();
        vm.warp(t+1 hours);
        vm.expectRevert();_exec(address(guard),liquidity,ls);
        vm.expectRevert();_exec(address(guard),legacy,gs);
        require(wallet.nonce()==n&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,t+7 days,"LP",block.timestamp,block.timestamp+1 hours)));
        require(wallet.nonce()==n+1);
    }
    function testPlainReserveRewardScheduleSignedWindowBoundaries() public {
        _bind();
        _quorum(abi.encodeCall(guard.revokeRewardSigner,(1,1)));
        uint256 t=block.timestamp;
        uint256 n=wallet.nonce();
        bytes memory future=abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,t+1 hours,t+2 hours));
        bytes memory sigs=_signed(address(guard),future,3);
        vm.expectRevert();_exec(address(guard),future,sigs);
        require(wallet.nonce()==n&&!guard.transactionActive());
        _reject(address(guard),abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,t,t+1 days+1)),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,t,t)),3);
        vm.warp(t+2 hours);
        vm.expectRevert();_exec(address(guard),future,sigs);
        require(wallet.nonce()==n&&guard.epoch()==1&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,block.timestamp,block.timestamp+1 days)));
        require(wallet.nonce()==n+1&&token.totalSupply()==SUPPLY);
        vm.warp(block.timestamp+2 days);
        _quorum(abi.encodeCall(guard.activateRewardSigner,(1,2,1,PAYEE)));
        require(wallet.nonce()==n+2&&guard.epoch()==1&&!guard.transactionActive());
    }
    function testStaleLegacyCancellationCannotCancelReplacement() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory schedule=abi.encodeCall(guard.scheduleLegacy,(1,bytes32("MANIFEST"),t+7 days,t,t+1 hours));
        _quorum(schedule);
        require(guard.legacyScheduleSerial()==1);
        bytes memory cancel=abi.encodeCall(guard.cancelLegacy,(1,1));
        bytes memory stale=_signedAt(address(guard),cancel,3,wallet.nonce()+2);
        _quorum(cancel);_quorum(schedule);
        uint256 n=wallet.nonce();
        vm.expectRevert();_exec(address(guard),cancel,stale);
        require(wallet.nonce()==n&&guard.legacyScheduleSerial()==2&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.cancelLegacy,(1,2)));
        require(wallet.nonce()==n+1);
    }
    function _legacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),PAYEE,100,100,bytes32(uint256(31)));
    }
    function _legacyCommitment(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_legacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function testLiquidityAndLegacySchedulingThroughActualSafe() public {
        _bind();
        V3DeferredLiquidityFixture l=V3DeferredLiquidityFixture(successor.vaults(2));
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        uint256 deadline=block.timestamp+7 days;
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,deadline,"LP",block.timestamp,block.timestamp+1 hours)));
        bytes32 id=keccak256(abi.encode(block.chainid,address(l),address(token),address(quote),address(l.pool()),uint256(1),uint256(1000),uint256(500),uint256(50),deadline,bytes32("LP")));
        LegacyVerifier.Commitment memory c=_legacyCommitment(legacy);
        _quorum(abi.encodeCall(guard.scheduleLegacy,(1,legacy.activationDigest(c),deadline,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        quote.transfer(address(l),500);l.execute(id);
        legacy.activate(c);
        vm.prank(PAYEE);legacy.claim(0,_legacyRow(),new LegacyVerifier.Node[](0));
        require(l.spent()==1000&&legacy.paid()==100&&token.balanceOf(PAYEE)==100&&token.totalSupply()==SUPPLY);
    }
}
