import { Injectable } from '@nestjs/common';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';
import { integerEnv } from '../config/env';

// EIP-712 withdraw signature (ADR-5). Domain/types must match PlinkoVault.sol.
// TRUSTED_SIGNER_PK — server only, never shipped to the frontend.
// Default = anvil account #1 (for local runs without a .env).
const DEFAULT_SIGNER_PK =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

@Injectable()
export class SignerService {
  private readonly account = privateKeyToAccount(
    (process.env.TRUSTED_SIGNER_PK ?? DEFAULT_SIGNER_PK) as Hex,
  );
  private readonly chainId = integerEnv('CHAIN_ID', { defaultValue: 84532, min: 1 }); // Base Sepolia
  private readonly vault = (process.env.VAULT_ADDRESS ??
    '0x0000000000000000000000000000000000000000') as Hex;

  get signerAddress(): Hex {
    return this.account.address;
  }

  async signWithdraw(user: Hex, amountWei: bigint, nonce: bigint, deadline: bigint): Promise<Hex> {
    return this.account.signTypedData({
      domain: {
        name: 'PlinkoVault',
        version: '1',
        chainId: this.chainId,
        verifyingContract: this.vault,
      },
      types: {
        Withdraw: [
          { name: 'user', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Withdraw',
      message: { user, amount: amountWei, nonce, deadline },
    });
  }
}
