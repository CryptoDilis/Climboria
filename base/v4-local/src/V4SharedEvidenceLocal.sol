// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

/// @notice Local-only shared evidence consumption primitive for a single token issuance.
/// @dev Fixed membership; no admin, register, reset, withdrawal or asset custody.
/// Constructor inputs require independent verification by the eventual issuance factory.
/// A hash proves uniqueness of an identifier, not truth or uniqueness of off-chain invoices.
/// Integration with actual Safe-controlled vaults is deliberately separate.
contract V4SharedEvidenceLocal {
    error InvalidConfig();
    error Denied();
    address public immutable token;
    bytes32 public immutable tokenHash;
    uint256 public immutable memberCount;
    mapping(address=>bytes32) public memberHash;
    struct Consumption { address vault; bytes32 proposal; }
    mapping(bytes32=>Consumption) public consumed;
    mapping(address=>mapping(bytes32=>bytes32)) public evidenceForProposal;
    event Consumed(bytes32 indexed evidence,address indexed vault,bytes32 indexed proposal);
    constructor(address asset,address[] memory members){
        if(block.chainid!=31337||asset.code.length==0||members.length<2||members.length>11)revert InvalidConfig();
        token=asset;tokenHash=asset.codehash;memberCount=members.length;
        for(uint256 i;i<members.length;++i){
            address a=members[i];
            if(a==asset||a==address(this)||a.code.length==0||memberHash[a]!=0)revert InvalidConfig();
            memberHash[a]=a.codehash;
        }
    }
    function consume(bytes32 evidence,bytes32 proposal) external {
        bytes32 expected=memberHash[msg.sender];
        if(block.chainid!=31337||token.codehash!=tokenHash||expected==0||
           msg.sender.codehash!=expected||evidence==0||proposal==0||
           consumed[evidence].vault!=address(0)||evidenceForProposal[msg.sender][proposal]!=0)revert Denied();
        consumed[evidence]=Consumption(msg.sender,proposal);
        evidenceForProposal[msg.sender][proposal]=evidence;
        emit Consumed(evidence,msg.sender,proposal);
    }
}
