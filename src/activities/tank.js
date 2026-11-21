// The fish tank. Once it's built, whoever catches a fish carries it over and
// puts it in (fish.js calls stock()). It holds a handful at a time: when it's
// full, whoever has been in there longest goes back to the water. Critters also
// just come and watch.
import { S, built } from '../state.js';
import { TANK } from '../config.js';
import { rand, irand, pick } from '../util.js';
import { log } from '../ui.js';
import { SPECIES_BY_ID } from '../data/fish.js';
import { drawFish } from '../draw/fish.js';
import { goTo, setAct, say } from '../sim/core.js';

const front = (c, t) => ({ x: t.x + (c.x < t.x ? -1 : 1) * rand(14, 34), y: t.y + rand(8, 14) });

/** Carry a fresh catch to the tank and put it in. */
export function stock(c, sp, water) {
  const t = S.tank, p = front(c, t);
  c.carry = (c, pose) => drawFish(sp, pose.HR[0] + 2, pose.HR[1] - 9, 0.6, c.seed + 7);
  goTo(c, p.x, p.y, () => {
    c.carry = null; c.dir = t.x > c.x ? 1 : -1;
    t.fish.push({ id: sp.id, from: water, seed: irand(1e6) });
    if (t.fish.length > TANK.holds) {
      const out = t.fish.shift(), o = SPECIES_BY_ID[out.id];
      if (o) log(`${c.name} put ${sp.call} in the tank, and took ${o.call} back to the ${out.from}.`);
    } else log(`${c.name} put ${sp.call} in the tank.`);
    setAct(c, 'watch', rand(2, 4)); say(c, '♥');
  });
}

export default {
  id: 'tank',
  weight: () => built(S.tank) && S.tank.fish.length ? 1 : 0,
  start(c) {
    const t = S.tank, p = front(c, t);
    goTo(c, p.x, p.y, () => { c.dir = t.x > c.x ? 1 : -1; setAct(c, 'watch', rand(4, 8)); if (rand() < 0.7) say(c, pick(['ooh', 'blub', '♥', 'hello', '?', 'wow'])); });
  },
  states: { watch: {} },
};
