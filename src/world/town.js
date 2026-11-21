// Building a town from nothing, and the factories for the things in it.
import { S } from '../state.js';
import { DAY_LEN, HOUSE, SWING, HEADS, BODIES, WALLS, ROOFS, PETALS, GREENS, NAME_A, NAME_B } from '../config.js';
import { TAU, clamp, rand, irand, pick, hs, dist } from '../util.js';
import { rebuildObs, freePoint, findSpot, inEllipse } from './geometry.js';

export function newHouse(progress) {
  const p = findSpot(58, 55, 40);
  const h = { kind: 'house', x: p.x, y: p.y, seed: irand(1e6), color: pick(WALLS), roof: pick(ROOFS), progress };
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
  return {
    ...d, home: S.houses[d.home] || null,
    hw: 0.94 + hs(d.seed, 1) * 0.14, hh: 0.94 + hs(d.seed, 2) * 0.14, eyeGap: hs(d.seed, 3) * 1.6 - 0.4,
    speed: 22 + hs(d.seed, 4) * 10, dir: hs(d.seed, 5) < 0.5 ? -1 : 1,
    act: 'idle', t: rand(0.5, 4), tx: 0, ty: 0, then: null, walkT: 0, phase: 0,
    hopY: 0, hopV: 0, sink: 0, blink: 0, blinkT: rand(1, 5), bubble: null, hidden: false,
    partner: null, apple: null, cleanup: null, owl: false,
  };
}
export const makeSwing = (x, y, seed, progress = 1) => ({ kind: 'swing', x, y, seed, progress, seats: SWING.seats.map(dx => ({ dx, amp: 0, angle: 0, user: null })) });
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
    if (!inEllipse(p.x, p.y, S.pond, 10) && !(S.pool && inEllipse(p.x, p.y, S.pool, 16))) S.tufts.push(p);
  }
  S.flies = [];
  for (let i = 0; i < 4; i++) S.flies.push({ x: rand(S.W), y: rand(100, S.H), seed: irand(1e6), color: pick(PETALS), a: rand(TAU) });
}

export function newTown() {
  const { W, H } = S;
  Object.assign(S, { critters: [], houses: [], trees: [], flowers: [], apples: [], arts: [], pond: null, pool: null, swing: null });
  S.clock = DAY_LEN * 0.08;

  // Only nature to begin with. The critters build the rest (see sim/world.js).
  S.fire = S.pool = S.swing = S.ball = null;
  const rx = clamp(W * 0.09, 60, 115), ry = rx * 0.5;
  S.pond = { ...findSpot(rx + 6, ry + 6), rx, ry, seed: irand(1e6) };
  const nt = clamp(Math.round(W * H / 130000), 3, 8);
  for (let i = 0; i < nt; i++) {
    const p = findSpot(30, 44, 38);
    S.trees.push({ x: p.x, y: p.y, seed: irand(1e6), size: rand(0.85, 1.2), color: pick(GREENS), fruit: irand(4), regrow: rand(20, 60) });
  }
  rebuildObs();
  for (let i = 0; i < 5; i++) { const p = freePoint(); S.critters.push(newCritter(p.x, p.y, i === 0)); }
  for (let i = 0; i < 8; i++) { const p = freePoint(); S.flowers.push({ x: p.x, y: p.y, seed: irand(1e6), color: pick(PETALS), age: 20 }); }
  assignHomes(); scatterDecor();
}
