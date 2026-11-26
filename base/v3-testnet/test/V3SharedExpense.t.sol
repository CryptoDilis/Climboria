// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3SharedExpenseFixture,V3SharedExpenseRegistry,V3SharedRestrictedSpend} from "../src/V3SharedExpenseFixture.sol";
interface VmShared {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
}
contract SharedTestAsset is ERC20 {
    constructor() ERC20("Synthetic expense asset","EXPTEST"){_mint(msg.sender,888888888000000);}
}
contract V3SharedExpenseTest {
    VmShared constant vm=VmShared(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    SharedTestAsset token;
    V3SharedExpenseFixture fixture;
    V3SharedExpenseRegistry registry;
    V3SharedRestrictedSpend e;
    V3SharedRestrictedSpend c;
    V3SharedRestrictedSpend t;
    address[5] signers;
    function setUp() public {
        vm.chainId(84532);
        for(uint256 i=0;i<5;i++)signers[i]=address(uint160(i+10));
        token=new SharedTestAsset();
        start=block.timestamp+1 days;
        fixture=new V3SharedExpenseFixture(token,signers,FOUNDER,start);
        registry=fixture.registry();e=fixture.ecosystem();c=fixture.community();t=fixture.treasury();
        token.transfer(address(e),e.budget());token.transfer(address(c),c.budget());
        // Treasury deliberately unfunded until a test transfers funds.
    }
    function proposal(V3SharedRestrictedSpend v,bytes32 evidence,bytes32 nonce,uint256 amount) internal returns(bytes32 id){
        vm.prank(signers[0]);id=v.propose(PAYEE,amount,evidence,0,nonce);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);v.approve(id);}
    }
    function testAtomicBindingAndNoRebind() public {
        require(registry.isSealed()&&registry.consumer(address(e))&&registry.consumer(address(c))&&registry.consumer(address(t)));
        require(address(e.registry())==address(registry)&&address(c.registry())==address(registry)&&address(t.registry())==address(registry));
        vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);registry.bind([address(e),address(c),address(t)]);
        vm.expectRevert(V3SharedExpenseRegistry.UnauthorizedConsumer.selector);registry.consume("E","P");
    }
    function testSameExpenseAcrossPurposesCannotPayTwice() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"E","B",20);
        vm.warp(start+2 days);e.execute(a);
        require(registry.consumedBy("E")==address(e)&&registry.consumedProposal("E")==a);
        vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);c.execute(b);
        require(e.totalSpent()==10&&c.totalSpent()==0&&token.balanceOf(PAYEE)==10);
    }
    function testSameVaultDifferentNonceCannotReplayExpense() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(e,"E","B",20);
        vm.warp(start+2 days);e.execute(a);
        vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);e.execute(b);
        require(e.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testFailedTransferRollsBackConsumptionAndAccounting() public {
        bytes32 a=proposal(t,"E","A",10);
        vm.warp(start+2 days);
        vm.expectRevert();t.execute(a);
        require(registry.consumedBy("E")==address(0)&&t.totalSpent()==0&&t.spent(0)==0);
        token.transfer(address(t),10);t.execute(a);
        require(registry.consumedBy("E")==address(t)&&t.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testCancelledProposalDoesNotConsumeExpense() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"E","B",20);
        for(uint256 i=0;i<3;i++){vm.prank(signers[i]);e.voteCancel(a);}
        vm.warp(start+2 days);
        vm.expectRevert(V3SharedRestrictedSpend.NotReady.selector);e.execute(a);
        require(registry.consumedBy("E")==address(0));c.execute(b);
        require(registry.consumedBy("E")==address(c)&&token.balanceOf(PAYEE)==20);
    }
    function testDifferentExpensesAndDelay() public {
        bytes32 a=proposal(e,"E","A",10);bytes32 b=proposal(c,"F","B",20);
        vm.expectRevert(V3SharedRestrictedSpend.NotReady.selector);e.execute(a);
        vm.warp(start+2 days);e.execute(a);c.execute(b);
        require(registry.consumedBy("E")==address(e)&&registry.consumedBy("F")==address(c)&&token.balanceOf(PAYEE)==30);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);new V3SharedExpenseFixture(token,signers,FOUNDER,block.timestamp+1 days);
    }
}
