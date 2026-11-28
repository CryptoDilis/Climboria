// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {V4LocalEpochGuard,V4LocalGuardBootstrap} from "./V4LocalEpochGuard.sol";
import {V4GenesisLocalFixture} from "./V4GenesisLocalFixture.sol";
import {V4MarketingBudgetLocalFixture} from "./V4MarketingBudgetLocalFixture.sol";

/// @notice Local actual-Safe authorization experiment, not production custody.
/// @dev Only issuance into sealed reserves and accounting counters; no reserve payment.
contract V4LocalSafeBoundary is V4LocalEpochGuard {
    V4GenesisLocalFixture public token;
    V4MarketingBudgetLocalFixture public budget;
    bool private issuing;
    event LocalGenesis(address indexed token,address indexed marketing,address budget);
    event LocalMarketingRecorded(uint256 indexed epoch,uint256 amount);
    constructor(Safe account,address implementation) V4LocalEpochGuard(account,implementation) {}
    function _current(uint256 expected,uint256 validAfter,uint256 validUntil) private view {
        validateConfig();
        _authorizationWindow(validAfter,validUntil);
        if(!transactionActive||epoch!=expected||issuing)revert Forbidden();
    }
    function issueLocal(uint256 expected,address marketing,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _current(expected,validAfter,validUntil);
        if(address(token)!=address(0)||wallet.isOwner(marketing)||marketing==address(wallet)||
           marketing==address(this)||marketing==singleton||marketing.code.length!=0)revert Forbidden();
        issuing=true;
        V4GenesisLocalFixture t=new V4GenesisLocalFixture(marketing);
        V4MarketingBudgetLocalFixture b=new V4MarketingBudgetLocalFixture(block.timestamp);
        if(marketing.code.length!=0||t.totalSupply()!=888888888000000||
           t.balanceOf(marketing)!=3111111108000||t.balanceOf(address(wallet))!=0||
           t.balanceOf(address(this))!=0||t.balanceOf(address(b))!=0)revert InvalidConfig();
        token=t;budget=b;issuing=false;
        emit LocalGenesis(address(t),marketing,address(b));
    }
    function recordMarketing(uint256 expected,uint256 amount,uint256 validAfter,uint256 validUntil) external onlyWallet {
        _current(expected,validAfter,validUntil);
        if(address(budget)==address(0))revert Forbidden();
        budget.recordSpend(amount);
        emit LocalMarketingRecorded(epoch,amount);
    }
    function _rotationOwnerAllowed(address a) internal view override returns(bool) {
        return !issuing&&(address(token)==address(0)||a!=token.marketingWallet());
    }
    function _policyCallAllowed(bytes4 selector,uint256 len) internal view override returns(bool) {
        if(issuing||len!=132)return false;
        return address(token)==address(0)?selector==this.issueLocal.selector:selector==this.recordMarketing.selector;
    }
}
contract V4LocalSafeFactory {
    error InvalidConfig();
    Safe public immutable singleton;
    V4LocalGuardBootstrap public immutable bootstrap;
    constructor(){
        if(block.chainid!=31337)revert InvalidConfig();
        singleton=new Safe();bootstrap=new V4LocalGuardBootstrap();
    }
    function create(address[] calldata owners) external returns(Safe wallet,V4LocalSafeBoundary guard){
        if(block.chainid!=31337||owners.length!=5)revert InvalidConfig();
        for(uint256 i;i<5;++i)if(owners[i].code.length!=0)revert InvalidConfig();
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=new V4LocalSafeBoundary(wallet,address(singleton));
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
    }
}
