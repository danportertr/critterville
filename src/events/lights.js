// Somebody finds a box of lights. Over a morning the critters string them up:
// strands swagged between trees and houses, globes hung in the branches. They
// glow every night for two or three days, and then get taken down again and
// put away. (Not for any occasion in particular. They just look nice.)
//
// S.lights = { palette, seed, phase: 'up' | 'on' | 'down', until, since,
//              strands: [{ a, b, seed, up }], globes: [{ tree, seed, up }] }
// `a` and `b` are anchors like a hammock's ({ t: 'tree' | 'house', i }), with
// `a` the left-hand one. A strand or globe shows once `up` is true: a critter
// has to go and hang each one (and, later, fetch each one down).
import { S, phase, built, isNight } from '../state.js';
import { DAY_LEN } from '../config.js';
import { rand, irand, pick } from '../util.js';
import { note } from '../journal.js';
import { news, outdoors } from '../talk.js';
import { goTo, setAct, say } from '../sim/core.js';
import { PALETTES, anchorOf, hookOn } from '../draw/lights.js';

const grown = t => t.grow === undefined;
/** Pairs of things a strand could hang between: far enough apart to swag, close enough to reach. */
function pairs() {
  const all = [];
  S.trees.forEach((t, i) => { if (grown(t)) all.push({ t: 'tree', i }); });
  S.houses.forEach((h, i) => { if (built(h) && !h.adding) all.push({ t: 'house', i }); });
  const ok = [];
  for (const p of all) for (const q of all) {
    if (p === q || anchorOf(p).x >= anchorOf(q).x) continue;
    const A = hookOn(p, 1), B = hookOn(q, -1), gap = B[0] - A[0];
    if (gap > 70 && gap < 300 && Math.abs(A[1] - B[1]) < 70) ok.push([p, q, gap]);
  }
  return ok;
}
function plan() {
  const style = pick(['strands', 'strands', 'both', 'both', 'globes']), key = r => r.t + r.i, used = {};
  const strands = [], globes = [];
  if (style !== 'globes') {
    for (const [a, b] of pairs().sort(() => rand() - 0.5).sort((p, q) => p[2] - q[2] + rand(-60, 60))) {   // shorter runs first, mostly
      if (strands.length >= 5 || used[key(a) + '>'] || used['<' + key(b)]) continue;   // one strand off each side of a thing
      used[key(a) + '>'] = used['<' + key(b)] = true;
      strands.push({ a, b, seed: irand(1e6), up: false });
    }
  }
  if (style !== 'strands' || strands.length < 2) {
    const trees = S.trees.map((t, i) => i).filter(i => grown(S.trees[i])).sort(() => rand() - 0.5).slice(0, style === 'globes' ? 4 : 2);
    for (const tree of trees) globes.push({ tree, seed: irand(1e6), up: false });
  }
  return { strands, globes };
}
const items = L => [...L.strands, ...L.globes];
/** Where to stand to hang (or fetch down) one of them. */
function under(it) {
  if (it.tree !== undefined) { const t = S.trees[it.tree]; return { x: t.x + (it.seed % 2 ? 26 : -26), y: t.y + 9, face: t.x }; }
  const end = it.seed % 2 ? it.b : it.a, o = anchorOf(end), side = end === it.a ? 1 : -1;
  return { x: hookOn(end, side)[0] + side * 8, y: o.y + 10, face: o.x };
}

export default {
  id: 'lights',
  can: () => !S.lights && !S.theatre && phase() > 0.04 && phase() < 0.4 && S.trees.filter(grown).length >= 2,
  start() {
    const { strands, globes } = plan();
    if (!strands.length && !globes.length) return { dur: 1 };
    S.lights = { palette: pick(Object.keys(PALETTES)), seed: irand(1e6), phase: 'up', since: S.clock, until: S.clock + rand(2.2, 3.4) * DAY_LEN, strands, globes };
    note(strands.length && globes.length ? 'Somebody found a box of lights. The critters are stringing them up around town and hanging globes in the trees.'
      : strands.length ? 'Somebody found a box of string lights, and the critters are putting them up.'
        : 'Somebody found a box of glass globes, and the critters are hanging them in the trees.');
    news('lights!', outdoors());
    return { dur: 5 };
  },
};

/** Putting the lights up, and later taking them down: one strand or globe per trip. */
export const hangLights = {
  id: 'hangLights',
  weight() { const L = S.lights; return L && L.phase !== 'on' && items(L).some(it => !it.busy && it.up === (L.phase === 'down')) ? 7 : 0; },
  start(c) {
    const L = S.lights, it = items(L).find(it => !it.busy && it.up === (L.phase === 'down'));
    if (!it) return false;
    const p = under(it);
    it.busy = true;
    c.cleanup = () => { it.busy = false; };
    goTo(c, p.x, p.y, () => {
      if (S.lights !== L) return;
      c.lightJob = it; c.dir = p.face > c.x ? 1 : -1;
      setAct(c, 'hang', rand(3, 4.5));
    });
  },
  states: {
    hang: {   // on tiptoe, reaching up
      mood: 'small',
      finish(c) {
        const it = c.lightJob, L = S.lights;
        c.lightJob = null; c.cleanup = null;
        if (!it || !L) return;
        it.busy = false; it.up = L.phase !== 'down';
        c.hopV = 90;
        if (rand() < 0.5) say(c, pick(it.up ? ['there!', 'ooh', 'nice'] : ['got it', 'down it comes']), 1.3);
      },
      pose(c, p) { const q = Math.sin(p.now * 7 + c.seed); p.hl = [-11, -72 + q * 4]; p.hr = [11, -72 - q * 4]; p.bob = 3 + q; p.lf = p.rf = 1.5; },
    },
  },
};

/** Called every tick from sim/world.js. */
export function updateLights() {
  const L = S.lights;
  if (!L) return;
  // (a tree or house that's gone takes its lights with it)
  L.strands = L.strands.filter(s => anchorOf(s.a) && anchorOf(s.b)); L.globes = L.globes.filter(g => S.trees[g.tree]);
  const all = items(L), late = S.clock - L.since > 0.7 * DAY_LEN;   // if nobody gets round to it, it gets done anyway
  if (L.phase === 'up') {
    if (late) for (const it of all) it.up = true;
    if (all.every(it => it.up)) { L.phase = 'on'; L.since = S.clock; note('The lights are all up. They come on when it gets dark.'); }
  } else if (L.phase === 'on') {
    if (!L.seenLit && isNight()) { L.seenLit = true; note('The lights are on, and the whole town looks different.'); news('the lights are on!', outdoors()); }
    if (S.clock > L.until && phase() > 0.05 && phase() < 0.5) { L.phase = 'down'; L.since = S.clock; note('Time to take the lights down. They go back in their box until next time.'); }
  } else {
    if (late) for (const it of all) it.up = false;
    if (all.every(it => !it.up)) S.lights = null;
  }
}
