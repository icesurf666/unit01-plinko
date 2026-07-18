import { ROWS } from '@plinko/shared';

export function FairnessFormula() {
  return (
    <section className="formula">
      <div className="h">Formula (the same util the server uses)</div>
      <pre className="mono">{`digest = HMAC_SHA256(serverSeed, \`\${clientSeed}:\${nonce}\`)
bit[r] = digest[r] & 1            // r = 0..${ROWS - 1}   (0 = L, 1 = R)
bucket = sum(bit[r])              // 0..${ROWS}
multiplier = PAYOUTS[risk][bucket]`}</pre>
    </section>
  );
}
