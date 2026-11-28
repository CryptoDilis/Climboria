// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {V4SharedEvidenceLocal} from "../src/V4SharedEvidenceLocal.sol";
interface VmShared {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function prank(address) external;
    function expectRevert() external;
}
contract EvidenceSyntheticAsset is ERC20 {
    constructor() ERC20("Synthetic evidence test","EVIDLOCAL"){_mint(msg.sender,1000);}
}
/// @dev Test-only payment caller, NOT a real vault or multisig.
contract EvidencePaymentHarness {
    using SafeERC20 for IERC20;
    IERC20 public immutable token;
    address public immutable controller;
    V4SharedEvidenceLocal public registry;
    constructor(IERC20 asset){token=asset;controller=msg.sender;}
    function bind(V4SharedEvidenceLocal r) external {
        require(msg.sender==controller&&address(registry)==address(0)&&r.token()==address(token)&&r.memberHash(address(this))==address(this).codehash);
        registry=r;
    }
    function pay(bytes32 evidence,bytes32 proposal,address recipient,uint256 amount) external {
        require(msg.sender==controller&&amount>0&&recipient!=address(0));
        registry.consume(evidence,proposal);
        token.safeTransfer(recipient,amount);
    }
}
contract V4SharedEvidenceLocalTest {
    VmShared constant vm=VmShared(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant PAYEE=address(0x100001);
    bytes32 constant E=bytes32(uint256(1));
    bytes32 constant P=bytes32(uint256(2));
    bytes32 constant Q=bytes32(uint256(3));
    bytes32 constant F=bytes32(uint256(4));
    EvidenceSyntheticAsset asset;
    EvidencePaymentHarness a;EvidencePaymentHarness b;
    V4SharedEvidenceLocal registry;
    function members(address x,address y) private pure returns(address[] memory m){m=new address[](2);m[0]=x;m[1]=y;}
    function setUp() public {
        vm.chainId(31337);asset=new EvidenceSyntheticAsset();
        a=new EvidencePaymentHarness(asset);b=new EvidencePaymentHarness(asset);
        registry=new V4SharedEvidenceLocal(address(asset),members(address(a),address(b)));
        a.bind(registry);b.bind(registry);
        require(asset.transfer(address(a),500)&&asset.transfer(address(b),500));
    }
    function testCrossVaultEvidenceCannotBePaidTwice() public {
        a.pay(E,P,PAYEE,10);vm.expectRevert();b.pay(E,Q,PAYEE,20);
        (address v,bytes32 p)=registry.consumed(E);
        require(v==address(a)&&p==P&&asset.balanceOf(PAYEE)==10&&asset.balanceOf(address(b))==500);
    }
    function testSameProposalCannotUseDifferentEvidence() public {
        a.pay(E,P,PAYEE,10);
        vm.expectRevert();a.pay(F,P,PAYEE,1);
        require(registry.evidenceForProposal(address(a),P)==E);
        (address v,)=registry.consumed(F);require(v==address(0));
    }
    function testProposalIdsAreVaultScoped() public {
        a.pay(E,P,PAYEE,10);b.pay(F,P,PAYEE,20);
        require(asset.balanceOf(PAYEE)==30&&registry.evidenceForProposal(address(a),P)==E&&registry.evidenceForProposal(address(b),P)==F);
    }
    function testTransferFailureRollsBackSharedEvidence() public {
        vm.expectRevert();a.pay(E,P,PAYEE,501);
        (address v,bytes32 p)=registry.consumed(E);
        require(v==address(0)&&p==0&&registry.evidenceForProposal(address(a),P)==0);
        b.pay(E,Q,PAYEE,500);
        require(asset.balanceOf(PAYEE)==500&&registry.evidenceForProposal(address(b),Q)==E);
    }
    function testUnauthorizedAndZeroIdentifiersRejected() public {
        vm.expectRevert();registry.consume(E,P);
        vm.prank(PAYEE);vm.expectRevert();a.pay(E,P,PAYEE,1);
        vm.expectRevert();a.pay(bytes32(0),P,PAYEE,1);
        vm.expectRevert();a.pay(E,bytes32(0),PAYEE,1);
        (bool ok,)=address(registry).call(abi.encodeWithSignature("register(address)",address(this)));require(!ok);
        (ok,)=address(registry).call(abi.encodeWithSignature("reset(bytes32)",E));require(!ok);
    }
    function testPinnedVaultAndTokenRuntime() public {
        bytes memory original=address(a).code;
        vm.etch(address(a),hex"60006000f3");
        vm.prank(address(a));vm.expectRevert();registry.consume(E,P);
        vm.etch(address(a),original);
        original=address(asset).code;
        vm.etch(address(asset),hex"60006000f3");
        vm.expectRevert();a.pay(E,P,PAYEE,1);
        vm.etch(address(asset),original);
        a.pay(E,P,PAYEE,1);require(asset.balanceOf(PAYEE)==1);
    }
    function testInvalidMembershipAndPublicChainRejected() public {
        address[] memory duplicate=members(address(a),address(a));
        vm.expectRevert();new V4SharedEvidenceLocal(address(asset),duplicate);
        address[] memory invalid=members(address(a),PAYEE);
        vm.expectRevert();new V4SharedEvidenceLocal(address(asset),invalid);
        invalid=members(address(a),address(asset));
        vm.expectRevert();new V4SharedEvidenceLocal(address(asset),invalid);
        address[] memory valid=members(address(a),address(b));
        vm.chainId(84532);vm.expectRevert();new V4SharedEvidenceLocal(address(asset),valid);
        vm.expectRevert();a.pay(E,P,PAYEE,1);
        vm.chainId(8453);vm.expectRevert();new V4SharedEvidenceLocal(address(asset),valid);
    }
    function testFuzz_ExactlyOneVaultConsumesEvidence(uint256 raw,bool reverse) public {
        uint256 amount=1+raw%500;
        EvidencePaymentHarness first=reverse?b:a;
        EvidencePaymentHarness second=reverse?a:b;
        first.pay(E,P,PAYEE,amount);
        vm.expectRevert();second.pay(E,Q,PAYEE,1);
        (address v,bytes32 p)=registry.consumed(E);
        require(v==address(first)&&p==P&&asset.balanceOf(PAYEE)==amount);
        require(asset.balanceOf(address(first))+asset.balanceOf(address(second))+asset.balanceOf(PAYEE)==1000);
    }
}
