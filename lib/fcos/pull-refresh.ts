export const refreshThreshold = 84;
export function pullDistance({
  dx,
  dy,
  atTop,
  touches = 1,
  busy = false,
  scale = 1,
}: {
  dx: number;
  dy: number;
  atTop: boolean;
  touches?: number;
  busy?: boolean;
  scale?: number;
}) {
  if (
    !atTop ||
    touches !== 1 ||
    busy ||
    Math.abs(scale - 1) > 0.05 ||
    dy < 0 ||
    Math.abs(dx) > Math.max(10, dy)
  )
    return null;
  return Math.min(dy, 160);
}
