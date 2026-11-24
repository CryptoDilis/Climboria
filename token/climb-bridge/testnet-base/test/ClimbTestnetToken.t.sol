// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

import {ClimbTestnetToken} from "../src/ClimbTestnetToken.sol";

interface Vm {
    function chainId(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}
contract MockManager {
    function credit(ClimbTestnetToken t, address account, uint256 amount) external { t.mint(account, amount); }
    function debit(ClimbTestnetToken t, uint256 amount) external { t.burn(amount); }
}
contract ClimbTestnetTokenTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ClimbTestnetToken private token;
    MockManager private manager;
    address private constant USER = address(0xBEEF);

    function setUp() public {
        vm.chainId(84532);
        token = new ClimbTestnetToken();
        manager = new MockManager();
    }
    function testInitialZeroAndSixDecimals() public view {
        require(token.totalSupply() == 0 && token.decimals() == 6 && token.manager() == address(0));
    }
    function testRejectMainnetConstructor() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbTestnetToken.WrongChain.selector);
        new ClimbTestnetToken();
    }
    function testRejectUnboundOrBinderMint() public {
        vm.expectRevert(ClimbTestnetToken.Unauthorized.selector);
        token.mint(USER, 1);
        token.bindManager(address(manager));
        vm.expectRevert(ClimbTestnetToken.Unauthorized.selector);
        token.mint(USER, 1);
    }
    function testBindingOnlyOnceAndOnlyByBinder() public {
        vm.expectRevert(ClimbTestnetToken.Unauthorized.selector);
        vm.prank(USER);
        token.bindManager(address(manager));
        vm.expectRevert(ClimbTestnetToken.InvalidManager.selector);
        token.bindManager(USER);
        vm.expectRevert(ClimbTestnetToken.InvalidManager.selector);
        token.bindManager(address(token));
        token.bindManager(address(manager));
        MockManager second = new MockManager();
        vm.expectRevert(ClimbTestnetToken.ManagerAlreadyBound.selector);
        token.bindManager(address(second));
    }
    function testMockNttMintThenTransferAndBurn() public {
        token.bindManager(address(manager));
        manager.credit(token, USER, 2e6);
        require(token.totalSupply() == 2e6 && token.balanceOf(USER) == 2e6);
        vm.expectRevert(ClimbTestnetToken.Unauthorized.selector);
        vm.prank(USER);
        token.burn(1e6);
        vm.prank(USER);
        token.approve(address(manager), 1e6);
        vm.prank(address(manager));
        require(token.transferFrom(USER, address(manager), 1e6));
        manager.debit(token, 1e6);
        require(token.totalSupply() == 1e6 && token.balanceOf(USER) == 1e6 && token.balanceOf(address(manager)) == 0);
    }
    function testCapAndUnauthorizedManager() public {
        token.bindManager(address(manager));
        MockManager other = new MockManager();
        vm.expectRevert(ClimbTestnetToken.Unauthorized.selector);
        other.credit(token, USER, 1);
        manager.credit(token, USER, token.TEST_CAP());
        vm.expectRevert(ClimbTestnetToken.TestCapExceeded.selector);
        manager.credit(token, USER, 1);
    }
}
