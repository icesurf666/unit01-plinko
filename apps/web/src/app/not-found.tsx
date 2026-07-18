import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="fatal">
      <section className="fatal-card">
        <div className="fatal-kicker">404</div>
        <h1>Route not found.</h1>
        <p>This demo has two primary surfaces: the Plinko board and the fairness verifier.</p>
        <Link href="/">Back to game</Link>
      </section>
    </main>
  );
}
