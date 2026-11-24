// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only asset. NOT production CLIMB; not a bridge or proof of backing.
/// @dev Deployable only on Base Sepolia. Manager must be independently reviewed
/// before the one-time binding. No upgrade path or deployer mint permission.
contract ClimbTestnetToken is ERC20 {
    error WrongChain();
    error Unauthorized();
    error InvalidManager();
    error ManagerAlreadyBound();
    error TestCapExceeded();

    uint256 public constant TEST_CAP = 1000 * 1e6;
    address public immutable binder;
    address public manager;
    event ManagerBound(address indexed manager);

    constructor() ERC20("CLIMB Testnet Only", "CLIMBTEST") {
        if (block.chainid != 84532) revert WrongChain();
        binder = msg.sender;
    }

    function decimals() public pure override returns (uint8) { return 6; }

    function bindManager(address candidate) external {
        if (msg.sender != binder) revert Unauthorized();
        if (manager != address(0)) revert ManagerAlreadyBound();
        if (candidate == address(this) || candidate.code.length == 0) revert InvalidManager();
        manager = candidate;
        emit ManagerBound(candidate);
    }

    function mint(address account, uint256 amount) external {
        if (msg.sender != manager) revert Unauthorized();
        if (amount > TEST_CAP - totalSupply()) revert TestCapExceeded();
        _mint(account, amount);
    }

    function burn(uint256 amount) external {
        if (msg.sender != manager) revert Unauthorized();
        _burn(msg.sender, amount);
    }
}
