// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PlinkoVault — deposit vault; withdrawals via a server EIP-712 signature (ADR-5).
/// @notice The contract knows nothing about a drop's outcome — only deposits/withdrawals.
///         Internal balances are kept by the server (double-entry ledger); the contract
///         only verifies the signature.
contract PlinkoVault is EIP712, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public trustedSigner;

    /// @dev anti-replay: each withdraw nonce is single-use.
    mapping(uint256 => bool) public usedNonces;

    bytes32 private constant WITHDRAW_TYPEHASH =
        keccak256("Withdraw(address user,uint256 amount,uint256 nonce,uint256 deadline)");

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 nonce);
    event TrustedSignerUpdated(address indexed signer);

    error DeadlinePassed();
    error NonceUsed();
    error BadSignature();

    constructor(IERC20 _token, address _trustedSigner)
        EIP712("PlinkoVault", "1")
        Ownable(msg.sender)
    {
        token = _token;
        trustedSigner = _trustedSigner;
        emit TrustedSignerUpdated(_trustedSigner);
    }

    /// @notice Deposit via classic approve + transferFrom.
    function deposit(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice One-step deposit: permit signature (EIP-2612) + transferFrom.
    function depositWithPermit(uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
    {
        // Do not revert if permit was already applied (front-run/replay) — better UX.
        try IERC20Permit(address(token)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw with a server signature: deadline + anti-replay nonce + EIP-712.
    function withdraw(uint256 amount, uint256 nonce, uint256 deadline, bytes calldata sig) external {
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (usedNonces[nonce]) revert NonceUsed();

        bytes32 structHash =
            keccak256(abi.encode(WITHDRAW_TYPEHASH, msg.sender, amount, nonce, deadline));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), sig);
        if (signer != trustedSigner) revert BadSignature();

        usedNonces[nonce] = true; // effects before interaction (CEI)
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, nonce);
    }

    /// @notice Rotate the server withdraw-signing key.
    function setTrustedSigner(address signer) external onlyOwner {
        trustedSigner = signer;
        emit TrustedSignerUpdated(signer);
    }

    /// @notice EIP-712 domain separator (for the client/server when signing).
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
