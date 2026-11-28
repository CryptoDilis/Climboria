// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {V4LocalEpochGuard,V4LocalGuardBootstrap} from "./V4LocalEpochGuard.sol";
import {V4MarketingGenesisLocal,V4MarketingGenesisDeployer} from "./V4MarketingGenesisLocal.sol";
import {V4MarketingReleaseLocal} from "./V4MarketingReleaseLocal.sol";

contract V4MarketingGuardLocal is V4LocalEpochGuard {
    V4MarketingGenesisDeployer public immutable deployer;
    bytes32 public immutable deployerHash;
    V4MarketingGenesisLocal public token;
    V4MarketingReleaseLocal public vault;
    bytes32 public vaultHash;
    bytes32 public tokenHash;
    bool private issuing;
    mapping(address=>uint256) public expenseContext;
    event LocalIssued(address indexed asset,address indexed reserve,address indexed marketing);
    event ContextChanged(address indexed recipient,uint256 context);
    constructor(Safe account,address implementation,V4MarketingGenesisDeployer helper) V4LocalEpochGuard(account,implementation){
        if(address(helper).code.length==0)revert InvalidConfig();
        deployer=helper;deployerHash=address(helper).codehash;
    }
    function _current(uint256 expected,uint256 afterTime,uint256 untilTime) private view {
        validateConfig();_authorizationWindow(afterTime,untilTime);
        if(!transactionActive||epoch!=expected||issuing)revert Forbidden();
    }
    function _bound() private view {
        if(address(token)==address(0)||address(token).codehash!=tokenHash||address(vault).codehash!=vaultHash)revert InvalidConfig();
    }
    function issueLocal(uint256 expected,address marketing,uint256 afterTime,uint256 untilTime) external onlyWallet {
        _current(expected,afterTime,untilTime);
        if(address(token)!=address(0)||wallet.isOwner(marketing)||marketing==address(wallet)||marketing==address(this)||
           marketing==singleton||marketing==address(deployer)||marketing.code.length!=0||marketing==pending.newOwner||
           address(deployer).codehash!=deployerHash)revert Forbidden();
        issuing=true;
        V4MarketingGenesisLocal t=deployer.deploy(marketing);
        V4MarketingReleaseLocal v=V4MarketingReleaseLocal(t.reserves(8));
        if(address(deployer).codehash!=deployerHash||address(v.control())!=address(this)||address(v.token())!=address(t)||
           t.totalSupply()!=888888888000000||t.balanceOf(marketing)!=3111111108000||
           t.balanceOf(address(wallet))!=0||t.balanceOf(address(this))!=0||t.balanceOf(address(deployer))!=0||
           t.balanceOf(address(t))!=0||v.start()!=block.timestamp)revert InvalidConfig();
        for(uint256 i;i<11;++i)if(t.balanceOf(t.reserves(i))!=t.reserveAmount(i))revert InvalidConfig();
        token=t;vault=v;tokenHash=address(t).codehash;vaultHash=address(v).codehash;issuing=false;
        emit LocalIssued(address(t),address(v),marketing);
    }
    function _roleAllowed(address a) private view returns(bool){
        if(a==address(0)||uint160(a)<=0xffff||a.code.length!=0||wallet.isOwner(a)||a==address(wallet)||
           a==address(this)||a==singleton||a==address(deployer)||a==token.marketingWallet()||a==address(token)||
           (pending.digest!=0&&block.timestamp<pending.expiresAt&&a==pending.newOwner))return false;
        // Reserved addresses stay excluded even if code is absent.
        for(uint256 i;i<11;++i)if(a==token.reserves(i))return false;
        return true;
    }
    function recipientAllowed(address a) external view returns(bool){
        validateConfig();_bound();
        return expenseContext[a]%2==0&&_roleAllowed(a);
    }
    function _onNomination(address a) internal override {
        // Conservative local policy: both incoming and outgoing owner require fresh release.
        _mark(a);_mark(pending.oldOwner);
    }
    function _mark(address a) private {
        uint256 c=expenseContext[a];expenseContext[a]=c+1+c%2;emit ContextChanged(a,expenseContext[a]);
    }
    function releaseRecipient(uint256 expected,address recipient,uint256 context,uint256 afterTime,uint256 untilTime) external onlyWallet{
        _current(expected,afterTime,untilTime);_bound();
        if(context%2!=1||expenseContext[recipient]!=context||!_roleAllowed(recipient))revert Forbidden();
        expenseContext[recipient]=context+1;emit ContextChanged(recipient,context+1);
    }
    function proposeMarketing(uint256 expected,address recipient,uint256 amount,bytes32 evidence,uint256 month,bytes32 salt,uint256 context,uint256 afterTime,uint256 untilTime) external onlyWallet returns(bytes32){
        _current(expected,afterTime,untilTime);_bound();
        return vault.propose(recipient,amount,evidence,month,salt,context);
    }
    function cancelMarketing(uint256 expected,bytes32 id,uint256 afterTime,uint256 untilTime) external onlyWallet{
        _current(expected,afterTime,untilTime);_bound();vault.cancel(id);
    }
    function _rotationOwnerAllowed(address a) internal view override returns(bool){
        return !issuing&&(address(token)==address(0)||a!=token.marketingWallet());
    }
    function _policyCallAllowed(bytes4 selector,uint256 len) internal view override returns(bool){
        if(issuing)return false;
        if(address(token)==address(0))return selector==this.issueLocal.selector&&len==132;
        return (selector==this.proposeMarketing.selector&&len==292)||(selector==this.cancelMarketing.selector&&len==132)||
            (selector==this.releaseRecipient.selector&&len==164);
    }
}
contract V4MarketingFactoryLocal {
    Safe public immutable singleton;
    V4LocalGuardBootstrap public immutable bootstrap;
    V4MarketingGenesisDeployer public immutable helper;
    constructor(){
        require(block.chainid==31337);
        singleton=new Safe();bootstrap=new V4LocalGuardBootstrap();helper=new V4MarketingGenesisDeployer();
    }
    function create(address[] calldata owners) external returns(Safe wallet,V4MarketingGuardLocal guard){
        require(block.chainid==31337&&owners.length==5);
        for(uint256 i;i<5;++i)require(owners[i].code.length==0);
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=new V4MarketingGuardLocal(wallet,address(singleton),helper);
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
    }
}
