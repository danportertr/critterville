// What a building site looks like apart from the thing being built: the pile
// of materials beside it, which goes down as the work goes on.
import { ctx } from './canvas.js';
import { WOOD, HOUSE } from '../config.js';
import { TAU, hs } from '../util.js';
import { blob, box } from './primitives.js';

const STONE_JOBS = new Set(['fire', 'monument']);
const NO_PILE = new Set(['pool', 'hammock']);   // (a pool has its own heap of earth)
/** Where the materials for site `s` are stacked, or null if it doesn't need any. */
export function pileSpot(s) {
  if (NO_PILE.has(s.kind)) return null;
  const side = hs(s.seed, 77) < 0.5 ? -1 : 1;
  const out = { house: HOUSE.w / 2 * HOUSE.scale + 46, stage: 150, monument: 92, swing: 124, bridge: 0, fire: 54, tank: 62 }[s.kind] || 70;
  return s.kind === 'bridge' ? { x: s.ends[0].x + 22, y: s.ends[0].y + 16, stone: false } : { x: s.x + side * out, y: s.y + 12, stone: STONE_JOBS.has(s.kind) };
}
/** Planks (or blocks of stone) waiting to be used; `left` is how much of the job remains, 0..1. */
export function drawPile(s, left) {
  const p = pileSpot(s), n = Math.ceil(left * 5);
  if (!p || n <= 0) return;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(0, 1, 22, 4, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 2), col = i % 2;
    if (p.stone) blob((col - 0.5) * 15 + (row % 2) * 4, -5 - row * 8, 8, 5, i % 2 ? '#d8d8e0' : '#c6c8d2', s.seed + 80 + i, 7, 0.12, 0.3, 2);
    else { const x = (col - 0.5) * 6 + (row % 2) * 3, y = -3 - i * 4.2; box([[x - 19, y + 2], [x + 19, y + 1.4], [x + 19, y - 2.2], [x - 19, y - 1.8]], i % 2 ? '#d9a878' : WOOD, s.seed + 80 + i, 0.4, 2); }
  }
  ctx.restore();
}
