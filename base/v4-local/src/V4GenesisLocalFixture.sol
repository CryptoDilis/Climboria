// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice LOCAL-ONLY sealed balance fixture. Not a release vault or production custody.
/// @dev No withdrawal, approval, upgrade, or generic call path. Never fund with real assets.
contract V4ClosedReserveFixture {
    address public immutable token;
    uint256 public immutable reserveId;
    constructor(uint256 id) { token = msg.sender; reserveId = id; }
}

/// @notice Local genesis accounting experiment; deliberately not deployable on Base.
/// @dev Community split is four separate sealed reserves. No reward signer or gameplay claims.
/// All release policies and actual Safe integration are later work, not implied by this fixture.
contract V4GenesisLocalFixture is ERC20 {
    error InvalidGenesis();
    uint256 public constant INITIAL_SUPPLY = 888888888000000;
    uint256 public constant MARKETING_POOL = 62222222160000;
    uint256 public constant MARKETING_INITIAL = 3111111108000;
    uint256 public constant MARKETING_RESTRICTED = MARKETING_POOL - MARKETING_INITIAL;
    uint256 public constant RESERVE_COUNT = 11;
    address public immutable marketingWallet;
    address[11] public reserves;
    event GenesisReserve(uint256 indexed reserveId,address indexed reserve,uint256 amount);
    event GenesisMarketing(address indexed recipient,uint256 amount);
    // Canonical IDs: 0 staking, 1 tournaments, 2 incentives, 3 future programs,
    // 4 liquidity, 5 ecosystem, 6 treasury, 7 team, 8 marketing reserve,
    // 9 advisors, 10 legacy. Marketing initial tranche is separate from index 8.
    function reserveAmount(uint256 id) public pure returns(uint256) {
        uint256[11] memory amounts = [
            uint256(106666666560000), 71111111040000, 53333333280000, 35555555520000,
            177777777600000, 159999999840000, 106666666560000, 88888888800000,
            MARKETING_RESTRICTED, 17777777760000, 8888888880000
        ];
        if(id >= RESERVE_COUNT) revert InvalidGenesis();
        return amounts[id];
    }
    constructor(address marketing) ERC20("CLIMB V4 Local Test Only","CLIMBV4LOCAL") {
        // Local Foundry chain only; no Sepolia or Mainnet deployment.
        if(block.chainid != 31337 || uint160(marketing) <= 0xffff ||
           marketing == msg.sender || marketing == address(this) ||
           marketing.code.length != 0) revert InvalidGenesis();
        marketingWallet = marketing;
        for(uint256 i; i < RESERVE_COUNT; ++i) {
            address r = address(new V4ClosedReserveFixture(i));
            if(r == marketing || r == msg.sender || r == address(this)) revert InvalidGenesis();
            reserves[i] = r;
            uint256 a = reserveAmount(i);
            _mint(r,a);
            emit GenesisReserve(i,r,a);
        }
        _mint(marketing,MARKETING_INITIAL);
        emit GenesisMarketing(marketing,MARKETING_INITIAL);
        assert(totalSupply() == INITIAL_SUPPLY);
        assert(balanceOf(marketing) == MARKETING_INITIAL);
        assert(balanceOf(msg.sender) == 0 && balanceOf(address(this)) == 0);
    }
    function decimals() public pure override returns(uint8) { return 6; }
    // Preserve V3 holder-controlled burn for later proof-based migration integration.
    // No external mint or issuer role survives construction.
    function burn(uint256 amount) external { _burn(msg.sender,amount); }
}
