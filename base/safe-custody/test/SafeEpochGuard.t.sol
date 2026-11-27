// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeEpochGuardFixture,GuardedSafeFactoryFixture} from "../src/SafeEpochGuardFixture.sol";
interface VmEpochGuard {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}
contract SafeEpochGuardTest {
    VmEpochGuard constant vm=VmEpochGuard(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant A=address(0x101);
    address constant B=address(0x102);
    address constant C=address(0x103);
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    Safe wallet;
    SafeEpochGuardFixture guard;
    GuardedSafeFactoryFixture factory;
    function setUp() public {
        vm.chainId(84532);factory=new GuardedSafeFactoryFixture();
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners);
    }
    function _approved(address to,bytes memory data,Enum.Operation op,uint256 count) private returns(bytes memory sigs){
        bytes32 hash=wallet.getTransactionHash(to,0,data,op,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            sigs=abi.encodePacked(sigs,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _exec(address to,bytes memory data,Enum.Operation op,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,op,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(address to,bytes memory data) private {
        require(_exec(to,data,Enum.Operation.Call,_approved(to,data,Enum.Operation.Call,3)));
    }
    function _reject(address to,bytes memory data,Enum.Operation op,uint256 count) private {
        bytes memory sigs=_approved(to,data,op,count);
        vm.expectRevert();_exec(to,data,op,sigs);
    }
    function _schedule(uint256 e,address oldOwner,address newOwner) private {
        _quorum(address(guard),abi.encodeCall(guard.scheduleRotation,(e,D,oldOwner,newOwner)));
    }
    function _swap(address oldOwner,address newOwner) private pure returns(bytes memory){
        return abi.encodeWithSignature("swapOwner(address,address,address)",D,oldOwner,newOwner);
    }
    function testAtomicInitializationAndConfiguration() public {
        guard.validateConfig();require(guard.epoch()==1&&guard.threshold()==3&&guard.memberCount()==5&&guard.isMember(E)&&wallet.nonce()==0);
        vm.expectRevert();wallet.setup(new address[](0),1,address(0),"",address(0),address(0),0,payable(address(0)));
    }
    function testRealQuorumAndDirectCallerRejection() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F));
        vm.expectRevert();guard.scheduleRotation(1,D,E,F);
        _reject(address(guard),data,Enum.Operation.Call,2);
        _quorum(address(guard),data);
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
    }
    function testForbiddenConfigurationAndDelegatecallPaths() public {
        _reject(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("enableModule(address)",F),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("setFallbackHandler(address)",F),Enum.Operation.Call,3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,F)),Enum.Operation.DelegateCall,3);
        _reject(F,hex"12345678",Enum.Operation.Call,3);
        guard.validateConfig();require(guard.epoch()==1);
    }
    function testDelayExactRotationAndMonotonicABA() public {
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);
        _reject(address(wallet),_swap(E,address(0x107)),Enum.Operation.Call,3);
        _quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,F,E)),Enum.Operation.Call,3);
        _schedule(2,F,E);vm.warp(block.timestamp+2 days);
        _quorum(address(wallet),_swap(F,E));
        require(guard.epoch()==3&&guard.isMember(E)&&!guard.isMember(F));
    }
    function testCancelledAndExpiredRotationsRequireFreshDelay() public {
        _schedule(1,E,F);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1)));
        vm.warp(block.timestamp+2 days);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);vm.warp(block.timestamp+9 days);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);_quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2);
    }
    function testInvalidRotationDoesNotChangeEpoch() public {
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,C,E,F)),Enum.Operation.Call,3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,A)),Enum.Operation.Call,3);
        require(guard.epoch()==1&&guard.isMember(E));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert();new GuardedSafeFactoryFixture();
    }
}
