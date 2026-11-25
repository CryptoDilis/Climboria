// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

// Copied into the pinned upstream evm/test directory by CI only.
// Real NTT manager, local dummy transceiver. NOT guardian or cross-chain proof.
import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {NttManager} from "../src/NttManager/NttManager.sol";
import {IManagerBase} from "../src/interfaces/IManagerBase.sol";
import {TransceiverStructs} from "../src/libraries/TransceiverStructs.sol";
import {PausableUpgradeable} from "../src/libraries/PausableUpgradeable.sol";
import {TrimmedAmountLib} from "../src/libraries/TrimmedAmount.sol";
import {DummyTransceiver} from "./mocks/DummyTransceiver.sol";
import {ClimbTestnetToken} from "../src/ClimbTestnetToken.sol";

contract ClimbNttManagerLocalIntegrationTest is Test {
    ClimbTestnetToken private token;
    NttManager private manager;
    DummyTransceiver private transceiver;
    address private constant USER = address(0xBEEF);
    uint16 private constant SOLANA = 1;
    uint16 private constant BASE_SEPOLIA = 10004;
    bytes32 private constant MOCK_SOLANA_MANAGER = bytes32(uint256(0x1234));
    bytes32 private constant MOCK_SOLANA_MINT = bytes32(uint256(0x5678));

    function setUp() public {
        vm.chainId(84532);
        token = new ClimbTestnetToken();
        NttManager implementation = new NttManager(
            address(token), IManagerBase.Mode.BURNING, BASE_SEPOLIA, 1 days, false
        );
        manager = NttManager(address(new ERC1967Proxy(address(implementation), "")));
        manager.initialize();
        transceiver = new DummyTransceiver(address(manager));
        manager.setTransceiver(address(transceiver));
        manager.setThreshold(1);
        manager.setPeer(SOLANA, MOCK_SOLANA_MANAGER, 6, 10e6);
        manager.setOutboundLimit(10e6);
        token.bindManager(address(manager));
    }

    function message(uint256 id, uint256 amount) private pure returns (TransceiverStructs.NttManagerMessage memory) {
        return TransceiverStructs.NttManagerMessage({
            id: bytes32(id),
            sender: bytes32(uint256(0xABCD)),
            payload: TransceiverStructs.encodeNativeTokenTransfer(
                TransceiverStructs.NativeTokenTransfer({
                    amount: TrimmedAmountLib.trim(amount, 6, 6),
                    sourceToken: MOCK_SOLANA_MINT,
                    to: bytes32(uint256(uint160(USER))),
                    toChain: BASE_SEPOLIA,
                    additionalPayload: ""
                })
            )
        });
    }

    function mockAttest(TransceiverStructs.NttManagerMessage memory m) private {
        // Local simulation of a trusted transceiver only, no real VAA.
        vm.prank(address(transceiver));
        manager.attestationReceived(SOLANA, MOCK_SOLANA_MANAGER, m);
    }

    function testInboundMintReplayAndOutboundBurn() public {
        assertEq(token.totalSupply(), 0);
        TransceiverStructs.NttManagerMessage memory m = message(1, 2e6);
        mockAttest(m);
        assertEq(token.balanceOf(USER), 2e6);
        assertEq(token.totalSupply(), 2e6);
        // Already executed approved digest cannot mint again.
        manager.executeMsg(SOLANA, MOCK_SOLANA_MANAGER, m);
        assertEq(token.totalSupply(), 2e6);
        vm.startPrank(USER);
        token.approve(address(manager), 1e6);
        manager.transfer(1e6, SOLANA, bytes32(uint256(0xABCD)));
        vm.stopPrank();
        assertEq(token.balanceOf(USER), 1e6);
        assertEq(token.totalSupply(), 1e6);
        assertEq(token.balanceOf(address(manager)), 0);
    }

    function testUntrustedAttestationAndWrongPeerCannotMint() public {
        TransceiverStructs.NttManagerMessage memory m = message(2, 1e6);
        vm.expectRevert();
        manager.attestationReceived(SOLANA, MOCK_SOLANA_MANAGER, m);
        vm.expectRevert();
        vm.prank(address(transceiver));
        manager.attestationReceived(SOLANA, bytes32(uint256(0x9999)), m);
        vm.expectRevert();
        manager.executeMsg(SOLANA, MOCK_SOLANA_MANAGER, m);
        assertEq(token.totalSupply(), 0);
    }

    // Diagnostic: a passing test here means the upstream quote defect was reproduced,
    // NOT that the issue was fixed or that deployment is approved.
    function testKnownSparseTransceiverQuoteFailure() public {
        (uint256[] memory initialQuotes, uint256 initialTotal) =
            manager.quoteDeliveryPrice(SOLANA, hex"00");
        assertEq(initialQuotes.length, 1);
        assertEq(initialTotal, 0);
        mockAttest(message(5, 2e6));

        DummyTransceiver second = new DummyTransceiver(address(manager));
        manager.setTransceiver(address(second));
        manager.removeTransceiver(address(transceiver));

        // quoteDeliveryPrice allocates by enabled count, then indexes by registered index.
        // Exact Solidity array-bounds panic (not an arbitrary revert).
        vm.expectRevert(abi.encodeWithSignature("Panic(uint256)", uint256(0x32)));
        manager.quoteDeliveryPrice(SOLANA, hex"00");
        assertEq(token.balanceOf(USER), 2e6);
        assertEq(token.totalSupply(), 2e6);

        // The actual transfer path allocates by registered count instead.
        // Local mock transceiver only; this does NOT authorize bypassing quotes live.
        vm.startPrank(USER);
        token.approve(address(manager), 1e6);
        manager.transfer(1e6, SOLANA, bytes32(uint256(0xABCD)));
        vm.stopPrank();
        assertEq(token.balanceOf(USER), 1e6);
        assertEq(token.totalSupply(), 1e6);
        assertEq(token.balanceOf(address(manager)), 0);
        emit log_string("CLIMB_KNOWN_SPARSE_TRANSCEIVER_QUOTE_FAILURE_REPRODUCED_NO_GO");
    }

    function testPausedManagerCannotMintOrBurnThroughTransfer() public {
        mockAttest(message(3, 1e6));
        manager.pause();
        assertTrue(manager.isPaused());
        // Build the payload before arming prank/expectRevert: encoding calls a linked library.
        TransceiverStructs.NttManagerMessage memory pausedMessage = message(4, 1e6);
        vm.expectRevert(PausableUpgradeable.RequireContractIsNotPaused.selector);
        vm.prank(address(transceiver));
        manager.attestationReceived(SOLANA, MOCK_SOLANA_MANAGER, pausedMessage);
        vm.startPrank(USER);
        token.approve(address(manager), 1e6);
        vm.expectRevert(PausableUpgradeable.RequireContractIsNotPaused.selector);
        manager.transfer(1e6, SOLANA, bytes32(uint256(0xABCD)));
        vm.stopPrank();
        assertEq(token.balanceOf(USER), 1e6);
        assertEq(token.totalSupply(), 1e6);
    }
}
