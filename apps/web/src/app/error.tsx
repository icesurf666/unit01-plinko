'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="fatal">
      <section className="fatal-card">
        <div className="fatal-kicker">Runtime fault</div>
        <h1>Something broke in the game client.</h1>
        <p>
          The server and contracts are untouched. Retry the UI; if this repeats, use the digest below
          to trace the error in logs.
        </p>
        {error.digest && <code>digest: {error.digest}</code>}
        <button onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
