// Lights the critters string up for a few days (events/lights.js): strands
// that swag between two trees or houses, and globes hung in the trees. By day
// they're just wire and dull glass; at night they glow (render.js adds the
// glow and calls drawLightsLit over the night-time wash).
import { S } from '../state.js';
import { HOUSE } from '../config.js';
import { hs, shade } from '../util.js';
import { line, blob, dot } from './primitives.js';
import { wallTop } from './scenery.js';

// What the lights look like this time: never quite the same set twice.
export const PALETTES = {
  warm: ['#ffe9a8'],
  lantern: ['#ffb37a', '#ff8fc7', '#ffe07a', '#9be0c0', '#b7a6ff'],
  cool: ['#d6f1ff', '#fff6d6'],
  berry: ['#ff9ec4', '#ffd0a0', '#c9b0ff'],
};
const WIRE = '#3a3a44';

/** Anchors are { t: 'tree' | 'house', i }, the same as a hammock's. */
export const anchorOf = ref => (ref.t === 'tree' ? S.trees : S.houses)[ref.i];
/** Where a strand ties on: up in the edge of a tree's leaves, or at the end of a house's eaves. */
export function hookOn(ref, side) {
  const o = anchorOf(ref);
  if (ref.t === 'tree') { const k = o.size * (o.grow === undefined ? 1 : o.grow); return [o.x + side * 21 * k, o.y - 64 * k]; }
  return [o.x + side * 55 * HOUSE.scale, o.y - (wallTop(o) - 5) * HOUSE.scale];
}
const colour = (L, i) => { const p = PALETTES[L.palette] || PALETTES.warm; return p[i % p.length]; };

/** A strand's wire (as points) and its bulbs. The strand's left-hand anchor is `a`. */
function strandShape(L, s) {
  const A = hookOn(s.a, 1), B = hookOn(s.b, -1), len = Math.hypot(B[0] - A[0], B[1] - A[1]), sag = 9 + len * 0.11;
  const at = t => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t + sag * 4 * t * (1 - t)];
  const wire = [], bulbs = [], n = Math.max(3, Math.round(len / 17));
  for (let i = 0; i <= 12; i++) wire.push(at(i / 12));
  for (let i = 0; i < n; i++) { const [x, y] = at((i + 0.5) / n); bulbs.push({ x, y: y + 4.5, r: 3.3, c: colour(L, i + (s.seed % 5)), seed: s.seed + i }); }
  return { wire, bulbs };
}
/** The globes hung in one tree: a thread down from the leaves and a ball of glass. */
function globeShape(L, g) {
  const t = S.trees[g.tree], k = t.size * (t.grow === undefined ? 1 : t.grow), out = [];
  const spots = [[-28, -41], [-16, -36], [16, -37], [28, -43]];   // under the lowest leaves, either side of the trunk
  for (let i = 0; i < spots.length; i++) {
    if (hs(g.seed, i) < 0.25) continue;   // not every branch gets one
    const x = t.x + spots[i][0] * k, top = t.y + spots[i][1] * k, drop = 5 + hs(g.seed, i + 9) * 9;
    out.push({ x, top, y: top + drop + 6.5, r: 6.5, c: colour(L, i + (g.seed % 5)), seed: g.seed + i });
  }
  return out;
}

export function drawStrand(s) {
  const { wire, bulbs } = strandShape(S.lights, s);
  line(wire, s.seed, 1.7, WIRE, 0.25);
  for (const b of bulbs) { dot(b.x, b.y - 3, 1.5, WIRE); blob(b.x, b.y, b.r, b.r * 1.15, shade(b.c, 0.93), b.seed, 6, 0.04, 0.15, 1.4); }
}
export function drawGlobes(g) {
  for (const b of globeShape(S.lights, g)) {
    line([[b.x, b.top], [b.x, b.y - b.r]], b.seed, 1.3, WIRE, 0.2);
    blob(b.x, b.y, b.r, b.r, shade(b.c, 0.93), b.seed, 8, 0.04, 0.2, 1.6);
    dot(b.x, b.y - b.r, 1.7, WIRE);
  }
}
/** Every light that's up, as { x, y, r, c, seed }: render.js gives each a glow at night. */
export function litPoints() {
  const L = S.lights, out = [];
  if (!L) return out;
  for (const s of L.strands) if (s.up && anchorOf(s.a) && anchorOf(s.b)) out.push(...strandShape(L, s).bulbs);
  for (const g of L.globes) if (g.up && S.trees[g.tree]) out.push(...globeShape(L, g));
  return out;
}
/** The bulbs themselves, bright, drawn over the night wash. `n` is how dark it is (0..1). */
export function drawLightsLit(ctx, pts, n) {
  for (const b of pts) {
    const tw = 0.86 + 0.14 * Math.sin(S.now * 2.3 + b.seed);   // a slow, slight flicker
    ctx.globalAlpha = n * tw;
    dot(b.x, b.y, b.r + 0.4, b.c);
    dot(b.x - b.r * 0.2, b.y - b.r * 0.2, b.r * 0.5, '#fffdf0');
  }
  ctx.globalAlpha = 1;
}
/** '#ffe9a8' → '255,233,168' (for the glow gradients). */
export const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
