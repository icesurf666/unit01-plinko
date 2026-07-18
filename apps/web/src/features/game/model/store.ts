import { create } from 'zustand';
import type { Risk } from '@plinko/shared';
import { DEFAULT_BALANCE, DEFAULT_STAKE } from '@/shared/config';

interface GameState {
  balance: number;
  stake: number;
  risk: Risk;
}

interface GameActions {
  setBalance: (n: number) => void;
  setStake: (n: number) => void;
  setRisk: (r: Risk) => void;
}

// Actions live in a separate object with a stable reference, so components that
// only need actions do not re-render on state changes.
const useGameStore = create<GameState & { actions: GameActions }>((set) => ({
  balance: DEFAULT_BALANCE,
  stake: DEFAULT_STAKE,
  risk: 'med',
  actions: {
    setBalance: (balance) => set({ balance }),
    setStake: (stake) => set({ stake: Math.max(1, Math.round(stake)) }),
    setRisk: (risk) => set({ risk }),
  },
}));

// Atomic selectors — a component subscribes to just the slice it needs
// instead of the whole store (no extra re-renders on every balance tick).
export const useBalance = () => useGameStore((s) => s.balance);
export const useStake = () => useGameStore((s) => s.stake);
export const useRisk = () => useGameStore((s) => s.risk);
export const useGameActions = () => useGameStore((s) => s.actions);

// Imperative access outside React (handleDrop): useGameStore.getState().
export { useGameStore };
