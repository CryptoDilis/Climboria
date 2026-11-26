// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {ClimbBurnPrototype} from "../src/ClimbBurnPrototype.sol";
interface VmBurn {
    function chainId(uint256) external;
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectEmit(bool,bool,bool,bool,address) external;
}
contract ClimbBurnPrototypeTest {
    VmBurn private constant vm = VmBurn(address(uint160(uint256(keccak256("hevm cheat code")))));
    ClimbBurnPrototype private token;
    address private constant USER = address(0xBEEF);
    address private constant OTHER = address(0xCAFE);
    event Transfer(address indexed from, address indexed to, uint256 value);
    function setUp() public {
        vm.chainId(84532);
        token = new ClimbBurnPrototype();
    }
    function testFixedInitialSupply() public view {
        require(token.decimals() == 6 && token.totalSupply() == 1000e6);
        require(token.balanceOf(address(this)) == 1000e6 && token.totalBurned() == 0);
    }
    function testRejectMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(ClimbBurnPrototype.WrongChain.selector);
        new ClimbBurnPrototype();
    }
    function testTransferNoTax() public {
        require(token.transfer(USER, 10e6));
        require(token.balanceOf(USER) == 10e6 && token.balanceOf(address(this)) == 990e6);
        require(token.totalSupply() == 1000e6 && token.totalBurned() == 0);
    }
    function testHolderBurnAndEvent() public {
        token.transfer(USER, 10e6);
        vm.expectEmit(true,true,false,true,address(token));
        emit Transfer(USER,address(0),3e6);
        vm.prank(USER);
        token.burn(3e6);
        require(token.balanceOf(USER) == 7e6 && token.totalSupply() == 997e6);
        require(token.totalBurned() == 3e6);
    }
    function testRejectBurnBeyondOwnBalance() public {
        vm.prank(USER);
        vm.expectRevert();
        token.burn(1);
        require(token.totalSupply() == 1000e6 && token.balanceOf(address(this)) == 1000e6);
    }
    function testNoMintOrForcedBurnSelector() public {
        token.burn(1e6);
        (bool minted,) = address(token).call(abi.encodeWithSignature("mint(address,uint256)", USER, 1e6));
        (bool forced,) = address(token).call(abi.encodeWithSignature("burnFrom(address,uint256)", address(this), 1e6));
        require(!minted && !forced && token.totalSupply() == 999e6);
    }
    function testAllowanceTransferNoTaxAndNoImplicitBurn() public {
        token.transfer(USER, 10e6);
        vm.prank(USER);
        token.approve(OTHER, 3e6);
        vm.prank(OTHER);
        require(token.transferFrom(USER, OTHER, 3e6));
        require(token.allowance(USER,OTHER) == 0 && token.balanceOf(USER) == 7e6 && token.balanceOf(OTHER) == 3e6);
        require(token.totalSupply() == 1000e6);
    }
    function testRepeatedAndFullBurnNoReissue() public {
        token.burn(0);
        token.burn(1);
        token.burn(1000e6 - 1);
        require(token.totalSupply() == 0 && token.totalBurned() == 1000e6);
        vm.expectRevert();
        token.burn(1);
    }
}
