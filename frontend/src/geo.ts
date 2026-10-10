export type Pt = [number, number]; // [longitude, latitude]
const KY = 110540;
const kx = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

export function nearestOnLine(line: Pt[], p: Pt) {
  const k = kx(p[1]);
  let best = { pos: 0, pt: line[0], dist: Infinity };
  for (let i = 0; i < line.length - 1; i++) {
    const ax = line[i][0] * k, ay = line[i][1] * KY, bx = line[i + 1][0] * k, by = line[i + 1][1] * KY;
    const px = p[0] * k, py = p[1] * KY, dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const cx = ax + t * dx, cy = ay + t * dy, d = Math.hypot(px - cx, py - cy);
    if (d < best.dist) best = { pos: i + t, pt: [cx / k, cy / KY], dist: d };
  }
  return best;
}

/** The part of `line` between the points nearest to a and b. */
export function sliceLine(line: Pt[], a: Pt, b: Pt): Pt[] {
  let A = nearestOnLine(line, a), B = nearestOnLine(line, b);
  if (A.pos > B.pos) [A, B] = [B, A];
  const mid: Pt[] = [];
  for (let i = Math.floor(A.pos) + 1; i < B.pos && i < line.length; i++) mid.push(line[i]);
  return [A.pt, ...mid, B.pt];
}

export function lengthM(line: number[][]): number {
  let m = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const k = kx(line[i][1]);
    m += Math.hypot((line[i + 1][0] - line[i][0]) * k, (line[i + 1][1] - line[i][1]) * KY);
  }
  return m;
}
