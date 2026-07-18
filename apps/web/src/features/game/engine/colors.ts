// Numeric Pixi board colors. Mirror the semantics of the CSS design tokens.
export const COLORS = {
  bg: 0x14081f,
  peg: 0xb98cff,
  ball: 0x9dff00,
  grid: 0x8a2be2,
  accent: 0x9dff00,
  secondarySoft: 0xb98cff,
  secondary: 0x8a2be2,
  alert: 0xff4e00,
} as const;

// Bucket color by multiplier (edges = green, center = purple/red).
export function bucketColor(v: number): number {
  if (v >= 5) return COLORS.accent;
  if (v >= 1.5) return COLORS.secondarySoft;
  if (v >= 1) return COLORS.secondary;
  return COLORS.alert;
}
