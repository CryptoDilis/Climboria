// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {Safe} from "safe-contracts/Safe.sol";
import {SafeProxy} from "safe-contracts/proxies/SafeProxy.sol";
import {Enum} from "safe-contracts/common/Enum.sol";
import {BaseGuard} from "safe-contracts/base/GuardManager.sol";

interface ITestSafeProxy { function masterCopy() external view returns(address); }

/// @notice Test-only, rotation-only custody boundary. Cannot spend or forward assets.
/// Not independently reviewed, no recovery below quorum, do not fund.
contract SafeEpochGuardFixture is BaseGuard {
    error InvalidConfig();
    error Unauthorized();
    error Forbidden();
    error NotReady();
    uint256 public constant DELAY=2 days;
    uint256 public constant WINDOW=7 days;
    uint256 private constant GUARD_SLOT=0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8;
    uint256 private constant FALLBACK_SLOT=0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5;
    bytes4 private constant SWAP=bytes4(keccak256("swapOwner(address,address,address)"));
    Safe public immutable wallet;
    address public immutable singleton;
    bytes32 public immutable proxyHash;
    bytes32 public immutable singletonHash;
    uint256 public epoch=1;
    struct Rotation { bytes32 digest; address oldOwner; address newOwner; uint256 readyAt; uint256 expiresAt; }
    Rotation public pending;
    bool private rotating;
    event RotationScheduled(uint256 indexed epoch,bytes32 indexed digest,uint256 readyAt,uint256 expiresAt);
    event RotationCancelled(uint256 indexed epoch,bytes32 indexed digest);
    event Rotated(uint256 indexed epoch,address indexed oldOwner,address indexed newOwner);

    constructor(Safe account,address implementation){
        if(block.chainid!=84532||address(account).code.length==0||implementation.code.length==0||
           ITestSafeProxy(address(account)).masterCopy()!=implementation) revert InvalidConfig();
        wallet=account;singleton=implementation;
        proxyHash=address(account).codehash;singletonHash=implementation.codehash;
    }
    modifier onlyWallet(){if(msg.sender!=address(wallet))revert Unauthorized();_;}
    function threshold() external view returns(uint256){validateConfig();return wallet.getThreshold();}
    function memberCount() external view returns(uint256){validateConfig();return wallet.getOwners().length;}
    function isMember(address a) external view returns(bool){validateConfig();return wallet.isOwner(a);}
    function validateConfig() public view {
        if(block.chainid!=84532||address(wallet).codehash!=proxyHash||singleton.codehash!=singletonHash||
           ITestSafeProxy(address(wallet)).masterCopy()!=singleton||wallet.getThreshold()!=3||
           wallet.getOwners().length!=5||abi.decode(wallet.getStorageAt(GUARD_SLOT,1),(address))!=address(this)||
           abi.decode(wallet.getStorageAt(FALLBACK_SLOT,1),(address))!=address(0)) revert InvalidConfig();
        (address[] memory modules,address next)=wallet.getModulesPaginated(address(1),1);
        if(modules.length!=0||next!=address(1))revert InvalidConfig();
    }
    function scheduleRotation(uint256 expectedEpoch,address prev,address oldOwner,address newOwner) external onlyWallet {
        validateConfig();
        if(expectedEpoch!=epoch||rotating||(pending.digest!=0&&block.timestamp<pending.expiresAt)||
           !wallet.isOwner(oldOwner)||wallet.isOwner(newOwner)||newOwner==address(0)||newOwner==address(1)||
           newOwner==address(wallet)||newOwner==address(this)||newOwner.code.length!=0)revert Forbidden();
        address[] memory owners=wallet.getOwners();bool valid;
        for(uint256 i=0;i<owners.length;i++){
            if(owners[i]==oldOwner&&prev==(i==0?address(1):owners[i-1]))valid=true;
        }
        if(!valid)revert Forbidden();
        bytes32 digest=keccak256(abi.encodeWithSelector(SWAP,prev,oldOwner,newOwner));
        pending=Rotation(digest,oldOwner,newOwner,block.timestamp+DELAY,block.timestamp+DELAY+WINDOW);
        emit RotationScheduled(epoch,digest,pending.readyAt,pending.expiresAt);
    }
    function cancelRotation(uint256 expectedEpoch) external onlyWallet {
        validateConfig();
        bytes32 d=pending.digest;
        if(expectedEpoch!=epoch||d==0||rotating)revert Forbidden();
        delete pending;emit RotationCancelled(epoch,d);
    }
    function checkTransaction(address to,uint256 value,bytes memory data,Enum.Operation operation,
        uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address payable refundReceiver,
        bytes memory,address) external override onlyWallet {
        if(value!=0||operation!=Enum.Operation.Call||safeTxGas!=0||baseGas!=0||gasPrice!=0||
           gasToken!=address(0)||refundReceiver!=address(0))revert Forbidden();
        _checkCall(to,data);
    }
    function _checkCall(address to,bytes memory data) private {
        validateConfig();
        if(rotating||data.length<4)revert Forbidden();
        bytes4 selector=bytes4(data);
        if(to==address(this)){
            if((selector==this.scheduleRotation.selector&&data.length==132)||
               (selector==this.cancelRotation.selector&&data.length==36))return;
            revert Forbidden();
        }
        if(to!=address(wallet)||selector!=SWAP||data.length!=100)revert Forbidden();
        Rotation memory p=pending;
        if(p.digest==0||p.digest!=keccak256(data)||block.timestamp<p.readyAt||block.timestamp>=p.expiresAt)revert NotReady();
        rotating=true;
    }
    function checkAfterExecution(bytes32,bool success) external override onlyWallet {
        if(!success)revert Forbidden();
        validateConfig();
        if(rotating){
            Rotation memory p=pending;
            if(wallet.isOwner(p.oldOwner)||!wallet.isOwner(p.newOwner))revert InvalidConfig();
            rotating=false;delete pending;epoch++;
            emit Rotated(epoch,p.oldOwner,p.newOwner);
        }
    }
}

/// @dev Used exclusively by the factory as the Safe setup delegatecall target.
/// Calls the proxy itself, satisfying Safe self-authorization without exposing
/// a post-setup public initializer or retaining any authority in the helper.
contract SafeGuardBootstrapFixture {
    function install(address guard) external {
        Safe(payable(address(this))).setGuard(guard);
    }
}

/// @notice Test-only factory uses freshly compiled actual pinned Safe source.
/// Proxy initialization and guard installation occur in one transaction.
contract GuardedSafeFactoryFixture {
    error InvalidConfig();
    Safe public immutable singleton;
    SafeGuardBootstrapFixture public immutable bootstrap;
    constructor(){
        if(block.chainid!=84532)revert InvalidConfig();
        singleton=new Safe();bootstrap=new SafeGuardBootstrapFixture();
    }
    function create(address[] calldata owners) external returns(Safe wallet,SafeEpochGuardFixture guard){
        if(block.chainid!=84532||owners.length!=5)revert InvalidConfig();
        for(uint256 i=0;i<owners.length;i++)if(owners[i].code.length!=0)revert InvalidConfig();
        wallet=Safe(payable(address(new SafeProxy(address(singleton)))));
        guard=new SafeEpochGuardFixture(wallet,address(singleton));
        wallet.setup(owners,3,address(bootstrap),abi.encodeCall(bootstrap.install,(address(guard))),address(0),address(0),0,payable(address(0)));
        guard.validateConfig();
    }
}
