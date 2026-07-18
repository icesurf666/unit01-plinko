'use client';

import { clampInteger, parseIntegerInput } from '../lib/number';

// Reusable numeric stepper (−/field/+). Styles: .stepper in globals.css.
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  const clamp = (n: number) => clampInteger(n, { min });
  return (
    <div className="stepper">
      <button onClick={() => onChange(clamp(value - step))}>−</button>
      <input
        className="mono"
        value={value}
        onChange={(e) => onChange(parseIntegerInput(e.target.value, { min, fallback: min }))}
      />
      <button onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}
