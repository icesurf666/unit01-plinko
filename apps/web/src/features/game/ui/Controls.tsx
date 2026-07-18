'use client';

import { useEffect, useRef, useState } from 'react';
import { RISKS } from '@plinko/shared';
import { useBalance, useGameActions, useRisk, useStake } from '../model/store';
import { AUTO_DROP_MS, STAKE_STEP } from '@/shared/config';
import { Stepper } from '@/shared/ui/Stepper';

export function Controls({ onDrop }: { onDrop: () => void }) {
  const stake = useStake();
  const risk = useRisk();
  const balance = useBalance();
  const { setStake, setRisk } = useGameActions();
  const [auto, setAuto] = useState(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => onDropRef.current(), AUTO_DROP_MS);
    return () => clearInterval(id);
  }, [auto]);

  const canDrop = balance >= stake;

  return (
    <div className="controls">
      <div className="field">
        <label>Bet amount</label>
        <Stepper value={stake} onChange={setStake} step={STAKE_STEP} />
      </div>

      <div className="field">
        <label>Risk level</label>
        <div className="risk">
          {RISKS.map((r) => (
            <button key={r} className={r === risk ? 'on' : ''} onClick={() => setRisk(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <button className="dropbtn" disabled={!canDrop} onClick={onDrop}>
        {canDrop ? 'Drop ball' : 'Low balance'}
      </button>

      <label className="autorow">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        Auto-drop
      </label>
    </div>
  );
}
