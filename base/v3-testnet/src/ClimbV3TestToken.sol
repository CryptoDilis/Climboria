// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Inert test-only reserve. No release path; NOT a production vault or LP lock.
contract V3InactiveReserve {
    error WrongChain();
    bytes32 public immutable purpose;
    constructor(bytes32 label) {
        if(block.chainid!=84532) revert WrongChain();
        purpose=label;
    }
}

/// @notice Synthetic fixed beneficiary, no catch-up at cliff, 36 installments.
/// A model month is exactly 30 days, not a calendar month.
contract V3FounderVesting {
    error WrongChain();
    error InvalidConfig();
    error NothingDue();
    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable start;
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=17777777760000;
    uint256 public released;
    constructor(IERC20 asset,address receiver,uint256 begin){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset)==address(0)||receiver==address(0)||receiver==address(this)||begin<=block.timestamp||begin>block.timestamp+365 days) revert InvalidConfig();
        token=asset;beneficiary=receiver;start=begin;
    }
    function vested() public view returns(uint256){
        if(block.timestamp<=start) return 0;
        uint256 elapsed=(block.timestamp-start)/MONTH;
        if(elapsed<=12) return 0;
        if(elapsed>=48) return ALLOCATION;
        return ALLOCATION*(elapsed-12)/36;
    }
    function release() external {
        uint256 amount=vested()-released;
        if(amount==0) revert NothingDue();
        released+=amount;
        require(token.transfer(beneficiary,amount));
    }
}

/// @notice Synthetic release ceiling, not a player reward system. Unused monthly
/// capacity expires; unused tokens remain locked permanently in this prototype.
contract V3GamingVault {
    error WrongChain();
    error InvalidConfig();
    error NotDistributor();
    error OutsideWindow();
    error CapExceeded();
    IERC20 public immutable token;
    address public immutable distributor;
    uint256 public immutable start;
    uint256 public constant MONTH=30 days;
    uint256 public constant ALLOCATION=311111110800000;
    mapping(uint256=>uint256) public monthlyReleased;
    uint256 public released;
    constructor(IERC20 asset,address receiver,uint256 begin){
        if(block.chainid!=84532) revert WrongChain();
        if(address(asset)==address(0)||receiver==address(0)||receiver==address(this)||begin<=block.timestamp||begin>block.timestamp+365 days) revert InvalidConfig();
        token=asset;distributor=receiver;start=begin;
    }
    function monthlyCap(uint256 m) public pure returns(uint256){
        if(m>=60) return 0;
        uint256 annual=ALLOCATION*(30-5*(m/12))/100;
        uint256 i=m%12;
        return annual*(i+1)/12-annual*i/12;
    }
    function release(uint256 amount) external {
        if(msg.sender!=distributor) revert NotDistributor();
        if(block.timestamp<start) revert OutsideWindow();
        uint256 m=(block.timestamp-start)/MONTH;
        if(m>=60) revert OutsideWindow();
        if(amount==0||amount>monthlyCap(m)-monthlyReleased[m]) revert CapExceeded();
        monthlyReleased[m]+=amount;
        released+=amount;
        require(token.transfer(distributor,amount));
    }
}

/// @notice Exact V3 test issuance. No production token, quote assets, liquidity,
/// public claim, external deposit or mainnet deployment.
contract ClimbV3TestToken is ERC20 {
    error WrongChain();
    error InvalidConfig();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    V3FounderVesting public immutable founderVault;
    V3GamingVault public immutable gamingVault;
    V3InactiveReserve public immutable liquidityReserve;
    V3InactiveReserve public immutable ecosystemReserve;
    V3InactiveReserve public immutable communityReserve;
    V3InactiveReserve public immutable treasuryReserve;
    V3InactiveReserve public immutable legacyReserve;
    constructor(address founder,address distributor,uint256 start) ERC20("CLIMB V3 Test Only","CLIMBV3TEST"){
        if(block.chainid!=84532) revert WrongChain();
        if(founder==address(0)||distributor==address(0)||founder==distributor||founder==address(this)||distributor==address(this)) revert InvalidConfig();
        founderVault=new V3FounderVesting(IERC20(address(this)),founder,start);
        gamingVault=new V3GamingVault(IERC20(address(this)),distributor,start);
        liquidityReserve=new V3InactiveReserve("LIQUIDITY");
        ecosystemReserve=new V3InactiveReserve("ECOSYSTEM");
        communityReserve=new V3InactiveReserve("COMMUNITY");
        treasuryReserve=new V3InactiveReserve("TREASURY");
        legacyReserve=new V3InactiveReserve("LEGACY");
        _mint(address(founderVault),17777777760000);
        _mint(address(gamingVault),311111110800000);
        _mint(address(liquidityReserve),222222222000000);
        _mint(address(ecosystemReserve),133333333200000);
        _mint(address(communityReserve),88888888800000);
        _mint(address(treasuryReserve),106666666560000);
        _mint(address(legacyReserve),8888888880000);
        assert(totalSupply()==INITIAL_SUPPLY);
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}
