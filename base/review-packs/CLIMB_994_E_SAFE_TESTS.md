# CLIMB V3 #994 re-review — E: actual Safe regression source
Exact tested checkout 7f729c032ad8ca81a831ce075f13095e7f71008c. Four complete Safe test files; GitHub-reported blob IDs, not independently rehashed. CI run 46015224825 job 140560524220 passed 59 tests (6+15+11+27), including expense recipient role drift. Tests are local and not independent review. Test execution claims by reviewers must distinguish observed CI evidence from newly executed tests. TESTNET_NO_GO / MAINNET_NO_GO.

## base/safe-custody/test/SafeQuorumIssuance.t.sol
Git blob: 75cf676108285441de67df85779629b3490b7c16

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V3LegacyProofClaimFixture} from "v3-src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "v3-src/V3LegacyProofVerifierFixture.sol";
import {Safe} from "safe-contracts/Safe.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
import {IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeQuorumReserveFactoryFixture,SafeQuorumReserveGuardFixture,V3QuorumSuccessorFixture,SafeQuorumGuardDeployerFixture} from "../src/SafeQuorumIssuanceFixture.sol";
import {V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken,V3SuccessorConditionalDeployer} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3SharedExpenseRegistry} from "v3-src/V3SharedExpenseFixture.sol";
import {V3GovernedGameRewardFixture} from "v3-src/V3GovernedGameRewardFixture.sol";
import {ReserveQuote,ReservePool,ReservePoolBuilder,ReserveLPDestination} from "./SafeReserveGuard.t.sol";
interface VmQuorumIssue {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
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
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3QuorumSuccessorFixture(address(setup),helper,address(helper).codehash);
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
    function _data() private view returns(bytes memory){return abi.encodeCall(guard.issueSuccessor,(1,block.timestamp,block.timestamp+1 hours,cfg));}
    function _issue() private {bytes memory data=_data();require(_exec(data,_sign(data,3)));}
    function _empty() private view {
        require(!successor.used()&&!guard.bound()&&!guard.issuing()&&!guard.transactionActive()&&address(successor.token())==address(0)&&wallet.nonce()==0);
        require(address(guard.asset())==address(0)&&guard.founder()==address(0)&&guard.distributor()==address(0));
        for(uint256 i=0;i<7;i++)require(successor.vaults(i)==address(0)&&guard.destinations(i)==address(0));
    }
    function testRestrictedGuardDeployerAndMutationRollback() public {
        SafeQuorumGuardDeployerFixture helper=setup.guardDeployer();
        require(helper.factory()==address(setup)&&address(helper).codehash==setup.guardDeployerHash());
        address implementation=address(setup.singleton());
        vm.expectRevert(SafeQuorumGuardDeployerFixture.Unauthorized.selector);
        helper.deploy(wallet,implementation,successor);
        V3QuorumSuccessorFixture fresh=new V3QuorumSuccessorFixture(address(setup),successor.conditional(),successor.conditionalHash());
        bytes memory original=address(helper).code;
        vm.etch(address(helper),hex"60006000f3");
        vm.expectRevert();setup.create(owners,fresh);
        require(fresh.configuredGuard()==address(0)&&!fresh.used());
        vm.etch(address(helper),original);
        (Safe nextWallet,SafeQuorumReserveGuardFixture nextGuard)=setup.create(owners,fresh);
        require(address(nextWallet)!=address(wallet)&&fresh.configuredGuard()==address(nextGuard));
        nextGuard.validateConfig();
        _empty();_issue();
    }
    function testChangedConditionalHelperRejectsQuorumIssuance() public {
        address helper=address(successor.conditional());
        bytes memory original=helper.code;
        require(helper.codehash==successor.conditionalHash());
        vm.etch(helper,hex"60006000f3");
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        vm.etch(helper,original);_issue();
        require(successor.token().totalSupply()==SUPPLY);
    }
    function testNoCreatorOrUnregisteredCallerIssuance() public {
        require(successor.configuredGuard()==address(guard));
        vm.expectRevert();successor.create(cfg);
        vm.expectRevert();successor.configureGuard(address(guard));
        vm.expectRevert();guard.bindBeforeIssuance();
        vm.expectRevert();guard.issueSuccessor(1,block.timestamp,block.timestamp+1 hours,cfg);
        _empty();
    }
    function testSetupFactoryCannotBeFrontRunOrReused() public {
        V3QuorumSuccessorFixture fresh=new V3QuorumSuccessorFixture(address(setup),successor.conditional(),successor.conditionalHash());
        vm.prank(PAYEE);vm.expectRevert();setup.create(owners,fresh);
        require(fresh.configuredGuard()==address(0));
        vm.expectRevert();setup.create(owners,successor);
        _empty();
    }
    function testQuorumAtomicBindingExactAllocationAndNoFloat() public {
        _empty();_issue();
        V3SuccessorTestToken t=successor.token();
        require(guard.bound()&&!guard.issuing()&&t.issued()&&t.totalSupply()==SUPPLY&&wallet.nonce()==1&&guard.lpCustody()==cfg.liquidity.custody);
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
    function testGamingCapEnforcedOnChainBeforeIssuance() public {
        uint256 cap=guard.MAX_TEST_GAMING_WALLET_MONTHLY_CAP();
        require(cap==5_185_185_180_000);
        cfg.gamingWalletMonthlyCap=cap+1;
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.gamingWalletMonthlyCap=0;
        data=_data();sigs=_sign(data,3);
        vm.expectRevert();_exec(data,sigs);_empty();
        cfg.gamingWalletMonthlyCap=cap;_issue();
        require(V3GovernedGameRewardFixture(successor.vaults(1)).walletMonthlyCap()==cap&&successor.token().totalSupply()==SUPPLY);
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
        bytes memory nested=abi.encodeCall(guard.cancelRotation,(1,0));
        builder.arm(nested,_signAt(nested,3,wallet.nonce()+1));
        _issue();
        require(builder.attempted()&&builder.rejected()&&builder.rejection()==bytes4(keccak256("TransactionInProgress()")));
        require(wallet.nonce()==1&&guard.bound()&&!guard.transactionActive()&&successor.token().totalSupply()==SUPPLY);
    }
    function testIssuanceRejectsPrematureAndOverlongSignedWindows() public {
        uint256 t=block.timestamp;
        bytes memory early=abi.encodeCall(guard.issueSuccessor,(1,t+1 hours,t+2 hours,cfg));
        bytes memory sigs=_sign(early,3);
        vm.expectRevert();_exec(early,sigs);_empty();
        bytes memory wide=abi.encodeCall(guard.issueSuccessor,(1,t,t+2 days,cfg));
        sigs=_sign(wide,3);
        vm.expectRevert();_exec(wide,sigs);_empty();
        _issue();require(guard.bound());
    }
    function testExpiredIssuanceCannotExecute() public {
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        vm.warp(block.timestamp+1 hours);
        // Safe wraps target execution failure as GS013 (zero safeTxGas/gasPrice).
        vm.expectRevert();_exec(data,sigs);_empty();
        _issue();require(guard.bound());
    }
    function testQuorumCanInvalidateSignedIssuanceWithoutMinting() public {
        bytes memory data=_data();bytes memory sigs=_sign(data,3);
        bytes memory invalidation=abi.encodeCall(guard.invalidateIssuance,(1));
        vm.expectRevert();guard.invalidateIssuance(1);
        require(_exec(invalidation,_sign(invalidation,3)));
        require(wallet.nonce()==1&&!successor.used()&&!guard.bound()&&!guard.transactionActive()&&address(successor.token())==address(0));
        vm.expectRevert();_exec(data,sigs);
        require(wallet.nonce()==1&&!successor.used()&&!guard.bound());
        _issue();require(wallet.nonce()==2&&guard.bound());
        bytes memory postBindSigs=_sign(invalidation,3);
        vm.expectRevert();_exec(invalidation,postBindSigs);
        require(wallet.nonce()==2);
    }
    function testBoundQuorumCanInvalidateUnexecutedExpenseAuthorization() public {
        _issue();
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours));
        bytes memory stale=_sign(data,3);
        bytes memory invalidation=abi.encodeCall(guard.invalidateAuthorization,(1,1));
        vm.expectRevert();guard.invalidateAuthorization(1,1);
        bytes memory wrong=abi.encodeCall(guard.invalidateAuthorization,(1,2));
        bytes memory wrongSigs=_sign(wrong,3);
        vm.expectRevert();_exec(wrong,wrongSigs);
        require(wallet.nonce()==1);
        require(_exec(invalidation,_sign(invalidation,3)));
        require(wallet.nonce()==2&&guard.bound()&&!guard.transactionActive());
        vm.expectRevert();_exec(data,stale);
        require(wallet.nonce()==2&&successor.token().totalSupply()==SUPPLY);
        require(_exec(data,_sign(data,3)));
        require(wallet.nonce()==3);
    }
    function _expenseId(uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(successor.token()),v.purpose(),uint256(1),PAYEE,uint256(10),evidence,uint256(0),nonce));
    }
    function _proposeExpense(uint256 i,bytes32 evidence,bytes32 nonce) private {
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,i,PAYEE,10,evidence,0,nonce,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
    }
    function testAtomicQuorumExpenseRaceAcrossAllThreeReserves() public {
        _issue();
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        require(registry.isSealed());
        for(uint256 i=3;i<=5;i++){
            require(registry.consumer(successor.vaults(i)));
            _proposeExpense(i,"INVOICE",bytes32(i));
        }
        V3EpochSpendFixture winner=V3EpochSpendFixture(successor.vaults(4));
        bytes32 win=_expenseId(4,"INVOICE",bytes32(uint256(4)));
        vm.warp(cfg.start+2 days);
        winner.execute(win);
        require(registry.consumedBy("INVOICE")==address(winner)&&registry.consumedProposal("INVOICE")==win);
        for(uint256 i=3;i<=5;i++){
            V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
            if(i==4){require(v.totalSpent()==10&&v.spent(0)==10);continue;}
            bytes32 id=_expenseId(i,"INVOICE",bytes32(i));
            uint256 beforeBalance=successor.token().balanceOf(address(v));
            vm.expectRevert(V3SharedExpenseRegistry.ExpenseAlreadyConsumed.selector);v.execute(id);
            require(v.totalSpent()==0&&v.spent(0)==0&&successor.token().balanceOf(address(v))==beforeBalance);
            (,,,,,,bool executed,)=v.proposals(id);require(!executed);
        }
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
        // A consumed evidence commitment cannot be proposed again with a fresh nonce.
        bytes memory duplicate=abi.encodeCall(guard.proposeExpense,(1,5,PAYEE,10,"INVOICE",0,"FRESH",block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_sign(duplicate,3);uint256 n=wallet.nonce();
        vm.expectRevert();_exec(duplicate,sigs);require(wallet.nonce()==n&&!guard.transactionActive());
    }
    function testCancelledExpenseDoesNotConsumeEvidence() public {
        _issue();_proposeExpense(3,"CANCELLED","OLD");
        bytes32 old=_expenseId(3,"CANCELLED","OLD");
        bytes memory cancellation=abi.encodeCall(guard.cancelExpense,(1,3,old));
        require(_exec(cancellation,_sign(cancellation,3)));
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        require(registry.consumedBy("CANCELLED")==address(0));
        _proposeExpense(5,"CANCELLED","NEW");
        vm.warp(cfg.start+2 days);
        V3EpochSpendFixture previous=V3EpochSpendFixture(successor.vaults(3));
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);previous.execute(old);
        V3EpochSpendFixture replacement=V3EpochSpendFixture(successor.vaults(5));
        replacement.execute(_expenseId(5,"CANCELLED","NEW"));
        require(registry.consumedBy("CANCELLED")==address(replacement)&&previous.totalSpent()==0&&replacement.totalSpent()==10);
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
    }
    function testQuorumRewardRevocationAndActivation() public {
        _issue();
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        require(address(gaming.custody())==address(guard)&&gaming.generation()==1);
        vm.expectRevert();guard.revokeRewardSigner(1,1);
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        bytes memory two=_sign(data,2);
        vm.expectRevert();_exec(data,two);
        require(wallet.nonce()==1&&gaming.generation()==1);
        require(_exec(data,_sign(data,3)));
        require(gaming.distributor()==address(0)&&gaming.generation()==2);
        address candidate=address(0x9876);
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        data=abi.encodeCall(guard.activateRewardSigner,(1,2,1,candidate));
        bytes memory early=_sign(data,3);
        vm.expectRevert();_exec(data,early);
        require(gaming.generation()==2);
        vm.warp(block.timestamp+2 days);
        require(_exec(data,_sign(data,3)));
        require(gaming.distributor()==candidate&&gaming.generation()==3&&successor.token().totalSupply()==SUPPLY);
    }
    function testPendingRewardAndOwnerRolesCannotOverlap() public {
        _issue();
        address candidate=PAYEE;
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        bytes memory ownerChange=abi.encodeCall(guard.scheduleRotation,(1,owners[3],owners[4],candidate,block.timestamp,block.timestamp+1 hours));
        bytes memory rejected=_sign(ownerChange,3);
        uint256 nonce=wallet.nonce();
        vm.expectRevert();_exec(ownerChange,rejected);
        require(wallet.nonce()==nonce&&!guard.transactionActive());
        data=abi.encodeCall(guard.cancelRewardSigner,(1,2,1));
        require(_exec(data,_sign(data,3)));
        require(_exec(ownerChange,_sign(ownerChange,3)));
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        rejected=_sign(data,3);nonce=wallet.nonce();
        vm.expectRevert();_exec(data,rejected);
        require(wallet.nonce()==nonce&&!guard.transactionActive());
    }
    function testExpenseExecutionRechecksPendingActiveAndFormerRewardSigner() public {
        _issue();
        _proposeExpense(3,"ROLE_DRIFT","OLD");
        bytes32 id=_expenseId(3,"ROLE_DRIFT","OLD");
        V3EpochSpendFixture expense=V3EpochSpendFixture(successor.vaults(3));
        V3SharedExpenseRegistry registry=successor.expenses().registry();
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,PAYEE,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(cfg.start+2 days);
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);expense.execute(id);
        data=abi.encodeCall(guard.activateRewardSigner,(1,2,1,PAYEE));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);expense.execute(id);
        data=abi.encodeCall(guard.revokeRewardSigner,(1,3));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3EpochSpendFixture.NotReady.selector);expense.execute(id);
        require(expense.totalSpent()==0&&registry.consumedBy("ROLE_DRIFT")==address(0));
        require(successor.token().balanceOf(PAYEE)==0&&successor.token().totalSupply()==SUPPLY);
        (,,,,,,bool executed,)=expense.proposals(id);require(!executed);
    }
    function testRewardSelectorRejectsTrailingOrMissingWords() public {
        _issue();
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        bytes memory correct=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        bytes memory trailing=abi.encodePacked(correct,bytes32(uint256(0)));
        bytes memory sigs=_sign(trailing,3);
        uint256 n=wallet.nonce();
        vm.expectRevert();_exec(trailing,sigs);
        bytes memory shortCall=abi.encodeWithSelector(guard.revokeRewardSigner.selector,uint256(1));
        sigs=_sign(shortCall,3);
        vm.expectRevert();_exec(shortCall,sigs);
        require(wallet.nonce()==n&&gaming.generation()==1&&!guard.transactionActive());
        require(_exec(correct,_sign(correct,3)));
        require(gaming.generation()==2);
    }
    function testInitialRewardBindingPredicate() public {
        _issue();
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        address t=address(successor.token());
        require(gaming.matchesInitialBinding(t,address(guard),cfg.founder));
        require(!gaming.matchesInitialBinding(PAYEE,address(guard),cfg.founder));
        require(!gaming.matchesInitialBinding(t,PAYEE,cfg.founder));
        require(!gaming.matchesInitialBinding(t,address(guard),PAYEE));
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        require(!gaming.matchesInitialBinding(t,address(guard),cfg.founder));
    }
    function _signSyntheticReward(V3GovernedGameRewardFixture gaming,V3GovernedGameRewardFixture.Reward memory reward,uint256 testKey) private returns(bytes memory){
        (uint8 v,bytes32 r,bytes32 s)=vm.sign(testKey,gaming.digest(reward));
        return abi.encodePacked(r,s,v);
    }
    function testRewardAccountingSurvivesActualQuorumRotation() public {
        // Disposable deterministic keys, offline fixture only.
        uint256 first=12345;uint256 replacement=23456;
        cfg.distributor=vm.addr(first);
        address candidate=vm.addr(replacement);
        _issue();vm.warp(cfg.start);
        V3GovernedGameRewardFixture gaming=V3GovernedGameRewardFixture(successor.vaults(1));
        V3GovernedGameRewardFixture.Reward memory reward=V3GovernedGameRewardFixture.Reward("PAID",PAYEE,900,0,cfg.start+30 days,1);
        gaming.claim(reward,_signSyntheticReward(gaming,reward,first));
        reward.eventId="NEW";reward.amount=100;
        bytes memory old=_signSyntheticReward(gaming,reward,first);
        bytes memory data=abi.encodeCall(guard.revokeRewardSigner,(1,1));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);gaming.claim(reward,old);
        data=abi.encodeCall(guard.scheduleRewardSigner,(1,2,candidate,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(block.timestamp+2 days);
        data=abi.encodeCall(guard.activateRewardSigner,(1,2,1,candidate));
        require(_exec(data,_sign(data,3)));
        vm.expectRevert(V3GovernedGameRewardFixture.InvalidSigner.selector);gaming.claim(reward,old);
        reward.generation=3;reward.eventId="PAID";
        bytes memory sig=_signSyntheticReward(gaming,reward,replacement);
        vm.expectRevert(V3GovernedGameRewardFixture.AlreadyPaid.selector);gaming.claim(reward,sig);
        reward.eventId="NEW";reward.amount=101;
        sig=_signSyntheticReward(gaming,reward,replacement);
        vm.expectRevert(V3GovernedGameRewardFixture.CapExceeded.selector);gaming.claim(reward,sig);
        reward.amount=100;gaming.claim(reward,_signSyntheticReward(gaming,reward,replacement));
        require(gaming.released()==1000&&gaming.monthlyReleased(0)==1000&&gaming.walletReleased(0,PAYEE)==1000);
        require(successor.token().totalSupply()==SUPPLY&&successor.token().balanceOf(PAYEE)==1000);
    }
    function _proofLegacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),PAYEE,100,100,bytes32(uint256(31)));
    }
    function _proofLegacyCommitment(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_proofLegacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function testQuorumLegacyProofClaimAndClosure() public {
        _issue();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        require(legacy.matchesInitialBinding(address(successor.token()),address(guard)));
        LegacyVerifier.Commitment memory c=_proofLegacyCommitment(legacy);
        bytes32 digest=legacy.activationDigest(c);
        bytes memory data=abi.encodeCall(guard.scheduleLegacy,(1,digest,block.timestamp+7 days,block.timestamp,block.timestamp+1 hours));
        vm.expectRevert();guard.scheduleLegacy(1,digest,block.timestamp+7 days,block.timestamp,block.timestamp+1 hours);
        bytes memory two=_sign(data,2);
        vm.expectRevert();_exec(data,two);
        require(wallet.nonce()==1&&guard.legacyScheduleSerial()==0);
        require(_exec(data,_sign(data,3)));
        vm.expectRevert();legacy.activate(c);
        vm.warp(block.timestamp+2 days);legacy.activate(c);
        LegacyVerifier.Row memory row=_proofLegacyRow();
        LegacyVerifier.Node[] memory proof=new LegacyVerifier.Node[](0);
        vm.prank(PAYEE);legacy.claim(0,row,proof);
        require(legacy.paid()==100&&successor.token().balanceOf(PAYEE)==100);
        vm.prank(PAYEE);vm.expectRevert();legacy.claim(0,row,proof);
        vm.warp(legacy.appealEnd());
        digest=legacy.closureDigest("REVIEW");
        data=abi.encodeCall(guard.scheduleLegacy,(1,digest,block.timestamp+7 days,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(block.timestamp+2 days);legacy.finalize("REVIEW");
        require(legacy.closed()&&legacy.paid()+legacy.burned()==legacy.RESERVE());
        require(successor.token().totalSupply()==SUPPLY-legacy.burned());
    }
    function _multiLegacyLeaf(uint256 index,LegacyVerifier.Row memory r) private pure returns(bytes32){
        return sha256(abi.encodePacked(sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2"),bytes1(0x01),
            bytes32(uint256(1)),index,r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
    }
    function _multiLegacyRoot(V3LegacyProofClaimFixture legacy,bytes32 left,bytes32 right) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        bytes32 top=sha256(abi.encodePacked(domain,bytes1(0x03),left,uint256(100),right,uint256(200)));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),2,300,300,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),
            address(legacy.token()),address(legacy),uint256(2),uint256(300),top,uint256(300))));
    }
    function _activateMultiLegacy(V3LegacyProofClaimFixture legacy,LegacyVerifier.Commitment memory c) private {
        bytes memory data=abi.encodeCall(guard.scheduleLegacy,(1,legacy.activationDigest(c),block.timestamp+7 days,block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        vm.warp(block.timestamp+2 days);legacy.activate(c);
    }
    function testQuorumMultiLeafLegacyProofConservation() public {
        _issue();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        LegacyVerifier.Row memory a=_proofLegacyRow();
        address other=address(0x204);
        LegacyVerifier.Row memory b=LegacyVerifier.Row(bytes32(uint256(12)),bytes32(uint256(22)),other,200,200,bytes32(uint256(32)));
        bytes32 left=_multiLegacyLeaf(0,a);bytes32 right=_multiLegacyLeaf(1,b);
        _activateMultiLegacy(legacy,_multiLegacyRoot(legacy,left,right));
        LegacyVerifier.Node[] memory p=new LegacyVerifier.Node[](1);
        p[0]=LegacyVerifier.Node(left,100);
        vm.prank(other);legacy.claim(1,b,p);
        p[0]=LegacyVerifier.Node(right,201);
        vm.prank(PAYEE);vm.expectRevert(V3LegacyProofClaimFixture.NotEligible.selector);legacy.claim(0,a,p);
        require(!legacy.claimedIndex(0)&&!legacy.claimedSource(a.sourceAccount)&&legacy.paid()==200);
        p[0]=LegacyVerifier.Node(right,200);
        vm.prank(PAYEE);legacy.claim(0,a,p);
        require(legacy.paid()==300&&legacy.allocated()==300&&successor.token().balanceOf(PAYEE)==100&&successor.token().balanceOf(other)==200);
        require(successor.token().totalSupply()==SUPPLY&&successor.token().balanceOf(address(legacy))==legacy.RESERVE()-300);
    }
    function testQuorumDuplicateSourceInApprovedRootCannotDoublePay() public {
        _issue();
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        LegacyVerifier.Row memory a=_proofLegacyRow();
        address other=address(0x204);
        LegacyVerifier.Row memory b=LegacyVerifier.Row(a.sourceAccount,bytes32(uint256(22)),other,200,200,bytes32(uint256(32)));
        bytes32 left=_multiLegacyLeaf(0,a);bytes32 right=_multiLegacyLeaf(1,b);
        _activateMultiLegacy(legacy,_multiLegacyRoot(legacy,left,right));
        LegacyVerifier.Node[] memory p=new LegacyVerifier.Node[](1);
        p[0]=LegacyVerifier.Node(right,200);
        vm.prank(PAYEE);legacy.claim(0,a,p);
        p[0]=LegacyVerifier.Node(left,100);
        vm.prank(other);vm.expectRevert(V3LegacyProofClaimFixture.AlreadyClaimed.selector);legacy.claim(1,b,p);
        require(legacy.paid()==100&&!legacy.claimedIndex(1)&&successor.token().balanceOf(other)==0);
        require(successor.token().totalSupply()==SUPPLY);
    }
    function testBoundPoliciesOperateAfterAtomicIssue() public {
        _issue();
        bytes memory data=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours));
        require(_exec(data,_sign(data,3)));
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=keccak256(abi.encode(block.chainid,address(v),address(successor.token()),v.purpose(),uint256(1),PAYEE,uint256(10),bytes32("E"),uint256(0),bytes32("N")));
        vm.warp(cfg.start+2 days);v.execute(id);
        require(successor.token().balanceOf(PAYEE)==10&&successor.token().totalSupply()==SUPPLY);
    }
}

