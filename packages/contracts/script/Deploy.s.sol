// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {UnitToken} from "../src/UnitToken.sol";
import {PlinkoVault} from "../src/PlinkoVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploy to Base Sepolia: forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address trustedSigner = vm.envAddress("TRUSTED_SIGNER");

        vm.startBroadcast(pk);
        UnitToken token = new UnitToken();
        PlinkoVault vault = new PlinkoVault(IERC20(address(token)), trustedSigner);
        vm.stopBroadcast();

        console2.log("UnitToken  :", address(token));
        console2.log("PlinkoVault:", address(vault));
        console2.log("trustedSigner:", trustedSigner);
    }
}
