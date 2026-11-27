// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {SafeEpochGuardTest} from "./SafeEpochGuard.t.sol";
import {Enum} from "safe-contracts/common/Enum.sol";

/// @notice Actual pinned Safe, disposable keys and isolated chain only.
contract SafeAdversarialFuzz is SafeEpochGuardTest {
    function _auth(address to,bytes memory data,bool duplicate,uint8 choice) private returns(bytes memory sigs){
        uint256[3] memory k=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++)if(vm.addr(k[j])<vm.addr(k[i]))(k[i],k[j])=(k[j],k[i]);
        bytes32 hash=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        for(uint256 i=0;i<3;i++){
            (uint8 v,bytes32 r,bytes32 s)=vm.sign(k[duplicate?uint256(choice)%3:i],hash);
            sigs=abi.encodePacked(sigs,r,s,v);
        }
    }
    function _run(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _scheduleData() private view returns(bytes memory){
        return abi.encodeCall(guard.scheduleRotation,(guard.epoch(),D,E,F,block.timestamp,block.timestamp+1 hours));
    }
    function _payload(uint256 serial) private pure returns(bytes memory){
        return abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),serial);
    }
    function _unchanged(uint256 nonce,uint256 epoch) private view {
        guard.validateConfig();
        require(wallet.nonce()==nonce&&guard.epoch()==epoch&&!guard.transactionActive());
        require(guard.threshold()==3&&guard.memberCount()==5);
    }
    function testFuzz_DuplicateSignatureNeverCountsAsQuorum(uint8 choice) public {
        bytes memory data=_scheduleData();
        bytes memory sigs=_auth(address(guard),data,true,choice);
        vm.expectRevert();_run(address(guard),data,sigs);
        _unchanged(0,1);
        (bytes32 pending,,,,)=guard.pending();require(pending==0);
        require(_run(address(guard),data,_auth(address(guard),data,false,0)));
        _unchanged(1,1);
    }
    function testFuzz_RotationWindow(uint32 raw) public {
        bytes memory data=_scheduleData();
        uint256 t=block.timestamp;
        require(_run(address(guard),data,_auth(address(guard),data,false,0)));
        uint256 elapsed=uint256(raw)%(10 days+1);
        vm.warp(t+elapsed);
        bytes memory swap=_payload(guard.rotationSerial());
        bytes memory sigs=_auth(address(wallet),swap,false,0);
        if(elapsed<2 days||elapsed>=9 days){
            vm.expectRevert();_run(address(wallet),swap,sigs);
            _unchanged(1,1);require(guard.isMember(E)&&!guard.isMember(F));
        }else{
            require(_run(address(wallet),swap,sigs));
            _unchanged(2,2);require(!guard.isMember(E)&&guard.isMember(F));
        }
    }
    function testFuzz_WrongSerialNeverExecutes(uint256 raw) public {
        bytes memory data=_scheduleData();
        require(_run(address(guard),data,_auth(address(guard),data,false,0)));
        vm.warp(block.timestamp+2 days);
        uint256 serial=guard.rotationSerial();
        uint256 wrong=raw==serial?0:raw;
        bytes memory swap=_payload(wrong);
        bytes memory sigs=_auth(address(wallet),swap,false,0);
        vm.expectRevert();_run(address(wallet),swap,sigs);
        _unchanged(1,1);require(guard.isMember(E));
        swap=_payload(serial);
        require(_run(address(wallet),swap,_auth(address(wallet),swap,false,0)));
        _unchanged(2,2);require(guard.isMember(F)&&!guard.isMember(E));
    }
    function testFuzz_DisabledModuleCannotAuthorize(uint160 raw) public {
        address caller=address(raw);
        if(caller==address(0)||caller==address(1)||caller==address(wallet)||caller==address(guard))caller=address(0xBEEF);
        bytes memory data=_scheduleData();
        require(!wallet.isModuleEnabled(caller));
        vm.prank(caller);
        vm.expectRevert();
        wallet.execTransactionFromModule(address(guard),0,data,Enum.Operation.Call);
        _unchanged(0,1);
        (bytes32 pending,,,,)=guard.pending();require(pending==0);
        require(_run(address(guard),data,_auth(address(guard),data,false,0)));
        _unchanged(1,1);
    }
}
