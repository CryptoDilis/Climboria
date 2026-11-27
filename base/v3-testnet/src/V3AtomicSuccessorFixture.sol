// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {V3FounderVesting} from "./ClimbV3TestToken.sol";
import {V3GameRewardFixture} from "./V3GameRewardFixture.sol";
import {V3EpochPolicyFactory,IV3CustodyEpochFixture} from "./V3EpochSpendFixture.sol";
import {V3BoundedLegacyFixture,IV3BurnableAsset} from "./V3BoundedLegacyFixture.sol";
import {IV3SyntheticPool} from "./V3LiquidityPolicyFixture.sol";
import {V3DeferredLiquidityFixture} from "./V3DeferredLiquidityFixture.sol";

// Test-only pool builder. Real pool/position manager selection is not implemented.
interface IV3SyntheticPoolBuilder {
    function createPool(IERC20 asset,IERC20 quote) external returns(IV3SyntheticPool);
}

/// @notice Zero-supply on construction; only the atomic factory can issue once.
contract V3SuccessorTestToken is ERC20 {
    error InvalidIssuance();
    uint256 public constant INITIAL_SUPPLY=888888888000000;
    address public immutable issuer;
    bool public issued;
    constructor() ERC20("CLIMB V3 Successor Test Only","CLIMBV3NEXTTEST"){
        if(block.chainid!=84532) revert InvalidIssuance();
        issuer=msg.sender;
    }
    function decimals() public pure override returns(uint8){return 6;}
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
    // Canonical order: founder, gaming, liquidity, ecosystem, community, treasury, legacy.
    function issue(address[7] calldata vaults) external {
        if(msg.sender!=issuer||issued||totalSupply()!=0) revert InvalidIssuance();
        uint256[7] memory amounts=[uint256(17777777760000),311111110800000,222222222000000,133333333200000,88888888800000,106666666560000,8888888880000];
        for(uint256 i=0;i<7;i++){
            if(vaults[i].code.length==0||vaults[i]==issuer||vaults[i]==address(this)) revert InvalidIssuance();
            for(uint256 j=0;j<i;j++) if(vaults[i]==vaults[j]) revert InvalidIssuance();
        }
        issued=true;
        for(uint256 i=0;i<7;i++) _mint(vaults[i],amounts[i]);
        assert(totalSupply()==INITIAL_SUPPLY);
    }
}

struct V3SuccessorLiquidityConfig {
    IERC20 quote;
    IV3SyntheticPoolBuilder builder;
    address custody;
    uint256 trancheCap;
}
struct V3SuccessorLegacyConfig {
    uint256 opens;
    uint256 deadline;
    uint256 closure;
    uint256 cap;
    bytes32 campaign;
    bytes32[] ids;
    address[] recipients;
    uint256[] amounts;
}
struct V3SuccessorConfig {
    address founder;
    address distributor;
    IV3CustodyEpochFixture control;
    uint256 start;
    uint256 gamingWalletMonthlyCap;
    V3SuccessorLiquidityConfig liquidity;
    V3SuccessorLegacyConfig legacy;
}

// Separate immutable deployment helpers avoid putting all child creation bytecode
// in the runtime of the atomic issuer. No token custody or generic calls.
contract V3SuccessorCoreDeployer {
    function deploy(IERC20 asset,V3SuccessorConfig calldata cfg) external returns(address founder,address gaming,V3EpochPolicyFactory expenses){
        founder=address(new V3FounderVesting(asset,cfg.founder,cfg.start));
        gaming=address(new V3GameRewardFixture(asset,cfg.distributor,cfg.founder,cfg.start,cfg.gamingWalletMonthlyCap));
        expenses=new V3EpochPolicyFactory(asset,cfg.control,cfg.start,cfg.founder);
    }
}
contract V3SuccessorConditionalDeployer {
    function liquidity(IERC20 asset,V3SuccessorLiquidityConfig calldata cfg,IV3CustodyEpochFixture control) external returns(V3DeferredLiquidityFixture v){
        IV3SyntheticPool p=cfg.builder.createPool(asset,cfg.quote);
        v=new V3DeferredLiquidityFixture(asset,cfg.quote,p,control,cfg.custody,cfg.trancheCap);
    }
    function legacy(V3SuccessorTestToken asset,V3SuccessorLegacyConfig calldata cfg) external returns(V3BoundedLegacyFixture v){
        bytes32 commitment=keccak256(abi.encode("CLIMB_V3_SYNTHETIC_LEGACY_V1",block.chainid,address(asset),cfg.opens,cfg.deadline,cfg.closure,cfg.campaign,cfg.cap,cfg.ids,cfg.recipients,cfg.amounts));
        v=new V3BoundedLegacyFixture(IV3BurnableAsset(address(asset)),commitment,cfg.opens,cfg.deadline,cfg.closure);
    }
}

/// @notice Offline integration of the existing successor fixtures, not a production
/// token. No real multisig, DEX adapter, Solana authorization, or live eligibility.
contract V3AtomicSuccessorFixture {
    error InvalidConfig();
    address public immutable creator;
    V3SuccessorCoreDeployer public immutable core;
    V3SuccessorConditionalDeployer public immutable conditional;
    V3SuccessorTestToken public token;
    address[7] public vaults;
    V3EpochPolicyFactory public expenses;
    bool public used;
    event Created(address indexed token,address[7] vaults);
    constructor(){
        if(block.chainid!=84532) revert InvalidConfig();
        creator=msg.sender;
        core=new V3SuccessorCoreDeployer();
        conditional=new V3SuccessorConditionalDeployer();
    }
    function create(V3SuccessorConfig calldata cfg) external returns(V3SuccessorTestToken asset){
        if(msg.sender!=creator||used||block.chainid!=84532||cfg.founder==address(0)||cfg.distributor==address(0)||cfg.founder==cfg.distributor||
           cfg.founder==address(this)||cfg.distributor==address(this)||cfg.liquidity.custody==cfg.founder||cfg.liquidity.custody==cfg.distributor||
           address(cfg.control)==cfg.founder||address(cfg.control)==cfg.distributor||
           cfg.control.isMember(cfg.founder)||cfg.control.isMember(cfg.distributor)) revert InvalidConfig();
        used=true;
        asset=new V3SuccessorTestToken();
        token=asset;
        _deployPolicies(asset,cfg);
        // No supply before all policy constructors succeed; no intermediate EOA/factory float.
        asset.issue(vaults);
        _activateLegacy(cfg.legacy);
        assert(asset.balanceOf(address(this))==0&&asset.balanceOf(msg.sender)==0&&asset.balanceOf(cfg.founder)==0&&asset.balanceOf(cfg.distributor)==0);
        emit Created(address(asset),vaults);
    }
    function _deployPolicies(V3SuccessorTestToken asset,V3SuccessorConfig calldata cfg) private {
        (address f,address g,V3EpochPolicyFactory e)=core.deploy(asset,cfg);
        expenses=e;
        vaults[0]=f;vaults[1]=g;
        vaults[2]=address(conditional.liquidity(asset,cfg.liquidity,cfg.control));
        vaults[3]=address(e.ecosystem());vaults[4]=address(e.community());vaults[5]=address(e.treasury());
        vaults[6]=address(conditional.legacy(asset,cfg.legacy));
    }
    function _activateLegacy(V3SuccessorLegacyConfig calldata cfg) private {
        V3BoundedLegacyFixture(vaults[6]).activate(cfg.ids,cfg.recipients,cfg.amounts,cfg.cap,cfg.campaign);
    }
}
