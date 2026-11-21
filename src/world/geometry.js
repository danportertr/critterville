// Where things are: walking obstacles, and finding empty spots to put stuff.
import { S } from '../state.js';
import { HOUSE, STREAM_HALF } from '../config.js';
import { rand } from '../util.js';

export function inEllipse(x, y, o, pad = 0) {
  const ex = (x - o.x) / (o.rx + pad), ey = (y - o.y) / (o.ry + pad);
  return ex * ex + ey * ey < 1;
}

/** A point along the stream, t in 0..1 from one end to the other, with the unit normal across it. */
export function streamPoint(t) {
  const pts = S.stream.pts, f = Math.min(pts.length - 1.001, Math.max(0, t * (pts.length - 1))), i = Math.floor(f), k = f - i;
  const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return { x: a[0] + dx * k, y: a[1] + dy * k, nx: -dy / l, ny: dx / l, tx: dx / l, ty: dy / l };
}
/** Is (x, y) in the stream? pad > 0 widens it, pad < 0 means "properly in". */
export function inStream(x, y, pad = 0) {
  if (!S.stream) return false;
  const pts = S.stream.pts, r = STREAM_HALF + pad;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(x - a[0] - dx * k, y - a[1] - dy * k) < r) return true;
  }
  return false;
}
export const topEdge = () => Math.min(120, S.H * 0.3);

/** Ground footprints critters steer around. Call after anything is added, removed or moved. */
export function rebuildObs() {
  const { pond, pool, fire } = S;
  // (The stream isn't an obstacle: it's shallow, and critters wade across.)
  S.obs = [];
  if (pond) S.obs.push({ x: pond.x, y: pond.y, rx: pond.rx + 8, ry: pond.ry + 6 });
  if (pool) S.obs.push({ x: pool.x, y: pool.y, rx: pool.rx + 14, ry: pool.ry + 11 });
  if (fire) S.obs.push({ x: fire.x, y: fire.y - 3, rx: 20, ry: 11 });
  for (const h of S.houses) S.obs.push({ x: h.x, y: h.y - 9, rx: HOUSE.w / 2 + 6, ry: 13 });
  for (const t of S.trees) S.obs.push({ x: t.x, y: t.y - 2, rx: 24 * t.size, ry: 7 });
  for (const a of S.arts) S.obs.push({ x: a.x, y: a.y - 2, rx: 17, ry: 7 });
}

/** A random walkable point. */
export function freePoint(pad = 14) {
  let p;
  for (let i = 0; i < 200; i++) {
    p = { x: rand(40, S.W - 40), y: rand(topEdge(), S.H - 24) };
    if (!S.obs.some(o => inEllipse(p.x, p.y, o, pad)) && !inStream(p.x, p.y, pad)) break;
  }
  return p;
}

// Visual footprints (taller than obstacles) so scenery doesn't pile up.
function zones() {
  const z = [];
  const { fire, pool, pond, swing } = S;
  if (fire) z.push({ x: fire.x, y: fire.y - 5, rx: 62, ry: 38 });
  if (pool) z.push({ x: pool.x, y: pool.y, rx: pool.rx + 16, ry: pool.ry + 14 });
  if (pond) z.push({ x: pond.x, y: pond.y, rx: pond.rx + 6, ry: pond.ry + 6 });
  if (S.stream) for (let i = 0; i <= 24; i++) { const p = streamPoint(i / 24); z.push({ x: p.x, y: p.y, rx: 40, ry: STREAM_HALF + 18 }); }
  if (swing) z.push({ x: swing.x, y: swing.y - 55, rx: 100, ry: 70 });
  for (const h of S.houses) z.push({ x: h.x, y: h.y - 40, rx: 58, ry: 55 });
  for (const t of S.trees) z.push({ x: t.x, y: t.y - 52 * t.size, rx: 44 * t.size, ry: 54 * t.size });
  for (const a of S.arts) z.push({ x: a.x, y: a.y - 25, rx: 22, ry: 32 });
  return z;
}
/**
 * Find a base point for something whose footprint is an rx×ry ellipse centred
 * yOff above its base. Returns the least-crowded candidate if nothing is clear.
 */
export function findSpot(rx, ry, yOff = 0, pad = 8) {
  const zs = zones();
  let best = null, bestScore = -1;
  for (let i = 0; i < 400; i++) {
    const x = rand(rx + 12, Math.max(rx + 13, S.W - rx - 12));
    const cy = rand(70 + ry, Math.max(71 + ry, S.H - ry - 10));
    let score = Infinity;
    for (const z of zs) {
      const dx = (x - z.x) / (rx + z.rx + pad), dy = (cy - z.y) / (ry + z.ry + pad);
      score = Math.min(score, dx * dx + dy * dy);
    }
    if (score > bestScore) { bestScore = score; best = { x, y: cy + yOff }; }
    if (score >= 1) break;
  }
  return best;
}
