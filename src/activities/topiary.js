// Topiary: clip a tree's crown into a shape. It grows out again in a few days
// unless somebody does it again.
import { S } from '../state.js';
import { DAY_LEN, INK } from '../config.js';
import { rand, pick } from '../util.js';
import { line } from '../draw/primitives.js';
import { note } from '../journal.js';
import { goTo, setAct, say } from '../sim/core.js';

const SHAPES = { ball: 'a ball', cone: 'a cone', tiers: 'three tiers', critter: 'a big grinning head' };
const clippable = t => t.grow === undefined && !t.topiary;

export default {
  id: 'topiary',
  weight: () => S.trees.filter(t => t.topiary).length < 2 && S.trees.some(clippable) ? 0.3 : 0,
  start(c) {
    const t = pick(S.trees.filter(clippable)), side = c.x < t.x ? -1 : 1;
    goTo(c, t.x + side * 30 * t.size, t.y + 4, () => { c.dir = -side; c.tree = t; setAct(c, 'clip', rand(7, 10)); });
  },
  states: {
    clip: {
      mood: 'flat',
      finish(c) {
        const t = c.tree;
        if (!t || t.topiary) return;
        const shape = pick(Object.keys(SHAPES));
        t.topiary = { shape, until: S.clock + rand(2.5, 3.5) * DAY_LEN };
        c.hopV = 120; say(c, 'ta-da');
        note(`${c.name} clipped a tree into ${SHAPES[shape]}.`);
      },
      pose(c, p) { p.hand(p.d, p.d * 22, -58 + Math.sin(p.now * 9) * 5); },
      props(c, p) {   // shears
        const [x, y] = p.HD, o = Math.abs(Math.sin(p.now * 9)) * 4;
        line([[x - p.d * 2, y + 3], [x + p.d * 9, y - 8 - o]], c.seed + 6, 2, INK, 0.1);
        line([[x - p.d * 2, y - 3], [x + p.d * 9, y - 6 + o]], c.seed + 7, 2, INK, 0.1);
      },
    },
  },
};
