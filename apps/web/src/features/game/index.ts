// Public API of the "game" feature. PlinkoBoard is intentionally NOT re-exported —
// it is loaded dynamically (ssr:false) so Pixi stays out of the SSR graph.
export { Controls } from './ui/Controls';
export { HowTo } from './ui/HowTo';
export { launchBall } from './model/bridge';
export { useBalance, useStake, useRisk, useGameActions, useGameStore } from './model/store';
