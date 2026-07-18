// WebAudio sound synthesis (no assets, no dependencies).
// Armed after the first click (browser autoplay policy).

let ctx: AudioContext | null = null;
let muted = false;
let lastPeg = 0;

export function initAudio(): void {
  if (ctx || typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (AC) ctx = new AC();
  if (typeof localStorage !== 'undefined') muted = localStorage.getItem('plinko_muted') === '1';
}

export function toggleMuted(): boolean {
  muted = !muted;
  if (typeof localStorage !== 'undefined') localStorage.setItem('plinko_muted', muted ? '1' : '0');
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.05): void {
  if (muted || !ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  launch(): void {
    tone(420, 0.08, 'triangle', 0.05);
  },
  peg(): void {
    const now = performance.now();
    if (now - lastPeg < 45) return; // throttle with multiple balls
    lastPeg = now;
    tone(900 + Math.random() * 300, 0.03, 'square', 0.02);
  },
  win(multiplier: number): void {
    tone(560 + Math.min(400, multiplier * 40), 0.12, 'triangle', 0.06);
  },
  lose(): void {
    tone(150, 0.18, 'sawtooth', 0.05);
  },
  berserk(): void {
    tone(120, 0.28, 'sawtooth', 0.08);
    tone(60, 0.4, 'sine', 0.09);
  },
};
