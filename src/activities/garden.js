// Plant a flower somewhere. Old flowers fade once the town is full of them.
import { S } from '../state.js';
import { PETALS } from '../config.js';
import { clamp, rand, irand, pick } from '../util.js';
import { log } from '../ui.js';
import { freePoint } from '../world/geometry.js';
import { goTo, setAct } from '../sim/core.js';

const flowerCap = () => clamp(Math.round(S.W * S.H / 22000), 12, 60);

export default {
  id: 'garden',
  weight: () => 1,
  start(c) { const p = freePoint(20); goTo(c, p.x, p.y, () => setAct(c, 'plant', 2.6)); },
  states: {
    plant: {
      finish(c) {
        S.flowers.push({ x: c.x + rand(-4, 4), y: c.y + 3, seed: irand(1e6), color: pick(PETALS), age: 0 });
        S.stats.planted++;
        if (S.flowers.length > flowerCap()) { const old = S.flowers.find(f => f.dying === undefined); if (old) old.dying = 1; }
        if (rand() < 0.2) log(`${c.name} planted a flower.`);
      },
      pose(c, p) { p.bob = -6 - Math.sin(p.now * 6) * 1.5; p.hl = [-18, -11]; p.hr = [18, -11]; },
    },
  },
};
