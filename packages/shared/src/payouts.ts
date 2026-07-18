// Game config — source of truth for both the server resolver and the UI/verifier.
// Part of the game code (versioned with it), not a row in the DB.

export const ROWS = 12; // peg rows → ROWS+1 = 13 buckets
export const BIG_WIN_MULT = 10; // threshold for a big_win in the feed

export const RISKS = ['low', 'med', 'high'] as const;
export type Risk = (typeof RISKS)[number];
const RISK_VALUES: readonly string[] = RISKS;

export function isRisk(value: unknown): value is Risk {
  return typeof value === 'string' && RISK_VALUES.includes(value);
}

// 13 multipliers per risk profile. Center < 1.0 = house edge, edges are big & rare.
export const PAYOUTS: Record<Risk, number[]> = {
  low: [3, 1.6, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.6, 3],
  med: [13, 3, 1.9, 1.2, 1, 0.7, 0.4, 0.7, 1, 1.2, 1.9, 3, 13],
  high: [170, 24, 8, 2, 0.5, 0.3, 0.2, 0.3, 0.5, 2, 8, 24, 170],
};
