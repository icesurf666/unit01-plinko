'use client';

import { useState } from 'react';
import { verifyFairDrop, type Risk, type VerifiedDrop } from '@plinko/shared';
import { parseNonceInput } from './nonceInput';

export interface FairnessVerifierFields {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  risk: Risk;
}

export interface FairnessVerifierActions {
  recompute: () => void;
  setServerSeed: (value: string) => void;
  setServerSeedHash: (value: string) => void;
  setClientSeed: (value: string) => void;
  setNonceFromInput: (value: string) => void;
  setRisk: (risk: Risk) => void;
}

export interface FairnessVerifierState {
  fields: FairnessVerifierFields;
  result: VerifiedDrop | null;
  error: string;
  actions: FairnessVerifierActions;
}

export function useFairnessVerifier(): FairnessVerifierState {
  const [serverSeed, setServerSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [clientSeed, setClientSeed] = useState('default');
  const [nonce, setNonce] = useState(1);
  const [risk, setRisk] = useState<Risk>('med');
  const [result, setResult] = useState<VerifiedDrop | null>(null);
  const [error, setError] = useState('');

  function recompute() {
    setError('');
    try {
      setResult(verifyFairDrop(serverSeed, clientSeed, nonce, risk, serverSeedHash));
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }

  return {
    fields: {
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      risk,
    },
    result,
    error,
    actions: {
      recompute,
      setServerSeed: (value: string) => setServerSeed(value.trim()),
      setServerSeedHash: (value: string) => setServerSeedHash(value.trim()),
      setClientSeed,
      setNonceFromInput: (value: string) => setNonce(parseNonceInput(value)),
      setRisk,
    },
  };
}
