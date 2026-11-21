// Building a town from nothing, and the factories for the things in it.
import { S } from '../state.js';
import { DAY_LEN, HOUSE, SWING, ADDONS, HEADS, BODIES, WALLS, ROOFS, PETALS, GREENS, NAME_A, NAME_B } from '../config.js';
import { TAU, clamp, rand, irand, pick, hs, dist } from '../util.js';
import { rebuildObs, freePoint, findSpot, inEllipse, inStream, streamPoint, placeBridge } from './geometry.js';
import { newJournal } from '../journal.js';

export function newHouse(progress) {
  const p = findSpot(96, 96, 84);
  const h = { kind: 'house', x: p.x + 12, y: p.y, seed: irand(1e6), color: pick(WALLS), roof: pick(ROOFS), progress, addons: [] };
  S.houses.push(h);
  return h;
}

export function newCritter(x, y, original) {
  return hydrate({
    name: pick(NAME_A) + pick(NAME_B), seed: irand(1e6), size: rand(0.82, 1.12),
    head: original ? HEADS[0] : pick(HEADS), body: original ? BODIES[0] : pick(BODIES), x, y, home: -1,
  });
}
/** Turn saved critter data into a live critter. */
export function hydrate(d) {
  const r = i => hs(d.seed, i), dir = r(5) < 0.5 ? -1 : 1;
  return {
    ...d, home: S.houses[d.home] || null,
    hw: 0.94 + hs(d.seed, 1) * 0.14, hh: 0.94 + hs(d.seed, 2) * 0.14, eyeGap: hs(d.seed, 3) * 1.6 - 0.4, cheer: hs(d.seed, 6),
    speed: 22 + r(4) * 10, dir,
    // Everyone walks a bit differently: how long their steps are, how much they
    // bounce, how high they pick their feet up and how much their arms swing.
    gait: { stride: 6 + r(20) * 2.6, bounce: 1 + r(21) * 2, lift: 4 + r(22) * 3.5, swing: 0.5 + r(23) * 0.9 },
    v: 0, hx: dir, hy: 0, look: dir, settle: 0, feet: null, walk: 'stroll',
    act: 'idle', t: rand(0.5, 4), tx: 0, ty: 0, then: null, walkT: 0, phase: 0,
    hopY: 0, hopV: 0, sink: 0, surprise: 0, blink: 0, blinkT: rand(1, 5), bubble: null, hidden: false,
    partner: null, apple: null, cleanup: null, owl: false,
  };
}
export const makeSwing = (x, y, seed, progress = 1) => ({ kind: 'swing', x, y, seed, progress, seats: SWING.seats.map(dx => ({ dx, amp: 0, angle: 0, user: null })) });
/** A stream wandering across the meadow from the left edge to the right. */
export function makeStream() {
  const { W, H } = S, n = 12, pts = [];
  const y0 = H * rand(0.32, 0.72), amp = H * rand(0.05, 0.1), f1 = rand(0.5, 0.9), f2 = rand(1.2, 1.9), p1 = rand(TAU), p2 = rand(TAU);
  for (let i = 0; i <= n; i++) {
    const y = y0 + amp * Math.sin(i * f1 + p1) + amp * 0.5 * Math.sin(i * f2 + p2);
    pts.push([-70 + i * (W + 140) / n, clamp(y, 150, H - 50)]);
  }
  return { pts, seed: irand(1e6), flow: rand() < 0.5 ? 1 : -1 };
}

/** The town's monument: far bigger than anything one critter could make. */
export function planMonument() {
  const form = pick(['circle', 'giant']), p = form === 'circle' ? findSpot(72, 40, 14) : findSpot(54, 80, 70);
  return (S.monument = { kind: 'monument', form, x: p.x, y: p.y, seed: irand(1e6), progress: 0 });
}
export function planTank() {
  const p = findSpot(46, 42, 30);
  return (S.tank = { kind: 'tank', x: p.x, y: p.y, seed: irand(1e6), progress: 0, fish: [] });
}
/** A bridge at the bit of stream nearest the middle of town. */
export function planBridge() {
  const mid = S.fire || { x: S.W / 2, y: S.H / 2 };
  let best = 0.5, bd = Infinity;
  for (let t = 0.15; t <= 0.85; t += 0.02) { const p = streamPoint(t), d = dist(p, mid); if (d < bd && p.x > 80 && p.x < S.W - 80) { bd = d; best = t; } }
  S.bridge = { kind: 'bridge', t: best, seed: irand(1e6), progress: 0 };
  placeBridge();
  S.flowers = S.flowers.filter(f => dist(f, S.bridge) > 50);
  return S.bridge;
}
/** Start adding something onto a finished house, if any house still has room to grow. */
export function planAddon() {
  // Each house ends up with between one and three add-ons, decided by its seed.
  const room = h => h.progress >= 1 && !h.adding && h.addons.length < 1 + Math.floor(hs(h.seed, 9) * 3);
  const h = pick(S.houses.filter(room));
  if (!h) return null;
  h.adding = { what: pick(ADDONS.filter(a => !h.addons.includes(a))), progress: 0 };
  return h;
}

