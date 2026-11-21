// Hammocks. Where two grown trees, two houses, or a house and a tree stand the
// right distance apart and roughly level, the critters string a hammock between
// them (planHammock, built like anything else), and then take turns lying in it.
import { S, built, isEvening } from '../state.js';
import { HOUSE } from '../config.js';
import { rand, irand, pick } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { goTo, setAct, say, release } from '../sim/core.js';
import { drawHammockFront, hammockClip } from '../draw/props.js';

// A hammock hangs between two anchors, each a grown tree or a finished house:
// { t: 'tree' | 'house', i: index }.
const thing = ref => (ref.t === 'tree' ? S.trees : S.houses)[ref.i];
const key = ref => ref.t + ref.i;
/** Where a rope ties on: `side` is 1 for the anchor's right-hand side, -1 for its left. */
function tieOn(ref, side) {
  const o = thing(ref);
  if (ref.t === 'tree') return [o.x + side * 7 * o.size, o.y - 34 * o.size];
  const k = HOUSE.scale;
  if (side < 0 && o.addons.includes('annex')) return [o.x - 84 * k, o.y - 30 * k];   // the side room sticks out that way
  return [o.x + side * 45 * k, o.y - 34 * k];
}
function anchors() {
  const out = [];
  S.trees.forEach((t, i) => { if (t.grow === undefined) out.push({ t: 'tree', i }); });
  S.houses.forEach((h, i) => { if (built(h) && !h.adding) out.push({ t: 'house', i }); });
  return out;
}
/** Two anchors a hammock could hang between: the right gap, level enough, and neither already used. */
function freePair() {
  const used = new Set(S.hammocks.flatMap(h => [key(h.a), key(h.b)])), all = anchors().filter(r => !used.has(key(r))), ok = [];
  for (const p of all) for (const q of all) {
    if (p === q || thing(p).x >= thing(q).x) continue;   // p is the left-hand one
    const A = tieOn(p, 1), B = tieOn(q, -1), gap = B[0] - A[0];
    if (gap > 105 && gap < 200 && Math.abs(A[1] - B[1]) < 30 && Math.abs(thing(p).y - thing(q).y) < 36) ok.push([p, q]);
  }
  return ok.length ? pick(ok) : null;
}
export function planHammock() {
  const pair = S.hammocks.length < 2 && freePair();
  if (!pair) return null;
  const h = { kind: 'hammock', a: pair[0], b: pair[1], seed: irand(1e6), progress: 0, user: null };
  S.hammocks.push(h);
  shape(h);
  return h;
}
/** "between two trees", "between a house and a tree"... */
export function between(h) {
  const n = [h.a, h.b].filter(r => r.t === 'house').length;
  return n === 2 ? 'between two houses' : n === 1 ? 'between a house and a tree' : 'between two trees';
}
/** Is this saved hammock still hangable? (Also upgrades old saves, where anchors were tree numbers.) */
export function restore(h) {
  for (const end of ['a', 'b']) if (typeof h[end] === 'number') h[end] = { t: 'tree', i: h[end] };
  return thing(h.a) && thing(h.b) ? { ...h, user: null } : null;
}
/**
 * Where a hammock hangs right now: its two ends, the low point in the middle
 * (lower with someone in it), and the ground beneath.
 */
export function shape(h) {
  const a = thing(h.a), b = thing(h.b), lying = h.user && h.user.act === 'hammock';
  h.A = tieOn(h.a, 1); h.B = tieOn(h.b, -1);
  h.M = [(h.A[0] + h.B[0]) / 2 + (lying ? Math.sin(S.now * 1.3 + h.seed) * 3 : 0), (h.A[1] + h.B[1]) / 2 + (lying ? 24 : 15)];
  h.x = (h.A[0] + h.B[0]) / 2; h.y = Math.max(a.y, b.y) + 0.5;   // drawn just in front of both anchors
  return h;
}

export default {
  id: 'hammock',
  weight: () => S.hammocks.some(h => built(h) && !h.user) ? (isEvening() ? 0.6 : 1.2) : 0,
  start(c) {
    const h = pick(S.hammocks.filter(h => built(h) && !h.user));
    h.user = c; c.ham = h;
    c.cleanup = () => { h.user = null; };
    goTo(c, h.x + rand(-8, 8), h.y + 8, () => {
      c.dir = rand() < 0.5 ? -1 : 1;
      c.x = h.x; c.y = h.y + 0.5; c.sink = -16;
      setAct(c, 'hammock', rand(16, 34));
      if (rand() < 0.5) say(c, pick(['ahh', '♪', 'zzz']));
    });
  },
  states: {
    hammock: {
      mood: 'smile',
      finish(c) { c.sink = 0; c.y = c.ham.y + 8; c.hopV = 90; release(c); },
      transform(c) {   // lying back along the hammock, head slightly raised
        const h = c.ham, m = h.M;
        hammockClip(h);                                  // nothing shows below the sling
        ctx.translate(m[0], m[1] - 13 * c.size);         // high enough that their head shows over the edge
        ctx.rotate(c.dir * 1.42 + Math.sin(S.now * 1.3 + h.seed) * 0.03);
        ctx.translate(0, 30 * c.size);
        ctx.scale(c.size, c.size);
        return true;
      },
      after(c) { drawHammockFront(c.ham); },
      pose(c, p) { p.bob = 0; p.eyesClosed = true; p.hl = [-13, -52]; p.hr = [13, -52]; p.lx = 3; p.rx = -3; p.lf = p.rf = 4; },   // hands behind the head, feet tucked in
    },
  },
};
