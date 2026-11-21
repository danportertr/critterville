// Hand-drawn primitives: every shape gets a little per-point jitter that
// changes a few times a second ("line boil"), then a fat black outline.
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, LW } from '../config.js';
import { TAU, hash, hs } from '../util.js';

export const jit = (seed, i, amp) => (hash(seed * 7919 + i * 104729 + S.boil * 31337) - 0.5) * 2 * amp;
export const wob = (pts, seed, amp) => pts.map((p, i) => [p[0] + jit(seed, i * 2, amp), p[1] + jit(seed, i * 2 + 1, amp)]);

// Path through points with rounded corners (closed blob or open stroke).
export function smooth(pts, closed) {
  const n = pts.length;
  ctx.beginPath();
  if (closed) {
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (n === 2) ctx.lineTo(pts[1][0], pts[1][1]);
    for (let i = 1; i < n - 1; i++) {
      const p = pts[i], q = pts[i + 1], last = i === n - 2;
      ctx.quadraticCurveTo(p[0], p[1], last ? q[0] : (p[0] + q[0]) / 2, last ? q[1] : (p[1] + q[1]) / 2);
    }
  }
}
export function polyPath(pts, closed = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}
export function blobPts(cx, cy, rx, ry, n, seed, vary = 0.07, amp = 0.6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1 + (hs(seed, i) - 0.5) * 2 * vary;
    out.push([cx + Math.cos(a) * rx * k + jit(seed, i * 2, amp), cy + Math.sin(a) * ry * k + jit(seed, i * 2 + 1, amp)]);
  }
  return out;
}
export function paint(fill, lw = LW) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
}
/** Wobbly outlined ellipse. */
export function blob(cx, cy, rx, ry, fill, seed, n = 10, vary = 0.07, amp = 0.6, lw = LW) {
  smooth(blobPts(cx, cy, rx, ry, n, seed, vary, amp), true); paint(fill, lw);
}
/** Wobbly outlined polygon with sharp corners. */
export function box(pts, fill, seed, amp = 0.8, lw = LW) { polyPath(wob(pts, seed, amp)); paint(fill, lw); }
/** Wobbly open stroke. */
export function line(pts, seed, lw = LW, color = INK, amp = 0.5) {
  smooth(wob(pts, seed, amp), false); ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke();
}
/** Thick coloured stroke with an ink outline (limbs, logs, poles). */
export function tube(pts, w, color, seed, amp = 0.5) {
  smooth(seed === undefined ? pts : wob(pts, seed, amp), false);
  ctx.lineWidth = w + LW * 2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
}
export function dot(x, y, r, fill = INK) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
