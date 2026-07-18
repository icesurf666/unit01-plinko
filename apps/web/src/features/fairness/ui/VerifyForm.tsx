'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useFairnessVerifier } from '../model/useFairnessVerifier';
import { FairnessFormula } from './FairnessFormula';
import { NumberField, RiskSelect, TextField } from './VerifyFields';
import { VerifyResult } from './VerifyResult';

// Fairness verifier: recompute a drop's outcome offline with the same util the server uses.
export function VerifyForm() {
  const { fields, result, error, actions } = useFairnessVerifier();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    actions.recompute();
  }

  return (
    <main className="verify">
      <header className="verify-top">
        <Link href="/" className="back">
          ← Back to game
        </Link>
        <h1>Verify fairness</h1>
        <p className="sub">
          Recompute a drop&apos;s outcome yourself from the revealed <code>serverSeed</code>,{' '}
          <code>clientSeed</code> and <code>nonce</code>. Fully offline — no requests to the server.
        </p>
      </header>

      <form className="verify-grid" onSubmit={handleSubmit}>
        <TextField
          name="serverSeed"
          label="Server seed"
          hint="revealed after seed rotation"
          value={fields.serverSeed}
          onChange={actions.setServerSeed}
          placeholder="hex"
          describedBy={error ? 'verify-error' : undefined}
        />
        <TextField
          name="serverSeedHash"
          label="Server seed hash"
          hint="published before the drop, optional"
          value={fields.serverSeedHash}
          onChange={actions.setServerSeedHash}
          placeholder="sha256(serverSeed)"
        />
        <TextField
          name="clientSeed"
          label="Client seed"
          value={fields.clientSeed}
          onChange={actions.setClientSeed}
        />
        <NumberField
          name="nonce"
          label="Nonce"
          value={fields.nonce}
          onChange={actions.setNonceFromInput}
        />
        <RiskSelect value={fields.risk} onChange={actions.setRisk} />
        <button type="submit" className="recompute">
          Recompute Outcome
        </button>
      </form>

      {error && (
        <div id="verify-error" className="verify-err" role="alert">
          {error}
        </div>
      )}

      {result && <VerifyResult result={result} />}

      <FairnessFormula />
    </main>
  );
}