```

## base/safe-custody/test/SafeReserveGuard.t.sol
Git blob: 22114c3ee880ca3a4b4353874b30893123870c00

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeReserveFactoryFixture,SafeReserveGuardFixture} from "../src/SafeReserveGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorConditionalDeployer,V3SuccessorConfig,V3SuccessorLiquidityConfig,V3SuccessorTestToken,IV3SyntheticPoolBuilder} from "v3-src/V3AtomicSuccessorFixture.sol";
import {V3EpochSpendFixture,IV3CustodyEpochFixture} from "v3-src/V3EpochSpendFixture.sol";
import {V3DeferredLiquidityFixture} from "v3-src/V3DeferredLiquidityFixture.sol";
import {V3LegacyProofClaimFixture} from "v3-src/V3LegacyProofClaimFixture.sol";
import {V3LegacyProofVerifierFixture as LegacyVerifier} from "v3-src/V3LegacyProofVerifierFixture.sol";
import {IV3SyntheticPool} from "v3-src/V3LiquidityPolicyFixture.sol";
interface VmReserveGuard {
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}
contract ReserveQuote is ERC20 {
    constructor() ERC20("Synthetic quote","QTEST"){_mint(msg.sender,1000000);}
}
contract ReserveLPDestination {}
contract ReservePool is ERC20 {
    address public immutable asset;
    address public immutable quote;
    constructor(IERC20 a,IERC20 q) ERC20("Synthetic LP","LPTEST"){asset=address(a);quote=address(q);}
    function addLiquidity(uint256 a,uint256 q,uint256 min,address recipient) external returns(uint256){
        require(IERC20(asset).transferFrom(msg.sender,address(this),a));
        require(IERC20(quote).transferFrom(msg.sender,address(this),q));
        require(min<=100);_mint(recipient,100);return 100;
    }
}
contract ReservePoolBuilder is IV3SyntheticPoolBuilder {
    function createPool(IERC20 a,IERC20 q) external returns(IV3SyntheticPool){return IV3SyntheticPool(address(new ReservePool(a,q)));}
}
contract SafeReserveGuardTest {
    VmReserveGuard constant vm=VmReserveGuard(address(uint160(uint256(keccak256("hevm cheat code")))));
    // Deterministic disposable offline test keys; never use as funded wallet keys.
    uint256[3] private testKeys;
    address A;address B;address C;
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    address constant FOUNDER=address(0x201);
    address constant DISTRIBUTOR=address(0x202);
    address constant PAYEE=address(0x203);
    uint256 constant SUPPLY=888888888000000;
    Safe wallet;
    SafeReserveGuardFixture guard;
    V3AtomicSuccessorFixture successor;
    V3SuccessorTestToken token;
    ReserveQuote quote;
    uint256 start;
    function setUp() public {
        vm.chainId(84532);V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        SafeReserveFactoryFixture factory=new SafeReserveFactoryFixture();
        testKeys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++){
            if(vm.addr(testKeys[j])<vm.addr(testKeys[i])){
                (testKeys[i],testKeys[j])=(testKeys[j],testKeys[i]);
            }
        }
        A=vm.addr(testKeys[0]);B=vm.addr(testKeys[1]);C=vm.addr(testKeys[2]);
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners,successor);
        quote=new ReserveQuote();start=block.timestamp+1 days;
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),start,1000,
            V3SuccessorLiquidityConfig(quote,new ReservePoolBuilder(),address(new ReserveLPDestination()),1000));
        token=successor.create(cfg);
    }
    function _signed(address to,bytes memory data,uint256 count) private returns(bytes memory sigs){
        return _signedAt(to,data,count,wallet.nonce());
    }
    function _signedAt(address to,bytes memory data,uint256 count,uint256 nonce) private returns(bytes memory sigs){
        bytes32 h=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<count;i++){
            (uint8 v,bytes32 rr,bytes32 ss)=vm.sign(testKeys[i],h);
            sigs=abi.encodePacked(sigs,rr,ss,v);
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(bytes memory data) private {require(_exec(address(guard),data,_signed(address(guard),data,3)));}
    function _reject(address to,bytes memory data,uint256 count) private {
        bytes memory sigs=_signed(to,data,count);vm.expectRevert();_exec(to,data,sigs);
    }
    function _bind() private {_quorum(abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)));}
    function _propose(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes memory){
        return abi.encodeCall(SafeReserveGuardFixture.proposeExpense,(e,i,PAYEE,10,evidence,0,nonce,block.timestamp,block.timestamp+1 hours));
    }
    function _id(uint256 e,uint256 i,bytes32 evidence,bytes32 nonce) private view returns(bytes32){
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(i));
        return keccak256(abi.encode(block.chainid,address(v),address(token),v.purpose(),e,PAYEE,uint256(10),evidence,uint256(0),nonce));
    }
    function testActualECDSAQuorumPayloadBindingAndNonceReplay() public {
        bytes memory binding=abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_signed(address(guard),binding,3);
        require(_exec(address(guard),binding,sigs)&&wallet.nonce()==1);
        bytes memory data=_propose(1,3,"E","N");
        bytes memory two=_signed(address(guard),data,2);
        vm.expectRevert();_exec(address(guard),data,two);
        require(wallet.nonce()==1);
        sigs=_signed(address(guard),data,3);
        bytes memory altered=_propose(1,4,"E","N");
        vm.expectRevert();_exec(address(guard),altered,sigs);
        require(wallet.nonce()==1);
        require(_exec(address(guard),data,sigs)&&wallet.nonce()==2);
        vm.expectRevert();_exec(address(guard),data,sigs);
        require(wallet.nonce()==2);
        vm.warp(start+2 days);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        v.execute(_id(1,3,"E","N"));
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testFixedBindingAndNoDeployerFloat() public {
        require(!guard.bound()&&token.totalSupply()==SUPPLY&&token.balanceOf(address(wallet))==0&&token.balanceOf(address(guard))==0);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),2);
        _bind();require(guard.bound()&&address(guard.asset())==address(token));
        for(uint256 i=0;i<7;i++)require(guard.destinations(i)==successor.vaults(i));
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),3);
    }
    function testActualQuorumExpenseAndSharedReplay() public {
        _bind();_reject(address(guard),_propose(1,3,"E","N"),2);
        _quorum(_propose(1,3,"E","N"));_quorum(_propose(1,4,"E","M"));
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        bytes32 id=_id(1,3,"E","N");
        vm.expectRevert();v.execute(id);
        vm.warp(start+2 days);v.execute(id);
        V3EpochSpendFixture c=V3EpochSpendFixture(successor.vaults(4));bytes32 other=_id(1,4,"E","M");
        vm.expectRevert();c.execute(other);
        require(token.balanceOf(PAYEE)==10&&token.totalSupply()==SUPPLY);
    }
    function testRotationInvalidatesOutstandingAndOldEpochAuthorization() public {
        _bind();_quorum(_propose(1,3,"E","N"));
        bytes32 old=_id(1,3,"E","N");
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(start+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2);
        V3EpochSpendFixture v=V3EpochSpendFixture(successor.vaults(3));
        vm.expectRevert();v.execute(old);
        _reject(address(guard),_propose(1,3,"E","N"),3);
        _quorum(_propose(2,3,"E","N"));bytes32 fresh=_id(2,3,"E","N");
        vm.warp(block.timestamp+2 days);v.execute(fresh);
        require(token.balanceOf(PAYEE)==10);
    }
    function testNoGenericTransferOrRoleConflict() public {
        _bind();
        _reject(address(token),abi.encodeCall(token.transfer,(PAYEE,1)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,0,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.proposeExpense,(1,3,address(wallet),10,"E",0,"N",block.timestamp,block.timestamp+1 hours)),3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,FOUNDER,block.timestamp,block.timestamp+1 hours)),3);
        vm.expectRevert();guard.proposeExpense(1,3,PAYEE,10,"E",0,"N",block.timestamp,block.timestamp+1 hours);
    }
    function testRoleSeparationPersistsWhenDestinationCodeDisappears() public {
        _bind();
        address lp=V3DeferredLiquidityFixture(successor.vaults(2)).lpCustody();
        require(guard.lpCustody()==lp);
        vm.etch(lp,"");
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,lp,block.timestamp,block.timestamp+1 hours)),3);
        address v=successor.vaults(0);vm.etch(v,"");
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,v,block.timestamp,block.timestamp+1 hours)),3);
        // The healthy quorum must still be able to replace an unrelated owner.
        _quorum(abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        bytes memory swap=abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),guard.rotationSerial());
        require(_exec(address(wallet),swap,_signed(address(wallet),swap,3)));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
    }
    function testPlainBindingRejectsSuccessorAsLPCustody() public {
        // Fresh sibling flow with an otherwise structurally valid, conflicting LP role.
        V3SuccessorConditionalDeployer helper=new V3SuccessorConditionalDeployer();
        successor=new V3AtomicSuccessorFixture(helper,address(helper).codehash);
        SafeReserveFactoryFixture factory=new SafeReserveFactoryFixture();
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners,successor);
        V3SuccessorConfig memory cfg=V3SuccessorConfig(FOUNDER,DISTRIBUTOR,IV3CustodyEpochFixture(address(guard)),start,1000,
            V3SuccessorLiquidityConfig(quote,new ReservePoolBuilder(),address(successor),1000));
        token=successor.create(cfg);
        _reject(address(guard),abi.encodeCall(guard.bindSuccessor,(1,block.timestamp,block.timestamp+1 hours)),3);
        require(!guard.bound()&&guard.lpCustody()==address(0)&&wallet.nonce()==0&&!guard.transactionActive());
    }
    function testSignedExpenseValidityWindow() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory future=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",t+1 hours,t+2 hours));
        bytes memory signedFuture=_signed(address(guard),future,3);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        vm.warp(t+1 hours);
        bytes memory tooLong=abi.encodeCall(guard.proposeExpense,(1,3,PAYEE,10,"E",0,"N",t,t+2 days));
        _reject(address(guard),tooLong,3);
        vm.warp(t+2 hours);
        vm.expectRevert();_exec(address(guard),future,signedFuture);
        require(wallet.nonce()==1&&!guard.transactionActive());
        _quorum(_propose(1,3,"E","N"));
        require(wallet.nonce()==2&&token.totalSupply()==SUPPLY);
    }
    function testSchedulingRejectsExpiredSignedWindows() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory liquidity=abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,t+7 days,"LP",t,t+1 hours));
        bytes memory legacy=abi.encodeCall(guard.scheduleLegacy,(1,bytes32("MANIFEST"),t+7 days,t,t+1 hours));
        bytes memory ls=_signed(address(guard),liquidity,3);
        bytes memory gs=_signed(address(guard),legacy,3);
        uint256 n=wallet.nonce();
        vm.warp(t+1 hours);
        vm.expectRevert();_exec(address(guard),liquidity,ls);
        vm.expectRevert();_exec(address(guard),legacy,gs);
        require(wallet.nonce()==n&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,t+7 days,"LP",block.timestamp,block.timestamp+1 hours)));
        require(wallet.nonce()==n+1);
    }
    function testStaleLegacyCancellationCannotCancelReplacement() public {
        _bind();
        uint256 t=block.timestamp;
        bytes memory schedule=abi.encodeCall(guard.scheduleLegacy,(1,bytes32("MANIFEST"),t+7 days,t,t+1 hours));
        _quorum(schedule);
        require(guard.legacyScheduleSerial()==1);
        bytes memory cancel=abi.encodeCall(guard.cancelLegacy,(1,1));
        bytes memory stale=_signedAt(address(guard),cancel,3,wallet.nonce()+2);
        _quorum(cancel);_quorum(schedule);
        uint256 n=wallet.nonce();
        vm.expectRevert();_exec(address(guard),cancel,stale);
        require(wallet.nonce()==n&&guard.legacyScheduleSerial()==2&&!guard.transactionActive());
        _quorum(abi.encodeCall(guard.cancelLegacy,(1,2)));
        require(wallet.nonce()==n+1);
    }
    function _legacyRow() private pure returns(LegacyVerifier.Row memory){
        return LegacyVerifier.Row(bytes32(uint256(11)),bytes32(uint256(21)),PAYEE,100,100,bytes32(uint256(31)));
    }
    function _legacyCommitment(V3LegacyProofClaimFixture legacy) private view returns(LegacyVerifier.Commitment memory c){
        bytes32 domain=sha256("CLIMB_BASE_LEGACY_BINARY_SUM_TEST_V2");
        LegacyVerifier.Row memory r=_legacyRow();
        bytes32 leaf=sha256(abi.encodePacked(domain,bytes1(0x01),bytes32(uint256(1)),uint256(0),r.sourceAccount,r.sourceOwner,r.recipient,r.sourceAmount,r.award,r.evidenceHash));
        c=LegacyVerifier.Commitment(bytes32(uint256(1)),bytes32(uint256(2)),address(legacy.token()),address(legacy),1,100,100,
            sha256(abi.encodePacked(domain,bytes1(0x04),bytes32(uint256(1)),bytes32(uint256(2)),uint256(84532),address(legacy.token()),address(legacy),uint256(1),uint256(100),leaf,uint256(100))));
    }
    function testLiquidityAndLegacySchedulingThroughActualSafe() public {
        _bind();
        V3DeferredLiquidityFixture l=V3DeferredLiquidityFixture(successor.vaults(2));
        V3LegacyProofClaimFixture legacy=V3LegacyProofClaimFixture(successor.vaults(6));
        uint256 deadline=block.timestamp+7 days;
        _quorum(abi.encodeCall(guard.scheduleLiquidity,(1,1000,500,50,deadline,"LP",block.timestamp,block.timestamp+1 hours)));
        bytes32 id=keccak256(abi.encode(block.chainid,address(l),address(token),address(quote),address(l.pool()),uint256(1),uint256(1000),uint256(500),uint256(50),deadline,bytes32("LP")));
        LegacyVerifier.Commitment memory c=_legacyCommitment(legacy);
        _quorum(abi.encodeCall(guard.scheduleLegacy,(1,legacy.activationDigest(c),deadline,block.timestamp,block.timestamp+1 hours)));
        vm.warp(block.timestamp+2 days);
        quote.transfer(address(l),500);l.execute(id);
        legacy.activate(c);
        vm.prank(PAYEE);legacy.claim(0,_legacyRow(),new LegacyVerifier.Node[](0));
        require(l.spent()==1000&&legacy.paid()==100&&token.balanceOf(PAYEE)==100&&token.totalSupply()==SUPPLY);
    }
}

```

