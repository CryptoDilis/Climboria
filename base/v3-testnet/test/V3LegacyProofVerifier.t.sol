// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofVerifierFixture as Verifier} from "../src/V3LegacyProofVerifierFixture.sol";
interface VmLegacyProof {function chainId(uint256) external;}
contract V3LegacyProofVerifierTest {
    VmLegacyProof constant vm=VmLegacyProof(address(uint160(uint256(keccak256("hevm cheat code")))));
    Verifier verifier;
    function setUp() public {vm.chainId(84532);verifier=new Verifier();}
    // Independent Python SHA-256 / fixed-width byte encoding vector.
    function commitment() private pure returns(Verifier.Commitment memory){
        return Verifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(201),address(202),2,20,16,
            0x874e84f376daa40563141813015b5a4c1c08cc6001867759f4db578a914e53ca);
    }
    function row() private pure returns(Verifier.Row memory){
        return Verifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),address(101),100,7,bytes32(uint256(31)));
    }
    function proof() private pure returns(Verifier.Node[] memory p){
        p=new Verifier.Node[](1);p[0]=Verifier.Node(0x75d8a2ff3aec21ef9e700d051fded9469549b855cbbe3cea9962cb32be7525c6,9);
    }
    function testIndependentBinaryVectorBothDirections() public view {
        require(verifier.verify(commitment(),0,row(),proof()));
        Verifier.Node[] memory p=new Verifier.Node[](1);
        p[0]=Verifier.Node(0x75fbb26e69e9985e6dbf2ee85ef03bb81d96893056876376a869c2b022a18615,7);
        Verifier.Row memory r=Verifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),address(102),200,9,bytes32(uint256(32)));
        require(verifier.verify(commitment(),1,r,p));
    }
    function testAlteredRowAndIndexRejected() public view {
        Verifier.Row memory r=row();r.award++;
        require(!verifier.verify(commitment(),0,r,proof()));
        r=row();r.recipient=address(999);require(!verifier.verify(commitment(),0,r,proof()));
        require(!verifier.verify(commitment(),1,row(),proof()));
        require(!verifier.verify(commitment(),2,row(),proof()));
    }
    function testAlteredSumHashAndLengthRejected() public view {
        Verifier.Node[] memory p=proof();p[0].sum=type(uint256).max;
        require(!verifier.verify(commitment(),0,row(),p));
        p=proof();p[0].hash=bytes32(uint256(1));require(!verifier.verify(commitment(),0,row(),p));
        p=new Verifier.Node[](0);require(!verifier.verify(commitment(),0,row(),p));
    }
    function testContextTargetAndCapBinding() public view {
        Verifier.Commitment memory c=commitment();c.contextHash=bytes32(uint256(99));
        require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.targetVault=address(999);require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.cap=19;require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.cap=verifier.RESERVE()+1;require(!verifier.verify(c,0,row(),proof()));
        c=commitment();c.allocated=15;require(!verifier.verify(c,0,row(),proof()));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);require(!verifier.verify(commitment(),0,row(),proof()));
    }
}
