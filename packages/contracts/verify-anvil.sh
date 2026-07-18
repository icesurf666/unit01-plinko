#!/usr/bin/env bash
# Local web3 interop check: server signature (viem) ↔ PlinkoVault.withdraw.
# Everything runs on a local anvil, no internet required.
set -euo pipefail

FORGE=~/.foundry/bin/forge
ANVIL=~/.foundry/bin/anvil
CAST=~/.foundry/bin/cast
RPC=http://localhost:8545
HERE="$(cd "$(dirname "$0")" && pwd)"
SIGN_SCRIPT="$HERE/../../apps/server/scripts/sign-withdraw.mjs"

# anvil accounts (deterministic)
DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # #0
SIGNER_PK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d    # #1 (trustedSigner)
SIGNER_ADDR=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
USER_PK=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a      # #2
USER_ADDR=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

bal() { $CAST call "$1" "balanceOf(address)(uint256)" "$2" --rpc-url $RPC | awk '{print $1}'; }

echo "▶ start anvil…"
$ANVIL --silent &
ANVIL_PID=$!
trap "kill $ANVIL_PID 2>/dev/null || true" EXIT
sleep 2

echo "▶ deploy UnitToken…"
TOKEN=$($FORGE create src/UnitToken.sol:UnitToken --rpc-url $RPC --private-key $DEPLOYER_PK --broadcast --json | python3 -c "import sys,json;print(json.load(sys.stdin)['deployedTo'])")
echo "  UnitToken   = $TOKEN"

echo "▶ deploy PlinkoVault (trustedSigner = #1)…"
VAULT=$($FORGE create src/PlinkoVault.sol:PlinkoVault --rpc-url $RPC --private-key $DEPLOYER_PK --broadcast --json --constructor-args $TOKEN $SIGNER_ADDR | python3 -c "import sys,json;print(json.load(sys.stdin)['deployedTo'])")
echo "  PlinkoVault = $VAULT"

echo "▶ fund the vault with liquidity (deployer faucet → transfer 500 UNIT)…"
$CAST send $TOKEN "faucet()" --rpc-url $RPC --private-key $DEPLOYER_PK >/dev/null
$CAST send $TOKEN "transfer(address,uint256)" $VAULT 500000000000000000000 --rpc-url $RPC --private-key $DEPLOYER_PK >/dev/null
echo "  vault UNIT  = $(bal $TOKEN $VAULT)"

echo "▶ server-style withdraw signature (viem) for 100 UNIT to #2…"
SIG=$(CHAIN_ID=31337 VAULT_ADDRESS=$VAULT TRUSTED_SIGNER_PK=$SIGNER_PK \
  node "$SIGN_SCRIPT" $USER_ADDR 100 1 9999999999)
echo "  sig = ${SIG:0:22}…"

echo "▶ #2 calls Vault.withdraw with that signature…"
BEFORE=$(bal $TOKEN $USER_ADDR)
$CAST send $VAULT "withdraw(uint256,uint256,uint256,bytes)" 100000000000000000000 1 9999999999 $SIG \
  --rpc-url $RPC --private-key $USER_PK >/dev/null
AFTER=$(bal $TOKEN $USER_ADDR)

echo "  #2 balance before: $BEFORE"
echo "  #2 balance after:  $AFTER"
if [ "$AFTER" = "100000000000000000000" ]; then
  echo "✅ SERVER SIGNATURE ACCEPTED BY THE CONTRACT — 100 UNIT withdrawn"
else
  echo "❌ failed"; exit 1
fi

echo "▶ anti-replay check (same nonce again → revert)…"
if $CAST send $VAULT "withdraw(uint256,uint256,uint256,bytes)" 100000000000000000000 1 9999999999 $SIG \
  --rpc-url $RPC --private-key $USER_PK >/dev/null 2>&1; then
  echo "❌ replay went through — bad"; exit 1
else
  echo "✅ replay rejected (NonceUsed)"
fi
echo "── server ↔ contract interop confirmed ──"
