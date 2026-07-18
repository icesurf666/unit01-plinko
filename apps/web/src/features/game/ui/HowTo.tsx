// Hint strip above the board: bet → DROP → bucket.
export function HowTo() {
  const arrow = <span style={{ color: 'var(--text-dim)' }}>→</span>;
  return (
    <div className="howto">
      <span className="step">1</span> Choose bet and risk {arrow}
      <span className="step">2</span> <b>Drop</b> {arrow}
      <span className="step">3</span> Land in a bucket · payout = <b>bet × multiplier</b>
    </div>
  );
}
