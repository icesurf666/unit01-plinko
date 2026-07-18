import { Application, Container, Graphics, Text } from 'pixi.js';
import { BIG_WIN_MULT, PAYOUTS, ROWS, type Risk } from '@plinko/shared';
import { COLORS, bucketColor } from './colors';

// Framework-agnostic Plinko board engine (physics + PixiJS rendering).
// The React component is a thin wrapper around it; sound is delegated via callbacks.

const G = 0.5; // "gravity"
const HOP = 2.4; // bounce off a peg

interface Ball {
  x: number;
  y: number;
  vy: number;
  row: number;
  rights: number;
  path: number[];
  bucket: number;
  multiplier: number;
  onLand: (bucket: number) => void;
  done: boolean;
  targetX: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Geom {
  W: number;
  H: number;
  cx: number;
  spacing: number;
  topY: number;
  bucketY: number;
  rowH: number;
  pegR: number;
  ballR: number;
}

export interface EngineCallbacks {
  onPeg?: () => void;
  onLand?: (bucket: number, multiplier: number, bigWin: boolean) => void;
}

export class PlinkoEngine {
  private readonly app = new Application();
  private readonly balls: Ball[] = [];
  private readonly particles: Particle[] = [];
  private geom: Geom | null = null;
  private inited = false;
  private destroyed = false;
  private ro?: ResizeObserver;
  private staticLayer?: Graphics;
  private labelLayer?: Container;
  private dynLayer?: Graphics;

  constructor(
    private readonly host: HTMLElement,
    private risk: Risk,
    private readonly cb: EngineCallbacks = {},
  ) {}

  async init(): Promise<void> {
    await this.app.init({
      background: COLORS.bg,
      antialias: true,
      resizeTo: this.host,
      autoDensity: true,
    });
    // The component may have unmounted while init() was resolving (StrictMode).
    if (this.destroyed) {
      this.safeDestroy();
      return;
    }
    this.inited = true;
    this.host.appendChild(this.app.canvas);

    this.staticLayer = new Graphics();
    this.labelLayer = new Container();
    this.dynLayer = new Graphics();
    this.app.stage.addChild(this.staticLayer, this.labelLayer, this.dynLayer);

    this.computeGeom();
    this.drawStatic();
    this.ro = new ResizeObserver(() => {
      this.computeGeom();
      this.drawStatic();
    });
    this.ro.observe(this.host);
    this.app.ticker.add(this.tick);
  }

  setRisk(risk: Risk): void {
    this.risk = risk;
    if (this.inited) this.drawStatic();
  }

