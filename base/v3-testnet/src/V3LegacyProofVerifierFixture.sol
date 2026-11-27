// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

/// @notice Isolated Base Sepolia binary Merkle-sum verifier. No custody,
/// claim execution, root registration, or authentication of source eligibility.
/// Binary V2 deliberately differs from the offline JSON V1 commitment.
contract V3LegacyProofVerifierFixture {
    uint256 public constant RESERVE=8888888880000;
    bytes32 public constant DOMAIN=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
    struct Commitment {
        bytes32 contextHash;
        bytes32 manifestDigest;
        address targetToken;
        address targetVault;
        uint256 count;
        uint256 cap;
        uint256 allocated;
        bytes32 root;
    }
    struct Row {
        bytes32 sourceAccount;
        bytes32 sourceOwner;
        address recipient;
        uint256 sourceAmount;
        uint256 award;
        bytes32 evidenceHash;
    }
    struct Node {bytes32 hash;uint256 sum;}
    function _leaf(bytes32 context,uint256 index,Row calldata row) private pure returns(Node memory){
        return Node(sha256(abi.encodePacked(DOMAIN,bytes1(0x01),context,index,row.sourceAccount,row.sourceOwner,
            row.recipient,row.sourceAmount,row.award,row.evidenceHash)),row.award);
    }
    function _root(Commitment calldata c,Node memory n) private pure returns(bytes32){
        return sha256(abi.encodePacked(DOMAIN,bytes1(0x04),c.contextHash,c.manifestDigest,
            uint256(84532),c.targetToken,c.targetVault,c.count,c.cap,n.hash,n.sum));
    }
    function verify(Commitment calldata c,uint256 index,Row calldata row,Node[] calldata siblings) external view returns(bool){
        if(block.chainid!=84532||c.contextHash==0||c.manifestDigest==0||c.root==0||
            c.targetToken==address(0)||c.targetVault==address(0)||c.targetToken==c.targetVault||
            c.count==0||c.count>100000||index>=c.count||c.cap==0||c.cap>RESERVE||
            c.allocated==0||c.allocated>c.cap||row.sourceAccount==0||row.sourceOwner==0||
            row.recipient==address(0)||row.recipient==c.targetToken||row.recipient==c.targetVault||
            row.sourceAmount==0||row.sourceAmount>type(uint64).max||row.award==0||row.award>c.allocated||row.evidenceHash==0)return false;
        uint256 depth;uint256 width=1;
        while(width<c.count){width*=2;depth++;}
        if(siblings.length!=depth)return false;
        Node memory n=_leaf(c.contextHash,index,row);
        for(uint256 i=0;i<depth;i++){
            Node calldata s=siblings[i];
            if(s.hash==0||s.sum>c.allocated-n.sum)return false;
            bytes32 h=index%2==0?
                sha256(abi.encodePacked(DOMAIN,bytes1(0x03),n.hash,n.sum,s.hash,s.sum)):
                sha256(abi.encodePacked(DOMAIN,bytes1(0x03),s.hash,s.sum,n.hash,n.sum));
            n=Node(h,n.sum+s.sum);index/=2;
        }
        return n.sum==c.allocated&&c.root==_root(c,n);
    }
}
