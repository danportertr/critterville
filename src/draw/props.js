// Things that rare events leave behind (see src/events/).
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { TAU, clamp, hs } from '../util.js';
import { streamPoint } from '../world/geometry.js';
import { RING } from '../events/ring.js';
import { blob, box, tube, dot, smooth } from './primitives.js';
import { INK } from '../config.js';

/** A fallen star: a lumpy five-pointed stone. */
export function drawStone(s) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 5 : 10.5; pts.push([s.x + Math.cos(a) * r, s.y - 8 + Math.sin(a) * r * 0.9]); }
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, 10, 3, 0, 0, TAU); ctx.fill();
  box(pts, '#fff3a8', s.seed, 0.5, 2.2);
}

function duck(x, y, k, dir, body, seed) {
  y += Math.sin(S.now * 2.2 + seed) * 0.8;
  box([[x - dir * 7 * k, y - 1 * k], [x - dir * 11 * k, y - 5 * k], [x - dir * 6 * k, y - 4 * k]], body, seed + 1, 0.2, 2);          // tail
  blob(x, y, 7.5 * k, 5 * k, body, seed, 8, 0.05, 0.3, 2);
  box([[x + dir * 8 * k, y - 8 * k], [x + dir * 12.5 * k, y - 6.6 * k], [x + dir * 8 * k, y - 5.4 * k]], '#ffa23d', seed + 2, 0.2, 1.6);   // beak
  blob(x + dir * 5 * k, y - 7 * k, 4 * k, 3.8 * k, body, seed + 3, 7, 0.05, 0.3, 2);
  dot(x + dir * 6 * k, y - 7.8 * k, 0.9 * k);
}
/** Mother duck leading two ducklings round the pond, or up and down the stream. */
export function drawDucks() {
  const d = S.ducks;
  for (let i = 2; i >= 0; i--) {
    const k = i ? 0.6 : 1, body = i ? '#ffe66d' : '#fff', lag = i * 0.42;
    const big = 1.35;
    if (d.water === 'pond' && S.pond) {
      const a = S.now * 0.14 + d.seed - lag, p = S.pond;
      duck(p.x + Math.cos(a) * p.rx * 0.52, p.y + Math.sin(a) * p.ry * 0.5, k * big, -Math.sin(a) < 0 ? -1 : 1, body, d.seed + i * 5);
    } else if (S.stream) {
      const ph = S.now * 0.045 + d.seed, dir = Math.cos(ph) < 0 ? -1 : 1;
      const q = streamPoint(clamp(0.5 + 0.3 * Math.sin(ph) - dir * lag * 0.035, 0.05, 0.95));
      duck(q.x, q.y + 2, k * big, dir, body, d.seed + i * 5);
    }
  }
}

/** A fairy ring: red-capped mushrooms in a circle. */
export function drawRing(r) {
  if (r.dying !== undefined) ctx.globalAlpha = clamp(r.dying, 0, 1);
  const n = 10, up = clamp((S.clock - r.born) / 8, 0.2, 1);   // they pop up over a few seconds
  const order = [...Array(n).keys()].sort((a, b) => Math.sin(a / n * TAU) - Math.sin(b / n * TAU));   // back ones first
  for (const i of order) {
    const a = i / n * TAU + hs(r.seed, i) * 0.25, x = r.x + Math.cos(a) * RING.rx, y = r.y + Math.sin(a) * RING.ry, k = (0.75 + hs(r.seed, i + 20) * 0.5) * up;
    tube([[x, y], [x + 0.5, y - 6 * k]], 3 * k, '#fff', r.seed + i, 0.2);
    blob(x, y - 8 * k, 6.5 * k, 4 * k, '#ff6b6b', r.seed + i + 40, 8, 0.06, 0.3, 2.2);
    dot(x - 2 * k, y - 8.6 * k, 1.1 * k, '#fff'); dot(x + 2.4 * k, y - 7.6 * k, 0.9 * k, '#fff');
  }
  ctx.globalAlpha = 1;
}

/** A hammock between two trees: ropes at each end and a striped sling that sags in the middle. */
export function drawHammock(h) {
  const { A, B, M } = h, at = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  if (h.progress < 1) return void tube([A, [M[0], M[1] - 8], B], 0.6, INK, h.seed, 0.3);     // just the rope so far
  const a = at(A, M, 0.22), b = at(B, M, 0.22), full = h.user && h.user.act === 'hammock';
  const spread = full ? 9 : 4;   // with someone in it the sling opens out
  for (const [end, near] of [[A, a], [B, b]]) for (const dy of [-spread, spread]) { ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.lineTo(near[0], near[1] + dy); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke(); }
  tube([a, M, b], full ? 20 : 9, '#ffd1e8', h.seed, 0.3);
  if (!full) stripes(a, M, b, [-2.6, 2.6]);
}
function stripes(a, M, b, offsets) {
  for (const dy of offsets) { smooth([[a[0], a[1] + dy], [M[0], M[1] + dy], [b[0], b[1] + dy]], false); ctx.lineWidth = 1.6; ctx.strokeStyle = '#ff8fc7'; ctx.stroke(); }
}
/** The near edge of an occupied hammock, drawn over whoever is in it so they're tucked inside. */
export function drawHammockFront(h) {
  const { A, B, M } = h, at = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const a = at(A, M, 0.22), b = at(B, M, 0.22), down = p => [p[0], p[1] + 5];
  tube([down(a), [M[0], M[1] + 9], down(b)], 11, '#ffd1e8', h.seed + 1, 0.3);
  stripes(down(a), [M[0], M[1] + 9], down(b), [-2.6, 2.6]);
}
