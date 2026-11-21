// The town lives in localStorage so it's still there when you come back.
import { S } from '../state.js';
import { SAVE_KEY, SAVE_VERSION } from '../config.js';
import { clamp } from '../util.js';
import { rebuildObs } from './geometry.js';
import { hydrate, makeSwing, makeBall, assignHomes, scatterDecor } from './town.js';

export function save() {
  if (!S.W || !S.pond) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: SAVE_VERSION, W: S.W, H: S.H, clock: S.clock, pond: S.pond, pool: S.pool, fire: S.fire,
      swing: S.swing && { x: S.swing.x, y: S.swing.y, seed: S.swing.seed, progress: S.swing.progress },
      houses: S.houses, trees: S.trees,
      flowers: S.flowers.filter(f => f.dying === undefined),
      arts: S.arts.filter(a => a.progress >= 1 && a.dying === undefined),
      ball: S.ball && { x: S.ball.x, y: S.ball.y },
      critters: S.critters.map(c => ({ name: c.name, seed: c.seed, size: c.size, head: c.head, body: c.body, x: c.x, y: c.y, home: S.houses.indexOf(c.home) })),
    }));
  } catch (e) { /* private mode etc: the town just won't persist */ }
}

/** Returns false if there is nothing usable saved. */
export function load() {
  let d;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!d || d.v !== SAVE_VERSION || !d.critters || !d.critters.length || !(d.W > 50 && d.H > 50)) return false;
  const fx = S.W / d.W, fy = S.H / d.H;
  const mv = o => { if (o) { o.x *= fx; o.y *= fy; } return o; };
  S.clock = d.clock || 0;
  S.pond = mv(d.pond); S.pond.rx *= fx; S.pond.ry = S.pond.rx * 0.5;
  S.pool = mv(d.pool) || null; if (S.pool) { S.pool.rx *= fx; S.pool.ry = S.pool.rx * 0.48; }
  S.fire = mv(d.fire) || null;
  S.swing = mv(d.swing) ? makeSwing(d.swing.x, d.swing.y, d.swing.seed, d.swing.progress) : null;
  S.houses = d.houses.map(mv); S.trees = d.trees.map(mv);
  for (const t of S.trees) if (!t.apples) { t.apples = [Math.random(), Math.random(), Math.random()]; }   // towns saved before apples grew S.flowers = d.flowers.map(mv); S.arts = (d.arts || []).map(mv);
  S.apples = [];
  S.ball = mv(d.ball) ? makeBall(d.ball.x, d.ball.y) : null;
  S.critters = d.critters.map(c => hydrate(mv(c)));
  for (const c of S.critters) { c.x = clamp(c.x, 20, S.W - 20); c.y = clamp(c.y, 90, S.H - 10); }
  rebuildObs(); assignHomes(); scatterDecor();
  return true;
}