export function planFire() {
  // The most central of a handful of free spots: the fire is the middle of town.
  const mid = { x: S.W / 2, y: S.H * 0.55 };
  let p = null;
  for (let i = 0; i < 12; i++) { const q = findSpot(62, 38, 5); if (!p || dist(q, mid) < dist(p, mid)) p = q; }
  return (S.fire = { kind: 'fire', x: p.x, y: p.y, seed: irand(1e6), progress: 0 });
}
export function planPool() {
  const rx = clamp(S.W * 0.085, 70, 105), ry = rx * 0.48;
  S.pool = { kind: 'pool', ...findSpot(rx + 16, ry + 14), rx, ry, seed: irand(1e6), progress: 0 };
  S.tufts = S.tufts.filter(t => !inEllipse(t.x, t.y, S.pool, 16));
  S.flowers = S.flowers.filter(f => !inEllipse(f.x, f.y, S.pool, 16));
  return S.pool;
}
export function planSwing() {
  const p = findSpot(100, 70, 55);
  return (S.swing = makeSwing(p.x, p.y, irand(1e6), 0));
}
export const makeBall = (x, y) => ({ x, y, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 });

/** Give every homeless critter a bed in a finished house, if there is one. */
export function assignHomes() {
  const done = S.houses.filter(h => h.progress >= 1);
  for (const c of S.critters) {
    if (c.home && c.home.progress >= 1) continue;
    let best = null, bn = HOUSE.residents;
    for (const h of done) { const n = S.critters.filter(o => o.home === h).length; if (n < bn) { bn = n; best = h; } }
    c.home = best;
  }
}

/** Decorations that aren't saved: regenerated on load and resize. */
export function scatterDecor() {
  S.tufts = [];
  const n = Math.round(S.W * S.H / 26000);
  for (let i = 0; i < n; i++) {
    const p = { x: rand(10, S.W - 10), y: rand(70, S.H - 8), seed: irand(1e6) };
    if (!(S.pond && inEllipse(p.x, p.y, S.pond, 10)) && !(S.pool && inEllipse(p.x, p.y, S.pool, 16)) && !inStream(p.x, p.y, 6)) S.tufts.push(p);
  }
  S.flies = [];
  for (let i = 0; i < 4; i++) S.flies.push({ x: rand(S.W), y: rand(100, S.H), seed: irand(1e6), color: pick(PETALS), a: rand(TAU) });
}

export function newTown() {
  const { W, H } = S;
  Object.assign(S, { critters: [], houses: [], trees: [], flowers: [], apples: [], arts: [], pond: null, stream: null, bridge: null, pool: null, swing: null, tank: null, event: null, nextEvent: 0, wind: 0, stones: [], rings: [], ducks: null, hammocks: [], visitor: null, floaters: [], recent: null, cairns: [], monument: null, away: [], news: [], newsId: 0, mail: [], lostHat: null, picnic: null, rumour: null });
  S.journal = newJournal();
  S.clock = DAY_LEN * 0.08;

  // Only nature to begin with. The critters build the rest (see sim/world.js).
  S.fire = S.pool = S.swing = S.ball = null;
  // Water: a pond, a stream, or sometimes both.
  const water = pick(['pond', 'pond', 'stream', 'stream', 'both']);
  if (water !== 'pond') S.stream = makeStream();
  if (water !== 'stream') {
    const rx = clamp(W * 0.09, 60, 115), ry = rx * 0.5;
    S.pond = { ...findSpot(rx + 6, ry + 6), rx, ry, seed: irand(1e6) };
  }
  const nt = clamp(Math.round(W * H / 170000), 3, 6);
  for (let i = 0; i < nt; i++) {
    const size = rand(1.1, 1.45), p = findSpot(44 * size, 54 * size, 52 * size);
    S.trees.push({ x: p.x, y: p.y, seed: irand(1e6), size, color: pick(GREENS), apples: [rand(), rand(), rand()] });
  }
  rebuildObs();
  for (let i = 0; i < 5; i++) { const p = freePoint(); S.critters.push(newCritter(p.x, p.y, i === 0)); }
  for (let i = 0; i < 8; i++) { const p = freePoint(); S.flowers.push({ x: p.x, y: p.y, seed: irand(1e6), color: pick(PETALS), age: 20 }); }
  assignHomes(); scatterDecor();
}
