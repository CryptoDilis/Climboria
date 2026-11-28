// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeEpochGuardFixture,GuardedSafeFactoryFixture} from "../src/SafeEpochGuardFixture.sol";

interface VmGuardSymbolic {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function assume(bool) external;
}
/// Guard hook tests use the actual pinned Safe/proxy/factory, but impersonate
/// the Safe at its hook boundary. Synthetic signatures test mode checks only,
/// not ECDSA recovery or quorum authorization in Safe.execTransaction.
contract ClimbSymbolicGuardTest {
    VmGuardSymbolic constant vm=VmGuardSymbolic(address(uint160(uint256(keccak256("hevm cheat code")))));
    Safe wallet;
    SafeEpochGuardFixture guard;
    struct Envelope {
        address to;
        uint256 value;
        bytes data;
        Enum.Operation operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        bytes signatures;
    }
    function setUp() public {
        vm.chainId(84532);
        vm.warp(100 days);
        GuardedSafeFactoryFixture factory=new GuardedSafeFactoryFixture();
        address[] memory owners=new address[](5);
        owners[0]=address(0x100001);owners[1]=address(0x100002);
        owners[2]=address(0x100003);owners[3]=address(0x100004);owners[4]=address(0x100005);
        (wallet,guard)=factory.create(owners);
        guard.validateConfig();
    }
    function _valid() private view returns(Envelope memory e) {
        e.to=address(guard);
        e.data=abi.encodeCall(guard.invalidateAuthorization,(1,0));
        e.signatures=new bytes(195);
        e.signatures[64]=bytes1(uint8(27));
        e.signatures[129]=bytes1(uint8(28));
        e.signatures[194]=bytes1(uint8(31));
    }
    function _hook(Envelope memory e,address caller) private returns(bool ok) {
        bytes memory data=abi.encodeCall(guard.checkTransaction,(e.to,e.value,e.data,e.operation,
            e.safeTxGas,e.baseGas,e.gasPrice,e.gasToken,e.refundReceiver,e.signatures,address(this)));
        vm.prank(caller);
        (ok,)=address(guard).call(data);
    }
    function _rejected(Envelope memory e,address caller) private {
        assert(!_hook(e,caller));
        assert(!guard.transactionActive());
        assert(guard.epoch()==1);
        assert(wallet.nonce()==0);
    }
    function check_wrongCaller(address caller) public {
        vm.assume(caller!=address(wallet));
        _rejected(_valid(),caller);
    }
    function check_nonzeroNumericField(uint8 field,uint256 amount) public {
        vm.assume(field<4 && amount>0);
        Envelope memory e=_valid();
        if(field==0)e.value=amount;
        else if(field==1)e.safeTxGas=amount;
        else if(field==2)e.baseGas=amount;
        else e.gasPrice=amount;
        _rejected(e,address(wallet));
    }
    function check_delegatecallRejected() public {
        Envelope memory e=_valid();e.operation=Enum.Operation.DelegateCall;
        _rejected(e,address(wallet));
    }
    function check_refundFieldRejected(bool token,address a) public {
        vm.assume(a!=address(0));
        Envelope memory e=_valid();
        if(token)e.gasToken=a;else e.refundReceiver=payable(a);
        _rejected(e,address(wallet));
    }
    function check_badSignatureMode(uint8 slot,uint8 v) public {
        vm.assume(slot<3 && v!=27 && v!=28 && v!=31 && v!=32);
        Envelope memory e=_valid();
        if(slot==0)e.signatures[64]=bytes1(v);
        else if(slot==1)e.signatures[129]=bytes1(v);
        else e.signatures[194]=bytes1(v);
        _rejected(e,address(wallet));
    }
    function check_unknownGuardSelector(bytes4 selector) public {
        // Exactly 68 bytes; only cancel/invalidate are allowed at this length.
        vm.assume(selector!=guard.cancelRotation.selector && selector!=guard.invalidateAuthorization.selector);
        Envelope memory e=_valid();e.data=abi.encodeWithSelector(selector,uint256(1),uint256(0));
        _rejected(e,address(wallet));
    }
    function check_wrongTarget(address target) public {
        vm.assume(target!=address(guard) && target!=address(wallet));
        Envelope memory e=_valid();e.to=target;
        _rejected(e,address(wallet));
    }
    function check_hookLifecycle() public {
        Envelope memory e=_valid();
        assert(_hook(e,address(wallet)));
        assert(guard.transactionActive());
        assert(!_hook(e,address(wallet)));
        assert(guard.transactionActive());
        vm.prank(address(wallet));
        (bool ok,)=address(guard).call(abi.encodeCall(guard.checkAfterExecution,(bytes32(0),false)));
        assert(!ok && guard.transactionActive());
        vm.prank(address(wallet));
        (ok,)=address(guard).call(abi.encodeCall(guard.checkAfterExecution,(bytes32(0),true)));
        assert(ok && !guard.transactionActive());
        assert(guard.epoch()==1 && wallet.nonce()==0);
    }
}
contract ClimbSymbolicNegativeControl {
    function check_detectCounterexample(uint256 x) public pure {assert(x!=42);}
}
