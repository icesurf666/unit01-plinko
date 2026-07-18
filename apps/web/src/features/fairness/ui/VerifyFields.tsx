import { isRisk, RISKS, type Risk } from '@plinko/shared';

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  hint?: string;
  placeholder?: string;
}

export function TextField({
  label,
  name,
  value,
  onChange,
  describedBy,
  hint,
  placeholder,
}: TextFieldProps) {
  return (
    <label>
      {label} {hint && <span>({hint})</span>}
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-describedby={describedBy}
      />
    </label>
  );
}

export function NumberField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function RiskSelect({
  value,
  onChange,
}: {
  value: Risk;
  onChange: (risk: Risk) => void;
}) {
  function handleChange(value: string): void {
    if (isRisk(value)) onChange(value);
  }

  return (
    <label>
      Risk level
      <select name="risk" value={value} onChange={(e) => handleChange(e.target.value)}>
        {RISKS.map((risk) => (
          <option key={risk} value={risk}>
            {risk}
          </option>
        ))}
      </select>
    </label>
  );
}
