// Hammocks. Where two grown trees stand close together and roughly level, the
// critters string a hammock between them (planHammock, built like anything
// else), and then take turns lying in it.
import { S, built, isEvening } from '../state.js';
import { rand, irand, pick } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { goTo, setAct, say, release } from '../sim/core.js';

const grown = t => t.grow === undefined;
/** Two trees a hammock could hang between: near enough, level enough, and not already used. */
function freePair() {
  const used = new Set(S.hammocks.flatMap(h => [h.a, h.b]));
  for (let i = 0; i < S.trees.length; i++) for (let j = i + 1; j < S.trees.length; j++) {
    const a = S.trees[i], b = S.trees[j], dx = Math.abs(a.x - b.x);
    if (grown(a) && grown(b) && !used.has(i) && !used.has(j) && dx > 95 && dx < 210 && Math.abs(a.y - b.y) < 32) return a.x < b.x ? [i, j] : [j, i];
  }
  return null;
}
export function planHammock() {
  const pair = S.hammocks.length < 2 && freePair();
  if (!pair) return null;
  const h = { kind: 'hammock', a: pair[0], b: pair[1], seed: irand(1e6), progress: 0, user: null };
  S.hammocks.push(h);
  shape(h);
  return h;
}
/**
 * Where a hammock hangs right now: its two ends on the trunks, the low point
 * in the middle (lower with someone in it), and the ground beneath.
 */
export function shape(h) {
  const a = S.trees[h.a], b = S.trees[h.b], lying = h.user && h.user.act === 'hammock';
  h.A = [a.x + 7 * a.size, a.y - 34 * a.size]; h.B = [b.x - 7 * b.size, b.y - 34 * b.size];
  h.M = [(h.A[0] + h.B[0]) / 2 + (lying ? Math.sin(S.now * 1.3 + h.seed) * 3 : 0), (h.A[1] + h.B[1]) / 2 + (lying ? 24 : 15)];
  h.x = (a.x + b.x) / 2; h.y = Math.max(a.y, b.y) + 0.5;   // drawn just in front of both trees
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
        ctx.translate(m[0], m[1] - 7 * c.size);
        ctx.rotate(c.dir * 1.3 + Math.sin(S.now * 1.3 + h.seed) * 0.04);
        ctx.translate(0, 30 * c.size);
        ctx.scale(c.size, c.size);
        return true;
      },
      pose(c, p) { p.bob = 0; p.eyesClosed = true; p.hl = [-13, -52]; p.hr = [13, -52]; p.lx = 2; p.rx = -2; },   // hands behind the head
    },
  },
};
