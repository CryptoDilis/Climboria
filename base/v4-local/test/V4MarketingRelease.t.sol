// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {V4MarketingGuardLocal,V4MarketingFactoryLocal} from "../src/V4MarketingGuardLocal.sol";
import {V4MarketingReleaseLocal} from "../src/V4MarketingReleaseLocal.sol";
import {V4MarketingGenesisLocal} from "../src/V4MarketingGenesisLocal.sol";
interface VmRelease {
    function chainId(uint256) external;
    function warp(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert() external;
    function etch(address,bytes calldata) external;
    function prank(address) external;
}
contract V4MarketingReleaseTest {
    VmRelease constant vm=VmRelease(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant CAP=3111111108000;
    uint256 constant START=100 days;
    address constant MARKETING=address(0x100001);
    address constant PAYEE=address(0x100002);
    uint256[3] keys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
    Safe wallet;V4MarketingGuardLocal guard;V4MarketingGenesisLocal token;V4MarketingReleaseLocal vault;
    function setUp() public {
        vm.chainId(31337);vm.warp(START);
        for(uint256 i;i<3;++i)for(uint256 j=i+1;j<3;++j)if(vm.addr(keys[i])>vm.addr(keys[j]))(keys[i],keys[j])=(keys[j],keys[i]);
        address[] memory owners=new address[](5);
        for(uint256 i;i<3;++i)owners[i]=vm.addr(keys[i]);
        owners[3]=address(0x100004);owners[4]=address(0x100005);
        V4MarketingFactoryLocal f=new V4MarketingFactoryLocal();
        (wallet,guard)=f.create(owners);
        quorum(abi.encodeCall(guard.issueLocal,(1,MARKETING,START,START+1 hours)));
        token=guard.token();vault=guard.vault();
    }
    function signed(bytes memory data,uint256 count) private returns(bytes memory sigs){
        return signedTo(address(guard),data,count);
    }
    function signedTo(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        for(uint256 i;i<count;++i){(uint8 v,bytes32 r,bytes32 s)=vm.sign(keys[i],h);sigs=abi.encodePacked(sigs,r,s,v);}
    }
    function exec(bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(address(guard),0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function quorum(bytes memory data) private {require(exec(data,signed(data,3)));}
    function reject(bytes memory data,uint256 count) private {bytes memory sigs=signed(data,count);vm.expectRevert();exec(data,sigs);}
    function dataFor(address a,uint256 amount,bytes32 evidence,uint256 month,bytes32 salt,uint256 context) private view returns(bytes memory){
        return abi.encodeCall(guard.proposeMarketing,(1,a,amount,evidence,month,salt,context,block.timestamp,block.timestamp+1 hours));
    }
    function idFor(address a,uint256 amount,bytes32 evidence,uint256 month,bytes32 salt,uint256 context) private view returns(bytes32){
        return keccak256(abi.encode(block.chainid,address(vault),address(token),uint256(1),a,amount,evidence,month,salt,context));
    }
    function propose(uint256 amount,bytes32 evidence,bytes32 salt) private returns(bytes32 id){
        quorum(dataFor(PAYEE,amount,evidence,1,salt,0));return idFor(PAYEE,amount,evidence,1,salt,0);
    }
    function firstMonth() private {vm.warp(START+30 days);}
    function testGenesisAndAtomicPayment() public {
        require(token.totalSupply()==888888888000000&&token.balanceOf(MARKETING)==CAP&&token.balanceOf(address(vault))==59111111052000);
        firstMonth();bytes32 id=propose(CAP,bytes32(uint256(1)),bytes32(uint256(2)));
        vm.warp(START+32 days-1);vm.expectRevert();vault.execute(id);
        vm.warp(START+32 days);vault.execute(id);
        (uint256 spent,uint256 capacity)=vault.snapshot();
        require(spent==2*CAP&&capacity==0&&token.balanceOf(PAYEE)==CAP&&token.balanceOf(address(vault))==59111111052000-CAP);
        require(vault.consumedBy(bytes32(uint256(1)))==id);
        vm.expectRevert();vault.execute(id);
    }
    function testMonthZeroCannotPay() public {
        quorum(dataFor(PAYEE,1,bytes32(uint256(1)),0,bytes32(uint256(2)),0));
        bytes32 id=idFor(PAYEE,1,bytes32(uint256(1)),0,bytes32(uint256(2)),0);
        vm.warp(START+2 days);vm.expectRevert();vault.execute(id);
        require(token.balanceOf(PAYEE)==0);
    }
    function testQuorumAndRecipientBoundaries() public {
        firstMonth();bytes32 e=bytes32(uint256(1));bytes32 s=bytes32(uint256(2));
        reject(dataFor(PAYEE,1,e,1,s,0),2);
        reject(dataFor(MARKETING,1,e,1,s,0),3);
        reject(dataFor(vm.addr(keys[0]),1,e,1,s,0),3);
        reject(dataFor(token.reserves(4),1,e,1,s,0),3);
        vm.expectRevert();vault.propose(PAYEE,1,e,1,s,0);
        require(wallet.nonce()==1);
    }
    function testCancelAndExpiredMonth() public {
        firstMonth();bytes32 a=propose(1,bytes32(uint256(1)),bytes32(uint256(2)));
        quorum(abi.encodeCall(guard.cancelMarketing,(1,a,block.timestamp,block.timestamp+1 hours)));
        bytes32 b=propose(1,bytes32(uint256(3)),bytes32(uint256(4)));
        vm.warp(START+32 days);vm.expectRevert();vault.execute(a);
        vm.warp(START+60 days);vm.expectRevert();vault.execute(b);
        require(token.balanceOf(PAYEE)==0);
    }
    function testEvidenceReplayAndBudgetRollback() public {
        firstMonth();bytes32 e=bytes32(uint256(1));
        bytes32 a=propose(CAP,e,bytes32(uint256(2)));
        bytes32 b=propose(1,e,bytes32(uint256(3)));
        bytes32 c=propose(1,bytes32(uint256(4)),bytes32(uint256(5)));
        vm.warp(START+32 days);vault.execute(a);
        vm.expectRevert();vault.execute(b);
        vm.expectRevert();vault.execute(c);
        require(vault.consumedBy(e)==a&&vault.consumedBy(bytes32(uint256(4)))==0&&token.balanceOf(PAYEE)==CAP);
    }
    function testNominationCancelReleaseCannotReviveOldProposal() public {
        firstMonth();bytes32 id=propose(1,bytes32(uint256(1)),bytes32(uint256(2)));
        address[] memory owners=wallet.getOwners();
        quorum(abi.encodeWithSignature("scheduleRotation(uint256,address,address,address,uint256,uint256)",1,address(1),owners[0],PAYEE,block.timestamp,block.timestamp+1 hours));
        require(guard.expenseContext(PAYEE)==1&&guard.expenseContext(owners[0])==1);
        quorum(abi.encodeWithSignature("cancelRotation(uint256,uint256)",1,1));
        reject(dataFor(PAYEE,1,bytes32(uint256(3)),1,bytes32(uint256(4)),1),3);
        quorum(abi.encodeCall(guard.releaseRecipient,(1,PAYEE,1,block.timestamp,block.timestamp+1 hours)));
        require(guard.expenseContext(PAYEE)==2);
        vm.warp(START+32 days);vm.expectRevert();vault.execute(id);
        require(token.balanceOf(PAYEE)==0);
    }
    function testRecipientCodeChangeBlocksPayment() public {
        firstMonth();bytes32 id=propose(1,bytes32(uint256(1)),bytes32(uint256(2)));
        vm.etch(PAYEE,hex"60006000f3");vm.warp(START+32 days);
        vm.expectRevert();vault.execute(id);
        require(token.balanceOf(PAYEE)==0);
    }
    function testNoCounterOnlyOrExceptionPath() public {
        firstMonth();
        reject(abi.encodeWithSignature("recordMarketing(uint256,uint256,uint256,uint256)",1,CAP,block.timestamp,block.timestamp+1 hours),3);
        reject(abi.encodeWithSignature("exception(uint256)",CAP),3);
        require(token.balanceOf(MARKETING)==CAP&&token.balanceOf(address(vault))==59111111052000);
    }

    function testActualRotationInvalidatesPriorEpochAndOutgoingOwnerNeedsRelease() public {
        firstMonth();
        bytes32 oldId=propose(1,bytes32(uint256(1)),bytes32(uint256(2)));
        address[] memory owners=wallet.getOwners();
        address oldOwner=owners[4];address replacement=address(0x100006);
        quorum(abi.encodeWithSignature("scheduleRotation(uint256,address,address,address,uint256,uint256)",1,owners[3],oldOwner,replacement,block.timestamp,block.timestamp+1 hours));
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",owners[3],oldOwner,replacement),uint256(1));
        bytes memory sigs=signedTo(address(wallet),swap,3);
        vm.warp(START+32 days-1);
        vm.expectRevert();wallet.execTransaction(address(wallet),0,swap,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
        vm.warp(START+32 days);
        require(wallet.execTransaction(address(wallet),0,swap,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs));
        require(guard.epoch()==2&&!wallet.isOwner(oldOwner)&&wallet.isOwner(replacement));
        vm.expectRevert();vault.execute(oldId);
        require(guard.expenseContext(oldOwner)==1&&!guard.recipientAllowed(oldOwner));
        reject(dataFor(PAYEE,1,bytes32(uint256(3)),1,bytes32(uint256(4)),0),3);
        reject(abi.encodeCall(guard.releaseRecipient,(2,replacement,1,block.timestamp,block.timestamp+1 hours)),3);
        quorum(abi.encodeCall(guard.releaseRecipient,(2,oldOwner,1,block.timestamp,block.timestamp+1 hours)));
        require(guard.expenseContext(oldOwner)==2&&guard.recipientAllowed(oldOwner));
        bytes32 evidence=bytes32(uint256(5));bytes32 salt=bytes32(uint256(6));
        quorum(abi.encodeCall(guard.proposeMarketing,(2,oldOwner,1,evidence,1,salt,2,block.timestamp,block.timestamp+1 hours)));
        bytes32 id=keccak256(abi.encode(block.chainid,address(vault),address(token),uint256(2),oldOwner,uint256(1),evidence,uint256(1),salt,uint256(2)));
        vm.warp(START+34 days);vault.execute(id);
        require(token.balanceOf(oldOwner)==1&&token.balanceOf(PAYEE)==0);
    }
    function test_TransferFailureRollsBackAccountingAndEvidence() public {
        firstMonth();bytes32 e=bytes32(uint256(1));
        bytes32 id=propose(CAP,e,bytes32(uint256(2)));
        uint256 initial=token.balanceOf(address(vault));
        // Cheatcode-only fault injection; not an actual vault withdrawal path.
        vm.prank(address(vault));require(token.transfer(address(this),initial));
        vm.warp(START+32 days);
        vm.expectRevert();vault.execute(id);
        (uint256 spent,uint256 capacity)=vault.snapshot();
        require(spent==CAP&&capacity==CAP&&vault.consumedBy(e)==0&&token.balanceOf(PAYEE)==0);
        require(token.transfer(address(vault),initial));
        vault.execute(id);
        require(vault.consumedBy(e)==id&&token.balanceOf(PAYEE)==CAP);
    }
    function testSignedAuthorizationExpiresAtExactBoundary() public {
        firstMonth();
        bytes memory data=dataFor(PAYEE,1,bytes32(uint256(1)),1,bytes32(uint256(2)),0);
        bytes memory sigs=signed(data,3);uint256 nonce=wallet.nonce();
        vm.warp(START+30 days+1 hours);vm.expectRevert();exec(data,sigs);
        require(wallet.nonce()==nonce&&!guard.transactionActive());
        quorum(dataFor(PAYEE,1,bytes32(uint256(1)),1,bytes32(uint256(2)),0));
    }
    function testPinnedTokenRuntimeChangeDeniesExecution() public {
        firstMonth();bytes32 id=propose(1,bytes32(uint256(1)),bytes32(uint256(2)));
        bytes memory original=address(token).code;
        vm.warp(START+32 days);vm.etch(address(token),hex"60006000f3");
        vm.expectRevert();vault.execute(id);
        require(vault.consumedBy(bytes32(uint256(1)))==0);
        vm.etch(address(token),original);vault.execute(id);
        require(token.balanceOf(PAYEE)==1);
    }
    function testFuzz_ActualPaymentConservesAllocation(uint256 raw) public {
        firstMonth();uint256 amount=1+raw%CAP;
        bytes32 id=propose(amount,bytes32(uint256(1)),bytes32(uint256(2)));
        vm.warp(START+32 days);vault.execute(id);
        (uint256 spent,uint256 capacity)=vault.snapshot();
        require(spent==CAP+amount&&capacity==CAP-amount);
        require(token.balanceOf(PAYEE)==amount&&token.balanceOf(MARKETING)==CAP);
        require(token.balanceOf(address(vault))==59111111052000-amount&&token.totalSupply()==888888888000000);
        for(uint256 i;i<11;++i)if(i!=8)require(token.balanceOf(token.reserves(i))==token.reserveAmount(i));
    }
}
