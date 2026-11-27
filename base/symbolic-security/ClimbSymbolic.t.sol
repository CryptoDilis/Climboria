// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

// Copied into a temporary Foundry project by the isolated Halmos workflow.
import {V3SuccessorTestToken} from "../src/V3AtomicSuccessorFixture.sol";
import {V3GovernedGameRewardFixture, IV3RewardCustody} from "../src/V3GovernedGameRewardFixture.sol";

interface VmSymbolic {
    function chainId(uint256) external;
    function warp(uint256) external;
    function prank(address) external;
    function assume(bool) external;
}
contract SymbolicReserve {}
contract SymbolicRewardControl is IV3RewardCustody {
    function epoch() external pure returns(uint256){return 1;}
    function threshold() external pure returns(uint256){return 3;}
    function memberCount() external pure returns(uint256){return 5;}
    function rewardSignerAllowed(address) external pure returns(bool){return true;}
    function revoke(V3GovernedGameRewardFixture vault) external {vault.revoke(1,1);}
    function schedule(V3GovernedGameRewardFixture vault,address signer) external {
        vault.schedule(1,2,signer,block.timestamp,block.timestamp+1 hours);
    }
}

contract ClimbSymbolicTokenTest {
    VmSymbolic constant vm=VmSymbolic(address(uint160(uint256(keccak256("hevm cheat code")))));
    V3SuccessorTestToken token;
    address[7] reserves;
    function setUp() public {
        vm.chainId(84532);
        token=new V3SuccessorTestToken();
        for(uint256 i=0;i<7;i++)reserves[i]=address(new SymbolicReserve());
    }
    function check_unauthorizedIssue(address caller) public {
        vm.assume(caller!=address(this));
        vm.prank(caller);
        (bool ok,)=address(token).call(abi.encodeCall(token.issue,(reserves)));
        assert(!ok);
        assert(token.totalSupply()==0);
        assert(!token.issued());
    }
    function check_exactAllocation() public {
        (bool ok,)=address(token).call(abi.encodeCall(token.issue,(reserves)));
        assert(ok);
        assert(token.issued());
        assert(token.totalSupply()==888888888000000);
        uint256[7] memory expected=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++)assert(token.balanceOf(reserves[i])==expected[i]);
        assert(token.balanceOf(address(this))==0);
    }
    function check_burnCannotReopenIssuance(uint256 amount) public {
        (bool ok,)=address(token).call(abi.encodeCall(token.issue,(reserves)));
        assert(ok);
        vm.assume(amount<=17777777760000);
        vm.prank(reserves[0]);
        (ok,)=address(token).call(abi.encodeCall(token.burn,(amount)));
        assert(ok);
        assert(token.totalSupply()==888888888000000-amount);
        (ok,)=address(token).call(abi.encodeCall(token.issue,(reserves)));
        assert(!ok);
        assert(token.issued());
        assert(token.totalSupply()==888888888000000-amount);
    }
    function check_duplicateReserveRejected(uint8 index) public {
        vm.assume(index>0 && index<7);
        address[7] memory bad=reserves;
        // Halmos cannot resolve symbolic memory offsets; explicitly split all
        // six original valid index cases without excluding any input.
        if(index==1)bad[1]=bad[0];
        else if(index==2)bad[2]=bad[0];
        else if(index==3)bad[3]=bad[0];
        else if(index==4)bad[4]=bad[0];
        else if(index==5)bad[5]=bad[0];
        else {assert(index==6);bad[6]=bad[0];}
        (bool ok,)=address(token).call(abi.encodeCall(token.issue,(bad)));
        assert(!ok);
        assert(token.totalSupply()==0);
        assert(!token.issued());
    }
}

contract ClimbSymbolicRewardTest {
    VmSymbolic constant vm=VmSymbolic(address(uint160(uint256(keccak256("hevm cheat code")))));
    V3GovernedGameRewardFixture vault;
    SymbolicRewardControl control;
    address constant ORIGINAL=address(0x123456);
    function setUp() public {
        vm.chainId(84532);
        vm.warp(100 days);
        V3SuccessorTestToken token=new V3SuccessorTestToken();
        control=new SymbolicRewardControl();
        vault=new V3GovernedGameRewardFixture(token,ORIGINAL,address(0x234567),block.timestamp+1 days,1000,control);
    }
    function check_unauthorizedRevoke(address caller) public {
        vm.assume(caller!=address(control));
        vm.prank(caller);
        (bool ok,)=address(vault).call(abi.encodeCall(vault.revoke,(1,1)));
        assert(!ok);
        assert(vault.distributor()==ORIGINAL);
        assert(vault.generation()==1);
    }
    function check_retiredSignerCannotSchedule(uint32 offset) public {
        // Test authorized adapter call after revocation, for arbitrary bounded future time.
        (bool ok,)=address(control).call(abi.encodeCall(control.revoke,(vault)));
        assert(ok);
        vm.assume(offset<=365 days);
        vm.warp(100 days+uint256(offset));
        (ok,)=address(control).call(abi.encodeCall(control.schedule,(vault,ORIGINAL)));
        assert(!ok);
        assert(vault.distributor()==address(0));
        assert(vault.generation()==2);
        assert(vault.rotationSerial()==0);
        assert(vault.formerOrCurrentSigner(ORIGINAL));
    }
    function check_monthlyCapBound(uint256 month) public view {
        uint256 cap=vault.monthlyCap(month);
        if(month>=60)assert(cap==0);
        else assert(cap<=7777777770000);
    }
}

// Mandatory intentionally failing control: tool must find a concrete counterexample.
contract ClimbSymbolicNegativeControl {
    function check_detectCounterexample(uint256 x) public pure {assert(x!=42);}
}
