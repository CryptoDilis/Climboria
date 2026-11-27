// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
import {IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeQuorumReserveFactoryFixture,SafeQuorumReserveGuardFixture,V3QuorumSuccessorFixture} from "../src/SafeQuorumIssuanceFixture.sol";
import {V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {ReserveQuote,ReservePool,ReservePoolBuilder,ReserveLPDestination} from "./SafeReserveGuard.t.sol";
interface VmQuorumIssue {
    function chainId(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}
/// @notice Malicious synthetic builder attempts a second validly signed Safe transaction
/// during issuance. It catches the rejection and returns a test-only pool.
contract NestedSafePoolBuilder is IV3SyntheticPoolBuilder {
    Safe public immutable wallet;
    address public immutable guard;
    bytes private payload;
    bytes private signatures;
    bool public attempted;
    bool public rejected;
    bytes4 public rejection;
    constructor(Safe account,address target){wallet=account;guard=target;}
    function arm(bytes calldata data,bytes calldata sigs) external {payload=data;signatures=sigs;}
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){
        attempted=true;
        try wallet.execTransaction(guard,0,payload,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),signatures) returns(bool){
            revert("nested Safe transaction unexpectedly accepted");
        } catch(bytes memory reason){
            rejected=true;
            if(reason.length>=4)rejection=bytes4(reason);
        }
        return IV3SyntheticPool(address(new ReservePool(a,q)));
    }
}
contract SafeQuorumIssuanceTest {
    VmQuorumIssue constant vm=VmQuorumIssue(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256[3] private keys;
    address[] private owners;
    address constant FOUNDER=address(0x201);
    address constant DISTRIBUTOR=address(0x202);
    address constant PAYEE=address(0x203);
    uint256 constant SUPPLY=888888888000000;
    Safe wallet;
    SafeQuorumReserveFactoryFixture setup;
    V3QuorumSuccessorFixture successor;
    SafeQuorumReserveGuardFixture guard;
    V3SuccessorConfig cfg;
    function setUp() public {
        vm.chainId(84532);
        setup=new SafeQuorumReserveFactoryFixture();
        successor=new V3QuorumSuccessorFixture(address(setup));
        keys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++){
            if(vm.addr(keys[j])<vm.addr(keys[i]))(keys[i],keys[j])=(keys[j],keys[i]);
        }
        for(uint256 i=0;i<3;i++)owners.push(vm.addr(keys[i]));
        owners.push(address(0x104));owners.push(address(0x105));
        (wallet,guard)=setup.create(owners,successor);
        cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),block.timestamp+1 days,1000,
            V3SuccessorLiquidityConfig(new ReserveQuote(),new ReservePoolBuilder(),address(new ReserveLPDestination()),1000));
    }
    function _sign(bytes memory data,uint256 n) private returns(bytes memory sigs){
        return _signAt(data,n,wallet.nonce());
    }
    function _signAt(bytes memory data,uint256 n,uint256 nonce) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(address(guard),0,data,Enum.Operation.Call,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<n;i++){
            (uint8 v,bytes32 r,bytes32 s)=vm.sign(keys[i],h);sigs=abi.encodePacked(sigs,r,s,v);
        }
    }
    function _exec(bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(address(guard),0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _data() private view returns(bytes memory){return abi.encodeCall(guard.issueSuccessor,(1,cfg));}
    function _issue() private {bytes memory data=_data();require(_exec(data,_sign(data,3)));}
    function _empty() private view {
        require(!successor.used()&&!guard.bound()&&!guard.issuing()&&!guard.transactionActive()&&address(successor.token())==address(0)&&wallet.nonce()==0);
        require(address(guard.asset())==address(0)&&guard.founder()==address(0)&&guard.distributor()==address(0));
        for(uint256 i=0;i<7;i++)require(successor.vaults(i)==address(0)&&guard.destinations(i)==address(0));
    }
    function testNoCreatorOrUnregisteredCallerIssuance() public {
        require(successor.configuredGuard()==address(guard));
        vm.expectRevert();successor.create(cfg);
        vm.expectRevert();successor.configureGuard(address(guard));
        vm.expectRevert();guard.bindBeforeIssuance();
        vm.expectRevert();guard.issueSuccessor(1,cfg);
        _empty();
    }
    function testSetupFactoryCannotBeFrontRunOrReused() public {
        V3QuorumSuccessorFixture fresh=new V3QuorumSuccessorFixture(address(setup));
        vm.prank(PAYEE);vm.expectRevert();setup.create(owners,fresh);
        require(fresh.configuredGuard()==address(0));
        vm.expectRevert();setup.create(owners,successor);
        _empty();
    }
    function testQuorumAtomicBindingExactAllocationAndNoFloat() public {
        _empty();_issue();
        V3SuccessorTestToken t=successor.token();
        require(guard.bound()&&!guard.issuing()&&t.issued()&&t.totalSupply()==SUPPLY&&wallet.nonce()==1);
        uint256[7] memory amounts=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++)require(guard.destinations(i)==successor.vaults(i)&&t.balanceOf(guard.destinations(i))==amounts[i]);
        require(t.balanceOf(address(this))==0&&t.balanceOf(address(guard))==0&&t.balanceOf(address(wallet))==0);
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);
        require(t.totalSupply()==SUPPLY);
    }
    function testTwoSignaturesAndMutatedConfigurationCannotIssue() public {
        bytes memory data=_data();bytes memory sigs=_sign(data,2);
        vm.expectRevert();_exec(data,sigs);_empty();
        sigs=_sign(data,3);cfg.gamingWalletMonthlyCap=1001;
        bytes memory altered=_data();vm.expectRevert();_exec(altered,sigs);_empty();
        cfg.gamingWalletMonthlyCap=1000;require(_exec(data,sigs));
        require(guard.bound());
    }
    function testPolicyFailureRollsBackEntireIssueAndSafeNonce() public {
        cfg.liquidity.trancheCap=0;
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.liquidity.trancheCap=1000;_issue();require(guard.bound());
    }
    function testForbiddenRoleConfigurationRollsBack() public {
        cfg.founder=owners[0];
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.founder=FOUNDER;cfg.liquidity.custody=address(wallet);
        data=_data();sigs=_sign(data,3);vm.expectRevert();_exec(data,sigs);_empty();
    }
    function testLateBindingFailureRollsBackAllGuardAndVaultState() public {
        address previous=cfg.liquidity.custody;
        cfg.liquidity.custody=address(successor);
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.liquidity.custody=previous;_issue();require(guard.bound()&&!guard.transactionActive());
    }
    function testNestedValidlySignedSafeTransactionRejectedDuringIssuance() public {
        NestedSafePoolBuilder builder=new NestedSafePoolBuilder(wallet,address(guard));
        cfg.liquidity.builder=builder;
        bytes memory nested=abi.encodeCall(guard.cancelRotation,(1));
        builder.arm(nested,_signAt(nested,3,wallet.nonce()+1));
        _issue();
        require(builder.attempted()&&builder.rejected()&&builder.rejection()==bytes4(keccak256("Forbidden()")));
        require(wallet.nonce()==1&&guard.bound()&&!guard.transactionActive()&&successor.token().totalSupply()==SUPPLY);
    }
    function testBoundPoliciesOperateAfterAtomicIssue() public {
        _issue();
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N"));
        require(_exec(data,_sign(data,3)));
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=keccak256(abi.encode(block.chainid,address(v),address(successor.token()),v.purpose(),uint256(1),PAYEE,uint256(10),bytes32("E"),uint256(0),bytes32("N")));
        vm.warp(cfg.start+2 days);v.execute(id);
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
    }
}
