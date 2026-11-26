// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting,V3GamingVault,V3InactiveReserve} from "./ClimbV3TestToken.sol";
import {V3RestrictedSpend} from "./V3RestrictedSpend.sol";

/// @notice Integrated offline test candidate; never use real recipients or funds.
/// Liquidity and legacy reserves intentionally have no release path.
contract ClimbV3IntegratedTestToken is ERC20 {
    error WrongChain();
    error InvalidConfig();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    V3FounderVesting public immutable founderVault;
    V3GamingVault public immutable gamingVault;
    V3InactiveReserve public immutable liquidityReserve;
    V3RestrictedSpend public immutable ecosystemReserve;
    V3RestrictedSpend public immutable communityReserve;
    V3RestrictedSpend public immutable treasuryReserve;
    V3InactiveReserve public immutable legacyReserve;
    constructor(address founder,address distributor,uint256 start,address[5] memory signers) ERC20("CLIMB V3 Integrated Test Only","CLIMBV3INTTEST"){
        if(block.chainid!=84532) revert WrongChain();
        if(founder==address(0)||distributor==address(0)||founder==distributor||founder==address(this)||distributor==address(this)) revert InvalidConfig();
        for(uint256 i=0;i<5;i++){
            if(signers[i]==distributor||signers[i]==address(this)) revert InvalidConfig();
        }
        founderVault=new V3FounderVesting(IERC20(address(this)),founder,start);
        gamingVault=new V3GamingVault(IERC20(address(this)),distributor,start);
        liquidityReserve=new V3InactiveReserve("LIQUIDITY");
        ecosystemReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,133333333200000,"ECOSYSTEM");
        communityReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,88888888800000,"COMMUNITY");
        treasuryReserve=new V3RestrictedSpend(IERC20(address(this)),signers,founder,start,106666666560000,"TREASURY");
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