  /** Drop a ball along an already-known path (the outcome is decided by the server, ADR-3). */
  drop(path: number[], bucket: number, multiplier: number, onLand: (bucket: number) => void): void {
    if (!this.geom) return;
    this.balls.push({
      x: this.geom.cx,
      y: this.geom.topY - 14,
      vy: 1,
      row: 0,
      rights: 0,
      path,
      bucket,
      multiplier,
      onLand,
      done: false,
      targetX: this.geom.cx,
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.ro?.disconnect();
    if (this.inited) this.safeDestroy();
  }

  private safeDestroy(): void {
    try {
      this.app.destroy(true);
    } catch {
      /* init may not have finished — Pixi is not ready to destroy yet */
    }
  }

  private laneX(rights: number, level: number): number {
    const g = this.geom!;
    return g.cx + (2 * rights - level) * (g.spacing / 2);
  }

  private pegY(r: number): number {
    const g = this.geom!;
    return g.topY + r * g.rowH;
  }

  private computeGeom(): void {
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const cx = W / 2;
    const margin = Math.min(60, W * 0.06);
    const spacing = Math.min((W - margin * 2) / (ROWS + 1), 44);
    const topY = 48;
    const bucketY = H - 54;
    const rowH = (bucketY - topY - 24) / (ROWS - 1);
    this.geom = {
      W,
      H,
      cx,
      spacing,
      topY,
      bucketY,
      rowH,
      pegR: Math.max(2.5, spacing * 0.09),
      ballR: spacing * 0.22,
    };
  }

  private drawStatic(): void {
    const g = this.geom;
    const layer = this.staticLayer;
    const labels = this.labelLayer;
    if (!g || !layer || !labels) return;

    layer.clear();
    labels.removeChildren().forEach((c) => c.destroy());

    // background grid
    for (let y = 0; y < g.H; y += 48) layer.moveTo(0, y).lineTo(g.W, y);
    layer.stroke({ color: COLORS.grid, alpha: 0.05, width: 1 });

    // pegs (row r has r+1 of them)
    for (let r = 0; r < ROWS; r++) {
      for (let j = 0; j <= r; j++) {
        layer.circle(g.cx + (2 * j - r) * (g.spacing / 2), this.pegY(r), g.pegR);
      }
    }
    layer.fill({ color: COLORS.peg, alpha: 0.55 });

    // multiplier buckets
    const pays = PAYOUTS[this.risk];
    const bw = g.spacing * 0.92;
    const bh = 28;
    for (let k = 0; k <= ROWS; k++) {
      const x = this.laneX(k, ROWS);
      const col = bucketColor(pays[k]);
      layer.roundRect(x - bw / 2, g.bucketY - bh / 2, bw, bh, 6).fill({ color: col, alpha: 0.2 });
      const t = new Text({
        text: `${pays[k]}×`,
        style: {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: Math.min(12, g.spacing * 0.32),
          fill: col,
        },
      });
      t.anchor.set(0.5);
      t.x = x;
      t.y = g.bucketY;
      labels.addChild(t);
    }
  }

  private burst(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 1 });
    }
  }

  private pathStep(ball: Ball): 0 | 1 {
    return ball.path[ball.row] === 1 ? 1 : 0;
  }

  private updateBall(ball: Ball, g: Geom): void {
    ball.vy += G;
    ball.y += ball.vy;
    ball.x += (ball.targetX - ball.x) * 0.2;

    if (!ball.done && ball.row < ROWS && ball.y >= this.pegY(ball.row)) {
      ball.rights += this.pathStep(ball);
      ball.row += 1;
      ball.targetX = this.laneX(ball.rights, ball.row);
      ball.vy = -HOP;
      this.cb.onPeg?.();
    }

    if (!ball.done && ball.row >= ROWS && ball.y >= g.bucketY) {
      ball.done = true;
      ball.onLand(ball.bucket);
      const bigWin = ball.multiplier >= BIG_WIN_MULT;
      if (bigWin) this.burst(this.laneX(ball.bucket, ROWS), g.bucketY);
      this.cb.onLand?.(ball.bucket, ball.multiplier, bigWin);
    }
  }

  private pruneLandedBalls(g: Geom): void {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      if (this.balls[i].done && this.balls[i].y > g.bucketY + 40) this.balls.splice(i, 1);
    }
  }

  private drawParticles(dyn: Graphics): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 0.2;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      dyn.circle(p.x, p.y, 3).fill({ color: COLORS.accent, alpha: Math.max(0, p.life) });
    }
  }

  private drawBalls(dyn: Graphics, g: Geom): void {
    for (const ball of this.balls) {
      dyn.circle(ball.x, ball.y, g.ballR * 2).fill({ color: COLORS.ball, alpha: 0.15 });
      dyn.circle(ball.x, ball.y, g.ballR).fill({ color: COLORS.ball });
    }
  }

  private readonly tick = (): void => {
    const g = this.geom;
    const dyn = this.dynLayer;
    if (!g || !dyn) return;

    dyn.clear();
    for (const ball of this.balls) this.updateBall(ball, g);
    this.pruneLandedBalls(g);
    this.drawParticles(dyn);
    this.drawBalls(dyn, g);
  };
}
