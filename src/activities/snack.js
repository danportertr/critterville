// Eating: fruit picked off a tree, or a snack somebody dropped from the sky.
import { S } from '../state.js';
import { pick } from '../util.js';
import { blob } from '../draw/primitives.js';
import { goTo, setAct, say, release } from '../sim/core.js';

export const snack = {
  id: 'snack',   // never chosen by weight: choose() and input call fetch() directly
  fetch(c, a) {
    release(c);
    a.claimed = c; c.apple = a;
    goTo(c, a.x + (c.x < a.x ? -9 : 9), a.y + 1, () => { c.dir = a.x > c.x ? 1 : -1; a.eaten = true; setAct(c, 'eat', 2.4); say(c, 'yum'); });
  },
  states: {
    eat: {
      finish(c) {
        if (!c.apple) return;
        const i = S.apples.indexOf(c.apple);
        if (i >= 0) S.apples.splice(i, 1);
        c.apple = null; say(c, '♥');
      },
      pose(c, p) { p.hand(p.d, p.d * 10, -42 + Math.sin(p.now * 12) * 2); },
      props(c, p) { blob(p.HD[0] + p.d * 2, p.HD[1] - 5, 4, 4, '#ff6b6b', c.seed + 6, 6, 0.05, 0.3, 1.8); },
    },
  },
};

export const fruit = {
  id: 'fruit',
  weight: () => S.trees.some(t => t.fruit > 0) ? 0.9 : 0,
  start(c) {
    const t = pick(S.trees.filter(t => t.fruit > 0));
    goTo(c, t.x + (c.x < t.x ? -20 : 20) * t.size, t.y + 4, () => { c.dir = t.x > c.x ? 1 : -1; c.tree = t; setAct(c, 'pick', 1.8); });
  },
  states: {
    pick: {
      finish(c) {
        if (!c.tree || c.tree.fruit <= 0) return;
        c.tree.fruit--; setAct(c, 'eat', 2.2);
        return true;
      },
      pose(c, p) { p.hand(p.d, p.d * 22, -58 + Math.sin(p.now * 8) * 3); },
    },
  },
};
