// Bridge between the page and the PixiJS board without a ref
// (next/dynamic ssr:false does not forward refs). The board registers a
// launcher on mount, the page calls launchBall.

export type Launch = (
  path: number[],
  bucket: number,
  multiplier: number,
  onLand: (bucket: number) => void,
) => void;

let launcher: Launch | null = null;

export function setLauncher(fn: Launch | null): void {
  launcher = fn;
}

export function launchBall(
  path: number[],
  bucket: number,
  multiplier: number,
  onLand: (bucket: number) => void,
): void {
  launcher?.(path, bucket, multiplier, onLand);
}
