// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title UNIT — test game currency (ERC20Permit + a public faucet).
/// @notice Unlimited demo currency; deposit without an approve tx via permit (EIP-2612).
contract UnitToken is ERC20, ERC20Permit {
    uint256 public constant FAUCET_AMOUNT = 1000e18;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucet;

    error FaucetCooldown(uint256 availableAt);

    constructor() ERC20("UNIT", "UNIT") ERC20Permit("UNIT") {}

    /// @notice Mint FAUCET_AMOUNT to yourself, at most once per FAUCET_COOLDOWN.
    function faucet() external {
        uint256 last = lastFaucet[msg.sender];
        if (last != 0 && block.timestamp < last + FAUCET_COOLDOWN) {
            revert FaucetCooldown(last + FAUCET_COOLDOWN);
        }
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
