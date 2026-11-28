// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {V4LocalSafeBoundary,V4LocalSafeFactory} from "../src/V4LocalSafeBoundary.sol";
import {V4GenesisLocalFixture} from "../src/V4GenesisLocalFixture.sol";
import {V4MarketingBudgetLocalFixture} from "../src/V4MarketingBudgetLocalFixture.sol";
interface VmLocalSafe {
    function chainId(uint256) external;
    function warp(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function expectRevert() external;
    function prank(address) external;
}
contract V4LocalSafeTest {
    VmLocalSafe constant vm=VmLocalSafe(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant CAP=3111111108000;
    uint256 constant START=100 days;
    address constant MARKETING=address(0x100001);
    uint256[3] keys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
    Safe wallet; V4LocalSafeBoundary guard;
    function setUp() public {
        vm.chainId(31337);vm.warp(START);
        for(uint256 i;i<3;++i)for(uint256 j=i+1;j<3;++j)if(vm.addr(keys[i])>vm.addr(keys[j]))(keys[i],keys[j])=(keys[j],keys[i]);
        address[] memory owners=new address[](5);
        for(uint256 i;i<3;++i)owners[i]=vm.addr(keys[i]);
        owners[3]=address(0x104);owners[4]=address(0x105);
        V4LocalSafeFactory factory=new V4LocalSafeFactory();
        (wallet,guard)=factory.create(owners);
    }
    function sign(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        for(uint256 i;i<count;++i){(uint8 v,bytes32 r,bytes32 s)=vm.sign(keys[i],h);sigs=abi.encodePacked(sigs,r,s,v);}
    }
    function exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function quorum(bytes memory data) private {require(exec(address(guard),data,sign(address(guard),data,3)));}
    function reject(address to,bytes memory data,uint256 count) private {
        bytes memory sigs=sign(to,data,count);vm.expectRevert();exec(to,data,sigs);
    }
    function issuance(address recipient) private view returns(bytes memory){
        return abi.encodeCall(guard.issueLocal,(1,recipient,block.timestamp,block.timestamp+1 hours));
    }
    function record(uint256 amount) private view returns(bytes memory){
        return abi.encodeCall(guard.recordMarketing,(1,amount,block.timestamp,block.timestamp+1 hours));
    }
    function testActualQuorumGenesis() public {
        quorum(issuance(MARKETING));
        V4GenesisLocalFixture t=guard.token();V4MarketingBudgetLocalFixture b=guard.budget();
        require(t.totalSupply()==888888888000000&&t.balanceOf(MARKETING)==CAP&&t.balanceOf(address(wallet))==0);
        require(b.controller()==address(guard)&&b.start()==START);
        (,uint256 spent,,uint256 available)=b.snapshot();require(spent==CAP&&available==0);
        require(wallet.nonce()==1&&!guard.transactionActive());
    }
    function testTwoSignaturesAndDirectCallRejected() public {
        reject(address(guard),issuance(MARKETING),2);
        vm.expectRevert();guard.issueLocal(1,MARKETING,START,START+1 hours);
        require(address(guard.token())==address(0)&&wallet.nonce()==0);
    }
    function testDuplicateAndMalformedIssuanceRejected() public {
        reject(address(guard),abi.encodePacked(issuance(MARKETING),bytes32(0)),3);
        quorum(issuance(MARKETING));reject(address(guard),issuance(MARKETING),3);
        require(guard.token().balanceOf(MARKETING)==CAP&&wallet.nonce()==1);
    }
    function testOwnerRecipientAndExpiredAuthorizationRejected() public {
        address owner=vm.addr(keys[0]);
        reject(address(guard),issuance(owner),3);
        bytes memory stale=issuance(MARKETING);vm.warp(START+1 hours);
        reject(address(guard),stale,3);
        require(wallet.nonce()==0&&address(guard.token())==address(0));
    }
    function testBudgetRequiresQuorumAndDoesNotPayTokens() public {
        reject(address(guard),record(1),3);
        quorum(issuance(MARKETING));reject(address(guard),record(1),3);
        vm.warp(START+30 days);
        reject(address(guard),record(CAP),2);
        V4MarketingBudgetLocalFixture b=guard.budget();
        vm.expectRevert();b.recordSpend(1);
        quorum(record(CAP));
        (,uint256 spent,,uint256 available)=b.snapshot();require(spent==2*CAP&&available==0);
        require(guard.token().balanceOf(MARKETING)==CAP&&guard.token().balanceOf(guard.token().reserves(8))==59111111052000);
    }
    function testBudgetOverCapAndReplayRejected() public {
        quorum(issuance(MARKETING));vm.warp(START+30 days);
        reject(address(guard),record(CAP+1),3);
        bytes memory data=record(CAP);bytes memory sigs=sign(address(guard),data,3);
        require(exec(address(guard),data,sigs));
        vm.expectRevert();exec(address(guard),data,sigs);
        require(wallet.nonce()==2&&!guard.transactionActive());
    }
    function testGenericTokenAndGuardMutationRejected() public {
        quorum(issuance(MARKETING));
        address t=address(guard.token());
        reject(t,abi.encodeWithSignature("transfer(address,uint256)",MARKETING,1),3);
        reject(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)),3);
        reject(address(wallet),abi.encodeWithSignature("enableModule(address)",MARKETING),3);
        require(wallet.nonce()==1&&!guard.transactionActive());
    }
    function testMarketingOwnerRotationDenied() public {
        quorum(issuance(MARKETING));
        address[] memory owners=wallet.getOwners();
        bytes memory data=abi.encodeWithSignature("scheduleRotation(uint256,address,address,address,uint256,uint256)",1,address(1),owners[0],MARKETING,START,START+1 hours);
        reject(address(guard),data,3);
        require(wallet.nonce()==1);
    }
}
