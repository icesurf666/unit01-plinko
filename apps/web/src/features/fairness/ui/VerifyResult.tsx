import { ROWS, type VerifiedDrop } from '@plinko/shared';

export function VerifyResult({ result }: { result: VerifiedDrop }) {
  return (
    <section className="verify-res" aria-live="polite">
      {result.hashMatch !== null && (
        <div className={`badge ${result.hashMatch ? 'ok' : 'bad'}`}>
          {result.hashMatch ? 'Hash Match' : 'Hash Mismatch'}
        </div>
      )}
      <div className="big-mult">{result.multiplier}x</div>
      <div className="res-line">
        Bucket: <b>{result.bucket}</b> of {ROWS}
      </div>
      <div className="path-row" aria-label="Drop path">
        {result.path.map((bit, i) => (
          <span key={`${i}-${bit}`} className={`chip ${bit ? 'r' : 'l'}`}>
            {bit ? 'R' : 'L'}
          </span>
        ))}
      </div>
      <div className="res-line mono small">sha256(serverSeed) = {result.computedHash}</div>
    </section>
  );
}
