// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {SafeGuardBootstrapFixture} from "./SafeEpochGuardFixture.sol";
import {SafeReserveGuardFixture} from "./SafeReserveGuardFixture.sol";
import {V3AtomicSuccessorFixture,V3SuccessorTestToken,V3SuccessorConfig,V3SuccessorConditionalDeployer} from "v3-src/V3AtomicSuccessorFixture.sol";

interface IQuorumBindingFixture {
    function successor() external view returns(V3AtomicSuccessorFixture);
    function bindBeforeIssuance() external;
    function bound() external view returns(bool);
}
/// @notice Test-only factory. A fixed Safe setup factory configures one guard.
/// Actual Safe quorum must authorize exact creation payload via that guard.
contract V3QuorumSuccessorFixture is V3AtomicSuccessorFixture {
    address public immutable guardFactory;
    bytes32 public immutable guardFactoryHash;
    address public configuredGuard;
    bytes32 public configuredGuardHash;
    constructor(address setupFactory,V3SuccessorConditionalDeployer helper,bytes32 helperHash) V3AtomicSuccessorFixture(helper,helperHash){
        if(setupFactory.code.length==0)revert InvalidConfig();
        guardFactory=setupFactory;guardFactoryHash=setupFactory.codehash;
    }
    function configureGuard(address guard) external {
        if(msg.sender!=guardFactory||guardFactory.codehash!=guardFactoryHash||configuredGuard!=address(0)||used||guard.code.length==0||
           address(IQuorumBindingFixture(guard).successor())!=address(this))revert InvalidConfig();
        configuredGuard=guard;configuredGuardHash=guard.codehash;
    }
    function create(V3SuccessorConfig calldata cfg) external override returns(V3SuccessorTestToken asset){
        if(guardFactory.codehash!=guardFactoryHash||msg.sender!=configuredGuard||msg.sender.codehash!=configuredGuardHash||
           address(cfg.control)!=configuredGuard)revert InvalidConfig();
        return _create(cfg);
    }
    function _beforeIssue() internal override {
        IQuorumBindingFixture guard=IQuorumBindingFixture(configuredGuard);
        guard.bindBeforeIssuance();
        if(!guard.bound())revert InvalidConfig();
    }
}
/// @notice Actual Safe quorum -> zero-supply creation -> binding -> issuance,
/// all inside one transaction; failure reverts every step. No production asset.
contract SafeQuorumReserveGuardFixture is SafeReserveGuardFixture {
    error InvalidIssuanceDeadline();
    bool public issuing;
    uint256 public constant MAX_ISSUANCE_WINDOW=1 days;
    // Match the existing testnet preflight ceiling; not a production reward policy.
    uint256 public constant MAX_TEST_GAMING_WALLET_MONTHLY_CAP=5_185_185_180_000;
    event IssuanceInvalidated(uint256 indexed epoch,uint256 indexed consumedNonce);
    event QuorumIssued(address indexed token,bytes32 indexed configHash);
    constructor(Safe wallet_,address implementation,V3QuorumSuccessorFixture factory_)
        SafeReserveGuardFixture(wallet_,implementation,factory_){}
    function issueSuccessor(uint256 expected,uint256 validAfter,uint256 deadline,V3SuccessorConfig calldata cfg) external onlyWallet {
        _current(expected);
        _authorizationWindow(validAfter,deadline);
        if(deadline>cfg.start)revert InvalidIssuanceDeadline();
        if(issuing||bound||cfg.gamingWalletMonthlyCap==0||cfg.gamingWalletMonthlyCap>MAX_TEST_GAMING_WALLET_MONTHLY_CAP||address(cfg.control)!=address(this)||
           V3QuorumSuccessorFixture(address(successor)).configuredGuard()!=address(this)||
           cfg.founder==address(wallet)||cfg.distributor==address(wallet)||
           cfg.liquidity.custody==address(wallet)||cfg.liquidity.custody==address(this))revert InvalidConfig();
        issuing=true;
        V3SuccessorTestToken t=successor.create(cfg);
        if(!bound||address(t)!=address(asset)||!t.issued()||t.totalSupply()!=t.INITIAL_SUPPLY())revert InvalidConfig();
        uint256[7] memory expectedAmounts=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++)if(t.balanceOf(destinations[i])!=expectedAmounts[i])revert InvalidConfig();
        if(t.balanceOf(address(wallet))!=0||t.balanceOf(address(this))!=0||t.balanceOf(address(successor))!=0||
           t.balanceOf(founder)!=0||t.balanceOf(distributor)!=0)revert InvalidConfig();
        issuing=false;emit QuorumIssued(address(t),keccak256(abi.encode(cfg)));
    }
    // A fresh quorum may consume the pending Safe nonce without issuing any supply.
    // This is not instant revocation: it must be mined before the old payload.
    function invalidateIssuance(uint256 expected) external onlyWallet {
        _current(expected);
        if(bound||issuing)revert Forbidden();
        emit IssuanceInvalidated(expected,wallet.nonce()-1);
    }
    function bindBeforeIssuance() external {
        if(msg.sender!=address(successor)||!issuing||bound)revert Unauthorized();
        _bind(false);

    }
    function _rotationOwnerAllowed(address a) internal view override returns(bool){
        return !issuing&&super._rotationOwnerAllowed(a);
    }
    function _policyCallAllowed(bytes4 selector,uint256 len) internal view override returns(bool){
        if(issuing)return false;
        if(!bound)return (selector==this.issueSuccessor.selector&&len==388)||
            (selector==this.invalidateIssuance.selector&&len==36);
        return super._policyCallAllowed(selector,len);
    }
}
contract SafeQuorumReserveFactoryFixture {
    error InvalidConfig();
    Safe public immutable singleton;
    SafeGuardBootstrapFixture public immutable bootstrap;
    constructor(){
        if(block.chainid!=84532)revert InvalidConfig();
        singleton=new Safe();bootstrap=new SafeGuardBootstrapFixture();
    }
    function create(address[] calldata owners,V3QuorumSuccessorFixture successor) external returns(Safe wallet,SafeQuorumReserveGuardFixture guard){
        if(block.chainid!=84532||owners.length!=5||successor.creator()!=msg.sender||
           successor.guardFactory()!=address(this)||successor.configuredGuard()!=address(0))revert InvalidConfig();
        for(uint256 i=0;i<owners.length;i++)if(owners[i].code.length!=0)revert InvalidConfig();
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=new SafeQuorumReserveGuardFixture(wallet,address(singleton),successor);
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
        successor.configureGuard(address(guard));
    }
}
