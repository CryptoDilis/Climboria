// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {SafeQuorumReserveGuardFixture,V3QuorumSuccessorFixture} from "../src/SafeQuorumIssuanceFixture.sol";
import {V3SuccessorConditionalDeployer} from "v3-src/V3AtomicSuccessorFixture.sol";

interface VmPolicySymbolic {function chainId(uint256) external;}

// Expose actual inherited selector policy. Only this isolated harness may model
// the bound/issuing flags. This does not model actual binding or issuance.
contract QuorumPolicyProbe is SafeQuorumReserveGuardFixture {
    constructor(Safe wallet_,address singleton_,V3QuorumSuccessorFixture successor_)
        SafeQuorumReserveGuardFixture(wallet_,singleton_,successor_){}
    function inspect(bytes4 selector,uint256 len,bool isBound,bool isIssuing) external returns(bool){
        bound=isBound;issuing=isIssuing;
        return _policyCallAllowed(selector,len);
    }
}

contract ClimbSymbolicQuorumPolicyTest {
    VmPolicySymbolic constant vm=VmPolicySymbolic(address(uint160(uint256(keccak256("hevm cheat code")))));
    QuorumPolicyProbe probe;
    function setUp() public {
        vm.chainId(84532);
        Safe implementation=new Safe();
        Safe wallet=Safe(payable(address(new SafeProxy(address(implementation)))));
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        V3QuorumSuccessorFixture successor=new V3QuorumSuccessorFixture(address(this),helper,address(helper).codehash);
        probe=new QuorumPolicyProbe(wallet,address(implementation),successor);
    }
    function check_unboundPolicyExact(bytes4 selector,uint256 len) public {
        bool expected=(selector==SafeQuorumReserveGuardFixture.issueSuccessor.selector && len==388)
            ||(selector==SafeQuorumReserveGuardFixture.invalidateIssuance.selector && len==36);
        bool actual=probe.inspect(selector,len,false,false);
        assert(actual==expected);
    }
    function check_boundPolicyExact(bytes4 selector,uint256 len) public {
        // Independent selector-first specification; exact calldata lengths.
        bool expected;
        if(selector==bytes4(keccak256("cancelLiquidity(uint256,bytes32)")))expected=len==68;
        else if(selector==bytes4(keccak256("cancelLegacy(uint256,uint256)")))expected=len==68;
        else if(selector==bytes4(keccak256("revokeRewardSigner(uint256,uint256)")))expected=len==68;
        else if(selector==bytes4(keccak256("cancelExpense(uint256,uint256,bytes32)")))expected=len==100;
        else if(selector==bytes4(keccak256("cancelRewardSigner(uint256,uint256,uint256)")))expected=len==100;
        else if(selector==bytes4(keccak256("scheduleLegacy(uint256,bytes32,uint256,uint256,uint256)")))expected=len==164;
        else if(selector==bytes4(keccak256("scheduleRewardSigner(uint256,uint256,address,uint256,uint256)")))expected=len==164;
        else if(selector==bytes4(keccak256("activateRewardSigner(uint256,uint256,uint256,address)")))expected=len==132;
        else if(selector==bytes4(keccak256("scheduleLiquidity(uint256,uint256,uint256,uint256,uint256,bytes32,uint256,uint256)")))expected=len==260;
        else if(selector==bytes4(keccak256("proposeExpense(uint256,uint256,address,uint256,bytes32,uint256,bytes32,uint256,uint256)")))expected=len==292;
        bool actual=probe.inspect(selector,len,true,false);
        assert(actual==expected);
    }
    function check_issuingPolicyRejectsAll(bytes4 selector,uint256 len,bool isBound) public {
        assert(!probe.inspect(selector,len,isBound,true));
    }
}
contract ClimbSymbolicNegativeControl {
    function check_detectCounterexample(uint256 x) public pure {assert(x!=42);}
}
