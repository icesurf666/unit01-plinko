// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PlinkoVault} from "../src/PlinkoVault.sol";
import {UnitToken} from "../src/UnitToken.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PlinkoVaultTest is Test {
    UnitToken token;
    PlinkoVault vault;

    uint256 signerPk = 0xA11CE;
    address signer;
    address user = address(0xBEEF);

    bytes32 constant WITHDRAW_TYPEHASH =
        keccak256("Withdraw(address user,uint256 amount,uint256 nonce,uint256 deadline)");

    function setUp() public {
        signer = vm.addr(signerPk);
        token = new UnitToken();
        vault = new PlinkoVault(IERC20(address(token)), signer);

        // give the player tokens and fund the vault with liquidity
        deal(address(token), user, 10_000e18);
        deal(address(token), address(vault), 100_000e18);
    }

    // ── withdraw signature (EIP-712) ─────────────────────────────────
    function _signWithdraw(address who, uint256 amount, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("PlinkoVault")),
                keccak256(bytes("1")),
                block.chainid,
                address(vault)
            )
        );
        bytes32 structHash = keccak256(abi.encode(WITHDRAW_TYPEHASH, who, amount, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    // ── deposit ──────────────────────────────────────────────────────
    function test_Deposit_IncreasesVaultBalance() public {
        uint256 before = token.balanceOf(address(vault));
        vm.startPrank(user);
        token.approve(address(vault), 500e18);
        vault.deposit(500e18);
        vm.stopPrank();
        assertEq(token.balanceOf(address(vault)), before + 500e18);
    }

    function test_DepositWithPermit_NoApproveTx() public {
        uint256 amount = 300e18;
        uint256 deadline = block.timestamp + 1 hours;

        // player's permit signature (EIP-2612)
        bytes32 permitTypehash = keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );
        bytes32 structHash =
            keccak256(abi.encode(permitTypehash, user, address(vault), amount, token.nonces(user), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));

        // sign with the player's key
        uint256 userPk = 0xB0B;
        address u = vm.addr(userPk);
        deal(address(token), u, 1_000e18);
        structHash =
            keccak256(abi.encode(permitTypehash, u, address(vault), amount, token.nonces(u), deadline));
        digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);

        uint256 before = token.balanceOf(address(vault));
        vm.prank(u);
        vault.depositWithPermit(amount, deadline, v, r, s);
        assertEq(token.balanceOf(address(vault)), before + amount);
    }

    // ── withdraw ─────────────────────────────────────────────────────
    function test_Withdraw_ValidSignature() public {
        uint256 amount = 200e18;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signWithdraw(user, amount, nonce, deadline);

        uint256 userBefore = token.balanceOf(user);
        vm.prank(user);
        vault.withdraw(amount, nonce, deadline, sig);

        assertEq(token.balanceOf(user), userBefore + amount);
        assertTrue(vault.usedNonces(nonce));
    }

    function test_Withdraw_RevertsOnReplay() public {
        uint256 amount = 100e18;
        uint256 nonce = 7;
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signWithdraw(user, amount, nonce, deadline);

        vm.prank(user);
        vault.withdraw(amount, nonce, deadline, sig);

        vm.prank(user);
        vm.expectRevert(PlinkoVault.NonceUsed.selector);
        vault.withdraw(amount, nonce, deadline, sig);
    }

    function test_Withdraw_RevertsOnWrongSigner() public {
        uint256 amount = 100e18;
        uint256 nonce = 2;
        uint256 deadline = block.timestamp + 1 hours;

        // signed with a wrong key
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("PlinkoVault")),
                keccak256(bytes("1")),
                block.chainid,
                address(vault)
            )
        );
        bytes32 structHash = keccak256(abi.encode(WITHDRAW_TYPEHASH, user, amount, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xDEAD, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(user);
        vm.expectRevert(PlinkoVault.BadSignature.selector);
        vault.withdraw(amount, nonce, deadline, badSig);
    }

    function test_Withdraw_RevertsAfterDeadline() public {
        uint256 amount = 100e18;
        uint256 nonce = 3;
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signWithdraw(user, amount, nonce, deadline);

        vm.warp(deadline + 1);
        vm.prank(user);
        vm.expectRevert(PlinkoVault.DeadlinePassed.selector);
        vault.withdraw(amount, nonce, deadline, sig);
    }

    function test_Withdraw_RevertsIfAmountExceedsVault() public {
        uint256 amount = 1_000_000e18; // more than the vault balance
        uint256 nonce = 4;
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signWithdraw(user, amount, nonce, deadline);

        vm.prank(user);
        vm.expectRevert(); // SafeERC20: insufficient funds
        vault.withdraw(amount, nonce, deadline, sig);
    }

    // ── access ───────────────────────────────────────────────────────
    function test_SetTrustedSigner_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        vault.setTrustedSigner(user);

        vault.setTrustedSigner(address(0x1234));
        assertEq(vault.trustedSigner(), address(0x1234));
    }

    // ── fuzz ─────────────────────────────────────────────────────────
    function testFuzz_Withdraw(uint96 amount, uint256 nonce) public {
        amount = uint96(bound(amount, 1, 100_000e18));
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signWithdraw(user, amount, nonce, deadline);

        uint256 userBefore = token.balanceOf(user);
        vm.prank(user);
        vault.withdraw(amount, nonce, deadline, sig);
        assertEq(token.balanceOf(user), userBefore + amount);
        assertTrue(vault.usedNonces(nonce));
    }
}