## base/safe-custody/test/SafeEpochGuard.t.sol
Git blob: 04948b9da702ea6e19d1ec1fd007c1b3c119d5c0

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {SafeEpochGuardFixture,GuardedSafeFactoryFixture} from "../src/SafeEpochGuardFixture.sol";
interface VmEpochGuard {
    function chainId(uint256) external;
    function addr(uint256) external returns(address);
    function sign(uint256,bytes32) external returns(uint8,bytes32,bytes32);
    function warp(uint256) external;
    function etch(address,bytes calldata) external;
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}
contract PermissiveOwnerValidator {
    function isValidSignature(bytes memory,bytes memory) external pure returns(bytes4){return 0x20c13b0b;}
}
contract SafeEpochGuardTest {
    VmEpochGuard constant vm=VmEpochGuard(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256[3] private keys;
    address A;address B;address C;
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    Safe wallet;
    SafeEpochGuardFixture guard;
    GuardedSafeFactoryFixture factory;
    function setUp() public {
        vm.chainId(84532);factory=new GuardedSafeFactoryFixture();
        keys=[uint256(0x12345),uint256(0x23456),uint256(0x34567)];
        for(uint256 i=0;i<3;i++)for(uint256 j=i+1;j<3;j++)if(vm.addr(keys[j])<vm.addr(keys[i]))(keys[i],keys[j])=(keys[j],keys[i]);
        A=vm.addr(keys[0]);B=vm.addr(keys[1]);C=vm.addr(keys[2]);
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        (wallet,guard)=factory.create(owners);
    }
    function _signed(address to,bytes memory data,Enum.Operation op,uint256 count) private returns(bytes memory sigs){
        return _signedAt(to,data,op,count,wallet.nonce());
    }
    function _signedAt(address to,bytes memory data,Enum.Operation op,uint256 count,uint256 nonce) private returns(bytes memory sigs){
        bytes32 hash=wallet.getTransactionHash(to,0,data,op,0,0,0,address(0),address(0),nonce);
        for(uint256 i=0;i<count;i++){
            (uint8 v,bytes32 r,bytes32 s)=vm.sign(keys[i],hash);
            sigs=abi.encodePacked(sigs,r,s,v);
        }
    }
    function _approved(address to,bytes memory data,Enum.Operation op,uint256 count) private returns(bytes memory sigs){
        bytes32 hash=wallet.getTransactionHash(to,0,data,op,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            sigs=abi.encodePacked(sigs,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _exec(address to,bytes memory data,Enum.Operation op,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,op,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(address to,bytes memory data) private {
        require(_exec(to,data,Enum.Operation.Call,_signed(to,data,Enum.Operation.Call,3)));
    }
    function _reject(address to,bytes memory data,Enum.Operation op,uint256 count) private {
        bytes memory sigs=_signed(to,data,op,count);
        vm.expectRevert();_exec(to,data,op,sigs);
    }
    function _schedule(uint256 e,address oldOwner,address newOwner) private {
        _quorum(address(guard),abi.encodeCall(guard.scheduleRotation,(e,D,oldOwner,newOwner,block.timestamp,block.timestamp+1 hours)));
    }
    function _swap(address oldOwner,address newOwner) private view returns(bytes memory){
        return abi.encodePacked(abi.encodeWithSignature("swapOwner(address,address,address)",D,oldOwner,newOwner),guard.rotationSerial());
    }
    function testAtomicInitializationAndConfiguration() public {
        guard.validateConfig();require(guard.epoch()==1&&guard.threshold()==3&&guard.memberCount()==5&&guard.isMember(E)&&wallet.nonce()==0);
        vm.expectRevert();wallet.setup(new address[](0),1,address(0),"",address(0),address(0),0,payable(address(0)));
    }
    function testRealQuorumAndDirectCallerRejection() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        vm.expectRevert();guard.scheduleRotation(1,D,E,F,block.timestamp,block.timestamp+1 hours);
        _reject(address(guard),data,Enum.Operation.Call,2);
        _quorum(address(guard),data);
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
    }
    function testForbiddenConfigurationAndDelegatecallPaths() public {
        _reject(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("enableModule(address)",F),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)),Enum.Operation.Call,3);
        _reject(address(wallet),abi.encodeWithSignature("setFallbackHandler(address)",F),Enum.Operation.Call,3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)),Enum.Operation.DelegateCall,3);
        _reject(F,hex"12345678",Enum.Operation.Call,3);
        guard.validateConfig();require(guard.epoch()==1);
    }
    function testDelayExactRotationAndMonotonicABA() public {
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);
        _reject(address(wallet),_swap(E,address(0x107)),Enum.Operation.Call,3);
        _quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,F,E,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        _schedule(2,F,E);vm.warp(block.timestamp+2 days);
        _quorum(address(wallet),_swap(F,E));
        require(guard.epoch()==3&&guard.isMember(E)&&!guard.isMember(F));
    }
    function testCancelledAndExpiredRotationsRequireFreshDelay() public {
        _schedule(1,E,F);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        vm.warp(block.timestamp+2 days);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);vm.warp(block.timestamp+9 days);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);_quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2);
    }
    function testCancelledScheduleCannotReuseFutureNonceApproval() public {
        _schedule(1,E,F);
        bytes memory stale=_swap(E,F);
        uint256 first=guard.rotationSerial();
        // Cancel and reschedule each consume one nonce. Sign the old payload at
        // the future nonce so the Safe nonce alone cannot explain its rejection.
        bytes memory sigs=_signedAt(address(wallet),stale,Enum.Operation.Call,3,wallet.nonce()+2);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        _schedule(1,E,F);
        require(guard.rotationSerial()==first+1&&wallet.nonce()==3);
        vm.warp(block.timestamp+2 days);
        vm.expectRevert(SafeEpochGuardFixture.NotReady.selector);
        _exec(address(wallet),stale,Enum.Operation.Call,sigs);
        require(wallet.nonce()==3&&guard.epoch()==1&&!guard.transactionActive()&&guard.isMember(E));
        _reject(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F),Enum.Operation.Call,3);
        _quorum(address(wallet),_swap(E,F));
        require(wallet.nonce()==4&&guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E));
    }
    function testStaleCancellationCannotCancelNewSchedule() public {
        _schedule(1,E,F);
        bytes memory stale=abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial()));
        bytes memory sigs=_signedAt(address(guard),stale,Enum.Operation.Call,3,wallet.nonce()+2);
        _quorum(address(guard),stale);
        _schedule(1,E,F);
        vm.expectRevert();_exec(address(guard),stale,Enum.Operation.Call,sigs);
        require(wallet.nonce()==3&&guard.rotationSerial()==2&&!guard.transactionActive());
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        (digest,,,,)=guard.pending();require(digest==0&&wallet.nonce()==4);
    }
    function testInvalidRotationDoesNotChangeEpoch() public {
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,C,E,F,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,A,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        require(guard.epoch()==1&&guard.isMember(E));
    }
    function testReplacementAcquiringCodeDuringDelayRejected() public {
        _schedule(1,E,F);
        vm.etch(F,hex"60006000f3");
        vm.warp(block.timestamp+2 days);
        uint256 nonce=wallet.nonce();
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        require(wallet.nonce()==nonce&&guard.epoch()==1&&guard.isMember(E)&&!guard.isMember(F)&&!guard.transactionActive());
        (bytes32 digest,,,,)=guard.pending();require(digest!=0);
        _quorum(address(guard),abi.encodeCall(guard.cancelRotation,(1,guard.rotationSerial())));
        (digest,,,,)=guard.pending();require(digest==0);
        _reject(address(guard),abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours)),Enum.Operation.Call,3);
        vm.etch(F,"");
        _schedule(1,E,F);
        _reject(address(wallet),_swap(E,F),Enum.Operation.Call,3);
        vm.warp(block.timestamp+2 days);_quorum(address(wallet),_swap(E,F));
        require(guard.epoch()==2&&guard.isMember(F)&&!guard.isMember(E)&&!guard.transactionActive());
    }
    function testContractSignatureFromCodeBearingOwnerRejected() public {
        vm.etch(C,address(new PermissiveOwnerValidator()).code);
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_signed(address(guard),data,Enum.Operation.Call,2);
        // Safe v1.4.1 validates the permissive contract signature before the guard.
        sigs=abi.encodePacked(sigs,bytes32(uint256(uint160(C))),bytes32(uint256(195)),uint8(0),uint256(0));
        vm.expectRevert(SafeEpochGuardFixture.UnsupportedSignatureMode.selector);
        _exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&!guard.transactionActive()&&guard.epoch()==1);
    }
    function testApprovedHashFromCodeBearingOwnerRejected() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        bytes memory sigs=_approved(address(guard),data,Enum.Operation.Call,3);
        vm.etch(C,address(new PermissiveOwnerValidator()).code);
        vm.expectRevert(SafeEpochGuardFixture.UnsupportedSignatureMode.selector);
        _exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&!guard.transactionActive()&&guard.epoch()==1);
    }
    function testApprovedHashesRejectedAfterOwnerCodeCleared() public {
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,block.timestamp,block.timestamp+1 hours));
        vm.etch(C,address(new PermissiveOwnerValidator()).code);
        bytes memory sigs=_approved(address(guard),data,Enum.Operation.Call,3);
        vm.etch(C,"");
        vm.expectRevert(SafeEpochGuardFixture.UnsupportedSignatureMode.selector);
        _exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&!guard.transactionActive()&&guard.epoch()==1);
        _quorum(address(guard),data);
        require(wallet.nonce()==1);
    }
    function testNonSigningCodeBearingOwnerCanBeRotatedOut() public {
        vm.etch(E,address(new PermissiveOwnerValidator()).code);
        _schedule(1,E,F);
        vm.warp(block.timestamp+2 days);
        _quorum(address(wallet),_swap(E,F));
        require(wallet.nonce()==2&&guard.epoch()==2&&!guard.isMember(E)&&guard.isMember(F)&&!guard.transactionActive());
    }
    function testRotationSchedulingRejectsExpiredAuthorization() public {
        uint256 t=block.timestamp;
        bytes memory data=abi.encodeCall(guard.scheduleRotation,(1,D,E,F,t,t+1 hours));
        bytes memory sigs=_signed(address(guard),data,Enum.Operation.Call,3);
        vm.warp(t+1 hours);
        vm.expectRevert();_exec(address(guard),data,Enum.Operation.Call,sigs);
        require(wallet.nonce()==0&&guard.rotationSerial()==0&&!guard.transactionActive());
        _schedule(1,E,F);require(wallet.nonce()==1&&guard.rotationSerial()==1);
    }
    function testMainnetRejected() public {
        vm.chainId(8453);
        vm.expectRevert();new GuardedSafeFactoryFixture();
    }
}

