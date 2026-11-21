// A ring of mushrooms comes up overnight and lasts a few days. For reasons
// nobody can explain, it's the place to dance.
import { S, phase } from '../state.js';
import { DAY_LEN } from '../config.js';
import { TAU, rand, irand } from '../util.js';
import { findSpot } from '../world/geometry.js';
import { note } from '../journal.js';
import { goTo, ACT } from '../sim/core.js';

export const RING = { rx: 38, ry: 17, lasts: 3 * DAY_LEN };

export default {
  id: 'ring',
  can: () => !S.rings.length && phase() < 0.2,
  start() {
    const p = findSpot(RING.rx + 10, RING.ry + 14, 0);
    S.rings.push({ x: p.x, y: p.y, seed: irand(1e6), born: S.clock });
    S.flowers = S.flowers.filter(f => Math.hypot((f.x - p.x) / RING.rx, (f.y - p.y) / RING.ry) > 1.25);
    note('A ring of mushrooms came up overnight.');
    return { dur: 6 };
  },
};

/** Old rings fade away. Called every tick from sim/world.js. */
export function updateRings(dt) {
  for (let i = S.rings.length - 1; i >= 0; i--) {
    const r = S.rings[i];
    if (S.clock - r.born > RING.lasts) { r.dying = (r.dying === undefined ? 1 : r.dying) - dt * 0.3; if (r.dying <= 0) S.rings.splice(i, 1); }
  }
}

/** Step into the ring, then dance. */
export const ringDance = {
  id: 'ringdance',
  weight: () => S.rings.some(r => r.dying === undefined) ? 1.3 : 0,
  start(c) {
    const r = S.rings[0], a = rand(TAU);
    c.nextWalk = 'skip';
    goTo(c, r.x + Math.cos(a) * RING.rx * 0.45, r.y + Math.sin(a) * RING.ry * 0.45, () => ACT.dance.start(c));
  },
};
