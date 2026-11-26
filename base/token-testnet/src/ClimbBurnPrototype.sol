// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only fixed-issuance prototype. Not official CLIMB or migration infrastructure.
contract ClimbBurnPrototype is ERC20 {
    error WrongChain();
    uint256 public constant INITIAL_TEST_SUPPLY = 1000 * 1e6;
    constructor() ERC20("CLIMB Burn Test Only", "CLIMBBURNTEST") {
        if (block.chainid != 84532) revert WrongChain();
        _mint(msg.sender, INITIAL_TEST_SUPPLY);
    }
    function decimals() public pure override returns (uint8) { return 6; }
    /// @notice Only the calling holder can burn its own balance.
    function burn(uint256 amount) external { _burn(msg.sender, amount); }
    function totalBurned() external view returns (uint256) {
        return INITIAL_TEST_SUPPLY - totalSupply();
    }
}