```

## base/safe-custody/test/SafeCustodyBoundary.t.sol
Git blob: f411b21cc9be90c6ebcbbdb6817ceac38f1bcd9e

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {BaseGuard} from "safe-contracts/base/GuardManager.sol";

interface VmSafeBoundary {
    function prank(address) external;
    function expectRevert() external;
}
contract BoundaryTarget {
    uint256 public calls;
    function touch() external {calls++;}
}
contract BoundaryModule {
    function touch(Safe wallet,BoundaryTarget target) external returns(bool){
        return wallet.execTransactionFromModule(address(target),0,abi.encodeCall(target.touch,()),Enum.Operation.Call);
    }
}
contract BoundaryDenyGuard is BaseGuard {
    function checkTransaction(address,uint256,bytes memory,Enum.Operation,uint256,uint256,uint256,address,address payable,bytes memory,address) external pure override {
        revert("DENIED");
    }
    function checkAfterExecution(bytes32,bool) external pure override {}
}
contract BoundaryAllowGuard is BaseGuard {
    function checkTransaction(address,uint256,bytes memory,Enum.Operation,uint256,uint256,uint256,address,address payable,bytes memory,address) external pure override {}
    function checkAfterExecution(bytes32,bool) external pure override {}
}

/// @notice Actual pinned Safe source behavior, not a production custody adapter.
/// Uses approved-hash signatures from synthetic test owners; no private keys or network.
contract SafeCustodyBoundaryTest {
    VmSafeBoundary constant vm=VmSafeBoundary(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant A=address(0x101);
    address constant B=address(0x102);
    address constant C=address(0x103);
    address constant D=address(0x104);
    address constant E=address(0x105);
    address constant F=address(0x106);
    address constant SENTINEL=address(1);
    Safe wallet;
    BoundaryTarget target;
    function setUp() public {
        Safe implementation=new Safe();
        wallet=Safe(payable(address(new SafeProxy(address(implementation)))));
        address[] memory owners=new address[](5);
        owners[0]=A;owners[1]=B;owners[2]=C;owners[3]=D;owners[4]=E;
        wallet.setup(owners,3,address(0),"",address(0),address(0),0,payable(address(0)));
        target=new BoundaryTarget();
    }
    function _approved(address to,bytes memory data,uint256 count) private returns(bytes memory signatures){
        bytes32 hash=wallet.getTransactionHash(to,0,data,Enum.Operation.Call,0,0,0,address(0),address(0),wallet.nonce());
        address[3] memory signers=[A,B,C];
        for(uint256 i=0;i<count;i++){
            vm.prank(signers[i]);wallet.approveHash(hash);
            signatures=abi.encodePacked(signatures,bytes32(uint256(uint160(signers[i]))),bytes32(0),uint8(1));
        }
    }
    function _exec(address to,bytes memory data,bytes memory sigs) private returns(bool){
        return wallet.execTransaction(to,0,data,Enum.Operation.Call,0,0,0,address(0),payable(address(0)),sigs);
    }
    function _quorum(address to,bytes memory data) private {
        bytes memory sigs=_approved(to,data,3);
        require(_exec(to,data,sigs));
    }
    function testActualSetupAndThreeOwnerQuorum() public {
        require(wallet.getThreshold()==3&&wallet.getOwners().length==5&&wallet.isOwner(A));
        (address[] memory modules,address next)=wallet.getModulesPaginated(SENTINEL,10);
        require(modules.length==0&&next==SENTINEL);
        _quorum(address(target),abi.encodeCall(target.touch,()));
        require(target.calls()==1&&wallet.nonce()==1);
    }
    function testTwoApprovalsCannotExecute() public {
        bytes memory data=abi.encodeCall(target.touch,());
        bytes memory sigs=_approved(address(target),data,2);
        vm.expectRevert();_exec(address(target),data,sigs);
        require(target.calls()==0&&wallet.nonce()==0);
    }
    function testOwnerSetHashReturnsAfterRotationABA() public {
        bytes32 beforeHash=keccak256(abi.encode(wallet.getOwners()));
        _quorum(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,E,F));
        require(!wallet.isOwner(E)&&wallet.isOwner(F)&&keccak256(abi.encode(wallet.getOwners()))!=beforeHash);
        _quorum(address(wallet),abi.encodeWithSignature("swapOwner(address,address,address)",D,F,E));
        require(wallet.isOwner(E)&&!wallet.isOwner(F)&&keccak256(abi.encode(wallet.getOwners()))==beforeHash&&wallet.nonce()==2);
    }
    function testOrdinarySafeAllowsThresholdReduction() public {
        _quorum(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1));
        require(wallet.getThreshold()==1);
        bytes memory data=abi.encodeCall(target.touch,());
        require(_exec(address(target),data,_approved(address(target),data,1)));
        require(target.calls()==1);
    }
    function testEnabledModuleBypassesNormalTransactionGuard() public {
        BoundaryModule module=new BoundaryModule();
        _quorum(address(wallet),abi.encodeWithSignature("enableModule(address)",address(module)));
        BoundaryDenyGuard guard=new BoundaryDenyGuard();
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(guard)));
        bytes memory data=abi.encodeCall(target.touch,());
        bytes memory sigs=_approved(address(target),data,3);
        vm.expectRevert();_exec(address(target),data,sigs);
        require(target.calls()==0);
        require(module.touch(wallet,target)&&target.calls()==1);
    }
    function testOrdinaryAllowGuardCanBeRemoved() public {
        BoundaryAllowGuard guard=new BoundaryAllowGuard();
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(guard)));
        _quorum(address(wallet),abi.encodeWithSignature("setGuard(address)",address(0)));
        _quorum(address(wallet),abi.encodeWithSignature("changeThreshold(uint256)",1));
        require(wallet.getThreshold()==1);
    }
}

```
