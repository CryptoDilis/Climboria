// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3RestrictedSpend} from "../src/V3RestrictedSpend.sol";
interface VmSpend {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract SpendFixtureToken is ERC20 {
    constructor() ERC20("Synthetic spend fixture","FIXTURE"){_mint(msg.sender,600000);}
}
contract V3RestrictedSpendTest {
    VmSpend constant vm=VmSpend(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    SpendFixtureToken token;
    V3RestrictedSpend v;
    address[5] signers;
    function setUp() public {
        vm.chainId(84532);
        for(uint256 i=0;i<5;i++) signers[i]=address(uint160(i+10));
        token=new SpendFixtureToken();
        start=block.timestamp+1 days;
        v=new V3RestrictedSpend(token,signers,FOUNDER,start,600000,"TREASURY");
        token.transfer(address(v),600000);
    }
    function propose(uint256 amount,uint256 month,bytes32 nonce) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,"EVIDENCE",month,nonce);
    }
    function approve3(bytes32 id) internal {
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testThresholdDelayAndExactPayment() public {
        bytes32 id=propose(10000,0,"A");
        for(uint256 i=0;i<2;i++){vm.prank(signers[i]);v.approve(id);}
        vm.warp(start);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[2]);v.approve(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10000&&v.totalSpent()==10000&&v.spent(0)==10000);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
    }
    function testDuplicateAndUnauthorizedApprovals() public {
        bytes32 id=propose(1,0,"A");
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.approve(id);
        vm.prank(signers[0]);v.approve(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.AlreadyApproved.selector);v.approve(id);
    }
    function testAggregateCapAndNoRollover() public {
        bytes32 a=propose(8000,1,"A");
        bytes32 b=propose(3000,1,"B");
        approve3(a);approve3(b);
        vm.warp(start+30 days);v.execute(a);
        vm.expectRevert(V3RestrictedSpend.CapExceeded.selector);v.execute(b);
        require(v.spent(0)==0&&v.spent(1)==8000);
    }
    function testExpiry() public {
        bytes32 a=propose(1,0,"A");approve3(a);
        vm.warp(start+30 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(a);
    }
    function testBeforeWindowEvenWithThreshold() public {
        bytes32 a=propose(1,1,"A");approve3(a);
        vm.warp(start+2 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(a);
    }
    function testRejectDirectFounderAndSignerRecipient() public {
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(FOUNDER,1,"E",0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(signers[1],1,"E",0,"A");
    }
    function testRejectDuplicateSignerAndFounderSigner() public {
        address[5] memory s=signers;s[4]=s[0];
        vm.expectRevert(V3RestrictedSpend.InvalidConfig.selector);new V3RestrictedSpend(token,s,FOUNDER,start,1,"T");
        s[4]=FOUNDER;
        vm.expectRevert(V3RestrictedSpend.InvalidConfig.selector);new V3RestrictedSpend(token,s,FOUNDER,start,1,"T");
    }
    function testExactCapSum() public {
        V3RestrictedSpend odd=new V3RestrictedSpend(token,signers,FOUNDER,start,600001,"ODD");
        uint256 sum;for(uint256 i=0;i<60;i++)sum+=odd.monthlyCap(i);
        require(sum==600001&&odd.monthlyCap(60)==0);
    }
    function testDuplicateProposalAndMissingEvidence() public {
        propose(1,0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(PAYEE,1,"EVIDENCE",0,"A");
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.propose(PAYEE,1,0,0,"B");
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(V3RestrictedSpend.WrongChain.selector);new V3RestrictedSpend(token,signers,FOUNDER,start,1,"T");
    }

    function testRevocationResetsDelayAtLostQuorum() public {
        bytes32 id=propose(10000,0,"A");approve3(id);
        vm.warp(start+2 days);
        vm.prank(signers[1]);v.revokeApproval(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[3]);v.approve(id);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.warp(start+4 days);v.execute(id);
        require(token.balanceOf(PAYEE)==10000);
    }
    function testRevocationWithRemainingQuorumKeepsDelay() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(signers[3]);v.approve(id);
        vm.prank(signers[0]);v.revokeApproval(id);
        vm.warp(start+2 days);v.execute(id);
        require(token.balanceOf(PAYEE)==1);
    }
    function testCancellationQuorumPermanentAndNoSpend() public {
        bytes32 id=propose(10000,0,"A");approve3(id);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.voteCancel(id);}
        require(v.cancelled(id)&&v.cancelVotes(id)==3);
        vm.warp(start+2 days);
        vm.expectRevert(V3RestrictedSpend.NotReady.selector);v.execute(id);
        vm.prank(signers[3]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.approve(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        require(v.totalSpent()==0&&token.balanceOf(PAYEE)==0);
        bytes32 next=propose(10000,0,"B");approve3(next);
        vm.warp(start+4 days);v.execute(next);
        require(token.balanceOf(PAYEE)==10000);
    }
    function testMinorityCancelCannotVetoOrDoubleVote() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(signers[0]);v.voteCancel(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
        vm.prank(signers[1]);v.voteCancel(id);
        require(!v.cancelled(id));
        vm.warp(start+2 days);v.execute(id);
        vm.prank(signers[2]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
    }
    function testUnauthorizedUnknownAndExpiredActions() public {
        bytes32 id=propose(1,0,"A");approve3(id);
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.voteCancel(id);
        vm.prank(FOUNDER);vm.expectRevert(V3RestrictedSpend.Unauthorized.selector);v.revokeApproval(id);
        vm.prank(signers[4]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(bytes32(uint256(999)));
        vm.warp(start+30 days);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.revokeApproval(id);
        vm.prank(signers[0]);vm.expectRevert(V3RestrictedSpend.InvalidProposal.selector);v.voteCancel(id);
    }
}
