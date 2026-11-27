// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {V3EpochSpendFixture,V3EpochPolicyFactory,IV3CustodyEpochFixture} from "../src/V3EpochSpendFixture.sol";
import {V3SharedExpenseRegistry} from "../src/V3SharedExpenseFixture.sol";
interface VmEpoch {
    function chainId(uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}
contract EpochTestAsset is ERC20 {
    constructor() ERC20("Synthetic epoch asset","EPOCHTEST"){_mint(msg.sender,888888888000000);}
}
// Deliberately unrestricted mock. Never use this for actual custody.
contract MockEpochCustody is IV3CustodyEpochFixture {
    uint256 public override epoch=1;
    uint256 public override threshold=3;
    uint256 public override memberCount=5;
    mapping(address=>bool) public override isMember;
    function configure(uint256 e,uint256 t,uint256 n) external {epoch=e;threshold=t;memberCount=n;}
    function member(address a,bool yes) external {isMember[a]=yes;}
    function propose(V3EpochSpendFixture v,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 nonce) external returns(bytes32){
        return v.propose(recipient,amount,evidence,month,nonce);
    }
    function cancel(V3EpochSpendFixture v,bytes32 id) external {v.cancel(id);}
}
contract V3EpochPolicyTest {
    VmEpoch constant vm=VmEpoch(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant FOUNDER=address(99);
    address constant PAYEE=address(100);
    uint256 start;
    EpochTestAsset token;
    MockEpochCustody control;
    V3EpochPolicyFactory factory;
    V3EpochSpendFixture e;
    V3EpochSpendFixture c;
    function setUp() public {
        vm.chainId(84532);
        token=new EpochTestAsset();control=new MockEpochCustody();
        start=block.timestamp+1 days;
        factory=new V3EpochPolicyFactory(token,control,start,FOUNDER);
        e=factory.ecosystem();c=factory.community();
        token.transfer(address(e),e.budget());token.transfer(address(c),c.budget());
    }
    function propose(V3EpochSpendFixture v,bytes32 evidence,bytes32 nonce,uint256 amount) internal returns(bytes32){
        return control.propose(v,PAYEE,amount,evidence,0,nonce);
    }
    function testOnlyCustodyAuthorizesAndDelay() public {
        vm.expectRevert(V3EpochSpendFixture.Unauthorized.selector);e.propose(PAYEE,10,"E",0,"N");
        bytes32 id=propose(e,"E","N",10);
        vm.warp(start);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(id);
        vm.warp(start+2 days);e.execute(id);
        require(e.totalSpent()==10&&token.balanceOf(PAYEE)==10);
    }
    function testRotationInvalidatesPriorProposalAndRequiresFreshDelay() public {
        bytes32 old=propose(e,"E","N",10);
        vm.warp(start+2 days);control.configure(2,3,5);e.syncEpoch();
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(old);
        bytes32 fresh=propose(e,"E","N",10);require(fresh!=old);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(fresh);
        vm.warp(start+4 days);e.execute(fresh);require(e.totalSpent()==10);
    }
    function testObservedEpochRollbackAndWrongThresholdRejected() public {
        control.configure(2,3,5);e.syncEpoch();control.configure(1,3,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        control.configure(3,2,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        control.configure(3,3,4);
        vm.expectRevert(V3EpochSpendFixture.InvalidConfig.selector);e.syncEpoch();
        require(e.highestObservedEpoch()==2);
    }
    function testConsumedExpenseSurvivesEpochAcrossPurposes() public {
        bytes32 a=propose(e,"E","A",10);vm.warp(start+2 days);e.execute(a);
        control.configure(2,3,5);
        vm.expectRevert(V3EpochSpendFixture.InvalidProposal.selector);propose(c,"E","B",20);
        require(factory.registry().consumedBy("E")==address(e)&&e.totalSpent()==10);
    }
    function testRecipientRecheckedBeforeExecution() public {
        bytes32 a=propose(e,"E","A",10);vm.warp(start+2 days);
        control.member(PAYEE,true);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(a);
        require(e.totalSpent()==0);
    }
    function testCancellationAndCapPreserved() public {
        uint256 cap=e.monthlyCap(0);
        bytes32 a=propose(e,"E","A",cap);control.cancel(e,a);
        bytes32 b=propose(e,"F","B",cap);bytes32 d=propose(e,"G","D",1);
        vm.warp(start+2 days);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);e.execute(a);
        e.execute(b);
        vm.expectRevert(V3EpochSpendFixture.CapExceeded.selector);e.execute(d);
        require(e.totalSpent()==cap&&factory.registry().consumedBy("E")==address(0));
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert(V3SharedExpenseRegistry.InvalidBinding.selector);
        new V3EpochPolicyFactory(token,control,start,FOUNDER);
    }
}
