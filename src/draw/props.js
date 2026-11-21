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

const SLING = 0.14;   // how far in from each end the cloth starts
/**
 * The outline of everything above the bottom of the sling. An occupant is
 * clipped to this, so nothing of them hangs out underneath.
 */
export function hammockClip(h) {
  const { A, B, M } = h;
  ctx.beginPath();
  ctx.moveTo(A[0] - 80, A[1] - 300); ctx.lineTo(A[0] - 80, A[1] + 4); ctx.lineTo(A[0], A[1] + 4);
  ctx.quadraticCurveTo(M[0], M[1] + 22, B[0], B[1] + 4);
  ctx.lineTo(B[0] + 80, B[1] + 4); ctx.lineTo(B[0] + 80, B[1] - 300); ctx.closePath();
  ctx.clip();
}
// The cloth is one crescent that comes to a point at each end, where the rope
// ties on. `top` and `bottom` say how far its two edges sit above/below the
// hammock's low point M in the middle.
function sling(h, top, bottom, lw = 2.4) {
  const { A, B, M } = h, at = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const a = at(A, M, SLING), b = at(B, M, SLING), base = (a[1] + b[1]) / 2;
  const ctrl = y => 2 * (M[1] + y) - base;   // control point that makes the curve pass through M + y
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(M[0], ctrl(top), b[0], b[1]);
  ctx.quadraticCurveTo(M[0], ctrl(bottom), a[0], a[1]);
  ctx.closePath();
  ctx.fillStyle = '#ffd1e8'; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
  return { a, b, ctrl };
}
function stripe(h, s, y) {
  ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.quadraticCurveTo(h.M[0], s.ctrl(y), s.b[0], s.b[1]);
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#ff8fc7'; ctx.stroke();
}
/** A hammock: a rope at each end and a sling that sags in the middle, deeper and wider with someone in it. */
export function drawHammock(h) {
  const { A, B, M } = h;
  if (h.progress < 1) return void tube([A, [M[0], M[1] - 8], B], 0.6, INK, h.seed, 0.3);     // just the rope so far
  const full = h.user && h.user.act === 'hammock';
  const s = full ? sling(h, -13, 15) : sling(h, -3, 6);
  for (const [end, tie] of [[A, s.a], [B, s.b]]) { ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.lineTo(tie[0], tie[1]); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke(); }
  if (!full) stripe(h, s, 1.5);
}
/** The near side of an occupied hammock, drawn over whoever is in it so they're tucked inside. */
export function drawHammockFront(h) {
  const s = sling(h, -2, 15);
  stripe(h, s, 5); stripe(h, s, 10);
}
