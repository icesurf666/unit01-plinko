'use client';

import { useEffect, useRef } from 'react';
import type { Risk } from '@plinko/shared';
import { setLauncher } from '../model/bridge';
import { sfx } from '@/shared/lib/sound';
import { PlinkoEngine } from '../engine/engine';

export function PlinkoBoard({ risk }: { risk: Risk }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PlinkoEngine | null>(null);
  const riskRef = useRef(risk);

  // Redraw the buckets when the risk changes.
  useEffect(() => {
    riskRef.current = risk;
    engineRef.current?.setRisk(risk);
  }, [risk]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = new PlinkoEngine(host, riskRef.current, {
      onPeg: () => sfx.peg(),
      onLand: (_bucket, multiplier, bigWin) => {
        if (bigWin) sfx.berserk();
        else if (multiplier >= 1) sfx.win(multiplier);
        else sfx.lose();
      },
    });
    engineRef.current = engine;
    void engine.init();

    setLauncher((path, bucket, multiplier, onLand) => engine.drop(path, bucket, multiplier, onLand));

    return () => {
      setLauncher(null);
      engineRef.current = null;
      engine.destroy();
    };
  }, []);

  return <div ref={hostRef} className="board-host" />;
}
