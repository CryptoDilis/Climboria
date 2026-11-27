// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {BaseGuard} from "safe-contracts/base/GuardManager.sol";

interface VmSafeBoundary {
    function prank(address) external;
    function expectRevert() external;
}
contract BoundaryTarget {
    uint256 public calls;
    function touch() external {calls++;}
}
contract BoundaryModule {
    function touch(Safe wallet,BoundaryTarget target) external returns(bool){
        return wallet.execTransactionFromModule(address(target),0,abi.encodeCall(target.touch,()),Enum.Operation.Call);
    }
}
contract BoundaryDenyGuard is BaseGuard {
    function checkTransaction(address,uint256,bytes memory,Enum.Operation,uint256,uint256,uint256,address,address payable,bytes memory,address) external pure override {
        revert("DENIED");
    }
    function checkAfterExecution(bytes32,bool) external pure override {}
}
contract BoundaryAllowGuard is BaseGuard {
    function checkTransaction(address,uint256,bytes memory,Enum.Operation,uint256,uint256,uint256,address,address payable,bytes memory,address) external pure override {}
    function checkAfterExecution(bytes32,bool) external pure override {}
}

/// @notice Actual pinned Safe source behavior, not a production custody adapter.
/// Uses approved-hash signatures from synthetic test owners; no private keys or network.
contract SafeCustodyBoundaryTest {
    VmSafeBoundary constant vm=VmSafeBoundary(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant A=address(0x101);
    address constant B=address(0x102);
    address constant C=address(0x103);
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    address constant SENTINEL=address(1);
    Safe wallet;
    BoundaryTarget target;
    function setUp() public {
        Safe implementation=new Safe();
        wallet=Safe(payable(address(new SafeProxy(address(implementation)))));
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        wallet.setup(owners,3,address(0),"",address(0),address(0),0,payable(address(0)));
        target=new BoundaryTarget();
    }
    function _approved(address to,bytes memory data,uint256 count) private returns(bytes memory signatures){
        bytes32 hash=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            signatures=abi.encodePacked(signatures,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(address to,bytes memory data) private {
        bytes memory sigs=_approved(to,data,3);
        require(_exec(to,data,sigs));
    }
    function testActualSetupAndThreeOwnerQuorum() public {
        require(wallet.getThreshold()==3&&wallet.getOwners().length==5&&wallet.isOwner(A));
        (address[] memory modules,address next)=wallet.getModulesPaginated(SENTINEL,10);
        require(modules.length==0&&next==SENTINEL);
        _quorum(address(target),abi.encodeCall(target.touch,()));
        require(target.calls()==1&&wallet.nonce()==1);
    }
    function testTwoApprovalsCannotExecute() public {
        bytes memory data=abi.encodeCall(target.touch,());
        bytes memory sigs=_approved(address(target),data,2);
        vm.expectRevert();_exec(address(target),data,sigs);
        require(target.calls()==0&&wallet.nonce()==0);
    }
    function testOwnerSetHashReturnsAfterRotationABA() public {
        bytes32 beforeHash=keccak256(abi.encode(wallet.getOwners()));
        _quorum(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F));
        require(!wallet.isOwner(E)&&wallet.isOwner(F)&&keccak256(abi.encode(wallet.getOwners()))!=beforeHash);
        _quorum(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,F,E));
        require(wallet.isOwner(E)&&!wallet.isOwner(F)&&keccak256(abi.encode(wallet.getOwners()))==beforeHash&&wallet.nonce()==2);
    }
    function testOrdinarySafeAllowsThresholdReduction() public {
        _quorum(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1));
        require(wallet.getThreshold()==1);
        bytes memory data=abi.encodeCall(target.touch,());
        require(_exec(address(target),data,_approved(address(target),data,1)));
        require(target.calls()==1);
    }
    function testEnabledModuleBypassesNormalTransactionGuard() public {
        BoundaryModule module=new BoundaryModule();
        _quorum(address(wallet),abi.encodeWithSignature("enableModule(address)",address(module)));
        BoundaryDenyGuard guard=new BoundaryDenyGuard();
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(guard)));
        bytes memory data=abi.encodeCall(target.touch,());
        bytes memory sigs=_approved(address(target),data,3);
        vm.expectRevert();_exec(address(target),data,sigs);
        require(target.calls()==0);
        require(module.touch(wallet,target)&&target.calls()==1);
    }
    function testOrdinaryAllowGuardCanBeRemoved() public {
        BoundaryAllowGuard guard=new BoundaryAllowGuard();
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(guard)));
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)));
        _quorum(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1));
        require(wallet.getThreshold()==1);
    }
}
