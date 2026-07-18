// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {UnitToken} from "../src/UnitToken.sol";

contract UnitTokenTest is Test {
    UnitToken token;
    address user = address(0xBEEF);

    function setUp() public {
        token = new UnitToken();
    }

    function test_Faucet_Mints() public {
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT());
    }

    function test_Faucet_RevertsWithinCooldown() public {
        vm.prank(user);
        token.faucet();

        vm.prank(user);
        vm.expectRevert();
        token.faucet();
    }

    function test_Faucet_WorksAfterCooldown() public {
        vm.prank(user);
        token.faucet();

        vm.warp(block.timestamp + token.FAUCET_COOLDOWN());
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT() * 2);
    }
}
