// Mirrors the server's SignerService with viem — prints an EIP-712 withdraw signature.
// Lives in apps/server so ESM resolves viem from apps/server/node_modules.
// usage: CHAIN_ID=.. VAULT_ADDRESS=.. TRUSTED_SIGNER_PK=.. node sign-withdraw.mjs <user> <amountUnit> <nonce> <deadline>
import { privateKeyToAccount } from 'viem/accounts';

const [user, amountUnit, nonce, deadline] = process.argv.slice(2);
const account = privateKeyToAccount(process.env.TRUSTED_SIGNER_PK);

const sig = await account.signTypedData({
  domain: {
    name: 'PlinkoVault',
    version: '1',
    chainId: Number(process.env.CHAIN_ID),
    verifyingContract: process.env.VAULT_ADDRESS,
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
  message: {
    user,
    amount: BigInt(amountUnit) * 10n ** 18n,
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
  },
});

process.stdout.write(sig);
